// SQLite mirror of the two tables the app actually needs offline:
// `anime_list` (the watchlist) and `watch_history` (progress), matching the
// real D1 columns used by api-lists.ts / importexport.ts on the backend.
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
      PRIMARY KEY (user_id, anime_id)
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
  `);
}
