// ─────────────────────────────────────────────────────────────
// Pearloom / api/sites/guestbook/route.ts
// Public guestbook messages for wedding sites
// ─────────────────────────────────────────────────────────────
//
// Supabase table schema:
// create table guestbook_messages (
//   id uuid default gen_random_uuid() primary key,
//   subdomain text not null,
//   name text not null,
//   message text not null,
//   emoji text default '💕',
//   created_at timestamptz default now()
// );
// create index on guestbook_messages (subdomain, created_at desc);

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Simple in-memory rate limiter: max 5 posts per IP per hour
const ipPostLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxPosts = 5;
  const times = (ipPostLog.get(ip) || []).filter(t => now - t < windowMs);
  if (times.length >= maxPosts) return true;
  times.push(now);
  ipPostLog.set(ip, times);

  // Cleanup: if map grows too large, remove entries with all stale timestamps
  if (ipPostLog.size > 5000) {
    for (const [key, timestamps] of ipPostLog.entries()) {
      if (timestamps.every(t => now - t >= windowMs)) {
        ipPostLog.delete(key);
      }
    }
  }

  return false;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// When Supabase isn't configured we return an empty list —
// never ship placeholder guestbook entries into a real site.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json({ error: 'Missing subdomain' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Supabase isn't configured — respond with an empty list so the
    // site renders its empty state instead of demo messages.
    return NextResponse.json({ messages: [] });
  }

  try {
    const { data, error } = await supabase
      .from('guestbook_messages')
      .select('id, name, message, emoji, created_at')
      .eq('subdomain', subdomain)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[guestbook GET] Supabase error:', error);
      return NextResponse.json({ messages: [], _error: error.message });
    }

    return NextResponse.json({ messages: data || [] });
  } catch (err) {
    console.error('[guestbook GET] Error:', err);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429 }
    );
  }

  let body: { subdomain?: string; name?: string; message?: string; emoji?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { subdomain, name, message, emoji } = body;

  if (!subdomain || !name?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate subdomain format
  if (!/^[a-z0-9-]{3,60}$/.test(subdomain)) {
    return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
  }

  if (name.trim().length > 100) {
    return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
  }

  if (message.trim().length > 200) {
    return NextResponse.json({ error: 'Message too long (max 200 characters)' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Return a mock success when Supabase isn't configured
    return NextResponse.json({
      success: true,
      message: {
        id: `mock-${Date.now()}`,
        subdomain,
        name: name.trim(),
        message: message.trim(),
        emoji: emoji || '💕',
        created_at: new Date().toISOString(),
      },
      mock: true,
    });
  }

  try {
    const { data, error } = await supabase
      .from('guestbook_messages')
      .insert([
        {
          subdomain,
          name: name.trim(),
          message: message.trim(),
          emoji: emoji || '💕',
        },
      ])
      .select('id, name, message, emoji, created_at')
      .single();

    if (error) {
      console.error('[guestbook POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: data });
  } catch (err) {
    console.error('[guestbook POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
