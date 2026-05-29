import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

// Mappa i valori esatti del foglio al nome del file SVG in assets/platforms/
const PLATFORM_ICON_MAP: Record<string, string> = {
  'Steam': 'steam.svg',
  'EpicGame': 'epicgames.svg',
  'GOG': 'gog.svg',
  'Origin/EA': 'ea.svg',
  'Ubisoft': 'ubisoft.svg',
  'Meta': 'meta.svg',
  'Microsoft Store': 'microsoftstore.svg',
  'Xbox': 'xbox.svg',
  'Twitch': 'twitch.svg',
  'LegacyGames': 'legacygames.svg',
  'HumblePlay': 'humblebundle.svg',
  'Riot': 'riotgames.svg',
  '__Battle.Net__': 'battlenet.svg',
  // Icone custom (SVG generati localmente, non da simpleicons)
  'CD/DVD': 'disc.svg',
  'Download': 'download.svg',
};

@Component({
  selector: 'app-platform-icon',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    @if (iconPath()) {
      <img
        [src]="iconPath()"
        [alt]="platform()"
        [matTooltip]="platform()"
        class="platform-icon"
        (error)="onError($event)"
      />
    } @else {
      <!-- Fallback testuale se la piattaforma non è mappata -->
      <span class="platform-text" [matTooltip]="platform()">
        {{ platform() }}
      </span>
    }
  `,
  styles: [`
    .platform-icon {
      width: 20px;
      height: 20px;
      object-fit: contain;
      /* Filtro per adattare le icone al tema corrente */
      filter: var(--platform-icon-filter, none);
    }
    .platform-text {
      font-size: 11px;
      opacity: 0.7;
    }
  `],
})
export class PlatformIconComponent {
  readonly platform = input.required<string>();

  iconPath(): string | null {
    const file = PLATFORM_ICON_MAP[this.platform()];
    return file ? `assets/platforms/${file}` : null;
  }

  // Se l'immagine non si carica (file mancante) nasconde l'elemento
  onError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
