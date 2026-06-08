// steam-bulk-update.service.ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SheetsService } from './sheets.service';
import { SteamService } from './steam.service';
import { BulkOperationService } from './bulk-operation.service';
import { Game } from '../models/game.model';
import {
    BulkOperationOptions,
    pendingMarker,
    errorMarker,
    isPendingMarker,
} from './bulk-operation.types';

/** Millisecondi di attesa tra una chiamata Steam e la successiva */
const STEAM_THROTTLE_MS = 2000;
/** Numero di giochi per blocco prima del batchUpdate su Sheets */
const BLOCK_SIZE = 50;
const OPERATION_NAME = 'steam-update';

@Injectable({ providedIn: 'root' })
export class SteamBulkUpdateService {
    private readonly sheets = inject(SheetsService);
    private readonly steam = inject(SteamService);
    private readonly bulk = inject(BulkOperationService);

    /** Flag per l'annullamento — il loop lo controlla ad ogni iterazione */
    private abortRequested = false;

    /**
     * Flusso completo:
     * 1. Carica tutti i giochi
     * 2. Applica filtri (range, onlyErrors, riprendi pending esistenti)
     * 3. Pre-marking: scrive [PENDING:steam-update] su tutti i candidati in una sola chiamata
     * 4. Elabora a blocchi con throttle Steam
     * 5. Per ogni record: successo → error='', fallimento → error='[ERROR:steam-update] msg'
     */
    async run(options: BulkOperationOptions): Promise<void> {
        this.abortRequested = false;

        let games: Game[];
        try {
            games = await firstValueFrom(this.sheets.getGames());
        } catch (err: any) {
            this.bulk.fail(`Impossibile caricare i giochi: ${err?.message ?? err}`);
            return;
        }

        const marker = pendingMarker(OPERATION_NAME);

        // Determina i candidati applicando i filtri nell'ordine:
        // 1. Ha steamId
        // 2. Rientra nel range righe specificato
        // 3. Se onlyErrors=true: ha errore non vuoto (inclusi [PENDING] di run precedenti interrotti)
        //    Se onlyErrors=false: tutti, oppure riprende quelli ancora [PENDING] da run interrotto
        const candidates = games.filter(g => {
            if (!g.steamId?.trim()) return false;

            // Filtro range righe
            if (options.fromRow !== null && g.rowIndex! < options.fromRow) return false;
            if (options.toRow !== null && g.rowIndex! > options.toRow) return false;

            if (options.onlyErrors) {
                // Ritenta: ha un errore reale o è rimasto pending da un run interrotto
                return !!g.error?.trim();
            }

            // Run normale: elabora tutto il range, ma se esistono già pending dello stesso
            // tipo (run precedente interrotto) riprendi solo quelli invece di ricominciare
            const hasPendingInRange = games.some(
                x => x.steamId?.trim() &&
                    (options.fromRow === null || x.rowIndex! >= options.fromRow) &&
                    (options.toRow === null || x.rowIndex! <= options.toRow) &&
                    isPendingMarker(x.error ?? '', OPERATION_NAME)
            );
            if (hasPendingInRange) {
                return isPendingMarker(g.error ?? '', OPERATION_NAME);
            }

            return true;
        });

        const withoutSteamId = games.filter(g => {
            if (g.steamId?.trim()) return false;
            if (options.fromRow !== null && g.rowIndex! < options.fromRow) return false;
            if (options.toRow !== null && g.rowIndex! > options.toRow) return false;
            return true;
        });

        // Giochi fuori range o esclusi dal filtro: non compaiono nel totale
        const total = withoutSteamId.length + candidates.length;
        this.bulk.start('Aggiornamento dati Steam', total);

        // Registra subito i saltati per steamId mancante
        for (const g of withoutSteamId) {
            this.bulk.recordResult({
                id: g.id, title: g.title,
                status: 'skipped', message: 'Nessun Steam ID',
            });
        }

        if (candidates.length === 0) {
            this.bulk.complete();
            return;
        }

        // Pre-marking: una singola chiamata Sheets per tutti i candidati
        // Permette di riprendere da dove si era arrivati in caso di interruzione
        try {
            await firstValueFrom(this.sheets.markGamesPending(candidates, marker));
        } catch (err: any) {
            this.bulk.fail(`Impossibile scrivere i marker pending: ${err?.message ?? err}`);
            return;
        }

        // Elaborazione a blocchi
        for (let i = 0; i < candidates.length; i += BLOCK_SIZE) {
            if (this.abortRequested) break;

            const block = candidates.slice(i, i + BLOCK_SIZE);
            const toWrite: Game[] = [];

            for (const game of block) {
                if (this.abortRequested) break;

                try {
                    const steamData = await firstValueFrom(
                        this.steam.loadByAppId(game.steamId!)
                    );

                    toWrite.push({
                        ...game,
                        genres: steamData.genres,
                        features: steamData.features,
                        italianSupport: steamData.italianSupport,
                        vR: steamData.vR,
                        releaseDate: steamData.releaseDate,
                        image: steamData.image,
                        requiredAge: steamData.requiredAge,
                        error: '',  // pulizia marker pending e/o errore precedente
                    });

                    this.bulk.recordResult({
                        id: game.id, title: game.title, status: 'success',
                    });
                } catch (err: any) {
                    const message = err?.message ?? String(err);
                    toWrite.push({
                        ...game,
                        error: errorMarker(OPERATION_NAME, message),
                    });
                    this.bulk.recordResult({
                        id: game.id, title: game.title, status: 'error', message,
                    });
                }

                await this.delay(STEAM_THROTTLE_MS);
            }

            if (toWrite.length > 0) {
                await this.writeBlock(toWrite);
            }
        }

        this.bulk.complete();
    }

    /** Interrompe l'elaborazione al termine del record corrente */
    abort(): void {
        this.abortRequested = true;
    }

    /**
     * Scrive un blocco di giochi su Sheets in sequenza.
     * Non usiamo Promise.all() per evitare di saturare la quota Sheets API.
     * Gli errori di scrittura non vengono propagati per non bloccare il loop principale:
     * vengono già registrati come 'success' lato Steam; un'eventuale estensione futura
     * potrebbe aggiungere un secondo flag 'writeError'.
     */
    private async writeBlock(games: Game[]): Promise<void> {
        for (const game of games) {
            try {
                await firstValueFrom(this.sheets.updateGame(game));
            } catch (err: any) {
                // Errore di scrittura: non blocca il loop, ma idealmente si potrebbe
                // aggiornare il record nel BulkOperationService. Per ora loggato in console.
                console.error(`Errore scrittura Sheets per "${game.title}":`, err);
            }
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}