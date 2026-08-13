import { describe, it, expect } from 'vitest';
import type { StoryManifest } from '@/types';
import {
  nextStepFor,
  rsvpMomentumFor,
  rsvpReplyBy,
  isManifestPublished,
  GALLERY_TARGET_COUNT,
} from './next-step';

/* Frozen "today" for every case — deterministic regardless of when
   the suite runs. */
const NOW = new Date(2027, 3, 1); // April 1, 2027 (local)

/** Fully-threaded published manifest; override per case. */
function manifest(over: Record<string, unknown> = {}): StoryManifest {
  return {
    coverPhoto: 'https://cdn.example/cover.jpg',
    logistics: { date: 'April 26, 2027', venue: 'Santorini' },
    galleryImages: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'],
    chapters: [{ title: 'How we met' }],
    published: true,
    ...over,
  } as unknown as StoryManifest;
}

describe('nextStepFor — priority ladder', () => {
  it('1 · missing cover photo wins first, even when later rungs also fail', () => {
    const step = nextStepFor(
      manifest({ coverPhoto: '', logistics: {}, galleryImages: [], chapters: [], published: false }),
      undefined,
      NOW,
    );
    expect(step).toMatchObject({ id: 'cover', label: 'Add your cover photo', target: 'hero' });
    expect(step?.hint).toBeTruthy();
  });

  it('2 · missing event date → Lock the date (hero)', () => {
    const step = nextStepFor(manifest({ logistics: { venue: 'Santorini' } }), undefined, NOW);
    expect(step).toMatchObject({ id: 'date', label: 'Lock the date', target: 'hero' });
  });

  it('3 · thin gallery → Add N more photos, blank entries ignored', () => {
    const step = nextStepFor(manifest({ galleryImages: ['a.jpg', '', '  '] }), undefined, NOW);
    expect(step).toMatchObject({ id: 'gallery', label: 'Add 3 more photos', target: 'gallery' });
  });

  it('3 · one photo short → singular copy', () => {
    const step = nextStepFor(
      manifest({ galleryImages: Array.from({ length: GALLERY_TARGET_COUNT - 1 }, (_, i) => `p${i}.jpg`) }),
      undefined,
      NOW,
    );
    expect(step?.label).toBe('Add 1 more photo');
  });

  it('4 · empty chapters → Tell the story (story)', () => {
    const step = nextStepFor(manifest({ chapters: [] }), undefined, NOW);
    expect(step).toMatchObject({ id: 'story', label: 'Tell the story', target: 'story' });
  });

  it('5 · complete but unpublished → Press it live (publish)', () => {
    const step = nextStepFor(manifest({ published: false }), undefined, NOW);
    expect(step).toMatchObject({ id: 'publish', label: 'Press it live', target: 'publish' });
  });

  it('5 · publishedAt alone counts as published (older persisted sites)', () => {
    const step = nextStepFor(
      manifest({ published: undefined, publishedAt: '2027-03-01T10:00:00Z' }),
      { guests: 0 },
      NOW,
    );
    expect(step).toMatchObject({ id: 'guest-list', target: 'guests' });
  });

  it('6 · published with zero guests → Build your guest list (guests)', () => {
    const step = nextStepFor(manifest(), { guests: 0, pendingRsvps: 0 }, NOW);
    expect(step).toMatchObject({ id: 'guest-list', label: 'Build your guest list', target: 'guests' });
  });

  it('6 · guest count unknown (counts omitted) does NOT fire the guest-list step', () => {
    expect(nextStepFor(manifest(), undefined, NOW)).toBeNull();
  });

  it('7 · pending replies + reply-by within 7 days → Nudge N pending replies', () => {
    const step = nextStepFor(
      manifest({ rsvpDeadline: 'April 4, 2027' }), // 3 days from NOW
      { guests: 40, pendingRsvps: 5 },
      NOW,
    );
    expect(step).toMatchObject({ id: 'nudge', label: 'Nudge 5 pending replies', target: 'guests' });
    expect(step?.hint).toContain('April 4');
  });

  it('7 · singular pending reply copy + ISO deadline parses as local time', () => {
    const step = nextStepFor(
      manifest({ rsvpDeadline: '2027-04-01' }), // today, ISO form
      { guests: 40, pendingRsvps: 1 },
      NOW,
    );
    expect(step?.label).toBe('Nudge 1 pending reply');
  });

  it('7 · reply-by outside the 7-day window → no nudge, null', () => {
    const far = nextStepFor(
      manifest({ rsvpDeadline: 'May 30, 2027' }),
      { guests: 40, pendingRsvps: 5 },
      NOW,
    );
    const past = nextStepFor(
      manifest({ rsvpDeadline: 'March 28, 2027' }),
      { guests: 40, pendingRsvps: 5 },
      NOW,
    );
    expect(far).toBeNull();
    expect(past).toBeNull();
  });

  it('7 · no explicit deadline falls back to event date minus 14 days', () => {
    // Event April 12 → default reply-by March 29… outside window going
    // forward; use event April 10 → reply-by March 27 (past, no nudge)
    // and event April 13 → reply-by March 30 (past). Use April 14 →
    // reply-by March 31 (past). Event April 16, 2027 → reply-by
    // April 2 — 1 day ahead of NOW, inside the window.
    const step = nextStepFor(
      manifest({ logistics: { date: 'April 16, 2027' } }),
      { guests: 40, pendingRsvps: 3 },
      NOW,
    );
    expect(step).toMatchObject({ id: 'nudge', label: 'Nudge 3 pending replies' });
  });

  it('8 · everything threaded → null', () => {
    expect(nextStepFor(manifest(), { guests: 40, pendingRsvps: 0 }, NOW)).toBeNull();
  });
});

describe('rsvpMomentumFor', () => {
  it('returns pending + replyBy + daysLeft inside the window', () => {
    const m = rsvpMomentumFor(manifest({ rsvpDeadline: 'April 6, 2027' }), 7, NOW);
    expect(m).not.toBeNull();
    expect(m?.pending).toBe(7);
    expect(m?.daysLeft).toBe(5);
    expect(m?.replyBy.getMonth()).toBe(3);
    expect(m?.replyBy.getDate()).toBe(6);
  });

  it('null when nothing is pending or the deadline is unparseable', () => {
    expect(rsvpMomentumFor(manifest({ rsvpDeadline: 'April 4, 2027' }), 0, NOW)).toBeNull();
    expect(rsvpMomentumFor(manifest({ rsvpDeadline: 'soonish', logistics: { date: 'whenever' } }), 5, NOW)).toBeNull();
  });
});

describe('helpers', () => {
  it('rsvpReplyBy — explicit deadline beats the event-date default', () => {
    const d = rsvpReplyBy(manifest({ rsvpDeadline: '2027-04-08', logistics: { date: 'April 26, 2027' } }));
    expect(d?.getDate()).toBe(8);
    const fallback = rsvpReplyBy(manifest({ logistics: { date: 'April 26, 2027' } }));
    expect(fallback?.getDate()).toBe(12); // 26 - 14
  });

  it('isManifestPublished — published flag OR publishedAt, never subdomain', () => {
    expect(isManifestPublished(manifest({ published: true }))).toBe(true);
    expect(isManifestPublished(manifest({ published: undefined, publishedAt: '2027-01-01' }))).toBe(true);
    expect(isManifestPublished(manifest({ published: false, subdomain: 'claimed-draft' }))).toBe(false);
  });
});
