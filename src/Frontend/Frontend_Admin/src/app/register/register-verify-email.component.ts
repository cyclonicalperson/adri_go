import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { PublicAuthService } from '@core/auth/public-auth.service';
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
  alreadyVerified = signal(false);
  message = signal('Proveravamo verifikacioni link...');
  readonly touristAppUrl = environment.touristAppUrl;

  constructor(
    private route: ActivatedRoute,
    private publicAuth: PublicAuthService,
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

      this.publicAuth.verifyAdminRegistrationEmail(token).subscribe({
        next: response => {
          this.loading.set(false);
          this.success.set(true);
          this.alreadyVerified.set(!!response.alreadyVerified);
          this.message.set(
            response.message
            ?? (response.alreadyVerified
              ? 'Email adresa je vec potvrdjena. Zahtev je spreman za pregled superadmina.'
              : 'Email adresa je uspesno potvrdjena. Superadmin sada moze da pregleda zahtev.'),
          );
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

  goToTouristApp(): void {
    window.location.assign(this.touristAppUrl);
  }
}
