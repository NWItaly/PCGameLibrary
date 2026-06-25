// bulk-progress-dialog.component.ts
import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { BulkOperationService } from '../../core/services/bulk-operation.service';
import { BulkOperationState, BulkProgressDialogData, BulkRecordResult } from '../../core/services/bulk-operation.types';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
    selector: 'app-bulk-progress-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatProgressBarModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatExpansionModule,
        MatDividerModule,
        TranslocoModule,
    ],
    templateUrl: './bulk-progress-dialog.component.html',
    styleUrls: ['./bulk-progress-dialog.component.scss'],
})
export class BulkProgressDialogComponent implements OnDestroy {
    protected readonly bulk = inject(BulkOperationService);
    protected readonly dialogRef = inject(MatDialogRef<BulkProgressDialogComponent>);
    protected readonly data = inject<BulkProgressDialogData>(MAT_DIALOG_DATA);

    /** true = l'utente ha premuto Interrompi, in attesa che il loop termini il record corrente */
    protected aborting = false;
    /** true = l'operazione è stata interrotta volontariamente (per il banner finale) */
    protected abortedByUser = false;

    /** Stato tipato esplicitamente per evitare inferenza unknown da asReadonly() */
    protected get s(): BulkOperationState {
        return this.bulk.state() as BulkOperationState;
    }

    protected get errorResults(): BulkRecordResult[] {
        return this.s.results.filter(r => r.status === 'error');
    }

    protected get skippedResults(): BulkRecordResult[] {
        return this.s.results.filter(r => r.status === 'skipped');
    }

    protected abort(): void {
        this.aborting = true;
        this.abortedByUser = true;
        // Delega al chiamante: il dialog non conosce il service specifico dell'operazione
        this.data.onAbort?.();
        // Riabilita la chiusura: l'utente ha scelto consapevolmente di fermare
        this.dialogRef.disableClose = false;
    }

    protected close(): void {
        this.data.onClose?.();
        this.dialogRef.close();
    }

    ngOnDestroy(): void {
        // Non resettiamo qui: il chiamante decide quando resettare
    }
}