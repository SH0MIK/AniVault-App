// Wraps the account-settings endpoints — some already existed as clean JSON
// (username/email/delete), one is new (bio/password, see api-mobile-auth.ts).
import { apiFetch, apiFetchForm, getToken } from './client';

const SITE_URL = 'https://www.anivault.co';

/** MAL/AniList connect is OAuth — has to happen in a real browser, not a
 *  fetch call. This reuses the same session-id-as-cookie handoff the watch
 *  page uses so the browser lands on /api/list_sync_connect.php already
 *  logged in as the app's user, instead of an anonymous browser session. */
export async function getListSyncConnectUrl(provider: 'mal' | 'anilist'): Promise<string> {
  const token = await getToken();
  const redirect = `/api/list_sync_connect.php?provider=${provider}`;
  return token
    ? `${SITE_URL}/mobile-handoff?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`
    : `${SITE_URL}/login`;
}

export function checkUsername(username: string): Promise<{ available: boolean; message?: string }> {
  return apiFetch(`/api/check_username.php?username=${encodeURIComponent(username)}`);
}

export function updateUsername(username: string): Promise<{ success: boolean; message?: string; username?: string }> {
  return apiFetchForm('/api/update_username.php', { username });
}

export function updateEmail(email: string): Promise<{ success: boolean; message?: string; email?: string }> {
  return apiFetchForm('/api/update_email.php', { email });
}

export function updateSettings(fields: { bio?: string; new_password?: string }): Promise<{ success: boolean; message?: string }> {
  return apiFetch('/api/mobile/settings', { method: 'POST', body: fields });
}

export function deleteAccount(password?: string): Promise<{ success: boolean; message?: string }> {
  return apiFetchForm('/api/delete_account.php', password ? { password } : {});
}

export interface ListSyncStatus {
  success: boolean;
  mal: { connected: boolean; username: string | null };
  anilist: { connected: boolean; username: string | null };
}

export function getListSyncStatus(): Promise<ListSyncStatus> {
  return apiFetch('/api/mobile/list-sync/status');
}

export function listSyncAction(action: 'mal_sync_now' | 'mal_disconnect' | 'anilist_sync_now' | 'anilist_disconnect'): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/mobile/list-sync/action', { method: 'POST', body: { action } });
}
