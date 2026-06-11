// ──────────────────────────────────────────────────────────────
// POST /api/guests/import
//
// Bulk-import guests for a site from a CSV string. Body shape:
//   {
//     siteId: string,
//     csv: string,           // raw CSV text
//     skipDuplicates?: bool, // default true — skip rows whose email
//                              or name matches an existing guest
//   }
//
// Returns:
//   {
//     batchId: string,         // uuid stamped on every imported row
//     parsed: number,          // rows successfully parsed
//     inserted: number,        // rows actually inserted
//     skipped: number,         // duplicates skipped
//     rejected: { rowIndex, reason }[],  // unparseable rows
//     warnings: { rowIndex, message }[], // soft warnings (bad email)
//     headerMap: { [header]: 'email' | 'name' | ... | 'ignored' }
//   }
//
// Idempotency: each call mints a new batch_id, but emails are still
// dedupe-checked against existing guests by lowercased email +
// normalised name. So re-running an import after a partial failure
// won't double-create the rows that already landed.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGuestCsv, dedupeAgainst } from '@/lib/csv/parse-guests';
import { getPlanWithLimitsForEmail, planLimitResponseBody, isSiteGriefExempt } from '@/lib/plan-gate';
import { normalizePersonEmail } from '@/lib/people';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 2000;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const siteId = typeof body?.siteId === 'string' ? body.siteId : '';
    const csv = typeof body?.csv === 'string' ? body.csv : '';
    const skipDuplicates = body?.skipDuplicates !== false;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }
    if (!csv.trim()) {
      return NextResponse.json({ error: 'csv is required' }, { status: 400 });
    }
    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'CSV exceeds 2MB' }, { status: 413 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });
    }

    // Ownership check
    const { data: site } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', siteId)
      .maybeSingle();
    // Case-insensitive owner check — IdP casing variance otherwise
    // 403s the legitimate owner. Matches /api/sites/[domain].
    if (!site
      || String(site.creator_email ?? '').toLowerCase().trim()
        !== session.user.email.toLowerCase().trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = parseGuestCsv(csv);
    if (parsed.guests.length === 0) {
      return NextResponse.json({
        error: 'No valid rows found. Make sure the file has a header row with at least a "Name" column.',
        rejected: parsed.rejected,
        headerMap: parsed.headerMap,
      }, { status: 400 });
    }
    if (parsed.guests.length > MAX_ROWS) {
      return NextResponse.json({ error: `Max ${MAX_ROWS} guests per import.` }, { status: 413 });
    }

    // Pull existing emails + names for dedupe
    const { data: existing } = await supabase
      .from('guests')
      .select('email, name')
      .eq('site_id', siteId);

    const existingEmails = new Set<string>();
    const existingNames = new Set<string>();
    for (const row of existing || []) {
      const e = (row.email as string | null)?.toLowerCase();
      if (e) existingEmails.add(e);
      const n = (row.name as string | null)?.toLowerCase().replace(/\s+/g, ' ').trim();
      if (n) existingNames.add(n);
    }

    const deduped = dedupeAgainst(parsed.guests, { existingEmails, existingNames });
    const toInsert = skipDuplicates ? deduped.filter((g) => !g.duplicateOf) : deduped;
    const skipped = deduped.length - toInsert.length;

    // Plan gate — maxGuests from PLAN_LIMITS (@/lib/plan-gate). Reuses
    // the `existing` rows fetched above as the current count (a failed
    // fetch counts as 0 — fail open). Rejects the whole batch rather
    // than partially importing silently; `allowed` tells the UI how
    // many more rows would fit so it can offer a partial import.
    // Memorial/funeral sites are exempt from the guest cap (the
    // published "grief deserves no paywall" promise — plan-gate.ts).
    const { plan, limits } = await getPlanWithLimitsForEmail(session.user.email);
    const currentGuests = (existing ?? []).length;
    const griefExempt = await isSiteGriefExempt(supabase, siteId);
    if (!griefExempt && Number.isFinite(limits.maxGuests) && currentGuests + toInsert.length > limits.maxGuests) {
      return NextResponse.json({
        ...planLimitResponseBody('guests', limits.maxGuests, plan),
        allowed: Math.max(0, limits.maxGuests - currentGuests),
      }, { status: 402 });
    }

    const batchId = crypto.randomUUID();
    const importedAt = new Date().toISOString();
    const rows = toInsert.map((g) => ({
      site_id: siteId,
      name: g.name,
      email: g.email,
      phone: g.phone,
      party_label: g.party_label,
      plus_one: g.plus_one,
      plus_one_name: g.plus_one_name,
      plus_one_count: g.plus_one_count,
      mailing_address_line1: g.mailing_address_line1,
      mailing_address_line2: g.mailing_address_line2,
      city: g.city,
      state: g.state,
      postal_code: g.postal_code,
      country: g.country,
      meal_preference: g.meal_preference,
      dietary_restrictions: g.dietary_restrictions,
      status: 'pending',
      imported_at: importedAt,
      import_batch_id: batchId,
    }));

    let inserted = 0;
    if (rows.length > 0) {
      // Insert in chunks of 200 to stay under request size limits.
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from('guests').insert(chunk);
        if (error) {
          console.error('[api/guests/import] insert chunk error:', error.message);
          return NextResponse.json({
            error: `Insert failed at row ${i + inserted + 1}: ${error.message}`,
            inserted, batchId,
          }, { status: 500 });
        }
        inserted += chunk.length;
      }

      // Persistent guest identity — one batched people upsert for
      // every distinct email in the import, then the SQL linker
      // stitches person_id across this site's rows. Fire-and-forget:
      // identity never blocks an import.
      void (async () => {
        try {
          const byEmail = new Map<string, { email: string; display_name: string | null; phone: string | null; dietary: string | null }>();
          for (const r of rows) {
            const email = normalizePersonEmail(r.email);
            if (!email) continue;
            byEmail.set(email, {
              email,
              display_name: r.name ?? null,
              phone: r.phone ?? null,
              dietary: r.dietary_restrictions ?? null,
            });
          }
          if (byEmail.size === 0) return;
          const people = Array.from(byEmail.values());
          for (let i = 0; i < people.length; i += 200) {
            await supabase
              .from('people')
              .upsert(people.slice(i, i + 200), { onConflict: 'email', ignoreDuplicates: true });
          }
          await supabase.rpc('link_guests_to_people', { p_site_id: siteId });
        } catch (err) {
          console.warn('[api/guests/import] people link failed (non-fatal):', err);
        }
      })();
    }

    const warnings = parsed.guests
      .filter((g) => g.warnings.length > 0)
      .map((g) => ({ rowIndex: g.rowIndex, message: g.warnings.join('; ') }));

    return NextResponse.json({
      batchId,
      parsed: parsed.guests.length,
      inserted,
      skipped,
      rejected: parsed.rejected,
      warnings,
      headerMap: parsed.headerMap,
    });
  } catch (err) {
    console.error('[api/guests/import] unhandled:', err);
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
