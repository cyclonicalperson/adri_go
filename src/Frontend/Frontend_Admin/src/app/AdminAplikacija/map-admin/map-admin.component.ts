import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '@env/environment';
import { MapComponent, MapMarker, HeatPoint } from '@shared/components/map/map.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';

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
        // Mapiramo postove — backend vraca 'id' u PostDto
        this.posts = (posts.data ?? [])
          .filter((p: any) => p.lat != null && p.lng != null)
          .map((p: any) => ({
            id:         p.id ?? p.postId,
            title:      p.title ?? '',
            postType:   p.postType ?? 'other',
            lat:        +p.lat,
            lng:        +p.lng,
            regionName: p.region?.name ?? p.regionName ?? null,
          }));

        // Mapiramo rute — backend vraća waypoints kao JSON string
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
                })).filter((w: any) => !isNaN(w.lat) && !isNaN(w.lng));
              } catch { wps = []; }
            }
            return {
              routeId:    r.routeId ?? r.id,
              name:       r.name ?? '',
              waypoints:  wps,
              regionName: r.region?.name ?? null,
            } as RoutePin;
          })
          .filter((r: RoutePin) => r.waypoints.length > 0);

        // Heatmap iz kretanja turista
        const moves = movements.data ?? [];
        const maxVisits = Math.max(...moves.map((m: any) => m.visitCount ?? 0), 1);
        this.heatPoints = moves
          .filter((m: any) => m.latitude && m.longitude)
          .map((m: any) => ({
            lat:       +m.latitude,
            lng:       +m.longitude,
            intensity: (m.visitCount ?? 0) / maxVisits,
            label:     `${m.regionName}: ${m.visitCount} poseta`,
          }));

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get markers(): MapMarker[] {
    const result: MapMarker[] = [];
    const showLocations = this.layer === 'all' || this.layer === 'locations';
    const showEvents    = this.layer === 'all' || this.layer === 'events';
    const showRoutes    = this.layer === 'all' || this.layer === 'routes';

    if (showLocations || showEvents) {
      for (const p of this.posts) {
        if (!p.lat || !p.lng) continue;
        const isEvent = p.postType === 'event';
        if (isEvent && !showEvents) continue;
        if (!isEvent && !showLocations) continue;
        result.push({
          id:       p.id,
          lat:      p.lat,
          lng:      p.lng,
          label:    p.title,
          category: this.typeLabel(p.postType) + (p.regionName ? ` · ${p.regionName}` : ''),
        });
      }
    }

    if (showRoutes) {
      for (const r of this.routes) {
        const wp = r.waypoints[0];
        if (!wp) continue;
        result.push({
          id:       100000 + r.routeId,
          lat:      wp.lat,
          lng:      wp.lng,
          label:    r.name,
          category: '🗺️ Ruta' + (r.regionName ? ` · ${r.regionName}` : ''),
        });
      }
    }

    return result;
  }

  get activeHeatPoints(): HeatPoint[] {
    return this.showHeatmap ? this.heatPoints : [];
  }

  get locationCount(): number { return this.posts.filter(p => p.postType !== 'event').length; }
  get eventCount(): number    { return this.posts.filter(p => p.postType === 'event').length; }
  get routeCount(): number    { return this.routes.length; }

  onMarkerClicked(m: MapMarker): void { this.selectedMarker = m; }
  clearSelection(): void { this.selectedMarker = null; }

  toggleHeatmap(): void {
    this.showHeatmap = !this.showHeatmap;
    if (!this.showHeatmap) this.mapComp?.clearHeat?.();
  }

  goToDetail(): void {
    if (!this.selectedMarker) return;
    const id = this.selectedMarker.id;
    if (id >= 100000) {
      this.router.navigate(['/admin/routes-management']);
    } else {
      const post = this.posts.find(p => p.id === id);
      if (post?.postType === 'event') {
        this.router.navigate(['/admin/events', id, 'edit']);
      } else {
        this.router.navigate(['/admin/destinacije', id]);
      }
    }
  }

  setLayer(l: LayerType): void {
    this.layer = l;
    this.selectedMarker = null;
    setTimeout(() => this.mapComp?.refresh?.(), 50);
  }

  typeLabel(postType: string): string {
    const map: Record<string, string> = {
      accommodation:    '🏨 Smeštaj',
      restaurant:       '🍽️ Restoran',
      club:             '🎵 Klub',
      cultural_site:    '🏛️ Kulturni objekat',
      monument:         '🗿 Spomenik',
      sports_facility:  '⚽ Sportski objekat',
      event:            '🎟️ Dogadjaj',
      attraction:       '🌟 Atrakcija',
      shop:             '🛍️ Prodavnica',
      other:            '📍 Ostalo',
    };
    return map[postType] ?? postType;
  }
}
