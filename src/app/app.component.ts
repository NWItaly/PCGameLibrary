// app.component.ts
import { Component, inject, OnInit, ViewChild, effect } from '@angular/core';
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
import { ThemeService } from './core/services/theme.service';
import { BackupService } from './core/services/backup.service';
import { BackupDatePipe } from './shared/pipes/backup-date.pipe';
import { MatIconRegistry } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule,
    RouterModule,
    TranslocoModule,
    BackupDatePipe
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  backup = inject(BackupService);
  private transloco = inject(TranslocoService);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  readonly ThemeMode = { light: 'light', dark: 'dark', system: 'system' } as const;

  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');

    // Avvia il backup giornaliero al primo login valido
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.backup.runDailyBackupIfNeeded().catch(err =>
          console.error('Backup giornaliero fallito:', err)
        );
      }
    });
  }

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
