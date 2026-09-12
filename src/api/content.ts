
export interface DiscoveryCard extends MiniAnimeCard {
  status: string;
  rank: number | null;
  members: number;
  userStatus: string | null;
  airedInfo?: { aired: number; total: number | null } | null;
  dubbedLangs?: string[];
}
export interface SeasonalResult { success: boolean; season: 'now' | 'upcoming'; seasonName: string; year: number; data: DiscoveryCard[]; pagination: any; }
export interface TopResult { success: boolean; filter: string; data: DiscoveryCard[]; pagination: any; }
export interface ScheduleCard extends DiscoveryCard { broadcast: { day: string | null; time: string | null }; }
export interface ScheduleResult { success: boolean; day: string; data: ScheduleCard[]; }

async function cachedRequest<T>(key: string, path: string, offlineMessage: string): Promise<T> {
  try {
    const result = await apiFetch<T>(path);
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<T>(key) ?? cacheGetStale<T>(key);
    if (cached) return cached;
    throw new Error(offlineMessage);
  }
}

export function getSeasonal(season: 'now' | 'upcoming' = 'now', page = 1): Promise<SeasonalResult> {
  return cachedRequest(`seasonal:${season}:${page}`, `/api/mobile/seasonal?season=${season}&page=${page}`, 'Seasonal Anime is unavailable offline. Open it once while online to cache it.');
}

export function getTopAnime(filter = 'bypopularity', page = 1): Promise<TopResult> {
  return cachedRequest(`top:${filter}:${page}`, `/api/mobile/top?filter=${encodeURIComponent(filter)}&page=${page}`, 'Top Anime is unavailable offline. Open it once while online to cache it.');
}

export function getSchedule(day?: string): Promise<ScheduleResult> {
  const suffix = day ? `?day=${encodeURIComponent(day)}` : '';
  return cachedRequest(`schedule:${day ?? 'today'}`, `/api/mobile/schedule${suffix}`, 'Schedule is unavailable offline. Open it once while online to cache it.');
}
