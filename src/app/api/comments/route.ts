// ─────────────────────────────────────────────────────────────
// Pearloom / api/comments/route.ts
//
// Section-anchored comment CRUD. Gated by co-host role:
//   - Owners, co-editors, guest-managers, viewers can all post
//     and read.
//   - Anyone non-participant is 403.
//
// GET    /api/comments?siteId=xxx&sectionId=yyy
// POST   { siteId, sectionId, body }
// PATCH  { id, body?, resolved? }
// DELETE { id }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

async function participates(
  supabase: ReturnType<typeof getSupabase>,
  siteId: string,
  email: string,
): Promise<boolean> {
  const { data: site } = await supabase
    .from('sites')
    .select('creator_email')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return false;
  if ((site.creator_email as string) === email) return true;
  const { data: ch } = await supabase
    .from('cohosts')
    .select('email')
    .eq('site_id', siteId)
    .eq('email', email)
    .maybeSingle();
  return !!ch;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const siteId = req.nextUrl.searchParams.get('siteId');
  const sectionId = req.nextUrl.searchParams.get('sectionId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const supabase = getSupabase();
  if (!(await participates(supabase, siteId, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let q = supabase
    .from('section_comments')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });
  if (sectionId) q = q.eq('section_id', sectionId);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateCheck = checkRateLimit(`comments:${session.user.email}`, {
    max: 60,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    siteId?: string;
    sectionId?: string;
    body?: string;
  };
  if (!body.siteId || !body.sectionId || !body.body?.trim()) {
    return NextResponse.json(
      { error: 'siteId, sectionId, and body required' },
      { status: 400 },
    );
  }
  const trimmed = body.body.trim();
  if (trimmed.length > 2000) {
    return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!(await participates(supabase, body.siteId, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data, error } = await supabase
    .from('section_comments')
    .insert({
      site_id: body.siteId,
      section_id: body.sectionId,
      author_email: session.user.email,
      author_name: session.user.name || session.user.email.split('@')[0],
      body: trimmed,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    body?: string;
    resolved?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from('section_comments')
    .select('site_id, author_email')
    .eq('id', body.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const isAuthor = (row.author_email as string) === session.user.email;
  // Anyone on the site can toggle resolved; only the author can edit body.
  if (body.body !== undefined && !isAuthor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!(await participates(supabase, row.site_id as string, session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.body !== undefined) patch.body = body.body.trim().slice(0, 2000);
  if (body.resolved !== undefined) patch.resolved = !!body.resolved;
  const { data, error } = await supabase
    .from('section_comments')
    .update(patch)
    .eq('id', body.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = getSupabase();
  const { data: row } = await supabase
    .from('section_comments')
    .select('site_id, author_email')
    .eq('id', body.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if ((row.author_email as string) !== session.user.email) {
    // Not the author — check if they're the site owner (owners can delete any).
    const { data: site } = await supabase
      .from('sites')
      .select('creator_email')
      .eq('id', row.site_id as string)
      .maybeSingle();
    if (!site || (site.creator_email as string) !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  await supabase.from('section_comments').delete().eq('id', body.id);
  return NextResponse.json({ ok: true });
}
