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

export function getProgress(userId: number, animeId: number, episodeNum: number): LocalWatchProgress | null {
  return getDb().getFirstSync<LocalWatchProgress>(
    'SELECT * FROM watch_history WHERE user_id = ? AND anime_id = ? AND episode_num = ?',
    [userId, animeId, episodeNum]
  ) ?? null;
}

export function getLatestProgress(userId: number, animeId: number): LocalWatchProgress | null {
  return getDb().getFirstSync<LocalWatchProgress>(
    'SELECT * FROM watch_history WHERE user_id = ? AND anime_id = ? ORDER BY watched_at DESC LIMIT 1',
    [userId, animeId]
  ) ?? null;
}

export function saveProgress(userId: number, fields: Omit<LocalWatchProgress, 'user_id' | 'watched_at'>): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO watch_history
      (anime_id, user_id, anime_title, anime_image, episode_num, ep_title, ep_thumb, watch_time, episode_duration, watched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, anime_id, episode_num) DO UPDATE SET
       anime_title=excluded.anime_title, anime_image=excluded.anime_image,
       ep_title=excluded.ep_title, ep_thumb=excluded.ep_thumb,
       watch_time=excluded.watch_time, episode_duration=excluded.episode_duration,
       watched_at=excluded.watched_at`,
    [fields.anime_id, userId, fields.anime_title, fields.anime_image, fields.episode_num,
      fields.ep_title, fields.ep_thumb, Math.round(fields.watch_time), Math.round(fields.episode_duration), now]
  );
  enqueue('watch_history', {
    anime_id: String(fields.anime_id),
    anime_title: fields.anime_title ?? '', anime_image: fields.anime_image ?? '',
    episode_num: String(fields.episode_num), ep_title: fields.ep_title ?? '', ep_thumb: fields.ep_thumb ?? '',
    watch_time: String(Math.round(fields.watch_time)), episode_duration: String(Math.round(fields.episode_duration)),
  });
}
