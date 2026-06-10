// game.model.ts

export interface Game {
  rowIndex?: number;       // riga 1-based nel foglio (intestazione esclusa)
  id: string;
  title: string;
  platform?: string;
  price?: string;
  buyDate?: string;
  buyYear?: string;        // calcolata dal foglio (ANNO(buyDate)) — non scrivere
  steamId?: string;
  features: string[];
  genres: string[];
  italianSupport?: boolean;
  vR?: boolean;
  releaseDate?: string;
  stateStefano?: string;
  stateErica?: string;
  stateAlessandro?: string;
  image?: string;          // URL copertina (col. 15 = imageUrl) — non scrivere direttamente in col. 16 = image
  rating?: string;         // stringa "1"–"5" nel model; scritta come numero nelle API
  error?: string;          // calcolata dal foglio — non scrivere
  requiredAge?: string;    // età minima
}

/** Dati del form: tutto tranne rowIndex; id opzionale (assente in aggiunta) */
export type GameFormData = Omit<Game, 'rowIndex' | 'id'> & { id?: string };

/**
 * Mappa nome-campo → indice colonna (0-based, A=0).
 * Ordine fisso: non riordinare senza aggiornare il foglio.
 */
export const SHEET_COLUMNS = {
  id: 0,
  title: 1,
  platform: 2,
  price: 3,
  buyDate: 4,
  buyYear: 5,              // calcolata dal foglio
  steamId: 6,
  features: 7,
  genres: 8,
  italianSupport: 9,
  vR: 10,
  releaseDate: 11,
  stateStefano: 12,
  stateErica: 13,
  stateAlessandro: 14,
  imageUrl: 15,            // URL copertina (→ Game.image)
  image: 16,               // formula =IMAGE(…) calcolata dal foglio
  rating: 17,
  error: 18,               // calcolata dal foglio
  requiredAge: 19,         // età minima
} as const;

/**
 * Indice dell'ultima colonna (0-based).
 * Usato per costruire il range "A:S" nelle API Sheets:
 *   String.fromCharCode(65 + SHEET_LASTCOLUMN) → 'S'
 */
export const SHEET_LASTCOLUMN = Object.keys(SHEET_COLUMNS).length - 1; // = 19

/**
 * Numero totale di colonne (= SHEET_LASTCOLUMN + 1).
 * Usato per Array.from() in getGames(): serve un array di 20 elementi (0-19),
 * non 19 — altrimenti la colonna `error` (indice 18) risulterebbe undefined.
 */
export const SHEET_COLUMN_COUNT = Object.keys(SHEET_COLUMNS).length; // = 20

/** Restituisce il valore trimmato della cella o stringa vuota se assente */
export type SheetRow = string[];
export function col(row: SheetRow, index: number): string {
  return row[index]?.trim() ?? '';
}

/** Valori possibili per lo stato di gioco per ciascun utente */
export const STATE_OPTIONS = ['Non interessa', 'Da giocare', 'Giocato'] as const;

/** Valori età minima (0 = nessun limite specificato) */
export const REQUIRED_AGES = [...Array.from({ length: 19 }, (_, i) => i)] as const;