import { Component, Input } from '@angular/core';
import { TouristMovement } from '@core/services/analytics.service';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';

@Component({
  selector: 'app-tourist-movements',
  standalone: true,
  imports: [MapComponent],
  templateUrl: './tourist-movements.component.html',
  styleUrl: './tourist-movements.component.scss',
})

export class TouristMovementsComponent {
  @Input() movements: TouristMovement[] = [];

  get markers(): MapMarker[] {
    const max = Math.max(...this.movements.map(m => m.visitCount), 1);
    return this.movements.map(m => ({
      id: m.regionId,
      lat: m.latitude,
      lng: m.longitude,
      label: `${m.regionName} (${m.visitCount} poseta)`,
      color: this.visitColor(m.visitCount, max),
    }));
  }

  private visitColor(count: number, max: number): string {
    const ratio = count / max;
    if (ratio >= 0.66) return '#22c55e';
    if (ratio >= 0.33) return '#f59e0b';
    return '#3b82f6';
  }

  get topMovements(): TouristMovement[] {
    return [...this.movements]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }
}
