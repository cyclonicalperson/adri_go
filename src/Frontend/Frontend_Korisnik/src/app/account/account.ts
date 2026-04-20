import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../services/user.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account.html',
  styleUrls: ['./account.css']
})
export class AccountComponent implements OnInit {

  userData: UserProfile | null = null;
  loading: boolean = true;

  constructor(
    private router: Router,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData() {
    this.loading = true;
    this.userService.getUserProfile().subscribe({
      next: (data) => {
        this.userData = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Greška:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getInitials(): string {
    if (!this.userData?.fullName) return '?';
    return this.userData.fullName.trim().charAt(0).toUpperCase();
  }

  goBack() { window.history.back(); }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  // Navigacija ka podstranicama
  goToPersonalInfo() { this.router.navigate(['/account/personal-info']); }
  goToHelp()         { this.router.navigate(['/account/help']); }
  goToPrivacy()      { this.router.navigate(['/account/privacy']); }
}