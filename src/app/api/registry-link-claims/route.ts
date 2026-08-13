// ─────────────────────────────────────────────────────────────
// /api/registry-link-claims
//
// GET  — public, returns a per-URL summary of who's claimed each
//        entry on a site so the public renderer can show pills.
//        Shape: { claims: { [entryUrl]: { count, top: [{ name }] } } }
//        Names only — emails stay server-side (PII).
//
// POST — public, registers a claim. Body: { siteId, entryUrl,
//        claimerEmail, claimerName?, message?, quantity? }.
//        Auth-free by design (the entry URL is the credential —
//        same model as the link-out registry's "anyone can tap
//        the link"). Rate-limited per IP to deter spam.
//
// Note this is the link-out claim path. The native registry
// (registry_items + Stripe checkout) lives at /api/registry-items
// and tracks payments through Stripe; this endpoint is just an
// honor-system "I'll get this from the retailer" affordance.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve a `siteId` query value to the canonical sites.id UUID.
 *  Accepts either a UUID directly OR a subdomain string (the form
 *  the public renderer has on hand). Returns null when nothing
 *  resolves so callers degrade gracefully. */
async function resolveSiteUuid(
  sb: ReturnType<typeof getSupabase>,
  raw: string,
): Promise<string | null> {
  if (!sb) return null;
  if (UUID_RX.test(raw)) return raw;
  const { data } = await sb
    .from('sites')
    .select('id')
    .eq('subdomain', raw)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ── GET ──────────────────────────────────────────────────────
// Two response shapes by mode:
//  • default (public)  — aggregated claims grouped by URL,
//                         names only, no PII.
//  • ?host=1           — full per-row feed (with email + message)
//                         when the caller is the site's creator.
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  const hostMode = req.nextUrl.searchParams.get('host') === '1';
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json(hostMode ? { claims: [] } : { claims: {} });
  }

  const siteUuid = await resolveSiteUuid(sb, siteId);
  if (!siteUuid) {
    return NextResponse.json(hostMode ? { claims: [] } : { claims: {} });
  }

  // Host-mode requires session + ownership check. Without these,
  // claimer emails would leak to anyone who guessed the slug.
  if (hostMode) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: site } = await sb
      .from('sites')
      .select('creator_email')
      .eq('id', siteUuid)
      .maybeSingle();
    const ownerEmail = (site as { creator_email?: string } | null)?.creator_email?.toLowerCase();
    if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rows } = await sb
      .from('registry_link_claims')
      .select('id, entry_url, claimer_name, claimer_email, message, quantity, created_at, thanked_at')
      .eq('site_id', siteUuid)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    return NextResponse.json({ claims: rows ?? [] });
  }

  const { data, error } = await sb
    .from('registry_link_claims')
    .select('entry_url, claimer_name, created_at')
    .eq('site_id', siteUuid)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[registry-link-claims GET]', error);
    return NextResponse.json({ claims: {} });
  }

  // Group by entry_url; keep only first names (initials when full
  // name absent) so the pill copy reads warm and short. Top 3
  // surfaced explicitly; the rest go into the count.
  const grouped: Record<string, { count: number; top: Array<{ name: string }> }> = {};
  for (const row of data ?? []) {
    const url = row.entry_url as string;
    if (!grouped[url]) grouped[url] = { count: 0, top: [] };
    grouped[url].count += 1;
    if (grouped[url].top.length < 3) {
      const raw = (row.claimer_name as string | null) ?? '';
      const name = raw.trim().split(/\s+/)[0] || 'A guest';
      grouped[url].top.push({ name });
    }
  }

  return NextResponse.json({ claims: grouped });
}

// ── POST ─────────────────────────────────────────────────────
interface ClaimBody {
  siteId?: string;
  entryUrl?: string;
  claimerEmail?: string;
  claimerName?: string;
  message?: string;
  quantity?: number;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`registry-link-claim:${ip}`, { max: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many claims. Slow down a tick.' }, { status: 429 });
  }

  let body: ClaimBody = {};
  try { body = await req.json(); } catch { /* empty body → 400 below */ }

  const siteId = body.siteId?.trim();
  const entryUrl = body.entryUrl?.trim();
  const claimerEmail = body.claimerEmail?.trim();
  const claimerName = body.claimerName?.trim() || null;
  const message = body.message?.trim() || null;
  const quantity = Math.max(1, Math.min(99, Number(body.quantity ?? 1)));

  if (!siteId || !entryUrl || !claimerEmail) {
    return NextResponse.json({ error: 'siteId, entryUrl, and claimerEmail are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimerEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }
  // Length caps. Match the column types — long input is almost
  // always a paste-error or abuse, not a real claim.
  if (entryUrl.length > 1000 || claimerEmail.length > 200 || (claimerName?.length ?? 0) > 200 || (message?.length ?? 0) > 500) {
    return NextResponse.json({ error: 'Field too long' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Claims storage not configured.' }, { status: 503 });
  }

  const siteUuid = await resolveSiteUuid(sb, siteId);
  if (!siteUuid) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Soft-prevent doubles by the same email on the same entry —
  // the claim is honor-system, but if you've already claimed,
  // re-tapping should be a no-op rather than a duplicate row.
  const { data: existing } = await sb
    .from('registry_link_claims')
    .select('id')
    .eq('site_id', siteUuid)
    .eq('entry_url', entryUrl)
    .eq('claimer_email', claimerEmail)
    .is('revoked_at', null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, alreadyClaimed: true, id: existing.id });
  }

  const { data, error } = await sb
    .from('registry_link_claims')
    .insert({
      site_id: siteUuid,
      entry_url: entryUrl,
      claimer_email: claimerEmail,
      claimer_name: claimerName,
      message,
      quantity,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[registry-link-claims POST]', error);
    return NextResponse.json({ error: 'Could not save your claim. Try again in a moment.' }, { status: 500 });
  }

  // Gift claims default to an instant host email (thank-you notes
  // start with knowing who gave what). Fire-and-forget.
  void (async () => {
    try {
      const { data: site } = await sb
        .from('sites')
        .select('id, subdomain, occasion, creator_email, site_config')
        .eq('id', siteUuid)
        .maybeSingle();
      const cfg = (site as { site_config?: { creator_email?: string; names?: [string, string] } } | null)?.site_config;
      const ownerEmail = String((site as { creator_email?: string } | null)?.creator_email ?? cfg?.creator_email ?? '');
      const names = (cfg?.names ?? []).filter(Boolean);
      const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : ((site as { subdomain?: string } | null)?.subdomain ?? 'your site');
      const who = (claimerName ?? '').split(/\s+/)[0] || 'A guest';
      if (ownerEmail) {
        const { notifyHost } = await import('@/lib/notifications/notify');
        await notifyHost(sb, {
          siteId: siteUuid,
          siteLabel,
          ownerEmail,
          category: 'gifts',
          title: `${who} claimed a registry gift`,
          body: message ? String(message).slice(0, 200) : undefined,
          href: '/dashboard/registry',
          dedupeKey: `claim:${data.id}`,
        });
      }

      // Thank the gift-giver — fire-and-forget, key-gated.
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey && claimerEmail) {
        const subdomain = (site as { subdomain?: string } | null)?.subdomain;
        const occasion = (site as { occasion?: string } | null)?.occasion;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pearloom.com';
        const fromEmail = process.env.EMAIL_FROM || 'Pearloom <noreply@pearloom.com>';
        const { buildSiteUrl } = await import('@/lib/site-urls');
        const siteUrl = subdomain ? buildSiteUrl(subdomain, '', baseUrl, occasion) : baseUrl;
        const { buildRegistryClaimThankYouEmail } = await import('@/lib/email/brand-emails');
        const { subject, html } = buildRegistryClaimThankYouEmail({
          guestName: claimerName,
          coupleDisplay: siteLabel,
          // Link-out claims carry only the entry URL, not a tidy
          // item name — leave it null so the copy reads "your gift".
          itemName: null,
          siteUrl,
        });
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: fromEmail, to: [claimerEmail], subject, html }),
        }).catch((e) => console.warn('[registry-link-claims] thank-you email failed (non-fatal):', e));
      }
    } catch (err) {
      console.warn('[registry-link-claims] owner notify failed (non-fatal):', err);
    }
  })();

  return NextResponse.json({ ok: true, id: data.id });
}

// ── PATCH ────────────────────────────────────────────────────
// The thank-you ledger stamp. Owner-only. { id, thanked: boolean }
// → sets/unsets thanked_at. Drafting a thank-you note never sets
// this — only the host's explicit toggle does.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string; thanked?: boolean } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const id = (body.id ?? '').trim();
  if (!id || typeof body.thanked !== 'boolean') {
    return NextResponse.json({ error: 'id and thanked are required' }, { status: 400 });
  }

  const sb2 = getSupabase();
  if (!sb2) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  // Look up the claim's site to check ownership before touching it.
  const { data: claim } = await sb2
    .from('registry_link_claims')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

  const { data: site } = await sb2
    .from('sites')
    .select('creator_email')
    .eq('id', claim.site_id)
    .maybeSingle();
  const ownerEmail = (site as { creator_email?: string } | null)?.creator_email?.toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const thankedAt = body.thanked ? new Date().toISOString() : null;
  const { error } = await sb2
    .from('registry_link_claims')
    .update({ thanked_at: thankedAt })
    .eq('id', id);
  if (error) {
    console.error('[registry-link-claims PATCH]', error);
    return NextResponse.json({ error: 'Could not update' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, thankedAt });
}

// ── DELETE ───────────────────────────────────────────────────
// Soft-revoke a claim. Owner-only. Sets revoked_at; the row stays
// for analytics but stops showing up in the public pill aggregate
// and the host feed. Use cases: guest claimed wrong item, guest
// changed mind and unsent the gift, host wants to merge dupes.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  // Look up the claim's site to check ownership before touching it.
  const { data: claim } = await sb
    .from('registry_link_claims')
    .select('site_id')
    .eq('id', id)
    .maybeSingle();
  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

  const { data: site } = await sb
    .from('sites')
    .select('creator_email')
    .eq('id', claim.site_id)
    .maybeSingle();
  const ownerEmail = (site as { creator_email?: string } | null)?.creator_email?.toLowerCase();
  if (!ownerEmail || ownerEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await sb
    .from('registry_link_claims')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[registry-link-claims DELETE]', error);
    return NextResponse.json({ error: 'Could not revoke' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
