// Local-first watch progress and history repository.
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

export function getLocalProgress(userId: number, animeId: number, episodeNum?: number): LocalWatchProgress | null {
  const db = getDb();
  if (episodeNum == null) {
    return db.getFirstSync<LocalWatchProgress>(
      'SELECT * FROM watch_history WHERE user_id = ? AND anime_id = ? ORDER BY watched_at DESC LIMIT 1',
      [userId, animeId]
    ) ?? null;
  }
  return db.getFirstSync<LocalWatchProgress>(
    'SELECT * FROM watch_history WHERE user_id = ? AND anime_id = ? AND episode_num = ?',
    [userId, animeId, episodeNum]
  ) ?? null;
}

export function getRecentlyWatched(userId: number, limit = 20): LocalWatchProgress[] {
  const db = getDb();
  return db.getAllSync<LocalWatchProgress>(
    'SELECT * FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC LIMIT ?',
    [userId, limit]
  );
}

export function mergeRemoteHistory(userId: number, entries: LocalWatchProgress[]): void {
  const db = getDb();
  db.withTransactionSync(() => {
    for (const e of entries) {
      const local = db.getFirstSync<LocalWatchProgress>(
        'SELECT * FROM watch_history WHERE user_id = ? AND anime_id = ? AND episode_num = ?',
        [userId, e.anime_id, e.episode_num]
      );
      const remoteTime = e.watched_at ? Date.parse(e.watched_at) : 0;
      const localTime = local?.watched_at ? Date.parse(local.watched_at) : 0;
      if (local && localTime > remoteTime) continue;
      db.runSync(
        `INSERT INTO watch_history
          (anime_id,user_id,anime_title,anime_image,episode_num,ep_title,ep_thumb,watch_time,episode_duration,watched_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(user_id,anime_id,episode_num) DO UPDATE SET
          anime_title=excluded.anime_title, anime_image=excluded.anime_image,
          ep_title=excluded.ep_title, ep_thumb=excluded.ep_thumb,
          watch_time=excluded.watch_time, episode_duration=excluded.episode_duration,
          watched_at=excluded.watched_at`,
        [e.anime_id, userId, e.anime_title, e.anime_image, e.episode_num, e.ep_title, e.ep_thumb,
         e.watch_time, e.episode_duration, e.watched_at]
      );
    }
  });
}

export function saveProgressLocal(
  userId: number,
  fields: { anime_id: number; episode_num: number; watch_time: number; episode_duration: number;
            anime_title?: string; anime_image?: string; ep_title?: string; ep_thumb?: string; total_eps?: number }
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO watch_history
      (anime_id,user_id,anime_title,anime_image,episode_num,ep_title,ep_thumb,watch_time,episode_duration,watched_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id,anime_id,episode_num) DO UPDATE SET
      watch_time=excluded.watch_time, episode_duration=excluded.episode_duration,
      watched_at=excluded.watched_at,
      anime_title=COALESCE(excluded.anime_title, anime_title),
      anime_image=COALESCE(excluded.anime_image, anime_image),
      ep_title=COALESCE(excluded.ep_title, ep_title),
      ep_thumb=COALESCE(excluded.ep_thumb, ep_thumb)`,
    [fields.anime_id, userId, fields.anime_title ?? null, fields.anime_image ?? null,
     fields.episode_num, fields.ep_title ?? null, fields.ep_thumb ?? null,
     fields.watch_time, fields.episode_duration, now]
  );

  enqueue('watch_history', {
    action: 'save_progress', anime_id: fields.anime_id, episode_num: fields.episode_num,
    watch_time: fields.watch_time, episode_duration: fields.episode_duration,
    anime_title: fields.anime_title ?? '', anime_image: fields.anime_image ?? '',
    ep_title: fields.ep_title ?? '', ep_thumb: fields.ep_thumb ?? '', total_eps: fields.total_eps ?? 0,
  }, `progress:${fields.anime_id}:${fields.episode_num}`);
}
