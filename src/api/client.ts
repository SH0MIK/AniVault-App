// Talks to the same Workers/D1 backend as the website. Every route that
// works for the site's logged-in fetch() calls works here too — the only
// difference is we send the session token as a Bearer header instead of
// relying on a cookie jar, per the mobile-auth changes in the backend.
import * as SecureStore from 'expo-secure-store';

// TODO: point this at your deployed Worker (anivault.co), not localhost —
// left as a placeholder so you don't accidentally ship a dev URL.
const API_BASE = 'https://anivault.co';

const TOKEN_KEY = 'anivault_session_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// AuthContext registers a callback here on mount so client.ts can trigger a
// logout without importing AuthContext directly (which would create a
// circular import — AuthContext already imports this file). A 401 on an
// authenticated request means the token is dead (expired, or logged out
// server-side / from another device), so the app should drop back to the
// login screen rather than keep silently failing every request.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean; // attach the bearer token — default true
}

/** Core request helper for JSON endpoints (mobile auth, watch_history.php,
 *  importexport.php?export=json, etc). Every screen's API call should go
 *  through this or apiFetchForm below so token attachment and error shape
 *  stay consistent in one place. */
export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response (shouldn't happen on API routes, but don't crash)
  }

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/** list.php expects a form-encoded body — it's read with c.req.parseBody()
 *  on the backend, not c.req.json() — so this sends the same shape the
 *  website's own fetch() calls do, just with a Bearer token instead of a
 *  cookie for identifying the user. */
export async function apiFetchForm<T = any>(path: string, fields: Record<string, string>): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  // URLSearchParams as a fetch body sets Content-Type:
  // application/x-www-form-urlencoded automatically.
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: form as any });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}
