import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocialAuthService {
  private readonly googleClientId = environment.googleClientId ?? '';

  // ─── Google OAuth 2.0 popup flow ──────────────────────────────────────────
  //
  // Uses the standard Google authorization endpoint directly — no GSI SDK,
  // no gsi/status pre-flight check.  The popup redirects back to
  // /auth/callback, which reads the id_token from the URL fragment and sends
  // it to this window via postMessage, then closes itself.
  //
  // Required Cloud Console setting:
  //   Authorized redirect URIs → http://localhost:4201/auth/callback

  /**
   * Opens a Google sign-in popup.
   * `onCredential` receives the raw ID-token JWT (same format the backend
   * already accepts from the old One-Tap flow).
   * `onError` receives a human-readable message on any failure.
   */
  triggerGooglePopup(
    onCredential: (idToken: string) => void,
    onError: (message: string) => void,
  ): void {
    if (!this.googleClientId) {
      onError('Google sign-in is not configured.');
      return;
    }

    const nonce       = this.generateNonce();
    const redirectUri = `${window.location.origin}/auth/callback`;

    const params = new URLSearchParams({
      response_type: 'id_token',
      client_id:     this.googleClientId,
      redirect_uri:  redirectUri,
      scope:         'openid email profile',
      nonce,
      prompt:        'select_account',
    });

    const left   = Math.round((screen.width  - 500) / 2);
    const top    = Math.round((screen.height - 640) / 2);
    const popup  = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-auth',
      `width=500,height=640,left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup || popup.closed) {
      onError('Popup was blocked. Please allow popups for this site and try again.');
      return;
    }

    this.awaitPopupResult(popup, onCredential, onError);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private awaitPopupResult(
    popup: Window,
    onCredential: (idToken: string) => void,
    onError: (message: string) => void,
  ): void {
    let settled     = false;
    let everBlurred = false;  // true once focus has moved to the popup

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', messageHandler);
      window.removeEventListener('blur',    blurHandler);
      window.removeEventListener('focus',   focusHandler);
      clearTimeout(timeoutId);
      fn();
    };

    // 1. Primary — postMessage from AuthCallbackComponent (same-origin, COOP-safe)
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'google-auth-callback') return;

      settle(() => {
        if (event.data.idToken) {
          onCredential(event.data.idToken);
        } else {
          const err: string = event.data.error ?? '';
          onError(err === 'access_denied'
            ? 'Google sign-in was cancelled.'
            : `Google sign-in failed (${err || 'unknown'}). Please try again.`);
        }
      });
    };
    window.addEventListener('message', messageHandler);

    // 2. Cancellation detection — opener window regains focus when popup closes.
    //    We wait 800 ms to let any in-flight postMessage arrive first (handles
    //    the race where sign-in succeeds and the popup closes in the same tick).
    //    COOP note: we deliberately avoid reading popup.closed here because
    //    Google's pages set Cross-Origin-Opener-Policy, which would log warnings
    //    for any cross-origin property access on the popup handle.
    const blurHandler  = () => { everBlurred = true; };
    const focusHandler = () => {
      if (!everBlurred) return;
      setTimeout(() => settle(() => onError('Google sign-in was cancelled.')), 800);
    };
    window.addEventListener('blur',  blurHandler);
    window.addEventListener('focus', focusHandler);

    // 3. Hard timeout — 10 minutes
    const timeoutId = setTimeout(() => {
      try { popup.close(); } catch { /* COOP may block this */ }
      settle(() => onError('Google sign-in timed out. Please try again.'));
    }, 10 * 60 * 1000);
  }

  private generateNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
}
