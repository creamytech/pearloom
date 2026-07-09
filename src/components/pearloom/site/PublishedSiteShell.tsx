'use client';

// ─────────────────────────────────────────────────────────────
// PublishedSiteShell — client wrapper for the public site
// renderer. Mounts the literal-handoff redesign canvas
// (src/components/pearloom/redesign/ThemedSite.tsx) so the
// published URL matches the editor canvas exactly.
//
// The previous canonical (src/components/pearloom/site/
// ThemedSiteRenderer.tsx) stays in the tree as a fallback path
// for any manifest that pre-dates the redesign field set —
// see `usesRedesignCanvas()` below.
//
// Adds ErrorBoundary insurance so a corrupt chapter / malformed
// sticker / outdated block id doesn't take the entire site
// offline; guests see a calm fallback instead.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { SiteBlockKey } from '@/lib/site-mode';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemedSite } from '@/components/pearloom/redesign/ThemedSite';
import { hydrateManifestForRedesign } from '@/components/pearloom/redesign/hydrate-manifest';
import { readVariant } from '@/components/pearloom/redesign/layouts';
/* Interaction-gated overlays — each Lazy* wrapper keeps a feather-
   weight trigger mounted and only downloads the real component
   (and its framer-motion / RSVP-form freight) when the guest
   actually needs it. See each wrapper's header for its trigger. */
import { LazyGuestRsvpModal } from '@/components/pearloom/site/LazyGuestRsvpModal';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';
import { LazyStickyRsvpPill } from '@/components/pearloom/site/LazyStickyRsvpPill';
import { LazyArrivalReveal } from '@/components/pearloom/site/LazyArrivalReveal';
import { BroadcastBar } from '@/components/pearloom/site/BroadcastBar';
import { LazySiteToast } from '@/components/pearloom/site/LazySiteToast';
import { StoreFonts } from '@/lib/theme-store/fonts';
import { GuestLanguageSwitcher } from '@/components/pearloom/site/GuestLanguageSwitcher';
import { getTheme } from '@/components/pearloom/site/themes';
import { LivingBackground } from '@/components/pearloom/site/LivingBackground';
import { trackGuestFunnel } from '@/lib/guest-track';

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  prettyUrl: string;
  creatorEmail?: string | null;
  pageFilter?: 'home' | SiteBlockKey;
}

function GuestCrashFallback() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--cream, #FBF7EE)',
      padding: 32,
    }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)', marginBottom: 12 }}>
          Pearloom
        </div>
        <h1 style={{ fontFamily: 'var(--font-display, "Fraunces", serif)', fontSize: 32, fontWeight: 600, margin: '0 0 12px', color: 'var(--ink, #0E0D0B)' }}>
          The thread caught
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55, margin: '0 0 20px' }}>
          We hit a snag rendering this page. Refreshing usually clears it, 
          if not, the hosts have been notified.
        </p>
        {/* Raw <a> not next/link — full reload escapes any broken React state. */}
        <a
          href={typeof window !== 'undefined' ? window.location.pathname : '/'}
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            borderRadius: 999,
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Refresh
        </a>
      </div>
    </div>
  );
}

/* hydrateManifestForRedesign() backfills new-canvas-only fields
   (themeId, kitId, siteLayout, storySection, detailsCards, edition,
   …) from the canonical schema (theme.colors, chapters, logistics,
   poetry, etc.). The function is intentionally idempotent — passing
   a manifest that already has the new fields is a no-op. */

export function PublishedSiteShell(props: Props) {
  const hydrated = hydrateManifestForRedesign(props.manifest);

  /* Site password (manifest.privacyGate.password, editor Privacy
     panel). Client-side gate — parity with the legacy PasswordGate:
     it keeps casual visitors out, not determined ones (the manifest
     rides the RSC payload either way). Unlock persists per session. */
  const gatePassword = ((hydrated as unknown as { privacyGate?: { password?: string } }).privacyGate?.password ?? '').trim();
  /* Starts locked on server + client alike (hydration-safe); the
     gate itself re-checks sessionStorage on mount and self-clears
     for returning visitors. */
  const [unlocked, setUnlocked] = useState<boolean>(!gatePassword);

  /* RSVP funnel — a guest arriving via their personal link (?g=)
     stamps invite_opened_at once. Lives HERE (not in SiteGate) so
     un-gated sites — the vast majority — count opens too; the
     helper self-dedupes per load and no-ops without a token. */
  useEffect(() => { trackGuestFunnel('opened'); }, []);

  /* RSVP-preset-aware label for the sticky pill (memorials don't
     say "RSVP", etc.). */
  const rsvpPreset = ((hydrated as unknown as { rsvpConfig?: { preset?: string } }).rsvpConfig?.preset) ?? undefined;
  const rsvpLabel = rsvpPreset === 'memorial' ? 'Reply' : 'RSVP';

  /* The pill + modal mount as SIBLINGS of ThemedSite's root, so the
     --t-* vars never reach them via inheritance. Resolve the same
     theme bag the canvas paints with (hydrated themeId + Theme-Store
     pack vars) and hand the pill concrete values. */
  const looseTheme = hydrated as unknown as { themeId?: string; themeVars?: Record<string, string> };
  const themeBag = { ...getTheme(looseTheme.themeId).vars, ...(looseTheme.themeVars ?? {}) };
  const pillAccent = themeBag['--t-rsvp'] ?? themeBag['--t-accent'];
  const pillAccentInk = themeBag['--t-rsvp-ink'] ?? themeBag['--t-paper'];

  /* RSVP funnel — a guest arriving via their personal link (?g=)
     stamps invite_opened_at once. Lives here (not in SiteGate) so it
     fires on EVERY site, gated or not — most sites have no password.
     Fire-and-forget; no token → no-op. */
  useEffect(() => { trackGuestFunnel('opened'); }, []);

  if (!unlocked) {
    return (
      <SiteGate
        siteSlug={props.siteSlug}
        names={props.names}
        password={gatePassword}
        themeBag={themeBag}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <ErrorBoundary fallback={<GuestCrashFallback />}>
      {/* Pack typography — without this, store-pack display faces
          (Cormorant, Playfair, Bodoni, …) fall back to Georgia. */}
      <StoreFonts />
      {/* Day-of live broadcast banner — sticks to the top of the
          published site the moment a host posts an update. Lives
          here (not just on /g/[token]) so EVERY guest sees it, which
          is what the composer promises. */}
      <BroadcastBar subdomain={props.siteSlug} />
      {/* Living background (v2 shader wallpaper) — a fixed animated
          ground behind the whole site; ThemedSite's root goes
          transparent when manifest.background is set so it shows
          through. Degrades to nothing without WebGL. Boxed + postcard
          layouts paint their own opaque ground over the root, so the
          wallpaper would be 100% occluded — skip the GPU work there. */}
      {(hydrated as unknown as { background?: string }).background &&
        !['boxed', 'postcard'].includes((hydrated as unknown as { siteLayout?: string }).siteLayout ?? '') && (
        <LivingBackground
          id={(hydrated as unknown as { background?: string }).background as string}
          fixed
          style={{ zIndex: 0 }}
        />
      )}
      <ThemedSite
        manifest={hydrated}
        names={props.names}
        /* editor wiring intentionally omitted — published guests
           don't click sections; ThemedSite's editor-only props
           default to no-op + null in published mode. */
        /* Multi-page routing — the home route passes 'home', sub-page
           routes pass their block key. Without this forward, magazine
           (multi-page) sites rendered every section on every route. */
        pageFilter={props.pageFilter}
        siteSlug={props.siteSlug}
      />
      {/* Overlays — keep the product features ThemedSiteRenderer
          used to provide before the swap, so published sites
          don't lose RSVP backend / sticky CTA / engagement
          analytics. The RSVP modal loads on demand via rsvp-bus /
          the 'pl-open-rsvp' window event ThemedSite dispatches from
          its RSVP CTA (see LazyGuestRsvpModal).
          Each lazy overlay gets its OWN empty-fragment boundary: a
          chunk that 404s mid-session (deploy rotation) must cost the
          guest that overlay, never the whole site via the outer
          GuestCrashFallback boundary. */}
      <ErrorBoundary fallback={<></>}>
        <LazyStickyRsvpPill rsvpLabel={rsvpLabel} accent={pillAccent} accentInk={pillAccentInk} />
      </ErrorBoundary>
      {/* On-site language switcher — only renders when the host has
          published ≥1 non-English translation (availableLocales).
          Sibling of ThemedSite's root, so it takes the resolved theme
          bag rather than inheriting the site's --t-* vars. A broken
          switcher must never take the site down, hence its own
          empty-fragment boundary. */}
      <ErrorBoundary fallback={<></>}>
        <GuestLanguageSwitcher manifest={hydrated} theme={themeBag} />
      </ErrorBoundary>
      <AnalyticsBeacon siteId={props.siteSlug} />
      <ErrorBoundary fallback={<></>}>
        <LazyGuestRsvpModal siteSlug={props.siteSlug} manifest={hydrated} />
      </ErrorBoundary>
      <ErrorBoundary fallback={<></>}>
        <LazySiteToast theme={themeBag} />
      </ErrorBoundary>
      {/* The Sealed Arrival — envelope-opening first-visit reveal.
          Home route only (sub-pages of multi-page sites are working
          surfaces, not arrivals). Client overlay over the already-
          rendered site; crawlers and reduced-motion are unaffected
          (LazyArrivalReveal skips the download entirely for repeat
          visitors / reduced motion / automation). Suppressed when the
          hero is the Cover variant — that hero IS the envelope, and
          guests should never meet two of them. */}
      {(!props.pageFilter || props.pageFilter === 'home') && readVariant(hydrated, 'hero') !== 'cover' && (
        <ErrorBoundary fallback={<></>}>
          <LazyArrivalReveal
            manifest={hydrated}
            names={props.names}
            siteSlug={props.siteSlug}
            theme={themeBag}
            rsvpLabel={rsvpLabel}
          />
        </ErrorBoundary>
      )}
    </ErrorBoundary>
  );
}

/* ── SiteGate — the password door (manifest.privacyGate) ─────────
   Themed from the same resolved vars as the site behind it.
   Session unlock so guests aren't re-asked on every navigation. */
function SiteGate({
  siteSlug, names, password, themeBag, onUnlock,
}: {
  siteSlug: string;
  names: [string, string];
  password: string;
  themeBag: Record<string, string>;
  onUnlock: () => void;
}) {
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState(false);
  const paper = themeBag['--t-paper'] ?? '#FDFAF0';
  const ink = themeBag['--t-ink'] ?? '#0E0D0B';
  const inkSoft = themeBag['--t-ink-soft'] ?? '#3A332C';
  const accent = themeBag['--t-accent'] ?? '#5C6B3F';
  const line = themeBag['--t-line'] ?? 'rgba(14,13,11,0.14)';
  const display = themeBag['--t-display'] ?? '"Fraunces", Georgia, serif';

  /* Returning visitor — already unlocked this session. Mount-time
     check keeps SSR + hydration in agreement (both render locked,
     then the effect clears it). */
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(`pl:gate:${siteSlug}`) === '1') onUnlock();
    } catch { /* stay locked */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSlug]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (attempt.trim() !== password) {
      setError(true);
      return;
    }
    try { window.sessionStorage.setItem(`pl:gate:${siteSlug}`, '1'); } catch { /* per-page unlock */ }
    onUnlock();
  }

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'grid', placeItems: 'center',
        background: paper, color: ink, padding: 24,
        fontFamily: themeBag['--t-body'] ?? 'system-ui, sans-serif',
      }}
    >
      <form onSubmit={submit} style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)', fontSize: '0.6rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: accent, margin: '0 0 14px' }}>
          A private celebration
        </p>
        <h1 style={{ fontFamily: display, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.7rem, 5vw, 2.4rem)', lineHeight: 1.1, margin: '0 0 10px' }}>
          {names.filter(Boolean).join(' & ') || 'This site'} kept this one close.
        </h1>
        <p style={{ fontSize: '0.86rem', color: inkSoft, margin: '0 0 22px', lineHeight: 1.55 }}>
          Enter the password from your invitation to come in.
        </p>
        <input
          type="password"
          autoFocus
          value={attempt}
          onChange={(e) => { setAttempt(e.target.value); setError(false); }}
          placeholder="Password"
          aria-label="Site password"
          style={{
            width: '100%', padding: '13px 16px', textAlign: 'center',
            fontSize: '1rem', fontFamily: 'inherit', color: ink,
            background: themeBag['--t-card'] ?? '#fff',
            border: `1px solid ${error ? '#A14A2C' : line}`,
            borderRadius: 12, outline: 'none', marginBottom: 10,
          }}
        />
        {error && (
          <p role="alert" style={{ fontSize: '0.76rem', color: '#A14A2C', margin: '0 0 10px' }}>
            That&apos;s not it, check the invitation and try again.
          </p>
        )}
        <button
          type="submit"
          disabled={!attempt.trim()}
          style={{
            width: '100%', padding: '13px 18px', borderRadius: 999,
            background: ink, color: paper, border: 'none',
            fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit',
            cursor: attempt.trim() ? 'pointer' : 'not-allowed',
            opacity: attempt.trim() ? 1 : 0.55,
          }}
        >
          Come in
        </button>
      </form>
    </div>
  );
}

