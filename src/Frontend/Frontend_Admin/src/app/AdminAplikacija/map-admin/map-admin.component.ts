import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { MapComponent, MapMarker, HeatPoint } from '@shared/components/map/map.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';

type LayerType = 'all' | 'locations' | 'events' | 'routes';

interface PostPin {
  id: number;
  title: string;
  postType: string;
  lat: number | null;
  lng: number | null;
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

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    // Load posts (non-events and events)
    const postsParams = new HttpParams().set('page', 1).set('pageSize', 200);
    this.http.get<{ data: any[] }>(`${environment.apiUrl}/posts`, { params: postsParams })
      .subscribe({
        next: res => {
          this.posts = (res.data ?? [])
            .filter((p: any) => p.lat != null && p.lng != null)
            .map((p: any) => ({
              id: p.postId ?? p.id,
              title: p.title,
              postType: p.postType,
              lat: +p.lat,
              lng: +p.lng,
              regionName: p.region?.name ?? null,
            }));

          // Load routes after posts
          const routeParams = new HttpParams().set('page', 1).set('pageSize', 100);
          this.http.get<{ data: any[] }>(`${environment.apiUrl}/routes`, { params: routeParams })
            .subscribe({
              next: rRes => {
                this.routes = (rRes.data ?? []).filter((r: any) => r.waypoints?.length > 0);
                this.loading = false;
                // Load movements for heatmap overlay
                this.http.get<{ data: any[] }>(`${environment.apiUrl}/analytics/movements`)
                  .subscribe(mRes => {
                    const moves = mRes.data ?? [];
                    const maxVisits = Math.max(...moves.map((m: any) => m.visitCount), 1);
                    this.heatPoints = moves.map((m: any) => ({
                      lat: m.latitude,
                      lng: m.longitude,
                      intensity: m.visitCount / maxVisits,
                      label: `${m.regionName}: ${m.visitCount} poseta`,
                    }));
                  });
              },
              error: () => { this.loading = false; },
            });
        },
        error: () => { this.loading = false; },
      });
  }

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
          label: p.title,
          category: this.typeLabel(p.postType) + (p.regionName ? ` · ${p.regionName}` : ''),
        });
      }
    }

    if (showRoutes) {
      for (const r of this.routes) {
        // Show first waypoint as pin for routes
        const wp = r.waypoints[0];
        if (!wp) continue;
        result.push({
          id: 100000 + r.routeId,
          lat: wp.lat,
          lng: wp.lng,
          label: r.name,
          category: '🗺️ Ruta' + (r.regionName ? ` · ${r.regionName}` : ''),
        });
      }
    }

    return result;
  }

  get locationCount(): number { return this.posts.filter(p => p.postType !== 'event' && p.lat).length; }
  get eventCount(): number { return this.posts.filter(p => p.postType === 'event' && p.lat).length; }
  get routeCount(): number { return this.routes.length; }

  onMarkerClicked(m: MapMarker): void { this.selectedMarker = m; }
  clearSelection(): void { this.selectedMarker = null; }

  toggleHeatmap(): void {
    this.showHeatmap = !this.showHeatmap;
    if (!this.showHeatmap) {
      this.mapComp?.clearHeat();
    }
  }

  get activeHeatPoints(): HeatPoint[] {
    return this.showHeatmap ? this.heatPoints : [];
  }

  goToDetail(): void {
    if (!this.selectedMarker) return;
    const id = this.selectedMarker.id;
    // Route markers have id >= 100000
    if (id >= 100000) {
      this.router.navigate(['/admin/routes-management']);
    } else {
      // Check if it's an event
      const post = this.posts.find(p => p.id === id);
      if (post?.postType === 'event') {
        this.router.navigate(['/admin/events', id, 'edit']);
      } else {
        this.router.navigate(['/admin/lokacije', id]);
      }
    }
  }

  setLayer(l: LayerType): void {
    this.layer = l;
    this.selectedMarker = null;
    // Trigger invalidateSize in case panel height changed
    setTimeout(() => this.mapComp?.refresh(), 50);
  }

  typeLabel(postType: string): string {
    const map: Record<string, string> = {
      accommodation: '🏨 Smeštaj',
      restaurant: '🍽️ Restoran',
      club: '🎵 Klub',
      cultural_site: '🏛️ Kulturni objekat',
      monument: '🗿 Spomenik',
      sports_facility: '⚽ Sportski objekat',
      event: '🎟️ Dogadjaj',
      attraction: '🌟 Atrakcija',
      shop: '🛍️ Prodavnica',
      other: '📍 Ostalo',
    };
    return map[postType] ?? postType;
  }
}
