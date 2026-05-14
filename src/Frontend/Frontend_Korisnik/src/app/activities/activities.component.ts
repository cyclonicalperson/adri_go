import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { RoutePlannerService } from '../services/route-planner.service';
import { TouristActivitiesService, TouristActivityItem } from '../services/tourist-activities.service';

type ActivitySort = 'name-asc' | 'popular' | 'difficulty';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, SideMenuComponent],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css'],
})
export class ActivitiesComponent implements OnInit {
  activities: TouristActivityItem[] = [];
  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  sortOption: ActivitySort = 'name-asc';
  isMenuOpen = false;

  constructor(
    private activitiesService: TouristActivitiesService,
    private routePlanner: RoutePlannerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadActivities();
  }

  get visibleActivities(): TouristActivityItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = q
      ? this.activities.filter(activity =>
          activity.name.toLowerCase().includes(q) ||
          activity.category.toLowerCase().includes(q) ||
          (activity.locationName || '').toLowerCase().includes(q) ||
          (activity.tags || '').toLowerCase().includes(q)
        )
      : this.activities;

    return this.sortActivities(filtered);
  }

  loadActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.activitiesService.getActivities().subscribe({
      next: activities => {
        this.activities = activities;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load activities.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openActivity(activity: TouristActivityItem): void {
    if (activity.postId) {
      this.router.navigate(['/location-details', activity.postId]);
      return;
    }

    if (this.hasUsableCoordinates(activity)) {
      this.routePlanner.replaceStops([{
        id: -activity.id,
        title: activity.name,
        postType: 'activity',
        lat: activity.lat,
        lng: activity.lng,
        regionName: activity.locationName,
      }], { plannerMode: true, scenicMode: true, travelMode: 'walking' });
      this.router.navigate(['/map-home']);
    }
  }

  hasUsableCoordinates(activity: TouristActivityItem): activity is TouristActivityItem & { lat: number; lng: number } {
    return Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }

  private sortActivities(activities: TouristActivityItem[]): TouristActivityItem[] {
    const sorted = [...activities];
    switch (this.sortOption) {
      case 'popular':
        return sorted.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
      case 'difficulty':
        return sorted.sort((a, b) => (a.difficulty || '').localeCompare(b.difficulty || ''));
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
}
