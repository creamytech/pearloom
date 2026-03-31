// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/time-capsule/route.ts
// Love Letter Time Capsule CRUD API
//
// POST /api/time-capsule             — create a capsule
// GET  /api/time-capsule?siteId=...  — list capsules for site (sealed, no letter text)
// GET  /api/time-capsule?token=...   — open a capsule (only if unlock date has passed)
// DELETE /api/time-capsule?id=...    — delete a capsule (auth required)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// ── In-memory fallback for demo (when Supabase table doesn't exist) ──────────

interface CapsuleRecord {
  id: string;
  site_id: string;
  from_name: string;
  to_name: string;
  letter_text: string;
  unlock_date: string;
  unlock_years: number;
  token: string;
  delivered: boolean;
  created_at: string;
}

const inMemoryStore = new Map<string, CapsuleRecord>();

function generateId(): string {
  return crypto.randomUUID();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ── Supabase client ───────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function mapRow(row: CapsuleRecord | Record<string, unknown>) {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    siteId: r.site_id as string,
    fromName: r.from_name as string,
    toName: r.to_name as string,
    unlockDate: r.unlock_date as string,
    unlockYears: r.unlock_years as number,
    delivered: r.delivered as boolean,
    sealed: new Date(r.unlock_date as string) > new Date(),
    createdAt: r.created_at as string,
  };
}

// ── POST — create a time capsule ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit: 5 capsules per IP per hour
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(`time-capsule:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait before creating another capsule.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { siteId, fromName, toName, letter, unlockDate, unlockYears } = body;

    if (!siteId || !fromName || !toName || !letter || !unlockDate || !unlockYears) {
      return NextResponse.json(
        { error: 'siteId, fromName, toName, letter, unlockDate, and unlockYears are required' },
        { status: 400 }
      );
    }

    if (![1, 5, 10].includes(Number(unlockYears))) {
      return NextResponse.json(
        { error: 'unlockYears must be 1, 5, or 10' },
        { status: 400 }
      );
    }

    const token = generateToken();

    const supabase = getSupabase();
    if (!supabase) {
      // In-memory fallback
      const id = generateId();
      const record: CapsuleRecord = {
        id,
        site_id: siteId,
        from_name: fromName,
        to_name: toName,
        letter_text: letter,
        unlock_date: unlockDate,
        unlock_years: Number(unlockYears),
        token,
        delivered: false,
        created_at: new Date().toISOString(),
      };
      inMemoryStore.set(id, record);
      inMemoryStore.set(`token:${token}`, record);
      return NextResponse.json({ id, token, unlockDate }, { status: 201 });
    }

    const { data, error } = await supabase
      .from('time_capsules')
      .insert({
        site_id: siteId,
        from_name: fromName,
        to_name: toName,
        letter_text: letter,
        unlock_date: unlockDate,
        unlock_years: Number(unlockYears),
        token,
        delivered: false,
      })
      .select('id, token, unlock_date')
      .single();

    if (error) {
      // Table may not exist — fall back to in-memory
      console.warn('[api/time-capsule] DB error (table may not exist):', error.message);
      const id = generateId();
      const record: CapsuleRecord = {
        id,
        site_id: siteId,
        from_name: fromName,
        to_name: toName,
        letter_text: letter,
        unlock_date: unlockDate,
        unlock_years: Number(unlockYears),
        token,
        delivered: false,
        created_at: new Date().toISOString(),
      };
      inMemoryStore.set(id, record);
      inMemoryStore.set(`token:${token}`, record);
      return NextResponse.json({ id, token, unlockDate }, { status: 201 });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json(
      { id: row.id, token: row.token, unlockDate: row.unlock_date },
      { status: 201 }
    );
  } catch (err) {
    console.error('[api/time-capsule] POST error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// ── GET — list by siteId OR open by token ─────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get('siteId');
    const token = request.nextUrl.searchParams.get('token');

    if (!siteId && !token) {
      return NextResponse.json(
        { error: 'siteId or token is required' },
        { status: 400 }
      );
    }

    // ── Open by token ──────────────────────────────────────────
    if (token) {
      const supabase = getSupabase();

      if (!supabase) {
        const record = inMemoryStore.get(`token:${token}`);
        if (!record) {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        const days = daysUntil(record.unlock_date);
        if (days > 0) {
          return NextResponse.json({ error: 'sealed', daysRemaining: days }, { status: 403 });
        }
        return NextResponse.json({
          letter: record.letter_text,
          fromName: record.from_name,
          toName: record.to_name,
          unlockDate: record.unlock_date,
          createdAt: record.created_at,
        });
      }

      const { data, error } = await supabase
        .from('time_capsules')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) {
        // Try in-memory fallback
        const record = inMemoryStore.get(`token:${token}`);
        if (!record) {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        const days = daysUntil(record.unlock_date);
        if (days > 0) {
          return NextResponse.json({ error: 'sealed', daysRemaining: days }, { status: 403 });
        }
        return NextResponse.json({
          letter: record.letter_text,
          fromName: record.from_name,
          toName: record.to_name,
          unlockDate: record.unlock_date,
          createdAt: record.created_at,
        });
      }

      const row = data as Record<string, unknown>;
      const days = daysUntil(row.unlock_date as string);
      if (days > 0) {
        return NextResponse.json({ error: 'sealed', daysRemaining: days }, { status: 403 });
      }

      return NextResponse.json({
        letter: row.letter_text,
        fromName: row.from_name,
        toName: row.to_name,
        unlockDate: row.unlock_date,
        createdAt: row.created_at,
      });
    }

    // ── List by siteId (no letter text) ───────────────────────
    const supabase = getSupabase();
    if (!supabase) {
      const capsules = Array.from(inMemoryStore.values())
        .filter((r) => r.site_id === siteId && !r.id.startsWith('token:'))
        .map(mapRow);
      return NextResponse.json({ capsules });
    }

    const { data, error } = await supabase
      .from('time_capsules')
      .select(
        'id, site_id, from_name, to_name, unlock_date, unlock_years, delivered, created_at'
      )
      .eq('site_id', siteId)
      .order('unlock_date', { ascending: true });

    if (error) {
      console.warn('[api/time-capsule] GET list error (table may not exist):', error.message);
      // Fall back to in-memory
      const capsules = Array.from(inMemoryStore.values())
        .filter((r) => r.site_id === siteId)
        .map(mapRow);
      return NextResponse.json({ capsules, _demo: true });
    }

    const capsules = (data || []).map((row: Record<string, unknown>) => mapRow(row));
    return NextResponse.json({ capsules });
  } catch (err) {
    console.error('[api/time-capsule] GET error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// ── DELETE — delete a capsule ─────────────────────────────────────────────────

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
      inMemoryStore.delete(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase.from('time_capsules').delete().eq('id', id);

    if (error) {
      // Try in-memory fallback
      inMemoryStore.delete(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/time-capsule] DELETE error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
