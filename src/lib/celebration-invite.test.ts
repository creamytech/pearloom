// ─────────────────────────────────────────────────────────────
// celebration-invite — reverse acquisition, and its limits.
//
// The link a satellite host hands the couple is deliberately weak:
// it grants nothing, it can't be revoked because there's nothing
// to revoke, and it must never imply the couple is getting access
// to the shower's guest list. These tests pin that it stays a
// pre-fill and nothing more.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  celebrationInviteHref,
  celebrationInviteMessage,
  isSatelliteOccasion,
  shouldOfferInvite,
} from './celebration-invite';

describe('isSatelliteOccasion — who is planned FOR', () => {
  it('covers the events hosted by someone other than the honouree', () => {
    for (const o of ['bridal-shower', 'bachelorette-party', 'rehearsal-dinner', 'baby-shower']) {
      expect(isSatelliteOccasion(o), o).toBe(true);
    }
  });

  it('excludes the main event and unrelated occasions', () => {
    for (const o of ['wedding', 'memorial', 'reunion', 'graduation', 'birthday']) {
      expect(isSatelliteOccasion(o), o).toBe(false);
    }
    expect(isSatelliteOccasion(null)).toBe(false);
    expect(isSatelliteOccasion(undefined)).toBe(false);
  });
});

describe('celebrationInviteHref — a pre-fill, not a grant', () => {
  it('carries the celebration link the wizard already understands', () => {
    const href = celebrationInviteHref({
      fromSlug: 'emma-shower',
      celebrationId: 'celeb-1',
      celebrationName: 'Emma & James, all weekend',
      suggestOccasion: 'wedding',
    });
    expect(href.startsWith('/wizard/new?')).toBe(true);
    const q = new URLSearchParams(href.split('?')[1]);
    expect(q.get('from')).toBe('emma-shower');
    expect(q.get('cid')).toBe('celeb-1');
    expect(q.get('cname')).toBe('Emma & James, all weekend');
    expect(q.get('occasion')).toBe('wedding');
  });

  it('drops an unknown occasion rather than sending a bad one', () => {
    const href = celebrationInviteHref({
      fromSlug: 's', celebrationId: 'c', celebrationName: 'n',
      suggestOccasion: 'not-an-occasion',
    });
    expect(new URLSearchParams(href.split('?')[1]).get('occasion')).toBeNull();
  });

  it('carries NO token, no guest, and nothing that grants access', () => {
    const href = celebrationInviteHref({
      fromSlug: 'emma-shower', celebrationId: 'celeb-1', celebrationName: 'Emma & James',
    });
    expect(href).not.toMatch(/token|guest|email|secret|key=/i);
  });

  it('caps a long celebration name', () => {
    const href = celebrationInviteHref({
      fromSlug: 's', celebrationId: 'c', celebrationName: 'x'.repeat(200),
    });
    expect((new URLSearchParams(href.split('?')[1]).get('cname') ?? '').length).toBeLessThanOrEqual(80);
  });

  it('degrades safely on empty input', () => {
    expect(celebrationInviteHref({ fromSlug: '', celebrationId: '', celebrationName: '' }))
      .toBe('/wizard/new?');
  });
});

describe('celebrationInviteMessage — honest about what is shared', () => {
  const base = {
    hostFirstName: 'Priya',
    satelliteOccasion: 'bridal-shower',
    celebrationName: 'Emma & James, all weekend',
    suggestOccasion: 'wedding',
  };

  it('names the sender, the event, and the celebration', () => {
    const msg = celebrationInviteMessage(base);
    expect(msg).toContain('Priya');
    expect(msg).toContain('Emma & James, all weekend');
    expect(msg.toLowerCase()).toContain('shower');
  });

  it('says plainly that nothing of theirs is shared back', () => {
    const msg = celebrationInviteMessage(base);
    expect(msg).toMatch(/nothing of yours is shared back/i);
    expect(msg).toMatch(/your site stays yours/i);
  });

  it('reads fine without a sender name', () => {
    const msg = celebrationInviteMessage({ ...base, hostFirstName: null });
    expect(msg).not.toMatch(/undefined|null/);
    expect(msg.startsWith('Your ')).toBe(true);
  });

  it('uses the occasion-aware container noun, never "celebration" for a memorial', () => {
    const msg = celebrationInviteMessage({
      ...base, suggestOccasion: 'memorial', satelliteOccasion: 'brunch',
    });
    expect(msg).toContain('remembrance');
    expect(msg).not.toMatch(/one celebration/);
  });

  it('avoids product jargon a first-time host would decode', () => {
    expect(celebrationInviteMessage(base)).not.toMatch(/manifest|satellite|container|scope|slug/i);
  });
});

describe('shouldOfferInvite — only where it makes sense', () => {
  it('offers for a linked satellite event', () => {
    expect(shouldOfferInvite({ occasion: 'bridal-shower', celebrationId: 'c1' })).toBe(true);
  });

  it('does not offer for the main event, or an unlinked one', () => {
    expect(shouldOfferInvite({ occasion: 'wedding', celebrationId: 'c1' })).toBe(false);
    expect(shouldOfferInvite({ occasion: 'bridal-shower', celebrationId: null })).toBe(false);
    expect(shouldOfferInvite({ occasion: 'bridal-shower', celebrationId: '  ' })).toBe(false);
  });
});
