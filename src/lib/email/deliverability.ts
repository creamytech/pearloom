// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/deliverability.ts
//
// Two small things every guest-facing email should carry to land
// in the inbox instead of spam:
//   • a plaintext alternative (HTML-only mail scores worse, and
//     Gmail/Yahoo's bulk rules expect a text/plain part)
//   • List-Unsubscribe + one-click headers (required by the
//     2024 Gmail/Yahoo sender rules; their absence hurts placement)
//
// htmlToText is deliberately simple + dependency-free — our email
// HTML is hand-built and predictable, so a tag strip + entity
// decode produces clean, readable text.
// ─────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&rsquo;': '’', '&lsquo;': '‘',
  '&ldquo;': '“', '&rdquo;': '”', '&mdash;': '—',
  '&ndash;': '–', '&hellip;': '…', '&nbsp;': ' ',
  '&#9679;': '•', '&lt;': '<', '&gt;': '>', '&quot;': '"',
};

/** Convert our branded email HTML to a readable text/plain body. */
export function htmlToText(html: string): string {
  let s = html;
  // Anchors → "label (url)" so the link survives in plaintext.
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
    const text = label.replace(/<[^>]+>/g, '').trim();
    return text ? `${text} (${href})` : href;
  });
  // Block-level closes → newlines.
  s = s.replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  // Strip every remaining tag.
  s = s.replace(/<[^>]+>/g, '');
  // Decode the entities we actually emit.
  for (const [ent, ch] of Object.entries(ENTITIES)) {
    s = s.split(ent).join(ch);
  }
  // Numeric entities, just in case.
  s = s.replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)));
  // Tidy whitespace.
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

import { buildUnsubscribeUrl } from './unsubscribe';

/** Who a message is going to, so the unsubscribe link can identify
 *  exactly whom to suppress on a one-click POST. */
export interface UnsubRecipient {
  email?: string | null;
  /** Scope the opt-out to one site (a guest saying "stop" for one
   *  couple shouldn't unsubscribe them from another). Omit for a
   *  global opt-out. */
  siteId?: string | null;
  channel?: string | null;
}

/**
 * List-Unsubscribe + one-click headers for guest-facing sends.
 *
 * Pass the recipient so the link carries a signed, per-recipient
 * token (RFC 8058 one-click works without auth). Called with no
 * recipient it falls back to the bare /unsubscribe page — still a
 * real surface, just without pre-identifying who to suppress.
 */
export function listUnsubHeaders(recipient?: UnsubRecipient): Record<string, string> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com').replace(/\/$/, '');
  const url = recipient?.email
    ? buildUnsubscribeUrl({
        email: recipient.email,
        siteId: recipient.siteId ?? null,
        channel: recipient.channel ?? null,
      })
    : `${base}/unsubscribe`;
  return {
    'List-Unsubscribe': `<mailto:unsubscribe@pearloom.com>, <${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
