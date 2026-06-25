// steam-search-dialog.component.ts
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
    MatDialogRef,
    MatDialogModule,
    MatDialog,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';
import { SteamService, SteamSearchResult } from '../../core/services/steam.service';
import { GameFormComponent } from '../game-form/game-form.component';

@Component({
    selector: 'app-steam-search-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatListModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TranslocoModule,
    ],
    templateUrl: './steam-search-dialog.component.html',
    styleUrl: './steam-search-dialog.component.scss',
})
export class SteamSearchDialogComponent {
    private readonly dialogRef = inject(MatDialogRef<SteamSearchDialogComponent>);
    private readonly dialog = inject(MatDialog);
    private readonly steamService = inject(SteamService);

    readonly searchCtrl = new FormControl('');
    readonly results = signal<SteamSearchResult[]>([]);
    readonly loading = signal(false);
    readonly noResults = signal(false);
    readonly selectedGame = signal<SteamSearchResult | null>(null);

    search(): void {
        const term = this.searchCtrl.value?.trim();
        if (!term) return;

        this.loading.set(true);
        this.noResults.set(false);
        this.results.set([]);
        this.selectedGame.set(null);

        this.steamService.searchGames(term).subscribe({
            next: results => {
                this.loading.set(false);
                this.results.set(results);
                this.noResults.set(results.length === 0);
            },
            error: () => {
                this.loading.set(false);
                this.noResults.set(true);
            },
        });
    }

    selectGame(game: SteamSearchResult): void {
        // Deseleziona se si clicca sul già selezionato
        this.selectedGame.set(
            this.selectedGame()?.appId === game.appId ? null : game
        );
    }

    confirm(): void {
        const selected = this.selectedGame();
        if (!selected) return;
        this.dialogRef.close(selected);  // restituisce SteamSearchResult al chiamante
    }
}