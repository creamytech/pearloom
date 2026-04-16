// ─────────────────────────────────────────────────────────────
// Pearloom / api/toasts/moderate/route.ts
//
// POST { toastId, status, isHighlight? }
//   status ∈ 'approved' | 'rejected' | 'pending'
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { toastId?: string; status?: string; isHighlight?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { toastId, status, isHighlight } = body;
  if (!toastId || !status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'toastId and valid status required' }, { status: 400 });
  }

  const client = sb();

  // Look up the toast and verify site ownership
  const { data: toast } = await client
    .from('voice_toasts')
    .select('id, site_id')
    .eq('id', toastId)
    .maybeSingle();
  if (!toast) return NextResponse.json({ error: 'Toast not found' }, { status: 404 });

  const { data: site } = await client
    .from('sites')
    .select('site_config')
    .eq('id', toast.site_id)
    .maybeSingle();
  const ownerEmail = (site?.site_config as Record<string, unknown> | null)?.creator_email;
  if (ownerEmail !== session.user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const patch: Record<string, unknown> = { moderation_status: status };
  if (typeof isHighlight === 'boolean') patch.is_highlight = isHighlight;

  const { error } = await client.from('voice_toasts').update(patch).eq('id', toastId);
  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
