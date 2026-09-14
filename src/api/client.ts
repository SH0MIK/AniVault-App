import * as SecureStore from 'expo-secure-store';

export const ANIVAULT_WEB_BASE = 'https://www.anivault.co';
export const SCRAPER_API_BASE = 'https://anivault-scraper-beta.up.railway.app';
export const API_BASE = ANIVAULT_WEB_BASE;

const TOKEN_KEY = 'anivault_session_token';
export async function getToken(): Promise<string | null> { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function setToken(token: string): Promise<void> { await SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function clearToken(): Promise<void> { await SecureStore.deleteItemAsync(TOKEN_KEY); }

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void { onUnauthorized = handler; }

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

interface ApiOptions { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; auth?: boolean; }

async function request<T>(base: string, path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${base}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> { return request<T>(ANIVAULT_WEB_BASE, path, opts); }
export function apiFetchScraper<T = any>(path: string, opts: ApiOptions = {}): Promise<T> { return request<T>(SCRAPER_API_BASE, path, { ...opts, auth: false }); }
export const apiFetchWeb = apiFetch;

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
