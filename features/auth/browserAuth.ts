/**
 * Browser deep-link authentication (the app's sign-in surface).
 *
 * The app has NO native login form. It opens the website's auth page in a
 * browser/Custom Tab; the backend authenticates (email/phone OR Google), issues a
 * Bearer token, and redirects to our app via a deep link. We pass our own
 * redirect_uri so this works in Expo Go (exp://…) AND in native builds
 * (mereketoi://auth) — the backend whitelists the prefix (AuthController, 2026-06-07).
 *
 * Flow (master-spec §5.1):
 *   open  {WEB}/auth/login?app=1&state=<nonce>&redirect_uri=<uri>
 *   back  <uri>?token=<bearer>&state=<nonce>
 */

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { WEB_URL } from '@/constants/config';

export type AuthEntry = 'login' | 'register' | 'google';

export interface BrowserAuthResult {
  status: 'success' | 'cancel' | 'error';
  token?: string;
  message?: string;
}

WebBrowser.maybeCompleteAuthSession();

function entryPath(entry: AuthEntry): string {
  switch (entry) {
    case 'register':
      return '/auth/register';
    case 'google':
      return '/auth/oauth/google';
    default:
      return '/auth/login';
  }
}

/**
 * Run the browser auth flow. Returns the raw Bearer token on success.
 * Caller is responsible for fetching the user (GET /me) and persisting the session.
 */
export async function runBrowserAuth(entry: AuthEntry): Promise<BrowserAuthResult> {
  // Expo Go → exp://…/--/(redirect); native build → mereketoi://auth.
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mereketoi', path: 'auth' });
  const state = Crypto.randomUUID();

  const params = new URLSearchParams({
    app: '1',
    state,
    redirect_uri: redirectUri,
  });
  const authUrl = `${WEB_URL}${entryPath(entry)}?${params.toString()}`;

  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
      preferEphemeralSession: true, // don't reuse an existing web login
    });
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'auth error' };
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancel' };
  }
  if (result.type !== 'success' || !result.url) {
    return { status: 'error' };
  }

  // Parse token + state out of the returned deep link (expo-linking handles
  // both query strings and the exp://…/--/auth?… proxy form).
  const parsed = Linking.parse(result.url);
  const qp = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;
  const token = first(qp.token);
  const returnedState = first(qp.state);

  if (!token) {
    return { status: 'error', message: 'no token' };
  }
  if (returnedState && returnedState !== state) {
    // state mismatch → possible CSRF; reject.
    return { status: 'error', message: 'state mismatch' };
  }

  return { status: 'success', token };
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
