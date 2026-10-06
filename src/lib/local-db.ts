import type { Profile, Session, Streak } from '../types/database';

// Local fallback store keys
const STORAGE_PREFIX = 'speakcoach_';

export function safeParse<T>(raw: string | null, fallback: T, storageKey: string): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    // Corrupt payload: reset it so the app can continue with a clean store.
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Storage unavailable (private mode / disabled): ignore.
    }
    return fallback;
  }
}

export const DEFAULT_DEMO_PROFILE: Profile = {
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

export const DEFAULT_DEMO_STREAK: Streak = {
  user_id: '00000000-0000-0000-0000-000000000001',
  current_streak: 4,
  longest_streak: 9,
  last_active_date: new Date().toISOString().split('T')[0],
  freezes_left: 1,
};

export const createDemoSessions = (): Session[] => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return [
    {
      id: 'sess_hist_8',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'incident_scenario',
      technical_domain: 'soc_ir',
      started_at: new Date(now - 1 * dayMs).toISOString(),
      duration_sec: 1140,
      overall_score: 8.9,
      scores: {
        fluency: 8.8,
        grammar_vocab: 9.1,
        clarity: 9.0,
        structure: 8.8,
        technical_accuracy: 9.2,
        sentiment: 90,
        sentiment_score: 0.90,
        confidence: 91,
        fillers: 9.2,
        delivery: 8.9,
        relevance: 9.3,
      },
      summary: {
        wpm: 138,
        fillers_per_min: 1.2,
        talk_time_ratio: 0.73,
        strengths: ['Preserved volatile memory prior to host isolation', 'Articulated containment boundary clearly'],
        fixes: [{ issue: 'Minor pause on process injection API', user_said: 'VirtualAllocEx... um', better_version: 'Adversaries utilize VirtualAllocEx followed by WriteProcessMemory for DLL injection.' }],
        focus_for_next_session: 'Maintain sub-2 filler words per minute under rapid-fire questioning',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_7',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'technical_interview',
      technical_domain: 'web_security',
      started_at: new Date(now - 3 * dayMs).toISOString(),
      duration_sec: 1020,
      overall_score: 8.6,
      scores: {
        fluency: 8.5,
        grammar_vocab: 8.7,
        clarity: 8.7,
        structure: 8.6,
        technical_accuracy: 8.8,
        sentiment: 87,
        sentiment_score: 0.87,
        confidence: 88,
        fillers: 8.6,
        delivery: 8.7,
        relevance: 8.9,
      },
      summary: {
        wpm: 136,
        fillers_per_min: 1.6,
        talk_time_ratio: 0.71,
        strengths: ['Accurate differentiation between DOM XSS and Reflected XSS', 'Explained CSP nonces and sha256 hashes'],
        fixes: [{ issue: 'Vague IDOR fix definition', user_said: 'Use UUIDs so nobody guesses it', better_version: 'UUIDs do not prevent IDOR; strict server-side authorization checks against user session are mandatory.' }],
        focus_for_next_session: 'Reinforce authorization vs authentication distinctions',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_6',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'explain_to_manager',
      technical_domain: 'cloud_iam',
      started_at: new Date(now - 5 * dayMs).toISOString(),
      duration_sec: 890,
      overall_score: 8.3,
      scores: {
        fluency: 8.2,
        grammar_vocab: 8.4,
        clarity: 8.2,
        structure: 8.2,
        technical_accuracy: 8.5,
        sentiment: 83,
        sentiment_score: 0.83,
        confidence: 84,
        fillers: 8.1,
        delivery: 8.3,
        relevance: 8.5,
      },
      summary: {
        wpm: 134,
        fillers_per_min: 2.1,
        talk_time_ratio: 0.68,
        strengths: ['Zero technical acronyms in executive pitch', 'Highlighted business continuity risk to supply chain'],
        fixes: [{ issue: 'Slightly passive phrasing', user_said: 'Maybe we should consider IAM', better_version: 'We recommend implementing automated IAM least-privilege boundaries to cut cloud exposure by 80%.' }],
        focus_for_next_session: 'Adopt more decisive recommendation tone',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_5',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'technical_interview',
      technical_domain: 'networking',
      started_at: new Date(now - 7 * dayMs).toISOString(),
      duration_sec: 780,
      overall_score: 8.0,
      scores: {
        fluency: 7.9,
        grammar_vocab: 8.1,
        clarity: 8.0,
        structure: 7.8,
        technical_accuracy: 8.2,
        sentiment: 80,
        sentiment_score: 0.80,
        confidence: 81,
        fillers: 7.8,
        delivery: 7.9,
        relevance: 8.2,
      },
      summary: {
        wpm: 131,
        fillers_per_min: 2.7,
        talk_time_ratio: 0.65,
        strengths: ['Clear breakdown of TCP 3-way handshake and TCB backlog exhaustion', 'Mentioned SYN Cookies'],
        fixes: [{ issue: 'Hesitation on TLS 1.3 round trips', user_said: 'TLS takes several steps', better_version: 'TLS 1.3 reduces the handshake to 1 RTT by sending DH key shares in the initial ClientHello.' }],
        focus_for_next_session: 'Practice packet diagram walkthroughs aloud',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_4',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'gd_simulator',
      technical_domain: 'soc_ir',
      started_at: new Date(now - 9 * dayMs).toISOString(),
      duration_sec: 620,
      overall_score: 7.6,
      scores: {
        fluency: 7.5,
        grammar_vocab: 7.7,
        clarity: 7.6,
        structure: 7.4,
        technical_accuracy: 7.9,
        sentiment: 74,
        sentiment_score: 0.74,
        confidence: 75,
        fillers: 7.3,
        delivery: 7.5,
        relevance: 7.9,
      },
      summary: {
        wpm: 128,
        fillers_per_min: 3.5,
        talk_time_ratio: 0.62,
        strengths: ['Tactfully acknowledged peers before contributing', 'Kept conversation focused on Zero Trust'],
        fixes: [{ issue: 'Cut off sentence midpoint', user_said: 'And so basically... yeah', better_version: 'In summary, Zero Trust provides stronger micro-segmentation compared to legacy VPNs.' }],
        focus_for_next_session: 'Deliver crisp, concluding summary statements',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_3',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'hr_interview',
      technical_domain: 'fundamentals',
      started_at: new Date(now - 11 * dayMs).toISOString(),
      duration_sec: 480,
      overall_score: 7.2,
      scores: {
        fluency: 7.1,
        grammar_vocab: 7.2,
        clarity: 7.0,
        structure: 7.0,
        technical_accuracy: 7.5,
        sentiment: 68,
        sentiment_score: 0.68,
        confidence: 69,
        fillers: 6.9,
        delivery: 7.1,
        relevance: 7.4,
      },
      summary: {
        wpm: 122,
        fillers_per_min: 4.2,
        talk_time_ratio: 0.58,
        strengths: ['Followed STAR method for conflict resolution question', 'Demonstrated genuine enthusiasm for security'],
        fixes: [{ issue: 'Excessive filler words (um, like)', user_said: 'I was like trying to fix the firewall um', better_version: 'I systematically reviewed the perimeter firewall rule logs to identify the dropped packets.' }],
        focus_for_next_session: 'Pause silently rather than uttering "like" and "um"',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_2',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'rapid_fire',
      technical_domain: 'cybersecurity_fundamentals',
      started_at: new Date(now - 13 * dayMs).toISOString(),
      duration_sec: 380,
      overall_score: 6.9,
      scores: {
        fluency: 6.4,
        grammar_vocab: 6.8,
        clarity: 6.6,
        structure: 6.3,
        technical_accuracy: 7.0,
        sentiment: 62,
        sentiment_score: 0.62,
        confidence: 63,
        fillers: 6.4,
        delivery: 6.5,
        relevance: 7.0,
      },
      summary: {
        wpm: 114,
        fillers_per_min: 5.4,
        talk_time_ratio: 0.52,
        strengths: ['Direct definition of symmetric vs asymmetric encryption', 'Answered all 5 questions within 30s limit'],
        fixes: [{ issue: 'Said "decrypt a hash"', user_said: 'We decrypt the SHA-256 hash', better_version: 'Hashing is one-way for integrity; we compute and compare hashes rather than decrypting.' }],
        focus_for_next_session: 'Remember hashing is strictly one-way',
      },
      transcript: [],
    },
    {
      id: 'sess_hist_1',
      user_id: '00000000-0000-0000-0000-000000000001',
      mode: 'free_talk',
      technical_domain: 'fundamentals',
      started_at: new Date(now - 14 * dayMs).toISOString(),
      duration_sec: 340,
      overall_score: 6.5,
      scores: {
        fluency: 6.0,
        grammar_vocab: 6.4,
        clarity: 6.2,
        structure: 5.8,
        technical_accuracy: 6.8,
        sentiment: 55,
        sentiment_score: 0.55,
        confidence: 58,
        fillers: 5.8,
        delivery: 6.0,
        relevance: 6.8,
      },
      summary: {
        wpm: 108,
        fillers_per_min: 6.8,
        talk_time_ratio: 0.48,
        strengths: ['Completed initial baseline evaluation', 'Good conversational attitude'],
        fixes: [{ issue: 'Frequent speech hesitation and low volume', user_said: 'I am not really sure if my answer is right', better_version: 'Based on my analysis, the recommended approach is...' }],
        focus_for_next_session: 'Focus on structured top-down delivery',
      },
      transcript: [],
    },
  ];
};

function sanitizeStoredProfile(raw: string | null): Profile | null {
  const parsed = safeParse<Profile | null>(raw, null, `${STORAGE_PREFIX}profile`);
  if (!parsed) return null;
  // Legacy seed data shipped a placeholder name; clear it once.
  if (parsed.full_name === 'Alex Rivera') {
    parsed.full_name = '';
    try {
      localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }
  return parsed;
}

export const localDb = {
  getProfile(): Profile {
    const stored = sanitizeStoredProfile(localStorage.getItem(`${STORAGE_PREFIX}profile`));
    if (stored) return stored;
    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(DEFAULT_DEMO_PROFILE));
    return { ...DEFAULT_DEMO_PROFILE };
  },

  saveProfile(profile: Profile) {
    localStorage.setItem(`${STORAGE_PREFIX}profile`, JSON.stringify(profile));
  },

  getStreak(): Streak {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}streak`);
    const stored = safeParse<Streak | null>(raw, null, `${STORAGE_PREFIX}streak`);
    if (stored) return stored;
    localStorage.setItem(`${STORAGE_PREFIX}streak`, JSON.stringify(DEFAULT_DEMO_STREAK));
    return { ...DEFAULT_DEMO_STREAK };
  },

  saveStreak(streak: Streak) {
    localStorage.setItem(`${STORAGE_PREFIX}streak`, JSON.stringify(streak));
  },

  getSessions(): Session[] {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}sessions`);
    return safeParse<Session[]>(raw, [], `${STORAGE_PREFIX}sessions`);
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

  get<T>(key: string, fallback: T): T {
    return safeParse<T>(localStorage.getItem(`${STORAGE_PREFIX}${key}`), fallback, `${STORAGE_PREFIX}${key}`);
  },

  set(key: string, value: unknown) {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  },

  remove(key: string) {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  },
};

export const LOCAL_STORE_PREFIX = STORAGE_PREFIX;
