// Wraps the same /api/notifications.php the website uses — works as-is with
// the mobile bearer token since Session.load() accepts either.
import { apiFetch, apiFetchForm } from './client';

export interface NotificationItem {
  id: number;
  text: string;
  link: string;
  icon: string;
  color: string;
  is_read: boolean;
  time: string;
  actor_name: string | null;
  actor_avatar: string | null;
}

export function getNotifications(): Promise<{ success: boolean; notifications: NotificationItem[]; unread: number }> {
  return apiFetch('/api/notifications.php?action=get');
}

export function getUnreadCount(): Promise<{ success: boolean; unread: number }> {
  return apiFetch('/api/notifications.php?action=count');
}

export function markRead(id: number): Promise<{ success: boolean }> {
  return apiFetchForm('/api/notifications.php', { action: 'read', id: String(id) });
}

export function markAllRead(): Promise<{ success: boolean }> {
  return apiFetchForm('/api/notifications.php', { action: 'read_all' });
}

export function deleteNotification(id: number): Promise<{ success: boolean }> {
  return apiFetchForm('/api/notifications.php', { action: 'delete', id: String(id) });
}
