// auth.service.ts
import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/script.external_request',
  'https://www.googleapis.com/auth/drive',
].join(' ');

const TOKEN_KEY = 'gis_access_token';
const TOKEN_EXPIRY_KEY = 'gis_token_expiry';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly accessToken = signal<string | null>(null);
  readonly isLoggedIn = signal(false);

  private tokenClient: any;

  init(): void {
    this.waitForGIS().then(() => {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: SCOPES,
        // Callback principale: salva il token e aggiorna i signal
        callback: (response: any) => {
          if (response.error) {
            console.error('OAuth error:', response.error);
            return;
          }
          // Calcola la scadenza sottraendo 60s come margine di sicurezza
          const expiry = Date.now() + (response.expires_in - 60) * 1000;
          localStorage.setItem(TOKEN_KEY, response.access_token);
          localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
          this.accessToken.set(response.access_token);
          this.isLoggedIn.set(true);
        },
      });

      this.tryRestoreSession();
    });
  }

  login(): void {
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  logout(): void {
    const token = this.accessToken();
    if (token) {
      google.accounts.oauth2.revoke(token, () => { });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this.accessToken.set(null);
    this.isLoggedIn.set(false);
  }

  // Garantisce un token valido; se scaduto tenta refresh silenzioso
  ensureValidToken(): Promise<void> {
    const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? '0', 10);

    // Token ancora valido: niente da fare
    if (this.isLoggedIn() && Date.now() < expiry) {
      return Promise.resolve();
    }

    // Token scaduto o assente: richiede nuovo token senza mostrare il popup
    return new Promise((resolve, reject) => {
      // Sovrascrive temporaneamente il callback per intercettare questa risposta
      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          reject(response.error);
          return;
        }
        const exp = Date.now() + (response.expires_in - 60) * 1000;
        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, exp.toString());
        this.accessToken.set(response.access_token);
        this.isLoggedIn.set(true);
        resolve();
      };
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  // Tenta di ripristinare la sessione dal localStorage all'avvio
  private tryRestoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? '0', 10);

    if (!token) return;

    if (Date.now() < expiry) {
      // Token ancora valido: ripristina subito senza chiamate
      this.accessToken.set(token);
      this.isLoggedIn.set(true);
    } else {
      // Token scaduto: tenta refresh silenzioso (prompt vuoto = no popup se sessione Google attiva)
      this.ensureValidToken().catch(() => {
        // Sessione Google scaduta: l'utente dovrà fare login manuale
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
      });
    }
  }

  private waitForGIS(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener('load', () => resolve());
      } else {
        const interval = setInterval(() => {
          if (typeof google !== 'undefined' && google.accounts?.oauth2) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        setTimeout(() => clearInterval(interval), 10000);
      }
    });
  }
}