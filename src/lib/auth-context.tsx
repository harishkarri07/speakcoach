import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, localDb } from './supabase';
import { DataService } from './data-service';
import { createDemoSessions } from './local-db';
import type { Profile, Session, Streak } from '../types/database';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  streak: Streak | null;
  recentSessions: Session[];
  loading: boolean;
  isDemoMode: boolean;
  accessToken: string | null;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  useDemoAccount: () => void;
  updateProfileName: (name: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile | null>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const loadDemoState = useCallback(() => {
    const prof = localDb.getProfile();
    const strk = localDb.getStreak();
    setUser({ id: prof.id, email: prof.email });
    setProfile(prof);
    setStreak(strk);
    const storedSessions = localDb.getSessions();
    setRecentSessions(storedSessions.length > 0 ? storedSessions.slice(0, 5) : createDemoSessions().slice(0, 5));
    setIsDemoMode(true);
    setAccessToken(null);
  }, []);

  /** Loads profile, streak and recent sessions for a signed-in user. */
  const loadUserData = useCallback(async (userId: string) => {
    const [userProfile, userStreak, sessions] = await Promise.all([
      DataService.getProfile(userId),
      DataService.getStreak(userId),
      DataService.getRecentSessions(userId, 5),
    ]);
    setProfile(userProfile);
    setStreak(userStreak);
    setRecentSessions(sessions);
  }, []);

  const refresh = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setAccessToken(session.access_token ?? null);
        setIsDemoMode(false);
        try {
          await loadUserData(session.user.id);
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
        return;
      }
    }
    loadDemoState();
  }, [loadDemoState, loadUserData]);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (cancelled) return;
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            setAccessToken(session.access_token ?? null);
            setIsDemoMode(false);
            await loadUserData(session.user.id);
          } else {
            loadDemoState();
          }
        } else {
          loadDemoState();
        }
      } catch (err) {
        console.error('Supabase auth init error:', err);
        if (!cancelled) loadDemoState();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          setAccessToken(session.access_token ?? null);
          setIsDemoMode(false);
          void loadUserData(session.user.id).catch((err) =>
            console.error('Failed to load user data:', err)
          );
        } else {
          setAccessToken(null);
          loadDemoState();
        }
      });
      return () => {
        cancelled = true;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [loadDemoState, loadUserData]);

  const useDemoAccount = () => {
    loadDemoState();
  };

  const signInWithEmail = async (email: string): Promise<{ error: string | null }> => {
    if (!isValidEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      // In local mode, treat as successful login
      const prof = localDb.getProfile();
      prof.email = email;
      localDb.saveProfile(prof);
      setProfile({ ...prof });
      setUser({ id: prof.id, email });
      setIsDemoMode(true);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return { error: message };
    }
  };

  const signUpWithEmail = async (email: string): Promise<{ error: string | null }> => {
    return signInWithEmail(email);
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    loadDemoState();
  };

  const updateProfileName = (name: string) => {
    if (!profile) return;
    const updated = { ...profile, full_name: name };
    setProfile(updated);
    localDb.saveProfile(updated);
  };

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<Profile | null> => {
      const targetId = updates.id || profile?.id || user?.id;
      if (!targetId) return null;
      try {
        const updated = await DataService.updateProfile({ id: targetId, ...updates });
        setProfile(updated);
        return updated;
      } catch (err) {
        console.error('Failed to update profile:', err);
        return null;
      }
    },
    [profile?.id, user?.id]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        streak,
        recentSessions,
        loading,
        isDemoMode,
        accessToken,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        useDemoAccount,
        updateProfileName,
        updateProfile,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      profile: null,
      streak: null,
      recentSessions: [] as Session[],
      loading: false,
      isDemoMode: true,
      accessToken: null,
      signInWithEmail: async () => ({ error: null }),
      signUpWithEmail: async () => ({ error: null }),
      signOut: async () => {},
      useDemoAccount: () => {},
      updateProfileName: () => {},
      updateProfile: async () => null,
      refresh: async () => {},
    };
  }
  return context;
};
