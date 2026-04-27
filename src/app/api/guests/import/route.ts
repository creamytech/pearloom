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
    if (!site || site.creator_email !== session.user.email) {
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
