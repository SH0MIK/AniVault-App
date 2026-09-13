// SQLite mirror of the data the app needs for online sync and offline use.
import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) dbInstance = SQLite.openDatabaseSync('anivault.db');
  return dbInstance;
}

export function initDb(): void {
  const db = getDb();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS anime_list (
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      anime_title TEXT,
      anime_image TEXT,
      anime_episodes INTEGER,
      status TEXT NOT NULL DEFAULT 'plan_to_watch',
      episodes_watched INTEGER NOT NULL DEFAULT 0,
      score INTEGER,
      review TEXT,
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT,
      PRIMARY KEY (user_id, anime_id)
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      anime_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      anime_title TEXT,
      anime_image TEXT,
      episode_num INTEGER NOT NULL,
      ep_title TEXT,
      ep_thumb TEXT,
      watch_time INTEGER NOT NULL DEFAULT 0,
      episode_duration INTEGER NOT NULL DEFAULT 0,
      watched_at TEXT,
      PRIMARY KEY (user_id, anime_id, episode_num)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS downloads (
      anime_id INTEGER NOT NULL,
      episode_num INTEGER NOT NULL,
      anime_title TEXT,
      episode_title TEXT,
      image TEXT,
      local_uri TEXT NOT NULL,
      source_uri TEXT,
      bytes INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (anime_id, episode_num)
    );
  `);

  // Older development builds used (user_id, anime_id) as the history key,
  // which silently overwrote episode progress. Rebuild that table once if the
  // old primary-key shape is detected, preserving the newest row per anime.
  try {
    const cols = db.getAllSync<any>('PRAGMA table_info(watch_history)');
    const pkCount = cols.filter((c: any) => c.pk > 0).length;
    if (pkCount === 2) {
      db.execSync(`
        ALTER TABLE watch_history RENAME TO watch_history_legacy;
        CREATE TABLE watch_history (
          anime_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          anime_title TEXT,
          anime_image TEXT,
          episode_num INTEGER NOT NULL,
          ep_title TEXT,
          ep_thumb TEXT,
          watch_time INTEGER NOT NULL DEFAULT 0,
          episode_duration INTEGER NOT NULL DEFAULT 0,
          watched_at TEXT,
          PRIMARY KEY (user_id, anime_id, episode_num)
        );
        INSERT INTO watch_history (anime_id,user_id,anime_title,anime_image,episode_num,ep_title,ep_thumb,watch_time,episode_duration,watched_at)
          SELECT anime_id,user_id,anime_title,anime_image,episode_num,ep_title,ep_thumb,watch_time,episode_duration,watched_at
          FROM watch_history_legacy;
        DROP TABLE watch_history_legacy;
      `);
    }
  } catch {
    // A failed migration must not prevent the rest of the app from opening.
  }
}
