export const COACHING_MODES = [
  'free_talk',
  'technical_interview',
  'hr_interview',
  'gd_simulator',
  'incident_scenario',
  'explain_to_manager',
  'presentation_pitch',
  'conversation_skills',
  'full_mock_interview',
  'rapid_fire',
  'redo_drill',
] as const;

export type CoachingMode = (typeof COACHING_MODES)[number];

export const TECHNICAL_DOMAINS = [
  'fundamentals',
  'cybersecurity_fundamentals',
  'networking',
  'web_security',
  'soc_ir',
  'offensive_basics',
  'cloud_iam',
  'grc',
] as const;

export type TechnicalDomain = (typeof TECHNICAL_DOMAINS)[number];

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  college_year?: string;
  domain_focus?: string;
  target_role?: string;
  target_roles?: string[];
  coach_tone?: 'supportive' | 'strict' | 'realistic' | 'executive';
  pacing_preference?: 'normal' | 'deliberate' | 'rapid';
  filler_strictness?: 'relaxed' | 'balanced' | 'strict';
  created_at?: string;
  updated_at?: string;
}

export interface TranscriptItem {
  speaker: 'user' | 'coach';
  text: string;
  timestamp: string; // ISO string
  duration_sec?: number;
}

export interface SessionScores {
  clarity?: number;
  structure?: number;
  fluency?: number;
  fillers?: number;
  grammar_vocab?: number;
  delivery?: number;
  technical_accuracy?: number;
  confidence?: number;
  relevance?: number;
  sentiment?: number;
  sentiment_score?: number;
}

export interface FixItem {
  issue: string;
  user_said: string;
  better_version: string;
}

export interface SessionSummary {
  strengths?: string[];
  fixes?: FixItem[];
  weakest_answer?: string;
  new_phrases?: string[];
  topics_covered?: string[];
  focus_for_next_session?: string;
  wpm?: number;
  fillers_per_min?: number;
  talk_time_ratio?: number;
}

export interface Session {
  id: string;
  user_id: string;
  mode: CoachingMode;
  technical_domain?: TechnicalDomain;
  started_at: string;
  ended_at?: string;
  duration_sec: number;
  overall_score?: number;
  scores: SessionScores;
  summary: SessionSummary;
  transcript: TranscriptItem[];
  created_at?: string;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date?: string;
  freezes_left: number;
  updated_at?: string;
}

export interface Reward {
  id: string;
  title: string;
  description?: string;
  streak_required: number;
  xp_value: number;
  created_at?: string;
}

export interface RewardWallet {
  id: string;
  user_id: string;
  reward_id?: string;
  custom_title?: string;
  claimed_at: string;
  status: 'claimed' | 'redeemed' | 'pending';
}

export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string;
  plan_data: {
    warmup_done: boolean;
    vocab_done: boolean;
    core_drill_done: boolean;
    live_conversation_done: boolean;
    review_done: boolean;
  };
  is_completed: boolean;
  updated_at?: string;
}

export interface Settings {
  user_id: string;
  store_audio: boolean; // default OFF
  preferred_session_minutes?: number; // canonical practice duration
  session_length_minutes?: number; // legacy alias for backward compatibility
  preferred_voice: string;
  target_domains?: string[];
  theme?: string;
  vocal_variety_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserSettings = Settings;

