// game-form.component.ts
import { Component, inject } from '@angular/core';
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
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Game, GameFormData } from '../../core/models/game.model';

/** Piattaforme di distribuzione supportate */
export const PLATFORMS = [
  'Steam', 'Twitch', 'Epic Games', 'GOG', 'Humble Play',
  'Legacy Games', 'Microsoft Store', 'Origin/EA', 'Ubisoft',
  'Riot', 'Meta', 'Xbox', 'Battle.Net', 'CD/DVD', 'Download',
] as const;

/** Valori possibili per lo stato di gioco per ciascun utente */
export const STATE_OPTIONS = ['Non interessa', 'Da giocare', 'Giocato'] as const;

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
  ],
  providers: [
    // Adattatore nativo (senza dipendenze esterne) + locale italiano per il datepicker
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
  ],
  templateUrl: './game-form.component.html',
  styleUrl: './game-form.component.scss',
})
export class GameFormComponent {
  readonly dialogRef = inject(MatDialogRef<GameFormComponent>);
  readonly data: Game | null = inject(MAT_DIALOG_DATA);

  private readonly fb = inject(FormBuilder);

  /** Costanti esposte al template */
  readonly platforms = PLATFORMS;
  readonly stateOptions = STATE_OPTIONS;

  /**
   * Snapshot dei campi gestiti da Steam (sola lettura nel form).
   * In modalità modifica vengono pre-popolati da `data`;
   * vengono aggiornati da loadFromSteam() dopo il fetch.
   */
  steamFields = {
    features:       this.data?.features        ?? ([] as string[]),
    genres:         this.data?.genres          ?? ([] as string[]),
    italianSupport: this.data?.italianSupport  ?? '',
    vR:             this.data?.vR              ?? '',
    releaseDate:    this.data?.releaseDate      ?? '',
    image:          this.data?.image           ?? '',
  };

  /** True se il dialog è aperto in modalità modifica */
  get isEditMode(): boolean {
    return !!this.data;
  }

  /**
   * Controllo standalone per la data di acquisto, separato dal form group principale.
   * Motivo: MatDatepicker aggiunge l'errore `matDatepickerParse` durante l'interazione
   * (input parziale, selezione in corso). Se fosse dentro il group, `form.invalid`
   * diventerebbe true e il pulsante Salva si disabiliterebbe su un campo opzionale.
   * In submit() la data viene letta da qui; se non valida o vuota viene trattata come ''.
   */
  readonly buyDateCtrl = new FormControl<Date | null>(
    this.parseBuyDate(this.data?.buyDate)
  );

  /** Form reattivo con i soli campi che devono influenzare la validità del pulsante Salva */
  form = this.fb.nonNullable.group({
    title:           [this.data?.title           ?? '', Validators.required],
    platform:        [this.data?.platform        ?? ''],
    price:           [this.data?.price           ?? ''],
    steamId:         [this.data?.steamId         ?? ''],
    stateStefano:    [this.data?.stateStefano    ?? 'Non interessa'],
    stateErica:      [this.data?.stateErica      ?? 'Non interessa'],
    stateAlessandro: [this.data?.stateAlessandro ?? 'Non interessa'],
    // Memorizzato come stringa "1"–"5" per compatibilità con la smart chip Rating di Sheets
    rating:          [this.data?.rating          ?? ''],
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
   * Carica i metadati del gioco da Steam tramite steamId.
   * Il codice di fetch verrà integrato qui quando disponibile.
   * Aggiornare `steamFields` con i dati ricevuti dall'API Steam.
   */
  loadFromSteam(): void {
    const steamId = this.form.controls.steamId.value;
    if (!steamId) return;
    // TODO: integrare il servizio Steam e aggiornare:
    // this.steamFields = { features: [...], genres: [...], ... };
    console.warn('[GameForm] Steam fetch non ancora implementato. ID:', steamId);
  }

  /** Valida il form, costruisce il GameFormData e chiude il dialog */
  submit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();

    const result: GameFormData = {
      title:           raw.title,
      platform:        raw.platform,
      price:           raw.price,
      buyDate:         this.formatDate(this.buyDateCtrl.value), // buyDateCtrl fuori dal group: null se input non valido → ""
      steamId:         raw.steamId,
      stateStefano:    raw.stateStefano,
      stateErica:      raw.stateErica,
      stateAlessandro: raw.stateAlessandro,
      rating:          raw.rating,
      // Campi Steam: vuoti in aggiunta, pre-popolati in modifica; aggiornati da loadFromSteam()
      features:        this.steamFields.features,
      genres:          this.steamFields.genres,
      italianSupport:  this.steamFields.italianSupport,
      vR:              this.steamFields.vR,
      releaseDate:     this.steamFields.releaseDate,
      image:           this.steamFields.image,
    };

    this.dialogRef.close(result);
  }

  /** Converte una stringa nel formato gg/mm/aaaa in Date per il datepicker */
  private parseBuyDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split('/').map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
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