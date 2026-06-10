import {
    Component, Input, OnChanges, OnDestroy, AfterViewInit,
    ViewChild, ElementRef
} from '@angular/core';
import {
    Chart, ChartConfiguration,
    BarElement, BarController, CategoryScale, LinearScale, Tooltip
} from 'chart.js';
import { GenreStat } from '../../../../core/models/stats.model';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

const PALETTE = [
    '#26A69A', '#42A5F5', '#AB47BC', '#EF5350', '#FFA726',
    '#FFEE58', '#9CCC65', '#5C6BC0', '#EC407A', '#26C6DA',
];
const OTHER_COLOR = '#9E9E9E';

@Component({
    selector: 'app-genre-chart',
    standalone: true,
    template: `<canvas #canvas></canvas>`,
    styles: [`canvas { max-height: 360px; }`]
})
export class GenreChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: GenreStat[] = [];
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    private chart?: Chart;

    ngAfterViewInit(): void {
        this.buildChart();
    }

    ngOnChanges(): void {
        if (!this.chart) return;
        this.chart.data.labels = this.data.map(d => d.genre);
        this.chart.data.datasets[0].data = this.data.map(d => d.count);
        this.chart.data.datasets[0].backgroundColor = this.colors();
        this.chart.update();
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private colors(): string[] {
        return this.data.map((d, i) =>
            d.genre === 'Altro' ? OTHER_COLOR : PALETTE[i % PALETTE.length]
        );
    }

    private buildChart(): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--mat-sys-on-surface').trim() || '#666';
        const gridColor = style.getPropertyValue('--mat-sys-outline-variant').trim() || '#ccc';

        const config: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: this.data.map(d => d.genre),
                datasets: [{
                    data: this.data.map(d => d.count),
                    backgroundColor: this.colors(),
                    borderRadius: 6,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.parsed.x} giochi`,
                            afterBody: ctx => {
                                const idx = ctx[0]?.dataIndex;
                                if (idx == null) return [];
                                const details = this.data[idx]?.details;
                                if (!details?.length) return [];
                                return [
                                    '',
                                    'Dettaglio:',
                                    ...details.map(d => `${d.genre}: ${d.count}`)
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                    },
                    y: {
                        ticks: { color: textColor },
                        grid: { display: false },
                    }
                }
            }
        };

        this.chart = new Chart(this.canvasRef.nativeElement, config);
    }
}