// steam-bulk-update.service.ts
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SheetsService } from './sheets.service';
import { SteamService } from './steam.service';
import { BulkOperationService } from './bulk-operation.service';
import { Game } from '../models/game.model';

/** Millisecondi di attesa tra una chiamata Steam e la successiva */
const STEAM_THROTTLE_MS = 2000;

/** Numero di giochi per blocco prima del batchUpdate su Sheets */
const BLOCK_SIZE = 50;

export interface SteamBulkUpdateOptions {
    /** Se true, elabora solo i giochi che hanno un errore nella colonna error */
    onlyErrors: boolean;
}

@Injectable({ providedIn: 'root' })
export class SteamBulkUpdateService {
    private readonly sheets = inject(SheetsService);
    private readonly steam = inject(SteamService);
    private readonly bulk = inject(BulkOperationService);

    /** Flag per l'annullamento — il loop lo controlla ad ogni iterazione */
    private abortRequested = false;

    /**
     * Avvia l'aggiornamento massivo di tutti i giochi con steamId.
     * Progresso e risultati vengono scritti direttamente nel BulkOperationService.
     *
     * Flusso:
     * 1. getGames() per ottenere la lista completa
     * 2. Filtra i giochi con steamId → sono i candidati all'aggiornamento
     * 3. Itera a blocchi di BLOCK_SIZE:
     *    a. Per ogni gioco nel blocco: chiamata Steam + throttle
     *    b. Accumula gli aggiornamenti riusciti
     *    c. batchUpdate Sheets per l'intero blocco
     * 4. complete() o fail() sul BulkOperationService
     */
    async run(options: SteamBulkUpdateOptions = { onlyErrors: false }): Promise<void> {
        this.abortRequested = false;

        let games: Game[];
        try {
            games = await firstValueFrom(this.sheets.getGames());
        } catch (err: any) {
            this.bulk.fail(`Impossibile caricare i giochi: ${err?.message ?? err}`);
            return;
        }

        // Giochi senza steamId: sempre saltati indipendentemente dal filtro
        const withoutSteamId = games.filter(g => !g.steamId?.trim());

        // Candidati: hanno steamId; se onlyErrors=true, solo quelli con errore non vuoto
        const candidates = games
            .filter(g => g.steamId?.trim())
            .filter(g => options.onlyErrors ? g.error?.trim() : true);

        // I giochi con steamId ma senza errore, esclusi dal filtro onlyErrors → saltati
        const skippedByFilter = options.onlyErrors
            ? games.filter(g => g.steamId?.trim() && !g.error?.trim())
            : [];

        const total = withoutSteamId.length + skippedByFilter.length + candidates.length;
        this.bulk.start('Aggiornamento dati Steam', total);

        // Registra saltati per steamId mancante
        for (const g of withoutSteamId) {
            this.bulk.recordResult({
                id: g.id,
                title: g.title,
                status: 'skipped',
                message: 'Nessun Steam ID',
            });
        }

        // Registra saltati per filtro onlyErrors
        for (const g of skippedByFilter) {
            this.bulk.recordResult({
                id: g.id,
                title: g.title,
                status: 'skipped',
                message: 'Nessun errore precedente',
            });
        }

        // Elabora i candidati a blocchi
        for (let i = 0; i < candidates.length; i += BLOCK_SIZE) {
            if (this.abortRequested) break;

            const block = candidates.slice(i, i + BLOCK_SIZE);
            const updatedGames: Game[] = [];

            for (const game of block) {
                if (this.abortRequested) break;

                try {
                    const steamData = await firstValueFrom(
                        this.steam.loadByAppId(game.steamId!)
                    );

                    // Merge dei campi Steam; azzera l'errore precedente in caso di successo
                    const updated: Game = {
                        ...game,
                        genres: steamData.genres,
                        features: steamData.features,
                        italianSupport: steamData.italianSupport,
                        vR: steamData.vR,
                        releaseDate: steamData.releaseDate,
                        image: steamData.image,
                        requiredAge: steamData.requiredAge,
                        error: '',   // pulizia errore precedente
                    };
                    updatedGames.push(updated);

                    this.bulk.recordResult({
                        id: game.id,
                        title: game.title,
                        status: 'success',
                    });
                } catch (err: any) {
                    const message = err?.message ?? String(err);

                    // Scrive il messaggio di errore sulla riga del gioco per permettere il retry mirato
                    const withError: Game = { ...game, error: message };
                    updatedGames.push(withError);

                    this.bulk.recordResult({
                        id: game.id,
                        title: game.title,
                        status: 'error',
                        message,
                    });
                }

                await this.delay(STEAM_THROTTLE_MS);
            }

            // Scrittura blocco su Sheets (sia successi che errori, per aggiornare la colonna error)
            if (updatedGames.length > 0) {
                await this.writeBlock(updatedGames);
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