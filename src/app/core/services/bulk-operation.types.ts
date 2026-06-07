// bulk-operation.types.ts

/** Stato di un singolo record durante un'operazione bulk */
export type BulkRecordStatus = 'pending' | 'processing' | 'success' | 'skipped' | 'error';

export interface BulkRecordResult {
    id: string;
    title: string;
    status: BulkRecordStatus;
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
    /** true = elaborazione in corso */
    running: boolean;
    /** true = elaborazione completata (con o senza errori) */
    completed: boolean;
    results: BulkRecordResult[];
}

/** Dati passati all'apertura del dialog */
export interface BulkProgressDialogData {
    operationLabel: string;
    /** Callback invocata dal dialog quando l'utente preme "Interrompi" */
    onAbort?: () => void;
    /** Callback invocata dal dialog quando l'utente preme "Chiudi" */
    onClose?: () => void;
}