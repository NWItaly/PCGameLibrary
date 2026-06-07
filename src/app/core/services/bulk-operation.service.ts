// bulk-operation.service.ts
import { Injectable, signal, computed, Signal } from '@angular/core';
import {
    BulkOperationState,
    BulkRecordResult,
    BulkRecordStatus,
} from './bulk-operation.types';

const INITIAL_STATE: BulkOperationState = {
    operationLabel: '',
    total: 0,
    processed: 0,
    success: 0,
    skipped: 0,
    errors: 0,
    running: false,
    completed: false,
    results: [],
};

@Injectable({ providedIn: 'root' })
export class BulkOperationService {
    /** Stato corrente dell'operazione — esposto in sola lettura al template */
    private readonly _state = signal<BulkOperationState>({ ...INITIAL_STATE });
    readonly state: Signal<BulkOperationState> = this._state.asReadonly();

    /** Percentuale 0-100 calcolata dai signal */
    readonly progressPercent = computed(() => {
        const s = this._state();
        if (s.total === 0) return 0;
        return Math.round((s.processed / s.total) * 100);
    });

    /** Inizializza una nuova operazione e azzera lo stato precedente */
    start(operationLabel: string, total: number): void {
        this._state.set({
            ...INITIAL_STATE,
            operationLabel,
            total,
            running: true,
        });
    }

    /** Registra il risultato di un singolo record */
    recordResult(result: BulkRecordResult): void {
        this._state.update(s => {
            const delta = this.deltaFor(result.status);
            return {
                ...s,
                processed: s.processed + 1,
                success: s.success + delta.success,
                skipped: s.skipped + delta.skipped,
                errors: s.errors + delta.errors,
                results: [...s.results, result],
            };
        });
    }

    /** Segna l'operazione come completata */
    complete(): void {
        this._state.update(s => ({ ...s, running: false, completed: true }));
    }

    /** Segna l'operazione come interrotta da errore fatale */
    fail(message: string): void {
        this._state.update(s => ({
            ...s,
            running: false,
            completed: true,
            results: [
                ...s.results,
                { id: 'FATAL', title: 'Errore fatale', status: 'error', message },
            ],
        }));
    }

    /** Azzera lo stato (usato alla riapertura del dialog) */
    reset(): void {
        this._state.set({ ...INITIAL_STATE });
    }

    private deltaFor(status: BulkRecordStatus): {
        success: number;
        skipped: number;
        errors: number;
    } {
        switch (status) {
            case 'success': return { success: 1, skipped: 0, errors: 0 };
            case 'skipped': return { success: 0, skipped: 1, errors: 0 };
            case 'error': return { success: 0, skipped: 0, errors: 1 };
            default: return { success: 0, skipped: 0, errors: 0 };
        }
    }
}