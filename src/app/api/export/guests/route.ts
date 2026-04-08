// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/export/guests/route.ts
// GDPR data export — download guest list as CSV
// GET /api/export/guests?siteId=xxx
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

/** Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines */
function csvEscape(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface GuestRow {
  name: string;
  email: string | null;
  status: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  meal_preference: string | null;
  dietary_restrictions: string | null;
  table_assignment: string | null;
  responded_at: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by user email
    const rateCheck = checkRateLimit(`export-guests:${session.user.email}`, RATE_LIMITS.dataExport);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId query parameter required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, subdomain, site_config')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
    if (ownerEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all guests for this site
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('name, email, status, plus_one, plus_one_name, meal_preference, dietary_restrictions, table_assignment, responded_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true });

    if (guestsError) {
      console.error('[export/guests] Guests query error:', guestsError);
      return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
    }

    // Build CSV
    const header = 'Name,Email,RSVP Status,Plus Ones,Meal Preference,Dietary Notes,Table Assignment,Responded At';
    const rows = (guests as GuestRow[] || []).map((g) => {
      const plusOnes = g.plus_one ? (g.plus_one_name || 'Yes') : 'No';
      return [
        csvEscape(g.name),
        csvEscape(g.email),
        csvEscape(g.status || 'pending'),
        csvEscape(plusOnes),
        csvEscape(g.meal_preference),
        csvEscape(g.dietary_restrictions),
        csvEscape(g.table_assignment),
        csvEscape(g.responded_at),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pearloom-guests-${site.subdomain}-${dateStr}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[export/guests] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
