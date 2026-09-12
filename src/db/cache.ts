import { getDb } from './schema';

const TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function cachePut(key: string, value: unknown): void {
  try {
    getDb().runSync(
      'INSERT OR REPLACE INTO content_cache (cache_key, payload, cached_at) VALUES (?, ?, ?)',
      key,
      JSON.stringify(value),
      Date.now(),
    );
  } catch {}
}

export function cacheGet<T>(key: string, maxAge = TTL_MS): T | null {
  try {
    const row = getDb().getFirstSync<{ payload: string; cached_at: number }>(
      'SELECT payload, cached_at FROM content_cache WHERE cache_key = ?',
      key,
    );
    if (!row || Date.now() - Number(row.cached_at) > maxAge) return null;
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export function cacheGetStale<T>(key: string): T | null {
  try {
    const row = getDb().getFirstSync<{ payload: string }>(
      'SELECT payload FROM content_cache WHERE cache_key = ?',
      key,
    );
    return row ? JSON.parse(row.payload) as T : null;
  } catch {
    return null;
  }
}
