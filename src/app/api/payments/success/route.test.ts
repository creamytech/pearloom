// ─────────────────────────────────────────────────────────────
// Pearloom / api/payments/success/route.test.ts
//
// Phase 2.7 of AUDIT-2026-05-29.md. /api/payments/success is the
// thank-you redirect Stripe sends guests to after checkout. It
// MUST NOT mutate state (the webhook owns that) — its only job
// is to look up the session and bounce to a friendly URL.
//
// The redirect URLs are guest-facing: a wrong query string here
// means the public site fails to show the soft thank-you banner,
// or worse, drops the guest on a "missing session" page after a
// successful payment.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const h = vi.hoisted(() => ({
  retrieveMock: vi.fn() as Mock,
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    checkout: { sessions: { retrieve: h.retrieveMock } },
  }),
}));

vi.mock('@/lib/site-urls', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    getAppOrigin: () => 'https://pearloom.test',
  };
});

import { GET } from './route';
import { NextRequest } from 'next/server';

function getReq(qs = ''): NextRequest {
  const url = qs
    ? `http://localhost/api/payments/success?${qs}`
    : 'http://localhost/api/payments/success';
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/payments/success', () => {
  beforeEach(() => {
    h.retrieveMock.mockReset();
    process.env.STRIPE_SECRET_KEY = 'sk_test';
  });

  it('redirects to /?paymentError=missing-session when session_id is absent', async () => {
    const res = await GET(getReq(''));
    expect(res.status).toBe(307);  // NextResponse.redirect default
    expect(res.headers.get('location')).toBe('https://pearloom.test/?paymentError=missing-session');
  });

  it('happy path: redirects to /sites/<siteId>?thanks=1&type=<type>&amount=<cents>', async () => {
    h.retrieveMock.mockImplementationOnce(async () => ({
      metadata: { siteId: 'emma-and-james', paymentType: 'registry' },
      amount_total: 5000,
    }));
    const res = await GET(getReq('session_id=cs_test_1'));
    expect(res.status).toBe(307);
    const loc = res.headers.get('location')!;
    expect(loc).toContain('/sites/emma-and-james');
    expect(loc).toContain('thanks=1');
    expect(loc).toContain('type=registry');
    expect(loc).toContain('amount=5000');
  });

  it('redirects to / (no /sites/) when the checkout session has no siteId metadata', async () => {
    h.retrieveMock.mockImplementationOnce(async () => ({
      metadata: { paymentType: 'tip' },
      amount_total: 1000,
    }));
    const res = await GET(getReq('session_id=cs_test_2'));
    const loc = res.headers.get('location')!;
    expect(loc).toBe('https://pearloom.test/?thanks=1&type=tip&amount=1000');
  });

  it('omits amount query param when amount_total is null', async () => {
    h.retrieveMock.mockImplementationOnce(async () => ({
      metadata: { siteId: 'sage-grove', paymentType: 'cash_gift' },
      amount_total: null,
    }));
    const res = await GET(getReq('session_id=cs_test_3'));
    const loc = res.headers.get('location')!;
    expect(loc).toContain('/sites/sage-grove');
    expect(loc).not.toContain('amount=');
  });

  it('redirects to /?paymentError=lookup-failed when Stripe retrieve throws', async () => {
    h.retrieveMock.mockImplementationOnce(async () => {
      throw new Error('No such checkout.session: cs_test_404');
    });
    const res = await GET(getReq('session_id=cs_test_404'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://pearloom.test/?paymentError=lookup-failed');
  });

  // NOTE on Stripe-not-configured: getStripe() returns null when
  // STRIPE_SECRET_KEY is missing, and the route redirects to
  // /?paymentError=not-configured. We can't easily test that
  // branch because we mock the entire @/lib/stripe/client module
  // with a getter that always returns a stripe-like object. The
  // signature-failure path in webhook/route.test.ts covers the
  // adjacent missing-env scenario.
});
