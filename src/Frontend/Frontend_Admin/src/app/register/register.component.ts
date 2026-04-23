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
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
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
  // Signals garantuju reaktivnost bez potrebe za ChangeDetectorRef ili ApplicationRef
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = false;
  successMsg: string | null = null;

  selectedFile: File | null = null;
  fileError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
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
      ? 'Lična karta ili pasoš (JPG, PNG ili PDF, max 5MB).'
      : 'Dokaz o registraciji firme ili organizacije (JPG, PNG ili PDF, max 5MB).';
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
      this.fileError = `Maksimalna veličina fajla je ${maxSizeMb} MB.`;
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

  get fileIconEmoji(): string {
    if (!this.selectedFile) return '📎';
    if (this.selectedFile.type === 'application/pdf') return '📄';
    return '🖼️';
  }

  get fileSizeLabel(): string {
    if (!this.selectedFile) return '';
    const kb = this.selectedFile.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedFile) {
      this.fileError = this.isIndividualSelected
        ? 'Dokument je obavezan. Priložite ličnu kartu ili pasoš.'
        : 'Dokument je obavezan. Priložite registraciju firme ili organizacije.';
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

    this.http.post(`${environment.apiUrl}/auth/register`, formData).pipe(
      timeout(20000),
      finalize(() => {
        this.loading.set(false);
      }),
    ).subscribe({
      next: () => {
        this.successMsg = `Zahtev za admin nalog je uspešno poslat za ${submittedEmail}. Superadmin će ga pregledati nakon provere dokumentacije.`;
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
            ? 'Slanje zahteva traje predugo. Proverite konekciju i pokušajte ponovo.'
            : (err?.error?.message ?? 'Došlo je do greške. Pokušajte ponovo.'),
        );
      },
    });
  }
}
