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
    return this.movements.map(m => ({
      id: m.regionId,
      lat: m.latitude,
      lng: m.longitude,
      label: `${m.regionName} (${m.visitCount} poseta)`,
    }));
  }

  get topMovements(): TouristMovement[] {
    return [...this.movements]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }
}
