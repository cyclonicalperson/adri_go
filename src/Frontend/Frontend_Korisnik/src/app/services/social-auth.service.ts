import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class SocialAuthService {
  private readonly googleClientId = environment.googleClientId ?? '';
  private googleInitialized = false;

  // ─── Google ────────────────────────────────────────────────────────────────

  /**
   * Loads the Google GSI script and initialises the SDK.
   * `callback` receives the raw credential JWT when the user completes sign-in.
   * Optional `onReady` fires once the SDK is initialised (safe to call prompt()).
   * Call once from ngAfterViewInit.
   */
  initGoogleSignIn(callback: (credential: string) => void, onReady?: () => void): void {
    if (!this.googleClientId) {
      console.warn('[SocialAuth] googleClientId not set in environment.ts');
      return;
    }

    this.loadScript('https://accounts.google.com/gsi/client', () => {
      if (this.googleInitialized) {
        onReady?.();
        return;
      }
      this.googleInitialized = true;

      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: { credential: string }) => callback(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      onReady?.();
    });
  }

  /** Trigger the Google One-Tap / account-picker overlay. */
  promptGoogle(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.prompt();
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private loadScript(src: string, onLoad: () => void): void {
    if (document.querySelector(`script[src="${src}"]`)) {
      onLoad();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = onLoad;
    document.head.appendChild(script);
  }
}
