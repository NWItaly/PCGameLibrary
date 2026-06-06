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
}

interface ScriptApiResponse {
  response?: { result: SteamRawData };
  error?: { message: string; status: string };
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
          throw new Error(res.error.message ?? 'Errore Apps Script');
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
      requiredAge: d.required_age ? String(d.required_age) : '',
    };
  }

  /**
   * Converte la data inglese di Steam (es. "Feb 9, 2016") in formato italiano gg/mm/aaaa.
   * Restituisce stringa vuota se non parsabile.
   */
  private convertDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // restituisce as-is se non parsabile
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}