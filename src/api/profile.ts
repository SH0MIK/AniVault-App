import { apiFetch } from './client';

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

export function getMyProfile(): Promise<ProfileBundle> {
  return apiFetch('/api/mobile/profile');
}
