import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfile } from '../services/user.service';

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

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userService.getUserProfile().subscribe({
      next: (data) => {
        this.userData = data;
        this.form.fullName     = data.fullName || '';
        this.form.emailOrPhone = data.emailOrPhone || '';
        this.form.bio          = (data as any).bio || '';
        this.form.location     = (data as any).location || '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack() { window.history.back(); }

  toggleEdit() {
    this.editMode = !this.editMode;
    this.saveSuccess = false;
  }

  saveChanges() {
    console.log('Sačuvano:', this.form);
    this.editMode = false;
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }

  getInitials(): string {
    if (!this.userData?.fullName) return '?';
    return this.userData.fullName.trim().charAt(0).toUpperCase();
  }
}