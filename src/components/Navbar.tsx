import React from 'react';
import { Sparkles, Flame, Database, UserCheck, LogOut, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { CoachingMode, Profile, Streak } from '../types/database';
import { isSupabaseConfigured } from '../lib/supabase';

interface NavbarProps {
  profile: Profile | null;
  streak: Streak | null;
  currentMode: CoachingMode;
  onOpenModeSelector: () => void;
  onOpenSupabaseConfig: () => void;
  onSignOut: () => void;
  onOpenPromptInspector: () => void;
}

export const MODE_LABELS: Record<CoachingMode, { title: string; badge: string; color: string }> = {
  free_talk: { title: 'Free Talk', badge: 'Casual Flow', color: 'from-blue-500 to-indigo-500' },
  hr_interview: { title: 'HR Interview', badge: 'Behavioral & STAR', color: 'from-purple-500 to-pink-500' },
  technical_interview: { title: 'Tech Interview', badge: 'Cybersecurity', color: 'from-emerald-500 to-teal-500' },
  gd_simulator: { title: 'GD Simulator', badge: 'Multi-Participant', color: 'from-amber-500 to-orange-500' },
  incident_scenario: { title: 'Incident Response', badge: 'Crisis Room', color: 'from-rose-500 to-red-600' },
  explain_to_manager: { title: 'Explain to Manager', badge: 'Jargon-Free', color: 'from-cyan-500 to-blue-600' },
  presentation_pitch: { title: 'Pitch Practice', badge: '2-3 Min Hook', color: 'from-violet-500 to-purple-600' },
  conversation_skills: { title: 'Networking Skills', badge: 'Executive Small Talk', color: 'from-sky-500 to-indigo-600' },
  full_mock_interview: { title: 'Full Mock Exam', badge: 'Timed Assessment', color: 'from-yellow-500 to-amber-600' },
  rapid_fire: { title: 'Rapid Fire', badge: '30s Answers', color: 'from-fuchsia-500 to-rose-500' },
  redo_drill: { title: 'Redo Weak Drill', badge: 'Targeted Fixes', color: 'from-emerald-500 to-cyan-500' },
};

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  streak,
  currentMode,
  onOpenModeSelector,
  onOpenSupabaseConfig,
  onSignOut,
  onOpenPromptInspector,
}) => {
  const currentModeMeta = MODE_LABELS[currentMode] || MODE_LABELS.free_talk;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-zinc-950">
              <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base sm:text-lg">SpeakCoach</span>
              <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/50">
                CyberSec Edition
              </span>
            </div>
            <p className="hidden text-xs text-zinc-400 sm:block">
              {profile?.full_name ? `${profile.full_name} • 3rd Year` : 'AI Communication Mentor'}
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenModeSelector}
            className="group flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:border-zinc-700 hover:bg-zinc-800 focus:outline-none"
            title="Change coaching mode"
          >
            <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${currentModeMeta.color} animate-pulse`} />
            <span className="font-semibold text-white">{currentModeMeta.title}</span>
            <span className="hidden text-zinc-400 md:inline">({currentModeMeta.badge})</span>
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200" />
          </button>
        </div>

        {/* Right Actions: Streak, Supabase status, Prompt inspect, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prompt context inspector */}
          <button
            onClick={onOpenPromptInspector}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
            title="Inspect AI System Prompt & Injected Placeholders"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Prompt Rules</span>
          </button>

          {/* Practice Streak Badge */}
          <div
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400"
            title={`Active streak: ${streak?.current ?? 0} days`}
          >
            <Flame className="h-4 w-4 fill-amber-500 text-amber-500 animate-bounce" style={{ animationDuration: '2s' }} />
            <span>{streak?.current ?? 0}d</span>
          </div>

          {/* Supabase Connection Status Indicator */}
          <button
            onClick={onOpenSupabaseConfig}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              isSupabaseConfigured
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
            title={isSupabaseConfigured ? 'Supabase Connected with RLS' : 'Local Storage Mode - Click to configure Supabase'}
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{isSupabaseConfigured ? 'Supabase RLS' : 'DB / Schema'}</span>
          </button>

          {/* User Sign Out */}
          {profile && (
            <button
              onClick={onSignOut}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
