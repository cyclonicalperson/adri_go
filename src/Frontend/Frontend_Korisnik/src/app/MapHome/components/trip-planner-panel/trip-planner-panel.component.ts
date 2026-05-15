import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PlannerStop } from '../../../services/route-planner.service';
import { RouteSummary } from '../../../services/routing.service';
import { TravelMode } from '../../../services/tourist-preferences.service';
import { formatPostType } from '../../../utils/post-type.utils';

@Component({
  selector: 'app-trip-planner-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-planner-panel.component.html',
  styleUrls: ['./trip-planner-panel.component.css'],
})
export class TripPlannerPanelComponent {
  @Input() plannerMode = false;
  @Input() plannerStops: PlannerStop[] = [];
  @Input() scenicMode = true;
  @Input() travelMode: TravelMode = 'driving';
  @Input() routeSummary: RouteSummary = {
    distanceKm: 0,
    durationMin: 0,
    stopCount: 0,
  };
  @Input() plannerMessage = '';
  @Input() isRenderingRoute = false;
  @Input() isSavingTrip = false;

  @Output() plannerModeToggled = new EventEmitter<void>();
  @Output() travelModeSelected = new EventEmitter<TravelMode>();
  @Output() scenicModeToggled = new EventEmitter<void>();
  @Output() stopFocused = new EventEmitter<PlannerStop>();
  @Output() stopMoved = new EventEmitter<{ index: number; direction: 'up' | 'down' }>();
  @Output() stopRemoved = new EventEmitter<number>();
  @Output() plannerOptimized = new EventEmitter<void>();
  @Output() tripSaved = new EventEmitter<void>();
  @Output() tripShared = new EventEmitter<void>();
  @Output() routeCleared = new EventEmitter<void>();
  @Output() routeSaveRequested = new EventEmitter<void>();
  @Output() navigationStarted = new EventEmitter<void>();

  formatPostType(type?: string | null): string {
    return formatPostType(type);
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  trackByStopId(index: number, stop: PlannerStop): number {
    return stop.id || index;
  }
}
