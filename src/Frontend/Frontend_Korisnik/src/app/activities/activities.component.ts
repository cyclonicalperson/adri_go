import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationBadgeComponent } from '../notifications/notification-badge.component';
import { TouristActivitiesService, TouristActivityItem } from '../services/tourist-activities.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

type ActivitySort = 'name-asc' | 'popular' | 'difficulty';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBadgeComponent, AppHeaderComponent],
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
      error: (err) => {
        if (err.status === 403 || err.status === 401) {
          this.errorMessage = 'Activities require a registered account. Please log in to access this section.';
        } else if (err.status === 404) {
          this.errorMessage = 'Activities feature is not available on this server.';
        } else {
          this.errorMessage = 'Could not load activities. Please try again later.';
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openActivity(activity: TouristActivityItem): void {
    this.router.navigate(['/location-list'], {
      queryParams: {
        activityTagId: activity.id,
        activityTag: activity.name,
      },
    });
  }

  hasUsableCoordinates(activity: TouristActivityItem): activity is TouristActivityItem & { lat: number; lng: number } {
    return Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
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

  getActivityIcon(activity: TouristActivityItem): string {
    const text = `${activity.name} ${activity.category} ${activity.tags || ''}`.toLowerCase();
    if (/(bike|cycle|bicikl|cycling)/.test(text)) return 'bike';
    if (/(water|swim|beach|kayak|rafting|more|plaza|plaža)/.test(text)) return 'water';
    if (/(food|dining|wine|restaurant|hrana|vino)/.test(text)) return 'food';
    if (/(culture|museum|history|kultura|istorija|muzej)/.test(text)) return 'culture';
    if (/(wellness|spa|relax|yoga)/.test(text)) return 'wellness';
    if (/(night|club|bar|party|noc|noć)/.test(text)) return 'nightlife';
    if (/(shop|market|shopping|kupovina)/.test(text)) return 'shopping';
    if (/(walk|hike|trail|mountain|planina|setnja|šetnja)/.test(text)) return 'hiking';
    return 'activity';
  }

  getTagList(tags?: string | null): string[] {
    if (!tags) return [];
    return tags
      .split(/[;,]/)
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 4);
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
