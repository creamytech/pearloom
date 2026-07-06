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
import { recordProductEvent } from '@/lib/analytics/product-events';

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
  /** Orchard-mark avatar id (PL_AVATARS in components/pearloom/avatars.tsx). */
  avatar: string | null;
  /** Welcome-flow completion (set once via { onboarded: true }). */
  onboarded_at: string | null;
  /** Terms + Privacy agreement (set once via { terms_accepted: true }). */
  terms_accepted_at: string | null;
  /** What brought them to the loom — seeds wizard defaults. */
  intent: string | null;
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
  avatar: null,
  onboarded_at: null,
  terms_accepted_at: null,
  intent: null,
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
  if ((typeof body.avatar === 'string' && body.avatar.length <= 40) || body.avatar === null) {
    patch.avatar = body.avatar;
  }
  if ((typeof body.intent === 'string' && body.intent.length <= 40) || body.intent === null) {
    patch.intent = body.intent;
  }
  /* Onboarding milestones are stamped server-side and only move
     forward — clients send booleans, never timestamps. */
  const milestones = body as { onboarded?: unknown; terms_accepted?: unknown };
  if (milestones.terms_accepted === true) patch.terms_accepted_at = new Date().toISOString();
  if (milestones.onboarded === true) patch.onboarded_at = new Date().toISOString();

  try {
    /* Merge with the EXISTING row before upserting. The previous
       `{ email, ...DEFAULTS, ...patch }` silently reset every
       field the caller didn't send (saving a display name wiped
       the Pear voice back to 'gentle', picking an avatar would
       have cleared pronouns, etc.). Defaults only fill gaps for
       first-time rows now. */
    const { data: existing } = await sb()
      .from('user_preferences')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    const alreadyOnboarded = Boolean((existing as { onboarded_at?: string | null } | null)?.onboarded_at);
    const { data, error } = await sb()
      .from('user_preferences')
      .upsert({ ...DEFAULTS, ...(existing ?? {}), ...patch, email }, { onConflict: 'email' })
      .select('*')
      .single();
    if (error) throw error;

    // Activation instrumentation (Pillar 20): the welcome flow just
    // completed. Fire once — the alreadyOnboarded guard dedupes a
    // repeated { onboarded: true } PATCH. Fire-and-forget.
    if (milestones.onboarded === true && !alreadyOnboarded) {
      void recordProductEvent('welcome_completed', { email });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[user/preferences PATCH]', err);
    return NextResponse.json({ error: 'could not save' }, { status: 500 });
  }
}
