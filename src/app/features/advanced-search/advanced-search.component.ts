import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@jsverse/transloco';
import { GameFilters } from '../../core/models/game-filters.model';

export interface AdvancedSearchData {
  filters: GameFilters;
  options: {
    platforms: string[];
    genres: string[];
    features: string[];
    statesStefano: string[];
    statesErica: string[];
    statesAlessandro: string[];
    requiredAges: number[];
    priceMin: number;
    priceMax: number;
    releaseYearMin: number;
    releaseYearMax: number;
    buyYearMin: number;
    buyYearMax: number;
  };
}

@Component({
  selector: 'app-advanced-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatIconModule,
    TranslocoModule,
  ],
  templateUrl: './advanced-search.component.html',
  styleUrl: './advanced-search.component.scss',
})
export class AdvancedSearchComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AdvancedSearchComponent>);
  readonly data: AdvancedSearchData = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form!: FormGroup;

  ngOnInit(): void {
    const f = this.data.filters;
    this.form = this.fb.group({
      platforms: [f.platforms],
      genres: [f.genres],
      features: [f.features],
      statesStefano: [f.statesStefano],
      statesErica: [f.statesErica],
      statesAlessandro: [f.statesAlessandro],
      italianSupport: [f.italianSupport],
      vr: [f.vr],
      requiredAges: [f.requiredAges],
      priceMin: [f.priceMin],
      priceMax: [f.priceMax],
      releaseYearMin: [f.releaseYearMin],
      releaseYearMax: [f.releaseYearMax],
      buyYearMin: [f.buyYearMin],
      buyYearMax: [f.buyYearMax],
    });
  }

  apply(): void {
    this.dialogRef.close(this.form.getRawValue() as GameFilters);
  }

  reset(): void {
    this.form.setValue({
      platforms: [],
      genres: [],
      features: [],
      statesStefano: [],
      statesErica: [],
      statesAlessandro: [],
      italianSupport: null,
      vr: null,
      requiredAges: [],
      priceMin: this.data.options.priceMin,
      priceMax: this.data.options.priceMax,
      releaseYearMin: this.data.options.releaseYearMin,
      releaseYearMax: this.data.options.releaseYearMax,
      buyYearMin: this.data.options.buyYearMin,
      buyYearMax: this.data.options.buyYearMax,
    });
  }

  // Formatta il valore dello slider prezzo con simbolo €
  formatPrice = (value: number): string => `${value}€`;

  // Formatta il valore dello slider anno
  formatYear = (value: number): string => `${value}`;
}
