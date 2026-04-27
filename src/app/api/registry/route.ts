// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/registry/route.ts
// Registry Sources CRUD API
// GET  /api/registry?siteId=xxx  — list sources for a site
// POST /api/registry             — create a source
// PATCH /api/registry            — update a source
// DELETE /api/registry?id=xxx    — delete a source
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// When the registry_sources table isn't configured we return an
// empty list so the UI shows its own "Add your first registry"
// empty state instead of placeholder Zola/Amazon rows.

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET /api/registry?siteId=xxx
export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[api/registry] Supabase not configured — returning empty list');
      return NextResponse.json({ sources: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('registry_sources')
      .select('*')
      .eq('site_id', siteId)
      .order('sort_order', { ascending: true });

    if (error) {
      // Table may not exist yet — return mock data for demo
      console.warn('[api/registry] DB error (table may not exist yet):', error.message);
      return NextResponse.json({ sources: [], _demo: true }, { status: 200 });
    }

    // Map snake_case DB columns to camelCase
    const sources = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      userId: row.user_id,
      siteId: row.site_id,
      storeName: row.store_name,
      registryUrl: row.registry_url,
      category: row.category,
      notes: row.notes,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ sources }, { status: 200 });
  } catch (err) {
    console.error('[api/registry] GET error:', err);
    return NextResponse.json({ sources: [], _error: 'Unexpected error' }, { status: 200 });
  }
}

// POST /api/registry — create a new registry source
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { siteId, storeName, registryUrl, category, notes } = body;

    if (!siteId || !storeName || !registryUrl) {
      return NextResponse.json(
        { error: 'siteId, storeName, and registryUrl are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      // Return a mock created source
      const mock = {
        id: `mock-${Date.now()}`,
        userId: 'demo',
        siteId,
        storeName,
        registryUrl,
        category: category || 'Other',
        notes: notes || '',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      };
      return NextResponse.json({ source: mock }, { status: 201 });
    }

    // Get current max sort_order
    const { data: existing } = await supabase
      .from('registry_sources')
      .select('sort_order')
      .eq('site_id', siteId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0;

    const { data, error } = await supabase
      .from('registry_sources')
      .insert({
        site_id: siteId,
        store_name: storeName,
        registry_url: registryUrl,
        category: category || 'Other',
        notes: notes || '',
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('[api/registry] POST insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const source = {
      id: (data as Record<string, unknown>).id,
      userId: (data as Record<string, unknown>).user_id,
      siteId: (data as Record<string, unknown>).site_id,
      storeName: (data as Record<string, unknown>).store_name,
      registryUrl: (data as Record<string, unknown>).registry_url,
      category: (data as Record<string, unknown>).category,
      notes: (data as Record<string, unknown>).notes,
      sortOrder: (data as Record<string, unknown>).sort_order,
      createdAt: (data as Record<string, unknown>).created_at,
    };

    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    console.error('[api/registry] POST error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// PATCH /api/registry — update an existing registry source
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, storeName, registryUrl, category, notes, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const updateFields: Record<string, unknown> = {};
    if (storeName !== undefined) updateFields.store_name = storeName;
    if (registryUrl !== undefined) updateFields.registry_url = registryUrl;
    if (category !== undefined) updateFields.category = category;
    if (notes !== undefined) updateFields.notes = notes;
    if (sortOrder !== undefined) updateFields.sort_order = sortOrder;

    const { error } = await supabase
      .from('registry_sources')
      .update(updateFields)
      .eq('id', id);

    if (error) {
      console.error('[api/registry] PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[api/registry] PATCH error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// DELETE /api/registry?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { error } = await supabase
      .from('registry_sources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/registry] DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('[api/registry] DELETE error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
