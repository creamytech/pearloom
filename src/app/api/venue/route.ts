import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Pearloom / api/venue/route.ts
// CRUD endpoints for venue data stored in Supabase
// ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/venue?siteId=xxx — get venues for a site
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ venues: [] });
    }

    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[api/venue] GET error:', error);
      return NextResponse.json({ venues: [] });
    }

    return NextResponse.json({ venues: data ?? [] });
  } catch (err) {
    console.error('[api/venue] GET error:', err);
    return NextResponse.json({ venues: [] });
  }
}

// POST /api/venue — create venue
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { siteId, ...venueData } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      // Graceful fallback — return a local ID so the UI keeps working
      return NextResponse.json({
        venue: { id: `local-${Date.now()}`, site_id: siteId, ...venueData },
      });
    }

    const { data, error } = await supabase
      .from('venues')
      .insert({
        site_id: siteId,
        ...venueData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[api/venue] POST error:', error);
      return NextResponse.json({
        venue: { id: `local-${Date.now()}`, site_id: siteId, ...venueData },
      });
    }

    return NextResponse.json({ venue: data });
  } catch (err) {
    console.error('[api/venue] POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/venue — update venue
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ venue: { id, ...updates } });
    }

    const { data, error } = await supabase
      .from('venues')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[api/venue] PATCH error:', error);
      return NextResponse.json({ venue: { id, ...updates } });
    }

    return NextResponse.json({ venue: data });
  } catch (err) {
    console.error('[api/venue] PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/venue?id=xxx — delete venue
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase.from('venues').delete().eq('id', id);

    if (error) {
      console.error('[api/venue] DELETE error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/venue] DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
