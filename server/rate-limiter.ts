import type { NextFunction, Request, Response } from 'express';

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

/**
 * Sliding-window in-memory rate limiter.
 *
 * - keyed on the authenticated user id, falling back to `req.ip`
 *   (Express resolves `req.ip` from `trust proxy` — x-forwarded-for is never
 *   read by hand),
 * - returns `Retry-After` plus a clean JSON body on 429,
 * - periodically deletes expired entries so the Map cannot grow forever.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60 * 1000;
  const max = options.max ?? 40;
  const now = options.now ?? Date.now;
  const store = new Map<string, RateLimitRecord>();

  const cleanup = setInterval(() => {
    const current = now();
    for (const [key, record] of store) {
      if (current > record.resetTime) store.delete(key);
    }
  }, windowMs);
  cleanup.unref?.();

  function limiter(req: Request, res: Response, next: NextFunction) {
    const key = req.user?.id || req.ip || 'unknown';
    const current = now();
    const record = store.get(key);

    if (!record || current > record.resetTime) {
      store.set(key, { count: 1, resetTime: current + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(max - 1));
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - current) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', '0');
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        code: 'RATE_LIMITED',
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - record.count)));
    next();
  }

  limiter.reset = () => store.clear();
  limiter.stop = () => clearInterval(cleanup);

  return limiter;
}
