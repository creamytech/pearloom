// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/live-updates/route.ts
// Day-of live updates feed for wedding sites
// ─────────────────────────────────────────────────────────────
//
// Supabase table schema:
// create table live_updates (
//   id uuid default gen_random_uuid() primary key,
//   subdomain text not null,
//   message text not null,
//   photo_url text,
//   type text default 'misc', -- ceremony | reception | cocktail | misc
//   created_at timestamptz default now()
// );
// create index on live_updates (subdomain, created_at desc);

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const MOCK_UPDATES = [
  {
    id: '1',
    subdomain: 'demo',
    message: 'We just arrived at the venue — it looks absolutely magical!',
    photo_url: null,
    type: 'ceremony',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '2',
    subdomain: 'demo',
    message: 'The ceremony has begun. We said "I do!" 💍',
    photo_url: null,
    type: 'ceremony',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    subdomain: 'demo',
    message: 'Cocktail hour underway — the garden is gorgeous!',
    photo_url: null,
    type: 'cocktail',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json({ error: 'Missing subdomain' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      updates: MOCK_UPDATES.filter(u => u.subdomain === subdomain || subdomain === 'demo'),
      mock: true,
    });
  }

  try {
    const { data, error } = await supabase
      .from('live_updates')
      .select('id, message, photo_url, type, created_at')
      .eq('subdomain', subdomain)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[live-updates GET] Supabase error:', error);
      return NextResponse.json({ updates: [], _error: error.message });
    }

    return NextResponse.json({ updates: data || [] });
  } catch (err) {
    console.error('[live-updates GET] Error:', err);
    return NextResponse.json({ updates: [] });
  }
}

export async function POST(req: NextRequest) {
  // Only authenticated couple can post live updates
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subdomain?: string; message?: string; photo_url?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { subdomain, message, photo_url, type } = body;

  if (!subdomain || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (message.trim().length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 });
  }

  const validTypes = ['ceremony', 'reception', 'cocktail', 'misc'];
  const updateType = validTypes.includes(type || '') ? type : 'misc';

  const supabase = getSupabase();

  // Verify the session user owns the site
  if (supabase) {
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('subdomain', subdomain)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    if (site.creator_email !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!supabase) {
    return NextResponse.json({
      success: true,
      update: {
        id: `mock-${Date.now()}`,
        subdomain,
        message: message.trim(),
        photo_url: photo_url || null,
        type: updateType,
        created_at: new Date().toISOString(),
      },
      mock: true,
    });
  }

  try {
    const { data, error } = await supabase
      .from('live_updates')
      .insert([
        {
          subdomain,
          message: message.trim(),
          photo_url: photo_url || null,
          type: updateType,
        },
      ])
      .select('id, message, photo_url, type, created_at')
      .single();

    if (error) {
      console.error('[live-updates POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, update: data });
  } catch (err) {
    console.error('[live-updates POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
