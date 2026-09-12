// The offline sync engine: queues writes made while offline (or just to
// avoid blocking the UI on a slow connection) and flushes them to the real
// backend endpoints in order once connectivity is back.
import * as Network from 'expo-network';
import { getDb } from './schema';
import { apiFetch, apiFetchForm } from '../api/client';
import { replaceLocalList, LocalAnimeListEntry } from './listRepo';

type Endpoint = 'list' | 'watch_history';

interface QueueRow {
  id: number;
  endpoint: Endpoint;
  payload: string;
  created_at: number;
}

/** Adds a write to the queue. If coalesceKey is given, any existing queued
 *  row with the same key is replaced instead of appended — this is what
 *  keeps scrubbing through an episode (which calls saveProgressLocal a lot)
 *  from queuing dozens of stale progress updates; only the latest per
 *  anime survives to actually sync. */
export function enqueue(endpoint: Endpoint, payload: Record<string, unknown>, coalesceKey?: string): void {
  const db = getDb();
  const key = coalesceKey ?? null;
  const payloadJson = JSON.stringify(key ? { ...payload, __coalesceKey: key } : payload);

  if (key) {
    const existing = db.getFirstSync<QueueRow>(
      `SELECT id, payload FROM sync_queue WHERE endpoint = ? AND json_extract(payload, '$.__coalesceKey') = ?`,
      [endpoint, key]
    );
    if (existing) {
      db.runSync('UPDATE sync_queue SET payload = ?, created_at = ? WHERE id = ?', [payloadJson, Date.now(), existing.id]);
      return;
    }
  }
  db.runSync('INSERT INTO sync_queue (endpoint, payload, created_at) VALUES (?, ?, ?)', [endpoint, payloadJson, Date.now()]);
}

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return !!state.isConnected && state.isInternetReachable !== false;
}

/** Pushes every queued write to the backend in order, oldest first. Stops
 *  and keeps the remaining queue intact if a request fails, so a mid-flush
 *  connection drop doesn't lose or reorder anything — it just resumes from
 *  where it left off next time flushQueue runs. */
export async function flushQueue(): Promise<{ flushed: number; failed: boolean }> {
  if (!(await isOnline())) return { flushed: 0, failed: false };

  const db = getDb();
  const rows = db.getAllSync<QueueRow>('SELECT * FROM sync_queue ORDER BY created_at ASC, id ASC');
  let flushed = 0;

  for (const row of rows) {
    const payload = JSON.parse(row.payload);
    delete payload.__coalesceKey;

    try {
      if (row.endpoint === 'list') {
        const fields: Record<string, string> = {};
        for (const [k, v] of Object.entries(payload)) fields[k] = String(v);
        await apiFetchForm('/api/list.php', fields);
      } else {
        await apiFetch('/api/watch_history.php', { method: 'POST', body: payload });
      }
      db.runSync('DELETE FROM sync_queue WHERE id = ?', [row.id]);
      flushed++;
    } catch {
      // Leave this row and everything after it queued; try again on the
      // next flush (app foreground, reconnect, or a manual pull-to-sync).
      return { flushed, failed: true };
    }
  }
  return { flushed, failed: false };
}

/** Pulls the authoritative watchlist from the backend and replaces the
 *  local mirror. Call after login and periodically on reconnect — NOT
 *  before flushQueue, or a pull could clobber a change that hasn't synced
 *  up yet. */
export async function pullList(userId: number): Promise<void> {
  const res = await apiFetch<{ anime: LocalAnimeListEntry[] }>('/importexport?export=json');
  replaceLocalList(userId, res.anime ?? []);
}

/** Full sync pass: push local changes first, then pull the merged server
 *  state back down. Safe to call on app foreground, on reconnect, or from
 *  a manual "sync now" action. */
export async function fullSync(userId: number): Promise<void> {
  if (!(await isOnline())) return;
  await flushQueue();
  await pullList(userId);
}
