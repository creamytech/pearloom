// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/unsubscribe.ts
//
// Signed, per-recipient unsubscribe tokens — the credential behind
// the one-click List-Unsubscribe surface (RFC 8058). The /unsubscribe
// route verifies the HMAC and suppresses exactly the address the
// token encodes: no auth, no DB lookup to identify the recipient.
//
// Token shape:  <base64url(payload)>.<base64url(hmac)>
//   payload = { e: email, s?: siteId, c?: channel }
//
// Signed with HMAC-SHA256 keyed on EMAIL_UNSUB_SECRET (falls back to
// NEXTAUTH_SECRET, mirroring api/sites/collab-token). No expiry —
// an unsubscribe link must keep working indefinitely (CAN-SPAM /
// Gmail-Yahoo rules), so there is no timestamp to age out.
//
// Pure + dependency-free (node:crypto only) so deliverability.ts can
// import it without pulling in Supabase.
// ─────────────────────────────────────────────────────────────

import crypto from 'node:crypto';

export interface UnsubTarget {
  email: string;
  siteId?: string | null;
  channel?: string | null;
}

function secret(): string {
  return process.env.EMAIL_UNSUB_SECRET || process.env.NEXTAUTH_SECRET || 'pearloom-unsub';
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

/** Mint a signed token that identifies exactly who to suppress. */
export function signUnsubToken(target: UnsubTarget): string {
  const payload: Record<string, string> = { e: target.email.trim().toLowerCase() };
  if (target.siteId) payload.s = target.siteId;
  if (target.channel) payload.c = target.channel;
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verify + decode a token. Returns null on any tamper / format error. */
export function verifyUnsubToken(token: string | null | undefined): UnsubTarget | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // Length check first — timingSafeEqual throws on a length mismatch.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<string, unknown>;
    const email = typeof obj.e === 'string' ? obj.e : '';
    if (!email) return null;
    return {
      email,
      siteId: typeof obj.s === 'string' ? obj.s : null,
      channel: typeof obj.c === 'string' ? obj.c : null,
    };
  } catch {
    return null;
  }
}

/** Full one-click unsubscribe URL for the List-Unsubscribe header. */
export function buildUnsubscribeUrl(target: UnsubTarget): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com').replace(/\/$/, '');
  return `${base}/unsubscribe?u=${encodeURIComponent(signUnsubToken(target))}`;
}
