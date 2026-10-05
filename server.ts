import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Strict body parser limits (prevent Denial of Service via large payloads)
app.use(express.json({ limit: '1mb' }));

// In-Memory Rate Limiter (Sliding Window per IP)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 40; // 40 requests per minute

function rateLimiter(req: Request, res: Response, next: () => void) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
    res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS_PER_WINDOW - 1);
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please pace your practice sessions.',
    });
  }

  record.count += 1;
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));
  next();
}

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Zod Schema for Chat Request
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string().min(1).max(4000),
});

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(ChatMessageSchema).max(50).default([]),
  systemInstruction: z.string().max(8000).optional(),
  mode: z.string().max(100).default('free_talk'),
});

// 1. System Prompt Template Endpoint
app.get('/api/coach-prompt-template', (_req: Request, res: Response) => {
  try {
    const promptPath = path.resolve(process.cwd(), 'coach-system-prompt.md');
    if (fs.existsSync(promptPath)) {
      const content = fs.readFileSync(promptPath, 'utf-8');
      return res.json({ template: content });
    }
    return res.json({ template: '' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read coach prompt template' });
  }
});

// 2. Chat API Route (Server-Sent Events Streaming)
// Model: gemini-3.8-flash for fast, responsive text coaching
app.post('/api/chat', rateLimiter, async (req: Request, res: Response) => {
  // Check API key availability
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
    });
  }

  // Defensively validate payload
  const parseResult = ChatRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: parseResult.error.issues,
    });
  }

  const { message, history, systemInstruction } = parseResult.data;

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    // Build conversation contents structure
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Append prior history turns
    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      });
    }

    // Append current turn
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let streamedSuccessfully = false;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: 0.7,
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            (res as any).flush?.();
            streamedSuccessfully = true;
          }
        }

        if (streamedSuccessfully) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed (${err?.message || err}). Attempting fallback...`);
        if (streamedSuccessfully) {
          break;
        }
      }
    }

    if (!streamedSuccessfully && lastError) {
      throw lastError;
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Chat endpoint error:', err?.message || err);
    const errorMessage = err?.message || 'Gemini inference failed';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Also support /api/chat/stream as alias
app.post('/api/chat/stream', rateLimiter, (req, res, next) => {
  req.url = '/api/chat';
  (app as any).handle(req, res, next);
});

// 3. Health & Auth Status Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Start Server & mount Vite in dev
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpeakCoach server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start SpeakCoach server:', err);
  process.exit(1);
});
