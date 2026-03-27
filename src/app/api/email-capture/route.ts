import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// POST /api/email-capture — stores email for Coming Soon waitlist
export async function POST(req: NextRequest) {
  try {
    const { email, siteId, name } = await req.json();

    if (!email || !siteId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Try to upsert into email_captures table
    const { error } = await supabase
      .from('email_captures')
      .upsert(
        { site_id: siteId, email: email.toLowerCase().trim(), name: name || null, captured_at: new Date().toISOString() },
        { onConflict: 'site_id,email' }
      );

    if (error) {
      // If table doesn't exist yet, return success anyway (graceful degradation)
      console.error('Email capture error:', error);
      return NextResponse.json({ success: true, note: 'Table may not exist yet' });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email capture error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET /api/email-capture?siteId=xxx — returns count for owners
export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ count: 0 });

    const supabase = getSupabase();
    const { count } = await supabase
      .from('email_captures')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId);

    return NextResponse.json({ count: count || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
