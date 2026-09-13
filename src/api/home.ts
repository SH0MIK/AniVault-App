import { apiFetch } from './client';
import { cacheGet, cacheGetStale, cachePut } from '../db/cache';

export interface HomeHeroItem {
  id: number;
  title: string;
  image: string;
  banner: string;
  logo: string;
  synopsis: string;
  score: number | null;
  type: string;
  episodes: number;
  genres: string[];
}

export interface WebHomeCard {
  id: number;
  title: string;
  image: string;
  score: number | null;
  type: string;
  episodes: number;
  airedInfo?: { aired: number; total: number | null } | null;
  dubbedLangs?: string[];
  userStatus?: string | null;
}

export interface WebHomeResult {
  success: boolean;
  hero: HomeHeroItem[];
  genres: { mal_id: number; name: string }[];
  seasonal: WebHomeCard[];
  top: WebHomeCard[];
  upcoming: WebHomeCard[];
  watchNow: WebHomeCard[];
  continueWatching: {
    animeId: number;
    title: string;
    image: string;
    episodeNum: number;
    epTitle: string | null;
    epThumb: string | null;
    watchTime: number;
    episodeDuration: number;
  }[];
}

export async function getWebHome(): Promise<WebHomeResult> {
  const key = 'home:web:v2';
  try {
    const result = await apiFetch<WebHomeResult>('/api/mobile/home-v2');
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<WebHomeResult>(key) ?? cacheGetStale<WebHomeResult>(key);
    if (cached) return cached;
    throw new Error('AniVault is offline. Connect once to load the web homepage.');
  }
}
