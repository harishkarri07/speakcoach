import React from 'react';
import { X, ShieldCheck, Copy, Check, FileText } from 'lucide-react';
import { CoachingMode, TechnicalDomain, Profile, Streak, Session } from '../types/database';
import { buildCoachSystemPrompt } from '../lib/prompt-loader';

interface PromptInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  streak: Streak | null;
  currentMode: CoachingMode;
  technicalDomain: TechnicalDomain;
  recentSessions: Session[];
}

export const PromptInspectorModal: React.FC<PromptInspectorModalProps> = ({
  isOpen,
  onClose,
  profile,
  streak,
  currentMode,
  technicalDomain,
  recentSessions,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const interpolatedPrompt = buildCoachSystemPrompt({
    profile,
    streak,
    sessionMinutes: 15,
    recentSessions,
    mode: currentMode,
    technicalDomain,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(interpolatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-950/60 p-2 text-emerald-400 border border-emerald-800/50">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">System Prompt & Placeholders</h2>
              <p className="text-xs text-zinc-400">
                Verified interpolation of user profile, streak stats, past sessions, and mode directives
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

        {/* Placeholders Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">{"{{user_name}}"}</span>
            <div className="truncate text-xs font-semibold text-white mt-0.5">
              {profile?.full_name || 'Alex'}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">{"{{streak_info}}"}</span>
            <div className="truncate text-xs font-semibold text-amber-400 mt-0.5">
              {streak?.current ? `${streak.current}d streak` : 'Fresh streak'}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">{"{{session_minutes}}"}</span>
            <div className="truncate text-xs font-semibold text-cyan-400 mt-0.5">
              15 Minutes
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">{"Mode"}</span>
            <div className="truncate text-xs font-semibold text-emerald-400 mt-0.5 capitalize">
              {currentMode.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Full prompt display */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium text-zinc-300">
              <FileText className="h-4 w-4 text-cyan-400" />
              Runtime Interpolated Prompt (Sent to Gemini 3.8 Flash):
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Full Prompt'}</span>
            </button>
          </div>
          <pre className="max-h-[380px] overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-4 text-xs font-mono leading-relaxed text-zinc-300">
            {interpolatedPrompt}
          </pre>
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
