// ─────────────────────────────────────────────────────────────
// sms/concierge — the decision layer.
//
// Two failure modes drive these tests:
//
//   1. LEAKING. An inbound text proves possession of a phone
//      number and nothing more. A number we can't place must be
//      told nothing — not names, not dates, not even whether it's
//      on a list.
//
//   2. GUESSING. A guest who drives to the wrong address because a
//      model invented one is the worst thing this feature can do,
//      so an unanswerable question must escalate, never improvise.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  classifyMessage,
  resolveCelebration,
  unknownNumberReply,
  disambiguationReply,
  escalationReply,
  shouldEscalate,
  fitReply,
  MAX_REPLY_CHARS,
  type ConciergeMatch,
} from './concierge';

function match(over: Partial<ConciergeMatch> & { siteId: string }): ConciergeMatch {
  return {
    siteSlug: over.siteId,
    siteLabel: 'Emma & James',
    guestId: `g-${over.siteId}`,
    guestName: 'Aunt Prue',
    published: true,
    ...over,
  };
}

describe('carrier keywords never reach an AI or a host', () => {
  it('recognises the STOP family', () => {
    for (const w of ['STOP', 'stop', 'Stop.', 'unsubscribe', 'CANCEL', 'quit', 'end']) {
      expect(classifyMessage(w), w).toBe('stop');
    }
  });

  it('recognises HELP', () => {
    expect(classifyMessage('HELP')).toBe('help');
    expect(classifyMessage('info')).toBe('help');
  });

  it('does NOT eat a real question that merely starts with "help"', () => {
    // Answering "help me find parking" with a boilerplate HELP
    // notice is the wrong reply to a real guest.
    expect(classifyMessage('help me find parking')).toBe('question');
    expect(classifyMessage('can you stop by the hotel first?')).toBe('question');
  });

  it('treats a blank message as empty, not a question', () => {
    expect(classifyMessage('')).toBe('empty');
    expect(classifyMessage('   ')).toBe('empty');
    expect(classifyMessage(null)).toBe('empty');
  });
});

describe('resolving which celebration a number belongs to', () => {
  it('answers for a single live match', () => {
    const r = resolveCelebration([match({ siteId: 'a' })]);
    expect(r.kind).toBe('one');
  });

  it('IGNORES drafts — a guest can have nothing to ask about an unshared site', () => {
    expect(resolveCelebration([match({ siteId: 'a', published: false })]).kind).toBe('none');
  });

  it('collapses a guest listed twice on the same roster', () => {
    const r = resolveCelebration([
      match({ siteId: 'a', guestId: 'g1' }),
      match({ siteId: 'a', guestId: 'g2' }),
    ]);
    expect(r.kind).toBe('one');
  });

  it('asks which one when the number is genuinely on two lists', () => {
    const r = resolveCelebration([
      match({ siteId: 'a', siteLabel: 'Emma & James' }),
      match({ siteId: 'b', siteLabel: 'Ana & Luis' }),
    ]);
    expect(r.kind).toBe('many');
    if (r.kind === 'many') expect(r.matches).toHaveLength(2);
  });

  it('handles nothing at all', () => {
    expect(resolveCelebration([]).kind).toBe('none');
  });
});

describe('an unknown number is told NOTHING', () => {
  const reply = unknownNumberReply();

  it('names no celebration, no host, no date', () => {
    expect(reply).not.toMatch(/Emma|James|wedding|\d{4}-\d{2}-\d{2}/);
  });

  it('does not confirm or deny that the number is on any list', () => {
    // "You're not on the list" is itself information about a
    // specific celebration — the reply must stay symmetric.
    expect(reply).not.toMatch(/not on|isn't on|no such|removed/i);
  });

  it('still tells the person what to do next', () => {
    expect(reply).toMatch(/ask whoever invited you/i);
  });
});

describe('the disambiguation reply', () => {
  it('uses only labels from rows that matched this number', () => {
    const r = disambiguationReply([
      match({ siteId: 'a', siteLabel: 'Emma & James' }),
      match({ siteId: 'b', siteLabel: 'Ana & Luis' }),
    ]);
    expect(r).toContain('Emma & James');
    expect(r).toContain('Ana & Luis');
  });

  it('stays inside one text even with many lists', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      match({ siteId: `s${i}`, siteLabel: `Celebration Number ${i} With A Long Name` }));
    expect(disambiguationReply(many).length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
  });
});

describe('escalation, not improvisation', () => {
  it('escalates an empty answer', () => {
    expect(shouldEscalate('')).toBe(true);
    expect(shouldEscalate(null)).toBe(true);
    expect(shouldEscalate('   ')).toBe(true);
  });

  it('escalates on the model’s explicit no-answer token', () => {
    expect(shouldEscalate('NO_ANSWER')).toBe(true);
    expect(shouldEscalate('no_answer — the site says nothing about parking')).toBe(true);
  });

  it('sends a real answer through', () => {
    expect(shouldEscalate('The ceremony starts at 4pm at The Old Mill.')).toBe(false);
  });

  it('tells the guest the truth and names the host when known', () => {
    expect(escalationReply('Emma')).toMatch(/passed your question to Emma/);
    expect(escalationReply(null)).toMatch(/passed your question to the host/);
    // Never pretends to know.
    expect(escalationReply('Emma')).toMatch(/don’t have that/);
  });
});

describe('replies fit a text message', () => {
  it('leaves a short reply alone', () => {
    expect(fitReply('Ceremony at 4pm.')).toBe('Ceremony at 4pm.');
  });

  it('cuts at a sentence when it can', () => {
    const long = `${'A'.repeat(200)}. ${'B'.repeat(200)}.`;
    const out = fitReply(long);
    expect(out.length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
    expect(out.endsWith('.')).toBe(true);
  });

  it('never cuts mid-word when it has to trim hard', () => {
    const out = fitReply(`${'word '.repeat(200)}`);
    expect(out.length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
    expect(out).not.toMatch(/wor…$/);
  });

  it('collapses the whitespace a model likes to add', () => {
    expect(fitReply('Ceremony\n\n  at 4pm.')).toBe('Ceremony at 4pm.');
  });
});
