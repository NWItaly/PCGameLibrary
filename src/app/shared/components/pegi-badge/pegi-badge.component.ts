import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

type PegiColor = 'green' | 'yellow' | 'orange' | 'orange-dark' | 'red';

@Component({
  selector: 'app-pegi-badge',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './pegi-badge.component.html',
  styleUrls: ['./pegi-badge.component.scss'],
})
export class PegiBadgeComponent {

  readonly age = input.required<string|undefined>();
  readonly size = input<number>(50);

  readonly tooltip = computed(() => `PEGI ${this.age() ?? '?'}`);

  readonly colorClass = computed<PegiColor>(() => {
    const value = parseInt(this.age() ?? '0', 10);

    if (value <= 3) {
      return 'green';
    }

    if (value <= 11) {
      return 'yellow';
    }

    if (value <= 14) {
      return 'orange';
    }

    if (value <= 17) {
      return 'orange-dark';
    }

    return 'red';
  });
}
