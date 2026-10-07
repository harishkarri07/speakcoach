import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, RotateCcw, Clock, Copy, Check, Sparkles, Mic, CornerDownLeft, AlertCircle, Lightbulb, Square } from 'lucide-react';
import { CoachingMode, TechnicalDomain, Session, Message, Profile, Streak } from '../types/database';
import { DataService } from '../lib/supabase';
import { readSSE } from '../lib/sse';
import { newId } from '../lib/id';
import { useAuth } from '../lib/auth-context';
import { MODE_LABELS } from './Navbar';
import { InterviewTipsPanel } from './InterviewTipsPanel';
import { DOMAIN_INTERVIEW_TIPS } from '../data/interviewTips';

interface ChatViewProps {
  currentMode: CoachingMode;
  technicalDomain: TechnicalDomain;
  profile: Profile | null;
  streak: Streak | null;
  onOpenModeSelector: () => void;
  onSwitchToVoice: () => void;
  onDomainChange?: (domain: TechnicalDomain) => void;
}

interface HistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface CoachAttempt {
  text: string;
  assistantId: string;
  history: HistoryTurn[];
}

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

function friendlyErrorFor(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;
  if (status === 401) return 'Please sign in to keep practicing with your coach.';
  if (status === 429) return 'You are sending messages too quickly. Take a breath and try again in a moment.';
  if (status === 503) return 'The coach is warming up and will be back shortly. Please try again.';
  if (status === 400) return 'That message could not be sent. Please try again.';
  return 'Coach is unavailable right now. Please try again.';
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  );
}

const FRIENDLY_GENERIC_ERROR = 'Coach is unavailable right now. Please try again.';

export const ChatView: React.FC<ChatViewProps> = ({
  currentMode,
  technicalDomain,
  profile,
  streak,
  onOpenModeSelector,
  onSwitchToVoice,
  onDomainChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isTipsPanelOpen, setIsTipsPanelOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionInitKeyRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const lastAttemptRef = useRef<CoachAttempt | null>(null);

  const { accessToken } = useAuth();

  const finalizeSession = async () => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    const durationSec = Math.max(0, Math.round((Date.now() - sessionStartedAtRef.current) / 1000));
    try {
      await DataService.updateSession(session.id, {
        ended_at: new Date().toISOString(),
        duration_sec: durationSec,
      });
    } catch {
      // Session bookkeeping must never break the chat.
    }
  };

  // One session per mode/domain combination. The cleanup aborts any in-flight
  // stream and closes the previous session (mode switch or unmount), while the
  // init key guard stops React StrictMode from creating a second session.
  useEffect(() => {
    const initKey = `${currentMode}:${technicalDomain}`;
    if (sessionInitKeyRef.current !== initKey) {
      sessionInitKeyRef.current = initKey;
      void startNewSession();
    }
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      void finalizeSession();
    };
  }, [currentMode, technicalDomain]);

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startNewSession = async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    await finalizeSession();

    setSessionSeconds(0);
    setApiError(null);
    lastAttemptRef.current = null;
    sessionStartedAtRef.current = Date.now();

    const userId = profile?.id || DEMO_USER_ID;

    const newSession = await DataService.createSession({
      user_id: userId,
      mode: currentMode,
      technical_domain: technicalDomain,
      started_at: new Date().toISOString(),
      duration_sec: 0,
      scores: {},
      summary: {},
      transcript: [],
    });

    sessionRef.current = newSession;
    setCurrentSession(newSession);

    const greetingText = getInitialGreeting(currentMode, technicalDomain, profile?.full_name);
    const initialMsg: Message = {
      id: newId(),
      session_id: newSession.id,
      user_id: userId,
      role: 'assistant',
      text: greetingText,
      ts: new Date().toISOString(),
    };

    setMessages([initialMsg]);
    await DataService.saveMessage(initialMsg);
  };

  const getInitialGreeting = (mode: CoachingMode, domain: TechnicalDomain, name?: string): string => {
    const studentName = name?.trim() ? name.trim() : '';
    const addressedName = studentName ? ` ${studentName}` : '';
    switch (mode) {
      case 'hr_interview':
        return `Hello${addressedName}! I'll be conducting your HR screening interview today. To start off on the right foot, tell me a little bit about yourself and what sparked your passion for cybersecurity?`;
      case 'technical_interview':
        return `Welcome${addressedName}. We're diving into ${domain.replace(/_/g, ' ').toUpperCase()} today. Let's start with a foundational concept: Walk me through what happens under the hood during a TLS 1.3 handshake, and how it protects data in transit compared to earlier versions?`;
      case 'gd_simulator':
        return `Welcome to the Group Discussion round. Our topic today is: "Zero Trust Architecture vs Legacy Perimeter Defense in Cloud-First Enterprises". I have Rohan and Sneha with us.${studentName ? ` ${studentName}, would you like to open the discussion?` : ' Would you like to open the discussion with your perspective?'}`;
      case 'incident_scenario':
        return `🚨 P1 Incident Alert: At 02:45 UTC, our EDR alerted on an encoded PowerShell execution on Domain Controller 01 spawning cmd.exe under NT AUTHORITY\\SYSTEM.${addressedName ? ` ${studentName}, you are Incident Lead.` : ' You are Incident Lead.'} What are your immediate containment and triage priorities?`;
      case 'explain_to_manager':
        return `Hi${addressedName}! As the VP of Operations, I keep hearing about this new "ransomware attack surface" in our supply chain. In non-technical terms, what does this actually mean for our customer shipments, and why should we allocate budget to it?`;
      case 'rapid_fire':
        return `Rapid-fire articulation round ready! 30 seconds per answer. Question 1: What is the core difference between symmetric and asymmetric encryption, and where would you use each? Go!`;
      default:
        return `Hey${addressedName}! Great to see you. How is your prep going? What's on your mind today—want to discuss a recent security topic, or just chat casually in English?`;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() || isStreaming || !currentSession) return;

    setApiError(null);
    setInputText('');
    const userId = profile?.id || DEMO_USER_ID;

    // 1. Save and display user message (UUID required by Supabase)
    const userMsg: Message = {
      id: newId(),
      session_id: currentSession.id,
      user_id: userId,
      role: 'user',
      text: rawText.trim(),
      ts: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    void DataService.saveMessage(userMsg);

    // 2. Prepare AI placeholder turn
    const assistantId = newId();
    const initialAssistantMsg: Message = {
      id: assistantId,
      session_id: currentSession.id,
      user_id: userId,
      role: 'assistant',
      text: '',
      ts: new Date().toISOString(),
    };

    setMessages([...updatedMessages, initialAssistantMsg]);

    const historyPayload: HistoryTurn[] = messages
      .slice(-10)
      .filter((m): m is Message & { role: 'user' | 'assistant' } =>
        m.role === 'user' || m.role === 'assistant'
      )
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    await streamCoachReply({ text: rawText.trim(), assistantId, history: historyPayload });
  };

  const streamCoachReply = async (attempt: CoachAttempt) => {
    const { text, assistantId, history } = attempt;
    const session = sessionRef.current || currentSession;
    if (!session || isStreaming) return;

    lastAttemptRef.current = attempt;
    const userId = profile?.id || DEMO_USER_ID;

    // Fresh controller per attempt: aborted on Stop, unmount, or mode/domain change.
    const controller = new AbortController();
    abortRef.current = controller;

    // Clear any previous failure state on the bubble before retrying.
    setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: '' } : m)));
    setApiError(null);
    setIsStreaming(true);

    let accumulatedText = '';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history,
          mode: currentMode,
          technicalDomain,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}) as Record<string, unknown>);
        const serverMessage =
          typeof errorJson.error === 'string' && errorJson.error ? errorJson.error : undefined;
        throw new Error(friendlyErrorFor(response.status, serverMessage));
      }

      for await (const event of readSSE(response, controller.signal)) {
        if (typeof event.error === 'string' && event.error) {
          throw new Error(event.error);
        }
        if (typeof event.text === 'string' && event.text) {
          accumulatedText += event.text;
          const snapshot = accumulatedText;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: snapshot } : m))
          );
        }
      }

      // Persist the final assistant message under the same id; skip empties.
      if (accumulatedText) {
        await DataService.saveMessage({
          id: assistantId,
          session_id: session.id,
          user_id: userId,
          role: 'assistant',
          text: accumulatedText,
          ts: new Date().toISOString(),
        });
      } else if (!controller.signal.aborted) {
        throw new Error(FRIENDLY_GENERIC_ERROR);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        // User pressed Stop or the session changed: keep whatever streamed.
        if (!accumulatedText) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
        return;
      }

      const message = err instanceof Error && err.message ? err.message : FRIENDLY_GENERIC_ERROR;
      setApiError(message);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: message } : m))
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleStopStream = () => {
    abortRef.current?.abort();
  };

  const handleRetry = () => {
    const attempt = lastAttemptRef.current;
    if (!attempt || isStreaming) return;
    void streamCoachReply(attempt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const currentModeMeta = MODE_LABELS[currentMode] || MODE_LABELS.free_talk;

  const SUGGESTED_PROMPTS: Record<CoachingMode, string[]> = {
    free_talk: [
      "I'm feeling a bit nervous about campus placement interviews next semester.",
      "How do you recommend balancing college assignments with cyber certifications?",
      "Can we practice polite ways to disagree during technical team meetings?",
    ],
    hr_interview: [
      "Here is my STAR response for: 'Describe a time you handled a difficult conflict in your team.'",
      "How can I structure my answer for 'Why do you want to specialize in cybersecurity rather than software development?'",
      "Let's practice a concise 90-second 'Tell me about yourself' pitch.",
    ],
    technical_interview: [
      "Explain the difference between Stored XSS, Reflected XSS, and DOM-based XSS.",
      "How does Kerberoasting work, and what is the mitigation?",
      "Ask me a question about how to detect lateral movement with Sysmon logs.",
    ],
    gd_simulator: [
      "I believe Zero Trust is an absolute necessity despite initial architectural friction.",
      "Rohan, I agree with your efficiency point, but how do we manage insider threats?",
      "Allow me to summarize the two competing perspectives on compliance vs agile development.",
    ],
    incident_scenario: [
      "Containment step 1: Isolate Domain Controller 01 from the network while preserving RAM state for forensics.",
      "Step 2: Revoke elevated Kerberos tickets and rotate KRBTGT password twice.",
      "Here is my executive summary report for the CISO on the breach scope.",
    ],
    explain_to_manager: [
      "Think of a zero-day vulnerability like an undetected flaw in our warehouse locks that burglars found first.",
      "The reason we need this budget isn't just IT software—it stops our patient records from leaking.",
      "Let me break down why multi-factor authentication saves 3 hours of downtime per week.",
    ],
    full_mock_interview: [
      "I am ready to begin the formal interview. Please ask question 1.",
      "Understood. Moving forward without feedback until completion.",
    ],
    rapid_fire: [
      "Hit me with the next rapid question!",
      "Ask me to define: Privilege Escalation, Buffer Overflow, and Defense in Depth.",
    ],
    redo_drill: [
      "Let's redo my answer about SQL injection with fewer filler words.",
      "I'm ready to restructure my answer using the top-down methodology.",
    ],
    presentation_pitch: [
      "Here is my 2-minute elevator pitch for our Automated Threat Intelligence aggregator.",
    ],
    conversation_skills: [
      "Hi! I noticed your talk on Cloud Security posture management. Could I ask your view on IaC scanning?",
    ],
  };

  const promptSuggestions = SUGGESTED_PROMPTS[currentMode] || SUGGESTED_PROMPTS.free_talk;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Main Chat Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Session Sub-header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{currentModeMeta.title}</span>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                {currentModeMeta.badge}
              </span>
              {currentMode === 'technical_interview' && (
                <span className="hidden sm:inline-block rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] text-emerald-400">
                  {technicalDomain.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Interview Tips Sidebar Toggle */}
            <button
              onClick={() => setIsTipsPanelOpen(!isTipsPanelOpen)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                isTipsPanelOpen
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
              title="Toggle domain interview tips & cheatsheet"
            >
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Interview Tips</span>
              <span className="rounded-full bg-amber-500/20 px-1 text-[9px] text-amber-300 font-bold uppercase">
                {DOMAIN_INTERVIEW_TIPS[technicalDomain]?.badge?.split(' ')[0] || 'Tips'}
              </span>
            </button>

            {/* Duration Clock */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono text-zinc-300">{formatTimer(sessionSeconds)}</span>
            </div>

            {/* New Session Button */}
            <button
              onClick={startNewSession}
              disabled={isStreaming}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              title="Start fresh session"
              aria-label="Start fresh session"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>

            {/* Live Voice Mode Switcher (Phase 2 preview badge) */}
            <button
              onClick={onSwitchToVoice}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
              title="Switch to Live Voice Conversation"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Talk Mode</span>
            </button>
          </div>
        </div>

      {/* Error Notice */}
      {apiError && (
        <div className="flex items-center justify-between bg-red-950/60 border-b border-red-900/50 px-4 py-2 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{apiError}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRetry}
              disabled={isStreaming}
              className="rounded-md border border-red-800/70 bg-red-950/50 px-2 py-0.5 text-red-200 hover:bg-red-900/50 disabled:opacity-50"
            >
              Retry
            </button>
            <button
              onClick={() => setApiError(null)}
              className="text-red-400 hover:text-red-200"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6" aria-live="polite" role="log">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-900/20'
                      : 'border border-zinc-800/80 bg-zinc-900/90 text-zinc-200 shadow-sm'
                  }`}
                >
                  {/* Security Requirement: Render strictly as Plain Text (Untrusted LLM Output / Anti-XSS) */}
                  <div className="whitespace-pre-wrap select-text break-words">
                    {message.text || (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-400 italic">
                        <Sparkles className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        Coach is thinking...
                      </span>
                    )}
                  </div>

                  {/* Message Action Footer: Copy button & timestamp */}
                  <div className="mt-2 flex items-center justify-between text-[11px] opacity-60">
                    <span>
                      {new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleCopy(message.id, message.text)}
                      className="ml-3 inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded"
                      title="Copy text"
                      aria-label="Copy message text"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700">
                    <User className="h-4 w-4 text-zinc-300" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Prompt Starters */}
      <div className="border-t border-zinc-900 bg-zinc-950/70 px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="shrink-0 text-[11px] text-zinc-500 font-medium">Practice cues:</span>
          {promptSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isStreaming}
              className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300 hover:border-cyan-500/50 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Form */}
      <div className="border-t border-zinc-800/80 bg-zinc-950 p-4 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-2 focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-xl"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Speak or type your answer to the coach... (Press Enter to send, Shift+Enter for new line)`}
              disabled={isStreaming}
              className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
            />

            <div className="flex items-center gap-1.5 pr-1">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStream}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-800/70 bg-red-950/60 text-red-300 hover:bg-red-900/60 hover:text-red-200 transition-all"
                  title="Stop response"
                  aria-label="Stop response"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Send message (Enter)"
                  aria-label="Send message"
                >
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Server-side AI coaching • Zero browser key exposure</span>
            <span className="hidden sm:inline">Press Shift + Enter for newline</span>
          </div>
        </div>
      </div>
    </div>

    {/* Real-time Domain Interview Tips Sidebar */}
      {isTipsPanelOpen && (
        <div className="fixed inset-y-16 right-0 z-40 w-full sm:w-96 md:w-[420px] lg:static lg:z-auto h-full shrink-0 animate-in slide-in-from-right duration-200">
          <InterviewTipsPanel
            currentDomain={technicalDomain}
            isOpen={isTipsPanelOpen}
            onClose={() => setIsTipsPanelOpen(false)}
            onDomainChange={onDomainChange}
            onSelectPrompt={(promptText) => {
              handleSendMessage(promptText);
            }}
          />
        </div>
      )}
    </div>
  );
};
