// game-form.component.ts
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  NativeDateAdapter,
} from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Game, GameFormData } from '../../core/models/game.model';
import { SteamService } from '../../core/services/steam.service';
import { TranslateService } from '../../core/services/translate.service';

/**
 * Adapter personalizzato che risolve il falso errore `matDatepickerParse` con locale it-IT.
 */
class ItalianDateAdapter extends NativeDateAdapter {
  override parse(value: string | number | null | undefined): Date | null {
    if (typeof value === 'number') return new Date(value);
    if (!value || typeof value !== 'string') return null;

    // Formato principale prodotto da Intl con locale it-IT: gg/mm/aaaa
    const parts = value.trim().split('/').map(Number);
    if (parts.length === 3 && parts.every(n => !isNaN(n))) {
      const [d, m, y] = parts;
      if (y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return new Date(y, m - 1, d);
      }
    }

    // Fallback per altri formati (es. ISO inserito manualmente)
    const fallback = new Date(value);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
}

/**
 * Formati data per il NativeDateAdapter con locale it-IT.
 * I valori sono opzioni Intl.DateTimeFormat (non pattern stringa come 'dd/MM/yyyy').
 * Richiesto quando si fornisce DateAdapter manualmente senza provideNativeDateAdapter().
 */
const IT_DATE_FORMATS = {
  parse: {
    dateInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
  },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

/** Piattaforme di distribuzione supportate */
export const PLATFORMS = [
  'Steam', 'Twitch', 'Epic Games', 'GOG', 'Humble Play',
  'Legacy Games', 'Microsoft Store', 'Origin/EA', 'Ubisoft',
  'Riot', 'Meta', 'Xbox', 'Battle.Net', 'CD/DVD', 'Download',
] as const;

/** Valori possibili per lo stato di gioco per ciascun utente */
export const STATE_OPTIONS = ['Non interessa', 'Da giocare', 'Giocato'] as const;

/** Valori età minima PEGI (0 = nessun limite specificato) */
export const PEGI_AGES = [0, 3, 7, 12, 16, 18] as const;

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  providers: [
    // ItalianDateAdapter risolve il parse() di NativeDateAdapter con locale it-IT.
    // Non usare provideNativeDateAdapter() insieme a questo: si escludono a vicenda.
    { provide: DateAdapter, useClass: ItalianDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: IT_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
  ],
  templateUrl: './game-form.component.html',
  styleUrl: './game-form.component.scss',
})
export class GameFormComponent {
  readonly dialogRef = inject(MatDialogRef<GameFormComponent>);
  readonly data: Game | null = inject(MAT_DIALOG_DATA);

  private readonly fb = inject(FormBuilder);
  private readonly steamService = inject(SteamService);
  public readonly translate = inject(TranslateService);

  /** Costanti esposte al template */
  readonly platforms = PLATFORMS;
  readonly stateOptions = STATE_OPTIONS;
  readonly pegiAges = PEGI_AGES;

  /** True mentre la chiamata al proxy Steam è in corso */
  readonly steamLoading = signal(false);

  /** Messaggio di errore Steam, null se nessun errore */
  readonly steamError = signal<string | null>(null);

  /**
   * Snapshot dei campi gestiti da Steam (sola lettura nel form).
   * In modalità modifica vengono pre-popolati da `data`;
   * vengono aggiornati da loadFromSteam() dopo il fetch.
   */
  steamFields = {
    features: this.data?.features ?? ([] as string[]),
    genres: this.data?.genres ?? ([] as string[]),
    italianSupport: this.data?.italianSupport ?? '',
    vR: this.data?.vR ?? '',
    releaseDate: this.data?.releaseDate ?? '',
    image: this.data?.image ?? '',
  };

  /** True se il dialog è aperto in modalità modifica */
  get isEditMode(): boolean {
    return !!this.data;
  }

  /**
   * Form reattivo con i campi editabili manualmente.
   * `buyDate` è un FormControl<Date | null> esplicito: FormBuilder.nonNullable
   * non supporta tipi nullable con la sintassi shorthand [value].
   * Con ItalianDateAdapter, matDatepickerParse non scatta per date valide in formato it-IT.
   */
  form = this.fb.nonNullable.group({
    title: [this.data?.title ?? '', Validators.required],
    platform: [this.data?.platform ?? ''],
    price: [this.data?.price ?? ''],
    buyDate: new FormControl<Date | null>(this.parseBuyDate(this.data?.buyDate)),
    steamId: [this.data?.steamId ?? ''],
    stateStefano: [this.data?.stateStefano ?? 'Non interessa'],
    stateErica: [this.data?.stateErica ?? 'Non interessa'],
    stateAlessandro: [this.data?.stateAlessandro ?? 'Non interessa'],
    // Memorizzato come stringa "1"–"5"; il service lo scrive come number per la smart chip
    rating: [this.data?.rating ?? ''],
    // Età minima PEGI: '' = non specificata, altrimenti '0'|'3'|'7'|'12'|'16'|'18'
    requiredAge: [this.data?.requiredAge ?? ''],
  });

  /** Valore numerico della valutazione corrente (0 = non impostata) */
  get currentRating(): number {
    return parseInt(this.form.controls.rating.value || '0', 10);
  }

  /** Imposta la valutazione a stelle (1–5) */
  setRating(value: number): void {
    this.form.controls.rating.setValue(value.toString());
  }

  /** Azzera la valutazione */
  clearRating(): void {
    this.form.controls.rating.setValue('');
  }

  /**
   * Chiama il proxy Apps Script con lo steamId corrente.
   * Aggiorna steamFields con i dati ricevuti; gestisce loading ed errori.
   */
  loadFromSteam(): void {
    const steamId = this.form.controls.steamId.value?.trim();
    if (!steamId) return;

    this.steamLoading.set(true);
    this.steamError.set(null);

    this.steamService.loadByAppId(steamId).subscribe({
      next: (data) => {
        this.steamFields = {
          features: data.features,
          genres: data.genres,
          italianSupport: data.italianSupport,
          vR: data.vR,
          releaseDate: data.releaseDate,
          image: data.image,
        };
        // requiredAge va nel form (editabile), non in steamFields
        this.form.controls.requiredAge.setValue(data.requiredAge ?? '');
        this.steamLoading.set(false);
      },
      error: (err) => {
        // HTTP 404 → appid non trovato; altri → errore generico
        const msg = err.status === 404
          ? this.translate.t('errors.steamNotFound', { steamId })
          : this.translate.t('errors.steamLoadFailed');
        this.steamError.set(msg);
        this.steamLoading.set(false);
        console.error('[GameForm] loadFromSteam:', err);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();

    const result: GameFormData = {
      title: raw.title,
      platform: raw.platform,
      price: raw.price,
      buyDate: this.formatDate(raw.buyDate),
      steamId: raw.steamId,
      stateStefano: raw.stateStefano,
      stateErica: raw.stateErica,
      stateAlessandro: raw.stateAlessandro,
      rating: raw.rating,
      requiredAge: raw.requiredAge,
      features: this.steamFields.features,
      genres: this.steamFields.genres,
      italianSupport: this.steamFields.italianSupport,
      vR: this.steamFields.vR,
      releaseDate: this.steamFields.releaseDate,
      image: this.steamFields.image,
    };

    this.dialogRef.close(result);
  }

  /**
   * Converte la stringa data letta dal foglio in oggetto Date per il datepicker.
   * Gestisce due formati:
   * - gg/mm/aaaa: formato italiano prodotto da FORMATTED_VALUE quando la cella è di tipo Data
   * - aaaa-mm-gg: formato ISO, come fallback (es. se la cella viene letta come testo)
   */
  private parseBuyDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    if (dateStr.includes('/')) {
      // Formato italiano gg/mm/aaaa
      const [day, month, year] = dateStr.split('/').map(Number);
      if (day && month && year) return new Date(year, month - 1, day);
    }

    if (dateStr.includes('-')) {
      // Formato ISO aaaa-mm-gg
      const d = new Date(dateStr + 'T00:00:00'); // T00:00:00 evita shift da fuso orario
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  /** Formatta una Date in stringa italiana gg/mm/aaaa */
  private formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}