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

/** List-Unsubscribe + one-click headers for guest-facing sends. */
export function listUnsubHeaders(): Record<string, string> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com').replace(/\/$/, '');
  return {
    'List-Unsubscribe': `<mailto:unsubscribe@pearloom.com>, <${base}/unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
