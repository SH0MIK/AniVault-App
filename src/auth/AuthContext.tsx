// App-wide auth state. Wraps the /api/mobile/* endpoints and keeps the
// current user + token-validity in React state so screens can just call
// useAuth() instead of each re-implementing login/logout/session-check.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { apiFetch, getToken, setToken, clearToken, setUnauthorizedHandler } from '../api/client';
import { fullSync } from '../db/sync';
import { registerForPushNotifications } from '../api/push';

const SITE_URL = 'https://www.anivault.co';
const OAUTH_CALLBACK_HOST = 'oauth-callback';

export interface AniVaultUser {
  id: number;
  uid: string | null;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
}

interface AuthState {
  user: AniVaultUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithOAuth: (provider: 'google' | 'discord') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AniVaultUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const finishLogin = useCallback(async (token: string, knownUser?: AniVaultUser) => {
    await setToken(token);
    // Password/register endpoints already return the complete user. Avoid an
    // unnecessary second request here; OAuth still has to resolve /me.
    const resolvedUser = knownUser ?? (await apiFetch<{ success: boolean; user: AniVaultUser }>('/api/mobile/me')).user;
    setUser(resolvedUser);
    fullSync(resolvedUser.id).catch(() => {});
    registerForPushNotifications().catch(() => {});
  }, []);

  const handleOAuthUrl = useCallback(async (url: string) => {
    const parsed = Linking.parse(url);
    if (parsed.scheme !== 'anivault' || parsed.hostname !== OAUTH_CALLBACK_HOST) return;
    const token = parsed.queryParams?.token;
    if (typeof token !== 'string' || !token) return;
    try {
      await finishLogin(token);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, [finishLogin]);

  // Handle both warm-app events and the cold-start case. The old code only
  // listened for url events, so an OAuth callback that launched the app from
  // a fully closed state was silently lost.
  useEffect(() => {
    let mounted = true;
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleOAuthUrl(url).catch(() => {});
    });
    Linking.getInitialURL().then((url) => {
      if (mounted && url) handleOAuthUrl(url).catch(() => {});
    }).catch(() => {});
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [handleOAuthUrl]);

  const loginWithOAuth = useCallback((provider: 'google' | 'discord') => {
    Linking.openURL(`${SITE_URL}/api/mobile/oauth-start?provider=${provider}`).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiFetch<{ success: boolean; user: AniVaultUser }>('/api/mobile/me');
        setUser(res.user);
        fullSync(res.user.id).catch(() => {});
        registerForPushNotifications().catch(() => {});
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await apiFetch<{ success: boolean; token: string; message?: string; user: AniVaultUser }>(
        '/api/mobile/login',
        { method: 'POST', body: { username, password }, auth: false }
      );
      await finishLogin(res.token, res.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [finishLogin]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const res = await apiFetch<{ success: boolean; token: string; message?: string; user: AniVaultUser }>(
        '/api/mobile/register',
        { method: 'POST', body: { username, email, password }, auth: false }
      );
      await finishLogin(res.token, res.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [finishLogin]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/mobile/logout', { method: 'POST' });
    } catch {}
    await clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithOAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
