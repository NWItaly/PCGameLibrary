// steam.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, switchMap, map } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface SteamGameData {
  appId: number;
  name: string;
  genres: string[];
  features: string[];
  italianSupport: boolean;
  vR: boolean;
  releaseDate: string;     // gg/mm/aaaa
  image: string;
  requiredAge: string;     // es. '17', '' se non specificato
}

/** Struttura grezza restituita da Steam appdetails (campi che ci interessano) */
interface SteamRawData {
  steam_appid: number;
  name: string;
  header_image: string;
  supported_languages: string;   // stringa HTML: "English<strong>*</strong>, Italian..."
  release_date: { date: string; coming_soon: boolean };
  genres?: { id: string; description: string }[];
  categories?: { id: number; description: string }[];
  required_age: string | number;
  ratings?: {
    pegi?: { required_age?: string | number };
    esrb?: { required_age?: string | number };
    usk?: { required_age?: string | number };
  };
}

/**
 * Struttura della risposta Execution API di Apps Script.
 *
 * In caso di errore, il campo `error.details` contiene un array con
 * `errorMessage` (il messaggio dell'eccezione lanciata dallo script)
 * e `scriptStackTraceElements` (stack trace). Il campo `error.message`
 * contiene solo "ScriptError", non il messaggio utile.
 */
interface ScriptApiResponse {
  response?: { result: SteamRawData };
  error?: {
    code: number;
    message: string;   // sempre "ScriptError" — non usare per display
    status: string;
    details?: {
      errorMessage?: string;
      scriptStackTraceElements?: { function: string; lineNumber: number }[];
    }[];
  };
}

export interface SteamSearchResult {
  appId: string;
  name: string;
  logo: string;
  price: string;
}

interface SteamSearchResponse {
  success: boolean;
  results: SteamSearchResult[];
}

interface ScriptSearchApiResponse {
  response?: { result: SteamSearchResponse };
  error?: {
    code: number;
    message: string;
    status: string;
    details?: {
      errorMessage?: string;
      scriptStackTraceElements?: { function: string; lineNumber: number }[];
    }[];
  };
}

const SCRIPT_API = 'https://script.googleapis.com/v1/scripts';

@Injectable({ providedIn: 'root' })
export class SteamService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /**
   * Carica i metadati di un gioco Steam invocando la funzione `getSteamData`
   * dello script Apps Script tramite Execution API, poi mappa il JSON grezzo
   * nel formato usato dall'app.
   *
   * @param steamId — Steam App ID come stringa (es. "1091500")
   */
  loadByAppId(steamId: string): Observable<SteamGameData> {
    return from(this.auth.ensureValidToken()).pipe(
      switchMap(() => {
        const url = `${SCRIPT_API}/${environment.steamScriptId}:run`;
        const headers = new HttpHeaders({
          Authorization: `Bearer ${this.auth.accessToken()}`,
          'Content-Type': 'application/json',
        });
        const body = {
          function: 'getSteamData',
          parameters: [steamId],
          devMode: false,
        };
        return this.http.post<ScriptApiResponse>(url, body, { headers });
      }),
      map((res) => {
        if (res.error) {
          // Il messaggio utile è in details[0].errorMessage, non in error.message
          // che contiene sempre il generico "ScriptError"
          const detail = res.error.details?.[0]?.errorMessage;
          throw new Error(detail ?? res.error.message ?? 'Errore Apps Script');
        }
        if (!res.response?.result) {
          throw new Error('Risposta Apps Script vuota');
        }
        return this.mapSteamData(res.response.result);
      })
    );
  }

  /**
   * Mappa il JSON grezzo di Steam nel formato usato dall'app.
   *
   * supported_languages è una stringa HTML come:
   *   "English<strong>*</strong>, Italian<strong>*</strong>, French..."
   * Rimuoviamo i tag HTML prima di cercare "Italian".
   */
  private mapSteamData(d: SteamRawData): SteamGameData {
    // Rimuove tutti i tag HTML dalla stringa delle lingue
    const languages = d.supported_languages?.replace(/<[^>]*>/g, '') ?? '';
    const hasItalian = languages.toLowerCase().includes('italian');

    // Cerca categorie con "VR" nel nome (es. "SteamVR Collectibles", "VR Only", "VR Support")
    const hasVr = d.categories?.some(c => /(\sVR)|(VR\s)/i.test(c.description)) ?? false;

    return {
      appId: d.steam_appid,
      name: d.name,
      genres: d.genres?.map(g => g.description) ?? [],
      features: d.categories?.map(c => c.description) ?? [],
      italianSupport: hasItalian,
      vR: hasVr,
      releaseDate: this.convertDate(d.release_date?.date),
      image: d.header_image ?? '',
      requiredAge: this.extractRequiredAge(d),
    };
  }

  /**
   * Converte la data inglese di Steam (es. "Feb 9, 2016") in formato ISO.
   * Restituisce stringa vuota se non parsabile.
   */
  private convertDate(dateString: string | undefined): string {
    if (!dateString) return '';

    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      gen: '01', mag: '05', giu: '06', lug: '07', ago: '08', set: '09', ott: '10', dic: '12',
    };

    const match = dateString.match(/(\d{1,2})\s+([a-zA-Zà-ù]{3})[a-zà-ù.]*,?\s+(\d{4})/i);
    if (match) {
      const [, day, monKey, year] = match;
      const mm = months[monKey.toLowerCase()];
      if (mm) return `${year}-${mm}-${day.padStart(2, '0')}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().substring(0, 10);
  }

  /**
   * Estrae l'età richiesta seguendo l'ordine di priorità:
   * PEGI, ESRB, USK, infine required_age generico.
   */
  private extractRequiredAge(d: SteamRawData): string {
    const ratings = d.ratings;
    const candidates = [
      ratings?.pegi?.required_age,
      ratings?.esrb?.required_age,
      ratings?.usk?.required_age,
      d.required_age,
    ];

    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '' && c !== 0) {
        return String(c);
      }
    }
    return '';
  }

  searchGames(term: string): Observable<SteamSearchResult[]> {
    return from(this.auth.ensureValidToken()).pipe(
      switchMap(() => {
        const url = `${SCRIPT_API}/${environment.steamScriptId}:run`;
        const headers = new HttpHeaders({
          Authorization: `Bearer ${this.auth.accessToken()}`,
          'Content-Type': 'application/json',
        });
        const body = {
          function: 'searchSteamGames',
          parameters: [term],
          devMode: false,
        };
        return this.http.post<ScriptSearchApiResponse>(url, body, { headers });
      }),
      map(res => {
        if (res.error) {
          const detail = res.error.details?.[0]?.errorMessage;
          throw new Error(detail ?? res.error.message ?? 'Errore Apps Script');
        }
        return res.response?.result?.results ?? [];
      })
    );
  }
}