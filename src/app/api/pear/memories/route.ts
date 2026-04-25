// ─────────────────────────────────────────────────────────────
// Pearloom / api/pear/memories/route.ts
//
// GET    /api/pear/memories?siteId=&limit=        → list active
// POST   /api/pear/memories                        → add a note
// DELETE /api/pear/memories?id=                    → archive (soft-del)
//
// Persistent context for Pear AI calls. Other AI routes read recent
// memories and weave them into prompts so the assistant references
// the host's actual decisions across sessions.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ memories: [] });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '40'), 1), 200);

  let query = sb
    .from('pear_memories')
    .select('*')
    .eq('user_email', session.user.email)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (siteId) query = query.or(`site_id.eq.${siteId},site_id.is.null`);

  const { data, error } = await query;
  if (error) {
    console.warn('[pear/memories GET]', error.message);
    return NextResponse.json({ memories: [] });
  }
  return NextResponse.json({ memories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ip = getClientIp(req);
  const rl = checkRateLimit(`pear-memory:${session.user.email}:${ip}`, {
    max: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many memories — slow down.' }, { status: 429 });
  }

  let body: { siteId?: string; content?: string; source?: string; tags?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const content = (body.content ?? '').trim();
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });
  if (content.length > 2000) {
    return NextResponse.json({ error: 'memory too long (max 2000 chars)' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });

  const allowedSources = new Set(['voice', 'manual', 'edit', 'ai']);
  const source = allowedSources.has(body.source ?? '') ? body.source : 'manual';

  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const { data, error } = await sb
    .from('pear_memories')
    .insert({
      user_email: session.user.email,
      site_id: body.siteId ?? null,
      content,
      source,
      tags,
    })
    .select()
    .single();

  if (error) {
    console.warn('[pear/memories POST]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ memory: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: true });

  const { error } = await sb
    .from('pear_memories')
    .update({ archived: true })
    .eq('id', id)
    .eq('user_email', session.user.email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
