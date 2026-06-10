import { Injectable } from '@angular/core';
import { Game, STATE_OPTIONS } from '../models/game.model';
import {
  AllStats,
  FeatureStat,
  GenreStat,
  PersonStateStat,
  PlatformStat,
  RatingStat,
  StateStat,
  YearlyStat,
} from '../models/stats.model';

export type GameState = typeof STATE_OPTIONS[number];

@Injectable({ providedIn: 'root' })
export class StatsService {

  compute(games: Game[]): AllStats {
    return {
      totalGames: games.length,
      totalSpend: this.computeTotalSpend(games),
      platforms: this.computePlatforms(games),
      yearly: this.computeYearly(games),
      personStates: this.computePersonStates(games),
      italianSupport: games.filter(g => g.italianSupport).length,
      vr: games.filter(g => g.vR).length,
      features: this.computeFeatures(games),
      genres: this.computeGenres(games),
      ratings: this.computeRatings(games),
    };
  }

  // ── PRIVATI ────────────────────────────────────────────────────────────────

  private computeTotalSpend(games: Game[]): number {
    return games.reduce((sum, g) => sum + this.parsePrice(g.price), 0);
  }

  private computePlatforms(games: Game[]): PlatformStat[] {
    const map = new Map<string, number>();
    for (const g of games) {
      const p = g.platform?.trim() || 'Sconosciuta';
      map.set(p, (map.get(p) ?? 0) + 1);
    }

    const total = games.length;
    const threshold = total * 0.02;

    const sorted: PlatformStat[] = [...map.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    const main = sorted.filter(p => p.count >= threshold);
    const others = sorted.filter(p => p.count < threshold);

    if (others.length > 0) {
      const othersCount = others.reduce((sum, p) => sum + p.count, 0);
      main.push({ platform: 'Altro', count: othersCount, details: others });
    }

    return main;
  }

  private computeYearly(games: Game[]): YearlyStat[] {
    const map = new Map<string, { count: number; prices: { title: string; price: number }[] }>();

    for (const g of games) {
      const year = g.buyYear?.trim() || 'N.D.';
      const price = this.parsePrice(g.price);
      if (!map.has(year)) map.set(year, { count: 0, prices: [] });
      const entry = map.get(year)!;
      entry.count++;
      if (price > 0) entry.prices.push({ title: g.title, price });
    }

    const result: YearlyStat[] = [...map.entries()]
      .map(([year, { count, prices }]): YearlyStat => {
        const totalSpend = prices.reduce((s, p) => s + p.price, 0);
        const avgPrice = prices.length ? totalSpend / prices.length : 0;
        const top3 = [...prices]
          .sort((a, b) => b.price - a.price)
          .slice(0, 3);
        return { year, count, avgPrice, totalSpend, top3 };
      });

    // Anni numerici in ordine cronologico, "N.D." sempre primo
    const known = result.filter(r => r.year !== 'N.D.').sort((a, b) => a.year.localeCompare(b.year));
    const unknown = result.find(r => r.year === 'N.D.');

    return unknown ? [unknown, ...known] : known;
  }

  private computePersonStates(games: Game[]): PersonStateStat[] {
    const persons: { person: PersonStateStat['person']; field: keyof Game }[] = [
      { person: 'Stefano', field: 'stateStefano' },
      { person: 'Erica', field: 'stateErica' },
      { person: 'Alessandro', field: 'stateAlessandro' },
    ];

    return persons.map(({ person, field }) => {
      const map = new Map<string, number>();
      // Inizializza tutti gli stati a 0 per mantenere ordine fisso
      for (const s of STATE_OPTIONS) map.set(s, 0);

      for (const g of games) {
        const state = (g[field] as string)?.trim() || 'Non interessa';
        map.set(state, (map.get(state) ?? 0) + 1);
      }

      const states: StateStat[] = [...map.entries()]
        .map(([state, count]) => ({ state, count }));

      return { person, states };
    });
  }

  private computeFeatures(games: Game[]): FeatureStat[] {
    const map = new Map<string, number>();
    for (const g of games) {
      for (const f of g.features) {
        const key = f.trim();
        if (key) map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }

  private computeGenres(games: Game[]): GenreStat[] {
    const map = new Map<string, number>();
    for (const g of games) {
      for (const genre of g.genres) {
        const key = genre.trim();
        if (key) map.set(key, (map.get(key) ?? 0) + 1);
      }
    }

    const sorted: GenreStat[] = [...map.entries()]
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count);

    const TOP_N = 10;
    const main = sorted.slice(0, TOP_N);
    const others = sorted.slice(TOP_N);

    if (others.length > 0) {
      const othersCount = others.reduce((sum, g) => sum + g.count, 0);
      main.push({ genre: 'Altro', count: othersCount, details: others });
    }

    return main;
  }

  private computeRatings(games: Game[]): RatingStat[] {
    const map = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
    for (const g of games) {
      const r = parseInt(g.rating ?? '', 10);
      if (r >= 1 && r <= 5) map.set(r, (map.get(r) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([star, count]) => ({ star, count }))
      .sort((a, b) => a.star - b.star);
  }

  // ── UTILITY ────────────────────────────────────────────────────────────────

  /** Converte la stringa prezzo (già normalizzata da SheetsService) in number */
  private parsePrice(price: string | undefined): number {
    if (!price) return 0;
    const n = parseFloat(price.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
}