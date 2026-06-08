import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationStep } from '../../../services/routing.service';
import { RoutingService } from '../../../services/routing.service';
import { TravelMode } from '../../../services/tourist-preferences.service';
import { SiteTranslateService } from '../../../services/site-translate.service';

@Component({
  selector: 'app-map-navigation-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-navigation-panel.component.html',
  styleUrls: ['./map-navigation-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapNavigationPanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() steps: NavigationStep[] = [];
  @Input() routeGeometry: [number, number][] = [];
  @Input() travelMode: TravelMode = 'driving';
  @Input() totalDistanceKm = 0;
  @Input() totalDurationMin = 0;

  /** Emits updated user position so map-home can redraw the user dot */
  @Output() positionUpdated = new EventEmitter<[number, number]>();
  @Output() exitNavigation = new EventEmitter<void>();
  /** Emits compass heading (degrees) so the map can rotate */
  @Output() mapRotationUpdated = new EventEmitter<number>();
  /** Emits remaining geometry (points NOT yet passed) so map-home can trim the polyline */
  @Output() routeTrailUpdated = new EventEmitter<[number, number][]>();
  /** Emits a fully recalculated route when the user goes off-route */
  @Output() routeRecalculated = new EventEmitter<{ steps: NavigationStep[]; geometry: [number, number][] }>();
  @Output() navigationArrived = new EventEmitter<void>();
  @Output() travelModeChanged = new EventEmitter<TravelMode>();

  readonly travelModes: Array<{ mode: TravelMode; label: string }> = [
    { mode: 'driving', label: 'Car' },
    { mode: 'walking', label: 'Walk' },
    { mode: 'cycling', label: 'Cycle' },
  ];

  currentStepIndex = 0;
  distanceToNextM = 0;
  remainingDistanceKm = 0;
  remainingMin = 0;
  arrived = false;
  locationDenied = false;
  userPosition: [number, number] | null = null;
  speedKmh: number | null = null;

  private watchId: number | null = null;
  private headingWatchId: number | null = null;
  private lastHeading: number | null = null;
  private readonly ADVANCE_THRESHOLD_M = 30;
  private readonly ARRIVE_THRESHOLD_M = 50;

  // ─── Rerouting state ─────────────────────────────────────────────────────
  /** Distance (meters) the user must be off-route to trigger recalculation */
  private readonly OFF_ROUTE_THRESHOLD_M = 50;
  /** How many consecutive off-route GPS ticks before rerouting fires */
  private readonly OFF_ROUTE_CONFIRM_TICKS = 2;
  /** Minimum milliseconds between two reroute attempts */
  private readonly REROUTE_COOLDOWN_MS = 10_000;
  /** Counter of consecutive off-route ticks */
  private offRouteTicks = 0;
  /** True while a reroute HTTP request is in flight */
  isRerouting = false;
  /** Timestamp of the last successful reroute */
  private lastRerouteAt = 0;
  /** Last route segment already reached; prevents GPS jitter from restoring passed trail. */
  private lastRemainingSegmentIndex = 0;
  /** Fractional polyline progress (segment index + projection t) used to trim smoothly. */
  private lastRemainingRouteProgress = 0;

  get currentStep(): NavigationStep | null {
    return this.steps[this.currentStepIndex] ?? null;
  }

  get nextStep(): NavigationStep | null {
    return this.steps[this.currentStepIndex + 1] ?? null;
  }

  /** Step two positions ahead — shown in the "then" strip */
  get nextNextStep(): NavigationStep | null {
    return this.steps[this.currentStepIndex + 2] ?? null;
  }

  get modeIcon(): string {
    return this.travelMode === 'walking' ? '🚶' : this.travelMode === 'cycling' ? '🚴' : '🚗';
  }

  get etaString(): string {
    if (this.remainingMin <= 0) return '';
    const d = new Date();
    d.setMinutes(d.getMinutes() + this.remainingMin);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  get modeLabel(): string {
    return this.t(this.travelModes.find(option => option.mode === this.travelMode)?.label ?? 'Car');
  }

  /** CSS rotation (degrees) for the arrow SVG based on the current maneuver. */
  maneuverRotation(step: NavigationStep | null): number {
    if (!step) return 0;
    const { maneuverType: t, maneuverModifier: m } = step;
    if (t === 'arrive' || t === 'depart') return 0;
    if (t === 'roundabout' || t === 'rotary') return 45;
    if (!m || m === 'straight') return 0;
    if (m === 'right')        return 90;
    if (m === 'sharp right')  return 140;
    if (m === 'slight right') return 45;
    if (m === 'left')         return -90;
    if (m === 'sharp left')   return -140;
    if (m === 'slight left')  return -45;
    if (m === 'uturn')        return 180;
    return 0;
  }

  /** Short label for the "Then" strip. */
  nextLabel(step: NavigationStep | null): string {
    if (!step) return '';
    const m = step.maneuverModifier;
    const t = step.maneuverType;
    if (t === 'arrive') return this.t('Arrive');
    if (!m || m === 'straight') return this.t('Continue straight');
    if (m === 'right')        return this.t('Turn right');
    if (m === 'sharp right')  return this.t('Turn sharp right');
    if (m === 'slight right') return this.t('Bear right');
    if (m === 'left')         return this.t('Turn left');
    if (m === 'sharp left')   return this.t('Turn sharp left');
    if (m === 'slight left')  return this.t('Bear left');
    if (m === 'uturn')        return this.t('U-turn');
    if (t === 'roundabout' || t === 'rotary') return this.t('Enter roundabout');
    return this.t('Continue');
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private routingService: RoutingService,
    private translate: SiteTranslateService,
  ) {}

  t(value: string): string {
    return this.translate.instant(value);
  }

  ngOnInit(): void {
    this.remainingDistanceKm = this.totalDistanceKm;
    this.remainingMin = this.totalDurationMin;
    this.startWatching();
    this.startHeadingWatch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps'] || changes['routeGeometry'] || changes['travelMode']) {
      this.resetNavigationProgress();
      return;
    }

    if (changes['totalDistanceKm'] || changes['totalDurationMin']) {
      this.remainingDistanceKm = this.totalDistanceKm;
      this.remainingMin = this.totalDurationMin;
    }
  }

  ngOnDestroy(): void {
    this.stopWatching();
    this.stopHeadingWatch();
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

  selectTravelMode(mode: TravelMode): void {
    if (mode === this.travelMode || this.isRerouting) return;
    this.travelModeChanged.emit(mode);
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

  private startHeadingWatch(): void {
    // DeviceOrientationEvent gives us compass heading on mobile
    const handler = (event: DeviceOrientationEvent) => {
      // webkitCompassHeading is available on iOS, alpha on Android (needs to be inverted)
      let heading: number | null = null;
      if ((event as any).webkitCompassHeading != null) {
        heading = (event as any).webkitCompassHeading as number;
      } else if (event.alpha != null) {
        // Android: alpha is clockwise from North when absolute
        heading = (360 - event.alpha) % 360;
      }
      if (heading !== null) {
        this.zone.run(() => {
          this.lastHeading = heading;
          this.mapRotationUpdated.emit(heading!);
        });
      }
    };

    // iOS 13+ requires permission
    const doe = DeviceOrientationEvent as any;
    if (typeof doe.requestPermission === 'function') {
      doe.requestPermission()
        .then((state: string) => {
          if (state === 'granted') {
            window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
            window.addEventListener('deviceorientation', handler as EventListener, true);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.addEventListener('deviceorientation', handler as EventListener, true);
    }

    // Store reference for cleanup
    (this as any)._orientationHandler = handler;
  }

  private stopHeadingWatch(): void {
    const handler = (this as any)._orientationHandler;
    if (handler) {
      window.removeEventListener('deviceorientationabsolute', handler, true);
      window.removeEventListener('deviceorientation', handler, true);
    }
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
        this.speedKmh = pos.coords.speed != null
          ? Math.round(pos.coords.speed * 3.6)
          : null;
        // Use GPS course as heading fallback when device orientation not available
        if (pos.coords.heading != null && !isNaN(pos.coords.heading) && this.lastHeading === null) {
          this.mapRotationUpdated.emit(pos.coords.heading);
        }
        this.positionUpdated.emit([lat, lng]);
        this.updateProgress(lat, lng);
        if (!this.arrived) {
          // Emit the remaining geometry so map can trim the trail
          this.emitRemainingGeometry(lat, lng);
          // Check if user has gone off-route and recalculate if needed
          this.checkOffRoute(lat, lng);
        }
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

  private emitRemainingGeometry(lat: number, lng: number): void {
    if (this.arrived) return;
    if (!this.routeGeometry || this.routeGeometry.length < 2) return;

    let bestProjection: RouteSegmentProjection | null = null;
    let bestDist = Infinity;

    for (let i = this.lastRemainingSegmentIndex; i < this.routeGeometry.length - 1; i++) {
      const projection = this.projectPointToSegment(
        lat, lng,
        this.routeGeometry[i][0],   this.routeGeometry[i][1],
        this.routeGeometry[i + 1][0], this.routeGeometry[i + 1][1],
      );
      if (projection.distanceM < bestDist) {
        bestDist = projection.distanceM;
        bestProjection = { ...projection, segmentIndex: i };
      }
    }

    if (!bestProjection) return;

    const rawProgress = bestProjection.segmentIndex + bestProjection.t;
    const progress = Math.max(rawProgress, this.lastRemainingRouteProgress);
    this.lastRemainingRouteProgress = progress;

    const segmentIndex = Math.min(
      Math.floor(progress),
      this.routeGeometry.length - 2,
    );
    const segmentProgress = Math.min(1, Math.max(0, progress - segmentIndex));
    this.lastRemainingSegmentIndex = segmentIndex;

    const startPoint = this.interpolateRoutePoint(segmentIndex, segmentProgress);
    const remaining = this.routeGeometry.slice(segmentIndex + 1);
    this.routeTrailUpdated.emit([startPoint, ...remaining]);
  }

  /**
   * Off-route detection: measures the perpendicular distance from the current
   * position to the nearest segment of the route polyline.
   * If the user is farther than OFF_ROUTE_THRESHOLD_M for OFF_ROUTE_CONFIRM_TICKS
   * consecutive GPS ticks, a reroute is triggered.
   */
  private checkOffRoute(lat: number, lng: number): void {
    if (this.arrived || this.isRerouting || this.steps.length === 0) return;
    if (this.routeGeometry.length < 2) return;

    // Cooldown: don’t reroute again too soon
    if (Date.now() - this.lastRerouteAt < this.REROUTE_COOLDOWN_MS) return;

    const distToRoute = this.distanceToPolylineM(lat, lng, this.routeGeometry);

    if (distToRoute > this.OFF_ROUTE_THRESHOLD_M) {
      this.offRouteTicks++;
      if (this.offRouteTicks >= this.OFF_ROUTE_CONFIRM_TICKS) {
        this.offRouteTicks = 0;
        this.triggerReroute(lat, lng);
      }
    } else {
      // Back on route — reset counter
      this.offRouteTicks = 0;
    }
  }

  /**
   * Calculates the minimum distance (meters) from point (lat, lng)
   * to any segment of the given polyline.
   */
  private distanceToPolylineM(lat: number, lng: number, polyline: [number, number][]): number {
    let minDist = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = this.pointToSegmentM(
        lat, lng,
        polyline[i][0], polyline[i][1],
        polyline[i + 1][0], polyline[i + 1][1],
      );
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  /**
   * Distance from point P to segment AB, in meters.
   * Uses haversine for the actual metre values.
   */
  private pointToSegmentM(
    pLat: number, pLng: number,
    aLat: number, aLng: number,
    bLat: number, bLng: number,
  ): number {
    return this.projectPointToSegment(pLat, pLng, aLat, aLng, bLat, bLng).distanceM;
  }

  private projectPointToSegment(
    pLat: number, pLng: number,
    aLat: number, aLng: number,
    bLat: number, bLng: number,
  ): RouteSegmentProjection {
    const dLat = bLat - aLat;
    const dLng = bLng - aLng;
    const lenSq = dLat * dLat + dLng * dLng;

    if (lenSq === 0) {
      return {
        lat: aLat,
        lng: aLng,
        t: 0,
        distanceM: this.haversineM(pLat, pLng, aLat, aLng),
        segmentIndex: 0,
      };
    }

    // Parameter t: projection of P onto segment AB, clamped to [0,1]
    const t = Math.max(0, Math.min(1,
      ((pLat - aLat) * dLat + (pLng - aLng) * dLng) / lenSq,
    ));

    const closestLat = aLat + t * dLat;
    const closestLng = aLng + t * dLng;
    return {
      lat: closestLat,
      lng: closestLng,
      t,
      distanceM: this.haversineM(pLat, pLng, closestLat, closestLng),
      segmentIndex: 0,
    };
  }

  private interpolateRoutePoint(segmentIndex: number, t: number): [number, number] {
    const start = this.routeGeometry[segmentIndex];
    const end = this.routeGeometry[segmentIndex + 1];
    if (!start || !end) return this.routeGeometry[this.routeGeometry.length - 1];

    return [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ];
  }

  /** Fires an async reroute request from the user’s current position to the final destination. */
  private triggerReroute(lat: number, lng: number): void {
    // Final destination is always the last step’s position
    const destination = this.steps[this.steps.length - 1].position;

    // Build waypoints: current position + any remaining planned stops
    // (steps after currentStepIndex that are destination-type stops)
    const remainingStopPositions = this.steps
      .slice(this.currentStepIndex + 1)
      .filter(s => s.maneuverType === 'arrive')
      .map(s => s.position);

    // Always include the final destination
    const waypoints: [number, number][] = [
      [lat, lng],
      ...remainingStopPositions,
    ];
    // Ensure we don’t duplicate the final destination
    const lastWp = waypoints[waypoints.length - 1];
    if (lastWp[0] !== destination[0] || lastWp[1] !== destination[1]) {
      waypoints.push(destination);
    }

    this.isRerouting = true;
    this.cdr.markForCheck();

    this.routingService.computeRouteForNavigation(waypoints, this.travelMode, { allowFallback: false })
      .then(result => {
        this.zone.run(() => {
          if (result.steps && result.steps.length > 0) {
            // Reset navigation state to the new route
            this.currentStepIndex = 0;
            this.offRouteTicks = 0;
            this.lastRerouteAt = Date.now();

            // Emit the new route up to map-home
            this.routeRecalculated.emit({
              steps: result.steps,
              geometry: result.geometry,
            });
          }
          this.isRerouting = false;
          this.cdr.markForCheck();
        });
      })
      .catch(() => {
        this.zone.run(() => {
          this.isRerouting = false;
          this.cdr.markForCheck();
        });
      });
  }

  private updateProgress(lat: number, lng: number): void {
    if (this.arrived) return;

    const destination = this.steps.length > 0
      ? this.steps[this.steps.length - 1].position
      : this.routeGeometry[this.routeGeometry.length - 1];
    if (!destination) return;

    const distToDest = this.haversineM(lat, lng, destination[0], destination[1]);
    if (distToDest < this.ARRIVE_THRESHOLD_M) {
      this.arrived = true;
      this.remainingDistanceKm = 0;
      this.remainingMin = 0;
      this.routeTrailUpdated.emit([]);
      this.stopWatching();
      this.stopHeadingWatch();
      this.navigationArrived.emit();
      return;
    }

    if (this.steps.length === 0) return;

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

  private resetNavigationProgress(): void {
    this.currentStepIndex = 0;
    this.distanceToNextM = 0;
    this.remainingDistanceKm = this.totalDistanceKm;
    this.remainingMin = this.totalDurationMin;
    this.arrived = false;
    this.offRouteTicks = 0;
    this.lastRemainingSegmentIndex = 0;
    this.lastRemainingRouteProgress = 0;
    this.cdr.markForCheck();
  }
}

type RouteSegmentProjection = {
  lat: number;
  lng: number;
  t: number;
  distanceM: number;
  segmentIndex: number;
};
