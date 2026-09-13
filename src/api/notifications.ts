import { apiFetch, apiFetchForm } from './client';
import { cacheGet, cacheGetStale, cachePut } from '../db/cache';

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

const CACHE_KEY = 'notifications';
type NotificationsResult = { success: boolean; notifications: NotificationItem[]; unread: number };

export async function getNotifications(): Promise<NotificationsResult> {
  try {
    const result = await apiFetch<NotificationsResult>('/api/notifications.php?action=get');
    cachePut(CACHE_KEY, result);
    return result;
  } catch {
    const cached = cacheGet<NotificationsResult>(CACHE_KEY) ?? cacheGetStale<NotificationsResult>(CACHE_KEY);
    if (cached) return cached;
    throw new Error('Notifications are unavailable offline. Open them once while online to cache them.');
  }
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
