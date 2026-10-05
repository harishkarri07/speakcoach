import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, RotateCcw, Clock, Copy, Check, Sparkles, Mic, CornerDownLeft, AlertCircle } from 'lucide-react';
import { CoachingMode, TechnicalDomain, Session, Message, Profile, Streak } from '../types/database';
import { DataService } from '../lib/supabase';
import { buildCoachSystemPrompt } from '../lib/prompt-loader';
import { MODE_LABELS } from './Navbar';

interface ChatViewProps {
  currentMode: CoachingMode;
  technicalDomain: TechnicalDomain;
  profile: Profile | null;
  streak: Streak | null;
  onOpenModeSelector: () => void;
  onSwitchToVoice: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentMode,
  technicalDomain,
  profile,
  streak,
  onOpenModeSelector,
  onSwitchToVoice,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or load active session
  useEffect(() => {
    startNewSession();
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
    setSessionSeconds(0);
    setApiError(null);
    const userId = profile?.id || '00000000-0000-0000-0000-000000000001';

    // Create session record in Supabase / Local storage
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

    setCurrentSession(newSession);

    // Initial greeting based on mode
    const greetingText = getInitialGreeting(currentMode, technicalDomain, profile?.full_name);
    const initialMsg: Message = {
      id: `msg_init_${Date.now()}`,
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
    const userId = profile?.id || '00000000-0000-0000-0000-000000000001';

    // 1. Save and display user message
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      session_id: currentSession.id,
      user_id: userId,
      role: 'user',
      text: rawText.trim(),
      ts: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    await DataService.saveMessage(userMsg);

    // 2. Prepare System Prompt with interpolated placeholders
    const systemPrompt = buildCoachSystemPrompt({
      profile,
      streak,
      sessionMinutes: 15,
      mode: currentMode,
      technicalDomain,
    });

    // 3. Prepare AI placeholder turn
    const assistantId = `msg_asst_${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantId,
      session_id: currentSession.id,
      user_id: userId,
      role: 'assistant',
      text: '',
      ts: new Date().toISOString(),
    };

    setMessages([...updatedMessages, initialAssistantMsg]);
    setIsStreaming(true);

    try {
      // Stream response from server route /api/chat via SSE
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: rawText.trim(),
          history: historyPayload,
          systemInstruction: systemPrompt,
          mode: currentMode,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: accumulatedText } : m))
                );
              }
            } catch (parseErr) {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      // Save complete assistant message to database
      await DataService.saveMessage({
        session_id: currentSession.id,
        user_id: userId,
        role: 'assistant',
        text: accumulatedText,
        ts: new Date().toISOString(),
      });
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to stream coach response.';
      setApiError(errMsg);
      // Remove or update the failed placeholder
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: `⚠️ Coach connection issue: ${errMsg}. Please verify GEMINI_API_KEY.` }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
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
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-zinc-950 text-zinc-100">
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

        <div className="flex items-center gap-3">
          {/* Duration Clock */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-zinc-300">{formatTimer(sessionSeconds)}</span>
          </div>

          {/* New Session Button */}
          <button
            onClick={startNewSession}
            disabled={isStreaming}
            className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-white transition-colors disabled:opacity-50"
            title="Start fresh session"
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
          <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
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
                      className="ml-3 inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                      title="Copy text"
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
              <button
                type="submit"
                disabled={!inputText.trim() || isStreaming}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Send message (Enter)"
              >
                {isStreaming ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <CornerDownLeft className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>

          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Server-side Gemini 3.8 Flash • Zero browser key exposure</span>
            <span className="hidden sm:inline">Press Shift + Enter for newline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
