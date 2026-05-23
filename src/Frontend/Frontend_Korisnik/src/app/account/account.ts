import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';

const FALLBACK_PROFILE_IMAGE = '/assets/default-profile.svg';
type HeroInterestBadge = { label: string; icon: string; kind: 'food' | 'nature' | 'generic' };

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrls: ['./account.css']
})
export class AccountComponent implements OnInit {
  userData: UserProfile | null = null;
  loading = true;
  isDarkMode = false;

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserData();
  }

  loadUserData(): void {
    this.loading = true;

    forkJoin({
      profile: this.userService.getUserProfile().pipe(catchError(() => of(null))),
      calendar: this.userService.getCalendar().pipe(catchError(() => of([]))),
    })
      .subscribe(({ profile, calendar }) => {
        if (profile) {
          this.userData = {
            ...profile,
            stats: {
              saved: profile.stats?.saved ?? 0,
              reviews: profile.stats?.reviews ?? 0,
              upcoming: (calendar as any[]).length,
            }
          };
        } else {
          const tourist = this.authService.currentTourist;
          if (tourist) {
            this.userData = {
              fullName: tourist.name,
              emailOrPhone: tourist.email,
              language: 'en',
              interests: [],
              stats: { saved: 0, reviews: 0, upcoming: (calendar as any[]).length }
            };
          }
        }

        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  get profileImageUrl(): string {
    return resolveBackendAssetUrl(this.userData?.profilePic, FALLBACK_PROFILE_IMAGE);
  }

  get heroInterestLabels(): string[] {
    const interests = Array.isArray(this.userData?.interests) ? this.userData!.interests.filter(Boolean) : [];
    return interests.slice(0, 2);
  }

  get heroInterestBadges(): HeroInterestBadge[] {
    return this.heroInterestLabels.map((interest) => {
      const normalized = interest.trim().toLowerCase();
      if (normalized.includes('food') || normalized.includes('restaurant') || normalized.includes('dining')) {
        return { label: 'Food', icon: '🍽️', kind: 'food' as const };
      }
      if (normalized.includes('nature') || normalized.includes('outdoor') || normalized.includes('explore')) {
        return { label: interest, icon: '🍃', kind: 'nature' as const };
      }
      return { label: interest, icon: '✦', kind: 'generic' as const };
    });
  }

  private applyTheme(): void {
    const html = document.documentElement;
    if (this.isDarkMode) {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  goBack(): void { window.history.back(); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToPersonalInfo(): void { this.router.navigate(['/account/personal-info']); }
  goToHelp(): void { this.router.navigate(['/account/help']); }
  goToPrivacy(): void { this.router.navigate(['/account/privacy']); }
  goToSettings(): void { this.router.navigate(['/settings']); }
  goToSaved(): void { this.router.navigate(['/saved']); }
  goToMyReviews(): void { this.router.navigate(['/account/reviews']); }
  goToCalendar(): void { this.router.navigate(['/calendar']); }
}
