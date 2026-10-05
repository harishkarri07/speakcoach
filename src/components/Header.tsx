import React from 'react';
import { useAuth } from '../lib/auth-context';
import { Flame, Shield, Sparkles, Database, LogOut, User } from 'lucide-react';
import type { CoachingMode } from '../types/database';

interface HeaderProps {
  currentMode: CoachingMode;
  onOpenModeSelector: () => void;
  onOpenSchemaModal: () => void;
  onNewSession: () => void;
}

const MODE_LABELS: Record<CoachingMode, string> = {
  free_talk: 'Free Talk',
  technical_interview: 'Tech Interview (Cyber)',
  hr_interview: 'HR & Behavioral',
  gd_simulator: 'GD Simulator (3 peers)',
  incident_scenario: 'SOC Incident Drill',
  explain_to_manager: 'Explain to Manager',
  presentation_pitch: 'Pitch Practice',
  conversation_skills: 'Networking Skills',
  full_mock_interview: 'Full Mock Interview',
  rapid_fire: 'Rapid Fire Drill',
  redo_drill: 'Redo Weak Answer',
};

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onOpenModeSelector,
  onOpenSchemaModal,
  onNewSession,
}) => {
  const { user, profile, streak, isDemoMode, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                SpeakCoach
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  Cyber 3rd-Yr
                </span>
              </h1>
            </div>

            {/* Active Mode selector button */}
            <button
              onClick={onOpenModeSelector}
              className="group flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              title="Click to switch coaching mode"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
              <span>{MODE_LABELS[currentMode]}</span>
              <span className="text-[10px] text-slate-500 group-hover:text-slate-400 underline">Change</span>
            </button>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Session Button */}
          <button
            onClick={onNewSession}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
          >
            <span>+ New Session</span>
          </button>

          {/* Streak Counter Pill */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-medium"
            title={`${streak?.current_streak || 0} day streak! Longest: ${streak?.longest_streak || 0} days`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{streak?.current_streak || 0}d</span>
          </div>

          {/* Supabase Schema / DB Button */}
          <button
            onClick={onOpenSchemaModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition"
            title="Inspect Supabase RLS Schema & Migrations"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Schema (RLS)</span>
          </button>

          {/* Profile / Demo mode indicator */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <div 
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
              title={isDemoMode ? 'Evaluating as 3rd-year student (Harish K.)' : `Signed in as ${user?.email}`}
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600/40 border border-indigo-500/50 flex items-center justify-center text-[11px] text-indigo-200">
                {profile?.full_name ? profile.full_name[0] : 'S'}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate text-slate-200">
                {profile?.full_name || 'Student'}
              </span>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition"
              title="Sign Out / Switch Mode"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
