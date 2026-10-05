import fs from 'fs';
import path from 'path';

export interface PromptContext {
  userName?: string;
  sessionMinutes?: number;
  progressContext?: string;
  streakInfo?: string;
  modeInstructions?: string;
}

let cachedTemplate: string | null = null;

export function loadCoachPromptTemplate(): string {
  if (cachedTemplate && process.env.NODE_ENV === 'production') {
    return cachedTemplate;
  }

  const promptPath = path.resolve(process.cwd(), 'coach-system-prompt.md');
  if (!fs.existsSync(promptPath)) {
    throw new Error(`System prompt template not found at ${promptPath}`);
  }

  cachedTemplate = fs.readFileSync(promptPath, 'utf-8');
  return cachedTemplate;
}

export function compileCoachPrompt(ctx: PromptContext): string {
  const template = loadCoachPromptTemplate();

  const userName = ctx.userName?.trim() || 'Student';
  const sessionMinutes = ctx.sessionMinutes ? String(ctx.sessionMinutes) : '15';
  const progressContext = ctx.progressContext?.trim() || 
    '• Focus areas: Eliminate filler words (um, like, basically), structure technical explanations with PREP/STAR frameworks, and maintain articulate pacing.';
  const streakInfo = ctx.streakInfo?.trim() || 'Day 1 streak (1 freeze remaining). Keep the daily momentum going!';

  let compiled = template
    .replace(/\{\{user_name\}\}/g, userName)
    .replace(/\{\{session_minutes\}\}/g, sessionMinutes)
    .replace(/\{\{progress_context\}\}/g, progressContext)
    .replace(/\{\{streak_info\}\}/g, streakInfo);

  if (ctx.modeInstructions) {
    compiled += `\n\n## Active Session Mode Directive\n${ctx.modeInstructions}`;
  }

  return compiled;
}
