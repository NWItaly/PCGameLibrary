// steam.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, switchMap, map, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface SteamGameData {
  appId: number;
  genres: string[];
  features: string[];
  italianSupport: string;  // 'Sì' | 'No'
  vR: string;              // 'Sì' | 'No'
  releaseDate: string;     // gg/mm/aaaa
  image: string;
  requiredAge: string;     // es. '18', '' se non specificato
}

/**
 * Struttura della risposta dell'Apps Script Execution API.
 * In caso di errore lo script lancia un'eccezione che l'API restituisce
 * nel campo `error` invece di `response`.
 */
interface ScriptApiResponse {
  response?: { result: SteamGameData };
  error?: { message: string; status: string };
}

const SCRIPT_API = 'https://script.googleapis.com/v1/scripts';

@Injectable({ providedIn: 'root' })
export class SteamService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /**
   * Carica i metadati di un gioco Steam invocando la funzione `getSteamData`
   * dello script Apps Script tramite Execution API.
   *
   * Richiede che il token abbia lo scope:
   *   https://www.googleapis.com/auth/script.external_request
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
        // L'Execution API restituisce HTTP 200 anche quando lo script lancia
        // un'eccezione: l'errore è nel campo `error`, non nello status HTTP.
        if (res.error) {
          throw new Error(res.error.message ?? 'Errore Apps Script');
        }
        if (!res.response?.result) {
          throw new Error('Risposta Apps Script vuota');
        }
        return res.response.result;
      })
    );
  }
}