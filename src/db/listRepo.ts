// Local-first read/write for the watchlist. Screens read from SQLite only
// (instant, works offline) and writes go local-first + queued for sync,
// mirroring the exact columns /importexport?export=json and /api/list.php
// use on the backend (see schema.ts for the column source).
import { getDb } from './schema';
import { enqueue } from './sync';

export interface LocalAnimeListEntry {
  anime_id: number;
  user_id: number;
  anime_title: string | null;
  anime_image: string | null;
  anime_episodes: number | null;
  status: string;
  episodes_watched: number;
  score: number | null;
  review: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

export function getLocalList(userId: number): LocalAnimeListEntry[] {
  const db = getDb();
  return db.getAllSync<LocalAnimeListEntry>(
    'SELECT * FROM anime_list WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
}

export function getLocalEntry(userId: number, animeId: number): LocalAnimeListEntry | null {
  const db = getDb();
  return db.getFirstSync<LocalAnimeListEntry>(
    'SELECT * FROM anime_list WHERE user_id = ? AND anime_id = ?',
    [userId, animeId]
  ) ?? null;
}

/** Replaces the local mirror wholesale — used right after login/launch to
 *  pull the authoritative list from /importexport?export=json. */
export function replaceLocalList(userId: number, entries: LocalAnimeListEntry[]): void {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM anime_list WHERE user_id = ?', [userId]);
    for (const e of entries) {
      db.runSync(
        `INSERT INTO anime_list
           (anime_id, user_id, anime_title, anime_image, anime_episodes, status, episodes_watched, score, review, started_at, completed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.anime_id, userId, e.anime_title, e.anime_image, e.anime_episodes, e.status,
         e.episodes_watched, e.score, e.review, e.started_at, e.completed_at, e.updated_at]
      );
    }
  });
}

/** Add or update a list entry: writes locally immediately (so the UI
 *  reflects it right away, online or not), then queues the same write for
 *  /api/list.php?action=add. */
export function addOrUpdateLocal(
  userId: number,
  fields: { anime_id: number; anime_title: string; anime_image: string; anime_episodes?: number;
            status: string; episodes_watched: number; score?: number | null; review?: string | null }
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO anime_list (anime_id, user_id, anime_title, anime_image, anime_episodes, status, episodes_watched, score, review, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, anime_id) DO UPDATE SET
       anime_title = excluded.anime_title, anime_image = excluded.anime_image,
       anime_episodes = excluded.anime_episodes, status = excluded.status,
       episodes_watched = excluded.episodes_watched, score = excluded.score,
       review = excluded.review, updated_at = excluded.updated_at`,
    [fields.anime_id, userId, fields.anime_title, fields.anime_image, fields.anime_episodes ?? null,
     fields.status, fields.episodes_watched, fields.score ?? null, fields.review ?? null, now]
  );

  enqueue('list', {
    action: 'add',
    anime_id: String(fields.anime_id),
    anime_title: fields.anime_title,
    anime_image: fields.anime_image,
    status: fields.status,
    episodes_watched: String(fields.episodes_watched),
    ...(fields.score != null ? { score: String(fields.score) } : {}),
    ...(fields.review != null ? { review: fields.review } : {}),
  });
}

export function removeLocal(userId: number, animeId: number): void {
  const db = getDb();
  db.runSync('DELETE FROM anime_list WHERE user_id = ? AND anime_id = ?', [userId, animeId]);
  enqueue('list', { action: 'remove', anime_id: String(animeId) });
}
