// rating-chart.component.ts
import {
    Component, Input, OnChanges, OnDestroy, AfterViewInit,
    ViewChild, ElementRef
} from '@angular/core';
import {
    Chart, ChartConfiguration,
    BarElement, BarController, CategoryScale, LinearScale, Tooltip
} from 'chart.js';
import { RatingStat } from '../../../../core/models/stats.model';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

@Component({
    selector: 'app-rating-chart',
    standalone: true,
    template: `<canvas #canvas></canvas>`,
    styles: [`canvas { max-height: 320px; }`]
})
export class RatingChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: RatingStat[] = [];
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    private chart?: Chart;

    ngAfterViewInit(): void {
        this.buildChart();
    }

    ngOnChanges(): void {
        if (!this.chart) return;
        this.chart.data.datasets[0].data = this.data.map(d => d.count);
        this.chart.update();
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private buildChart(): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--mat-sys-on-surface').trim() || '#666';
        const gridColor = style.getPropertyValue('--mat-sys-outline-variant').trim() || '#ccc';

        const config: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: ['★', '★★', '★★★', '★★★★', '★★★★★'],
                datasets: [{
                    data: this.data.map(d => d.count),
                    backgroundColor: [
                        '#EF5350', '#FF7043', '#FFA726', '#66BB6A', '#26C6DA'
                    ],
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.y} giochi`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { display: false },
                    }
                }
            }
        };

        this.chart = new Chart(this.canvasRef.nativeElement, config);
    }
}