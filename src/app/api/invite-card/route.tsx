// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite-card/route.tsx
//
// The per-guest invitation card image (ATELIER-PLAN INV.3): the
// email's hero is the guest's OWN card — their name pressed onto
// the couple's actual theme. Email clients can't load Fraunces;
// this image carries the letterpress for them.
//
// GET ?site=<slug>&g=<passport-token>&type=std|invite|thanks
//
// Token-authed: the guest name resolves SERVER-SIDE from the
// passport token — no PII rides the URL. An invalid/missing token
// still renders the couple's card, just unaddressed. Themed via
// the same SuiteTheme contract as the site/OG/emails.
// ─────────────────────────────────────────────────────────────

import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSiteConfig } from '@/lib/db';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import { getEventType } from '@/lib/event-os/event-types';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

const W = 600;
const H = 840; // 5×7 portrait

async function loadFraunces(): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,600&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' } },
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match?.[1]) return null;
    const fontRes = await fetch(match[1]);
    return fontRes.ok ? fontRes.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(`invite-card:${getClientIp(req)}`, { max: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  }

  const slug = (req.nextUrl.searchParams.get('site') ?? '').trim().toLowerCase();
  const token = (req.nextUrl.searchParams.get('g') ?? '').trim();
  const typeRaw = req.nextUrl.searchParams.get('type');
  const cardType = typeRaw === 'std' || typeRaw === 'thanks' ? typeRaw : 'invite';
  if (!slug || !/^[a-z0-9-]{3,80}$/.test(slug)) {
    return NextResponse.json({ error: 'site required' }, { status: 400 });
  }

  const cfg = await getSiteConfig(slug).catch(() => null);
  if (!cfg?.manifest) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  const manifest = cfg.manifest as StoryManifest;
  const names = (cfg.names ?? ['', '']) as [string, string];

  /* Resolve the guest's first name from their passport token —
     server-side only, never from a name param. */
  let guestFirst: string | null = null;
  if (token && /^[\w-]{8,80}$/.test(token)) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { data } = await sb
          .from('guests')
          .select('name')
          .or(`passport_token.eq.${token},guest_token.eq.${token}`)
          .maybeSingle();
        const first = String(data?.name ?? '').trim().split(/\s+/)[0];
        if (first) guestFirst = first;
      }
    } catch { /* unaddressed card is fine */ }
  }

  const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const solemn = eventType?.voice === 'solemn';
  const solo = isSoloSubject(manifest);
  const displayNames = (solo ? [names[0]] : names).map((n) => String(n ?? '').trim()).filter(Boolean);
  const suite = suiteThemeFromManifest(manifest, names);
  const p = suite.emailPalette; // email-safe (dark packs flip to paper)

  const eyebrow =
    cardType === 'std' ? 'Save the date'
    : cardType === 'thanks' ? (solemn ? 'With gratitude' : 'Thank you')
    : solemn ? 'In loving memory' : 'You are invited';
  const dateRaw = manifest.logistics?.date;
  const parsed = dateRaw ? new Date(`${dateRaw}T00:00:00`) : null;
  const dateLine = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const venue = String(manifest.logistics?.venue ?? '').trim() || null;
  const initials = displayNames.map((n) => n.charAt(0).toUpperCase()).join(' & ') || 'P';

  const fraunces = await loadFraunces();
  const display = fraunces ? 'Fraunces' : 'Georgia';

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: p.paper, color: p.ink, padding: 48,
        }}
      >
        {/* hairline frame */}
        <div style={{ position: 'absolute', top: 24, left: 24, right: 24, bottom: 24, border: `1.5px solid ${p.accent}`, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 32, left: 32, right: 32, bottom: 32, border: `0.75px solid ${p.gold}`, opacity: 0.7, display: 'flex' }} />

        {/* monogram ring */}
        <div
          style={{
            width: 88, height: 88, borderRadius: 88, border: `1.5px solid ${p.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: display, fontStyle: 'italic', fontSize: 30, color: p.accent,
            marginBottom: 34,
          }}
        >
          {initials}
        </div>

        <div style={{ fontSize: 15, letterSpacing: 6, textTransform: 'uppercase', color: p.accent, marginBottom: 26, display: 'flex' }}>
          {eyebrow}
        </div>

        <div
          style={{
            fontFamily: display, fontStyle: 'italic', fontSize: 58, lineHeight: 1.1,
            textAlign: 'center', color: p.ink, marginBottom: 24, display: 'flex',
            maxWidth: 480,
          }}
        >
          {displayNames.join(' & ') || 'Your hosts'}
        </div>

        <div style={{ width: 72, height: 1.5, background: p.gold, marginBottom: 24, display: 'flex' }} />

        {dateLine && (
          <div style={{ fontSize: 19, color: p.ink, marginBottom: 8, display: 'flex' }}>{dateLine}</div>
        )}
        {venue && (
          <div style={{ fontSize: 16, color: p.inkSoft, marginBottom: 8, display: 'flex' }}>{venue}</div>
        )}

        {guestFirst && (
          <div
            style={{
              position: 'absolute', bottom: 52, left: 0, right: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: p.inkSoft,
            }}
          >
            Pressed for {guestFirst}
          </div>
        )}
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { 'Cache-Control': 'private, max-age=3600' },
      fonts: fraunces
        ? [{ name: 'Fraunces', data: fraunces, style: 'italic' as const, weight: 600 as const }]
        : undefined,
    },
  );
}
