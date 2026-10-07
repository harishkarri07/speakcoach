import type { NextFunction, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthedUser {
  id: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
      authClient?: SupabaseClient;
      isDemoUser?: boolean;
    }
  }
}

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme?.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

export interface RequireAuthOptions {
  /**
   * Verifies a bearer token (the Supabase `auth.getUser` seam).
   * Resolve with the user, or null when the token is missing/invalid/expired.
   */
  verifyToken: (token: string) => Promise<AuthedUser | null>;
  /**
   * Builds a Supabase client pinned to the caller's JWT so RLS applies
   * to every downstream query. Only called after verifyToken succeeds.
   */
  createAuthClient?: (token: string) => SupabaseClient;
  /** When true (dev only), unauthenticated requests run as a local demo user. */
  allowDemoMode: boolean;
  demoUserId?: string;
}

/**
 * 401 unless a valid Supabase bearer token is presented (or demo mode is on).
 * Verification errors are never leaked to the client — always a generic 401.
 */
export function createRequireAuth(options: RequireAuthOptions) {
  const demoUserId = options.demoUserId ?? DEMO_USER_ID;

  return async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const token = extractBearerToken(req);

      if (token) {
        const user = await options.verifyToken(token);
        if (user) {
          req.user = user;
          req.isDemoUser = false;
          if (options.createAuthClient) {
            req.authClient = options.createAuthClient(token);
          }
          return next();
        }
      }

      if (options.allowDemoMode) {
        req.user = { id: demoUserId, email: 'demo@speakcoach.local' };
        req.isDemoUser = true;
        return next();
      }

      return res.status(401).json({
        error: 'Please sign in to practice with your coach.',
        code: 'AUTH_REQUIRED',
      });
    } catch (err) {
      console.error('[auth] verification failed:', err instanceof Error ? err.message : String(err));
      return res.status(401).json({
        error: 'Please sign in to practice with your coach.',
        code: 'AUTH_REQUIRED',
      });
    }
  };
}
