// bulk-settings-dialog.component.ts
import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { BulkOperationOptions, DEFAULT_BULK_OPTIONS } from '../../core/services/bulk-operation.types';
import { TranslocoModule } from '@jsverse/transloco';

export interface BulkSettingsDialogData {
    operationLabel: string;
    currentOptions: BulkOperationOptions;
}

@Component({
    selector: 'app-bulk-settings-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatSlideToggleModule,
        MatInputModule,
        MatFormFieldModule,
        MatDividerModule,
        FormsModule,
        TranslocoModule,
    ],
    templateUrl: './bulk-settings-dialog.component.html',
    styleUrls: ['./bulk-settings-dialog.component.scss'],
})
export class BulkSettingsDialogComponent {
    protected readonly dialogRef = inject(MatDialogRef<BulkSettingsDialogComponent>);
    protected readonly data = inject<BulkSettingsDialogData>(MAT_DIALOG_DATA);

    protected options: BulkOperationOptions = { ...this.data.currentOptions };

    // number | null direttamente — mat-input type="number" con ngModel binding come number
    protected fromRow: number | null = this.options.fromRow;
    protected toRow: number | null = this.options.toRow;

    protected get rangeInvalid(): boolean {
        return this.fromRow !== null && this.toRow !== null && this.fromRow > this.toRow;
    }

    protected confirm(): void {
        const result: BulkOperationOptions = {
            ...this.options,
            // Garantisce che fromRow non sia mai inferiore a 2 (riga 1 = intestazione)
            fromRow: this.fromRow !== null ? Math.max(2, this.fromRow) : null,
            toRow: this.toRow,
        };
        this.dialogRef.close(result);
    }

    protected reset(): void {
        this.options = { ...DEFAULT_BULK_OPTIONS };
        this.fromRow = null;
        this.toRow = null;
    }

    protected cancel(): void {
        this.dialogRef.close(null);
    }
}