import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Profile, Session, Streak } from './src/types/database';
import { compileCoachPrompt } from './server/prompt-loader';
import { createRateLimiter } from './server/rate-limiter';
import { ChatRequestSchema, type ChatRequest } from './server/schemas';
import { createRequireAuth, DEMO_USER_ID, type AuthedUser } from './server/auth';
import { createSecurityHeaders } from './server/security-headers';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
// Dev binds to localhost only; production binds all interfaces. Override with HOST.
const HOST = process.env.HOST || (IS_PROD ? '0.0.0.0' : '127.0.0.1');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const ALLOW_DEMO_MODE = process.env.ALLOW_DEMO_MODE === 'true' && !IS_PROD;

const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-flash-latest,gemini-2.5-flash-lite')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const FRIENDLY_COACH_ERROR = 'Coach is unavailable right now. Please try again.';

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Security headers: dev disables CSP/HSTS so Vite's inline React-refresh script
// and HMR websocket work; production serves the strict CSP (see server/security-headers.ts).
app.use(createSecurityHeaders({ isProd: IS_PROD, supabaseUrl: SUPABASE_URL }));

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Rate limiter (sliding window, keyed on the authenticated user, else req.ip)
// ---------------------------------------------------------------------------
const rateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
});

// ---------------------------------------------------------------------------
// Gemini client (server-side only, key never reaches the browser)
// ---------------------------------------------------------------------------
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

if (!GEMINI_API_KEY) {
  console.warn('[startup] GEMINI_API_KEY is not set. /api/chat will return 503 until it is configured.');
}

async function verifyModelAvailability(): Promise<void> {
  if (!ai) return;
  try {
    const available = new Set<string>();
    let checked = 0;
    for await (const model of await ai.models.list()) {
      if (model.name) available.add(model.name.replace(/^models\//, ''));
      if (++checked >= 1000) break;
    }
    for (const modelName of GEMINI_MODELS) {
      if (!available.has(modelName)) {
        console.warn(`[startup] Gemini model "${modelName}" was not found in ai.models.list().`);
      }
    }
  } catch (err) {
    console.warn(
      '[startup] Could not verify Gemini models:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

// Request validation lives in ./server/schemas.ts (single source of truth).
// The client may never supply a system prompt: z.strictObject rejects it.

// ---------------------------------------------------------------------------
// Authentication — implementation in ./server/auth.ts (unit-tested in tests/)
// ---------------------------------------------------------------------------
const serverSupabase: SupabaseClient | null = IS_SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const requireAuth = createRequireAuth({
  allowDemoMode: ALLOW_DEMO_MODE,
  demoUserId: DEMO_USER_ID,
  verifyToken: async (token: string): Promise<AuthedUser | null> => {
    if (!serverSupabase) return null;
    const { data, error } = await serverSupabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email };
  },
  createAuthClient: (token: string): SupabaseClient =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
});

// ---------------------------------------------------------------------------
// Coach context: loaded server-side under the caller's own JWT (RLS applies)
// ---------------------------------------------------------------------------
interface CoachContextData {
  profile: Partial<Profile> | null;
  streak: Partial<Streak> | null;
  recentSessions: Session[];
}

async function loadCoachContext(req: Request): Promise<CoachContextData> {
  const empty: CoachContextData = { profile: null, streak: null, recentSessions: [] };
  if (req.isDemoUser || !req.authClient || !req.user) return empty;

  const client = req.authClient;
  try {
    const [profileResult, streakResult, sessionsResult] = await Promise.all([
      client.from('profiles').select('*').eq('id', req.user.id).maybeSingle(),
      client.from('streaks').select('*').eq('user_id', req.user.id).maybeSingle(),
      client
        .from('sessions')
        .select('*')
        .eq('user_id', req.user.id)
        .order('started_at', { ascending: false })
        .limit(3),
    ]);

    return {
      profile: (profileResult.data as Partial<Profile> | null) ?? null,
      streak: (streakResult.data as Partial<Streak> | null) ?? null,
      recentSessions: (sessionsResult.data as Session[] | null) ?? [],
    };
  } catch (err) {
    console.error('[chat] failed to load coach context:', err instanceof Error ? err.message : String(err));
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Chat streaming handler (SSE)
// ---------------------------------------------------------------------------
async function chatHandler(req: Request, res: Response) {
  const parseResult = ChatRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request payload.',
      code: 'INVALID_PAYLOAD',
      details: parseResult.error.issues.map(
        (issue: { path: PropertyKey[]; message: string }) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })
      ),
    });
  }

  if (!ai) {
    return res.status(503).json({
      error: 'AI coaching is temporarily unavailable on this server. Please try again later.',
      code: 'AI_UNAVAILABLE',
    });
  }

  const { message, history, mode, technicalDomain }: ChatRequest = parseResult.data;

  const abortController = new AbortController();
  const onClose = () => abortController.abort();
  req.on('close', onClose);

  let streamedSuccessfully = false;
  let lastError: unknown = null;

  try {
    const coachContext = await loadCoachContext(req);
    const systemInstruction = compileCoachPrompt({
      profile: coachContext.profile,
      streak: coachContext.streak,
      recentSessions: coachContext.recentSessions,
      mode,
      technicalDomain,
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const turn of history) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    for (const modelName of GEMINI_MODELS) {
      if (abortController.signal.aborted) break;
      try {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            abortSignal: abortController.signal,
          },
        });

        for await (const chunk of stream) {
          if (abortController.signal.aborted) break;
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            (res as unknown as { flush?: () => void }).flush?.();
            streamedSuccessfully = true;
          }
        }

        if (streamedSuccessfully) break;
      } catch (err) {
        lastError = err;
        console.warn(
          `[chat] model "${modelName}" failed (${err instanceof Error ? err.message : String(err)}).`
        );
        if (streamedSuccessfully || abortController.signal.aborted) break;
      }
    }

    if (abortController.signal.aborted) {
      res.end();
      return;
    }

    if (!streamedSuccessfully) {
      throw lastError instanceof Error ? lastError : new Error('No model produced a response.');
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[chat] stream failed:', err instanceof Error ? err.message : String(err));
    if (!res.headersSent) {
      res.status(500).json({ error: FRIENDLY_COACH_ERROR, code: 'COACH_UNAVAILABLE' });
      return;
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: FRIENDLY_COACH_ERROR, code: 'COACH_UNAVAILABLE' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } finally {
    req.off('close', onClose);
  }
}

app.post(['/api/chat', '/api/chat/stream'], rateLimiter, requireAuth, chatHandler);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found.', code: 'NOT_FOUND' });
});

// ---------------------------------------------------------------------------
// Start server: mount Vite dev middleware or serve the production build
// ---------------------------------------------------------------------------
async function start() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(
    (err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) return next(err);
      console.error('[server] unhandled error:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' });
    }
  );

  await verifyModelAvailability();

  app.listen(PORT, HOST, () => {
    console.log(`SpeakCoach server running on http://${HOST}:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start SpeakCoach server:', err);
  process.exit(1);
});
