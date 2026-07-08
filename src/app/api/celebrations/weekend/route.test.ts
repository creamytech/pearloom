// ─────────────────────────────────────────────────────────────
// Pearloom / api/celebrations/weekend/route.test.ts
//
// The two-tier weekend contract (GRAND-PLAN-2 B.1). Pins:
//   • mode:'moment' events NEVER create a site row — saveSiteDraft
//     runs only for tier-2 ('site') events + the anchor.
//   • The ANCHOR manifest carries the moments as itinerary.days
//     (chronologically sorted, the ItineraryPanel shape) and its
//     blockOrder includes 'itinerary'.
//   • Moments without the anchor site present → 400 (they'd have
//     nowhere to live).
//   • The response reports moments separately from sites.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  session: { user: { email: 'host@example.com' } } as null | { user: { email: string } },
  saved: [] as Array<{ slug: string; manifest: Record<string, unknown> }>,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => h.session),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({
  saveSiteDraft: vi.fn(async (_email: string, slug: string, manifest: Record<string, unknown>) => {
    h.saved.push({ slug, manifest });
    return { success: true };
  }),
}));

import { POST } from './route';
import { NextRequest } from 'next/server';

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/celebrations/weekend', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  h.session = { user: { email: 'host@example.com' } };
  h.saved = [];
});

describe('POST /api/celebrations/weekend — two tiers (B.1)', () => {
  it('moments never create site rows; the anchor carries them as itinerary days', async () => {
    const res = await POST(post({
      anchor: 'wedding',
      names: ['Maya', 'Jordan'],
      anchorDate: '2026-09-06',
      baseSlug: 'maya-and-jordan',
      events: [
        { kind: 'wedding', daysFromAnchor: 0, mode: 'site' },
        { kind: 'rehearsal-dinner', daysFromAnchor: -1, mode: 'site' },
        { kind: 'welcome-party', daysFromAnchor: -1, mode: 'moment' },
        { kind: 'brunch', daysFromAnchor: 1, mode: 'moment' },
      ],
    }));
    expect(res.status).toBe(200);
    const data = await res.json();

    // Exactly two site rows — the moments cost nothing.
    expect(h.saved.map((s) => s.slug).sort()).toEqual([
      'maya-and-jordan',
      'maya-and-jordan-rehearsal',
    ]);
    expect(data.sites).toHaveLength(2);

    // The response reports the moments separately.
    expect(data.moments).toEqual([
      { kind: 'welcome-party', label: 'Welcome party', date: '2026-09-05' },
      { kind: 'brunch', label: 'Morning-after brunch', date: '2026-09-07' },
    ]);

    // The ANCHOR manifest carries them, sorted, in the panel shape,
    // with 'itinerary' merged into blockOrder.
    const anchor = h.saved.find((s) => s.slug === 'maya-and-jordan')!;
    const itin = anchor.manifest.itinerary as { days: Array<{ label: string; date: string; slots: unknown[] }> };
    expect(itin.days.map((d) => d.date)).toEqual(['2026-09-05', '2026-09-07']);
    expect(itin.days[0].label).toBe('Welcome party');
    expect(itin.days[0].slots).toHaveLength(1);
    expect(anchor.manifest.blockOrder).toContain('itinerary');

    // The satellite site does NOT carry the anchor's moments.
    const rehearsal = h.saved.find((s) => s.slug === 'maya-and-jordan-rehearsal')!;
    expect(rehearsal.manifest.itinerary).toBeUndefined();
  });

  it('rejects moments when the anchor site is absent', async () => {
    const res = await POST(post({
      anchor: 'wedding',
      names: ['Maya'],
      anchorDate: '2026-09-06',
      baseSlug: 'maya-weekend',
      events: [
        { kind: 'welcome-party', daysFromAnchor: -1, mode: 'moment' },
      ],
    }));
    expect(res.status).toBe(400);
    expect(h.saved).toHaveLength(0);
  });

  it('legacy clients without mode keep today’s all-sites behavior', async () => {
    const res = await POST(post({
      anchor: 'wedding',
      names: ['Maya', 'Jordan'],
      anchorDate: '2026-09-06',
      baseSlug: 'maya-and-jordan',
      events: [
        { kind: 'wedding', daysFromAnchor: 0 },
        { kind: 'brunch', daysFromAnchor: 1 },
      ],
    }));
    expect(res.status).toBe(200);
    expect(h.saved).toHaveLength(2);
    const data = await res.json();
    expect(data.moments).toEqual([]);
  });
});
