import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { HeatPoint, MapComponent, MapMarker, MapPath } from '@shared/components/map/map.component';
import { catchError, forkJoin, of } from 'rxjs';

type LayerType = 'all' | 'locations' | 'events' | 'routes';

interface PostPin {
  id: number;
  title: string;
  postType: string;
  lat: number;
  lng: number;
  regionName?: string | null;
}

interface RoutePin {
  routeId: number;
  name: string;
  waypoints: { lat: number; lng: number }[];
  regionName?: string | null;
}

@Component({
  selector: 'app-map-admin',
  standalone: true,
  imports: [MapComponent, BadgeComponent],
  templateUrl: './map-admin.component.html',
  styleUrl: './map-admin.component.scss',
})
export class MapAdminComponent implements OnInit {
  @ViewChild(MapComponent) mapComp?: MapComponent;

  posts: PostPin[] = [];
  routes: RoutePin[] = [];
  selectedMarker: MapMarker | null = null;
  layer: LayerType = 'all';
  loading = true;
  showHeatmap = false;
  heatPoints: HeatPoint[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    const postsReq = this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, {
      params: new HttpParams().set('page', 1).set('pageSize', 200),
    }).pipe(catchError(() => of({ data: [] })));

    const routesReq = this.http.get<{ data: any[] }>(`${environment.apiUrl}/routes`, {
      params: new HttpParams().set('page', 1).set('pageSize', 100),
    }).pipe(catchError(() => of({ data: [] })));

    const movementsReq = this.http.get<{ data: any[] }>(`${environment.apiUrl}/analytics/movements`)
      .pipe(catchError(() => of({ data: [] })));

    forkJoin({ posts: postsReq, routes: routesReq, movements: movementsReq }).subscribe({
      next: ({ posts, routes, movements }) => {
        this.posts = (posts.data ?? [])
          .filter((p: any) => p.lat != null && p.lng != null)
          .map((p: any) => ({
            id: p.id ?? p.postId,
            title: p.title ?? '',
            postType: p.postType ?? 'other',
            lat: +p.lat,
            lng: +p.lng,
            regionName: p.region?.name ?? p.regionName ?? null,
          }));

        this.routes = (routes.data ?? [])
          .map((r: any) => {
            let wps: { lat: number; lng: number }[] = [];
            if (r.waypoints) {
              try {
                const parsed = typeof r.waypoints === 'string'
                  ? JSON.parse(r.waypoints)
                  : r.waypoints;
                wps = (Array.isArray(parsed) ? parsed : []).map((w: any) => ({
                  lat: +w.lat,
                  lng: +w.lng,
                })).filter((w: any) => !Number.isNaN(w.lat) && !Number.isNaN(w.lng));
              } catch {
                wps = [];
              }
            }

            return {
              routeId: r.routeId ?? r.id,
              name: r.name ?? '',
              waypoints: wps,
              regionName: r.region?.name ?? null,
            } as RoutePin;
          })
          .filter((r: RoutePin) => r.waypoints.length > 0);

        const moves = movements.data ?? [];
        const maxVisits = Math.max(...moves.map((m: any) => m.visitCount ?? 0), 1);
        this.heatPoints = moves
          .filter((m: any) => m.latitude && m.longitude)
          .map((m: any) => ({
            lat: +m.latitude,
            lng: +m.longitude,
            intensity: (m.visitCount ?? 0) / maxVisits,
            label: `${m.regionName}: ${m.visitCount} poseta`,
          }));

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private readonly typeColorMap: Record<string, string> = {
    accommodation: '#3b82f6',
    restaurant: '#ef4444',
    club: '#8b5cf6',
    cultural_site: '#f59e0b',
    monument: '#d97706',
    sports_facility: '#22c55e',
    event: '#ec4899',
    attraction: '#10b981',
    shop: '#f97316',
    other: '#6b7280',
  };

  get markers(): MapMarker[] {
    const result: MapMarker[] = [];
    const showLocations = this.layer === 'all' || this.layer === 'locations';
    const showEvents = this.layer === 'all' || this.layer === 'events';
    const showRoutes = this.layer === 'all' || this.layer === 'routes';

    if (showLocations || showEvents) {
      for (const p of this.posts) {
        if (!p.lat || !p.lng) continue;

        const isEvent = p.postType === 'event';
        if (isEvent && !showEvents) continue;
        if (!isEvent && !showLocations) continue;

        result.push({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          label: p.title + (p.regionName ? ` (${p.regionName})` : ''),
          category: p.postType,
          color: this.typeColorMap[p.postType] ?? '#6b7280',
        });
      }
    }

    if (showRoutes) {
      for (const r of this.routes) {
        const wp = r.waypoints[0];
        if (!wp) continue;

        result.push({
          id: 100000 + r.routeId,
          lat: wp.lat,
          lng: wp.lng,
          label: r.name + (r.regionName ? ` (${r.regionName})` : ''),
          category: 'route',
          color: '#0ea5e9',
        });
      }
    }

    return result;
  }

  get activeHeatPoints(): HeatPoint[] {
    return this.showHeatmap ? this.heatPoints : [];
  }

  get routePaths(): MapPath[] {
    if (this.layer !== 'all' && this.layer !== 'routes') {
      return [];
    }

    return this.routes
      .filter(route => route.waypoints.length >= 2)
      .map(route => ({
        id: `route-${route.routeId}`,
        label: route.name,
        color: '#0ea5e9',
        weight: 4,
        points: route.waypoints.map(waypoint => ({
          lat: waypoint.lat,
          lng: waypoint.lng,
        })),
      }));
  }

  get locationCount(): number { return this.posts.filter(p => p.postType !== 'event').length; }
  get eventCount(): number { return this.posts.filter(p => p.postType === 'event').length; }
  get routeCount(): number { return this.routes.length; }

  onMarkerClicked(m: MapMarker): void {
    this.selectedMarker = m;
  }

  clearSelection(): void {
    this.selectedMarker = null;
  }

  toggleHeatmap(): void {
    this.showHeatmap = !this.showHeatmap;
    if (!this.showHeatmap) {
      this.mapComp?.clearHeat();
    }
  }

  goToDetail(): void {
    if (!this.selectedMarker) return;

    const id = this.selectedMarker.id;
    if (id >= 100000) {
      void this.router.navigate(['/admin/routes-management', id - 100000]);
      return;
    }

    const post = this.posts.find(p => p.id === id);
    if (post?.postType === 'event') {
      void this.router.navigate(['/admin/events', id, 'edit']);
    } else {
      void this.router.navigate(['/admin/lokacije', id]);
    }
  }

  setLayer(l: LayerType): void {
    this.layer = l;
    this.selectedMarker = null;
    setTimeout(() => this.mapComp?.refresh(), 50);
  }

  typeLabel(postType: string): string {
    const map: Record<string, string> = {
      accommodation: 'Smestaj',
      restaurant: 'Restoran',
      club: 'Klub',
      cultural_site: 'Kulturni objekat',
      monument: 'Spomenik',
      sports_facility: 'Sportski objekat',
      event: 'Dogadjaj',
      attraction: 'Atrakcija',
      shop: 'Prodavnica',
      other: 'Ostalo',
    };
    return map[postType] ?? postType;
  }

  readonly legendEntries: { color: string; label: string }[] = [
    { color: '#3b82f6', label: 'Smestaj' },
    { color: '#ef4444', label: 'Restoran' },
    { color: '#8b5cf6', label: 'Klub' },
    { color: '#f59e0b', label: 'Kulturni objekat' },
    { color: '#d97706', label: 'Spomenik' },
    { color: '#22c55e', label: 'Sportski objekat' },
    { color: '#ec4899', label: 'Dogadjaj' },
    { color: '#10b981', label: 'Atrakcija' },
    { color: '#f97316', label: 'Prodavnica' },
    { color: '#0ea5e9', label: 'Ruta' },
    { color: '#6b7280', label: 'Ostalo' },
  ];
}
