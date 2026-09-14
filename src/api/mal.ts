const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const MAL_CLIENT_ID = '65cb02f1d4ef2ed7a18f230c517fe398';
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

async function malFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${MAL_API_BASE}${path}`, {
    headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`MAL API ${response.status}`);
  return response.json() as Promise<T>;
}

async function jikanFetch<T>(path: string, attempt = 0): Promise<T> {
  const response = await fetch(`${JIKAN_API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (response.status === 429 && attempt < 2) {
    // Jikan is rate-limited to a few requests/sec — back off and retry instead of failing the whole page.
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    return jikanFetch<T>(path, attempt + 1);
  }
  if (!response.ok) throw new Error(`Jikan API ${response.status}`);
  return response.json() as Promise<T>;
}

export interface MalAnime {
  id: number;
  title: string;
  main_picture?: { medium?: string; large?: string };
  alternative_titles?: { en?: string; ja?: string; synonyms?: string[] };
  synopsis?: string;
  mean?: number;
  status?: string;
  media_type?: string;
  num_episodes?: number;
  genres?: Array<{ id: number; name: string }>;
  related_anime?: Array<{ node: { id: number; title: string; main_picture?: { medium?: string; large?: string } }; relation_type?: string }>;
}

export interface MalEpisode {
  id: number;
  number: number;
  title?: string;
  synopsis?: string;
  aired?: string;
  score?: number;
}

interface JikanAnime {
  mal_id: number;
  title: string;
  images?: { jpg?: { image_url?: string; large_image_url?: string } };
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  synopsis?: string | null;
  score?: number | null;
  status?: string;
  type?: string;
  episodes?: number | null;
  genres?: Array<{ mal_id: number; name: string }>;
}

interface JikanEpisode {
  mal_id: number;
  title?: string | null;
  synopsis?: string | null;
  aired?: string | null;
  score?: number | null;
}

export async function getMalAnime(id: number): Promise<MalAnime> {
  try {
    return await malFetch<MalAnime>(`/anime/${encodeURIComponent(String(id))}?fields=id,title,main_picture,alternative_titles,synopsis,mean,status,media_type,num_episodes,genres,related_anime`);
  } catch {
    const payload = await jikanFetch<{ data: JikanAnime }>(`/anime/${encodeURIComponent(String(id))}`);
    const data = payload.data;
    return {
      id: data.mal_id,
      title: data.title,
      main_picture: {
        medium: data.images?.jpg?.image_url,
        large: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url,
      },
      alternative_titles: { en: data.title_english || undefined, ja: data.title_japanese || undefined, synonyms: data.title_synonyms },
      synopsis: data.synopsis || undefined,
      mean: data.score ?? undefined,
      status: data.status,
      media_type: data.type,
      num_episodes: data.episodes ?? undefined,
      genres: (data.genres ?? []).map((genre) => ({ id: genre.mal_id, name: genre.name })),
    };
  }
}

export async function getMalEpisodes(id: number): Promise<MalEpisode[]> {
  try {
    const all: MalEpisode[] = [];
    let offset = 0;
    do {
      const page = await malFetch<{ data: MalEpisode[]; paging?: { next?: string } }>(`/anime/${encodeURIComponent(String(id))}/episodes?limit=100&offset=${offset}`);
      const items = page.data ?? [];
      all.push(...items);
      if (!page.paging?.next || items.length === 0) break;
      offset += items.length;
    } while (all.length < 1000);
    if (all.length) return all;
  } catch {
    // Fall through to Jikan below.
  }

  const all: MalEpisode[] = [];
  for (let page = 1; page <= 10; page += 1) {
    try {
      const response = await jikanFetch<{ data: JikanEpisode[]; pagination?: { has_next_page?: boolean } }>(`/anime/${encodeURIComponent(String(id))}/episodes?page=${page}`);
      const items = (response.data ?? []).map((item) => ({
        id: item.mal_id,
        number: item.mal_id,
        title: item.title || undefined,
        synopsis: item.synopsis || undefined,
        aired: item.aired || undefined,
        score: item.score ?? undefined,
      }));
      all.push(...items);
      if (!response.pagination?.has_next_page || items.length === 0) break;
      if (page < 10) await new Promise((resolve) => setTimeout(resolve, 350));
    } catch {
      // Keep whatever pages we already have rather than discarding the whole list.
      break;
    }
  }
  return all;
}

export interface MalEpisodeDetail extends MalEpisode {
  titleJapanese?: string;
  titleRomanji?: string;
  duration?: number;
  filler?: boolean;
  recap?: boolean;
}

/**
 * Jikan's bulk episode-list endpoint never includes synopsis — only its
 * single-episode endpoint does. Fetch this on demand (e.g. when the user
 * expands "...more") rather than for every episode in the list.
 */
export async function getMalEpisodeDetail(id: number, episodeNum: number): Promise<MalEpisodeDetail | null> {
  try {
    const response = await jikanFetch<{
      data: {
        mal_id: number;
        title?: string | null;
        title_japanese?: string | null;
        title_romanji?: string | null;
        aired?: string | null;
        duration?: number | null;
        filler?: boolean;
        recap?: boolean;
        synopsis?: string | null;
        score?: number | null;
      };
    }>(`/anime/${encodeURIComponent(String(id))}/episodes/${episodeNum}`);
    const d = response.data;
    if (!d) return null;
    return {
      id: d.mal_id,
      number: episodeNum,
      title: d.title || undefined,
      titleJapanese: d.title_japanese || undefined,
      titleRomanji: d.title_romanji || undefined,
      synopsis: d.synopsis || undefined,
      aired: d.aired || undefined,
      duration: d.duration ?? undefined,
      filler: d.filler,
      recap: d.recap,
      score: d.score ?? undefined,
    };
  } catch {
    return null;
  }
}
