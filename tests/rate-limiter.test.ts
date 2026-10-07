import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from '../server/rate-limiter';
import type { Request, Response } from 'express';

function createMockReqRes(clientIp = '127.0.0.1', token?: string) {
  const req = {
    ip: clientIp,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    socket: { remoteAddress: clientIp },
  } as unknown as Request;

  let statusCode = 200;
  let responseBody: any = null;
  const headers: Record<string, any> = {};

  const res = {
    setHeader: vi.fn((key: string, value: any) => {
      headers[key.toLowerCase()] = value;
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((body: any) => {
      responseBody = body;
      return res;
    }),
  } as unknown as Response;

  return { req, res, getStatus: () => statusCode, getBody: () => responseBody, headers };
}

describe('Rate Limiter', () => {
  it('allows requests within capacity, returns 429 once exhausted, and resets after window', async () => {
    let mockTime = 1000;

    // Capacity: 2 requests per 2000ms window
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 2000,
      now: () => mockTime,
    });

    // 1st request -> Allowed
    const req1 = createMockReqRes();
    const next1 = vi.fn();
    limiter(req1.req, req1.res, next1);
    expect(next1).toHaveBeenCalledOnce();
    expect(req1.getStatus()).toBe(200);

    // 2nd request -> Allowed (limit now reached)
    const req2 = createMockReqRes();
    const next2 = vi.fn();
    limiter(req2.req, req2.res, next2);
    expect(next2).toHaveBeenCalledOnce();
    expect(req2.getStatus()).toBe(200);

    // 3rd request -> Blocked with 429
    const req3 = createMockReqRes();
    const next3 = vi.fn();
    limiter(req3.req, req3.res, next3);
    expect(next3).not.toHaveBeenCalled();
    expect(req3.getStatus()).toBe(429);
    expect(req3.getBody()).toMatchObject({
      error: expect.stringContaining('Too many requests'),
      code: 'RATE_LIMITED',
    });

    // Advance mock time past the windowMs
    mockTime += 2500;

    // 4th request -> Allowed after reset
    const req4 = createMockReqRes();
    const next4 = vi.fn();
    limiter(req4.req, req4.res, next4);
    expect(next4).toHaveBeenCalledOnce();
    expect(req4.getStatus()).toBe(200);
  });
});
