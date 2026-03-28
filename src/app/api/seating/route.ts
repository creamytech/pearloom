// ─────────────────────────────────────────────────────────────
// Pearloom / api/seating/route.ts
// Seating chart API — tables, seats, guest assignment
// All CRUD operations in one route file with action-based dispatch
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SeatingTable, Seat, Guest } from '@/types';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ─── Demo data fallback ───────────────────────────────────────

function makeDemoTables(siteId: string): SeatingTable[] {
  const tables: SeatingTable[] = [
    {
      id: 'demo-t1',
      spaceId: 'demo-space',
      userId: 'demo',
      label: 'Table 1',
      shape: 'round',
      capacity: 8,
      x: 150,
      y: 150,
      rotation: 0,
      isReserved: false,
      seats: [
        { id: 'demo-t1-s1', tableId: 'demo-t1', seatNumber: 1 },
        { id: 'demo-t1-s2', tableId: 'demo-t1', seatNumber: 2 },
        { id: 'demo-t1-s3', tableId: 'demo-t1', seatNumber: 3 },
        { id: 'demo-t1-s4', tableId: 'demo-t1', seatNumber: 4 },
        { id: 'demo-t1-s5', tableId: 'demo-t1', seatNumber: 5 },
        { id: 'demo-t1-s6', tableId: 'demo-t1', seatNumber: 6 },
        { id: 'demo-t1-s7', tableId: 'demo-t1', seatNumber: 7 },
        { id: 'demo-t1-s8', tableId: 'demo-t1', seatNumber: 8 },
      ],
    },
    {
      id: 'demo-t2',
      spaceId: 'demo-space',
      userId: 'demo',
      label: 'Table 2',
      shape: 'round',
      capacity: 6,
      x: 400,
      y: 150,
      rotation: 0,
      isReserved: false,
      seats: [
        { id: 'demo-t2-s1', tableId: 'demo-t2', seatNumber: 1 },
        { id: 'demo-t2-s2', tableId: 'demo-t2', seatNumber: 2 },
        { id: 'demo-t2-s3', tableId: 'demo-t2', seatNumber: 3 },
        { id: 'demo-t2-s4', tableId: 'demo-t2', seatNumber: 4 },
        { id: 'demo-t2-s5', tableId: 'demo-t2', seatNumber: 5 },
        { id: 'demo-t2-s6', tableId: 'demo-t2', seatNumber: 6 },
      ],
    },
    {
      id: 'demo-t3',
      spaceId: 'demo-space',
      userId: 'demo',
      label: 'Sweetheart',
      shape: 'rectangular',
      capacity: 2,
      x: 275,
      y: 350,
      rotation: 0,
      isReserved: true,
      seats: [
        { id: 'demo-t3-s1', tableId: 'demo-t3', seatNumber: 1 },
        { id: 'demo-t3-s2', tableId: 'demo-t3', seatNumber: 2 },
      ],
    },
  ];
  void siteId;
  return tables;
}

function makeDemoGuests(): Guest[] {
  return [
    { id: 'demo-g1', name: 'Alice Johnson', email: 'alice@example.com', status: 'attending', plusOne: true, plusOneName: 'Bob Johnson', mealPreference: 'chicken' },
    { id: 'demo-g2', name: 'Carol Smith', email: 'carol@example.com', status: 'attending', plusOne: false, mealPreference: 'fish' },
    { id: 'demo-g3', name: 'David Lee', email: 'david@example.com', status: 'attending', plusOne: false, mealPreference: 'vegan' },
    { id: 'demo-g4', name: 'Emma Wilson', email: 'emma@example.com', status: 'attending', plusOne: true, plusOneName: 'Frank Wilson', mealPreference: 'chicken' },
    { id: 'demo-g5', name: 'Grace Kim', email: 'grace@example.com', status: 'pending', plusOne: false },
    { id: 'demo-g6', name: 'Henry Brown', email: 'henry@example.com', status: 'attending', plusOne: false, mealPreference: 'fish' },
  ];
}

// ─── GET /api/seating?siteId=xxx ─────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ tables: makeDemoTables(siteId), guests: makeDemoGuests() });
    }

    // Fetch tables with seats joined
    const { data: tablesData, error: tablesError } = await supabase
      .from('seating_tables')
      .select('*, seats(*)')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true });

    if (tablesError) {
      console.warn('[api/seating] tables table not found, using demo data:', tablesError.message);
      return NextResponse.json({ tables: makeDemoTables(siteId), guests: makeDemoGuests() });
    }

    // Fetch guests for seat assignment joins
    const { data: guestsData } = await supabase
      .from('guests')
      .select('*')
      .eq('site_id', siteId);

    const guestMap = new Map<string, Guest>();
    for (const g of guestsData ?? []) {
      guestMap.set(g.id, {
        id: g.id,
        name: g.name,
        email: g.email,
        status: g.status || 'pending',
        plusOne: g.plus_one || false,
        plusOneName: g.plus_one_name,
        mealPreference: g.meal_preference,
        dietaryRestrictions: g.dietary_restrictions,
        message: g.message,
        respondedAt: g.responded_at,
      });
    }

    const tables: SeatingTable[] = (tablesData || []).map(row => ({
      id: row.id,
      spaceId: row.space_id || '',
      userId: row.user_id || '',
      label: row.label,
      shape: row.shape,
      capacity: row.capacity,
      x: row.x,
      y: row.y,
      rotation: row.rotation || 0,
      isReserved: row.is_reserved || false,
      notes: row.notes,
      seats: (row.seats || []).map((s: Record<string, unknown>) => ({
        id: s.id,
        tableId: s.table_id,
        seatNumber: s.seat_number,
        guestId: s.guest_id || undefined,
        mealPreference: s.meal_preference || undefined,
        guest: s.guest_id ? guestMap.get(s.guest_id as string) : undefined,
      })),
    }));

    const guests = Array.from(guestMap.values());

    return NextResponse.json({ tables, guests });
  } catch (err) {
    console.error('[api/seating] GET error:', err);
    return NextResponse.json({ tables: makeDemoTables(''), guests: makeDemoGuests() });
  }
}

// ─── POST /api/seating — action-based dispatch ────────────────
// Body: { action: 'create-table' | 'assign' | ... , ...payload }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { action } = body;

    const supabase = getSupabase();
    if (!supabase) {
      // Return optimistic fake data
      if (action === 'create-table') {
        const t = body as { siteId?: string; label?: string; shape?: string; capacity?: number; x?: number; y?: number };
        return NextResponse.json({
          table: {
            id: `local-${Date.now()}`,
            spaceId: '',
            userId: '',
            label: t.label ?? 'New Table',
            shape: t.shape ?? 'round',
            capacity: t.capacity ?? 8,
            x: t.x ?? 100,
            y: t.y ?? 100,
            rotation: 0,
            isReserved: false,
            seats: [],
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'create-table') {
      const { siteId, label, shape, capacity, x, y } = body as {
        siteId: string; label: string; shape: string; capacity: number; x: number; y: number;
      };

      const { data: tableRow, error: tableErr } = await supabase
        .from('seating_tables')
        .insert({ site_id: siteId, label, shape, capacity, x, y, rotation: 0, is_reserved: false })
        .select()
        .single();

      if (tableErr) {
        console.error('[api/seating] create-table error:', tableErr);
        return NextResponse.json({
          table: {
            id: `local-${Date.now()}`, spaceId: '', userId: '',
            label, shape, capacity, x, y, rotation: 0, isReserved: false, seats: [],
          },
        });
      }

      // Create seats for the table
      const seatInserts = Array.from({ length: capacity }, (_, i) => ({
        table_id: tableRow.id,
        seat_number: i + 1,
      }));
      const { data: seatsData } = await supabase.from('seats').insert(seatInserts).select();

      const seats: Seat[] = (seatsData || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        tableId: s.table_id as string,
        seatNumber: s.seat_number as number,
      }));

      const table: SeatingTable = {
        id: tableRow.id,
        spaceId: tableRow.space_id || '',
        userId: tableRow.user_id || '',
        label: tableRow.label,
        shape: tableRow.shape,
        capacity: tableRow.capacity,
        x: tableRow.x,
        y: tableRow.y,
        rotation: tableRow.rotation || 0,
        isReserved: tableRow.is_reserved || false,
        notes: tableRow.notes,
        seats,
      };

      return NextResponse.json({ table });
    }

    if (action === 'assign') {
      const { seatId, guestId } = body as { seatId: string; guestId: string };
      const { error } = await supabase
        .from('seats')
        .update({ guest_id: guestId })
        .eq('id', seatId);

      if (error) {
        console.error('[api/seating] assign error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'unassign') {
      const { seatId } = body as { seatId: string };
      const { error } = await supabase
        .from('seats')
        .update({ guest_id: null })
        .eq('id', seatId);

      if (error) {
        console.error('[api/seating] unassign error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[api/seating] POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── PATCH /api/seating — update table position/props ─────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { id, ...updates } = body as { id: string; x?: number; y?: number; rotation?: number; label?: string; capacity?: number; shape?: string; notes?: string };

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ success: true });

    const dbUpdates: Record<string, unknown> = {};
    if (updates.x !== undefined) dbUpdates.x = updates.x;
    if (updates.y !== undefined) dbUpdates.y = updates.y;
    if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;
    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.shape !== undefined) dbUpdates.shape = updates.shape;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { error } = await supabase
      .from('seating_tables')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('[api/seating] PATCH error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/seating] PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ─── DELETE /api/seating?id=xxx — delete table ────────────────

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ success: true });

    // Seats cascade delete via DB constraint; if not, delete manually
    await supabase.from('seats').delete().eq('table_id', id);
    const { error } = await supabase.from('seating_tables').delete().eq('id', id);

    if (error) {
      console.error('[api/seating] DELETE error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/seating] DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
