// bulk-operation.types.ts

/** Stato di un singolo record durante un'operazione bulk */
export type BulkRecordStatus = 'pending' | 'processing' | 'success' | 'skipped' | 'error';

export interface BulkRecordResult {
    id: string;
    title: string;
    status: BulkRecordStatus;
    /** Timestamp di completamento del record (ms epoch) — usato per stima tempo */
    completedAt: number;
    /** Messaggio di errore o motivo dello skip */
    message?: string;
}

/** Stato complessivo dell'operazione, usato dal dialog */
export interface BulkOperationState {
    /** Etichetta operazione visualizzata nel dialog (es. 'Aggiornamento dati Steam') */
    operationLabel: string;
    total: number;
    processed: number;  // success + skipped + error
    success: number;
    skipped: number;
    errors: number;
    /** Timestamp di avvio operazione (ms epoch) */
    startedAt: number;
    /** true = elaborazione in corso */
    running: boolean;
    /** true = elaborazione completata (con o senza errori) */
    completed: boolean;
    results: BulkRecordResult[];
}

/** Dati passati all'apertura del dialog di progresso */
export interface BulkProgressDialogData {
    operationLabel: string;
    /** Callback invocata dal dialog quando l'utente preme "Interrompi" */
    onAbort?: () => void;
    /** Callback invocata dal dialog quando l'utente preme "Chiudi" */
    onClose?: () => void;
}

/**
 * Opzioni configurabili dall'utente per le operazioni bulk.
 * Estendibile con nuove opzioni senza modificare i componenti esistenti.
 */
export interface BulkOperationOptions {
    /** Elabora solo i record che hanno un errore precedente nella colonna error */
    onlyErrors: boolean;
    /**
     * Riga di inizio (1-based, intestazione = 1).
     * null = prima riga dati (riga 2).
     */
    fromRow: number | null;
    /**
     * Riga di fine (1-based, inclusa).
     * null = ultima riga del foglio.
     */
    toRow: number | null;
}

export const DEFAULT_BULK_OPTIONS: BulkOperationOptions = {
    onlyErrors: false,
    fromRow: null,
    toRow: null,
};

/**
 * Prefisso usato nella colonna error per marcare i record in attesa
 * di elaborazione. Formato: [PENDING:nome-operazione]
 */
export const PENDING_PREFIX = '[PENDING:';
export const ERROR_PREFIX = '[ERROR:';

/** Costruisce il marker pending per una specifica operazione */
export function pendingMarker(operation: string): string {
    return `${PENDING_PREFIX}${operation}]`;
}

/** Costruisce il marker errore per una specifica operazione */
export function errorMarker(operation: string, message: string): string {
    return `${ERROR_PREFIX}${operation}] ${message}`;
}

/** Verifica se una stringa è un marker pending per una specifica operazione */
export function isPendingMarker(value: string, operation: string): boolean {
    return value === pendingMarker(operation);
}