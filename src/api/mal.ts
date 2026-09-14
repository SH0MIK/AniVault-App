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

async function jikanFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${JIKAN_API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
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
  }
  return all;
}
