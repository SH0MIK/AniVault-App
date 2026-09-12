// App-wide auth state. Wraps the /api/mobile/* endpoints and keeps the
// current user + token-validity in React state so screens can just call
// useAuth() instead of each re-implementing login/logout/session-check.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { apiFetch, getToken, setToken, clearToken, setUnauthorizedHandler } from '../api/client';
import { fullSync } from '../db/sync';
import { registerForPushNotifications } from '../api/push';

const SITE_URL = 'https://anivault.co';

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
  isLoading: boolean; // true only during the initial launch check
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithOAuth: (provider: 'google' | 'discord') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AniVaultUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Shared by password login, sign-up, and the OAuth deep-link callback —
  // all three end with "we have a token, adopt it as the logged-in user".
  const adoptToken = useCallback(async (token: string) => {
    await setToken(token);
    const res = await apiFetch<{ success: boolean; user: AniVaultUser }>('/api/mobile/me');
    setUser(res.user);
    fullSync(res.user.id).catch(() => {});
    registerForPushNotifications().catch(() => {});
  }, []);

  // Google/Discord login happens in a real browser (OAuth can't happen in a
  // fetch call) — the backend's callback redirects to this app's custom URL
  // scheme with the resulting session id as a token once it's done. See
  // /api/mobile/oauth-start and the oauth_google.php/oauth_discord.php
  // changes on the backend.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const { hostname, queryParams } = Linking.parse(url);
      if (hostname === 'oauth-callback' && typeof queryParams?.token === 'string') {
        adoptToken(queryParams.token).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [adoptToken]);

  const loginWithOAuth = useCallback((provider: 'google' | 'discord') => {
    Linking.openURL(`${SITE_URL}/api/mobile/oauth-start?provider=${provider}`).catch(() => {});
  }, []);

  // On app launch: if we have a stored token, verify it's still valid
  // server-side (the user may have logged out elsewhere, or it expired)
  // rather than trusting it blindly and only finding out on first API call.
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
      const res = await apiFetch<{ success: boolean; token: string; message?: string }>(
        '/api/mobile/login',
        { method: 'POST', body: { username, password }, auth: false }
      );
      await adoptToken(res.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [adoptToken]);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const res = await apiFetch<{ success: boolean; token: string; message?: string }>(
        '/api/mobile/register',
        { method: 'POST', body: { username, email, password }, auth: false }
      );
      await adoptToken(res.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [adoptToken]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/mobile/logout', { method: 'POST' });
    } catch {
      // token may already be invalid server-side — clear locally regardless
    }
    await clearToken();
    setUser(null);
  }, []);

  // Registered once so a 401 anywhere in the app (expired token, logged out
  // from another device, etc) drops back to the login screen instead of
  // leaving stale screens up against a session that no longer works.
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
