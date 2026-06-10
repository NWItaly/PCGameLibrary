// state-counter.component.ts
import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { StateStat } from '../../../../core/models/stats.model';

@Component({
  selector: 'app-state-counter',
  standalone: true,
  template: `
    <div class="state-list">
      @for (s of data; track s.state) {
        <div class="state-row">
          <span class="state-label">{{ s.state }}</span>
          <div class="state-bar-track">
            <div
              class="state-bar-fill"
              [style.width.%]="pct(s.count)">
            </div>
          </div>
          <span class="state-count">{{ s.count }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .state-list { display: flex; flex-direction: column; gap: 12px; }

    .state-row {
      display: grid;
      grid-template-columns: 130px 1fr 40px;
      align-items: center;
      gap: 8px;
    }

    .state-label { font-size: 0.85rem; }

    .state-bar-track {
      height: 8px;
      border-radius: 4px;
      background: var(--mat-sys-outline-variant);
      overflow: hidden;
    }

    .state-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--mat-sys-primary);
      transition: width 0.4s ease;
    }

    .state-count {
      font-size: 0.85rem;
      text-align: right;
      opacity: 0.7;
    }
  `]
})
export class StateCounterComponent {
  @Input() data: StateStat[] = [];

  pct(count: number): number {
    const max = Math.max(...this.data.map(d => d.count), 1);
    return (count / max) * 100;
  }
}