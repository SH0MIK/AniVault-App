import * as SecureStore from 'expo-secure-store';

// AniVault's website backend: authentication, profiles, history, favorites,
// lists, announcements and the mobile-shaped content endpoints used by the UI.
export const ANIVAULT_WEB_BASE = 'https://www.anivault.co';

// AniVault Scraper API: anime metadata/search, episodes, servers and stream
// resolution. Keep this separate because it does not expose the website's
// authenticated /api/mobile/* endpoints.
export const SCRAPER_API_BASE = 'https://anivault-scraper-beta.up.railway.app';

// Backwards-compatible name for existing app API calls.
export const API_BASE = ANIVAULT_WEB_BASE;

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

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void { onUnauthorized = handler; }

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(base: string, path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/** Requests to the AniVault website backend. */
export function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  return request<T>(ANIVAULT_WEB_BASE, path, opts);
}

/** Requests to the AniVault Scraper API. */
export function apiFetchScraper<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  // The scraper API's public routes do not use the AniVault session token.
  return request<T>(SCRAPER_API_BASE, path, { ...opts, auth: false });
}

// Explicit alias for code that wants to make the backend choice obvious.
export const apiFetchWeb = apiFetch;

/** Form request for AniVault website-only endpoints such as list.php. */
export async function apiFetchForm<T = any>(path: string, fields: Record<string, string>): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);

  const res = await fetch(`${ANIVAULT_WEB_BASE}${path}`, { method: 'POST', headers, body: form as any });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}
