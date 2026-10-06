import type { User } from '@supabase/supabase-js';
import type { Message, Profile, Session, Streak } from '../types/database';
import { newId } from './id';
import { supabase } from './supabase-client';
import {
  DEFAULT_DEMO_PROFILE,
  DEFAULT_DEMO_STREAK,
  createDemoSessions,
  localDb,
  safeParse,
} from './local-db';

const STORE = 'speakcoach_';

const DEFAULT_DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: {},
  user_metadata: { full_name: '' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: '',
};

export class DataService {
  static async getCurrentUser(): Promise<User | null> {
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return user;
    }
    const raw = localStorage.getItem(`${STORE}user`);
    if (!raw) return null;
    return safeParse<User | null>(raw, null, `${STORE}user`);
  }

  static async signInWithEmail(email: string, password?: string): Promise<{ user: User | null; error: Error | null }> {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'speakcoach123!',
      });
      return { user: data.user, error: error ? new Error(error.message) : null };
    }

    const user: User = {
      ...DEFAULT_DEMO_USER,
      email,
      id: 'local-demo-user-id',
    };
    localStorage.setItem(`${STORE}user`, JSON.stringify(user));
    return { user, error: null };
  }

  static async signUpWithEmail(email: string, password: string, fullName: string): Promise<{ user: User | null; error: Error | null }> {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      return { user: data.user, error: error ? new Error(error.message) : null };
    }

    const user: User = {
      ...DEFAULT_DEMO_USER,
      email,
      user_metadata: { full_name: fullName },
      id: 'local-demo-user-id',
    };
    localStorage.setItem(`${STORE}user`, JSON.stringify(user));
    const profile: Profile = {
      ...DEFAULT_DEMO_PROFILE,
      id: user.id,
      email,
      full_name: fullName,
    };
    localStorage.setItem(`${STORE}profile`, JSON.stringify(profile));
    return { user, error: null };
  }

  static signInDemo(): User {
    localStorage.setItem(`${STORE}user`, JSON.stringify(DEFAULT_DEMO_USER));
    localStorage.setItem(`${STORE}profile`, JSON.stringify(DEFAULT_DEMO_PROFILE));
    localStorage.setItem(`${STORE}streak`, JSON.stringify(DEFAULT_DEMO_STREAK));
    return DEFAULT_DEMO_USER;
  }

  static async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(`${STORE}user`);
  }

  static async getProfile(userId: string): Promise<Profile> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          const prof = data as Profile;
          if (prof.full_name === 'Alex Rivera') prof.full_name = '';
          return prof;
        }
      } catch {
        // fall through to local store
      }
    }
    return localDb.getProfile();
  }

  static async updateProfile(profileUpdates: Partial<Profile> & { id: string }): Promise<Profile> {
    const existing = await this.getProfile(profileUpdates.id);
    const updated: Profile = {
      ...existing,
      ...profileUpdates,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(updated)
          .select()
          .single();
        if (!error && data) {
          localDb.saveProfile(data as Profile);
          return data as Profile;
        }
      } catch (err) {
        console.warn('Supabase upsert profile fallback to local:', err);
      }
    }

    localDb.saveProfile(updated);
    return updated;
  }

  static async getStreak(userId: string): Promise<Streak> {
    if (supabase) {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) return data as Streak;
    }
    return localDb.getStreak();
  }

  static async getRecentSessions(userId: string, limit = 50): Promise<Session[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(limit);
        if (!error && data && data.length > 0) return data as Session[];
      } catch {
        // fall through to local store
      }
    }

    const list = localDb.getSessions();
    if (list.length > 0) return list.slice(0, limit);

    const demo = createDemoSessions();
    localStorage.setItem(`${STORE}sessions`, JSON.stringify(demo));
    return demo.slice(0, limit);
  }

  static async getAllSessions(userId: string): Promise<Session[]> {
    return this.getRecentSessions(userId, 100);
  }

  static async createSession(session: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    const id = newId();
    const newSession: Session = {
      ...session,
      id,
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('sessions')
        .insert(newSession)
        .select()
        .single();
      if (!error && data) return data as Session;
    }

    const list = safeParse<Session[]>(localStorage.getItem(`${STORE}sessions`), [], `${STORE}sessions`);
    list.unshift(newSession);
    localStorage.setItem(`${STORE}sessions`, JSON.stringify(list));
    return newSession;
  }

  static async updateSession(
    sessionId: string,
    updates: Partial<Session>
  ): Promise<Session | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .maybeSingle();
      if (!error && data) return data as Session;
    }

    const list = safeParse<Session[]>(localStorage.getItem(`${STORE}sessions`), [], `${STORE}sessions`);
    const index = list.findIndex((s) => s.id === sessionId);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem(`${STORE}sessions`, JSON.stringify(list));
      return list[index];
    }
    return null;
  }

  static async saveMessage(msg: Omit<Message, 'id'> & { id?: string }): Promise<Message> {
    const id = msg.id ?? newId();
    const newMsg: Message = { ...msg, id };

    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .upsert(newMsg)
        .select()
        .single();
      if (!error && data) return data as Message;
    }

    const list = safeParse<Message[]>(localStorage.getItem(`${STORE}messages`), [], `${STORE}messages`);
    const existing = list.findIndex((m) => m.id === id);
    if (existing >= 0) {
      list[existing] = newMsg;
    } else {
      list.push(newMsg);
    }
    localStorage.setItem(`${STORE}messages`, JSON.stringify(list));
    return newMsg;
  }

  static async getMessages(sessionId: string): Promise<Message[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('ts', { ascending: true });
      if (!error && data) return data as Message[];
    }

    const list = safeParse<Message[]>(localStorage.getItem(`${STORE}messages`), [], `${STORE}messages`);
    return list.filter((m) => m.session_id === sessionId);
  }
}
