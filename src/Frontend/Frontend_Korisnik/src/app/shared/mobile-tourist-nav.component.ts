import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthRequiredModalComponent } from './auth-required-modal/auth-required-modal.component';

type TouristNavTab = 'map' | 'explore' | 'saved' | 'calendar' | 'account';

@Component({
  selector: 'app-mobile-tourist-nav',
  standalone: true,
  imports: [CommonModule, AuthRequiredModalComponent],
  templateUrl: './mobile-tourist-nav.component.html',
  styleUrls: ['./mobile-tourist-nav.component.css'],
})
export class MobileTouristNavComponent {
  @Input() active: TouristNavTab = 'map';
  showAuthPopup = false;
  authPopupMessage = 'Create a free account or log in to save places, write reviews, plan trips and more.';

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }

  goToExplore(): void {
    this.router.navigate(['/location-list']);
  }

  goToSaved(): void {
    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Create a free account or log in to save and manage your favorite places.');
      return;
    }
    this.router.navigate(['/saved']);
  }

  goToCalendar(): void {
    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Create a free account or log in to plan trips and manage your calendar.');
      return;
    }
    this.router.navigate(['/calendar']);
  }

  goToAccount(): void {
    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Create a free account or log in to manage your profile and travel preferences.');
      return;
    }
    this.router.navigate(['/account']);
  }

  private openAuthPopup(message: string): void {
    this.authPopupMessage = message;
    this.showAuthPopup = true;
  }

  closeAuthPopup(): void {
    this.showAuthPopup = false;
  }

  goToLogin(): void {
    this.showAuthPopup = false;
    this.router.navigate(['/login']);
  }
}
