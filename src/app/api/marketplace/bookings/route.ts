// ─────────────────────────────────────────────────────────────
// Pearloom / api/marketplace/bookings/route.ts
//
// GET  ?siteId=... — owner: list bookings for a site
// POST { siteId, vendorId, totalCents?, depositCents?, notes? }
//       owner: create an inquiry
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import {
  createVendorBooking,
  getVendor,
  listVendorBookings,
} from '@/lib/event-os/db';

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

async function assertOwner(siteId: string, email: string): Promise<boolean> {
  const { data: site } = await sb()
    .from('sites')
    .select('site_config')
    .eq('id', siteId)
    .maybeSingle();
  const ownerEmail = (site?.site_config as Record<string, unknown> | null)?.creator_email;
  return ownerEmail === email;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  }
  if (!(await assertOwner(siteId, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const bookings = await listVendorBookings(siteId, 50);
    // Hydrate vendor snapshot for display
    const vendorIds = Array.from(new Set(bookings.map((b) => b.vendor_id).filter(Boolean)));
    const { data: vendors } = vendorIds.length
      ? await sb().from('vendors').select('id, name, category, city, slug').in('id', vendorIds)
      : { data: [] };
    const byId: Record<string, { name: string; category: string; city: string | null; slug: string }> = {};
    for (const v of (vendors ?? []) as Array<{ id: string; name: string; category: string; city: string | null; slug: string }>) {
      byId[v.id] = { name: v.name, category: v.category, city: v.city, slug: v.slug };
    }
    const hydrated = bookings.map((b) => ({ ...b, vendor: byId[b.vendor_id] ?? null }));
    return NextResponse.json({ bookings: hydrated });
  } catch (err) {
    return NextResponse.json(
      { error: 'List failed', detail: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: {
    siteId?: string;
    eventId?: string | null;
    vendorId?: string;
    totalCents?: number | null;
    depositCents?: number | null;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { siteId, vendorId, totalCents, depositCents, notes, eventId } = body;
  if (!siteId || !vendorId) {
    return NextResponse.json({ error: 'siteId and vendorId required' }, { status: 400 });
  }
  if (!(await assertOwner(siteId, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const vendor = await getVendor(vendorId);
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  try {
    const booking = await createVendorBooking({
      site_id: siteId,
      event_id: eventId ?? null,
      vendor_id: vendorId,
      owner_email: session.user.email,
      total_cents: totalCents ?? null,
      deposit_cents: depositCents ?? null,
      notes: notes ?? null,
    });
    return NextResponse.json({ booking });
  } catch (err) {
    return NextResponse.json(
      { error: 'Create failed', detail: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
