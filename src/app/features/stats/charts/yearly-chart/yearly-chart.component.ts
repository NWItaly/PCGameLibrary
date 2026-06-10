// yearly-chart.component.ts
import {
    Component, Input, OnChanges, OnDestroy, AfterViewInit,
    ViewChild, ElementRef
} from '@angular/core';
import {
    Chart, ChartConfiguration,
    BarElement, BarController, LineElement, LineController, PointElement,
    CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { YearlyStat } from '../../../../core/models/stats.model';

Chart.register(
    BarElement, BarController, LineElement, LineController, PointElement,
    CategoryScale, LinearScale, Tooltip, Legend
);

// Stessi colori usati in platform-chart per coerenza visiva
const BAR_COLOR = '#26A69A';
const LINE_COLOR = '#EC407A';

@Component({
    selector: 'app-yearly-chart',
    standalone: true,
    template: `<canvas #canvas></canvas>`,
    styles: [`canvas { max-height: 360px; }`]
})
export class YearlyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() data: YearlyStat[] = [];
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    private chart?: Chart;

    ngAfterViewInit(): void {
        this.buildChart();
    }

    ngOnChanges(): void {
        if (!this.chart) return;
        this.chart.data.labels = this.data.map(d => d.year);
        this.chart.data.datasets[0].data = this.data.map(d => d.count);
        this.chart.data.datasets[1].data = this.data.map(d => parseFloat(d.avgPrice.toFixed(2)));
        this.chart.update();
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private buildChart(): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--mat-sys-on-surface').trim() || '#666';
        const gridColor = style.getPropertyValue('--mat-sys-outline-variant').trim() || '#ccc';

        const config: ChartConfiguration<'bar' | 'line'> = {
            type: 'bar',
            data: {
                labels: this.data.map(d => d.year),
                datasets: [
                    {
                        type: 'bar',
                        label: 'Giochi acquistati',
                        data: this.data.map(d => d.count),
                        backgroundColor: BAR_COLOR,
                        yAxisID: 'yCount',
                        order: 2, // disegnato sotto
                    },
                    {
                        type: 'line',
                        label: 'Prezzo medio (€)',
                        data: this.data.map(d => parseFloat(d.avgPrice.toFixed(2))),
                        borderColor: LINE_COLOR,
                        backgroundColor: LINE_COLOR,
                        pointBackgroundColor: LINE_COLOR,
                        pointRadius: 4,
                        borderWidth: 3,
                        tension: 0.3,
                        yAxisID: 'yPrice',
                        order: 1, // disegnato sopra
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor,
                            font: { size: 13 },
                            usePointStyle: true,
                        }
                    },
                    tooltip: {
                        backgroundColor: style.getPropertyValue('--mat-sys-surface-container-high').trim() || '#333',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: gridColor,
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: ctx => {
                                const y = ctx.parsed.y ?? 0;
                                if (ctx.datasetIndex === 1) {
                                    const idx = ctx.dataIndex;
                                    const total = this.data[idx]?.totalSpend ?? 0;
                                    return [
                                        `Prezzo medio: ${y.toFixed(2)} €`,
                                        `Spesa totale: ${total.toFixed(2)} €`,
                                    ];
                                }
                                return ` Giochi acquistati: ${y}`;
                            },
                            afterBody: (items) => {
                                const idx = items[0]?.dataIndex;
                                if (idx == null) return [];
                                const top3 = this.data[idx]?.top3 ?? [];
                                if (top3.length === 0) return [];
                                return [
                                    '',
                                    'Top 3 più cari:',
                                    ...top3.map(g => `${g.title}: ${g.price.toFixed(2)} €`)
                                ];
                            }
                        }
                    }
                },
                scales: {
                    yCount: {
                        type: 'linear',
                        position: 'left',
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                        title: { display: true, text: 'Giochi', color: textColor },
                    },
                    yPrice: {
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            color: LINE_COLOR,
                            callback: (value) => `${value} €`,
                        },
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Prezzo medio', color: LINE_COLOR },
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                    }
                }
            }
        };

        this.chart = new Chart(this.canvasRef.nativeElement, config);
    }
}