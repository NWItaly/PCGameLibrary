
export interface PlatformStat {
    platform: string;
    count: number;
    details?: PlatformStat[];
}

export interface YearlyStat {
    year: string;
    count: number;
    avgPrice: number;
    totalSpend: number;
    top3: { title: string; price: number }[];
}

export interface StateStat {
    state: string;
    count: number;
}

export interface PersonStateStat {
    person: 'Stefano' | 'Erica' | 'Alessandro';
    states: StateStat[];
}

export interface FeatureStat {
    feature: string;
    count: number;
}

export interface GenreStat {
    genre: string;
    count: number;
    details?: GenreStat[];
}

export interface RatingStat {
    star: number;   // 1-5
    count: number;
}

export interface AllStats {
    platforms: PlatformStat[];
    yearly: YearlyStat[];
    personStates: PersonStateStat[];
    italianSupport: number;    // conteggio assoluto
    vr: number;
    features: FeatureStat[];
    genres: GenreStat[];
    ratings: RatingStat[];
    totalGames: number;
    totalSpend: number;
}