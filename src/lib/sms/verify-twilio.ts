// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sms/verify-twilio.ts
//
// Twilio webhook signature verification.
//
// THE RULE, and the reason this is its own tested module: it fails
// CLOSED. An unset auth token means "reject", never "allow". The
// platform audit found exactly the opposite mistake on
// /api/film/render-complete — an unset webhook secret let anything
// through — and an inbound SMS endpoint is a far better target: it
// speaks to guests in the host's name.
//
// Twilio's scheme (documented under "Validating Signatures from
// Twilio"): take the full request URL, append every POST parameter
// as key+value in ASCII-sorted key order, HMAC-SHA1 the result with
// the account auth token, base64 it, and compare against the
// X-Twilio-Signature header.
// ─────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Build the exact string Twilio signs. Exported for tests. */
export function twilioSignatureBase(url: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  let out = url;
  for (const k of keys) out += k + params[k];
  return out;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface VerifyInput {
  /** The full public URL Twilio requested, including query string. */
  url: string;
  /** The POST body params, already decoded. */
  params: Record<string, string>;
  /** The X-Twilio-Signature header, if present. */
  signature: string | null | undefined;
  /** TWILIO_AUTH_TOKEN. Absent → reject. */
  authToken: string | null | undefined;
}

/**
 * Is this request genuinely from Twilio?
 *
 * Returns false — never throws, never "allows because unconfigured"
 * — for a missing token, a missing header, or any mismatch.
 */
export function verifyTwilioSignature({ url, params, signature, authToken }: VerifyInput): boolean {
  if (!authToken || !signature) return false;
  try {
    const expected = createHmac('sha1', authToken)
      .update(Buffer.from(twilioSignatureBase(url, params), 'utf8'))
      .digest('base64');
    return safeEqual(expected, signature);
  } catch {
    return false;
  }
}
