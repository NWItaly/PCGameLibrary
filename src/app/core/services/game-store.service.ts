// game-store.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { SheetsService } from './sheets.service';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameStoreService {
    private sheets = inject(SheetsService);

    readonly games = signal<Game[]>([]);
    readonly loading = signal(false);
    readonly error = signal(false);

    /** Carica i giochi solo se non già presenti in memoria */
    load(): void {
        if (this.games().length > 0) return;
        this.loading.set(true);
        this.error.set(false);
        this.sheets.getGames().subscribe({
            next: (data) => {
                this.games.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set(true);
                this.loading.set(false);
            },
        });
    }

    /** Forza il ricaricamento (usato dopo add/edit/delete) */
    reload(): void {
        this.games.set([]);
        this.load();
    }

    /** Svuota la lista (usato al logout) */
    clear(): void {
        this.games.set([]);
    }
}