import { Component, Input, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DailyVisit, PopularEntity } from '@core/services/analytics.service';

@Component({
  selector: 'app-popularity-chart',
  standalone: true,
  templateUrl: './popularity-chart.component.html',
  styleUrl: './popularity-chart.component.scss',
})

export class PopularityChartComponent implements OnChanges, AfterViewInit {
  @Input() data: (DailyVisit | PopularEntity)[] = [];
  @Input() type: 'visits' | 'objects' | 'events' = 'visits';
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chartInstance: any = null;
  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
  }

  ngOnChanges(): void {
    if (this.ready) this.render();
  }

  private async render(): Promise<void> {
    if (!this.canvasRef || this.data.length === 0) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    this.chartInstance?.destroy();

    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const isVisits = this.type === 'visits';

    const labels = isVisits
      ? (this.data as DailyVisit[]).map(d => d.date)
      : (this.data as PopularEntity[]).map(d => d.name);

    const values = isVisits
      ? (this.data as DailyVisit[]).map(d => d.count)
      : (this.data as PopularEntity[]).map(d => d.viewCount);

    this.chartInstance = new Chart(ctx, {
      type: isVisits ? 'line' : 'bar',
      data: {
        labels,
        datasets: [{
          label: isVisits ? 'Posete' : 'Pregledi',
          data: values,
          backgroundColor: isVisits
            ? 'rgba(63, 162, 110, 0.1)'
            : 'rgba(63, 162, 110, 0.2)',
          borderColor: '#3FA26E',
          borderWidth: 2,
          borderRadius: isVisits ? 0 : 4,
          fill: isVisits,
          tension: 0.4,
          pointRadius: isVisits ? 3 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isVisits ? 'x' : 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: isVisits },
            ticks: {
              font: { size: 11 }, color: '#6B7280',
              maxTicksLimit: isVisits ? 10 : undefined,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: { font: { size: 11 }, color: '#6B7280' },
          },
        },
      },
    });
  }
}
