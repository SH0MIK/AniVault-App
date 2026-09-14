import { apiFetch, apiFetchForm, apiFetchScraper } from './client';

// Read-only anime metadata comes directly from MAL. The client ID is safe to
// ship with the app; the MAL client secret is deliberately never bundled.
const MAL_API_BASE = 'https://api.myanimelist.net/v2';
const MAL_CLIENT_ID = 'REPLACE_WITH_MAL_CLIENT_ID';

async function malFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${MAL_API_BASE}${path}`, {
    headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID },
  });
  if (!response.ok) throw new Error(`MAL API ${response.status}`);
  return response.json();
}

export interface BrowseItem { id: number; title: string; image: string; score: number | null; type: string; episodes: number; airedInfo: { aired: number; total: number | null } | null; dubbedLangs: string[]; userStatus: string | null; }
export interface BrowseResult { data: BrowseItem[]; pagination: { last_visible_page?: number; has_next_page?: boolean }; genres: { mal_id: number; name: string }[]; }
export function browse(opts: { q?: string; genres?: number[]; status?: string; page?: number }): Promise<BrowseResult> { const params = new URLSearchParams(); if (opts.q) params.set('q', opts.q); if (opts.status) params.set('status', opts.status); if (opts.page) params.set('page', String(opts.page)); for (const g of opts.genres ?? []) params.append('genres[]', String(g)); return apiFetch<BrowseResult>(`/api/mobile/browse?${params.toString()}`); }
export interface AnimeDetail { id: number; title: string; titleJapanese: string | null; image: string; synopsis: string; score: number | null; status: string; type: string; genres: { id: number; name: string }[]; totalEpisodes: number; airedSoFar: number | null; isAiring: boolean; dubbedLangs: string[]; related: { id: number; title: string; type: string }[]; }
export function getAnimeDetail(id: number): Promise<{ success: boolean; anime: AnimeDetail; userEntry: any; isFavorite: boolean }> { return apiFetch(`/api/mobile/anime/${id}`); }
export interface EpisodeItem { mal_id?: number; episode?: number; title?: string; aired?: string | null; score?: number | null; filler?: boolean; recap?: boolean; [key: string]: unknown; }
export function getEpisodes(id: number, page = 1): Promise<{ success: boolean; data: EpisodeItem[]; pagination: any }> { return apiFetch(`/api/mobile/anime/${id}/episodes?page=${page}`); }

// Art and episode stills are served by the private AniVault scraper service.
// Keep the response handling tolerant because the scraper intentionally merges
// MAL/TMDB/Kitsu/AniList art into a few compatible shapes.
export interface ScraperAnimeArt {
  poster?: string;
  image?: string;
  cover?: string;
  banner?: string;
  logo?: string;
  [key: string]: unknown;
}

export function getScraperAnimeArt(id: number): Promise<ScraperAnimeArt> {
  return apiFetchScraper<ScraperAnimeArt>(`/api/anime?malId=${encodeURIComponent(String(id))}`);
}

export function scraperPoster(art: any): string {
  return art?.poster ?? art?.image ?? art?.images?.poster ?? art?.data?.poster ?? art?.data?.image ?? '';
}

export function scraperBanner(art: any): string {
  return art?.banner ?? art?.cover ?? art?.backdrop ?? art?.coverImage ?? art?.images?.banner ?? art?.images?.cover ?? art?.data?.banner ?? art?.data?.cover ?? art?.data?.backdrop ?? art?.data?.coverImage ?? '';
}

export function scraperLogo(art: any): string {
  return art?.logo ?? art?.images?.logo ?? art?.data?.logo ?? '';
}

export interface ScraperEpisodeResult {
  thumbnail?: string;
  image?: string;
  image_url?: string;
  episode?: { thumbnail?: string; image?: string; image_url?: string; [key: string]: unknown };
  data?: { thumbnail?: string; image?: string; image_url?: string; episode?: { thumbnail?: string; image?: string; image_url?: string }; [key: string]: unknown };
  [key: string]: unknown;
}

export function scraperEpisodeThumbnail(result: any): string {
  return result?.thumbnail ?? result?.image ?? result?.image_url ?? result?.episode?.thumbnail ?? result?.episode?.image ?? result?.episode?.image_url ?? result?.data?.thumbnail ?? result?.data?.image ?? result?.data?.image_url ?? result?.data?.episode?.thumbnail ?? result?.data?.episode?.image ?? result?.data?.episode?.image_url ?? '';
}

export async function getScraperEpisodeThumbnail(id: number, episode: number): Promise<string> {
  const result = await apiFetchScraper<ScraperEpisodeResult>(`/api/episode?malId=${encodeURIComponent(String(id))}&ep=${encodeURIComponent(String(episode))}`);
  return scraperEpisodeThumbnail(result);
}

export interface MalAnimeDetail { id: number; title: string; main_picture?: { medium?: string; large?: string }; synopsis?: string; mean?: number; status?: string; num_episodes?: number; media_type?: string; start_date?: string; end_date?: string; genres?: Array<{ id: number; name: string }>; related_anime?: unknown[]; }
export interface MalEpisodesResult { data: Array<{ node: { id: number; title: string; synopsis?: string; airing_at?: string | null; score?: number | null; length?: number | null; }; }>; paging?: { next?: string }; }

export function getMalAnime(id: number): Promise<MalAnimeDetail> {
  return malFetch(`/anime/${encodeURIComponent(String(id))}?fields=id,title,main_picture,synopsis,mean,status,num_episodes,media_type,start_date,end_date,genres,related_anime`);
}

export function getMalEpisodes(id: number, limit = 100): Promise<MalEpisodesResult> {
  return malFetch(`/anime/${encodeURIComponent(String(id))}/episodes?limit=${Math.min(100, Math.max(1, limit))}`);
}

export interface EpisodeThumbnail { anime_id: number; episode_num: number; image_url: string; }
export function getEpisodeThumbnails(id: number): Promise<{ success: boolean; overrides: EpisodeThumbnail[]; total_eps?: number }> { return apiFetch(`/api/episode_override.php?anime_id=${id}&all=1`); }

export interface PlaybackResult {
  embedUrl?: string;
  m3u8?: string;
  hlsProxyUrl?: string;
  playbackMode?: 'hls' | 'mp4' | 'embed' | string;
  videoUrl?: string;
  streamUrl?: string;
  url?: string;
  subtitles?: Array<{ url?: string; src?: string; label?: string; lang?: string; [key: string]: unknown }>;
  server?: string;
  availableServers?: Array<{ name?: string; server?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export function getPlayback(malId: number, episode: number, language: 'sub' | 'dub', source = 'anizone'): Promise<PlaybackResult> {
  const path = `/api/watch/${encodeURIComponent(source)}/mal-${encodeURIComponent(String(malId))}/${encodeURIComponent(String(episode))}/${encodeURIComponent(language)}`;
  return apiFetchScraper<PlaybackResult>(path);
}

export function toggleFavorite(animeId: number, title: string, image: string): Promise<{ success: boolean; favorited: boolean }> { return apiFetchForm('/api/list.php', { action: 'favorite', anime_id: String(animeId), anime_title: title, anime_image: image }); }
export interface MiniAnimeCard { id: number; title: string; image: string; score: number | null; type: string; episodes: number; }
export interface HomeContinueItem { animeId: number; title: string; image: string; episodeNum: number; epTitle: string | null; epThumb: string | null; watchTime: number; episodeDuration: number; }
export function getHome(): Promise<{ success: boolean; seasonal: MiniAnimeCard[]; top: MiniAnimeCard[]; upcoming: MiniAnimeCard[]; watchNow: MiniAnimeCard[]; continueWatching: HomeContinueItem[] }> { return apiFetch('/api/mobile/home'); }
export interface ScheduleItem extends MiniAnimeCard { status?: string; broadcast: { day: string | null; time: string | null; timezone?: string | null }; airedInfo: { aired: number; total: number | null } | null; dubbedLangs: string[]; userStatus: string | null; }
export function getSchedule(day?: string): Promise<{ success: boolean; day: string; data: ScheduleItem[] }> { const query = day ? `?day=${encodeURIComponent(day)}` : ''; return apiFetch(`/api/mobile/schedule${query}`); }
export function getWatchNow(page = 1): Promise<{ success: boolean; data: MiniAnimeCard[]; page: number; totalPages: number }> { return apiFetch(`/api/mobile/watch-now?page=${page}`); }
export interface HistoryItem { animeId: number; title: string; image: string; episodeNum: number; epTitle: string | null; epThumb: string | null; watchedAt: string; watchTime: number; episodeDuration: number; }
export function getHistory(page = 1): Promise<{ success: boolean; data: HistoryItem[]; page: number; totalPages: number }> { return apiFetch(`/api/mobile/history?page=${page}`); }
export interface Announcement { id: number; title: string; content: string; imageUrl: string | null; createdAt: string; }
export function getAnnouncements(): Promise<{ success: boolean; data: Announcement[] }> { return apiFetch('/api/mobile/announcements'); }
export interface CharacterDetail { id: number; name: string; nameKanji: string | null; nicknames: string[]; about: string | null; favorites: number; image: string; }
export function getCharacter(id: number): Promise<{ success: boolean; character: CharacterDetail; animeography: { animeId: number; title: string; image: string; role: string }[]; voices: { name: string; image: string; language: string }[] }> { return apiFetch(`/api/mobile/character/${id}`); }
export function getAnimeCharacters(id: number): Promise<{ success: boolean; data: { id: number; name: string; image: string; role: string }[] }> { return apiFetch(`/api/mobile/anime/${id}/characters`); }