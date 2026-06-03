// Modello per i filtri di ricerca avanzata
export interface GameFilters {
  // Ricerca testuale (titolo, genere, piattaforma)
  query: string;

  // Filtri a selezione multipla — array vuoto = nessun filtro
  platforms: string[];
  genres: string[];
  features: string[];
  statesStefano: string[];
  statesErica: string[];
  statesAlessandro: string[];

  // Filtri booleani — null = nessun filtro, true = Sì, false = No
  italianSupport: boolean | null;
  vr: boolean | null;

  // Slider range prezzo (€)
  priceMin: number;
  priceMax: number;

  // Slider range anno pubblicazione
  releaseYearMin: number;
  releaseYearMax: number;

  // Slider range anno acquisto
  buyYearMin: number;
  buyYearMax: number;

  // Filtro età minima PEGI — array vuoto = nessun filtro
  requiredAges: number[];
}

// Valori di default — nessun filtro attivo
export const DEFAULT_FILTERS: GameFilters = {
  query: '',
  platforms: [],
  genres: [],
  features: [],
  statesStefano: [],
  statesErica: [],
  statesAlessandro: [],
  italianSupport: null,
  vr: null,
  priceMin: 0,
  priceMax: 100,
  releaseYearMin: 1980,
  releaseYearMax: new Date().getFullYear(),
  buyYearMin: 2000,
  buyYearMax: new Date().getFullYear(),
  requiredAges: [],
};

// Conta quanti filtri avanzati sono attivi (esclude query)
export function countActiveFilters(f: GameFilters, defaults: GameFilters): number {
  let count = 0;
  if (f.platforms.length) count++;
  if (f.genres.length) count++;
  if (f.features.length) count++;
  if (f.statesStefano.length) count++;
  if (f.statesErica.length) count++;
  if (f.statesAlessandro.length) count++;
  if (f.italianSupport !== null) count++;
  if (f.vr !== null) count++;
  if (f.priceMax > 0 && (f.priceMin > defaults.priceMin || f.priceMax < defaults.priceMax)) count++;
  if (f.releaseYearMin > defaults.releaseYearMin || f.releaseYearMax < defaults.releaseYearMax) count++;
  if (f.buyYearMin > defaults.buyYearMin || f.buyYearMax < defaults.buyYearMax) count++;
  if (f.requiredAges.length) count++;
  return count;
}