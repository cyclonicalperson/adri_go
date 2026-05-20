import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RoutePlannerService } from '../services/route-planner.service';
import { TouristRouteItem, TouristRoutesService } from '../services/tourist-routes.service';

type RouteSort = 'created-desc' | 'distance-asc' | 'distance-desc' | 'duration-asc' | 'name-asc';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routes.component.html',
  styleUrls: ['./routes.component.css'],
})
export class RoutesComponent implements OnInit {
  routes: TouristRouteItem[] = [];
  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  sortOption: RouteSort = 'created-desc';
  isMenuOpen = false;

  constructor(
    private routesService: TouristRoutesService,
    private routePlanner: RoutePlannerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRoutes();
  }

  get visibleRoutes(): TouristRouteItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = q
      ? this.routes.filter(route =>
          route.name.toLowerCase().includes(q) ||
          (route.regionName || '').toLowerCase().includes(q) ||
          (route.difficulty || '').toLowerCase().includes(q)
        )
      : this.routes;

    return this.sortRoutes(filtered);
  }

  loadRoutes(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.routesService.getRoutes().subscribe({
      next: routes => {
        this.routes = routes;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load routes.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openOnMap(route: TouristRouteItem): void {
    if (route.waypoints.length === 0) return;

    this.routePlanner.replaceStops(
      this.routesService.routeToPlannerStops(route),
      { plannerMode: true, scenicMode: false, travelMode: 'walking', sourceRouteId: route.id },
    );
    this.router.navigate(['/map-home']);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }

  private sortRoutes(routes: TouristRouteItem[]): TouristRouteItem[] {
    const sorted = [...routes];
    switch (this.sortOption) {
      case 'distance-asc': return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
      case 'distance-desc': return sorted.sort((a, b) => b.distanceKm - a.distanceKm);
      case 'duration-asc': return sorted.sort((a, b) => a.durationMin - b.durationMin);
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
  }
}
