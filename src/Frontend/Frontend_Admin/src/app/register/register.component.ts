import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { PublicAuthService } from '@core/auth/public-auth.service';
import { environment } from '@env/environment';

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { mismatch: true } : null;
}

type AccountType = 'organization' | 'individual';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  imports: [ReactiveFormsModule, RouterLink],
})
export class RegisterComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = false;
  successMsg: string | null = null;
  selectedFile: File | null = null;
  fileError: string | null = null;
  submittedEmail = '';
  readonly touristAppUrl = environment.touristAppUrl;

  constructor(
    private fb: FormBuilder,
    private publicAuth: PublicAuthService,
  ) {
    this.form = this.fb.group(
      {
        accountType: ['organization', Validators.required],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        orgName: [''],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatch },
    );

    this.updateOrganizationValidators(this.accountType.value as AccountType);
    this.accountType.valueChanges.subscribe(value => {
      this.updateOrganizationValidators(value as AccountType);
      this.fileError = null;
    });
  }

  get accountType() { return this.form.get('accountType')!; }
  get firstName() { return this.form.get('firstName')!; }
  get lastName() { return this.form.get('lastName')!; }
  get email() { return this.form.get('email')!; }
  get orgName() { return this.form.get('orgName')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  get isIndividualSelected(): boolean {
    return this.accountType.value === 'individual';
  }

  get verificationDocumentHint(): string {
    return this.isIndividualSelected
      ? 'Licna karta ili pasos (JPG, PNG ili PDF, max 5MB).'
      : 'Dokaz o registraciji firme ili organizacije (JPG, PNG ili PDF, max 5MB).';
  }

  get fileIconEmoji(): string {
    if (!this.selectedFile) return '\u{1F4CE}';
    if (this.selectedFile.type === 'application/pdf') return '\u{1F4C4}';
    return '\u{1F5BC}\u{FE0F}';
  }

  get fileSizeLabel(): string {
    if (!this.selectedFile) return '';
    const kb = this.selectedFile.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }

  goToTouristApp(): void {
    window.location.assign(this.touristAppUrl);
  }

  private updateOrganizationValidators(type: AccountType): void {
    if (type === 'organization') {
      this.orgName.setValidators([Validators.required]);
    } else {
      this.orgName.clearValidators();
      this.orgName.setValue('', { emitEvent: false });
    }

    this.orgName.updateValueAndValidity({ emitEvent: false });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError = null;

    if (!input.files?.length) {
      this.selectedFile = null;
      return;
    }

    const file = input.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSizeMb = 5;

    if (!allowedTypes.includes(file.type)) {
      this.fileError = 'Dozvoljeni formati: JPG, PNG i PDF.';
      this.selectedFile = null;
      input.value = '';
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      this.fileError = `Maksimalna velicina fajla je ${maxSizeMb} MB.`;
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileError = null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedFile) {
      this.fileError = this.isIndividualSelected
        ? 'Dokument je obavezan. Prilozite licnu kartu ili pasos.'
        : 'Dokument je obavezan. Prilozite registraciju firme ili organizacije.';
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.successMsg = null;

    const submittedEmail = this.email.value;
    const formData = new FormData();
    formData.append('fullName', `${this.firstName.value} ${this.lastName.value}`.trim());
    formData.append('email', submittedEmail);
    formData.append('password', this.password.value);

    if (!this.isIndividualSelected) {
      formData.append('orgName', this.orgName.value);
    }

    formData.append('document', this.selectedFile, this.selectedFile.name);

    this.publicAuth.submitAdminRegistration(formData).pipe(
      timeout(20000),
      finalize(() => {
        this.loading.set(false);
      }),
    ).subscribe({
      next: response => {
        this.submittedEmail = response.email || submittedEmail;
        this.successMsg = response.message
          || `Zahtev za admin nalog je uspesno poslat za ${this.submittedEmail}. Proverite inbox i potvrdite email adresu.`;

        this.form.reset({
          accountType: 'organization',
          firstName: '',
          lastName: '',
          email: '',
          orgName: '',
          password: '',
          confirmPassword: '',
        });
        this.updateOrganizationValidators('organization');
        this.selectedFile = null;
        this.fileError = null;
      },
      error: err => {
        this.error.set(
          err?.name === 'TimeoutError'
            ? 'Slanje zahteva traje predugo. Proverite konekciju i pokusajte ponovo.'
            : (err?.error?.message ?? 'Doslo je do greske. Pokusajte ponovo.'),
        );
      },
    });
  }
}
