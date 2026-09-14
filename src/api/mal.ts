const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const MAL_CLIENT_ID = '65cb02f1d4ef2ed7a18f230c517fe398';

async function malFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${MAL_API_BASE}${path}`, {
    headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`MAL API ${response.status}`);
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

export async function getMalAnime(id: number): Promise<MalAnime> {
  return malFetch<MalAnime>(`/anime/${encodeURIComponent(String(id))}?fields=id,title,main_picture,alternative_titles,synopsis,mean,status,media_type,num_episodes,genres,related_anime`);
}

export async function getMalEpisodes(id: number): Promise<MalEpisode[]> {
  const all: MalEpisode[] = [];
  let offset = 0;
  do {
    const page = await malFetch<{ data: MalEpisode[]; paging?: { next?: string } }>(`/anime/${encodeURIComponent(String(id))}/episodes?limit=100&offset=${offset}`);
    const items = page.data ?? [];
    all.push(...items);
    if (!page.paging?.next || items.length === 0) break;
    offset += items.length;
  } while (all.length < 1000);
  return all;
}
