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
    startedAt: 0,
    running: false,
    completed: false,
    results: [],
};

/**
 * Numero di record recenti su cui calcolare la media mobile per la stima del tempo.
 * Esclude i record istantanei (saltati) all'inizio che distorcerebbero la media.
 */
const MOVING_AVG_WINDOW = 10;

@Injectable({ providedIn: 'root' })
export class BulkOperationService {
    /** Stato corrente dell'operazione — esposto in sola lettura al template */
    private readonly _state = signal<BulkOperationState>({ ...INITIAL_STATE });
    readonly state: Signal<BulkOperationState> = this._state.asReadonly();

    /** Percentuale 0-100 */
    readonly progressPercent = computed(() => {
        const s = this._state();
        if (s.total === 0) return 0;
        return Math.round((s.processed / s.total) * 100);
    });

    /**
     * Stima il tempo rimanente in secondi basandosi sulla media mobile
     * degli ultimi MOVING_AVG_WINDOW record non-istantanei (> 100ms).
     *
     * Restituisce null se non ci sono ancora abbastanza dati per una stima
     * attendibile (meno di 3 record non-istantanei completati).
     */
    readonly estimatedSecondsRemaining = computed((): number | null => {
        const s = this._state();
        if (!s.running || s.processed === 0) return null;

        const remaining = s.total - s.processed;
        if (remaining <= 0) return null;

        // Considera solo i record che hanno impiegato un tempo reale (non i saltati istantanei)
        const timed = s.results
            .filter(r => r.status !== 'skipped')
            .slice(-MOVING_AVG_WINDOW);

        if (timed.length < 3) return null;

        // Calcola gli intervalli tra record consecutivi (non il tempo assoluto dall'inizio)
        const intervals: number[] = [];
        for (let i = 1; i < timed.length; i++) {
            const delta = timed[i].completedAt - timed[i - 1].completedAt;
            if (delta > 0) intervals.push(delta);
        }
        if (intervals.length === 0) return null;

        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return Math.round((remaining * avgMs) / 1000);
    });

    /** Formatta i secondi rimanenti in stringa leggibile (es. "3 min 20 sec") */
    readonly estimatedTimeLabel = computed((): string | null => {
        const secs = this.estimatedSecondsRemaining();
        if (secs === null) return null;
        if (secs < 60) return `${secs} sec`;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return s > 0 ? `${m} min ${s} sec` : `${m} min`;
    });

    /** Inizializza una nuova operazione e azzera lo stato precedente */
    start(operationLabel: string, total: number): void {
        this._state.set({
            ...INITIAL_STATE,
            operationLabel,
            total,
            startedAt: Date.now(),
            running: true,
        });
    }

    recordResult(result: Omit<BulkRecordResult, 'completedAt'>): void {
        const withTimestamp: BulkRecordResult = { ...result, completedAt: Date.now() };
        this._state.update(s => {
            const delta = this.deltaFor(result.status);
            return {
                ...s,
                processed: s.processed + 1,
                success: s.success + delta.success,
                skipped: s.skipped + delta.skipped,
                errors: s.errors + delta.errors,
                results: [...s.results, withTimestamp],
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
                { id: 'FATAL', title: 'Errore fatale', status: 'error', message, completedAt: Date.now() },
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