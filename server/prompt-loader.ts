import fs from 'fs';
import path from 'path';
import type { CoachingMode, TechnicalDomain, Profile, Streak, Session } from '../src/types/database';

export interface CoachPromptContext {
  profile?: Partial<Profile> | null;
  streak?: Partial<Streak> | null;
  sessionMinutes?: number;
  recentSessions?: Session[];
  mode: CoachingMode;
  technicalDomain?: TechnicalDomain;
}

export const MODE_INSTRUCTIONS: Record<CoachingMode, string> = {
  free_talk: `### ACTIVE MODE: Free Talk & Casual Flow
- Encourage spontaneous conversational English.
- Chat about college life, recent tech news, hobbies, or daily hurdles.
- Gently steer towards structured expression whenever the user explains an experience.`,

  hr_interview: `### ACTIVE MODE: HR & Behavioral Round
- Act as a seasoned HR Director or Campus Talent Recruiter.
- Ask standard behavioral questions: "Tell me about yourself", "Why cybersecurity?", "Describe a time you worked in a difficult team", "Where do you see yourself in 3 years?".
- Evaluate adherence to the STAR framework (Situation, Task, Action, Result).
- Challenge vague statements politely and ask follow-ups to test depth.`,

  technical_interview: `### ACTIVE MODE: Technical Interview (Cybersecurity)
- Act as a Principal Security Architect or SOC Engineering Lead.
- Probe core concepts, investigative logic, and practical command-line / tool awareness.
- Ask conceptual and scenario questions: TCP vs UDP three-way handshake, SQL injection defense, Kerberoasting basics, SIEM alert triage, or Ransomware containment.
- Verify if the explanation is easy to follow, top-down, and technically accurate.`,

  gd_simulator: `### ACTIVE MODE: Group Discussion (GD) Simulator
- Roleplay as Moderator and 2 distinct participants (Rohan - assertive, data-driven; Sneha - thoughtful, ethical focus).
- Moderator provides a topic (e.g. "Should AI be allowed in offensive cyber warfare?", "Data privacy vs National Security", "Remote work security vulnerabilities").
- Jump in as participants to simulate real group dynamics, interrupting constructively and challenging the user to speak up, summarize, and assert their points with etiquette.`,

  incident_scenario: `### ACTIVE MODE: Incident Response & Crisis Room
- Act as an Incident Commander in an active P1 breach scenario (e.g., suspicious PowerShell beacons on the domain controller, AWS root login alert at 3 AM).
- Give immediate situation updates and demand quick, structured status reports and action recommendations.
- Focus on clear, calm verbal communication under high pressure.`,

  explain_to_manager: `### ACTIVE MODE: Explain to a Non-Technical Manager / Executive
- Act as a Chief Operating Officer (COO) or VP of Finance who does not know technical jargon.
- The user must explain a complex security risk (e.g., Log4j, phishing campaign risk, patch budget need, zero-day vulnerability) without confusing jargon.
- Call out overly technical terms ("What does heap spray mean for our business operations?") and guide them toward business impact, risk, and ROI.`,

  presentation_pitch: `### ACTIVE MODE: Presentation & Pitch Practice
- Act as an audience of judges or stakeholders listening to a 2-3 minute presentation on a security project or tool (e.g., automated threat hunting pipeline).
- Critique opening hook, transition phrases, vocal presence, and closing call-to-action.`,

  conversation_skills: `### ACTIVE MODE: Executive Conversation & Networking
- Practice professional networking, asking thoughtful questions at conferences, disagreeing agreeably in meetings, and small talk with industry professionals.`,

  full_mock_interview: `### ACTIVE MODE: Full Mock Interview (Simulated Exam)
- Maintain strict interview protocol.
- Do NOT provide coaching or interruptions during the interview.
- Ask 4-5 balanced questions (intro, technical, behavioral, scenario).
- Provide the full structured evaluation ONLY at the very end of the interview.`,

  rapid_fire: `### ACTIVE MODE: Rapid-Fire Articulation Drill
- Ask fast, focused questions one by one.
- User has 30 to 45 seconds to deliver a succinct, punchy explanation.
- Keep the tempo brisk: question -> user answer -> quick 1-line verdict -> next question.`,

  redo_drill: `### ACTIVE MODE: Redo Weakest Answer Drill
- Retrieve the user's previously flagged weak response from their past sessions.
- Present the question again with target improvement goals (e.g., fewer fillers, clearer structure).
- Evaluate if the revised version succeeded.`,
};

const MAX_FIELD_LENGTH = 60;
const COACH_TONES = new Set(['supportive', 'strict', 'realistic', 'executive']);

const DEFAULT_PROGRESS_CONTEXT =
  '• Focus areas: Eliminate filler words (um, like, basically), structure technical explanations with PREP/STAR frameworks, and maintain articulate pacing.';
const DEFAULT_STREAK_INFO = 'Day 1 streak (1 freeze remaining). Keep the daily momentum going!';
const DEFAULT_SESSION_MINUTES = 15;

let cachedTemplate: string | null = null;

export function loadCoachPromptTemplate(): string {
  if (cachedTemplate && process.env.NODE_ENV === 'production') {
    return cachedTemplate;
  }

  const promptPath = path.resolve(process.cwd(), 'coach-system-prompt.md');
  if (!fs.existsSync(promptPath)) {
    throw new Error('System prompt template not found');
  }

  cachedTemplate = fs.readFileSync(promptPath, 'utf-8');
  return cachedTemplate;
}

/**
 * Strips newlines and markdown heading characters, collapses whitespace and
 * truncates so user-controlled profile data can never inject new prompt rules.
 */
export function sanitizePromptField(value: unknown, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[#`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildStreakInfo(streak?: Partial<Streak> | null): string {
  const current = safeNumber(streak?.current_streak, 0);
  if (current <= 0) return DEFAULT_STREAK_INFO;
  const freezes = safeNumber(streak?.freezes_left, 0);
  return sanitizePromptField(
    `${current} days in a row. ${freezes} streak freeze(s) remaining. Keep the daily momentum going!`,
    120
  );
}

function buildProgressContext(recentSessions?: Session[]): string {
  if (!recentSessions || recentSessions.length === 0) {
    return DEFAULT_PROGRESS_CONTEXT;
  }

  const bullets = recentSessions.slice(0, 3).map((session, index) => {
    const mode = sanitizePromptField(String(session.mode ?? '').replace(/_/g, ' '), 40);
    const score = typeof session.overall_score === 'number' ? `${session.overall_score}/10` : 'N/A';
    const focus = sanitizePromptField(session.summary?.focus_for_next_session) || 'structured speech';
    return `- Session ${index + 1} (${mode || 'practice'}): Score ${score}. Key Focus: "${focus}"`;
  });

  return bullets.join('\n');
}

export function compileCoachPrompt(ctx: CoachPromptContext): string {
  const template = loadCoachPromptTemplate();

  const userName = sanitizePromptField(ctx.profile?.full_name) || 'Student';
  const sessionMinutes = String(safeNumber(ctx.sessionMinutes, DEFAULT_SESSION_MINUTES));
  const progressContext = buildProgressContext(ctx.recentSessions);
  const streakInfo = buildStreakInfo(ctx.streak);

  let compiled = template
    .replace(/\{\{user_name\}\}/g, () => userName)
    .replace(/\{\{session_minutes\}\}/g, () => sessionMinutes)
    .replace(/\{\{progress_context\}\}/g, () => progressContext)
    .replace(/\{\{streak_info\}\}/g, () => streakInfo);

  const targetRole = sanitizePromptField(ctx.profile?.target_role);
  if (targetRole) {
    compiled += `\n\n### CANDIDATE TARGET ROLE: ${targetRole}`;
  }

  const domainFocus = sanitizePromptField(ctx.profile?.domain_focus);
  if (domainFocus) {
    compiled += `\n### DOMAIN FOCUS: ${domainFocus}`;
  }

  const collegeYear = sanitizePromptField(ctx.profile?.college_year);
  if (collegeYear) {
    compiled += `\n### ACADEMIC STAGE: ${collegeYear}`;
  }

  const toneRaw = sanitizePromptField(ctx.profile?.coach_tone).toLowerCase();
  if (COACH_TONES.has(toneRaw)) {
    compiled += `\n### COACH PERSONA & TONE STYLE: ${toneRaw.toUpperCase()}
Follow this tone closely throughout the session.`;
  }

  const pacingRaw = sanitizePromptField(ctx.profile?.pacing_preference).toLowerCase();
  if (pacingRaw === 'rapid' || pacingRaw === 'deliberate') {
    compiled += `\n### PACING PREFERENCE: Coach at a ${pacingRaw} speaking pace.`;
  }

  if (sanitizePromptField(ctx.profile?.filler_strictness).toLowerCase() === 'strict') {
    compiled += `\n### STRICT FILLER RULE: Actively point out any filler words (um, uh, like) in your feedback.`;
  }

  const modeInstruction = MODE_INSTRUCTIONS[ctx.mode] || MODE_INSTRUCTIONS.free_talk;
  compiled += `\n\n${modeInstruction}`;

  if (ctx.technicalDomain) {
    const domain = sanitizePromptField(String(ctx.technicalDomain).replace(/_/g, ' '), 40);
    if (domain) {
      compiled += `\n\n### TECHNICAL SPECIALIZATION: ${domain.toUpperCase()}
Focus technical questions, vocabulary, and scenarios on this area.`;
    }
  }

  return compiled;
}
