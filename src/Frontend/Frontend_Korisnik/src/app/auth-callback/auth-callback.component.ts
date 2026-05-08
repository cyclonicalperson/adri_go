import { Component, OnInit } from '@angular/core';

/**
 * Minimal OAuth 2.0 redirect-URI handler.
 *
 * Google redirects here after sign-in with the ID token in the URL fragment.
 * We send it back to the opener via postMessage then close the popup.
 * This page is never visible to the user — it exists only to bridge the
 * OAuth redirect back to the parent window.
 */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<p style="font-family:sans-serif;color:#64748b;text-align:center;margin-top:80px">
    Signing in…
  </p>`,
})
export class AuthCallbackComponent implements OnInit {
  ngOnInit(): void {
    // Fragment contains id_token=...&token_type=...&expires_in=... (implicit flow)
    // or error=access_denied&error_description=... on failure.
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const idToken = fragment.get('id_token');
    const error   = fragment.get('error') ?? null;

    if (window.opener && typeof window.opener.postMessage === 'function') {
      window.opener.postMessage(
        { type: 'google-auth-callback', idToken, error },
        window.location.origin,
      );
    }

    // Give the parent 200 ms to receive the message before closing.
    setTimeout(() => window.close(), 200);
  }
}
