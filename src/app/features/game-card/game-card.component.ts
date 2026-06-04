import { Component, inject, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlatformIconComponent } from '../../shared/components/platform-icon/platform-icon.component';
import { Game } from '../../core/models/game.model';
import { TranslateService } from '../../core/services/translate.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    PlatformIconComponent,
    TranslocoModule,
    
  ],
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
})
export class GameCardComponent {

  public translate = inject(TranslateService);

  readonly game = input.required<Game>();
  readonly canEdit = input(false);

  // Eventi emessi al parent
  readonly editClicked = output<Game>();
  readonly deleteClicked = output<Game>();

  // Estrae l'anno dalla data di rilascio (formato atteso: YYYY o DD/MM/YYYY)
  releaseYear(): string {
    const d = this.game().releaseDate;
    if (!d) return '';
    return d.length >= 4 ? d.substring(6, 10) : d;
  }

  ratingStars(): string {
    const r = this.game().rating;
    if (!r || isNaN(parseFloat(r)) || parseFloat(r) <= 0 || parseFloat(r) > 5) return '';
    const n = Math.round(parseFloat(r));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  prizeFormatted(): string {
    const p = this.game().price;
    if (!p || isNaN(parseFloat(p)) || parseFloat(p) <= 0) return '';
    return parseFloat(p).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
  }

  // Estrae l'URL dall'interno della formula =IMAGE("...")
  // Se il valore è già un URL diretto lo restituisce così com'è
  imageUrl(): string | null {
    const raw = this.game().image;
    if (!raw) return null;
    const match = raw.match(/=IMAGE\("([^"]+)"\)/i);
    return match ? match[1] : raw;
  }
  
  // Fallback se l'immagine non è disponibile
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.parentElement?.classList.add('no-image');
  }

  /**
   * Restituisce il path del badge PEGI o null se non applicabile.
   * I valori validi sono '3','7','12','16','18'; '0' e '' non mostrano badge.
   */
  pegiBadgeSrc(): string | null {
    const age = this.game().requiredAge;
    if (!age || age === '0') return null;
    const valid = ['3', '7', '12', '16', '18'];
    return valid.includes(age) ? `assets/pegi/pegi-${age}-50.svg` : null;
  }
}