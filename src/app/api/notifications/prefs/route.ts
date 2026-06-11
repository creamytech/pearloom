// ─────────────────────────────────────────────────────────────
// Pearloom / api/notifications/prefs
//
// GET  — the signed-in host's notification preferences (defaults
//        layered under any stored deviations) + the category
//        catalog so the settings UI never hardcodes labels.
// POST — { category, emailMode?, pushEnabled? } upserts one row.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import {
  getNotificationPrefs,
  isNotificationCategory,
  NOTIFICATION_CATEGORIES,
} from '@/lib/notifications/prefs';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) {
    return NextResponse.json({ categories: NOTIFICATION_CATEGORIES, prefs: null });
  }
  const prefs = await getNotificationPrefs(sb, session.user.email);
  return NextResponse.json({ categories: NOTIFICATION_CATEGORIES, prefs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as {
    category?: string;
    emailMode?: string;
    pushEnabled?: boolean;
  };
  if (!body.category || !isNotificationCategory(body.category)) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });

  const update: Record<string, unknown> = {
    user_email: session.user.email.toLowerCase(),
    category: body.category,
    updated_at: new Date().toISOString(),
  };
  if (body.emailMode !== undefined) {
    if (!['instant', 'digest', 'off'].includes(body.emailMode)) {
      return NextResponse.json({ error: 'Bad emailMode' }, { status: 400 });
    }
    update.email_mode = body.emailMode;
  }
  if (body.pushEnabled !== undefined) {
    update.push_enabled = Boolean(body.pushEnabled);
  }

  // Upsert needs the full row when it's the first deviation —
  // read current resolved prefs so the untouched channel keeps
  // its effective value instead of resetting to the column default.
  const current = (await getNotificationPrefs(sb, session.user.email))[body.category];
  if (update.email_mode === undefined) update.email_mode = current.emailMode;
  if (update.push_enabled === undefined) update.push_enabled = current.pushEnabled;

  const { error } = await sb
    .from('user_notification_prefs')
    .upsert(update, { onConflict: 'user_email,category' });
  if (error) {
    console.error('[notifications/prefs] upsert failed:', error);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
