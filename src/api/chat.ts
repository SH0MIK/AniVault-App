// Global chat — a plain REST poll-based API (no WebSocket/Durable Object),
// so the app just polls the same /api/chat action-dispatch endpoint the
// website uses. Zero backend changes needed.
import { apiFetch, apiFetchForm } from './client';

export const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export interface ChatMessage {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  role: string;
  avatar_badge: 'OWNER' | 'ADMIN' | null;
  message: string;
  time: string;
  ts: number;
  mine: boolean;
  can_delete: boolean;
  reactions: { emoji: string; count: number; mine: boolean }[];
  reply_to: { id: number; username: string | null; message: string | null } | null;
}

export function getChatMessages(beforeId?: number): Promise<{ success: boolean; messages: ChatMessage[]; latest_id: number }> {
  return apiFetch(`/api/chat?action=get${beforeId ? `&before_id=${beforeId}` : ''}`);
}

export function pollChatMessages(afterId: number): Promise<{ success: boolean; messages: ChatMessage[]; latest_id: number }> {
  return apiFetch(`/api/chat?action=poll&after_id=${afterId}`);
}

export function sendChatMessage(message: string, replyTo?: number): Promise<{ success: boolean; message?: ChatMessage }> {
  return apiFetchForm('/api/chat', { action: 'send', message, ...(replyTo ? { reply_to: String(replyTo) } : {}) });
}

export function deleteChatMessage(id: number): Promise<{ success: boolean }> {
  return apiFetchForm('/api/chat', { action: 'delete', id: String(id) });
}

export function reactToChatMessage(messageId: number, emoji: string): Promise<{ success: boolean; reactions: ChatMessage['reactions'] }> {
  return apiFetchForm('/api/chat', { action: 'react', message_id: String(messageId), emoji });
}

export function pingTyping(): Promise<{ success: boolean }> {
  return apiFetchForm('/api/chat', { action: 'typing' });
}

export function pingActive(): Promise<{ success: boolean }> {
  return apiFetchForm('/api/chat', { action: 'active' });
}

export function getPresence(): Promise<{ success: boolean; online: number; typing: string[] }> {
  return apiFetch('/api/chat?action=presence');
}

/** message/username/reply_to text comes back HTML-escaped (h()) since the
 *  website renders it directly into HTML — RN Text doesn't parse entities,
 *  so unescape the handful the server actually produces before display. */
export function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
}
