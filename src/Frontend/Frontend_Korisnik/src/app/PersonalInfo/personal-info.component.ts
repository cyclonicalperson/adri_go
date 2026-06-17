import { Component, OnDestroy, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { MobileTouristNavComponent } from '../shared/mobile-tourist-nav.component';
import { DesktopFooterComponent } from '../shared/desktop-footer.component';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileTouristNavComponent, DesktopFooterComponent],
  templateUrl: './personal-info.component.html',
  styleUrls: ['./personal-info.component.css']
})
export class PersonalInfoComponent implements OnInit, OnDestroy {

  userData: UserProfile | null = null;
  loading    = true;
  isSaving   = false;
  isUploadingPhoto = false;
  editMode   = false;
  saveSuccess = false;
  saveError   = '';
  saveInfo    = '';
  showCameraModal = false;
  cameraError = '';
  private cameraStream: MediaStream | null = null;

  @ViewChild('cameraPreview') cameraPreview?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') cameraCanvas?: ElementRef<HTMLCanvasElement>;

  form = {
    fullName: '',
    emailOrPhone: '',
    bio: '',
    location: ''
  };

  allInterests = [
    { id: 'nature',      label: 'Nature',            icon: '🌲' },
    { id: 'food',        label: 'Food',              icon: '🍴' },
    { id: 'beaches',     label: 'Beaches',           icon: '🏖️' },
    { id: 'history',     label: 'History & Culture', icon: '🏛️' },
    { id: 'nightlife',   label: 'Night Life',        icon: '🎶' },
    { id: 'photography', label: 'Photography',       icon: '📷' },
  ];

  selectedInterests: string[] = [];

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.userService.getUserProfile().subscribe({
      next: (data) => {
        this.userData = data;
        this.populateForm(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Fall back to session data when the profile API is unreachable
        const tourist = this.authService.currentTourist;
        if (tourist) {
          this.userData = {
            fullName:     tourist.name,
            emailOrPhone: tourist.email,
            language:     'en',
            interests:    [],
            stats:        { saved: 0, reviews: 0, upcoming: 0 }
          };
          this.populateForm(this.userData);
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
  }

  private populateForm(data: UserProfile): void {
    this.form.fullName     = data.fullName     || '';
    this.form.emailOrPhone = data.emailOrPhone || '';
    this.form.bio          = data.bio          || '';
    this.form.location     = data.location     || '';
    this.selectedInterests = Array.isArray(data.interests) ? [...data.interests] : [];
  }

  isInterestSelected(id: string): boolean {
    return this.selectedInterests.includes(id);
  }

  toggleInterest(id: string): void {
    const idx = this.selectedInterests.indexOf(id);
    if (idx >= 0) this.selectedInterests.splice(idx, 1);
    else this.selectedInterests.push(id);
  }

  goBack(): void { window.history.back(); }

  toggleEdit(): void {
    if (this.editMode && this.userData) {
      // Cancel — restore form to last saved state
      this.populateForm(this.userData);
    }
    this.editMode   = !this.editMode;
    this.saveSuccess = false;
    this.saveError   = '';
    this.saveInfo    = '';
  }

  saveChanges(): void {
    if (this.isSaving) return;
    this.isSaving  = true;
    this.saveError = '';
    this.saveInfo = '';

    const payload = {
      name:      this.form.fullName.trim(),
      email:     this.form.emailOrPhone.trim(),
      bio:       this.form.bio.trim(),
      location:  this.form.location.trim(),
      interests: [...this.selectedInterests],
      profileImage: this.userData?.profilePic ?? null,
    };

    this.userService.updateProfile(payload).subscribe({
      next: (updated) => {
        // Sync local state with what the server confirmed
        if (this.userData) {
          this.userData.fullName   = updated.fullName || this.form.fullName;
          this.userData.emailOrPhone = updated.emailOrPhone || this.userData.emailOrPhone;
          this.userData.bio        = updated.bio;
          this.userData.location   = updated.location;
          this.userData.interests  = updated.interests ?? [...this.selectedInterests];
          this.userData.profilePic = updated.profilePic ?? null;
        }
        const emailChangedImmediately = updated.emailOrPhone &&
          updated.emailOrPhone.toLowerCase() === this.form.emailOrPhone.trim().toLowerCase();
        this.authService.updateCurrentTourist({
          name: updated.fullName || this.form.fullName,
          email: emailChangedImmediately ? updated.emailOrPhone : this.userData?.emailOrPhone,
          language: updated.language || this.userData?.language,
          profileImage: updated.profilePic ?? this.userData?.profilePic ?? null,
        });
        this.isSaving    = false;
        this.editMode    = false;
        this.saveSuccess = true;
        if (!emailChangedImmediately && this.form.emailOrPhone.trim()) {
          this.saveInfo = 'Proverite novi email i potvrdite link da bi promena bila prihvacena.';
        }
        setTimeout(() => (this.saveSuccess = false), 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving  = false;
        this.saveError = err?.error?.message || 'Could not save changes. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  getInitials(): string {
    if (!this.userData?.fullName) return '?';
    return this.userData.fullName.trim().charAt(0).toUpperCase();
  }

  get hasProfilePhoto(): boolean {
    return !!this.userData?.profilePic;
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.isUploadingPhoto) {
      input.value = '';
      return;
    }

    this.uploadProfilePhoto(file, () => { input.value = ''; });
  }

  private uploadProfilePhoto(file: File, onDone?: () => void): void {
    const previousProfilePic = this.userData?.profilePic;
    this.isUploadingPhoto = true;
    this.saveError = '';
    this.userService.uploadProfileImage(file).subscribe({
      next: (url) => {
        if (this.userData) {
          this.userData.profilePic = url;
        }
        this.userService.updateProfile({ profileImage: url }).subscribe({
          next: (updated) => {
            if (this.userData) {
              this.userData.profilePic = updated.profilePic ?? url;
            }
            this.authService.updateCurrentTourist({ profileImage: this.userData?.profilePic ?? url });
            this.isUploadingPhoto = false;
            this.saveSuccess = true;
            onDone?.();
            setTimeout(() => (this.saveSuccess = false), 2500);
            this.cdr.detectChanges();
          },
          error: (err) => {
            if (this.userData) {
              this.userData.profilePic = previousProfilePic;
            }
            this.isUploadingPhoto = false;
            onDone?.();
            this.saveError = err?.error?.message || 'Photo uploaded, but the profile could not be updated.';
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.isUploadingPhoto = false;
        onDone?.();
        this.saveError = 'Could not upload profile photo. Please try another image.';
        this.cdr.detectChanges();
      }
    });
  }

  async openCamera(): Promise<void> {
    if (this.isUploadingPhoto) return;
    this.cameraError = '';
    this.showCameraModal = true;
    this.cdr.detectChanges();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available.');
      }

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      await new Promise(resolve => requestAnimationFrame(resolve));
      const video = this.cameraPreview?.nativeElement;
      if (!video) throw new Error('Camera preview is not ready.');
      video.srcObject = this.cameraStream;
      await video.play();
    } catch {
      this.cameraError = 'Camera is not available or permission was denied.';
      this.stopCameraStream();
      this.cdr.detectChanges();
    }
  }

  closeCamera(): void {
    if (this.isUploadingPhoto) return;
    this.showCameraModal = false;
    this.cameraError = '';
    this.stopCameraStream();
  }

  captureCameraPhoto(): void {
    if (this.isUploadingPhoto) return;
    const video = this.cameraPreview?.nativeElement;
    const canvas = this.cameraCanvas?.nativeElement;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      this.cameraError = 'Camera preview is not ready yet.';
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraError = 'Could not capture photo.';
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        this.cameraError = 'Could not capture photo.';
        this.cdr.detectChanges();
        return;
      }

      const file = new File([blob], `profile-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.uploadProfilePhoto(file, () => {
        this.stopCameraStream();
        this.showCameraModal = false;
        this.cameraError = '';
      });
    }, 'image/jpeg', 0.9);
  }

  private stopCameraStream(): void {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = null;
    if (this.cameraPreview?.nativeElement) {
      this.cameraPreview.nativeElement.srcObject = null;
    }
  }

  removeProfilePhoto(): void {
    if (!this.userData?.profilePic || this.isUploadingPhoto) return;

    const previousProfilePic = this.userData.profilePic;
    this.isUploadingPhoto = true;
    this.saveError = '';
    this.saveInfo = '';

    this.userService.updateProfile({ removeProfileImage: true }).subscribe({
      next: (updated) => {
        if (this.userData) {
          this.userData.profilePic = updated.profilePic ?? null;
        }
        this.authService.updateCurrentTourist({ profileImage: null });
        this.isUploadingPhoto = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 2500);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (this.userData) {
          this.userData.profilePic = previousProfilePic;
        }
        this.isUploadingPhoto = false;
        this.saveError = err?.error?.message || 'Could not remove profile photo. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}
