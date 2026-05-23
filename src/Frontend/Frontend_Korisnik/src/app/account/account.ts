import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ThemeService } from '../services/theme.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
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
      this.userData = {
        fullName: 'Guest',
        emailOrPhone: 'Not signed in',
        language: 'en',
        interests: [],
        stats: { saved: 0, reviews: 0, upcoming: 0 }
      };
      this.loading = false;
      return;
    }
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  loadUserData() {
    this.loading = true;
    forkJoin({
      profile:  this.userService.getUserProfile().pipe(catchError(() => of(null))),
      calendar: this.userService.getCalendar().pipe(catchError(() => of([])))
    }).subscribe(({ profile, calendar }) => {
      if (profile) {
        // Inject real calendar count into stats
        this.userData = {
          ...profile,
          stats: {
            saved:    profile.stats?.saved    ?? 0,
            reviews:  profile.stats?.reviews  ?? 0,
            upcoming: (calendar as any[]).length
          }
        };
      } else {
        // Fall back to session token data
        const tourist = this.authService.currentTourist;
        if (tourist) {
          this.userData = {
            fullName:     tourist.name,
            emailOrPhone: tourist.email,
            language:     'en',
            interests:    [],
            stats:        { saved: 0, reviews: 0, upcoming: (calendar as any[]).length }
          };
        }
      }
      this.loading = false;
      this.cdr.detectChanges();
    });
  }
  toggleDarkMode(): void {
    this.themeService.toggleTheme();
  }

  getInitials(): string {
    if (!this.userData?.fullName) return '?';
    return this.userData.fullName.trim().charAt(0).toUpperCase();
  }

  goBack() { window.history.back(); }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToEditProfile() {
    if (this.isGuest) return;
    this.router.navigate(['/account/personal-info']);
  }

  // Navigacija ka podstranicama
  goToPersonalInfo() {
    if (this.isGuest) {
      this.showLoginPopup = true;
      return;
    }
    this.router.navigate(['/account/personal-info']);
  }
  goToHelp()         { this.router.navigate(['/account/help']); }
  goToPrivacy()      { this.router.navigate(['/account/privacy']); }
  goToSettings()     { this.router.navigate(['/settings']); }
  goToSaved()        { this.router.navigate(['/saved']); }
  goToMyReviews()    { this.router.navigate(['/account/reviews']); }
  goToCalendar()     { this.router.navigate(['/calendar']); }
  goToLogin()        { this.router.navigate(['/login']); }
  closeLoginPopup()  { this.showLoginPopup = false; }
  goToReviews()      { this.router.navigate(['/location-list']); }
}
