// Local-first read/write for watch progress, mirroring watch_history's
// columns and the save_progress payload shape from api-lists.ts exactly.
import { getDb } from './schema';
import { enqueue } from './sync';

export interface LocalWatchProgress {
  anime_id: number;
  user_id: number;
  anime_title: string | null;
  anime_image: string | null;
  episode_num: number;
  ep_title: string | null;
  ep_thumb: string | null;
  watch_time: number;
  episode_duration: number;
  watched_at: string | null;
}

export function getLocalProgress(userId: number, animeId: number): LocalWatchProgress | null {
  const db = getDb();
  return db.getFirstSync<LocalWatchProgress>(
    'SELECT * FROM watch_history WHERE user_id = ? AND anime_id = ?',
    [userId, animeId]
  ) ?? null;
}

export function getRecentlyWatched(userId: number, limit = 20): LocalWatchProgress[] {
  const db = getDb();
  return db.getAllSync<LocalWatchProgress>(
    'SELECT * FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC LIMIT ?',
    [userId, limit]
  );
}

/** Called on a timer while an episode plays (e.g. every 10s) — writes
 *  locally so scrubbing back into an episode offline resumes correctly,
 *  and queues the same save_progress call the backend expects. Only one
 *  queued save_progress per (anime_id, episode) is kept — see sync.ts'
 *  coalescing — so scrubbing a lot doesn't flood the queue with 200 rows
 *  that all say the same thing in slightly different words. */
export function saveProgressLocal(
  userId: number,
  fields: { anime_id: number; episode_num: number; watch_time: number; episode_duration: number;
            anime_title?: string; anime_image?: string; ep_title?: string; ep_thumb?: string; total_eps?: number }
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO watch_history (anime_id, user_id, anime_title, anime_image, episode_num, ep_title, ep_thumb, watch_time, episode_duration, watched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, anime_id) DO UPDATE SET
       episode_num = excluded.episode_num, watch_time = excluded.watch_time,
       episode_duration = excluded.episode_duration, watched_at = excluded.watched_at,
       anime_title = COALESCE(excluded.anime_title, anime_title),
       anime_image = COALESCE(excluded.anime_image, anime_image)`,
    [fields.anime_id, userId, fields.anime_title ?? null, fields.anime_image ?? null,
     fields.episode_num, fields.ep_title ?? null, fields.ep_thumb ?? null,
     fields.watch_time, fields.episode_duration, now]
  );

  enqueue('watch_history', {
    action: 'save_progress',
    anime_id: fields.anime_id,
    episode_num: fields.episode_num,
    watch_time: fields.watch_time,
    episode_duration: fields.episode_duration,
    anime_title: fields.anime_title ?? '',
    anime_image: fields.anime_image ?? '',
    ep_title: fields.ep_title ?? '',
    ep_thumb: fields.ep_thumb ?? '',
    total_eps: fields.total_eps ?? 0,
  }, /* coalesceKey */ `progress:${fields.anime_id}`);
}
