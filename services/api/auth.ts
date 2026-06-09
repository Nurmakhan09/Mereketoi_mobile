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
