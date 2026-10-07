import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { createRequireAuth, extractBearerToken, DEMO_USER_ID } from '../server/auth';

function createMockReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Request;

  let statusCode = 200;
  let responseBody: unknown = null;
  const res = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      responseBody = body;
      return res;
    }),
  } as unknown as Response;

  return { req, res, getStatus: () => statusCode, getBody: () => responseBody };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireAuth', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const verifyToken = vi.fn(async () => null);
    const requireAuth = createRequireAuth({ verifyToken, allowDemoMode: false });

    const { req, res, getStatus, getBody } = createMockReqRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(getStatus()).toBe(401);
    expect(getBody()).toMatchObject({
      error: expect.any(String),
      code: 'AUTH_REQUIRED',
    });
    expect(next).not.toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled(); // no token => Supabase never queried
  });

  it('returns 401 when the token is invalid (mocked Supabase client rejects it)', async () => {
    // Mock the Supabase seam: auth.getUser() reports an error for this JWT,
    // so createRequireAuth's verifyToken resolves to null (same as server.ts wiring).
    const verifyToken = vi.fn(async (_token: string) => null);
    const createAuthClient = vi.fn();
    const requireAuth = createRequireAuth({ verifyToken, createAuthClient, allowDemoMode: false });

    const { req, res, getStatus, getBody } = createMockReqRes({
      authorization: 'Bearer invalid-token',
    });
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(getStatus()).toBe(401);
    expect(getBody()).toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(verifyToken).toHaveBeenCalledOnce();
    expect(verifyToken).toHaveBeenCalledWith('invalid-token');
    expect(createAuthClient).not.toHaveBeenCalled(); // no scoped client for a bad token
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token: attaches the user and scoped client, calls next()', async () => {
    const fakeClient = { auth: {} } as never;
    const verifyToken = vi.fn(async () => ({ id: 'user-1', email: 'a@b.c' }));
    const createAuthClient = vi.fn(() => fakeClient);
    const requireAuth = createRequireAuth({ verifyToken, createAuthClient, allowDemoMode: false });

    const { req, res, getStatus } = createMockReqRes({
      authorization: 'Bearer good-token',
    });
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(getStatus()).toBe(200); // res.status never called
    expect(req.user).toEqual({ id: 'user-1', email: 'a@b.c' });
    expect(req.isDemoUser).toBe(false);
    expect(req.authClient).toBe(fakeClient);
  });

  it('never leaks verifier errors: a throwing Supabase client still yields 401', async () => {
    const verifyToken = vi.fn(async () => {
      throw new Error('JWT expired');
    });
    const requireAuth = createRequireAuth({ verifyToken, allowDemoMode: false });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { req, res, getStatus, getBody } = createMockReqRes({
      authorization: 'Bearer expired-token',
    });
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(getStatus()).toBe(401);
    expect(getBody()).toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(next).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('falls through to demo mode only when allowDemoMode is true', async () => {
    const verifyToken = vi.fn(async () => null);
    const requireAuth = createRequireAuth({ verifyToken, allowDemoMode: true });

    const { req, res, getStatus } = createMockReqRes(); // no header at all
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(getStatus()).toBe(200);
    expect(req.user).toMatchObject({ id: DEMO_USER_ID, email: 'demo@speakcoach.local' });
    expect(req.isDemoUser).toBe(true);
  });
});

describe('extractBearerToken', () => {
  const withAuth = (value?: string) =>
    ({ headers: value === undefined ? {} : { authorization: value } }) as unknown as Request;

  it('extracts a standard bearer token', () => {
    expect(extractBearerToken(withAuth('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the scheme', () => {
    expect(extractBearerToken(withAuth('bearer xyz'))).toBe('xyz');
  });

  it('rejects missing, malformed, and non-bearer values', () => {
    expect(extractBearerToken(withAuth())).toBeNull();
    expect(extractBearerToken(withAuth(''))).toBeNull();
    expect(extractBearerToken(withAuth('Basic dXNlcjpwYXNz'))).toBeNull();
    expect(extractBearerToken(withAuth('Bearer   '))).toBeNull();
  });
});
