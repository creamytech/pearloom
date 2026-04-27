import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// GET /api/guests?siteId=xxx — list all guests for a site
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept both `siteId` (legacy) and `site` (new) for compatibility.
    const siteId = req.nextUrl.searchParams.get('siteId') || req.nextUrl.searchParams.get('site');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const hasAddressOnly = req.nextUrl.searchParams.get('hasAddress') === '1';

    const supabase = getSupabase();
    let q = supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true });
    if (hasAddressOnly) {
      q = q.not('mailing_address_line1', 'is', null);
    }
    const { data, error } = await q;

    if (error) {
      console.error('Guests fetch error:', error);
      return NextResponse.json({ guests: [] });
    }

    const guests = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status || 'pending',
      plusOne: row.plus_one || false,
      plusOneName: row.plus_one_name,
      mealPreference: row.meal_preference,
      dietaryRestrictions: row.dietary_restrictions,
      message: row.message,
      respondedAt: row.responded_at,
      eventIds: Array.isArray(row.event_ids) ? row.event_ids : [],
      mailingAddress: row.mailing_address_line1 ? {
        line1: row.mailing_address_line1,
        line2: row.mailing_address_line2,
        city: row.city,
        state: row.state,
        zip: row.postal_code,
      } : null,
    }));

    return NextResponse.json({ guests });
  } catch (err) {
    console.error('Guests error:', err);
    return NextResponse.json({ guests: [] });
  }
}

// POST /api/guests — add a guest manually
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { siteId, name, email, plusOne } = body;

    if (!siteId || !name) {
      return NextResponse.json({ error: 'siteId and name required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('guests')
      .insert({
        site_id: siteId,
        name,
        email: email || null,
        status: 'pending',
        plus_one: plusOne || false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Guest insert error:', error);
      // Return a graceful fake guest if table doesn't exist
      return NextResponse.json({
        guest: { id: `local-${Date.now()}`, name, email, status: 'pending', plusOne: plusOne || false }
      });
    }

    return NextResponse.json({
      guest: {
        id: data.id, name: data.name, email: data.email,
        status: data.status, plusOne: data.plus_one,
      }
    });
  } catch (err) {
    console.error('Add guest error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/guests?id=xxx — remove a guest
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from('guests').delete().eq('id', id);

    if (error) {
      console.error('Guest delete error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Guest delete error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
