// stats.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';
import { DecimalPipe } from '@angular/common';
import { GameStoreService } from '../../core/services/game-store.service';
import { StatsService } from '../../core/services/stats.service';
import { AllStats } from '../../core/models/stats.model';
import { PlatformChartComponent } from './charts/platform-chart/platform-chart.component';
import { YearlyChartComponent } from './charts/yearly-chart/yearly-chart.component';
import { StateCounterComponent } from './charts/state-counter/state-counter.component';
import { FeatureCounterComponent } from './charts/feature-counter/feature-counter.component';
import { GenreChartComponent } from './charts/genre-chart/genre-chart.component';
import { RatingChartComponent } from './charts/rating-chart/rating-chart.component';

@Component({
    selector: 'app-stats',
    standalone: true,
    imports: [
        MatProgressSpinnerModule,
        TranslocoModule,
        PlatformChartComponent,
        YearlyChartComponent,
        StateCounterComponent,
        FeatureCounterComponent,
        GenreChartComponent,
        RatingChartComponent,
        DecimalPipe,
    ],
    templateUrl: './stats.component.html',
    styleUrl: './stats.component.scss',
})
export class StatsComponent implements OnInit {
    private store = inject(GameStoreService);
    private statsService = inject(StatsService);

    readonly loading = this.store.loading;

    readonly stats = computed<AllStats | null>(() => {
        const games = this.store.games();
        if (games.length === 0) return null;
        return this.statsService.compute(games);
    });

    ngOnInit(): void {
        this.store.load();
    }
}