'use client';

/* Livestream section — for the ones far away.

   Data: manifest.livestream  (written by the redesign's
   LivestreamPanel at editor/panels/blocks/LivestreamPanel.tsx)
     { url?, title?, note?, startsAt?, buttonLabel? }
   Legacy fallback: manifest.blocks[] entry of type 'livestream'
   with config { url, title, subtitle, startsAt, buttonLabel }
   (wizard-seeded memorial sites; the orphaned legacy panel at
   editor/panels/LivestreamPanel.tsx wrote that path).

   WHY NO EMBEDDED <iframe>: the URL is an arbitrary host-pasted
   link (Zoom, YouTube, Vimeo, church CDN, …). Most of those either
   refuse framing outright (X-Frame-Options / frame-ancestors on
   Zoom + meeting links), need per-provider embed URLs we can't
   derive reliably, or fall foul of autoplay + permission policies
   inside a cross-origin frame — a black rectangle at the exact
   moment a far-away guest needs it most. Opening in a new tab is
   the only path that works for EVERY link, so both variants render
   the stream as a link-out, never an embed.

   Countdown: startsAt is free-form text. When Date.parse() can read
   it, the section derives a "Begins in…" countdown from the absolute
   epoch (inherently timezone-correct for every viewer) and flips the
   kicker to LIVE NOW at start time, with the pulsing pl-dot-pulse
   dot (globals.css already stills it under prefers-reduced-motion).
   The clock ticks once a MINUTE — no per-second churn. LIVE NOW is
   held for 12 hours after start, then the kicker quietly reverts so
   a memorial site visited weeks later never claims to be live.
   Unparseable startsAt → the host's text renders verbatim, no
   countdown, kicker stays pre-live. All clock-derived UI mounts
   client-side only (state starts null) so SSR/hydration never
   disagree about "now".

   Variants (layouts.ts): card (default) | cinema. */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface LivestreamData {
  url?: string;
  title?: string;
  note?: string;
  startsAt?: string;
  buttonLabel?: string;
}

export function readLivestream(manifest: BlockSectionProps['manifest']): LivestreamData {
  const loose = manifest as unknown as {
    livestream?: LivestreamData;
    blocks?: Array<{ type?: string; config?: LivestreamData & { subtitle?: string } }>;
  };
  if (loose.livestream && Object.keys(loose.livestream).length > 0) return loose.livestream;
  const legacy = (loose.blocks ?? []).find((b) => b?.type === 'livestream')?.config;
  if (!legacy) return {};
  return {
    url: legacy.url,
    title: legacy.title,
    note: legacy.note ?? legacy.subtitle,
    startsAt: legacy.startsAt,
    buttonLabel: legacy.buttonLabel,
  };
}

const MONO = 'var(--t-mono, var(--pl-font-mono, ui-monospace, monospace))';
const GOLD = 'var(--t-gold, var(--gold, #B8935A))';
/* Editorial midnight — fixed, NOT theme-bound: the cinema band is
   ink regardless of the site's paper (BRAND.md §10: warm dark,
   never OLED black). */
const CINEMA_INK = '#13100B';
const CINEMA_CREAM = '#F1EBDC';

/** How long after the start time the kicker says LIVE NOW. */
const LIVE_WINDOW_MS = 12 * 60 * 60 * 1000;

export function parseStartsAt(startsAt?: string): number | null {
  const s = startsAt?.trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export function formatCountdown(msUntil: number): string {
  const mins = Math.max(1, Math.round(msUntil / 60_000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} · ${hours} hr${hours === 1 ? '' : 's'}`;
  if (hours > 0) return `${hours} hr${hours === 1 ? '' : 's'} · ${m} min`;
  return `${m} min`;
}

type Phase = 'pre' | 'live' | 'past';

/** Minute clock — null until mount (SSR-safe), then ticks every
 *  60s. Only runs when there is a parseable start time. */
function useMinuteClock(enabled: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return enabled ? now : null;
}

function phaseFor(startMs: number | null, now: number | null): Phase {
  if (startMs === null || now === null) return 'pre';
  if (now < startMs) return 'pre';
  if (now - startMs < LIVE_WINDOW_MS) return 'live';
  return 'past';
}

/** Viewer-local rendering of the parsed start — timezone-aware by
 *  construction (Intl formats the absolute epoch in the viewer's
 *  zone, with the zone named so nobody does mental arithmetic). */
function localStartLabel(startMs: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(startMs);
  } catch {
    return new Date(startMs).toLocaleString();
  }
}

/** Kicker — dot + mono caps status line. The dot only pulses while
 *  live; pl-dot-pulse is already stilled under reduced motion. */
function LiveKicker({ phase, color, dotColor }: { phase: Phase; color: string; dotColor: string }) {
  const label = phase === 'live' ? 'Live now' : 'Watch from afar';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span
        aria-hidden
        className={phase === 'live' ? 'pl-dot-pulse' : undefined}
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor,
          opacity: phase === 'live' ? 1 : 0.55,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: MONO, fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.26em', textTransform: 'uppercase',
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CountdownLine({ phase, startMs, now, color }: { phase: Phase; startMs: number | null; now: number | null; color: string }) {
  if (phase !== 'pre' || startMs === null || now === null) return null;
  return (
    <div
      style={{
        fontFamily: MONO, fontSize: 11, fontWeight: 600,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color,
      }}
    >
      Begins in {formatCountdown(startMs - now)}
    </div>
  );
}

function JoinButton({ url, label, style }: { url: string; label?: string; style?: CSSProperties }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        padding: '12px 22px',
        borderRadius: 999,
        background: 'var(--t-accent)',
        color: 'var(--t-accent-ink, var(--t-paper))',
        fontSize: 13.5,
        fontWeight: 700,
        textDecoration: 'none',
        ...style,
      }}
    >
      <PlayGlyph />
      {label?.trim() || 'Join the livestream'}
    </a>
  );
}

function PlayGlyph() {
  return (
    <span
      aria-hidden
      style={{
        width: 0, height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderLeft: '8px solid currentColor',
      }}
    />
  );
}

/* ─── Card — paper card with kicker, time, countdown, CTA. ───── */

function LivestreamCard({ data, url, phase, startMs, now }: {
  data: LivestreamData; url: string; phase: Phase; startMs: number | null; now: number | null;
}) {
  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        padding: '30px 26px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <LiveKicker
        phase={phase}
        color="color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)"
        dotColor={GOLD}
      />
      {data.startsAt?.trim() && (
        <div style={{ fontFamily: 'var(--t-display)', fontSize: 24, lineHeight: 1.25, color: 'var(--t-ink)' }}>
          {data.startsAt}
        </div>
      )}
      {/* Viewer-local restatement — only when the host's text was
          parseable AND the clock has mounted. */}
      {startMs !== null && now !== null && (
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--t-ink-muted)' }}>
          {localStartLabel(startMs)} · your time
        </div>
      )}
      <CountdownLine phase={phase} startMs={startMs} now={now} color="var(--t-ink-soft)" />
      {data.note?.trim() && (
        <div style={{ fontSize: 13.5, color: 'var(--t-ink-soft)', lineHeight: 1.6, maxWidth: 400 }}>
          {data.note}
        </div>
      )}
      <JoinButton url={url} label={data.buttonLabel} />
    </div>
  );
}

/* ─── Cinema — full-bleed ink band, letterboxed frame. ───────── */

/* The whole 16:9 frame is one <a> opening the stream in a new tab
   — see the header comment for why we never embed. */
function LivestreamCinema({ data, url, phase, startMs, now }: {
  data: LivestreamData; url: string; phase: Phase; startMs: number | null; now: number | null;
}) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <LiveKicker phase={phase} color="rgba(241,235,220,0.85)" dotColor="#D4B373" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={data.buttonLabel?.trim() || 'Open the livestream in a new tab'}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 'var(--t-radius-lg, 14px)',
          border: '1px solid rgba(241,235,220,0.22)',
          background: 'radial-gradient(ellipse at 50% 42%, rgba(241,235,220,0.07), rgba(241,235,220,0.015) 68%)',
          position: 'relative',
          textDecoration: 'none',
          color: CINEMA_CREAM,
        }}
      >
        <span
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}
        >
          {/* Play medallion — cream ring, single glyph. */}
          <span
            aria-hidden
            style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '1.5px solid rgba(241,235,220,0.55)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <span
              style={{
                width: 0, height: 0, marginLeft: 4,
                borderTop: '9px solid transparent',
                borderBottom: '9px solid transparent',
                borderLeft: '14px solid currentColor',
              }}
            />
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(241,235,220,0.65)' }}>
            Opens in a new tab
          </span>
        </span>
      </a>
      {data.startsAt?.trim() && (
        <div style={{ fontFamily: 'var(--t-display)', fontSize: 22, lineHeight: 1.25, color: CINEMA_CREAM, textAlign: 'center' }}>
          {data.startsAt}
        </div>
      )}
      {startMs !== null && now !== null && (
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', color: 'rgba(241,235,220,0.55)' }}>
          {localStartLabel(startMs)} · your time
        </div>
      )}
      <CountdownLine phase={phase} startMs={startMs} now={now} color="rgba(241,235,220,0.75)" />
      {data.note?.trim() && (
        <div style={{ fontSize: 13.5, color: 'rgba(241,235,220,0.8)', lineHeight: 1.6, maxWidth: 440, textAlign: 'center' }}>
          {data.note}
        </div>
      )}
      {/* Cream-on-ink pill — gold is hairline-only per BRAND.md §5,
          and the theme accent isn't guaranteed legible on fixed ink. */}
      <JoinButton url={url} label={data.buttonLabel} style={{ background: CINEMA_CREAM, color: CINEMA_INK }} />
    </div>
  );
}

/** Local CSS-var overrides so VariantSectionHead (which binds to
 *  --t-ink / --t-accent-ink / --t-line) reads cream on the fixed
 *  ink band without forking the head component. */
function CinemaVars({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ['--t-ink' as string]: CINEMA_CREAM,
        ['--t-ink-soft' as string]: '#D4CDBC',
        ['--t-ink-muted' as string]: '#8A8275',
        ['--t-accent-ink' as string]: '#D4B373',
        ['--t-line' as string]: 'rgba(241,235,220,0.2)',
        /* Editor-only empty callout binds to --t-card too. */
        ['--t-card' as string]: 'rgba(241,235,220,0.05)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function LivestreamSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const data = readLivestream(manifest);
  const url = data.url?.trim() ?? '';
  const empty = !url;

  const startMs = parseStartsAt(data.startsAt);
  const now = useMinuteClock(startMs !== null && !empty);
  const phase = phaseFor(startMs, now);

  if (empty && !editable) return null;

  const cinema = variant === 'cinema';
  const head = (
    <VariantSectionHead
      eyebrow={blockCopy(manifest, 'livestreamEyebrow', 'From afar')}
      title={blockCopy(manifest, 'livestreamTitle', data.title?.trim() || 'Join us from anywhere')}
      editable={editable}
      onEditEyebrow={onEditCopy ? (v) => onEditCopy('livestreamEyebrow', v) : undefined}
      onEditTitle={onEditCopy ? (v) => onEditCopy('livestreamTitle', v) : undefined}
      divider={cinema ? 'rule' : undefined}
    />
  );

  if (cinema) {
    return (
      <BlockFrame pad={pad} background={CINEMA_INK}>
        <CinemaVars>
          {head}
          {empty ? (
            <BlockEmpty hint="Paste the stream link (Zoom, YouTube, Vimeo…) in the Livestream panel." />
          ) : (
            <LivestreamCinema data={data} url={url} phase={phase} startMs={startMs} now={now} />
          )}
        </CinemaVars>
      </BlockFrame>
    );
  }

  return (
    <BlockFrame pad={pad} background="var(--t-section)">
      {head}
      {empty ? (
        <BlockEmpty hint="Paste the stream link (Zoom, YouTube, Vimeo…) in the Livestream panel." />
      ) : (
        <LivestreamCard data={data} url={url} phase={phase} startMs={startMs} now={now} />
      )}
    </BlockFrame>
  );
}
