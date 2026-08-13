// ─────────────────────────────────────────────────────────────
// Pearloom / api/vendors/book/route.ts
//
// The Vendor Book — the host's PRIVATE vendor roster (who's hired,
// what they cost, deposit/balance due dates, arrival times). The
// private counterpart to the public directory at /api/vendors/
// directory; a Book row can link the directory vendor it was booked
// from via directoryVendorId.
//
//   GET    /api/vendors/book?siteId=...        — list (owner only)
//   POST   /api/vendors/book                   — create (owner only)
//   PATCH  /api/vendors/book                   — update (owner only)
//   DELETE /api/vendors/book?siteId=...&id=... — delete (owner only)
//   POST   /api/vendors/book/packet            — mint a call-sheet
//          token (sibling route; shares ./gate)
//
// Ownership = site_config.creator_email, case-insensitive (the
// /api/toasts pattern; the gate lives in ./gate.ts). All money
// fields are host-entered cents — this is a ledger, never a
// payment surface.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { gate, UUID_RX } from './gate';

export const dynamic = 'force-dynamic';

const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['considering', 'booked', 'paid'] as const;
type VendorStatus = (typeof STATUSES)[number];
// Cents ceiling — $10M is comfortably above any real event vendor.
const MAX_CENTS = 1_000_000_000;
const MAX_VENDORS_PER_SITE = 120;

interface VendorRow {
  id: string;
  site_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  cost_cents: number | null;
  deposit_cents: number | null;
  deposit_due: string | null;
  balance_due: string | null;
  deposit_paid: boolean;
  balance_paid: boolean;
  status: VendorStatus;
  arrival_time: string | null;
  notes: string | null;
  directory_vendor_id: string | null;
  /** Call-sheet token (nullable until the host mints one via
   *  ./packet). Column lands with 20260703_vendor_packets.sql. */
  packet_token?: string | null;
  created_at: string;
}

// ── Field sanitizers ──────────────────────────────────────────

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}
function cents(v: unknown): number | null {
  // Explicit empties stay null — Number(null) is 0, which would
  // turn "not entered" into a recorded $0.
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_CENTS, Math.round(n));
}
function dateOnly(v: unknown): string | null {
  return typeof v === 'string' && DATE_RX.test(v) ? v : null;
}

/** Builds the column patch from a request body. When `partial` is
 *  false (POST) every column gets a value; when true (PATCH) only
 *  the keys present on the body are included. */
function columnsFrom(body: Record<string, unknown>, partial: boolean): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  const has = (k: string) => !partial || body[k] !== undefined;

  if (has('name')) cols.name = str(body.name, 120);
  if (has('category')) cols.category = str(body.category, 60);
  if (has('contactName')) cols.contact_name = str(body.contactName, 120);
  if (has('email')) cols.email = str(body.email, 200);
  if (has('phone')) cols.phone = str(body.phone, 40);
  if (has('website')) cols.website = str(body.website, 400);
  if (has('costCents')) cols.cost_cents = cents(body.costCents);
  if (has('depositCents')) cols.deposit_cents = cents(body.depositCents);
  if (has('depositDue')) cols.deposit_due = dateOnly(body.depositDue);
  if (has('balanceDue')) cols.balance_due = dateOnly(body.balanceDue);
  if (has('depositPaid')) cols.deposit_paid = body.depositPaid === true;
  if (has('balancePaid')) cols.balance_paid = body.balancePaid === true;
  if (has('arrivalTime')) cols.arrival_time = str(body.arrivalTime, 80);
  if (has('notes')) cols.notes = str(body.notes, 2000);
  if (has('status')) {
    cols.status = STATUSES.includes(body.status as VendorStatus)
      ? body.status
      : 'considering';
  }
  if (has('directoryVendorId')) {
    cols.directory_vendor_id =
      typeof body.directoryVendorId === 'string' && UUID_RX.test(body.directoryVendorId)
        ? body.directoryVendorId
        : null;
  }
  return cols;
}

function view(row: VendorRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    costCents: row.cost_cents,
    depositCents: row.deposit_cents,
    depositDue: row.deposit_due,
    balanceDue: row.balance_due,
    depositPaid: row.deposit_paid,
    balancePaid: row.balance_paid,
    status: row.status,
    arrivalTime: row.arrival_time,
    notes: row.notes,
    directoryVendorId: row.directory_vendor_id,
    packetToken: row.packet_token ?? null,
    createdAt: row.created_at,
  };
}

// ── GET: list the book ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const g = await gate(req.nextUrl.searchParams.get('siteId'), false);
  if (!g.ok) return g.res;

  const { data, error } = await g.supabase
    .from('site_vendors')
    .select('*')
    .eq('site_id', g.siteId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[vendors/book] GET list failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load the book.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, vendors: ((data ?? []) as VendorRow[]).map(view) });
}

// ── POST: add a vendor ────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const g = await gate(typeof body.siteId === 'string' ? body.siteId : null, true);
  if (!g.ok) return g.res;

  const cols = columnsFrom(body, false);
  if (!cols.name || !cols.category) {
    return NextResponse.json({ ok: false, error: 'name and category are required' }, { status: 400 });
  }

  // Soft cap so one site can't grow the book without bound.
  const { count } = await g.supabase
    .from('site_vendors')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', g.siteId);
  if ((count ?? 0) >= MAX_VENDORS_PER_SITE) {
    return NextResponse.json({ ok: false, error: 'The book is full (120 vendors).' }, { status: 400 });
  }

  const { data, error } = await g.supabase
    .from('site_vendors')
    .insert({ site_id: g.siteId, ...cols })
    .select()
    .single();

  if (error) {
    console.error('[vendors/book] POST insert failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not add the vendor.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, vendor: view(data as VendorRow) }, { status: 201 });
}

// ── PATCH: update a vendor ────────────────────────────────────

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const g = await gate(typeof body.siteId === 'string' ? body.siteId : null, true);
  if (!g.ok) return g.res;

  const cols = columnsFrom(body, true);
  // PATCH may not blank the two required columns.
  if ('name' in cols && !cols.name) delete cols.name;
  if ('category' in cols && !cols.category) delete cols.category;
  if (Object.keys(cols).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
  }

  // site_id filter scopes the write to the gated site — a vendor id
  // from someone else's book can never match.
  const { data, error } = await g.supabase
    .from('site_vendors')
    .update(cols)
    .eq('id', id)
    .eq('site_id', g.siteId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[vendors/book] PATCH update failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not save the vendor.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Vendor not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, vendor: view(data as VendorRow) });
}

// ── DELETE: remove a vendor ───────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RX.test(id)) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const g = await gate(req.nextUrl.searchParams.get('siteId'), true);
  if (!g.ok) return g.res;

  const { error } = await g.supabase
    .from('site_vendors')
    .delete()
    .eq('id', id)
    .eq('site_id', g.siteId);

  if (error) {
    console.error('[vendors/book] DELETE failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not remove the vendor.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
