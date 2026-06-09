import { apiGet, apiPost } from './client';
import { Endpoints } from './endpoints';
import {
  BookingRequestInput,
  ChangeInput,
  CreateInviteInput,
  InvitePreview,
  InviteAcceptResult,
  ProviderDay,
} from '@/types';

// ── Client: request a booking (тойға қосу) ───────────────────────────────────

export function requestBooking(input: BookingRequestInput) {
  return apiPost<{ booking_id: number | null }>(Endpoints.bookings, input);
}

export function cancelBooking(id: number) {
  return apiPost<unknown>(Endpoints.bookingCancel(id));
}

// ── Provider: accept / decline ───────────────────────────────────────────────

export function acceptBooking(id: number) {
  return apiPost<unknown>(Endpoints.bookingAccept(id));
}

export function declineBooking(id: number) {
  return apiPost<unknown>(Endpoints.bookingDecline(id));
}

// ── Either party: change-with-reconfirm (role inferred server-side) ──────────

export function requestChange(id: number, fields: ChangeInput) {
  return apiPost<unknown>(Endpoints.bookingChange(id), fields);
}

export function confirmChange(id: number) {
  return apiPost<unknown>(Endpoints.bookingConfirmChange(id));
}

export function rejectChange(id: number) {
  return apiPost<unknown>(Endpoints.bookingRejectChange(id));
}

// ── Provider invites (one-time link) ─────────────────────────────────────────

export function createInvite(input: CreateInviteInput) {
  return apiPost<{ invite_url: string | null; booking_id: number | null }>(Endpoints.invites, input);
}

export function cancelInvite(id: number) {
  return apiPost<unknown>(Endpoints.inviteCancel(id));
}

// ── Provider day view (bookings + invites for one date) ──────────────────────

export function fetchProviderDay(date: string) {
  return apiGet<ProviderDay>(Endpoints.calendarDay, { params: { date } });
}

// ── Invite landing (preview public, accept Bearer) ───────────────────────────

export function fetchInvitePreview(token: string) {
  return apiGet<InvitePreview>(Endpoints.invitePreview(token));
}

export function acceptInvite(token: string) {
  return apiPost<InviteAcceptResult>(Endpoints.inviteAccept(token));
}
