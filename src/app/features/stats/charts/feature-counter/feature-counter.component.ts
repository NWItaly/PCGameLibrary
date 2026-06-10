// feature-counter.component.ts
import { Component, Input } from '@angular/core';
import { FeatureStat } from '../../../../core/models/stats.model';

@Component({
    selector: 'app-feature-counter',
    standalone: true,
    template: `
    <div class="feature-grid">
      @for (f of data; track f.feature) {
        <div class="feature-row">
          <span class="feature-label">{{ f.feature }}</span>
          <div class="feature-bar-track">
            <div
              class="feature-bar-fill"
              [style.width.%]="pct(f.count)">
            </div>
          </div>
          <span class="feature-count">{{ f.count }}</span>
        </div>
      }
    </div>
  `,
    styles: [`
    .feature-grid { display: flex; flex-direction: column; gap: 10px; }

    .feature-row {
      display: grid;
      grid-template-columns: 220px 1fr 50px;
      align-items: center;
      gap: 8px;
    }

    .feature-label { font-size: 0.85rem; }

    .feature-bar-track {
      height: 8px;
      border-radius: 4px;
      background: var(--mat-sys-outline-variant);
      overflow: hidden;
    }

    .feature-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--mat-sys-tertiary, #00BCD4);
      transition: width 0.4s ease;
    }

    .feature-count {
      font-size: 0.85rem;
      text-align: right;
      opacity: 0.7;
    }
  `]
})
export class FeatureCounterComponent {
    @Input() data: FeatureStat[] = [];

    pct(count: number): number {
        const max = Math.max(...this.data.map(d => d.count), 1);
        return (count / max) * 100;
    }
}