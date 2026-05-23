import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationBadgeComponent } from '../../notifications/notification-badge.component';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NotificationBadgeComponent],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css']
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  /** Page title shown in the center */
  @Input() title: string = '';

  /** Show/hide the back button (default: true) */
  @Input() showBack: boolean = true;

  /** Show/hide the notifications bell (default: true) */
  @Input() showNotifications: boolean = true;

  /** Custom back click handler — if not provided, history.back() is used */
  @Output() backClick = new EventEmitter<void>();

  isDarkMode = false;
  private themeSub?: Subscription;

  constructor(
    public router: Router,
    public authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.isDarkMode = this.themeService.isDarkMode;
    this.themeSub = this.themeService.theme$.subscribe(t => {
      this.isDarkMode = t === 'dark';
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  onBack(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
    } else {
      window.history.back();
    }
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }
}
