import { Injectable, signal, computed } from '@angular/core';
import { Game } from '../models/game.model';
import {
  GameFilters,
  DEFAULT_FILTERS,
  countActiveFilters,
} from '../models/game-filters.model';

@Injectable({ providedIn: 'root' })
export class FilterService {
  // Stato corrente dei filtri
  readonly filters = signal<GameFilters>({ ...DEFAULT_FILTERS });

  // Range reali del dataset — aggiornati dopo il caricamento
  private datasetRanges = signal({
    priceMin: DEFAULT_FILTERS.priceMin,
    priceMax: DEFAULT_FILTERS.priceMax,
    releaseYearMin: DEFAULT_FILTERS.releaseYearMin,
    releaseYearMax: DEFAULT_FILTERS.releaseYearMax,
    buyYearMin: DEFAULT_FILTERS.buyYearMin,
    buyYearMax: DEFAULT_FILTERS.buyYearMax,
  });

  // Aggiorna i range reali dopo il caricamento dei giochi
  updateDatasetRanges(opts: ReturnType<typeof this.getDistinctValues>): void {
    this.datasetRanges.set({
      priceMin: opts.priceMin,
      priceMax: opts.priceMax,
      releaseYearMin: opts.releaseYearMin,
      releaseYearMax: opts.releaseYearMax,
      buyYearMin: opts.buyYearMin,
      buyYearMax: opts.buyYearMax,
    });
  }

  // Numero di filtri avanzati attivi (per il badge)
  readonly activeCount = computed(() =>
    countActiveFilters(this.filters(), {
      ...DEFAULT_FILTERS,
      ...this.datasetRanges(),
    })
  );

  // Aggiorna un sottoinsieme dei filtri
  update(partial: Partial<GameFilters>): void {
    this.filters.update((f) => ({ ...f, ...partial }));
  }

  // Resetta tutti i filtri ai valori di default
  reset(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
  }

  // Applica tutti i filtri a un array di giochi
  apply(games: Game[]): Game[] {
    const f = this.filters();

    return games.filter((g) => {
      // Ricerca testuale
      if (f.query) {
        const q = f.query.toLowerCase();
        const match =
          g.title?.toLowerCase().includes(q) ||
          g.genres?.some(genre => genre.toLowerCase().includes(q)) ||
          g.platform?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Piattaforma — valore mancante non passa
      if (f.platforms.length && !f.platforms.includes(g.platform || ''))
        return false;

      // Genere — valore mancante non passa
      if (f.genres.length && !g.genres?.some(genre => f.genres.includes(genre)))
        return false;

      // Feature — valore mancante non passa
      if (f.features.length && !g.features?.some(feat => f.features.includes(feat)))
        return false;

      // Stato Stefano — valore mancante non passa
      if (f.statesStefano.length && !f.statesStefano.includes(g.stateStefano || ''))
        return false;

      // Stato Erica — valore mancante non passa
      if (f.statesErica.length && !f.statesErica.includes(g.stateErica || ''))
        return false;

      // Stato Alessandro — valore mancante non passa
      if (f.statesAlessandro.length && !f.statesAlessandro.includes(g.stateAlessandro || ''))
        return false;

      // Supporto italiano — valore mancante trattato come 'no'
      if (f.italianSupport !== null) {
        const val = g.italianSupport?.toLowerCase() || 'no';
        if (val !== (f.italianSupport ? 'sì' : 'no')) return false;
      }

      // VR — valore mancante trattato come 'no'
      if (f.vr !== null) {
        const val = g.vR?.toLowerCase() || 'no';
        if (val !== (f.vr ? 'sì' : 'no')) return false;
      }

      // Prezzo — valore mancante trattato come 0
      const price = g.price
        ? parseFloat(g.price.replace(',', '.').replace('€', '').trim())
        : 0;
      if (!isNaN(price) && (price < f.priceMin || price > f.priceMax))
        return false;

      // Anno pubblicazione — valore mancante non passa se filtro attivo
      const releaseYear = this.parseYear(g.releaseDate);
      if (releaseYear === null) {
        if (f.releaseYearMin > this.datasetRanges().releaseYearMin ||
          f.releaseYearMax < this.datasetRanges().releaseYearMax)
          return false;
      } else if (releaseYear < f.releaseYearMin || releaseYear > f.releaseYearMax) {
        return false;
      }

      // Anno acquisto — valore mancante non passa se filtro attivo
      const buyYear = g.buyYear ? parseInt(g.buyYear, 10) : null;
      if (buyYear === null) {
        if (f.buyYearMin > this.datasetRanges().buyYearMin ||
          f.buyYearMax < this.datasetRanges().buyYearMax)
          return false;
      } else if (buyYear < f.buyYearMin || buyYear > f.buyYearMax) {
        return false;
      }

      return true;
    });
  }

  // Ricava i valori distinti da una lista di giochi per popolare i dropdown
  getDistinctValues(games: Game[]): {
    platforms: string[];
    genres: string[];
    features: string[];
    statesStefano: string[];
    statesErica: string[];
    statesAlessandro: string[];
    priceMin: number;
    priceMax: number;
    releaseYearMin: number;
    releaseYearMax: number;
    buyYearMin: number;
    buyYearMax: number;
  } {
    const distinct = <T>(arr: (T | undefined)[]): T[] =>
      [...new Set(arr.filter((v): v is T => !!v))].sort();

    const prices = games
      .map((g) => parseFloat((g.price ?? '').replace(',', '.').trim()))
      .filter((n) => !isNaN(n) && n > 0);

    const releaseYears = games
      .map((g) => this.parseYear(g.releaseDate))
      .filter((n): n is number => n !== null);

    const buyYears = games
      .map((g) => parseInt(g.buyYear ?? '', 10))
      .filter((n) => !isNaN(n));

    return {
      platforms: distinct(games.map((g) => g.platform)),
      genres: distinct(games.flatMap(g => g.genres)),
      features: distinct(games.flatMap(g => g.features)),
      statesStefano: distinct(games.map((g) => g.stateStefano)),
      statesErica: distinct(games.map((g) => g.stateErica)),
      statesAlessandro: distinct(games.map((g) => g.stateAlessandro)),
      priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
      priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 0,
      releaseYearMin: releaseYears.length ? Math.min(...releaseYears) : 1980,
      releaseYearMax: releaseYears.length ? Math.max(...releaseYears) : new Date().getFullYear(),
      buyYearMin: buyYears.length ? Math.min(...buyYears) : 2000,
      buyYearMax: buyYears.length ? Math.max(...buyYears) : new Date().getFullYear(),
    };
  }

  // Helper per estrarre l'anno da una data in formato dd/MM/yyyy o yyyy
  private parseYear(dateStr: string | undefined): number | null {
    if (!dateStr) return null;
    // Formato dd/MM/yyyy
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      const year = parseInt(parts[2], 10);
      return isNaN(year) ? null : year;
    }
    // Formato yyyy o yyyy-MM-dd
    const year = parseInt(dateStr.substring(0, 4), 10);
    return isNaN(year) ? null : year;
  }
}
