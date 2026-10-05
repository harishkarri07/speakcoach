import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile, Session, Message, Streak } from '../types/database';

function formatSupabaseUrl(input: string): string {
  if (!input) return '';
  input = input.trim();
  if (input.startsWith('https://') || input.startsWith('http://')) {
    return input;
  }
  // If user passed only project ref e.g. rocuawjytscomuhmfyxg
  return `https://${input}.supabase.co`;
}

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || localStorage.getItem('speakcoach_supabase_url') || '';
export const supabaseUrl = formatSupabaseUrl(rawUrl);
export const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('speakcoach_supabase_key') || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-id')
);

let clientInstance: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    clientInstance = null;
  }
}

export const supabase: SupabaseClient | null = clientInstance;

// Local fallback store keys
const STORAGE_PREFIX = 'speakcoach_';

const DEFAULT_DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: {},
  user_metadata: { full_name: '' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: '',
};

const DEFAULT_DEMO_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: '',
  full_name: '',
  college_year: '3rd Year B.Tech',
  domain_focus: 'Cybersecurity & SOC Operations',
  target_role: 'Associate Security Analyst',
  coach_tone: 'realistic',
  pacing_preference: 'normal',
  filler_strictness: 'balanced',
};

const DEFAULT_DEMO_STREAK: Streak = {
  user_id: '00000000-0000-0000-0000-000000000001',
  current: 4,
  current_streak: 4,
  longest: 9,
  longest_streak: 9,
  last_active_date: new Date().toISOString().split('T')[0],
  freezes_left: 1,
};

export const localDb = {
  getProfile(): Profile {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}profile`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.full_name === 'Alex Rivera') {
          parsed.full_name = '';
          localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) { /* ignore */ }
    }
    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(DEFAULT_DEMO_PROFILE));
    return DEFAULT_DEMO_PROFILE;
  },

  saveProfile(profile: Profile) {
    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(profile));
  },

  getStreak(): Streak {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}streak`);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* ignore */ }
    }
    localStorage.setItem(`${STORAGE_PREFIX}streak`, JSON.stringify(DEFAULT_DEMO_STREAK));
    return DEFAULT_DEMO_STREAK;
  },

  saveStreak(streak: Streak) {
    localStorage.setItem(`${STORAGE_PREFIX}streak`, JSON.stringify(streak));
  },

  getSessions(): Session[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}sessions`);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* ignore */ }
    }
    return [];
  },

  saveSession(session: Session) {
    const sessions = this.getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(`${STORAGE_PREFIX}sessions`, JSON.stringify(sessions));
  },
};

export class DataService {
  static async getCurrentUser(): Promise<User | null> {
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return user;
    }
    const raw = localStorage.getItem(`${STORAGE_PREFIX}user`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
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
    localStorage.setItem(`${STORAGE_PREFIX}user`, JSON.stringify(user));
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
    localStorage.setItem(`${STORAGE_PREFIX}user`, JSON.stringify(user));
    const profile: Profile = {
      ...DEFAULT_DEMO_PROFILE,
      id: user.id,
      email,
      full_name: fullName,
    };
    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(profile));
    return { user, error: null };
  }

  static signInDemo(): User {
    localStorage.setItem(`${STORAGE_PREFIX}user`, JSON.stringify(DEFAULT_DEMO_USER));
    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(DEFAULT_DEMO_PROFILE));
    localStorage.setItem(`${STORAGE_PREFIX}streak`, JSON.stringify(DEFAULT_DEMO_STREAK));
    return DEFAULT_DEMO_USER;
  }

  static async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(`${STORAGE_PREFIX}user`);
  }

  static async getProfile(userId: string): Promise<Profile> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (!error && data) {
          const prof = data as Profile;
          if (prof.full_name === 'Alex Rivera') prof.full_name = '';
          return prof;
        }
      } catch {}
    }

    const stored = localStorage.getItem(`${STORAGE_PREFIX}profile`);
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p.full_name === 'Alex Rivera') {
          p.full_name = '';
          localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(p));
        }
        return p;
      } catch {}
    }
    return DEFAULT_DEMO_PROFILE;
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
          localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(data));
          return data as Profile;
        }
      } catch (err) {
        console.warn('Supabase upsert profile fallback to local:', err);
      }
    }

    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(updated));
    return updated;
  }

  static async getStreak(userId: string): Promise<Streak> {
    if (supabase) {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (!error && data) return data as Streak;
    }

    const stored = localStorage.getItem(`${STORAGE_PREFIX}streak`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }
    return DEFAULT_DEMO_STREAK;
  }

  static async getRecentSessions(userId: string, limit = 5): Promise<Session[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (!error && data) return data as Session[];
    }

    const stored = localStorage.getItem(`${STORAGE_PREFIX}sessions`);
    if (stored) {
      try {
        const list = JSON.parse(stored) as Session[];
        return list.slice(0, limit);
      } catch {}
    }
    return [];
  }

  static async createSession(session: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`;
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

    const stored = localStorage.getItem(`${STORAGE_PREFIX}sessions`);
    const list: Session[] = stored ? JSON.parse(stored) : [];
    list.unshift(newSession);
    localStorage.setItem(`${STORAGE_PREFIX}sessions`, JSON.stringify(list));
    return newSession;
  }

  static async saveMessage(msg: Omit<Message, 'id'>): Promise<Message> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}`;
    const newMsg: Message = { ...msg, id };

    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .insert(newMsg)
        .select()
        .single();
      if (!error && data) return data as Message;
    }

    const stored = localStorage.getItem(`${STORAGE_PREFIX}messages`);
    const list: Message[] = stored ? JSON.parse(stored) : [];
    list.push(newMsg);
    localStorage.setItem(`${STORAGE_PREFIX}messages`, JSON.stringify(list));
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

    const stored = localStorage.getItem(`${STORAGE_PREFIX}messages`);
    if (!stored) return [];
    try {
      const list: Message[] = JSON.parse(stored);
      return list.filter((m) => m.session_id === sessionId);
    } catch {
      return [];
    }
  }
}
