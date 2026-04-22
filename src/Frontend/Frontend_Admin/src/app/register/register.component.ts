import { Component } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors, ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('password')?.value;
  const cpw = g.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  imports: [ReactiveFormsModule, RouterLink],
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  showPassword = false;
  error: string | null = null;
  successMsg: string | null = null;

  /** Dokument priložen od strane podnosioca zahtjeva */
  selectedFile: File | null = null;
  fileError: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group(
      {
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        orgName: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatch },
    );
  }

  get firstName() { return this.form.get('firstName')!; }
  get lastName() { return this.form.get('lastName')!; }
  get email() { return this.form.get('email')!; }
  get orgName() { return this.form.get('orgName')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

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
      this.fileError = 'Dozvoljeni formati: JPG, PNG, PDF.';
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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    if (!this.selectedFile) {
      this.fileError = 'Dokument je obavezan. Priložite ličnu kartu, pasoš ili registraciju.';
      return;
    }

    this.loading = true;
    this.error = null;

    const formData = new FormData();
    formData.append('fullName', `${this.firstName.value} ${this.lastName.value}`);
    formData.append('email', this.email.value);
    formData.append('password', this.password.value);
    formData.append('orgName', this.orgName.value);
    formData.append('role', 'admin');
    formData.append('document', this.selectedFile, this.selectedFile.name);

    this.http.post(`${environment.apiUrl}/auth/register`, formData).subscribe({
      next: () => {
        this.loading = false;
        this.successMsg = `Zahtev za admin nalog je poslat za ${this.email.value}. Superadmin će ga pregledati nakon provere dokumentacije.`;
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message ?? 'Došlo je do greške. Pokušajte ponovo.';
      },
    });
  }
}
