// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/wallet/[token]/route.ts
//
// A guest's celebration, in their phone's wallet.
//
// GET ?platform=google  → { saveUrl } for the Save-to-Google button
// GET ?platform=apple   → the .pkpass binary
// GET (no platform)     → { apple, google } availability, so a
//                         surface can offer only what works
//
// Authed by the guest's own passport token — the same credential
// that opens /g/[token]. A guest never needs an account, and the
// token is the whole authorization: it identifies exactly one
// person on exactly one celebration, and this route never reads
// past that one row.
//
// FAILS CLOSED, LOUDLY. Apple needs the Pass Type ID certificate;
// without it this returns 503 rather than an unsigned archive,
// because an unsigned .pkpass is not a degraded pass — it's a file
// iOS rejects with a meaningless error, in front of a guest who
// will blame the invitation.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveGuestToken } from '@/lib/people';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { buildPassContent } from '@/lib/wallet/pass-content';
import { buildPkPass, isApplePassConfigured, PassNotConfiguredError } from '@/lib/wallet/pkpass';
import { googleSaveUrl, isGoogleWalletConfigured } from '@/lib/wallet/google-pass';
import { passIcon } from '@/lib/wallet/icon';
import { buildSiteUrl } from '@/lib/site-urls';
import { resolveSiteNames } from '@/lib/site-names';

export const dynamic = 'force-dynamic';

const TAG = '[wallet]';

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const platform = req.nextUrl.searchParams.get('platform');

  const rl = checkRateLimit(`wallet:${getClientIp(req)}`, { max: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  const supabase = sb();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Storage not configured' }, { status: 503 });
  }

  const guest = await resolveGuestToken(supabase, token);
  if (!guest) {
    // Deliberately identical to the not-configured shape below in
    // its lack of detail: a wrong token learns nothing about
    // whether it was wrong or merely unlucky.
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const { data: site } = await supabase
    .from('sites')
    .select('subdomain, ai_manifest, site_config')
    .eq('id', guest.siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const manifest = (site.ai_manifest ?? {}) as Record<string, unknown>;
  // A draft has nothing to put in a wallet, and issuing a pass for
  // one would leak a celebration the host hasn't shared.
  if (!manifest.published) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const names = resolveSiteNames(
    (site.site_config as { names?: unknown } | null)?.names,
    manifest.names,
  );
  const occasion = (manifest.occasion as string | undefined) ?? null;
  const logistics = (manifest.logistics ?? {}) as Record<string, string | undefined>;
  const siteUrl = buildSiteUrl(occasion ?? 'wedding', site.subdomain as string);
  const accent = (manifest.themeVars as Record<string, string> | undefined)?.['--t-accent'] ?? null;

  const content = buildPassContent(
    {
      occasion,
      title: names.filter(Boolean).join(' & ') || (site.subdomain as string),
      date: logistics.date ?? null,
      time: logistics.time ?? null,
      venue: logistics.venue ?? null,
      venueAddress: logistics.venueAddress ?? null,
      dressCode: logistics.dresscode ?? null,
      siteUrl,
    },
    { name: guest.name ?? '', token },
    siteUrl,
  );

  // ── Availability probe ─────────────────────────────────────
  if (!platform) {
    return NextResponse.json({
      ok: true,
      apple: isApplePassConfigured(),
      google: isGoogleWalletConfigured(),
    });
  }

  // ── Google ─────────────────────────────────────────────────
  if (platform === 'google') {
    const saveUrl = googleSaveUrl(content, `guest_${token}`);
    if (!saveUrl) {
      return NextResponse.json(
        { ok: false, error: 'Google Wallet is not configured for this deployment.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, saveUrl });
  }

  // ── Apple ──────────────────────────────────────────────────
  if (platform === 'apple') {
    if (!isApplePassConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Apple Wallet is not configured for this deployment.' },
        { status: 503 },
      );
    }
    try {
      const pass = await buildPkPass({
        content,
        identity: {
          passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
          teamIdentifier: process.env.APPLE_TEAM_ID!,
          // The guest's token — stable, so re-issuing UPDATES their
          // pass rather than leaving two in the wallet.
          serialNumber: token,
        },
        // Drawn, not shipped — and tinted to this celebration's own
        // accent, so the pass on a guest's lock screen matches the
        // site they were invited to. @2x because iOS downsamples
        // cleanly but never upsamples well.
        images: [
          { name: 'icon.png', data: passIcon(87, accent) },
          { name: 'icon@2x.png', data: passIcon(174, accent) },
        ],
        // The signer arrives with the certificate; until then
        // buildPkPass refuses rather than emitting something iOS
        // will reject. isApplePassConfigured() above keeps us from
        // getting here in the first place.
      });
      return new NextResponse(new Uint8Array(pass), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': 'attachment; filename="celebration.pkpass"',
          'Cache-Control': 'private, no-store',
        },
      });
    } catch (err) {
      if (err instanceof PassNotConfiguredError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
      }
      console.warn(TAG, 'pass build failed:', err);
      return NextResponse.json({ ok: false, error: 'Could not build the pass.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown platform' }, { status: 400 });
}
