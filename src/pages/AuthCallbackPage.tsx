import { useEffect } from 'react';
import { useAuthStore } from '../store';

/**
 * This page is the OAuth landing target.
 * Backend redirects here after Google login:
 *   /auth/callback?token=<JWT>
 *
 * We parse the token, decode the payload, build a User object,
 * call login() to persist it in Zustand, then navigate to dashboard
 * by stripping the /auth/callback path.
 */
export const AuthCallbackPage = () => {
  const { login } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      // No token — go back to login
      window.location.replace('/');
      return;
    }

    try {
      // Decode JWT payload (base64) — no library needed, no verification
      // Verification is already done server-side; we just read the claims
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));

      // Build a User object matching the frontend User type
      const user = {
        id: payload.userId,
        name: payload.email.split('@')[0], // fallback name from email prefix
        email: payload.email,
        avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(payload.email)}`,
        provider: 'google' as const,
      };

      // Persist token for future API calls
      localStorage.setItem('token', token);

      // Log user into Zustand (triggers dashboard render)
      login(user);

      // Clean the URL — remove ?token= from address bar
      window.history.replaceState({}, '', '/');
    } catch {
      // Malformed token
      window.location.replace('/');
    }
  }, [login]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
      Signing you in…
    </div>
  );
};
