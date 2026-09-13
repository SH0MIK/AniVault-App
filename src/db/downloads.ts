import * as FileSystem from 'expo-file-system';
import { getDb } from './schema';

export type DownloadRecord = {
  anime_id: number;
  episode_num: number;
  anime_title?: string;
  episode_title?: string;
  image?: string;
  local_uri: string;
  source_uri?: string;
  bytes?: number;
  created_at: number;
};

const root = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}downloads/`;

async function ensureRoot() {
  if (!root) throw new Error('No writable app storage is available.');
  const info = await FileSystem.getInfoAsync(root);
  if (!info.exists) await FileSystem.makeDirectoryAsync(root, { intermediates: true });
}

export function getDownload(animeId: number, episodeNum: number): DownloadRecord | null {
  try {
    return getDb().getFirstSync<DownloadRecord>(
      'SELECT * FROM downloads WHERE anime_id = ? AND episode_num = ?', animeId, episodeNum,
    ) ?? null;
  } catch { return null; }
}

export function listDownloads(): DownloadRecord[] {
  try { return getDb().getAllSync<DownloadRecord>('SELECT * FROM downloads ORDER BY created_at DESC'); }
  catch { return []; }
}

export async function downloadEpisode(opts: {
  animeId: number;
  episodeNum: number;
  animeTitle: string;
  episodeTitle?: string;
  image?: string;
  sourceUri: string;
  onProgress?: (progress: number) => void;
}): Promise<DownloadRecord> {
  await ensureRoot();
  const existing = getDownload(opts.animeId, opts.episodeNum);
  if (existing) {
    const info = await FileSystem.getInfoAsync(existing.local_uri);
    if (info.exists) return existing;
  }

  const safe = `${opts.animeId}-${opts.episodeNum}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = /\.mp4(?:\?|$)/i.test(opts.sourceUri) ? '.mp4' : '.m3u8';
  const destination = `${root}${safe}${ext}`;

  // HLS manifests are not true offline downloads: their segments remain remote.
  // Only direct media files are accepted by this offline downloader.
  if (ext !== '.mp4') throw new Error('This source is HLS. Choose a direct MP4 source for offline download.');

  const task = FileSystem.createDownloadResumable(
    opts.sourceUri,
    destination,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) opts.onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
    },
  );
  const result = await task.downloadAsync();
  if (!result?.uri) throw new Error('Download did not return a local file.');

  const info = await FileSystem.getInfoAsync(result.uri, { size: true });
  const record: DownloadRecord = {
    anime_id: opts.animeId,
    episode_num: opts.episodeNum,
    anime_title: opts.animeTitle,
    episode_title: opts.episodeTitle,
    image: opts.image,
    local_uri: result.uri,
    source_uri: opts.sourceUri,
    bytes: typeof info.size === 'number' ? info.size : 0,
    created_at: Date.now(),
  };
  getDb().runSync(
    `INSERT OR REPLACE INTO downloads
      (anime_id, episode_num, anime_title, episode_title, image, local_uri, source_uri, bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    record.anime_id, record.episode_num, record.anime_title ?? null, record.episode_title ?? null,
    record.image ?? null, record.local_uri, record.source_uri ?? null, record.bytes ?? 0, record.created_at,
  );
  return record;
}

export async function deleteDownload(animeId: number, episodeNum: number): Promise<void> {
  const record = getDownload(animeId, episodeNum);
  if (record) {
    try { await FileSystem.deleteAsync(record.local_uri, { idempotent: true }); } catch {}
  }
  getDb().runSync('DELETE FROM downloads WHERE anime_id = ? AND episode_num = ?', animeId, episodeNum);
}
