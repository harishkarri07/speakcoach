import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createSecurityHeaders } from '../server/security-headers';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

/** Runs the helmet middleware against a mock res and captures set headers. */
function captureHeaders(middleware: Middleware): Record<string, string> {
  const captured: Record<string, string> = {};
  const req = {
    headers: {},
    method: 'GET',
    url: '/',
    hostname: 'localhost',
    protocol: 'http',
    secure: false,
    ip: '127.0.0.1',
  } as unknown as Request;

  const res = {
    setHeader: (key: string, value: string | number | readonly string[]) => {
      captured[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
    },
    removeHeader: (key: string) => {
      delete captured[key.toLowerCase()];
    },
    getHeader: (key: string) => captured[key.toLowerCase()],
  } as unknown as Response;

  middleware(req, res, () => {});
  return captured;
}

describe('Content-Security-Policy', () => {
  it("production CSP includes script-src 'self' and no 'unsafe-inline' for scripts", () => {
    const headers = captureHeaders(
      createSecurityHeaders({ isProd: true, supabaseUrl: 'https://xyz123.supabase.co' })
    );
    const csp = headers['content-security-policy'];

    expect(csp).toBeDefined();
    expect(csp).toContain("script-src 'self'");
    // 'unsafe-inline' must never appear — neither for scripts nor styles.
    expect(csp).not.toContain("'unsafe-inline'");

    // Structural requirements
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('https://xyz123.supabase.co');
    expect(csp).toContain('wss://xyz123.supabase.co'); // realtime socket form
  });

  it('production CSP without Supabase config still secures script-src', () => {
    const headers = captureHeaders(createSecurityHeaders({ isProd: true }));
    const csp = headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
  });

  it('development disables CSP and HSTS so Vite inline script + HMR work', () => {
    const headers = captureHeaders(createSecurityHeaders({ isProd: false }));
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['strict-transport-security']).toBeUndefined();
    // Non-CSP baseline headers are still set.
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('production keeps HSTS enabled', () => {
    const headers = captureHeaders(createSecurityHeaders({ isProd: true }));
    expect(headers['strict-transport-security']).toBeDefined();
  });
});
