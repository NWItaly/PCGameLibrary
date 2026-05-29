import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { isDevMode } from '@angular/core';
import { provideTransloco, Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { routes } from './app.routes';

// Carica i file JSON da assets/i18n/
@Injectable({ providedIn: 'root' })
class TranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) { }
  getTranslation(lang: string): Observable<Translation> {
    return this.http.get(`assets/i18n/${lang}.json`) as Observable<Translation>;
  }
}

const savedLang = localStorage.getItem('app_lang') ?? 'it';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideTransloco({
      config: {
        availableLangs: ['it', 'en'],
        defaultLang: savedLang,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: {
          useFallbackTranslation: true,
          logMissingKey: false,
        },
        fallbackLang: 'it',
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
