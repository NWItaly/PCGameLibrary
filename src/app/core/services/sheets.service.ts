// sheets.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, map, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import {
  Game,
  GameFormData,
  SHEET_COLUMNS,
  SHEET_LASTCOLUMN,
  SHEET_COLUMN_COUNT,
} from '../models/game.model';
import { environment } from '../../../environments/environment';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Range completo del foglio: da colonna A fino all'ultima (es. "Giochi!A:S").
 * String.fromCharCode(65 + 18) = 'S' → copre tutte le 19 colonne definite in SHEET_COLUMNS.
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
    const url = `${BASE}/${this.spreadsheetId}/values/${RANGE}`
      + `?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

    const cleanPrice = (s: string): string =>
      s?.replace(/[^0-9.,]/g, '').replace(',', '.').trim() ?? '';

    const splitMapFilter = (s: string): string[] =>
      s.split(',').map(p => p.trim()).filter(Boolean);

    return this.withValidToken(() =>
      this.http.get<any>(url, { headers: this.headers }).pipe(
        map((res) => {
          const rows: string[][] = res.values ?? [];
          return rows.slice(1).map((row, i): Game => {
            // Estende la riga a SHEET_COLUMN_COUNT (19) elementi con stringhe vuote,
            // così ogni accesso per indice è sempre definito (inclusa la col. error = 18).
            const r = Array.from(
              { length: SHEET_COLUMN_COUNT },
              (_, idx) => row[idx] ?? ''
            );
            return {
              rowIndex:        i + 2,
              id:              r[SHEET_COLUMNS.id] || `row-${i + 2}`,
              title:           r[SHEET_COLUMNS.title],
              platform:        r[SHEET_COLUMNS.platform],
              price:           cleanPrice(r[SHEET_COLUMNS.price]),
              buyDate:         r[SHEET_COLUMNS.buyDate],
              buyYear:         r[SHEET_COLUMNS.buyYear],
              steamId:         r[SHEET_COLUMNS.steamId],
              features:        splitMapFilter(r[SHEET_COLUMNS.features]),
              genres:          splitMapFilter(r[SHEET_COLUMNS.genres]),
              italianSupport:  r[SHEET_COLUMNS.italianSupport],
              vR:              r[SHEET_COLUMNS.vR],
              releaseDate:     r[SHEET_COLUMNS.releaseDate],
              stateStefano:    r[SHEET_COLUMNS.stateStefano],
              stateErica:      r[SHEET_COLUMNS.stateErica],
              stateAlessandro: r[SHEET_COLUMNS.stateAlessandro],
              image:           r[SHEET_COLUMNS.imageUrl],  // col. 15 = URL copertina
              rating:          r[SHEET_COLUMNS.rating],
              error:           r[SHEET_COLUMNS.error],
            };
          });
        })
      )
    );
  }

  // ── WRITE ───────────────────────────────────────────────────────────────────

  addGame(game: Omit<Game, 'rowIndex' | 'id'>): Observable<any> {
    const url = `${BASE}/${this.spreadsheetId}/values/${RANGE}`
      + `:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

    const row = this.gameToRow({ ...game, id: crypto.randomUUID() });

    return this.withValidToken(() =>
      this.http.post(url, { values: [row] }, { headers: this.headers })
    );
  }

  updateGame(game: Game): Observable<any> {
    // Range completo della riga: da A a ultima colonna (es. A5:S5)
    const lastCol = String.fromCharCode(65 + SHEET_LASTCOLUMN);
    const range   = `${environment.sheetName}!A${game.rowIndex}:${lastCol}${game.rowIndex}`;
    const url     = `${BASE}/${this.spreadsheetId}/values/${range}?valueInputOption=RAW`;

    const row = this.gameToRow(game);

    return this.withValidToken(() =>
      this.http.put(url, { values: [row] }, { headers: this.headers })
    );
  }

  deleteGame(rowIndex: number): Observable<any> {
    // deleteDimension shifta verso l'alto le righe successive (diversamente da clear)
    const url  = `${BASE}/${this.spreadsheetId}:batchUpdate`;
    const body = {
      requests: [{
        deleteDimension: {
          range: {
            sheetId:    0,            // aggiorna con gid=XXXXX se il foglio non è il primo
            dimension:  'ROWS',
            startIndex: rowIndex - 1, // 0-based
            endIndex:   rowIndex,
          },
        },
      }],
    };
    return this.withValidToken(() =>
      this.http.post(url, body, { headers: this.headers })
    );
  }

  // ── HELPERS PRIVATI ─────────────────────────────────────────────────────────

  /**
   * Serializza un Game (o GameFormData con id) in un array di 19 valori
   * pronto per le Sheets API con valueInputOption=RAW.
   *
   * Regole:
   * - `features` e `genres` (string[]) → stringa "a, b, c" (splitMapFilter inverso)
   * - `rating` → number intero, così Google Sheets lo riconosce come smart chip Valutazione
   * - Colonne calcolate dal foglio (buyYear, image col.16, error) → '' vuoto.
   */
  private gameToRow(game: Omit<Game, 'rowIndex'>): (string | number)[] {
    const row: (string | number)[] = new Array(SHEET_COLUMN_COUNT).fill('');

    row[SHEET_COLUMNS.id]              = game.id ?? '';
    row[SHEET_COLUMNS.title]           = game.title;
    row[SHEET_COLUMNS.platform]        = game.platform ?? '';
    // Prezzo: float JS → salvato come numero in Sheets (RAW). Stringa "10" → testo → apostrofo '''10''' visibile.
    const priceNum = parseFloat((game.price ?? '').replace(',', '.'));
    row[SHEET_COLUMNS.price]           = isNaN(priceNum) ? '' : priceNum;
    row[SHEET_COLUMNS.buyDate]         = game.buyDate ?? '';
    // buyYear (col. 5): calcolato dal foglio → lasciato ''
    row[SHEET_COLUMNS.steamId]         = game.steamId ?? '';
    row[SHEET_COLUMNS.features]        = game.features?.join(', ') ?? '';
    row[SHEET_COLUMNS.genres]          = game.genres?.join(', ') ?? '';
    row[SHEET_COLUMNS.italianSupport]  = game.italianSupport ?? '';
    row[SHEET_COLUMNS.vR]              = game.vR ?? '';
    row[SHEET_COLUMNS.releaseDate]     = game.releaseDate ?? '';
    row[SHEET_COLUMNS.stateStefano]    = game.stateStefano ?? 'Non interessa';
    row[SHEET_COLUMNS.stateErica]      = game.stateErica ?? 'Non interessa';
    row[SHEET_COLUMNS.stateAlessandro] = game.stateAlessandro ?? 'Non interessa';
    row[SHEET_COLUMNS.imageUrl]        = game.image ?? '';  // col. 15 = URL copertina
    // image (col. 16): formula =IMAGE(…) calcolata dal foglio → lasciato ''
    // rating: number (non stringa) per la smart chip "Valutazione" di Google Sheets
    row[SHEET_COLUMNS.rating]          = game.rating ? Number(game.rating) : '';
    // error (col. 18): calcolato dal foglio → lasciato ''

    return row;
  }
}