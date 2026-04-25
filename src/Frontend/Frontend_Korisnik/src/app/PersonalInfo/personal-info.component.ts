import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './personal-info.component.html',
  styleUrls: ['./personal-info.component.css']
})
export class PersonalInfoComponent implements OnInit {

  userData: UserProfile | null = null;
  loading = true;
  editMode = false;
  saveSuccess = false;

  form = {
    fullName: '',
    emailOrPhone: '',
    bio: '',
    location: ''
  };

  // Available interests (same set as registration)
  allInterests = [
    { id: 'nature',      label: 'Nature',              icon: '🌲' },
    { id: 'food',        label: 'Food',                icon: '🍴' },
    { id: 'beaches',     label: 'Beaches',             icon: '🏖️' },
    { id: 'history',     label: 'History & Culture',   icon: '🏛️' },
    { id: 'nightlife',   label: 'Night Life',          icon: '🎶' },
    { id: 'photography', label: 'Photography',         icon: '📷' },
  ];

  selectedInterests: string[] = [];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userService.getUserProfile().subscribe({
      next: (data) => {
        this.userData = data;
        this.populateForm(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Fall back to session data so the page is never blank
        const tourist = this.authService.currentTourist;
        if (tourist) {
          this.userData = {
            fullName:     tourist.name,
            emailOrPhone: tourist.email,
            language:     'en',
            interests:    [],
            stats:        { saved: 0, tickets: 0, upcoming: 0 }
          };
          this.populateForm(this.userData);
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private populateForm(data: UserProfile): void {
    this.form.fullName       = data.fullName || '';
    this.form.emailOrPhone   = data.emailOrPhone || '';
    this.form.bio            = (data as any).bio || '';
    this.form.location       = (data as any).location || '';
    this.selectedInterests   = Array.isArray(data.interests) ? [...data.interests] : [];
  }

  isInterestSelected(id: string): boolean {
    return this.selectedInterests.includes(id);
  }

  toggleInterest(id: string): void {
    const idx = this.selectedInterests.indexOf(id);
    if (idx >= 0) this.selectedInterests.splice(idx, 1);
    else this.selectedInterests.push(id);
  }

  goBack() { window.history.back(); }

  toggleEdit() {
    this.editMode = !this.editMode;
    this.saveSuccess = false;
  }

  saveChanges() {
    // Update local display immediately; real API save can be wired later
    if (this.userData) {
      this.userData.fullName     = this.form.fullName;
      this.userData.emailOrPhone = this.form.emailOrPhone;
      this.userData.interests    = [...this.selectedInterests];
    }
    this.editMode    = false;
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
    this.cdr.detectChanges();
  }

  getInitials(): string {
    if (!this.userData?.fullName) return '?';
    return this.userData.fullName.trim().charAt(0).toUpperCase();
  }
}
