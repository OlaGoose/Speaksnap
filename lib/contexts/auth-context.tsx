'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';
import type { AuthContextType, User, Profile } from '@/lib/types/auth';

const AUTH_SESSION_KEY = 'speaksnap_auth_session';

function getStoredSession(): { user: User; profile: Profile } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { user: User; profile: Profile };
  } catch {
    return null;
  }
}

function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function saveSession(user: User, profile: Profile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user, profile }));
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'user@speaksnap.demo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_PROFILE: Profile = {
  id: MOCK_USER.id,
  username: 'speaksnap_user',
  display_name: 'SpeakSnap User',
  avatar_url: null,
  level: 1,
  experience: 0,
  created_at: MOCK_USER.created_at,
  updated_at: MOCK_USER.updated_at,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      setProfile(session.profile);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, _password?: string) => {
    setLoading(true);
    setError(null);
    try {
      const u: User = {
        ...MOCK_USER,
        email: email || MOCK_USER.email,
        updated_at: new Date().toISOString(),
      };
      const p: Profile = {
        ...MOCK_PROFILE,
        display_name: email ? email.split('@')[0] : MOCK_PROFILE.display_name,
        username: email ? email.split('@')[0] : MOCK_PROFILE.username,
        updated_at: new Date().toISOString(),
      };
      saveSession(u, p);
      setUser(u);
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      clearStoredSession();
      setUser(null);
      setProfile(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
