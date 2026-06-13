// ─────────────────────────────────────────────────────────────
// Pearloom / lib/print-engine/lob-client.ts
//
// Thin Lob.com REST wrapper for postcard + letter mailing.
// Lob is the default print fulfillment partner — they handle
// printing, postage, and mailing for ~$0.74/postcard, $1.20+
// for letters with proper return-address handling.
//
// Without LOB_API_KEY set, every call returns a graceful
// `{ ok: false, reason: 'not-configured' }` so the rest of the
// app can branch on that without throwing. This mirrors how the
// invite/render route handles missing OpenAI keys.
//
// Reference: https://docs.lob.com/#tag/Postcards
// ─────────────────────────────────────────────────────────────

const LOB_BASE = 'https://api.lob.com/v1';

export interface LobAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country?: string;
}

export interface PostcardCreateOpts {
  description?: string;
  to: LobAddress;
  from: LobAddress;
  /** Public URL to a 4x6 / 6x9 / 6x11 PNG/PDF for the front. */
  front: string;
  /** Optional back artwork — Lob can also accept HTML. */
  back?: string;
  size?: '4x6' | '6x9' | '6x11';
  /** Free-form metadata passed through to webhooks. */
  metadata?: Record<string, string>;
}

export interface PostcardResult {
  id: string;
  url?: string;
  expected_delivery_date?: string;
  carrier?: string;
  tracking_number?: string;
  status?: string;
}

export type LobResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not-configured'; message: string }
  | { ok: false; reason: 'http-error'; status: number; message: string }
  | { ok: false; reason: 'network'; message: string };

/** True iff the LOB_API_KEY env is set. */
export function hasLobKey(): boolean {
  return !!process.env.LOB_API_KEY;
}

function authHeader(): string {
  const key = process.env.LOB_API_KEY ?? '';
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

/** Postcard pricing as of 2026-04 — host-facing estimate. Lob's
 *  actual invoice may differ slightly with bulk discounts. */
export function postcardCostCents(size: '4x6' | '6x9' | '6x11' = '4x6', count = 1): number {
  const perCard = size === '4x6' ? 74 : size === '6x9' ? 144 : 184;
  return perCard * count;
}

/** Letter (full invitation in envelope) pricing. */
export function letterCostCents(count = 1): number {
  // Single-page colour letter w/ envelope is ~$1.20 each.
  return 120 * count;
}

export async function createPostcard(opts: PostcardCreateOpts): Promise<LobResult<PostcardResult>> {
  if (!hasLobKey()) {
    return {
      ok: false,
      reason: 'not-configured',
      message: 'LOB_API_KEY is not set on this server.',
    };
  }

  const body = new URLSearchParams();
  body.set('description', opts.description ?? 'Pearloom Print');
  body.set('size', opts.size ?? '4x6');
  body.set('front', opts.front);
  if (opts.back) body.set('back', opts.back);
  // Address fields are flat keys; Lob accepts them as
  // to[name], to[address_line1], etc.
  for (const [k, v] of Object.entries(opts.to)) {
    if (v) body.set(`to[${k}]`, String(v));
  }
  for (const [k, v] of Object.entries(opts.from)) {
    if (v) body.set(`from[${k}]`, String(v));
  }
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      body.set(`metadata[${k}]`, v);
    }
  }

  try {
    const res = await fetch(`${LOB_BASE}/postcards`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        reason: 'http-error',
        status: res.status,
        message: text || `Lob returned ${res.status}`,
      };
    }
    const data = (await res.json()) as PostcardResult;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'unknown network failure',
    };
  }
}

/** Optional address verification — useful before submitting a
 *  bulk send so we can flag bad rows up front. */
export async function verifyUsAddress(addr: LobAddress): Promise<LobResult<{ deliverability: string }>> {
  if (!hasLobKey()) {
    return { ok: false, reason: 'not-configured', message: 'LOB_API_KEY is not set.' };
  }
  const body = new URLSearchParams();
  body.set('primary_line', addr.address_line1);
  if (addr.address_line2) body.set('secondary_line', addr.address_line2);
  body.set('city', addr.address_city);
  body.set('state', addr.address_state);
  body.set('zip_code', addr.address_zip);
  try {
    const res = await fetch(`${LOB_BASE}/us_verifications`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, reason: 'http-error', status: res.status, message: text };
    }
    const data = (await res.json()) as { deliverability: string };
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'network failure',
    };
  }
}
