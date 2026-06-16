// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pearloom / app/api/guestbook/route.ts
// Public guestbook â€” guests leave wishes on the wedding site.
// AI auto-highlights the most heartfelt message.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** guestbook.site_id stores the site UUID. Callers may pass the
 *  uuid (dashboard) or the subdomain (the published site only knows
 *  its slug) — resolve either to the canonical uuid so entries land
 *  on one key. */
async function resolveSiteUuid(
  supabase: ReturnType<typeof getSupabase>,
  idOrSlug: string,
): Promise<string | null> {
  if (UUID_RX.test(idOrSlug)) return idOrSlug;
  const { data } = await supabase.from('sites').select('id').eq('subdomain', idOrSlug).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ wishes: [] });

  const supabase = getSupabase();
  const siteUuid = await resolveSiteUuid(supabase, siteId);
  if (!siteUuid) return NextResponse.json({ wishes: [] });
  const { data } = await supabase
    .from('guestbook')
    .select('*')
    .eq('site_id', siteUuid)
    .order('created_at', { ascending: false })
    .limit(50);

  const wishes = (data || []).map(r => ({
    id: r.id,
    guestName: r.guest_name,
    message: r.message,
    createdAt: r.created_at,
    highlighted: r.highlighted || false,
  }));

  return NextResponse.json({ wishes });
}

export async function POST(req: NextRequest) {
  // Rate limit by IP — prevent guestbook spam
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(`guestbook:${ip}`, RATE_LIMITS.guestbook);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many messages. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  try {
    const { siteId, guestName, message, guestToken } = await req.json() as {
      siteId?: string;
      guestName?: string;
      message?: string;
      /** Optional pearloom_guests.guest_token (12-char). When the
       *  signer arrived via /g/[token] or ?g=<token>, the form
       *  passes the token through so the entry gets tagged with
       *  their pearloom_guests.id. Anonymous guestbook entries
       *  still allowed when omitted. */
      guestToken?: string;
    };
    if (!siteId || !guestName || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = getSupabase();
    const siteUuid = await resolveSiteUuid(supabase, siteId);
    if (!siteUuid) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Best-effort guest resolution. Bad/missing tokens fall through
    // silently — attribution is nice-to-have, not gating.
    let guestId: string | null = null;
    if (guestToken) {
      const { data: guestRow } = await supabase
        .from('pearloom_guests')
        .select('id')
        .eq('guest_token', guestToken)
        .maybeSingle();
      const id = (guestRow as { id?: string } | null)?.id;
      if (id) guestId = id;
    }

    // Count existing wishes â€” first wish becomes highlighted
    const { count } = await supabase
      .from('guestbook')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteUuid);

    const { data, error } = await supabase
      .from('guestbook')
      .insert({
        site_id: siteUuid,
        guest_name: guestName,
        message,
        guest_id: guestId,
        highlighted: !count || count === 0, // first wish is highlighted until AI picks a better one
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Guestbook] Insert error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // Async: re-evaluate highlighted wish via Gemini after every 5th submission
    if (count && count % 5 === 4) {
      void reHighlight(siteUuid);
    }

    // Tell the host someone signed the guestbook (category 'content').
    // Fire-and-forget; siteId is the site uuid.
    void (async () => {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data: site } = await sb
          .from('sites')
          .select('id, subdomain, creator_email, site_config')
          .eq('id', siteUuid)
          .maybeSingle();
        const cfg = (site as { site_config?: { creator_email?: string; names?: [string, string] } } | null)?.site_config;
        const ownerEmail = String((site as { creator_email?: string } | null)?.creator_email ?? cfg?.creator_email ?? '');
        if (!site || !ownerEmail) return;
        const names = (cfg?.names ?? []).filter(Boolean);
        const siteLabel = names.length >= 2 ? `${names[0]} & ${names[1]}` : ((site as { subdomain?: string }).subdomain ?? 'your site');
        const who = String(guestName ?? '').split(/\s+/)[0] || 'A guest';
        const { notifyHost } = await import('@/lib/notifications/notify');
        await notifyHost(sb, {
          siteId: siteUuid,
          siteLabel,
          ownerEmail,
          category: 'content',
          title: `${who} signed the guestbook`,
          body: String(message ?? '').slice(0, 200),
          href: '/dashboard',
          dedupeKey: `guestbook:${data.id}`,
        });
      } catch (e) { console.warn('[Guestbook] notifyHost failed (non-fatal):', e); }
    })();

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('[Guestbook] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Re-pick the most beautiful wish using Gemini
async function reHighlight(siteId: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return;

  const supabase = getSupabase();
  const { data } = await supabase
    .from('guestbook')
    .select('id, message')
    .eq('site_id', siteId)
    .limit(30);

  if (!data || data.length < 2) return;

  const prompt = `You are curating a wedding guestbook. Choose the single most heartfelt, beautiful, or moving message from the list below. Return ONLY the id of the best message, nothing else.

${data.map(r => `ID: ${r.id}\nMessage: ${r.message}`).join('\n\n')}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const json = await res.json();
    const chosenId = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (chosenId && data.find(r => r.id === chosenId)) {
      // Clear all highlights then set the chosen one
      await supabase.from('guestbook').update({ highlighted: false }).eq('site_id', siteId);
      await supabase.from('guestbook').update({ highlighted: true }).eq('id', chosenId);
    }
  } catch (e) {
    console.warn('[Guestbook] highlight re-eval failed:', e);
  }
}

