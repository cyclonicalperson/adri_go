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
    if (!this.movements.length) return [];
    // Sort descending so rank 0 = most visited
    const sorted = [...this.movements].sort((a, b) => b.visitCount - a.visitCount);
    const n = sorted.length;
    return sorted.map((m, rank) => ({
      id: m.regionId,
      lat: m.latitude,
      lng: m.longitude,
      label: `${m.regionName} (${m.visitCount} poseta)`,
      color: this.rankColor(rank, n),
    }));
  }

  // Evenly distribute 3 colors across all N pins so every category is always visible
  private rankColor(rank: number, total: number): string {
    const third = total / 3;
    if (rank < third) return '#22c55e';       // top third  → green
    if (rank < third * 2) return '#f59e0b';   // middle     → amber
    return '#3b82f6';                         // bottom     → blue
  }

  get topMovements(): TouristMovement[] {
    return [...this.movements]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }
}
