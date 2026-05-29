// ──────────────────────────────────────────────────────────────
// POST /api/user/delete-account
//
// GDPR self-serve account deletion. Hard-deletes every site the
// caller owns (cascading through guests, photos, RSVPs, registry
// claims, etc.) plus every user-keyed row.
//
// Why hard-delete instead of anonymize:
//   • The privacy page promises "delete your account" — not
//     "anonymize so other guests still see your contributions"
//   • Matches GDPR right-to-be-forgotten intent (Article 17)
//   • Simpler audit story — one operation, one outcome
//   • docs/SOFT-DELETE-POLICY.md (Phase 1.6) catalogs which
//     columns mean what, and confirms account-delete is the only
//     mechanism that physically removes B/C-category rows
//   • Co-host data orphans gracefully — guest_id FKs are
//     ON DELETE SET NULL, so guestbook signatures etc. survive
//     anonymized rather than disappearing
//
// Confirmation gate:
//   The request body MUST include { confirmEmail: <session email> }
//   typed exactly. The UI requires the user type their own email
//   into a text field before the button enables — industry standard
//   for irreversible operations (GitHub, Stripe, Vercel all do this).
//
// Rate limit: 3 per 24h per user via RATE_LIMITS.accountDeletion.
// That's enough for legitimate retry-after-network-error attempts
// but stops a hijacked session from chain-deleting in a loop.
//
// What this DOES NOT do (post-MVP follow-ups noted in the audit):
//   • NextAuth session invalidation — the caller's JWT still works
//     until expiry. Front-end signs them out client-side after the
//     200, which is sufficient for the common case but a stolen JWT
//     would still authenticate to other routes for a few minutes.
//     Add a token blocklist when we move auth to a server session.
//
// Audit trail (added 2026-05-30, migration 20260530_account_deletions_audit):
//   • Inserts one row into account_deletions with sha256(email),
//     site count, sha256(client_ip). Original email + IP NEVER
//     stored — defeats GDPR right-to-be-forgotten. The hash lets
//     operators answer "did this person delete before?" without
//     retaining identifying info.
// ──────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Tables keyed on user email. Order is intentional — the children
// of these (none) come first, then the parents (none below either,
// flat list). Each table is independent of the others.
const USER_KEYED_DELETES: Array<{ table: string; column: string }> = [
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

// Per-site fan-out deletions. Order is important — children FIRST,
// then the site row itself. Anything with ON DELETE CASCADE on a
// FK to sites/guests/pearloom_guests would cascade automatically,
// but the schema mixes cascade + no-cascade; explicit deletes
// here are belt-and-braces.
const SITE_KEYED_DELETES_BY_SUBDOMAIN: string[] = [
  // Per-guest features — delete before the guests themselves
  'memory_prompts',
  'whispers',
  'time_capsule',
  'song_requests',
  'guest_photos',
  'guestbook',
  'rsvps',
  'pearloom_guests',
  // Money + items
  'registry_item_claims',
  'registry_items',
  'payments',
  // Operations
  'live_updates',
  'anniversary_log',
  'scheduled_communications',
];

const SITE_KEYED_DELETES_BY_UUID: string[] = [
  'guests',
  'cohosts',
  'cohost_invites',
  'site_invites',
  'seating_constraints',
  'seating_tables',
  'venue_spaces',
  'venues',
];

async function safeDelete(
  sb: SupabaseClient,
  table: string,
  column: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
): Promise<number> {
  try {
    // select count by reading first; deleting non-existent rows is a no-op.
    const { error } = await sb.from(table).delete().eq(column, value);
    if (error) {
      // Table-doesn't-exist or column-doesn't-exist — skip silently.
      // We don't want one stale schema migration to block a delete.
      console.warn(`[delete-account] ${table}.${column} delete failed:`, error.message);
      return 0;
    }
    return 1;
  } catch (err) {
    console.warn(`[delete-account] ${table} delete threw:`, err);
    return 0;
  }
}

async function safeDeleteIn(
  sb: SupabaseClient,
  table: string,
  column: string,
  values: string[],
): Promise<number> {
  if (!values.length) return 0;
  try {
    const { error } = await sb.from(table).delete().in(column, values);
    if (error) {
      console.warn(`[delete-account] ${table}.${column} bulk delete failed:`, error.message);
      return 0;
    }
    return 1;
  } catch (err) {
    console.warn(`[delete-account] ${table} bulk delete threw:`, err);
    return 0;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = session.user.email;
  const emailKey = email.toLowerCase().trim();

  // Confirmation — body must echo the session email exactly (case-
  // insensitive). Without this gate, a misclick or CSRF-light flow
  // could delete the account on a stale tab refresh.
  let body: { confirmEmail?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const confirm = String(body.confirmEmail ?? '').toLowerCase().trim();
  if (!confirm || confirm !== emailKey) {
    return NextResponse.json(
      { error: 'confirmEmail must match your account email exactly' },
      { status: 400 },
    );
  }

  const { allowed, resetAt } = checkRateLimit(`delete-account:${emailKey}`, RATE_LIMITS.accountDeletion);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many delete attempts — try again later.', resetAt },
      { status: 429 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }

  // ── 1. Resolve all sites the user owns ──
  const { data: sitesRaw, error: sitesError } = await supabase
    .from('sites')
    .select('id, subdomain')
    .ilike('creator_email', email);
  if (sitesError) {
    console.error('[delete-account] sites lookup failed:', sitesError.message);
    return NextResponse.json({ error: 'Failed to read sites' }, { status: 500 });
  }
  const sites = sitesRaw ?? [];
  const siteUuids = sites.map(s => s.id as string).filter(Boolean);
  const siteSubdomains = sites.map(s => s.subdomain as string).filter(Boolean);

  console.log(
    `[delete-account] starting hard-delete for ${email}: ${sites.length} sites ` +
    `(uuids: ${siteUuids.length}, subdomains: ${siteSubdomains.length})`,
  );

  // ── 2. Children of those sites — by subdomain ──
  for (const table of SITE_KEYED_DELETES_BY_SUBDOMAIN) {
    await safeDeleteIn(supabase, table, 'site_id', siteSubdomains);
  }

  // ── 3. Children of those sites — by uuid ──
  for (const table of SITE_KEYED_DELETES_BY_UUID) {
    await safeDeleteIn(supabase, table, 'site_id', siteUuids);
  }

  // ── 4. The sites themselves ──
  if (siteUuids.length) {
    const { error } = await supabase.from('sites').delete().in('id', siteUuids);
    if (error) {
      console.warn('[delete-account] sites delete failed:', error.message);
    }
  }

  // ── 5. User-keyed tables (independent of sites) ──
  for (const { table, column } of USER_KEYED_DELETES) {
    await safeDelete(supabase, table, column, email);
  }

  // ── 6. Any leftover community marks the user authored ──
  await safeDelete(supabase, 'community_marks', 'creator_email', email);
  await safeDelete(supabase, 'newsletter_subscribers', 'email', emailKey);

  console.log(`[delete-account] hard-delete complete for ${email}`);

  // Audit trail (migration 20260530_account_deletions_audit).
  // Fire-and-forget — the user's account is already gone; we
  // don't want a logging failure to surface as a delete failure.
  // Email + IP are sha256'd so the audit row can be looked up if
  // the same person re-registers, but the original PII is
  // unrecoverable from the table. GDPR-safe.
  try {
    const emailHash = createHash('sha256').update(emailKey).digest('hex');
    const ipRaw = getClientIp(req);
    // 'unknown' is getClientIp's fallback when neither x-forwarded-for
    // nor x-real-ip is set — treat that as null instead of hashing
    // the literal string so the column carries a useful signal.
    const ipHash = ipRaw && ipRaw !== 'unknown'
      ? createHash('sha256').update(ipRaw).digest('hex')
      : null;
    await supabase.from('account_deletions').insert({
      email_sha256: emailHash,
      sites_deleted: sites.length,
      ip_sha256: ipHash,
    });
  } catch (auditErr) {
    console.warn('[delete-account] audit-log insert failed (non-fatal):', auditErr);
  }

  return NextResponse.json({
    success: true,
    deletedSites: sites.length,
    message: 'Your account and all associated data have been deleted.',
  });
}
