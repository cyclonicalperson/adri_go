import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationStep } from '../../../services/routing.service';
import { TravelMode } from '../../../services/tourist-preferences.service';

@Component({
  selector: 'app-map-navigation-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-navigation-panel.component.html',
  styleUrls: ['./map-navigation-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapNavigationPanelComponent implements OnInit, OnDestroy {
  @Input() steps: NavigationStep[] = [];
  @Input() routeGeometry: [number, number][] = [];
  @Input() travelMode: TravelMode = 'driving';
  @Input() totalDistanceKm = 0;
  @Input() totalDurationMin = 0;

  /** Emits updated user position so map-home can redraw the user dot */
  @Output() positionUpdated = new EventEmitter<[number, number]>();
  @Output() exitNavigation = new EventEmitter<void>();

  currentStepIndex = 0;
  distanceToNextM = 0;
  remainingDistanceKm = 0;
  remainingMin = 0;
  arrived = false;
  locationDenied = false;
  userPosition: [number, number] | null = null;

  private watchId: number | null = null;
  private readonly ADVANCE_THRESHOLD_M = 30;
  private readonly ARRIVE_THRESHOLD_M = 50;

  get currentStep(): NavigationStep | null {
    return this.steps[this.currentStepIndex] ?? null;
  }

  get nextStep(): NavigationStep | null {
    return this.steps[this.currentStepIndex + 1] ?? null;
  }

  get modeIcon(): string {
    return this.travelMode === 'walking' ? '🚶' : this.travelMode === 'cycling' ? '🚴' : '🚗';
  }

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnInit(): void {
    this.remainingDistanceKm = this.totalDistanceKm;
    this.remainingMin = this.totalDurationMin;
    this.startWatching();
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }

  formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  maneuverIcon(step: NavigationStep | null): string {
    if (!step) return '⬆️';
    const { maneuverType: type, maneuverModifier: mod } = step;
    if (type === 'arrive') return '🏁';
    if (type === 'depart') return '🚀';
    if (type === 'roundabout' || type === 'rotary') return '🔄';
    if (type === 'exit roundabout' || type === 'exit rotary') return '↗️';
    if (!mod || mod === 'straight') return '⬆️';
    if (mod.includes('right')) return mod.includes('sharp') ? '↪️' : mod.includes('slight') ? '↗️' : '➡️';
    if (mod.includes('left')) return mod.includes('sharp') ? '↩️' : mod.includes('slight') ? '↖️' : '⬅️';
    if (mod === 'uturn') return '🔁';
    return '⬆️';
  }

  private startWatching(): void {
    if (!navigator.geolocation) {
      this.locationDenied = true;
      this.cdr.markForCheck();
      return;
    }

    const onPosition = (pos: GeolocationPosition) => {
      this.zone.run(() => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.userPosition = [lat, lng];
        this.positionUpdated.emit([lat, lng]);
        this.updateProgress(lat, lng);
        this.cdr.markForCheck();
      });
    };

    const onError = (err: GeolocationPositionError) => {
      // High-accuracy timed out or was denied → fall back to network-based
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        this.zone.run(() => { this.locationDenied = true; this.cdr.markForCheck(); });
        return;
      }
      // Retry with low-accuracy (WiFi/IP — always available on desktop/Firefox)
      this.watchId = navigator.geolocation.watchPosition(
        onPosition,
        () => this.zone.run(() => { this.locationDenied = true; this.cdr.markForCheck(); }),
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 20000 },
      );
    };

    // Start with GPS-quality accuracy; onError handles graceful fallback
    this.watchId = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }

  private stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private updateProgress(lat: number, lng: number): void {
    if (this.arrived || this.steps.length === 0) return;

    const destination = this.steps[this.steps.length - 1].position;
    const distToDest = this.haversineM(lat, lng, destination[0], destination[1]);
    if (distToDest < this.ARRIVE_THRESHOLD_M) {
      this.arrived = true;
      this.remainingDistanceKm = 0;
      this.remainingMin = 0;
      return;
    }

    // Advance steps when the user is within threshold of the NEXT step's maneuver point
    while (this.currentStepIndex < this.steps.length - 1) {
      const nextManeuver = this.steps[this.currentStepIndex + 1].position;
      const dist = this.haversineM(lat, lng, nextManeuver[0], nextManeuver[1]);
      if (dist < this.ADVANCE_THRESHOLD_M) {
        this.currentStepIndex++;
      } else {
        break;
      }
    }

    // Distance to the current step's exit point (next step's entry)
    if (this.currentStepIndex < this.steps.length - 1) {
      const nextPos = this.steps[this.currentStepIndex + 1].position;
      this.distanceToNextM = this.haversineM(lat, lng, nextPos[0], nextPos[1]);
    } else {
      this.distanceToNextM = distToDest;
    }

    // Remaining: sum of all steps ahead
    const remainingM = this.steps
      .slice(this.currentStepIndex)
      .reduce((acc, s) => acc + s.distanceM, 0);
    this.remainingDistanceKm = Math.round((remainingM / 1000) * 10) / 10;

    const remainingSec = this.steps
      .slice(this.currentStepIndex)
      .reduce((acc, s) => acc + s.durationSec, 0);
    this.remainingMin = Math.round(remainingSec / 60);
  }

  private haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
