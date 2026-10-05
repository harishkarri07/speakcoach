import React, { useState } from 'react';
import { X, Copy, Check, Database, Shield, FileText } from 'lucide-react';

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaViewerModal: React.FC<SchemaViewerModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'prompt' | 'security'>('sql');

  if (!isOpen) return null;

  const sqlCode = `-- SpeakCoach Supabase Schema & Row-Level Security Policies
-- Run this in Supabase SQL Editor:

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT 'Student',
    college_year TEXT DEFAULT '3rd Year',
    target_roles TEXT[] DEFAULT ARRAY['Security Analyst', 'SOC Analyst', 'Penetration Tester'],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'free_talk',
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_sec INTEGER DEFAULT 0 NOT NULL,
    overall_score NUMERIC(4, 1),
    scores JSONB DEFAULT '{}'::jsonb,
    summary JSONB DEFAULT '{}'::jsonb,
    transcript JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON public.sessions FOR ALL USING (auth.uid() = user_id);

-- 3. Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    text TEXT NOT NULL,
    ts TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));
CREATE POLICY "Users insert own messages" ON public.messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid()));

-- 4. Streaks
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    freezes_left INTEGER DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own streak" ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- 5. Rewards & Wallet
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    streak_required INTEGER NOT NULL,
    xp_value INTEGER DEFAULT 100
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view rewards" ON public.rewards FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.reward_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
    custom_title TEXT,
    claimed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'claimed'
);
ALTER TABLE public.reward_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wallet" ON public.reward_wallet FOR ALL USING (auth.uid() = user_id);

-- 6. Daily Plan & Settings
CREATE TABLE IF NOT EXISTS public.daily_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_data JSONB NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(user_id, plan_date)
);
ALTER TABLE public.daily_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage daily plan" ON public.daily_plan FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_audio BOOLEAN DEFAULT false NOT NULL, -- DEFAULT OFF for privacy
    preferred_session_minutes INTEGER DEFAULT 15 NOT NULL,
    preferred_voice TEXT DEFAULT 'Zephyr' NOT NULL,
    target_domains TEXT[] DEFAULT ARRAY['soc_ir', 'web_security']
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Database Schema & Security Architecture</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase SQL & RLS</span>
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'prompt'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Prompt Loader</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>SECURITY.md Summary</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs font-mono text-slate-300 bg-slate-950/80">
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-sans">
                <span className="text-slate-400">Complete SQL migration with Row Level Security (RLS)</span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition font-mono text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied SQL' : 'Copy Migration SQL'}</span>
                </button>
              </div>
              <pre className="whitespace-pre overflow-x-auto text-[11px] leading-relaxed text-slate-300 p-4 rounded-xl bg-slate-900 border border-slate-800">
                {sqlCode}
              </pre>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-3 font-sans text-xs">
              <h3 className="font-semibold text-white">Dynamic Coach Prompt Injection</h3>
              <p className="text-slate-400 leading-relaxed">
                The server automatically loads <code className="text-cyan-300">coach-system-prompt.md</code> and injects real database context before sending prompts to Gemini 3.8 Flash:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li><code className="text-cyan-400">{`{{user_name}}`}</code> — Injected from user profile</li>
                <li><code className="text-cyan-400">{`{{session_minutes}}`}</code> — Target practice window (default 15m)</li>
                <li><code className="text-cyan-400">{`{{progress_context}}`}</code> — Aggregated weakest past answers, filler counts, and recent metrics</li>
                <li><code className="text-cyan-400">{`{{streak_info}}`}</code> — Day streak counter and freeze protection status</li>
              </ul>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3 font-sans text-xs">
              <h3 className="font-semibold text-white">Security & Threat Mitigation Checklist</h3>
              <div className="space-y-2 text-slate-300">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">✓ Server-Side Key Isolation</strong>
                  The Gemini API key exists strictly in <code className="text-slate-300">server.ts</code>. Client bundles never receive or request the key.
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">✓ Untrusted Model Output Handling</strong>
                  All model output is treated as untrusted and rendered solely as text, preventing script injection or XSS.
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">✓ Audio Storage Default OFF</strong>
                  In accordance with privacy requirements, <code className="text-slate-300">store_audio: false</code> is enforced by default.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/60 font-sans">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
