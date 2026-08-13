// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/rename — managed site addresses (C.6/L22).
//
// Before this route there was NO way to change a site's address
// anywhere in the product. The contract:
//
//   GET  ?check=<slug>            → { ok, available, reason? }
//   POST { subdomain, next }      → renames, records the redirect,
//                                   returns the new address.
//
// The old address 301s to the new one forever (site_redirects;
// chains collapsed at rename time), so printed cards and shared
// links keep working. Owner-only; the working copy, the staged
// snapshot, and every site-keyed child table ride along untouched
// because they key by the sites row's id, not the subdomain —
// the two subdomain-keyed exceptions (guest_photos, preview
// tokens) are legacy-tolerant readers.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildSitePath, normalizeOccasion } from '@/lib/site-urls';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function slugAvailability(slug: string): Promise<{ available: boolean; reason?: string }> {
  if (!SLUG_RE.test(slug)) {
    return { available: false, reason: 'Use lowercase letters, numbers, and hyphens (3–63 characters).' };
  }
  const supabase = db();
  if (!supabase) return { available: false, reason: 'Address service unavailable right now.' };
  const { data: taken } = await supabase
    .from('sites').select('id').eq('subdomain', slug).maybeSingle();
  if (taken) return { available: false, reason: 'That address is taken.' };
  // An address that old links still forward FROM can't be reused —
  // it would loop the redirect.
  const { data: forwarding } = await supabase
    .from('site_redirects').select('old_subdomain').eq('old_subdomain', slug).maybeSingle();
  if (forwarding) return { available: false, reason: 'That address is reserved by a renamed site.' };
  return { available: true };
}

export async function GET(req: NextRequest) {
  const check = (req.nextUrl.searchParams.get('check') ?? '').toLowerCase().trim();
  if (!check) return NextResponse.json({ error: 'Pass ?check=<address>.' }, { status: 400 });
  const result = await slugAvailability(check);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = checkRateLimit(`site-rename:${email}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many address changes. Try again in a bit.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const current = String(body?.subdomain ?? '').toLowerCase().trim();
    const next = String(body?.next ?? '').toLowerCase().trim();
    if (!current || !next) {
      return NextResponse.json({ error: 'Pass subdomain and next.' }, { status: 400 });
    }
    if (current === next) {
      return NextResponse.json({ error: 'That is already this site’s address.' }, { status: 400 });
    }

    const supabase = db();
    if (!supabase) return NextResponse.json({ error: 'Address service unavailable right now.' }, { status: 503 });

    // Ownership.
    const { data: site } = await supabase
      .from('sites')
      .select('id, site_config, ai_manifest')
      .eq('subdomain', current)
      .maybeSingle();
    if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
    const owner = String((site.site_config as Record<string, unknown>)?.creator_email ?? '').toLowerCase();
    if (owner !== email) return NextResponse.json({ error: 'Not your site.' }, { status: 403 });

    const availability = await slugAvailability(next);
    if (!availability.available) {
      return NextResponse.json({ error: availability.reason ?? 'That address is taken.' }, { status: 409 });
    }

    // The rename — subdomain + site_config.slug together.
    const cfg = (site.site_config as Record<string, unknown>) || {};
    const { error: renameErr } = await supabase
      .from('sites')
      .update({ subdomain: next, site_config: { ...cfg, slug: next } })
      .eq('id', site.id);
    if (renameErr) {
      return NextResponse.json({ error: `Rename failed: ${renameErr.message}` }, { status: 500 });
    }

    // The forwarding record. Collapse chains first (rows that pointed
    // at the old name now point at the new one), then add old → new,
    // then clear any stale row occupying the NEW name (renaming back
    // to a previously-used address serves directly again).
    await supabase.from('site_redirects').update({ new_subdomain: next }).eq('new_subdomain', current);
    await supabase.from('site_redirects').delete().eq('old_subdomain', next);
    const { error: redirErr } = await supabase
      .from('site_redirects')
      .insert({ old_subdomain: current, new_subdomain: next });
    if (redirErr) {
      // The rename itself succeeded — the missing redirect is worth a
      // loud log but not a failed response.
      console.warn('[api/sites/rename] redirect record failed:', redirErr.message);
    }

    const occasion = normalizeOccasion((site.ai_manifest as { occasion?: string } | null)?.occasion);
    return NextResponse.json({
      ok: true,
      subdomain: next,
      path: buildSitePath(next, '', occasion),
      forwarded: !redirErr,
    });
  } catch (err) {
    console.error('[api/sites/rename] error:', err);
    return NextResponse.json({ error: 'Rename failed.' }, { status: 500 });
  }
}
