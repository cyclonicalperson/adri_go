import { Component, OnInit, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { environment } from '@env/environment';

@Component({
  selector: 'app-register-verify-email',
  templateUrl: './register-verify-email.component.html',
  styleUrl: './register-verify-email.component.scss',
  imports: [RouterLink],
})
export class RegisterVerifyEmailComponent implements OnInit {
  loading = signal(true);
  success = signal(false);
  expired = signal(false);
  message = signal('Proveravamo verifikacioni link...');

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      const token = params.get('token')?.trim();

      if (!token) {
        this.loading.set(false);
        this.success.set(false);
        this.message.set('Verifikacioni token nije prosledjen. Otvorite link direktno iz mejla.');
        return;
      }

      this.http.get<{ message?: string }>(`${environment.apiUrl}/auth/verify-registration-email`, {
        params: new HttpParams().set('token', token),
      }).subscribe({
        next: response => {
          this.loading.set(false);
          this.success.set(true);
          this.message.set(response.message ?? 'Email adresa je uspesno potvrdjena.');
        },
        error: error => {
          this.loading.set(false);
          this.success.set(false);
          this.expired.set(!!error?.error?.expired);
          this.message.set(
            error?.error?.message
            ?? 'Doslo je do greske prilikom verifikacije email adrese.',
          );
        },
      });
    });
  }
}
