// The offline sync engine: queues writes made while offline and flushes them
// once connectivity is back.
import * as Network from 'expo-network';
import { getDb } from './schema';
import { apiFetch, apiFetchForm } from '../api/client';
import { replaceLocalList, LocalAnimeListEntry } from './listRepo';

type Endpoint = 'list' | 'watch_history';
interface QueueRow { id: number; endpoint: Endpoint; payload: string; created_at: number; }

export function enqueue(endpoint: Endpoint, payload: Record<string, unknown>, coalesceKey?: string): void {
  const db = getDb();
  const payloadJson = JSON.stringify(coalesceKey ? { ...payload, __coalesceKey: coalesceKey } : payload);
  if (coalesceKey) {
    const existing = db.getFirstSync<QueueRow>(
      `SELECT id, payload FROM sync_queue WHERE endpoint = ? AND json_extract(payload, '$.__coalesceKey') = ?`,
      [endpoint, coalesceKey]
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
      return { flushed, failed: true };
    }
  }
  return { flushed, failed: false };
}

export async function pullList(userId: number): Promise<void> {
  const res = await apiFetch<{ anime: LocalAnimeListEntry[] }>('/importexport?export=json');
  replaceLocalList(userId, res.anime ?? []);
}

/** Never pull the server mirror after a failed flush: doing so could replace
 * local changes that are still sitting in SQLite's sync queue. */
export async function fullSync(userId: number): Promise<void> {
  if (!(await isOnline())) return;
  const result = await flushQueue();
  if (result.failed) return;
  await pullList(userId);
}
