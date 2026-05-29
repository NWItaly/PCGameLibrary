import { Component, inject, signal, computed, effect, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslocoModule } from '@jsverse/transloco';
import { SheetsService } from '../../core/services/sheets.service';
import { AuthService } from '../../core/services/auth.service';
import { FilterService } from '../../core/services/filter.service';
import { TranslateService } from '../../core/services/translate.service';
import { GameFormComponent } from '../game-form/game-form.component';
import { GameCardComponent } from '../game-card/game-card.component';
import { PlatformIconComponent } from '../../shared/components/platform-icon/platform-icon.component';
import { AdvancedSearchComponent } from '../advanced-search/advanced-search.component';
import { Game } from '../../core/models/game.model';

export type ViewMode = 'card' | 'table';

@Component({
  selector: 'app-game-list',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatBadgeModule,
    TranslocoModule,
    GameCardComponent,
    PlatformIconComponent,
  ],
  templateUrl: './game-list.component.html',
  styleUrl: './game-list.component.scss',
})
export class GameListComponent {
  private sheets = inject(SheetsService);
  private dialog = inject(MatDialog);
  private snackbar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  readonly auth = inject(AuthService);
  readonly filterService = inject(FilterService);

  games = signal<Game[]>([]);
  loading = signal(false);
  viewMode = signal<ViewMode>('card');

  // Query di ricerca rapida — aggiorna il filtro nel service
  get searchQuery(): string {
    return this.filterService.filters().query;
  }
  set searchQuery(value: string) {
    this.filterService.update({ query: value });
  }

  readonly displayedColumns = computed(() =>
    this.auth.isLoggedIn()
      ? ['title', 'genre', 'platform', 'releaseDate', 'rating', 'actions']
      : ['title', 'genre', 'platform', 'releaseDate', 'rating']
  );

  // Giochi filtrati tramite FilterService
  readonly filteredGames = computed(() =>
    this.filterService.apply(this.games())
  );

  // Numero filtri avanzati attivi (per il badge)
  readonly activeFilterCount = computed(() =>
    this.filterService.activeCount()
  );

  constructor() {
    // Ricarica i giochi al ripristino della sessione
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      untracked(() => {
        if (loggedIn) this.loadGames();
      });
    });
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  loadGames(): void {
    this.loading.set(true);
    this.sheets.getGames().subscribe({
      next: (data) => {
        this.games.set(data);
        // Aggiorna i range degli slider con i valori reali del dataset
        const opts = this.filterService.getDistinctValues(data);
        this.filterService.updateDatasetRanges(opts);
        this.filterService.update({
          priceMin: opts.priceMin,
          priceMax: opts.priceMax,
          releaseYearMin: opts.releaseYearMin,
          releaseYearMax: opts.releaseYearMax,
          buyYearMin: opts.buyYearMin,
          buyYearMax: opts.buyYearMax,
        });
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.open(this.translate.t('errors.loadFailed'), 'OK', { duration: 4000 });
        this.loading.set(false);
      },
    });
  }

  openAdvancedSearch(): void {
    const opts = this.filterService.getDistinctValues(this.games());
    const ref = this.dialog.open(AdvancedSearchComponent, {
      data: { filters: this.filterService.filters(), options: opts },
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.filterService.update(result);
    });
  }

  openAddDialog(): void {
    const ref = this.dialog.open(GameFormComponent, { data: null, width: '620px' });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.sheets.addGame(result).subscribe({
        next: () => {
          this.snackbar.open(this.translate.t('success.added'), undefined, { duration: 2500 });
          this.loadGames();
        },
        error: () => this.snackbar.open(this.translate.t('errors.addFailed'), 'OK', { duration: 4000 }),
      });
    });
  }

  openEditDialog(game: Game): void {
    const ref = this.dialog.open(GameFormComponent, { data: game, width: '620px' });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.sheets.updateGame({ ...game, ...result }).subscribe({
        next: () => {
          this.snackbar.open(this.translate.t('success.updated'), undefined, { duration: 2500 });
          this.loadGames();
        },
        error: () => this.snackbar.open(this.translate.t('errors.editFailed'), 'OK', { duration: 4000 }),
      });
    });
  }

  deleteGame(game: Game): void {
    const msg = this.translate.t('actions.confirmDelete', { title: game.title });
    if (!confirm(msg)) return;
    this.sheets.deleteGame(game.rowIndex!).subscribe({
      next: () => {
        this.snackbar.open(this.translate.t('success.deleted'), undefined, { duration: 2500 });
        this.loadGames();
      },
      error: () => this.snackbar.open(this.translate.t('errors.deleteFailed'), 'OK', { duration: 4000 }),
    });
  }
}
