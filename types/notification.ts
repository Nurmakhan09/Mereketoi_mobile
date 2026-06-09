/**
 * Notifications, channel preferences, and reminders (master-spec §3.13–3.15, §5).
 * Phase scope: only the in_app channel is delivered today.
 */

export interface AppNotification {
  id: number;
  event_key: string;
  title: string;
  body?: string | null;
  action_url?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  unread: number;
}

export type NotificationChannel = 'in_app' | 'email' | 'telegram' | 'push';

export interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>;
  defaults?: Record<NotificationChannel, boolean>;
}

export interface Reminder {
  id: number;
  listing_id?: number | null;
  title: string;
  note?: string | null;
  remind_at: string; // YYYY-MM-DD
  is_done: boolean;
  created_at: string;
}

export interface RemindersResponse {
  items: Reminder[];
  open: number;
}

export interface ReminderInput {
  title: string;
  remind_at: string;
  note?: string;
  listing_id?: number;
}
