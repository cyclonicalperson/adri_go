import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PlannerStop, RouteFieldTarget } from '../../../services/route-planner.service';
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
  readonly travelModes: Array<{ mode: TravelMode; label: string }> = [
    { mode: 'driving', label: 'Drive' },
    { mode: 'walking', label: 'Walk' },
    { mode: 'cycling', label: 'Cycle' },
  ];

  @Input() isNavigating = false;
  @Input() plannerStops: PlannerStop[] = [];
  @Input() fromOverride: PlannerStop | null = null;
  @Input() activeFieldTarget: RouteFieldTarget | null = null;
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
  @Input() navigationActionLabel = 'Start Navigation';

  @Output() travelModeSelected = new EventEmitter<TravelMode>();
  @Output() scenicModeToggled = new EventEmitter<void>();
  @Output() stopFocused = new EventEmitter<PlannerStop>();
  @Output() routePointMoved = new EventEmitter<{ index: number; direction: 'up' | 'down' }>();
  @Output() stopRemoved = new EventEmitter<number>();
  @Output() fromRemoved = new EventEmitter<void>();
  @Output() endsSwapped = new EventEmitter<void>();
  @Output() fieldActivated = new EventEmitter<RouteFieldTarget>();
  @Output() plannerOptimized = new EventEmitter<void>();
  @Output() tripSaved = new EventEmitter<void>();
  @Output() tripShared = new EventEmitter<void>();
  @Output() routeCleared = new EventEmitter<void>();
  @Output() routeSaveRequested = new EventEmitter<void>();
  @Output() navigationStarted = new EventEmitter<void>();

  /**
   * All stops except the last one — rendered as numbered "via" stops
   * between the From and To rows (Google Maps style).
   */
  get intermediateStops(): PlannerStop[] {
    return this.plannerStops.length > 1
      ? this.plannerStops.slice(0, -1)
      : [];
  }

  /** Last stop in the route — rendered as the "To" destination row. */
  get destinationStop(): PlannerStop | null {
    return this.plannerStops.length > 0
      ? this.plannerStops[this.plannerStops.length - 1]
      : null;
  }

  /** Total number of points in the route, including From and To. */
  get totalPointCount(): number {
    return 1 + this.plannerStops.length;
  }

  /**
   * True when there are exactly 2 points total (From + To, no intermediate
   * stops) — the swap (↕) button is shown in this case only.
   */
  get canSwapEnds(): boolean {
    return this.plannerStops.length === 1;
  }

  /**
   * True when there are 3+ points total — every row (From, stops, To) gets
   * move up/down buttons so the user can manually reorder the whole route.
   */
  get showMoveButtons(): boolean {
    return this.plannerStops.length >= 2;
  }

  /** True when the "From" field is currently activated for search/pin selection. */
  get isFromActive(): boolean {
    return this.activeFieldTarget?.kind === 'from';
  }

  /** True when the "To" (destination) field is currently activated. */
  get isToActive(): boolean {
    return this.activeFieldTarget?.kind === 'to';
  }

  /** True when the "Add a stop" row is currently activated. */
  get isNewStopActive(): boolean {
    return this.activeFieldTarget?.kind === 'new-stop';
  }

  /** True when the given intermediate stop is currently activated. */
  isStopActive(stopId: number): boolean {
    return this.activeFieldTarget?.kind === 'stop' && this.activeFieldTarget.stopId === stopId;
  }

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

  selectTravelMode(mode: TravelMode, event: Event): void {
    event.stopPropagation();
    this.travelModeSelected.emit(mode);
  }
}
