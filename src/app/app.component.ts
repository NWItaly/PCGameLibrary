import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from './core/services/auth.service';
import { ThemeService, ThemeMode } from './core/services/theme.service';
import { GameListComponent } from './features/game-list/game-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatButtonToggleModule,
    MatDividerModule,
    RouterModule,
    TranslocoModule,
    GameListComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private transloco = inject(TranslocoService);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  // Espone il tipo per il template
  readonly ThemeMode = { light: 'light', dark: 'dark', system: 'system' } as const;

  ngOnInit(): void {
    this.auth.init();
  }

  setLanguage(lang: string): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('app_lang', lang);
  }

  get activeLang(): string {
    return this.transloco.getActiveLang();
  }
  
}
