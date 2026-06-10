// platform-chart.component.ts
import {
  Component, Input, OnChanges, OnDestroy, AfterViewInit,
  ViewChild, ElementRef
} from '@angular/core';
import { Chart, ChartConfiguration, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js';
import { PlatformStat } from '../../../../core/models/stats.model';

// Registra solo i moduli Chart.js necessari (tree-shaking manuale)
Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

// const PALETTE = [
//   '#26A69A', '#42A5F5', '#AB47BC', '#EF5350', '#FFA726',
//   '#FFEE58', '#9CCC65', '#5C6BC0', '#EC407A', '#26C6DA',
//   '#8D6E63', '#78909C', '#D4E157', '#FF7043', '#7E57C2',
// ];

@Component({
  selector: 'app-platform-chart',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`canvas { max-height: 320px; }`]
})
export class PlatformChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: PlatformStat[] = [];
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.buildChart();
  }

  ngOnChanges(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.data.map(d => d.platform);
    this.chart.data.datasets[0].data = this.data.map(d => d.count);
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildChart(): void {
    const style = getComputedStyle(document.documentElement);
    const textColor = style.getPropertyValue('--mat-sys-on-surface').trim() || '#666';

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: this.data.map(d => d.platform),
        datasets: [{
          data: this.data.map(d => d.count),
          backgroundColor: this.data.map((d, i) =>
            d.platform === 'Altro' ? '#9E9E9E' : PALETTE[i % PALETTE.length]
          ),
          borderWidth: 2,
          borderColor: style.getPropertyValue('--mat-sys-surface-container').trim() || '#fff',
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, boxWidth: 14, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} giochi`,
              afterBody: ctx => {
                const idx = ctx[0]?.dataIndex;
                if (idx == null) return [];
                const details = this.data[idx]?.details;
                if (!details?.length) return [];
                return [
                  '─── Dettaglio ───',
                  ...details.map(d => `${d.platform}: ${d.count}`)
                ];
              }
            }
          }
        }
      }
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }
}

const PALETTE = [
  '#26A69A', '#42A5F5', '#AB47BC', '#EF5350', '#FFA726',
  '#FFEE58', '#9CCC65', '#5C6BC0', '#EC407A', '#26C6DA',
  '#8D6E63', '#78909C', '#D4E157', '#FF7043', '#7E57C2',
];