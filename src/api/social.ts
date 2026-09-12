// Public profile viewing + follow/unfollow — /api/follow.php already works
// as clean JSON over the bearer token with zero backend changes; the
// profile bundle itself needed the new /api/mobile/user/:username route
// since the website only had an HTML page for that.
import { apiFetch, apiFetchForm } from './client';

export interface PublicProfile {
  success: boolean;
  user: { id: number; username: string; avatarUrl: string | null; bio: string | null; role: string; joinedAt: string };
  stats: { watching: number; completed: number; plan_to_watch: number; dropped: number; on_hold: number; total_episodes: number; avg_score: number; total: number };
  badges: { id: number; name: string; description: string | null; iconText: string | null; imageUrl: string | null; color: string }[];
  favorites: { animeId: number; title: string; image: string }[] | null;
  followerCount: number;
  followingCount: number;
  isOwn: boolean;
  isFollowing: boolean;
  canViewFollowers: boolean;
  canViewFollowing: boolean;
}

export function getUserProfile(username: string): Promise<PublicProfile> {
  return apiFetch(`/api/mobile/user/${encodeURIComponent(username)}`);
}

export function toggleFollow(userId: number): Promise<{ success: boolean; following?: boolean; message: string }> {
  return apiFetchForm('/api/follow.php', { action: 'follow', user_id: String(userId) });
}

export interface FollowListUser {
  id: number; username: string; avatar_url: string | null; bio: string | null; created_at: string;
}

export function getFollowList(userId: number, type: 'followers' | 'following', offset = 0): Promise<{ success: boolean; users: FollowListUser[]; has_more: boolean }> {
  return apiFetch(`/api/follow.php?action=list&type=${type}&user_id=${userId}&offset=${offset}`);
}
