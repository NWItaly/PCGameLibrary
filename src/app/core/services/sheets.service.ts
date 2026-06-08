// sheets.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, map, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import {
  Game,
  SHEET_COLUMNS,
  SHEET_LASTCOLUMN,
  SHEET_COLUMN_COUNT,
} from '../models/game.model';
import { environment } from '../../../environments/environment';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Range completo del foglio usato per getGames() e addGame() (append).
 * String.fromCharCode(65 + 19) = 'T' → copre tutte le 20 colonne (A:T).
 */
const RANGE = `${environment.sheetName}!A:${String.fromCharCode(65 + SHEET_LASTCOLUMN)}`;

@Injectable({ providedIn: 'root' })
export class SheetsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /** Costruisce gli headers con il token corrente */
  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.accessToken()}`,
    });
  }

  private get spreadsheetId(): string {
    return environment.spreadsheetId;
  }

  /** Assicura token valido, poi esegue la chiamata HTTP */
  private withValidToken<T>(call: () => Observable<T>): Observable<T> {
    return from(this.auth.ensureValidToken()).pipe(switchMap(() => call()));
  }

  // ── READ ────────────────────────────────────────────────────────────────────

  getGames(): Observable<Game[]> {
    // UNFORMATTED_VALUE restituisce i valori nativi della cella:
    // - number per celle numeriche (prezzo, seriale data, rating smart chip, buyYear...)
    // - string per testo (titolo, piattaforma, stati, url immagine...)
    // FORMATTED_VALUE per la smart chip "Valutazione" restituisce il display visivo
    // delle stelle (non un intero), causando parseInt → NaN → 0 stelle nel form.
    const url = `${BASE}/${this.spreadsheetId}/values/${RANGE}`
      + `?valueRenderOption=UNFORMATTED_VALUE`;

    // Converte qualsiasi valore cella in stringa sicura
    const str = (v: any): string => (v == null ? '' : String(v));

    // Prezzo: number → "29.99"; stringa con simboli → "29.99" (retrocompatibilità)
    const cleanPrice = (v: any): string => {
      const s = str(v);
      return s.replace(/[^0-9.,]/g, '').replace(',', '.').trim();
    };

    // Features/genres: testo "RPG, FPS" → ["RPG", "FPS"]
    const splitMapFilter = (v: any): string[] =>
      str(v).split(',').map((p: string) => p.trim()).filter(Boolean);

    return this.withValidToken(() =>
      this.http.get<any>(url, { headers: this.headers }).pipe(
        map((res) => {
          const rows: any[][] = res.values ?? [];
          return rows.slice(1).map((row, i): Game => {
            // Con UNFORMATTED_VALUE le celle vuote in coda sono omesse dall'API;
            // ?? null per distinguere "cella assente" da "cella con valore 0"
            const r = Array.from(
              { length: SHEET_COLUMN_COUNT },
              (_, idx) => row[idx] ?? null
            );
            return {
              rowIndex: i + 2,
              id: str(r[SHEET_COLUMNS.id]) || `row-${i + 2}`,
              title: str(r[SHEET_COLUMNS.title]),
              platform: str(r[SHEET_COLUMNS.platform]),
              price: cleanPrice(r[SHEET_COLUMNS.price]),
              // buyDate: seriale numerico → "gg/mm/aaaa"; stringa preesistente → as-is
              buyDate: this.fromSheetsSerial(r[SHEET_COLUMNS.buyDate]),
              buyYear: str(r[SHEET_COLUMNS.buyYear]),
              steamId: str(r[SHEET_COLUMNS.steamId]),
              features: splitMapFilter(r[SHEET_COLUMNS.features]),
              genres: splitMapFilter(r[SHEET_COLUMNS.genres]),
              italianSupport: str(r[SHEET_COLUMNS.italianSupport]) === 'Sì',
              vR: str(r[SHEET_COLUMNS.vR]) === 'Sì',
              releaseDate: str(r[SHEET_COLUMNS.releaseDate]),
              stateStefano: str(r[SHEET_COLUMNS.stateStefano]),
              stateErica: str(r[SHEET_COLUMNS.stateErica]),
              stateAlessandro: str(r[SHEET_COLUMNS.stateAlessandro]),
              image: str(r[SHEET_COLUMNS.imageUrl]),
              // rating: number 3 → "3"; garantisce parseInt corretto nel form
              rating: str(r[SHEET_COLUMNS.rating]),
              error: str(r[SHEET_COLUMNS.error]),
              requiredAge: str(r[SHEET_COLUMNS.requiredAge]),
            };
          });
        })
      )
    );
  }

  // ── WRITE ───────────────────────────────────────────────────────────────────

  /**
   * Aggiunge un nuovo gioco al foglio in due passi:
   * 1. Append di una riga con il solo id per ottenere il rowIndex assegnato da Sheets.
   * 2. writeGameCells() per riempire tutte le colonne editabili di quella riga.
   *
   * Il doppio passaggio è necessario perché batchUpdate richiede un rowIndex noto,
   * mentre append è l'unico endpoint che inserisce righe senza conoscerlo in anticipo.
   */
  addGame(game: Omit<Game, 'rowIndex' | 'id'>): Observable<any> {
    const id = crypto.randomUUID();
    const url = `${BASE}/${this.spreadsheetId}/values/${RANGE}`
      + `:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

    return this.withValidToken(() =>
      this.http.post<any>(url, { values: [[id]] }, { headers: this.headers }).pipe(
        switchMap(res => {
          // updatedRange restituisce qualcosa come "Giochi!A100:A100"
          const rowIndex = this.extractRowIndex(res.updates?.updatedRange);
          if (!rowIndex) throw new Error('addGame: rowIndex non determinabile dalla risposta append');
          return this.writeGameCells({ ...game, id }, rowIndex);
        })
      )
    );
  }

  /**
   * Aggiorna un gioco esistente sovrascrivendo solo le colonne editabili.
   *
   * Colonne NON toccate (intenzionalmente):
   * - F, col. 5:  buyYear  → ARRAYFORMULA calcola ANNO(E)
   * - Q, col. 16: image    → formula =IMAGE(…) calcolata dal foglio
   */
  updateGame(game: Game): Observable<any> {
    if (!game.rowIndex) throw new Error('updateGame: rowIndex mancante');
    return this.withValidToken(() => this.writeGameCells(game, game.rowIndex!));
  }

  deleteGame(rowIndex: number): Observable<any> {
    // deleteDimension shifta verso l'alto le righe successive (diversamente da clear)
    const url = `${BASE}/${this.spreadsheetId}:batchUpdate`;
    const body = {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: 0,            // aggiorna con gid=XXXXX se il foglio non è il primo
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-based
            endIndex: rowIndex,
          },
        },
      }],
    };
    return this.withValidToken(() =>
      this.http.post(url, body, { headers: this.headers })
    );
  }

  /**
   * Scrive il marker pending nella colonna error di tutti i giochi passati,
   * in una singola chiamata batchUpdate per minimizzare le richieste API.
   * Usato prima dell'avvio di un'operazione bulk per marcare i record da elaborare.
   */
  markGamesPending(games: Game[], marker: string): Observable<any> {
    const s = environment.sheetName;
    const url = `${BASE}/${this.spreadsheetId}/values:batchUpdate`;

    const data = games.map(g => ({
      range: `${s}!S${g.rowIndex}`,
      values: [[marker]],
    }));

    const body = { valueInputOption: 'RAW', data };
    return this.withValidToken(() =>
      this.http.post(url, body, { headers: this.headers })
    );
  }

  /**
   * Svuota la colonna error (S) per tutti i giochi del foglio.
   * Usa un range continuo S2:S{lastRow} per una singola chiamata API.
   */
  clearAllErrors(lastRowIndex: number): Observable<any> {
    const s = environment.sheetName;
    const url = `${BASE}/${this.spreadsheetId}/values/${s}!S2:S${lastRowIndex}:clear`;
    return this.withValidToken(() =>
      this.http.post(url, {}, { headers: this.headers })
    );
  }

  // ── HELPERS PRIVATI ─────────────────────────────────────────────────────────

  /**
   * Scrive le colonne editabili di un gioco su una riga specifica.
   *
   *   A  col 0  id
   *   B  col 1  title
   *   C  col 2  platform
   *   D  col 3  price          → JS number per evitare parsing locale IT
   *   E  col 4  buyDate        → formato ISO "aaaa-mm-gg"
   *   -- col 5  buyYear        → SALTATA: ARRAYFORMULA
   *   G  col 6  steamId
   *   H  col 7  features
   *   I  col 8  genres
   *   J  col 9  italianSupport → "Sì"/"No"
   *   K  col 10 vR             → "Sì"/"No"
   *   L  col 11 releaseDate    → formato ISO "aaaa-mm-gg"
   *   M  col 12 stateStefano
   *   N  col 13 stateErica
   *   O  col 14 stateAlessandro
   *   P  col 15 imageUrl       → URL copertina
   *   -- col 16 image          → SALTATA: formula =IMAGE(…)
   *   R  col 17 rating         → JS number per smart chip
   *   S  col 18 error          → testo libero; stringa vuota = nessun errore
   *   T  col 19 requiredAge    → JS number
   */
  private writeGameCells(
    game: Omit<Game, 'rowIndex'>,
    rowIndex: number
  ): Observable<any> {
    const s = environment.sheetName;
    const r = rowIndex;
    const url = `${BASE}/${this.spreadsheetId}/values:batchUpdate`;

    const body = {
      valueInputOption: 'USER_ENTERED',
      data: [
        // A-E: id, title, platform, price, buyDate
        {
          range: `${s}!A${r}:E${r}`,
          values: [[
            game.id ?? '',
            game.title,
            game.platform ?? '',
            // Prezzo: JS number (non stringa) per evitare il parsing locale di USER_ENTERED.
            // Con locale IT, la stringa "29.99" verrebbe letta come 2999 (il punto è
            // separatore delle migliaia in italiano). Un JS number nel JSON bypassa questo.
            this.toNumber(game.price),
            // Data: formato ISO aaaa-mm-gg → riconosciuto da Sheets in qualsiasi locale del foglio.
            // Con FORMATTED_VALUE in lettura viene restituita nel formato della colonna (es. "30/12/2024").
            this.toISODate(game.buyDate),
          ]],
        },
        // F: ARRAYFORMULA
        // G-P: steamId, features, genres, italianSupport, vR, releaseDate, stati giocatori, imageUrl
        {
          range: `${s}!G${r}:P${r}`,
          values: [[
            game.steamId ?? '',
            game.features.join(', '),
            game.genres.join(', '),
            (game.italianSupport || false) ? 'Sì' : 'No',
            (game.vR || false) ? 'Sì' : 'No',
            this.toISODate(game.releaseDate),
            game.stateStefano ?? 'Non interessa',
            game.stateErica ?? 'Non interessa',
            game.stateAlessandro ?? 'Non interessa',
            game.image ?? '',
          ]],
        },
        // Q: ARRAYFORMULA
        // R-T: rating, error, requiredAge
        {
          range: `${s}!R${r}:T${r}`,
          values: [[
            this.toNumber(game.rating),
            game.error ?? '',
            this.toNumber(game.requiredAge)
          ]],
        },
      ],
    };

    return this.http.post(url, body, { headers: this.headers });
  }

  /**
   * Estrae il numero di riga dal range restituito dall'API Sheets.
   * Esempio: "Giochi!A100:A100" → 100, "Giochi!A5" → 5
   */
  private extractRowIndex(updatedRange: string | undefined): number | null {
    if (!updatedRange) return null;
    const match = updatedRange.match(/[A-Z]+(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Converte un valore data letto con UNFORMATTED_VALUE in stringa "gg/mm/aaaa".
   *
   * - number: seriale Sheets (giorni da 30/12/1899) → converte in data italiana
   * - string: data già testuale (righe pre-esistenti salvate come testo) → restituisce as-is
   * - null/undefined/0/'': stringa vuota
   *
   * Usa Date.UTC per evitare shift da fuso orario nel calcolo.
   */
  private fromSheetsSerial(value: any): string {
    if (!value) return '';
    if (typeof value === 'number') {
      const EPOCH = Date.UTC(1899, 11, 30);
      const d = new Date(EPOCH + value * 86_400_000);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
    return String(value); // stringa preesistente (testo data già in formato gg/mm/aaaa)
  }


  /**
   * Converte una stringa numerica in JS number per la scrittura via Sheets API.
   *
   * Con USER_ENTERED, passare un JS number (non una stringa) è essenziale per i fogli
   * con locale IT: la stringa "29.99" verrebbe interpretata come 2999 (il punto è
   * separatore delle migliaia in italiano), mentre il number 29.99 viene memorizzato
   * direttamente senza alcun parsing locale.
   * Restituisce '' (stringa vuota) se il valore non è un numero valido,
   * così la cella viene lasciata vuota invece di contenere NaN o 0.
   */
  private toNumber(value: string | undefined): number | '' {
    if (!value) return '';
    const n = parseFloat(value.replace(',', '.'));
    return isNaN(n) ? '' : n;
  }

  /**
   * Converte una stringa gg/mm/aaaa nel formato ISO aaaa-mm-gg.
   *
   * Il formato ISO è l'unico riconosciuto da Sheets con USER_ENTERED in qualsiasi
   * locale del foglio (IT, EN-US, ecc.), garantendo che la cella venga salvata come
   * tipo "Data" senza apostrofo e senza dipendere dalla locale del foglio.
   * Restituisce '' se la stringa non è nel formato atteso.
   */
  private toISODate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const [d, m, y] = dateStr.split('/').map(Number);
    if (!d || !m || !y) return '';
    // Padding a due cifre per rispettare il formato ISO 8601
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
}