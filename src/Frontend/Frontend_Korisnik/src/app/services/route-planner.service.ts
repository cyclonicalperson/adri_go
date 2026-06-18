import { Injectable } from '@angular/core';
import { Location } from './location.service';
import { TravelMode } from './tourist-preferences.service';

export interface PlannerStop {
  id: number;
  title: string;
  postType: string;
  lat: number;
  lng: number;
  address?: string;
  regionName?: string;
  avgRating?: number;
}

/**
 * Identifies a slot in the From / Stops / To route builder that the user has
 * activated for editing via the main search bar or a map pin click.
 */
export type RouteFieldTarget =
  | { kind: 'from' }
  | { kind: 'stop'; stopId: number }
  | { kind: 'to' }
  | { kind: 'new-stop' };

export interface PlannerState {
  stops: PlannerStop[];
  plannerMode: boolean;
  scenicMode: boolean;
  travelMode: TravelMode;
  /**
   * Custom override for the route's starting point ("From"). When null, the
   * route starts from the user's GPS position (default behaviour). When set,
   * GPS is ignored for this route and the route starts here instead.
   */
  fromOverride: PlannerStop | null;
  // Id of the curated route this planner currently mirrors, or null when the
  // stops were assembled some other way (manual taps, optimization, saved trip).
  sourceRouteId: number | null;
  // Id of the private (localStorage SavedRoute) route this planner mirrors, or null.
  sourcePrivateRouteId: string | null;
  // Id of the backend TouristRoute this planner mirrors, or null.
  sourceTouristRouteId: number | null;
  // Curated route this planner originally started from, even after user edits.
  originRouteId: number | null;
}

const DEFAULT_STATE: PlannerState = {
  stops: [],
  plannerMode: false,
  scenicMode: true,
  travelMode: 'driving',
  fromOverride: null,
  sourceRouteId: null,
  sourcePrivateRouteId: null,
  sourceTouristRouteId: null,
  originRouteId: null,
};

@Injectable({ providedIn: 'root' })
export class RoutePlannerService {
  private readonly storageKey = 'adrigo_route_planner_v1';

  get snapshot(): PlannerState {
    return this.load();
  }

  setPlannerMode(enabled: boolean): PlannerState {
    return this.persist({ ...this.snapshot, plannerMode: enabled });
  }

  setScenicMode(enabled: boolean): PlannerState {
    return this.persist({ ...this.snapshot, scenicMode: enabled });
  }

  setTravelMode(mode: TravelMode): PlannerState {
    return this.persist({ ...this.snapshot, travelMode: mode });
  }

  /**
   * Sets or clears the custom "From" location. Pass null to fall back to the
   * user's GPS position.
   */
  setFromOverride(location: Location | PlannerStop | null): PlannerState {
    const state = this.snapshot;
    return this.persist({
      ...state,
      fromOverride: location ? this.normalizeStop(location) : null,
      sourceRouteId: null,
      sourcePrivateRouteId: null,
    });
  }

  addStop(location: Location | PlannerStop, options: { insertAfterIndex?: number } = {}): PlannerState {
    const stop = this.normalizeStop(location);
    const state = this.snapshot;
    const exists = state.stops.some(item => item.id === stop.id);

    if (exists) {
      return this.persist({ ...state, plannerMode: true });
    }

    const stops = [...state.stops];
    if (options.insertAfterIndex != null && options.insertAfterIndex >= 0 && options.insertAfterIndex < stops.length) {
      stops.splice(options.insertAfterIndex + 1, 0, stop);
    } else {
      stops.push(stop);
    }

    return this.persist({
      ...state,
      plannerMode: true,
      stops,
      sourceRouteId: null,
      sourcePrivateRouteId: null,
      sourceTouristRouteId: state.sourceTouristRouteId,
      originRouteId: state.originRouteId,
    });
  }

  replaceStops(stops: Array<Location | PlannerStop>, options: Partial<PlannerState> = {}): PlannerState {
    return this.persist({
      ...this.snapshot,
      ...options,
      plannerMode: options.plannerMode ?? true,
      stops: stops.map(stop => this.normalizeStop(stop)),
      fromOverride: options.fromOverride !== undefined
        ? (options.fromOverride ? this.normalizeStop(options.fromOverride) : null)
        : this.snapshot.fromOverride,
      sourceRouteId: options.sourceRouteId ?? null,
      sourcePrivateRouteId: options.sourcePrivateRouteId ?? null,
      sourceTouristRouteId: options.sourceTouristRouteId ?? null,
      originRouteId: options.originRouteId ?? null,
    });
  }

  removeStop(stopId: number): PlannerState {
    const state = this.snapshot;
    return this.persist({
      ...state,
      stops: state.stops.filter(stop => stop.id !== stopId),
      sourceRouteId: null,
      sourcePrivateRouteId: null,
      sourceTouristRouteId: state.sourceTouristRouteId,
      originRouteId: state.originRouteId,
    });
  }

  moveStop(fromIndex: number, toIndex: number): PlannerState {
    const state = this.snapshot;
    const stops = [...state.stops];
    if (fromIndex < 0 || fromIndex >= stops.length || toIndex < 0 || toIndex >= stops.length || fromIndex === toIndex) {
      return state;
    }

    const [moved] = stops.splice(fromIndex, 1);
    stops.splice(toIndex, 0, moved);
    return this.persist({
      ...state,
      stops,
      sourceRouteId: null,
      sourcePrivateRouteId: null,
      sourceTouristRouteId: state.sourceTouristRouteId,
      originRouteId: state.originRouteId,
    });
  }

  clear(): PlannerState {
    localStorage.removeItem(this.storageKey);
    return { ...DEFAULT_STATE, stops: [], fromOverride: null };
  }

  serializeTripQuery(): string {
    return this.snapshot.stops
      .map(stop => stop.id)
      .filter(id => id > 0)
      .join(',');
  }

  private normalizeStop(location: Location | PlannerStop): PlannerStop {
    const rawLocation = location as Location & PlannerStop;
    const lat = rawLocation.lat ?? rawLocation.latitude;
    const lng = rawLocation.lng ?? rawLocation.longitude;

    if (lat == null || lng == null) {
      throw new Error('Planner stop requires coordinates.');
    }

    return {
      id: location.id,
      title: 'title' in location ? location.title : '',
      postType: 'postType' in location ? location.postType : '',
      lat,
      lng,
      address: 'address' in location ? location.address : undefined,
      regionName: 'regionName' in location ? location.regionName : undefined,
      avgRating: 'avgRating' in location ? location.avgRating : undefined,
    };
  }

  private load(): PlannerState {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return DEFAULT_STATE;
      }

      const parsed = JSON.parse(raw) as Partial<PlannerState>;
      const fromOverrideRaw = parsed.fromOverride as Partial<PlannerStop> | null | undefined;
      const fromOverride = fromOverrideRaw
        && typeof fromOverrideRaw.id === 'number'
        && typeof fromOverrideRaw.lat === 'number'
        && typeof fromOverrideRaw.lng === 'number'
        ? (fromOverrideRaw as PlannerStop)
        : null;

      return {
        plannerMode: !!parsed.plannerMode,
        scenicMode: parsed.scenicMode ?? DEFAULT_STATE.scenicMode,
        travelMode: parsed.travelMode === 'walking' || parsed.travelMode === 'cycling'
          ? parsed.travelMode
          : 'driving',
        stops: Array.isArray(parsed.stops)
          ? parsed.stops.filter(stop => typeof stop?.id === 'number' && typeof stop?.lat === 'number' && typeof stop?.lng === 'number')
          : [],
        fromOverride,
        sourceRouteId: typeof parsed.sourceRouteId === 'number' ? parsed.sourceRouteId : null,
        sourcePrivateRouteId: typeof parsed.sourcePrivateRouteId === 'string' ? parsed.sourcePrivateRouteId : null,
        sourceTouristRouteId: typeof parsed.sourceTouristRouteId === 'number' ? parsed.sourceTouristRouteId : null,
        originRouteId: typeof parsed.originRouteId === 'number' ? parsed.originRouteId : null,
      };
    } catch {
      return DEFAULT_STATE;
    }
  }

  private persist(state: PlannerState): PlannerState {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
    return state;
  }
}
