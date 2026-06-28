import { apiGet, apiPost } from './client';
import { Endpoints } from './endpoints';
import { User, AuthResult } from '@/types';

/** POST /auth/login — email OR phone + password. Returns {token, user}. */
export function login(input: { login: string; password: string }) {
  return apiPost<AuthResult>(Endpoints.authLogin, input);
}

/** POST /auth/register — login + password (+ optional name). Returns {token, user}. */
export function register(input: { login: string; password: string; name?: string }) {
  return apiPost<AuthResult>(Endpoints.authRegister, input);
}

/** GET /me — refresh the current user (validates the token). */
export function fetchMe() {
  return apiGet<{ user: User }>(Endpoints.me).then((d) => d.user);
}

// ── Forgot password (public, 3-step OTP; anti-enumeration) ────────────────────

/** Step 1: POST /auth/forgot-password — {login} (email OR phone). Sends a reset code;
 *  returns the channel it went to. Never reveals whether the account exists. */
export function forgotPassword(login: string) {
  return apiPost<{ channel: 'email' | 'sms' }>(Endpoints.authForgot, { login });
}

/** Step 2: POST /auth/forgot-password/verify — {login, code}. Validates the code only. */
export function verifyReset(login: string, code: string) {
  return apiPost<unknown>(Endpoints.authForgotVerify, { login, code });
}

/** Step 3: POST /auth/forgot-password/reset — {login, code, password}. Sets the new password. */
export function resetPassword(login: string, code: string, password: string) {
  return apiPost<unknown>(Endpoints.authForgotReset, { login, code, password });
}

/** POST /auth/logout — revoke the current Bearer token. */
export function logout() {
  return apiPost<{ loggedOut: boolean }>(Endpoints.authLogout);
}

/** POST /me/profile — update the display name. Returns the updated user. */
export function updateProfile(name: string) {
  return apiPost<{ user: User }>(Endpoints.meProfile, { name }).then((d) => d.user);
}

/** POST /me/password — change password. Field errors come back in errors{}. */
export function changePassword(input: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) {
  return apiPost<{ changed: boolean }>(Endpoints.mePassword, input);
}

/**
 * POST /me/delete — permanently delete the current account + all related data.
 * Required by the App Store (5.1.1 v) & Google Play account-deletion policies.
 * The Bearer token is invalidated server-side; the caller clears the session.
 */
export function deleteAccount() {
  return apiPost<{ deleted: boolean }>(Endpoints.meDelete);
}
