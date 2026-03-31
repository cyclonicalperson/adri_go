import { Component, Input, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DailyVisit } from '@core/services/analytics.service';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';

@Component({
  selector: 'app-activity-chart',
  standalone: true,
  imports: [],
  templateUrl: './activity-chart.component.html',
  styleUrl: './activity-chart.component.scss',
})

export class ActivityChartComponent implements OnChanges, AfterViewInit {
  @Input() visits: DailyVisit[] = [];
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chartInstance: any = null;
  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.renderChart();
  }

  ngOnChanges(): void {
    if (this.ready) this.renderChart();
  }

  private async renderChart(): Promise<void> {
    if (!this.canvasRef || this.visits.length === 0) return;

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    this.chartInstance?.destroy();

    const ctx = this.canvasRef.nativeElement.getContext('2d')!;

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.visits.map(v => v.date),
        datasets: [{
          label: 'Posete',
          data: this.visits.map(v => v.count),
          backgroundColor: 'rgba(63, 162, 110, 0.2)',
          borderColor: '#3FA26E',
          borderWidth: 2,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 }, color: '#6B7280' },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: { font: { size: 12 }, color: '#6B7280' },
          },
        },
      },
    });
  }
}
