import React from 'react';
import { X, Mic, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface VoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoicePreviewModal: React.FC<VoicePreviewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-cyan-950/60 p-2 text-cyan-400 border border-cyan-800/50">
              <Mic className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Live Voice Conversation</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-zinc-300 leading-relaxed">
          <p>
            You are currently running <b>Phase 1: Foundation and Text Chat</b>!
          </p>
          <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-3.5 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-cyan-300">
              <Sparkles className="h-4 w-4" />
              <span>Coming in Phase 2:</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Gemini 3.8 Live WebSocket real-time audio bridge</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>AudioWorklet 16kHz PCM capture + 24kHz playback queue</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Instant barge-in / speech interruption handling</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>Glowing live waveform animation & synchronized captions</span>
              </li>
            </ul>
          </div>
          <p className="text-zinc-400 text-[11px]">
            Please test Phase 1 text chat, verify the prompt loader and database schema, and confirm when you are ready to proceed to Phase 2.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <span>Back to Text Chat</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
