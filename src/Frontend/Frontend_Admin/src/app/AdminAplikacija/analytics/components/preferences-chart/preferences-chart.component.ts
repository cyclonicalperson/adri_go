import { Component, Input, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { PopularEntity } from '@core/services/analytics.service';

@Component({
  selector: 'app-preferences-chart',
  standalone: true,
  templateUrl: './preferences-chart.component.html',
  styleUrl: './preferences-chart.component.scss',
})

export class PreferencesChartComponent implements OnChanges, AfterViewInit {
  @Input() objects: PopularEntity[] = [];
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
    if (!this.canvasRef || this.objects.length === 0) return;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    this.chartInstance?.destroy();

    const categoryMap: Record<string, number> = {};
    this.objects.forEach(o => {
      categoryMap[o.category] = (categoryMap[o.category] ?? 0) + o.viewCount;
    });

    const labels = Object.keys(categoryMap);
    const values = Object.values(categoryMap);

    const colors = [
      '#3FA26E', '#1A73E8', '#F59E0B', '#8B5CF6',
      '#EC4899', '#10B981', '#EF4444', '#6B7280',
    ];

    this.chartInstance = new Chart(this.canvasRef.nativeElement.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 12 }, color: '#6B7280', padding: 12 },
          },
        },
      },
    });
  }
}
