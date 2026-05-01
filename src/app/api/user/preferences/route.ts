// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/user/preferences/route.ts
// Per-user dashboard preferences: Pear voice, autonomy levels,
// quiet hours, profile extras (pronouns, timezone, display name).
//
// GET    returns the signed-in user's prefs (or defaults if no
//        row exists yet — row is created lazily on first PATCH).
// PATCH  upserts the prefs for the signed-in user.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type PearVoice = 'gentle' | 'candid' | 'witty' | 'minimal';
type Autonomy = Record<string, 1 | 2 | 3>;

interface PrefsRow {
  email: string;
  voice: PearVoice;
  quiet_hours: boolean;
  autonomy: Autonomy;
  display_name: string | null;
  pronouns: string | null;
  timezone: string | null;
}

const DEFAULTS: Omit<PrefsRow, 'email'> = {
  voice: 'gentle',
  quiet_hours: true,
  autonomy: {
    draft_emails: 2,
    call_vendors: 1,
    update_site: 3,
    respond_guest: 2,
    adjust_schedule: 1,
  },
  display_name: null,
  pronouns: null,
  timezone: null,
};

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  try {
    const { data, error } = await sb()
      .from('user_preferences')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json(DEFAULTS);
    return NextResponse.json(data);
  } catch (err) {
    // Supabase unreachable — return defaults so the UI still renders.
    console.error('[user/preferences GET]', err);
    return NextResponse.json(DEFAULTS);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: Partial<PrefsRow>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const allowedVoices: PearVoice[] = ['gentle', 'candid', 'witty', 'minimal'];
  const patch: Partial<PrefsRow> = {};
  if (body.voice && allowedVoices.includes(body.voice)) patch.voice = body.voice;
  if (typeof body.quiet_hours === 'boolean') patch.quiet_hours = body.quiet_hours;
  if (body.autonomy && typeof body.autonomy === 'object') patch.autonomy = body.autonomy;
  if (typeof body.display_name === 'string' || body.display_name === null) patch.display_name = body.display_name;
  if (typeof body.pronouns === 'string' || body.pronouns === null) patch.pronouns = body.pronouns;
  if (typeof body.timezone === 'string' || body.timezone === null) patch.timezone = body.timezone;

  try {
    const { data, error } = await sb()
      .from('user_preferences')
      .upsert({ email, ...DEFAULTS, ...patch }, { onConflict: 'email' })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[user/preferences PATCH]', err);
    return NextResponse.json({ error: 'could not save' }, { status: 500 });
  }
}
