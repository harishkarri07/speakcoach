import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, localDb } from './supabase';
import type { Profile, Streak } from '../types/database';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  streak: Streak | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  useDemoAccount: () => void;
  updateProfileName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            setIsDemoMode(false);
            // Fetch profile
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (prof) setProfile(prof as Profile);

            // Fetch streak
            const { data: strk } = await supabase
              .from('streaks')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            if (strk) setStreak(strk as Streak);
          } else {
            // Default to demo student for evaluation
            loadDemoState();
          }
        } catch (err) {
          console.error('Supabase auth init error:', err);
          loadDemoState();
        }
      } else {
        loadDemoState();
      }
      setLoading(false);
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          setIsDemoMode(false);
        } else {
          loadDemoState();
        }
      });
      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  function loadDemoState() {
    const prof = localDb.getProfile();
    const strk = localDb.getStreak();
    setUser({ id: prof.id, email: prof.email });
    setProfile(prof);
    setStreak(strk);
    setIsDemoMode(true);
  }

  const useDemoAccount = () => {
    loadDemoState();
  };

  const signInWithEmail = async (email: string): Promise<{ error: string | null }> => {
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
    } catch (err: any) {
      return { error: err?.message || 'Login failed' };
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        streak,
        loading,
        isDemoMode,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        useDemoAccount,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
