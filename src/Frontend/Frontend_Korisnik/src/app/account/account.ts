import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ThemeService } from '../services/theme.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { AuthRequiredModalComponent } from '../shared/auth-required-modal/auth-required-modal.component';

const FALLBACK_PROFILE_IMAGE = '/assets/default-profile.svg';
type HeroInterestBadge = { label: string; icon: string; kind: 'food' | 'nature' | 'generic' };

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, AuthRequiredModalComponent],
  templateUrl: './account.html',
  styleUrls: ['./account.css']
})
export class AccountComponent implements OnInit, OnDestroy {

  userData: UserProfile | null = null;
  loading: boolean = true;
  isDarkMode: boolean = false;
  isGuest: boolean = false;
  showLoginPopup: boolean = false;
  private themeSubscription?: Subscription;

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.isDarkMode = this.themeService.isDarkMode;
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.isDarkMode = theme === 'dark';
    });

    this.isGuest = !this.authService.isLoggedIn;

    if (this.isGuest) {
      this.loading = false;
      return;
    }

    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
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

  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  goBack(): void { window.history.back(); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToEditProfile(): void {
    if (this.isGuest) return;
    this.router.navigate(['/account/personal-info']);
  }

  goToPersonalInfo(): void {
    if (this.isGuest) {
      this.showLoginPopup = true;
      return;
    }
    this.router.navigate(['/account/personal-info']);
  }
  goToHelp(): void         { this.router.navigate(['/account/help']); }
  goToPrivacy(): void      { this.router.navigate(['/account/privacy']); }
  goToSettings(): void     { this.router.navigate(['/settings']); }
  goToSaved(): void        { if (this.isGuest) { this.showLoginPopup = true; return; } this.router.navigate(['/saved']); }
  goToMyReviews(): void    { if (this.isGuest) { this.showLoginPopup = true; return; } this.router.navigate(['/account/reviews']); }
  goToCalendar(): void     { if (this.isGuest) { this.showLoginPopup = true; return; } this.router.navigate(['/calendar']); }
  goToLogin(): void        { this.router.navigate(['/login']); }
  closeLoginPopup(): void  { this.showLoginPopup = false; }
  showGuestPopup(): void   { this.showLoginPopup = true; }
  goToReviews(): void      { this.router.navigate(['/location-list']); }
}
