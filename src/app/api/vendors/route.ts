// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/vendors/route.ts
// CRUD for vendor management. Auth required for all operations.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET ?subdomain=... — fetch all vendors for this site
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subdomain = req.nextUrl.searchParams.get('subdomain');
    if (!subdomain) {
      return NextResponse.json({ vendors: [] });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('site_id', subdomain)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ vendors: data || [] });
  } catch (err) {
    console.error('[vendors GET]', err);
    return NextResponse.json({ vendors: [] });
  }
}

// POST — create a vendor
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subdomain, name, category, contactEmail, phone, status, amountCents, notes } = body;

    if (!subdomain || !name || !category || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        site_id: subdomain,
        name,
        category,
        contact_email: contactEmail ?? null,
        phone: phone ?? null,
        status,
        amount_cents: amountCents ?? null,
        notes: notes ?? null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ vendor: data });
  } catch (err) {
    console.error('[vendors POST]', err);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}

// PATCH — update a vendor
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Map camelCase → snake_case for DB columns
    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.category !== undefined) update.category = fields.category;
    if (fields.contactEmail !== undefined) update.contact_email = fields.contactEmail;
    if (fields.phone !== undefined) update.phone = fields.phone;
    if (fields.status !== undefined) update.status = fields.status;
    if (fields.amountCents !== undefined) update.amount_cents = fields.amountCents;
    if (fields.notes !== undefined) update.notes = fields.notes;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('vendors')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ vendor: data });
  } catch (err) {
    console.error('[vendors PATCH]', err);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

// DELETE ?id=... — delete a vendor
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[vendors DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
