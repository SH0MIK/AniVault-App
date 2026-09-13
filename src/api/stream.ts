const SITE_URL = 'https://www.anivault.co';

export type NativeStream = {
  m3u8?: string;
  mp4?: string;
  server?: string;
  servers?: { name: string; type: string }[];
  subtitles?: { url?: string; label?: string; lang?: string }[];
  iframeOnly?: boolean;
  embedUrl?: string;
};

async function request(path: string): Promise<NativeStream> {
  const res = await fetch(`${SITE_URL}${path}`, { headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok || data?.error) throw new Error(data?.error ?? `Stream request failed (${res.status})`);
  return data;
}

export async function resolveAnikoto(animeId: number, episodeNum: number, audio: 'sub' | 'dub' = 'sub', server = '') {
  const qs = new URLSearchParams({ anime: String(animeId), ep: String(episodeNum), audio });
  if (server) qs.set('server', server);
  return request(`/api/anikoto_stream.php?${qs.toString()}`);
}

export async function resolveAnimeHeaven(animeId: number, episodeNum: number) {
  return request(`/api/animeheaven_stream.php?anime=${animeId}&ep=${episodeNum}`);
}

export async function resolveStream(animeId: number, episodeNum: number, audio: 'sub' | 'dub' = 'sub', server = '') {
  try { return await resolveAnikoto(animeId, episodeNum, audio, server); }
  catch { return resolveAnimeHeaven(animeId, episodeNum); }
}
