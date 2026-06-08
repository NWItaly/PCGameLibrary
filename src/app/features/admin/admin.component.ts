// admin.component.ts
import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { SteamBulkUpdateService } from '../../core/services/steam-bulk-update.service';
import { BulkOperationService } from '../../core/services/bulk-operation.service';
import { SheetsService } from '../../core/services/sheets.service';
import { BulkProgressDialogComponent } from '../../shared/bulk-progress-dialog/bulk-progress-dialog.component';
import { BulkSettingsDialogComponent } from '../../shared/bulk-settings-dialog/bulk-settings-dialog.component';
import { BulkOperationOptions, DEFAULT_BULK_OPTIONS } from '../../core/services/bulk-operation.types';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {
    private readonly dialog = inject(MatDialog);
    private readonly steamBulk = inject(SteamBulkUpdateService);
    private readonly bulk = inject(BulkOperationService);
    private readonly sheets = inject(SheetsService);

    /** Opzioni correnti per l'aggiornamento Steam — persistono tra aperture del dialog */
    protected steamOptions = signal<BulkOperationOptions>({ ...DEFAULT_BULK_OPTIONS });

    /** true durante lo svuotamento errori */
    protected clearingErrors = signal(false);

    /** Apre il dialog impostazioni e aggiorna le opzioni se confermato */
    openSteamSettings(): void {
        this.dialog.open(BulkSettingsDialogComponent, {
            data: {
                operationLabel: 'Aggiornamento dati Steam',
                currentOptions: this.steamOptions(),
            },
            width: '540px',
            maxWidth: '95vw',
        }).afterClosed().subscribe((result: BulkOperationOptions | null) => {
            if (result) this.steamOptions.set(result);
        });
    }

    startSteamUpdate(): void {
        // Resetta lo stato precedente prima di aprire il dialog
        this.bulk.reset();

        const dialogRef = this.dialog.open(BulkProgressDialogComponent, {
            data: {
                operationLabel: 'Aggiornamento dati Steam',
                // Il dialog chiama questa callback senza sapere nulla di SteamBulkUpdateService
                onAbort: () => this.steamBulk.abort(),
            },
            disableClose: true,
            width: '600px',
            maxWidth: '95vw',
        });

        this.steamBulk.run(this.steamOptions()).then(() => {
            dialogRef.disableClose = false;
        });
    }

    /** Svuota la colonna error per tutti i giochi del foglio */
    async clearAllErrors(): Promise<void> {
        this.clearingErrors.set(true);
        try {
            const games = await firstValueFrom(this.sheets.getGames());
            if (games.length === 0) return;
            const lastRow = Math.max(...games.map(g => g.rowIndex ?? 2));
            await firstValueFrom(this.sheets.clearAllErrors(lastRow));
        } catch (err) {
            console.error('Errore durante lo svuotamento della colonna errori:', err);
        } finally {
            this.clearingErrors.set(false);
        }
    }
}