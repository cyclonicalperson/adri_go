import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, LoadingSpinnerComponent],
})
export class AdminLayoutComponent {
  sidebarCollapsed = false;
  mobileMenuOpen = false;

  onToggleSidebar(): void {
    // On mobile: toggle overlay menu
    // On desktop: collapse to icon-only
    if (window.innerWidth < 768) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
