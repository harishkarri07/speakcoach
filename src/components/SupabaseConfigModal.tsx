import React, { useState } from 'react';
import { X, Database, Copy, Check, ShieldCheck, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsUpdated: () => void;
}

const SQL_MIGRATION_SNIPPET = `-- SpeakCoach Supabase Schema Migration (Full PostgreSQL + RLS)
-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT DEFAULT 'Student',
    college_year TEXT DEFAULT '3rd Year',
    domain_focus TEXT DEFAULT 'Cybersecurity & SOC',
    target_role TEXT DEFAULT 'Security Analyst / Consultant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'free_talk',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_sec INTEGER DEFAULT 0,
    overall_score NUMERIC(4, 1),
    scores JSONB DEFAULT '{}'::jsonb,
    summary JSONB DEFAULT '{}'::jsonb,
    transcript JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    text TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Streaks Table
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current INTEGER NOT NULL DEFAULT 0,
    longest INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    freezes_left INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Rewards Table
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    streak_required INTEGER DEFAULT 0,
    milestone_type TEXT DEFAULT 'streak',
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Reward Wallet Table
CREATE TABLE IF NOT EXISTS public.reward_wallet (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    gems INTEGER NOT NULL DEFAULT 0,
    unlocked_badges JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Daily Plan Table
CREATE TABLE IF NOT EXISTS public.daily_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_audio BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_voice TEXT NOT NULL DEFAULT 'Zephyr',
    session_length_minutes INTEGER NOT NULL DEFAULT 15,
    theme TEXT NOT NULL DEFAULT 'dark',
    vocal_variety_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Sessions
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

-- Policies for Messages
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- Policies for Streaks & Settings
CREATE POLICY "Users can manage own streaks" ON public.streaks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own rewards" ON public.rewards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wallet" ON public.reward_wallet FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own plan" ON public.daily_plan FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);
`;

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onCredentialsUpdated,
}) => {
  const [url, setUrl] = useState(supabaseUrl);
  const [key, setKey] = useState(supabaseAnonKey);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      localStorage.setItem('speakcoach_supabase_url', url.trim());
    } else {
      localStorage.removeItem('speakcoach_supabase_url');
    }

    if (key.trim()) {
      localStorage.setItem('speakcoach_supabase_key', key.trim());
    } else {
      localStorage.removeItem('speakcoach_supabase_key');
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onCredentialsUpdated();
      onClose();
    }, 800);
  };

  const handleResetToLocalMode = () => {
    localStorage.removeItem('speakcoach_supabase_url');
    localStorage.removeItem('speakcoach_supabase_key');
    setUrl('');
    setKey('');
    onCredentialsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-950/60 p-2 text-emerald-400 border border-emerald-800/50">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Database & Supabase RLS</h2>
              <p className="text-xs text-zinc-400">
                PostgreSQL schema, Row Level Security policies, and connection settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Connection Status Banner */}
          <div
            className={`rounded-xl border p-4 ${
              isSupabaseConfigured
                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                : 'border-amber-500/30 bg-amber-950/15 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-3">
              {isSupabaseConfigured ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              )}
              <div className="text-xs space-y-1">
                <div className="font-semibold text-white">
                  {isSupabaseConfigured ? 'Supabase Backend Connected' : 'Local Fallback Storage Active'}
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {isSupabaseConfigured
                    ? 'All user authentication, session transcripts, streaks, and settings are syncing with PostgreSQL and protected by Row-Level Security (RLS).'
                    : 'SpeakCoach is currently running in zero-friction Local Mode with browser persistence. You can connect your Supabase project at any time below.'}
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Copy SQL Migration */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">1. Database Migration (SQL)</h3>
                <p className="text-xs text-zinc-400">
                  Run this in your Supabase SQL Editor to provision tables and RLS rules.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-800/50 bg-cyan-950/50 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            <pre className="max-h-36 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-[11px] font-mono text-zinc-300 border border-zinc-800/80">
              {SQL_MIGRATION_SNIPPET}
            </pre>
          </div>

          {/* Step 2: Supabase Credentials Form */}
          <form onSubmit={handleSaveCredentials} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">2. Project Credentials</h3>
              <p className="text-xs text-zinc-400">
                Found in your Supabase Dashboard under <b>Project Settings → API</b>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Project URL (e.g. https://xyzcompany.supabase.co)
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Anon / Public Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetToLocalMode}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Clear credentials (use Local Mode)
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950"
              >
                {savedSuccess ? <Check className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                <span>{savedSuccess ? 'Saved & Applied!' : 'Save Credentials'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end border-t border-zinc-800/80 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
