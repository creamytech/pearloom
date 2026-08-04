// ─────────────────────────────────────────────────────────────
// planner/client-book — the professional's view.
//
// Two things matter here. First, the planner does NOT own their
// clients' celebrations, and the book must never blur that: owned
// and client sites stay separated on the co-host role.
//
// Second, the "attention" column has to stay sparse. A planner
// scanning fifteen clients needs the three that matter to stand
// out; an action on every row trains people to ignore the column
// entirely, which is worse than having none.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildClientBook, type BookSite } from './client-book';

const TODAY = '2026-08-04';

function site(over: Partial<BookSite> & { domain: string }): BookSite {
  return { id: over.domain, published: true, ...over };
}

describe('ownership is never blurred', () => {
  const book = buildClientBook([
    site({ domain: 'my-template', occasion: 'wedding' }),
    site({ domain: 'emma-james', occasion: 'wedding', coHostRole: 'editor' }),
    site({ domain: 'ana-luis', occasion: 'wedding', coHostRole: 'guest-manager' }),
    site({ domain: 'my-own', occasion: 'birthday', coHostRole: 'owner' }),
  ], TODAY);

  it('separates client sites from the planner’s own', () => {
    // Both clients are undated here, so they land alphabetically —
    // deterministic ordering matters more than insertion order when
    // a planner is scanning the same list every morning.
    expect(book.clients.map((e) => e.site.domain)).toEqual(['ana-luis', 'emma-james']);
    expect(book.mine.map((e) => e.site.domain)).toEqual(['my-own', 'my-template']);
  });

  it('treats an explicit owner role as their own, not a client', () => {
    expect(book.clients.some((e) => e.site.domain === 'my-own')).toBe(false);
  });

  it('counts clients, not everything', () => {
    expect(book.counts.clients).toBe(2);
  });
});

describe('urgency ordering — what needs attention rises', () => {
  const book = buildClientBook([
    site({ domain: 'undated', coHostRole: 'editor' }),
    site({ domain: 'far', coHostRole: 'editor', eventDate: '2027-06-01' }),
    site({ domain: 'soon', coHostRole: 'editor', eventDate: '2026-08-10' }),
    site({ domain: 'past', coHostRole: 'editor', eventDate: '2026-07-01' }),
    site({ domain: 'today', coHostRole: 'editor', eventDate: '2026-08-04' }),
  ], TODAY);

  it('puts upcoming first (soonest leading), then past, then undated', () => {
    expect(book.clients.map((e) => e.site.domain)).toEqual(['today', 'soon', 'far', 'past', 'undated']);
  });

  it('computes days correctly around today', () => {
    const byDomain = Object.fromEntries(book.clients.map((e) => [e.site.domain, e.daysUntil]));
    expect(byDomain.today).toBe(0);
    expect(byDomain.soon).toBe(6);
    expect(byDomain.past).toBeLessThan(0);
    expect(byDomain.undated).toBeNull();
  });

  it('counts what is imminent and what is still a draft', () => {
    const b = buildClientBook([
      site({ domain: 'a', coHostRole: 'editor', eventDate: '2026-08-10' }),
      site({ domain: 'b', coHostRole: 'editor', eventDate: '2027-06-01' }),
      site({ domain: 'c', coHostRole: 'editor', eventDate: '2026-08-20', published: false }),
    ], TODAY);
    expect(b.counts.soon).toBe(2);         // a and c are within 30 days
    expect(b.counts.unpublished).toBe(1);  // c
  });
});

describe('attention stays sparse', () => {
  it('says nothing about a published event comfortably far out', () => {
    const b = buildClientBook([
      site({ domain: 'fine', coHostRole: 'editor', eventDate: '2027-06-01' }),
    ], TODAY);
    expect(b.clients[0].attention).toBeNull();
  });

  it('flags an unpublished site close to the day, with the count', () => {
    const b = buildClientBook([
      site({ domain: 'late', coHostRole: 'editor', eventDate: '2026-08-20', published: false }),
    ], TODAY);
    expect(b.clients[0].attention).toMatch(/not published/i);
    expect(b.clients[0].attention).toMatch(/16 days out/);
  });

  it('flags a missing date and a far-off draft differently', () => {
    const b = buildClientBook([
      site({ domain: 'nodate', coHostRole: 'editor' }),
      site({ domain: 'draft', coHostRole: 'editor', eventDate: '2027-06-01', published: false }),
    ], TODAY);
    const byDomain = Object.fromEntries(b.clients.map((e) => [e.site.domain, e.attention]));
    expect(byDomain.nodate).toMatch(/no date/i);
    expect(byDomain.draft).toMatch(/still a draft/i);
  });

  it('NEVER hurries a memorial', () => {
    const b = buildClientBook([
      site({ domain: 'remembering', occasion: 'memorial', coHostRole: 'editor', eventDate: '2026-08-06' }),
    ], TODAY);
    const entry = b.clients[0];
    expect(entry.noun).toBe('remembrance');
    // Two days out on a celebration would read "2 days out."; here it stays quiet.
    expect(entry.attention).toBeNull();
  });

  it('states an unpublished memorial plainly, without a countdown', () => {
    const b = buildClientBook([
      site({ domain: 'r2', occasion: 'memorial', coHostRole: 'editor', eventDate: '2026-08-06', published: false }),
    ], TODAY);
    expect(b.clients[0].attention).toBe('Not published yet.');
    expect(b.clients[0].attention).not.toMatch(/days out/);
  });
});

describe('robustness', () => {
  it('handles an empty book', () => {
    const b = buildClientBook([], TODAY);
    expect(b).toEqual({ mine: [], clients: [], counts: { clients: 0, soon: 0, unpublished: 0 } });
  });

  it('survives malformed dates without throwing', () => {
    const b = buildClientBook([
      site({ domain: 'bad', coHostRole: 'editor', eventDate: 'someday' }),
    ], TODAY);
    expect(b.clients[0].daysUntil).toBeNull();
  });
});
