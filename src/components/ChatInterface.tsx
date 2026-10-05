import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, RotateCcw, Sparkles, User, AlertCircle } from 'lucide-react';
import type { Message, CoachingMode } from '../types/database';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
  onStopStreaming: () => void;
  onNewSession: () => void;
  currentMode: CoachingMode;
  currentDomain?: string;
  errorMessage?: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isStreaming,
  onStopStreaming,
  onNewSession,
  currentMode,
  currentDomain,
  errorMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    const textToSend = inputText.trim();
    setInputText('');
    onSendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] max-w-4xl mx-auto w-full px-2 sm:px-4 pb-3">
      {/* Mode Sub-banner */}
      <div className="py-2 px-3 my-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
          <span className="font-semibold text-slate-200">
            {currentMode === 'technical_interview'
              ? 'Technical Mock'
              : currentMode === 'hr_interview'
              ? 'HR Behavioral'
              : currentMode === 'gd_simulator'
              ? 'Group Discussion (3 Participants)'
              : currentMode === 'incident_scenario'
              ? 'SOC Incident Triage'
              : currentMode === 'explain_to_manager'
              ? 'Executive Business Pitch'
              : 'Fluency Free Talk'}
          </span>
          {currentDomain && (
            <span className="hidden md:inline px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 truncate">
              {currentDomain}
            </span>
          )}
        </div>

        <button
          onClick={onNewSession}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition"
          title="Reset transcript and start a fresh session"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 py-3 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-xl shadow-cyan-500/10">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>

            <div className="max-w-md space-y-2">
              <h2 className="text-lg font-bold text-white">Welcome to SpeakCoach</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your personal English speaking coach for technical interviews, GDs, and campus rounds.
                Start speaking or type a response below.
              </p>
            </div>

            {/* Quick starter prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg pt-2">
              {[
                'Start my technical mock on SOC incident response',
                'Simulate an HR question: "Tell me about yourself"',
                'Let\'s do a 3-person GD on AI in Cybersecurity',
                'Ask me to explain a SQL injection to an executive',
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="text-left text-xs p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition"
                >
                  {prompt} →
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 text-sm ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none leading-relaxed'
                  }`}
                >
                  {/* Security Requirement: Render strictly as text nodes, never using innerHTML */}
                  <div className="whitespace-pre-wrap break-words leading-relaxed font-normal">
                    {msg.text}
                  </div>

                  <div
                    className={`mt-1.5 text-[10px] ${
                      isUser ? 'text-blue-200' : 'text-slate-500'
                    } text-right`}
                  >
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Streaming Indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 py-1 px-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono">SpeakCoach is thinking & responding...</span>
          </div>
        )}

        {/* Error message card */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <form onSubmit={handleSubmit} className="relative pt-2">
        <div className="flex items-end gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-cyan-500/70 shadow-xl transition">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your speaking practice response (or question)..."
            disabled={isStreaming}
            className="flex-1 max-h-32 bg-transparent text-sm text-slate-100 placeholder-slate-500 px-3 py-2 outline-none resize-none disabled:opacity-50"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="p-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition flex-shrink-0"
              title="Stop streaming"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition flex-shrink-0 shadow-md shadow-cyan-500/20"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-slate-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Gemini 3.8 Flash • Server-Side API • RLS Protected</span>
        </div>
      </form>
    </div>
  );
};
