import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

type TouristNavTab = 'map' | 'explore' | 'saved' | 'calendar' | 'activities' | 'routes' | 'account';

@Component({
  selector: 'app-mobile-tourist-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-tourist-nav.component.html',
  styleUrls: ['./mobile-tourist-nav.component.css'],
})
export class MobileTouristNavComponent {
  @Input() active: TouristNavTab = 'map';

  constructor(private router: Router) {}

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }

  goToExplore(): void {
    this.router.navigate(['/location-list']);
  }

  goToSaved(): void {
    this.router.navigate(['/saved']);
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  goToActivities(): void {
    this.router.navigate(['/activities']);
  }

  goToRoutes(): void {
    this.router.navigate(['/routes']);
  }

  goToAccount(): void {
    this.router.navigate(['/account']);
  }
}
