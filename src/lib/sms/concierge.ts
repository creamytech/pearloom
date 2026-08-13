// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sms/concierge.ts
//
// THE CONCIERGE NUMBER — a guest texts a question, Pear answers
// from the celebration they were actually invited to.
//
// All three platform reviews independently landed on the text
// channel: the guest who will never open a website will answer a
// text, and the question they ask ("what time?", "what do I wear?",
// "where do I park?") is already on the site.
//
// This module is the DECISION layer, kept pure so the rules can be
// tested without a webhook, a database, or a model:
//
//   1. Classify the message. STOP / HELP are carrier-compliance
//      words and must never reach an AI or a host.
//   2. Resolve WHICH celebration the number belongs to, from the
//      guest rows a lookup returned.
//   3. Shape the reply.
//
// THE PRIVACY RULE: an inbound text proves possession of a phone
// number and nothing else. So a number we don't recognise is told
// nothing — not the couple's names, not the date, not even that
// the number is or isn't on a list. Guessing helpfully here would
// turn the concierge into an oracle for anyone who dials it.
//
// A number on several lists is asked which one, by first name only
// — a guest already knows the people who invited them, but the
// reply must not enumerate celebrations to a stranger who
// spoofed a number, so the list only ever comes from rows that
// matched that exact number.
// ─────────────────────────────────────────────────────────────

/** What a guest's message is, before anything else happens. */
export type MessageKind = 'stop' | 'help' | 'question' | 'empty';

/** A guest row that matched the inbound number. */
export interface ConciergeMatch {
  siteId: string;
  siteSlug: string;
  /** Display label for the celebration — e.g. "Emma & James". */
  siteLabel: string;
  guestId: string;
  guestName: string;
  /** Published sites only; a draft has nothing to tell a guest. */
  published: boolean;
}

export type Resolution =
  | { kind: 'none' }
  | { kind: 'one'; match: ConciergeMatch }
  | { kind: 'many'; matches: ConciergeMatch[] };

const STOP_WORDS = new Set([
  'stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'revoke', 'optout', 'opt-out',
]);
const HELP_WORDS = new Set(['help', 'info']);

/**
 * Classify an inbound message.
 *
 * STOP/HELP are matched only when they are the WHOLE message, the
 * way the carriers define them — "help me find parking" is a
 * question, not a compliance keyword, and answering it with a
 * boilerplate HELP notice would be the wrong reply to a real guest.
 */
export function classifyMessage(raw: string | null | undefined): MessageKind {
  const body = (raw ?? '').trim();
  if (!body) return 'empty';
  const word = body.toLowerCase().replace(/[.!?]+$/, '');
  if (STOP_WORDS.has(word)) return 'stop';
  if (HELP_WORDS.has(word)) return 'help';
  return 'question';
}

/**
 * Which celebration is this number texting about?
 *
 * Unpublished sites are dropped first: a guest cannot have anything
 * to ask about a draft, and answering from one would leak a site
 * the host has not shared yet.
 */
export function resolveCelebration(matches: readonly ConciergeMatch[]): Resolution {
  const live = (matches ?? []).filter((m) => m.published);
  if (live.length === 0) return { kind: 'none' };
  if (live.length === 1) return { kind: 'one', match: live[0] };
  // Deduplicate by site — one person can appear twice on a roster.
  const bySite = new Map<string, ConciergeMatch>();
  for (const m of live) if (!bySite.has(m.siteId)) bySite.set(m.siteId, m);
  const unique = [...bySite.values()];
  return unique.length === 1
    ? { kind: 'one', match: unique[0] }
    : { kind: 'many', matches: unique };
}

/** SMS segments cost money and long texts get split badly. */
export const MAX_REPLY_CHARS = 320;

/** Trim to a whole sentence where possible, never mid-word. */
export function fitReply(text: string, limit: number = MAX_REPLY_CHARS): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastStop > limit * 0.5) return cut.slice(0, lastStop + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * The reply for a number we can't place.
 *
 * Deliberately says nothing about any celebration — not whether
 * this number is on a list, not whose. See the privacy rule above.
 */
export function unknownNumberReply(): string {
  return 'This is the Pearloom concierge. We can’t match this number to a celebration — '
    + 'ask whoever invited you for their site link, and reply here once you’re on their list.';
}

/** Ask which celebration, using only names that matched THIS number. */
export function disambiguationReply(matches: readonly ConciergeMatch[]): string {
  const labels = matches.slice(0, 4).map((m) => m.siteLabel);
  return fitReply(
    `You're on a few lists — ${labels.join(', ')}. Reply with one name and I'll answer about that one.`,
  );
}

export function stopReply(): string {
  return 'You won’t get any more texts from Pearloom. Reply START to turn them back on.';
}

export function helpReply(): string {
  return 'Pearloom concierge: text a question about the celebration you were invited to — '
    + 'the time, the address, what to wear. Reply STOP to opt out.';
}

/**
 * When Pear can't answer, the guest is told the truth and the
 * question goes to the host. Never invent an answer to a logistics
 * question — a guest who drives to the wrong address because a
 * model guessed is the worst outcome this feature has.
 */
export function escalationReply(hostFirstName?: string | null): string {
  const who = (hostFirstName ?? '').trim();
  return who
    ? `I don’t have that on the site yet — I’ve passed your question to ${who}, who’ll follow up.`
    : 'I don’t have that on the site yet — I’ve passed your question to the host, who’ll follow up.';
}

/** True when a model's answer should NOT be sent to the guest. */
export function shouldEscalate(answer: string | null | undefined): boolean {
  const a = (answer ?? '').trim();
  if (!a) return true;
  // The prompt asks the model to emit this exact token when the
  // site doesn't hold the answer — cheaper and far more reliable
  // than trying to detect hedging in prose.
  return a.toUpperCase().includes('NO_ANSWER');
}
