// ─────────────────────────────────────────────────────────────
// Pearloom / api/webhooks/resend/route.test.ts
//
// The webhook verifies Resend's Svix signature over
// `${svix-id}.${svix-timestamp}.${body}` with the base64-decoded
// secret. Before the fix it HMAC'd the raw body only, so genuine
// signatures never matched (bounce tracking dark) and, unset, events
// were forgeable. These pin the corrected scheme + prod rejection.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// getSupabase() returns null when the Supabase env is absent, so the
// route acks with 200 without a DB — perfect for signature-only tests.
// Mock createClient anyway so an accidental call can't hit the network.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) }),
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

const SECRET_B64 = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
const SECRET = `whsec_${SECRET_B64}`;

function svixSign(id: string, timestamp: string, body: string, secretB64 = SECRET_B64): string {
  const key = Buffer.from(secretB64, 'base64');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return `v1,${sig}`;
}

function makeReq(body: string, headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const EVENT = JSON.stringify({
  type: 'email.bounced',
  created_at: '2026-07-06T00:00:00Z',
  data: { email_id: 'e1', to: ['guest@example.test'], tags: [] },
});

describe('POST /api/webhooks/resend — Svix signature', () => {
  beforeEach(() => {
    // No Supabase → route acks 200 after signature passes.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('accepts a correctly-signed Svix request', async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const id = 'msg_1';
    const ts = Math.floor(Date.now() / 1000).toString();
    const res = await POST(makeReq(EVENT, {
      'svix-id': id,
      'svix-timestamp': ts,
      'svix-signature': svixSign(id, ts, EVENT),
    }));
    expect(res.status).toBe(200);
  });

  it('accepts when multiple v1 signatures are present and one matches', async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const id = 'msg_2';
    const ts = Math.floor(Date.now() / 1000).toString();
    const good = svixSign(id, ts, EVENT);
    const header = `v1,AAAAdeadbeef ${good}`;
    const res = await POST(makeReq(EVENT, { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': header }));
    expect(res.status).toBe(200);
  });

  it('rejects an unsigned request when the secret is set (prod)', async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const res = await POST(makeReq(EVENT, {}));
    expect(res.status).toBe(401);
  });

  it('rejects a wrong signature', async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const id = 'msg_3';
    const ts = Math.floor(Date.now() / 1000).toString();
    const res = await POST(makeReq(EVENT, {
      'svix-id': id,
      'svix-timestamp': ts,
      'svix-signature': 'v1,bm90LWEtcmVhbC1zaWc=',
    }));
    expect(res.status).toBe(401);
  });

  it('rejects a stale timestamp (replay guard)', async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const id = 'msg_4';
    const ts = (Math.floor(Date.now() / 1000) - 60 * 60).toString(); // 1h old
    const res = await POST(makeReq(EVENT, {
      'svix-id': id,
      'svix-timestamp': ts,
      'svix-signature': svixSign(id, ts, EVENT),
    }));
    expect(res.status).toBe(401);
  });

  it('rejects a body tampered after signing', async () => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    const id = 'msg_5';
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = svixSign(id, ts, EVENT);
    const tampered = EVENT.replace('guest@example.test', 'attacker@example.test');
    const res = await POST(makeReq(tampered, { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': sig }));
    expect(res.status).toBe(401);
  });

  it('accepts unsigned requests when no secret is configured (dev)', async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(makeReq(EVENT, {}));
    expect(res.status).toBe(200);
  });
});
