import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Tema selezionato dall'utente
  readonly mode = signal<ThemeMode>(this.loadSaved());

  constructor() {
    // Applica il tema ogni volta che cambia il signal
    effect(() => {
      this.applyTheme(this.mode());
      localStorage.setItem(STORAGE_KEY, this.mode());
    });

    // Ascolta i cambiamenti del tema di sistema
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.mode() === 'system') {
          this.applyTheme('system');
        }
      });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.classList.toggle('light-theme', !isDark);
  }

  private loadSaved(): ThemeMode {
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? 'system';
  }
}
