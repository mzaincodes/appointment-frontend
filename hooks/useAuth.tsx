'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService, tokenStorage, ApiError } from '@/services';
import type { User } from '@/types';

/**
 * Authentication state.
 *
 * A single context holds the signed-in user. It is the only global state in the
 * app — everything else (slots, appointments, chat) is fetched where it is
 * used, because sharing it globally would buy nothing and make staleness a
 * problem.
 *
 * On mount the stored token is verified against `/auth/me` rather than trusted.
 * Decoding it client-side would show a stale name or role after a change, and a
 * revoked account would still appear signed in.
 */

interface AuthContextValue {
  user: User | null;
  /** True until the initial session check finishes — gates protected routes. */
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<{ user: User; claimedAppointments: number }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: { name?: string; phone?: string | null }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadSession = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: profile } = await authService.me();
      setUser(profile);
    } catch (error) {
      // A 401 means the token is expired or revoked; the client already
      // cleared it. Anything else (server down) should not sign the user out —
      // they may simply be offline for a moment.
      if (error instanceof ApiError && error.isUnauthorized) {
        tokenStorage.clear();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  /**
   * Keeps tabs in sync.
   *
   * Signing out in one tab should not leave another showing a signed-in header.
   * The `storage` event fires only in *other* tabs, which is exactly what we
   * want.
   */
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'bsds.token') void loadSession();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    tokenStorage.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const result = await authService.register(input);
      tokenStorage.set(result.token);
      setUser(result.user);
      return {
        user: result.user,
        claimedAppointments: result.claimedAppointments,
      };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The local session must be cleared regardless of whether the server
      // acknowledged — a network error should never trap someone signed in.
    }
    tokenStorage.clear();
    // Drop the conversation pointer too, so the next person to use this browser
    // does not land in the previous patient's chat. The transcript itself stays
    // in the database, and signing back in resumes it.
    try {
      window.localStorage.removeItem('bsds.chatSession');
    } catch {
      /* private browsing */
    }
    setUser(null);
    router.push('/');
  }, [router]);

  const updateProfile = useCallback(async (input: { name?: string; phone?: string | null }) => {
    const { user: updated } = await authService.updateProfile(input);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
      refresh: loadSession,
      updateProfile,
    }),
    [user, loading, login, register, logout, loadSession, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
