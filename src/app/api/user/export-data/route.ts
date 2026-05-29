// ──────────────────────────────────────────────────────────────
// POST /api/user/export-data
//
// GDPR self-serve data export — returns a single JSON document
// containing every row the caller owns or that's pinned to a site
// they own.
//
// The privacy page (/privacy) promises "Request a copy of
// everything we have, correct anything that's wrong, or delete
// your account". Before this route existed, that promise had no
// implementation; users had to email hello@pearloom.com and wait
// for manual SQL.
//
// Identity is by NextAuth session email (the canonical key — see
// CLAUDE-DESIGN.md §14, "no separate user.id"). Email comparisons
// throughout are case-insensitive and trimmed because IdP casing
// drifts (Google sometimes capitalizes, sometimes lowercases the
// local-part on first sign-in).
//
// Rate-limited via RATE_LIMITS.dataExport (10/hour/user) to keep
// a runaway script from DDoSing our own egress.
//
// Response is application/json with Content-Disposition: attachment
// so the browser saves it instead of rendering. File name includes
// today's date so successive exports don't overwrite.
// ──────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Tables keyed directly on the user — owner email (varies by schema
// vintage — see CLAUDE-PRODUCT.md soft-delete audit). Each entry
// is read with .eq(column, sessionEmail).
//
// Note this set INTENTIONALLY does not include `community_marks`
// or `newsletter_subscribers` — `community_marks` is a kudos a
// guest wrote (it stays attached to the site they wrote on, not
// to the author's account), and `newsletter_subscribers` is
// keyed on email but already supports opt-out via its own flow.
const USER_OWNED_TABLES: Array<{ table: string; column: string }> = [
  { table: 'user_preferences', column: 'email' },
  { table: 'user_media', column: 'owner_email' },
  { table: 'pear_voice_samples', column: 'user_email' },
  { table: 'pear_memories', column: 'user_email' },
  { table: 'events', column: 'owner_email' },
  { table: 'print_jobs', column: 'owner_email' },
  { table: 'scheduled_communications', column: 'owner_email' },
  { table: 'site_email_prefs', column: 'owner_email' },
  { table: 'anniversary_email_log', column: 'owner_email' },
];

// Tables keyed on site_id (sites.subdomain is the historic text key;
// newer tables use the uuid sites.id). For each site the user owns
// we fan-out reads to all of these.
const SITE_OWNED_TABLES: Array<{ table: string; siteIdShape: 'subdomain' | 'uuid' }> = [
  { table: 'guests', siteIdShape: 'uuid' },
  { table: 'pearloom_guests', siteIdShape: 'subdomain' },
  { table: 'rsvps', siteIdShape: 'subdomain' },
  { table: 'guestbook', siteIdShape: 'subdomain' },
  { table: 'guest_photos', siteIdShape: 'subdomain' },
  { table: 'memory_prompts', siteIdShape: 'subdomain' },
  { table: 'whispers', siteIdShape: 'subdomain' },
  { table: 'time_capsule', siteIdShape: 'subdomain' },
  { table: 'song_requests', siteIdShape: 'subdomain' },
  { table: 'registry_items', siteIdShape: 'subdomain' },
  { table: 'registry_item_claims', siteIdShape: 'subdomain' },
  { table: 'payments', siteIdShape: 'subdomain' },
  { table: 'live_updates', siteIdShape: 'subdomain' },
  { table: 'cohosts', siteIdShape: 'uuid' },
  { table: 'cohost_invites', siteIdShape: 'uuid' },
  { table: 'site_invites', siteIdShape: 'uuid' },
];

async function safeSelect(
  sb: SupabaseClient,
  table: string,
  column: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
): Promise<{ rows: unknown[]; error: string | null }> {
  try {
    const { data, error } = await sb.from(table).select('*').eq(column, value);
    if (error) {
      // Most failures here are "table doesn't exist in this deploy"
      // or a column rename — log + return empty, never break the
      // whole export because one optional table is missing.
      return { rows: [], error: error.message };
    }
    return { rows: data ?? [], error: null };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function safeSelectIn(
  sb: SupabaseClient,
  table: string,
  column: string,
  values: string[],
): Promise<{ rows: unknown[]; error: string | null }> {
  if (!values.length) return { rows: [], error: null };
  try {
    const { data, error } = await sb.from(table).select('*').in(column, values);
    if (error) return { rows: [], error: error.message };
    return { rows: data ?? [], error: null };
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = session.user.email;
  const emailKey = email.toLowerCase().trim();

  const { allowed, resetAt } = checkRateLimit(`export:${emailKey}`, RATE_LIMITS.dataExport);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Export limit reached — try again later.', resetAt },
      { status: 429 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  const warnings: string[] = [];

  // ── Sites the user owns (case-insensitive on creator_email) ──
  // We fetch both id (uuid) and subdomain (text) because the rest
  // of the schema is split — older tables use subdomain as site_id,
  // newer tables use id.
  const { data: sitesRaw, error: sitesError } = await supabase
    .from('sites')
    .select('*')
    .ilike('creator_email', email);  // case-insensitive exact match
  if (sitesError) {
    warnings.push(`sites: ${sitesError.message}`);
  }
  const sites = sitesRaw ?? [];
  const siteUuids = sites.map(s => s.id as string).filter(Boolean);
  const siteSubdomains = sites.map(s => s.subdomain as string).filter(Boolean);

  // ── User-keyed tables ──
  const userOwned: Record<string, unknown[]> = {};
  for (const { table, column } of USER_OWNED_TABLES) {
    const { rows, error } = await safeSelect(supabase, table, column, email);
    userOwned[table] = rows;
    if (error) warnings.push(`${table}: ${error}`);
  }

  // ── Site-keyed tables (fan-out per ownership shape) ──
  const siteOwned: Record<string, unknown[]> = {};
  for (const { table, siteIdShape } of SITE_OWNED_TABLES) {
    const values = siteIdShape === 'uuid' ? siteUuids : siteSubdomains;
    const { rows, error } = await safeSelectIn(supabase, table, 'site_id', values);
    siteOwned[table] = rows;
    if (error) warnings.push(`${table}: ${error}`);
  }

  const dump = {
    exportedAt: new Date().toISOString(),
    user: { email, name: session.user.name ?? null },
    sites,
    userData: userOwned,
    siteData: siteOwned,
    warnings: warnings.length ? warnings : undefined,
  };

  const datestamp = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
  const filename = `pearloom-export-${datestamp}.json`;

  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
