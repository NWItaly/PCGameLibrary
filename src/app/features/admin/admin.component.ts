// admin.component.ts
import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SteamBulkUpdateService } from '../../core/services/steam-bulk-update.service';
import { BulkOperationService } from '../../core/services/bulk-operation.service';
import { BulkProgressDialogComponent } from '../../shared/bulk-progress-dialog/bulk-progress-dialog.component';

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule,
        MatSlideToggleModule,
    ],
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {
    private readonly dialog = inject(MatDialog);
    private readonly steamBulk = inject(SteamBulkUpdateService);
    private readonly bulk = inject(BulkOperationService);

    /** Flag toggle "ritenta solo errori" */
    protected readonly onlyErrors = signal(false);

    /**
     * Apre il dialog di progresso e avvia l'aggiornamento massivo Steam.
     * Il dialog rimane aperto durante tutta l'elaborazione (disableClose = running).
     */
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

        // Avvia l'elaborazione asincrona dopo l'apertura del dialog
        // Non usiamo afterOpened() per evitare un tick in più: il dialog è già aperto
        // quando startSteamUpdate() viene chiamato dall'utente.
        this.steamBulk.run({ onlyErrors: this.onlyErrors() }).then(() => {
            // Riabilita la chiusura manuale del dialog a operazione completata
            dialogRef.disableClose = false;
        });
    }
}