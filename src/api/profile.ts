import { apiFetch } from './client';
import { cacheGet, cacheGetStale, cachePut } from '../db/cache';

export interface ProfileBundle {
  success: boolean;
  user: {
    id: number; username: string; email: string; avatarUrl: string | null; bio: string | null;
    role: string; hasGoogle: boolean; hasDiscord: boolean; hasPassword: boolean;
  };
  stats: { watching: number; completed: number; plan_to_watch: number; dropped: number; on_hold: number; total_episodes: number; avg_score: number; total: number };
  badges: { id: number; name: string; description: string | null; iconText: string | null; imageUrl: string | null; color: string }[];
  favorites: { animeId: number; title: string; image: string }[];
  followerCount: number;
  followingCount: number;
}

export async function getMyProfile(): Promise<ProfileBundle> {
  const key = 'profile:me';
  try {
    const result = await apiFetch<ProfileBundle>('/api/mobile/profile');
    cachePut(key, result);
    return result;
  } catch {
    const cached = cacheGet<ProfileBundle>(key) ?? cacheGetStale<ProfileBundle>(key);
    if (cached) return cached;
    throw new Error('Profile is unavailable offline. Open your profile once while online to cache it.');
  }
}
