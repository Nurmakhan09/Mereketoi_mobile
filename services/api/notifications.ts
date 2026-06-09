import { apiGet, apiPost } from './client';
import { Endpoints } from './endpoints';
import {
  NotificationsResponse,
  NotificationPreferences,
  NotificationChannel,
  RemindersResponse,
  ReminderInput,
} from '@/types';

// ── Inbox ────────────────────────────────────────────────────────────────────

export function fetchNotifications(params: { limit?: number; offset?: number } = {}) {
  return apiGet<NotificationsResponse>(Endpoints.notifications, { params });
}

export function fetchUnreadCount() {
  return apiGet<{ unread: number }>(Endpoints.notificationsUnread).then((d) => d.unread);
}

export function markNotificationRead(id: number) {
  return apiPost<{ id: number }>(Endpoints.notificationRead(id));
}

export function markAllNotificationsRead() {
  return apiPost<unknown>(Endpoints.notificationsReadAll);
}

// ── Preferences ──────────────────────────────────────────────────────────────

export function fetchPreferences() {
  return apiGet<NotificationPreferences>(Endpoints.notificationPreferences);
}

export function updatePreferences(channels: Record<NotificationChannel, boolean>) {
  return apiPost<{ channels: Record<NotificationChannel, boolean> }>(
    Endpoints.notificationPreferences,
    { channels },
  ).then((d) => d.channels);
}

// ── Reminders ────────────────────────────────────────────────────────────────

export function fetchReminders() {
  return apiGet<RemindersResponse>(Endpoints.reminders);
}

export function createReminder(input: ReminderInput) {
  return apiPost<{ id: number }>(Endpoints.reminders, input);
}

export function updateReminder(id: number, input: Partial<ReminderInput>) {
  return apiPost<{ id: number }>(Endpoints.reminder(id), input);
}

export function toggleReminder(id: number) {
  return apiPost<{ id: number; done: boolean }>(Endpoints.reminderToggle(id));
}

export function deleteReminder(id: number) {
  return apiPost<unknown>(Endpoints.reminderDelete(id));
}
