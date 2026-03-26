import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// We have to use the service role or a public anon key that allows inserts to rsvps table
// If RLS allows inserts, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY works
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { siteId, name, email, attending, dietary } = await req.json();

    if (!siteId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rsvps')
      .insert([
        {
          site_id: siteId,
          name,
          email,
          attending,
          dietary: dietary || null,
        }
      ]);

    if (error) {
      console.error('Supabase insert error (rsvps):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error('RSVP API Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
