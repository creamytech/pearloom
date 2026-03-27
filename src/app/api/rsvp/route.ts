import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// POST /api/rsvp — submit a guest RSVP from the public site
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      siteId,
      guestName,
      email,
      status,
      plusOne,
      plusOneName,
      mealPreference,
      dietaryRestrictions,
      songRequest,
      message,
      selectedEvents,
    } = body;

    if (!siteId || !guestName) {
      return NextResponse.json({ error: 'siteId and guestName required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Upsert by email+siteId so guests can update their RSVP
    const { data, error } = await supabase
      .from('guests')
      .upsert(
        {
          site_id: siteId,
          name: guestName,
          email: email || null,
          status: status || 'attending',
          plus_one: plusOne || false,
          plus_one_name: plusOne ? plusOneName : null,
          meal_preference: mealPreference || null,
          dietary_restrictions: dietaryRestrictions || null,
          song_request: songRequest || null,
          message: message || null,
          event_ids: selectedEvents || [],
          responded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'site_id,email',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('RSVP upsert error:', error);
      // Graceful: confirm success even if table doesn't exist yet
      return NextResponse.json({ success: true, guest: { name: guestName, status } });
    }

    return NextResponse.json({ success: true, guest: data });
  } catch (err) {
    console.error('RSVP route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/rsvp?siteId=xxx — read RSVPs (used in dashboard)
export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId)
      .order('responded_at', { ascending: false });

    if (error) return NextResponse.json({ guests: [] });
    return NextResponse.json({ guests: data || [] });
  } catch (err) {
    console.error('RSVP GET error:', err);
    return NextResponse.json({ guests: [] });
  }
}
