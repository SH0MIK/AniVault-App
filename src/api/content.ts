import { apiFetch, apiFetchForm } from './client';
import { cacheGet, cacheGetStale, cachePut } from '../db/cache';

export interface BrowseItem {
  id: number; title: string; image: string; score: number | null; type: string; episodes: number;
  airedInfo: { aired: number; total: number | null } | null; dubbedLangs: string[]; userStatus: string | null;
}
export interface BrowseResult {
  data: BrowseItem[];
  pagination: { last_visible_page?: number; has_next_page?: boolean };
  genres: { mal_id: number; name: string }[];
}

export async function browse(opts: { q?: string; genres?: number[]; status?: string; page?: number }): Promise<BrowseResult> {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.status) params.set('status', opts.status);
  if (opts.page) params.set('page', String(opts.page));
  for (const g of opts.genres ?? []) params.append('genres[]', String(g));
  const key = `browse:${params.toString()}`;
  try {
    const result = await apiFetch<BrowseResult>(`/api/mobile/browse?${params.toString()}`);
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<BrowseResult>(key) ?? cacheGetStale<BrowseResult>(key);
    if (cached) return cached;
    throw new Error('AniVault is offline and this browse page is not cached yet.');
  }
}

export interface AnimeDetail {
  id: number; title: string; titleJapanese: string | null; image: string; synopsis: string;
  score: number | null; status: string; type: string; genres: { id: number; name: string }[];
  totalEpisodes: number; airedSoFar: number | null; isAiring: boolean; dubbedLangs: string[];
  related: { id: number; title: string; type: string }[];
}
export type AnimeDetailResult = { success: boolean; anime: AnimeDetail; userEntry: any; isFavorite: boolean };

export async function getAnimeDetail(id: number): Promise<AnimeDetailResult> {
  const key = `anime:${id}`;
  try {
    const result = await apiFetch<AnimeDetailResult>(`/api/mobile/anime/${id}`);
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<AnimeDetailResult>(key) ?? cacheGetStale<AnimeDetailResult>(key);
    if (cached) return cached;
    throw new Error('Anime details are unavailable offline. Open this anime once while online to cache it.');
  }
}

export interface EpisodeItem { mal_id?: number; episode?: number; title?: string; [key: string]: unknown; }
export type EpisodesResult = { success: boolean; data: EpisodeItem[]; pagination: any };

export async function getEpisodes(id: number, page = 1): Promise<EpisodesResult> {
  const key = `episodes:${id}:${page}`;
  try {
    const result = await apiFetch<EpisodesResult>(`/api/mobile/anime/${id}/episodes?page=${page}`);
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<EpisodesResult>(key) ?? cacheGetStale<EpisodesResult>(key);
    if (cached) return cached;
    throw new Error('Episode list is unavailable offline. Open this anime once while online to cache it.');
  }
}

export function toggleFavorite(animeId: number, title: string, image: string): Promise<{ success: boolean; favorited: boolean }> {
  return apiFetchForm('/api/list.php', { action: 'favorite', anime_id: String(animeId), anime_title: title, anime_image: image });
}

export interface MiniAnimeCard { id: number; title: string; image: string; score: number | null; type: string; episodes: number; }
export interface HomeContinueItem {
  animeId: number; title: string; image: string; episodeNum: number; epTitle: string | null; epThumb: string | null;
  watchTime: number; episodeDuration: number;
}
export interface HomeResult {
  success: boolean; seasonal: MiniAnimeCard[]; top: MiniAnimeCard[]; upcoming: MiniAnimeCard[];
  watchNow: MiniAnimeCard[]; continueWatching: HomeContinueItem[];
}

export async function getHome(): Promise<HomeResult> {
  const key = 'home';
  try {
    const result = await apiFetch<HomeResult>('/api/mobile/home');
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<HomeResult>(key) ?? cacheGetStale<HomeResult>(key);
    if (cached) return cached;
    throw new Error('AniVault is offline. Connect once to load the home page.');
  }
}

export type WatchNowResult = { success: boolean; data: MiniAnimeCard[]; page: number; totalPages: number };
export async function getWatchNow(page = 1): Promise<WatchNowResult> {
  const key = `watch-now:${page}`;
  try {
    const result = await apiFetch<WatchNowResult>(`/api/mobile/watch-now?page=${page}`);
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<WatchNowResult>(key) ?? cacheGetStale<WatchNowResult>(key);
    if (cached) return cached;
    throw new Error('Watch Now is unavailable offline.');
  }
}

export interface HistoryItem {
  animeId: number; title: string; image: string; episodeNum: number; epTitle: string | null; epThumb: string | null;
  watchedAt: string; watchTime: number; episodeDuration: number;
}
export function getHistory(page = 1): Promise<{ success: boolean; data: HistoryItem[]; page: number; totalPages: number }> {
  return apiFetch(`/api/mobile/history?page=${page}`);
}

export interface Announcement { id: number; title: string; content: string; imageUrl: string | null; createdAt: string; }
export function getAnnouncements(): Promise<{ success: boolean; data: Announcement[] }> { return apiFetch('/api/mobile/announcements'); }

export interface CharacterDetail { id: number; name: string; nameKanji: string | null; nicknames: string[]; about: string | null; favorites: number; image: string; }
export function getCharacter(id: number): Promise<{ success: boolean; character: CharacterDetail; animeography: { animeId: number; title: string; image: string; role: string }[]; voices: { name: string; image: string; language: string }[] }> {
  return apiFetch(`/api/mobile/character/${id}`);
}
export function getAnimeCharacters(id: number): Promise<{ success: boolean; data: { id: number; name: string; image: string; role: string }[] }> {
  return apiFetch(`/api/mobile/anime/${id}/characters`);
}
