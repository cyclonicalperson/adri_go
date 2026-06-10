import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoutePlannerService } from '../services/route-planner.service';
import { TouristRouteItem, TouristRoutesService } from '../services/tourist-routes.service';
import { AuthRequiredModalComponent } from '../shared/auth-required-modal/auth-required-modal.component';
import { SearchStateService } from '../services/search-state.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

type RouteSort = 'created-desc' | 'distance-asc' | 'distance-desc' | 'duration-asc' | 'name-asc';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, AuthRequiredModalComponent],
  templateUrl: './routes.component.html',
  styleUrls: ['./routes.component.css'],
})
export class RoutesComponent implements OnInit {
  routes: TouristRouteItem[] = [];
  isLoading = false;
  errorMessage = '';
  feedbackMessage = '';
  searchQuery = '';
  sortOption: RouteSort = 'created-desc';
  isMenuOpen = false;
  showAuthPopup = false;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public authService: AuthService,
    private routesService: TouristRoutesService,
    private routePlanner: RoutePlannerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private searchStateService: SearchStateService,
  ) {}

  ngOnInit(): void {
    this.searchQuery = this.searchStateService.get();
    this.loadRoutes();
  }

  onSearchQueryChange(query: string): void {
    this.searchStateService.set(query);
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
        if (!this.authService.isLoggedIn) {
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        this.routesService.getMySavedRoutes().subscribe({
          next: savedRoutes => {
            this.applySavedRouteState(savedRoutes);
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: err => {
            this.handleAuthFailure(err);
            this.isLoading = false;
            this.cdr.markForCheck();
          },
        });
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
      {
        plannerMode: true,
        scenicMode: false,
        travelMode: this.routePlanner.snapshot.travelMode || 'driving',
        sourceRouteId: route.id,
      },
    );
    this.router.navigate(['/map-home']);
  }

  toggleSavedRoute(route: TouristRouteItem, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn) {
      this.showAuthPopup = true;
      this.cdr.markForCheck();
      return;
    }

    this.routesService.toggleSaveRoute(route.id).subscribe({
      next: res => {
        this.routes = this.routes.map(item =>
          item.id === route.id
            ? {
                ...item,
                isSaved: res.isSaved,
                saveCount: res.saveCount ?? item.saveCount,
              }
            : item,
        );
        this.showFeedback(res.isSaved ? 'Route saved to Saved Routes.' : 'Removed from Saved Routes.');
        this.cdr.markForCheck();
      },
      error: err => {
        if (!this.handleAuthFailure(err)) {
          this.showFeedback('Could not update saved route right now.');
        }
        this.cdr.markForCheck();
      },
    });
  }

  goToLogin(): void {
    this.showAuthPopup = false;
    this.router.navigate(['/login']);
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

  private applySavedRouteState(savedRoutes: TouristRouteItem[]): void {
    const savedMap = new Map(savedRoutes.map(route => [route.id, route]));
    this.routes = this.routes.map(route => {
      const saved = savedMap.get(route.id);
      return {
        ...route,
        isSaved: !!saved,
        saveCount: saved?.saveCount ?? route.saveCount ?? 0,
      };
    });
  }

  private handleAuthFailure(err: any): boolean {
    if (err?.status !== 401) return false;
    this.authService.logout();
    this.router.navigate(['/login']);
    return true;
  }

  private showFeedback(message: string): void {
    this.feedbackMessage = message;
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = '';
      this.feedbackTimer = null;
      this.cdr.markForCheck();
    }, 2600);
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
