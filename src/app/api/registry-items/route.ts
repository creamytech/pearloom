// ──────────────────────────────────────────────────────────────
// /api/registry-items
//
// Native registry items — items the couple lists on Pearloom for
// guests to claim and pay for through Pearloom (vs registry_sources
// which are external links to Zola/Amazon).
//
//   GET    /api/registry-items?siteId=...   — list (public, used by
//                                              site renderer)
//   POST   /api/registry-items              — create  (couple, auth)
//   PATCH  /api/registry-items              — update  (couple, auth)
//   DELETE /api/registry-items?id=...       — delete  (couple, auth)
//
// GET is intentionally public so unauthenticated guests browsing
// the wedding site can see the items. Sensitive fields (like
// claimed_by_email) are NOT returned to public callers.
// ──────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface ItemRow {
  id: string;
  site_id: string | null;
  user_id: string | null;
  source_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  item_url: string | null;
  category: string | null;
  priority: 'need' | 'want' | 'dream' | null;
  quantity: number | null;
  quantity_claimed: number | null;
  purchased: boolean | null;
  claimed_by_name: string | null;
  payment_status: string | null;
  sort_order: number | null;
  notes: string | null;
}

function publicView(row: ItemRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    itemUrl: row.item_url,
    category: row.category,
    priority: row.priority || 'want',
    quantity: row.quantity ?? 1,
    quantityClaimed: row.quantity_claimed ?? 0,
    purchased: row.purchased || false,
    sortOrder: row.sort_order ?? 0,
  };
}

function ownerView(row: ItemRow) {
  return {
    ...publicView(row),
    claimedByName: row.claimed_by_name,
    paymentStatus: row.payment_status,
    notes: row.notes,
  };
}

// ── GET: list items for a site ────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ items: [] });

    const { data, error } = await supabase
      .from('registry_items')
      .select('*')
      .eq('site_id', siteId)
      .is('source_id', null) // native items only
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('[api/registry-items] GET error:', error.message);
      return NextResponse.json({ items: [] });
    }

    // If the caller is the owner, return owner-view; else public-view.
    const session = await getServerSession(authOptions);
    const ownerEmail = session?.user?.email;
    let isOwner = false;
    if (ownerEmail) {
      const { data: site } = await supabase
        .from('sites')
        .select('user_id, creator_email')
        .eq('id', siteId)
        .maybeSingle();
      if (site && (site.creator_email === ownerEmail)) isOwner = true;
    }

    const items = (data as ItemRow[] | null ?? []).map((row) =>
      isOwner ? ownerView(row) : publicView(row),
    );
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[api/registry-items] GET unhandled:', err);
    return NextResponse.json({ items: [] });
  }
}

// ── POST: create a native item ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      siteId, name, description, price, imageUrl, itemUrl,
      category, priority, quantity, sortOrder, notes,
    } = body || {};

    if (!siteId || !name) {
      return NextResponse.json({ error: 'siteId and name are required' }, { status: 400 });
    }
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'price must be a positive number (USD)' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

    const { data, error } = await supabase
      .from('registry_items')
      .insert({
        site_id: siteId,
        user_id: session.user.email,
        source_id: null,
        name,
        description: description || null,
        price,
        image_url: imageUrl || null,
        item_url: itemUrl || null,
        category: category || null,
        priority: priority && ['need', 'want', 'dream'].includes(priority) ? priority : 'want',
        quantity: quantity && Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
        quantity_claimed: 0,
        purchased: false,
        sort_order: typeof sortOrder === 'number' ? sortOrder : 0,
        notes: notes || null,
        payment_status: 'unpaid',
      })
      .select()
      .single();

    if (error) {
      console.error('[api/registry-items] POST insert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: ownerView(data as ItemRow) }, { status: 201 });
  } catch (err) {
    console.error('[api/registry-items] POST unhandled:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── PATCH: update an item ─────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof rest.name === 'string') updates.name = rest.name;
    if (rest.description !== undefined) updates.description = rest.description || null;
    if (typeof rest.price === 'number' && rest.price > 0) updates.price = rest.price;
    if (rest.imageUrl !== undefined) updates.image_url = rest.imageUrl || null;
    if (rest.itemUrl !== undefined) updates.item_url = rest.itemUrl || null;
    if (rest.category !== undefined) updates.category = rest.category || null;
    if (rest.priority && ['need', 'want', 'dream'].includes(rest.priority)) updates.priority = rest.priority;
    if (Number.isInteger(rest.quantity) && rest.quantity > 0) updates.quantity = rest.quantity;
    if (typeof rest.sortOrder === 'number') updates.sort_order = rest.sortOrder;
    if (rest.notes !== undefined) updates.notes = rest.notes || null;

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

    // Ownership check — couple can only update items belonging to a site they own.
    const { data: existing } = await supabase
      .from('registry_items')
      .select('user_id, site_id')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.user_id && existing.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('registry_items').update(updates).eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/registry-items] PATCH unhandled:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

    const { data: existing } = await supabase
      .from('registry_items')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();
    if (existing?.user_id && existing.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('registry_items').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/registry-items] DELETE unhandled:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
