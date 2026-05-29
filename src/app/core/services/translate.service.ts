// src/app/core/services/translate.service.ts
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class TranslateService {
    private transloco = inject(TranslocoService);

    // Wrapper tipizzato per evitare 'unknown' dal tipo di ritorno di Transloco
    t(key: string, params?: Record<string, unknown>): string {
        return this.transloco.translate<string>(key, params);
    }
}