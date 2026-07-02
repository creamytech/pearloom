'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/pearloom/site/ArrivalReveal.tsx
//
// The Sealed Arrival — the published site's envelope-opening
// experience. First visit to the site shows a full-viewport
// envelope in the site's theme, sealed with the couple's wax-
// seal monogram. Tap (or a beat) breaks the seal, the flap
// lifts, two threads draw across the seam, and the paper parts
// like curtains to reveal the site already rendered beneath.
//
// Personalisation: guests arriving via their passport link
// (?g=<token> / ?guest=) get an envelope addressed to them —
// "For Maria" in the display italic — plus a postmark stamped
// with the event date.
//
// Occasion-aware: solemn voices (memorial / funeral) never get
// the envelope. They get the Quiet Arrival — a single thread
// draws a rule, the honoree's name settles in, the paper fades.
// Hosts can override via manifest.arrival ('auto' | 'envelope'
// | 'quiet' | 'off') from the editor's Share panel.
//
// Behaviour contract:
//   • CLIENT OVERLAY ONLY. The site is server-rendered and
//     fully present beneath — crawlers, OG unfurls, and slow
//     connections are never gated. The overlay arms after
//     hydration (one painted frame of the site is acceptable).
//   • Once per device (localStorage). Return visits get a
//     0.9s two-strand thread flourish at the top edge, once
//     per session.
//   • prefers-reduced-motion → nothing renders at all.
//   • Headless browsers (navigator.webdriver) and iframes
//     (Studio proofs, PDF export pipelines) are skipped.
//   • While the envelope shows, the cover photo preloads —
//     load time becomes theatre instead of a blank paint. The
//     "Tap to break the seal" hint waits for ready (or 2.5s).
//   • After the curtain parts, a transient RSVP hand-off pill
//     appears bottom-right (same corner as StickyRsvpPill,
//     which only arrives after 30% scroll) and self-dismisses.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { rsvpReplyBy } from '@/lib/next-step';
import { Motif, type MotifKind } from './MotifScatter';
import { deriveInitials } from '@/lib/monogram';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ── Tiny hex shade helpers (the envelope wax + paper want a
   lighter/darker tone of the site accent; pure, no deps). Pass-
   through for non-hex values (color-mix / var soup) so we never
   produce an invalid color. */
function clamp8(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex: string, amt: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const f = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  const [r, g, b] = rgb.map((c) => clamp8(c + (f - c) * t));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
const MOTIF_KINDS = new Set<string>([
  'olive','bloom','pressed','lemon','sun','wheat','fern','shell','citrus','laurel',
  'deco-fan','palm','mountain','wave-curl','rose','crescent','dove','arrows','pinecone',
]);

export type ArrivalStyle = 'auto' | 'envelope' | 'quiet' | 'off';

/** Resolve the host's pick (or the occasion default) to a concrete
 *  arrival treatment. Exported so the editor's Share panel can show
 *  which style "Matched to your event" resolves to. */
export function resolveArrivalStyle(manifest: StoryManifest): Exclude<ArrivalStyle, 'auto'> {
  const loose = manifest as unknown as { arrival?: ArrivalStyle; occasion?: string };
  const pick = loose.arrival ?? 'auto';
  if (pick !== 'auto') return pick;
  const occasion = loose.occasion;
  if (occasion === 'memorial' || occasion === 'funeral') return 'quiet';
  return getEventType(occasion)?.voice === 'solemn' ? 'quiet' : 'envelope';
}

interface Props {
  manifest: StoryManifest;
  names: [string, string];
  siteSlug: string;
  /** Resolved theme vars (PublishedSiteShell's themeBag). The overlay
   *  mounts as a SIBLING of the themed root, so --t-* vars never
   *  reach it via inheritance — concrete values come in by prop. */
  theme: Record<string, string>;
  /** Preset-aware CTA label ("RSVP" / "Reply"). */
  rsvpLabel: string;
}

type Mode = 'envelope' | 'quiet' | 'flourish' | 'none';
type Phase = 'sealed' | 'opening' | 'done';

const seenKey = (slug: string) => `pl:arrival-seen:${slug}`;
const flourishKey = (slug: string) => `pl:arrival-flourish:${slug}`;

function firstNameOf(full: string | null): string | null {
  const f = (full ?? '').trim().split(/\s+/)[0];
  return f || null;
}

function formatReplyBy(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export function ArrivalReveal({ manifest, names, siteSlug, theme, rsvpLabel }: Props) {
  const prefersReduced = useReducedMotion();
  const style = resolveArrivalStyle(manifest);

  /* Arm after hydration (rAF callback, not a direct effect set) so
     the server HTML and the client's first render agree: no overlay.
     The decision tree runs exactly once. */
  const [mode, setMode] = useState<Mode>('none');
  useEffect(() => {
    if (prefersReduced || style === 'off') return;
    const id = requestAnimationFrame(() => {
      try {
        if (window.navigator.webdriver) return;
        if (window.self !== window.top) return;
      } catch {
        return; // cross-origin frame access threw → we're framed
      }
      let seen = false;
      try { seen = window.localStorage.getItem(seenKey(siteSlug)) === '1'; } catch { /* ignore */ }
      if (!seen) {
        setMode(style);
        return;
      }
      let flourished = true;
      try {
        flourished = window.sessionStorage.getItem(flourishKey(siteSlug)) === '1';
        if (!flourished) window.sessionStorage.setItem(flourishKey(siteSlug), '1');
      } catch { /* ignore */ }
      if (!flourished) setMode('flourish');
    });
    return () => cancelAnimationFrame(id);
  }, [prefersReduced, style, siteSlug]);

  if (mode === 'none') return null;
  if (mode === 'flourish') return <ReturnFlourish theme={theme} />;
  if (mode === 'quiet') {
    return <QuietArrival manifest={manifest} names={names} siteSlug={siteSlug} theme={theme} />;
  }
  return (
    <EnvelopeArrival
      manifest={manifest}
      names={names}
      siteSlug={siteSlug}
      theme={theme}
      rsvpLabel={rsvpLabel}
    />
  );
}

/* ── Return flourish — two strands draw across the top edge ──── */

function ReturnFlourish({ theme }: { theme: Record<string, string> }) {
  const accent = theme['--t-accent'] ?? 'var(--pl-olive, #5C6B3F)';
  const gold = theme['--t-gold'] ?? 'var(--pl-gold, #B8935A)';
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2100);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div
      aria-hidden
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9990, pointerEvents: 'none', display: 'grid', gap: 2, paddingTop: 0 }}
    >
      {[
        { color: accent, delay: 0, opacity: 0.85 },
        { color: gold, delay: 0.12, opacity: 0.6 },
      ].map((s, i) => (
        <motion.span
          key={i}
          initial={{ scaleX: 0, opacity: s.opacity }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ scaleX: { duration: 0.9, delay: s.delay, ease: EASE }, opacity: { duration: 0.7, delay: s.delay + 1.1 } }}
          style={{ display: 'block', height: 1, background: s.color, transformOrigin: '0% 50%' }}
        />
      ))}
    </div>
  );
}

/* ── Quiet Arrival — solemn occasions ────────────────────────── */

function QuietArrival({
  manifest, names, siteSlug, theme,
}: { manifest: StoryManifest; names: [string, string]; siteSlug: string; theme: Record<string, string> }) {
  const [phase, setPhase] = useState<Phase>('sealed');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const kicker = occasion === 'memorial' || occasion === 'funeral' ? 'In loving memory' : 'Welcome';
  const displayName = names.filter(Boolean).join(' & ') || 'A gathering';

  const paper = theme['--t-paper'] ?? '#FDFAF0';
  const ink = theme['--t-ink'] ?? '#0E0D0B';
  const inkSoft = theme['--t-ink-soft'] ?? '#3A332C';
  const accent = theme['--t-accent'] ?? '#5C6B3F';
  const gold = theme['--t-gold'] ?? '#B8935A';
  const fontDisplay = theme['--t-display'] ?? '"Fraunces", Georgia, serif';

  useBodyScrollLock(phase !== 'done');

  // Mark seen immediately — the quiet arrival has no tap gate.
  useEffect(() => {
    try { window.localStorage.setItem(seenKey(siteSlug), '1'); } catch { /* ignore */ }
  }, [siteSlug]);

  // Settle, hold, fade. Tap (or Esc) skips ahead.
  useEffect(() => {
    if (phase !== 'sealed') return;
    const t = setTimeout(() => setPhase('opening'), 2600);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'opening') return;
    const t = setTimeout(() => setPhase('done'), 900);
    return () => clearTimeout(t);
  }, [phase]);
  useEscapeTo(() => setPhase('opening'), phase === 'sealed');

  if (phase === 'done') return null;
  return (
    <motion.div
      role="presentation"
      onClick={() => setPhase('opening')}
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'opening' ? 0 : 1 }}
      transition={{ duration: phase === 'opening' ? 0.85 : 0.5, ease: EASE }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: paper, color: ink, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22,
        padding: 24,
      }}
    >
      <Grain />
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase',
          color: accent, margin: 0,
        }}
      >
        {kicker}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
        style={{
          fontFamily: fontDisplay, fontStyle: 'italic', fontWeight: 500,
          fontSize: 'clamp(1.8rem, 6vw, 2.8rem)', lineHeight: 1.1,
          letterSpacing: '-0.015em', margin: 0, textAlign: 'center', color: ink,
        }}
      >
        {displayName}
      </motion.h1>
      <div style={{ display: 'grid', gap: 3, width: 'min(180px, 40vw)' }}>
        {[{ c: accent, d: 0.85, o: 0.9 }, { c: gold, d: 1.0, o: 0.7 }].map((s, i) => (
          <motion.span
            key={i}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: s.o }}
            transition={{ duration: 0.9, delay: s.d, ease: EASE }}
            style={{ display: 'block', height: 1, background: s.c, transformOrigin: '50% 50%' }}
          />
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        transition={{ duration: 0.8, delay: 1.6 }}
        style={{ fontSize: '0.78rem', color: inkSoft, margin: 0, fontFamily: 'var(--pl-font-body, system-ui, sans-serif)' }}
      >
        Tap to continue
      </motion.p>
    </motion.div>
  );
}

/* ── The Sealed Arrival — envelope + curtain ─────────────────── */

function EnvelopeArrival({
  manifest, names, siteSlug, theme, rsvpLabel,
}: Props) {
  const [phase, setPhase] = useState<Phase>('sealed');
  const [ready, setReady] = useState(false);
  const [guestFirst, setGuestFirst] = useState<string | null>(null);
  const [showPill, setShowPill] = useState(false);
  const openedRef = useRef(false);

  const loose = manifest as unknown as {
    coverPhoto?: string;
    monogram?: { initials?: string };
    logistics?: { date?: string; venue?: string };
    motifKind?: string;
  };

  const paper = theme['--t-paper'] ?? '#FDFAF0';
  const card = theme['--t-card'] ?? '#FFFEF7';
  const section = theme['--t-section'] ?? '#F3E9D4';
  const ink = theme['--t-ink'] ?? '#0E0D0B';
  const inkSoft = theme['--t-ink-soft'] ?? '#3A332C';
  const accent = theme['--t-accent'] ?? '#5C6B3F';
  const gold = theme['--t-gold'] ?? '#B8935A';
  const line = theme['--t-line'] ?? 'rgba(14,13,11,0.14)';
  const fontDisplay = theme['--t-display'] ?? '"Fraunces", Georgia, serif';
  const fontBody = theme['--t-body'] ?? 'var(--pl-font-body, system-ui, sans-serif)';
  const mono = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

  const displayNames = names.filter(Boolean);
  const initials = loose.monogram?.initials || displayNames.join(' & ') || 'P';
  const { initA, initB } = deriveInitials(initials);
  const replyBy = useMemo(() => rsvpReplyBy(manifest), [manifest]);

  /* The site's motif (deco-fan, palm, rose, …) tints the flap liner
     and scatters faintly behind the envelope, so the seal feels cut
     from the same cloth as the site. Falls back to no motif. */
  const motifKind = MOTIF_KINDS.has(String(loose.motifKind)) ? (loose.motifKind as MotifKind) : null;

  /* Themed paper tones derived from the site palette. The seal is a
     blind-embossed paper medallion (BRAND §5: gold is a hairline, not
     a fill), so it reads editorial — not a glossy bead. */
  const accentInk = theme['--t-accent-ink'] ?? ink;
  const bodyTop = shade(card, 0.04);
  const bodyBottom = shade(section, -0.04);
  const flapBottom = shade(section, -0.02);
  const sealFace = card;
  const sealGhost = shade(card, -0.05);

  useBodyScrollLock(phase !== 'done');

  /* Envelope tilt — pointer-driven motion values, no re-renders.
     Touch movement on phones drives the same values. */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useTransform(mx, [-1, 1], [-7, 7]);
  const rotateX = useTransform(my, [-1, 1], [6, -6]);
  const onPointerMove = (e: React.PointerEvent) => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    mx.set((e.clientX / w) * 2 - 1);
    my.set((e.clientY / h) * 2 - 1);
  };

  /* The seal as the loader — preload the cover photo while sealed
     so opening reveals a painted hero, not a decoding one. Ready
     also gates the auto-open timer + the tap hint. */
  useEffect(() => {
    const url = (loose.coverPhoto ?? '').trim();
    if (!url || url.startsWith('data:')) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const img = new Image();
    const done = () => { if (!cancelled) setReady(true); };
    img.onload = done;
    img.onerror = done;
    img.src = url;
    const cap = setTimeout(done, 2500); // never hold the seal hostage
    return () => { cancelled = true; clearTimeout(cap); };
  }, [loose.coverPhoto]);

  /* Addressed to you — resolve the guest's name from their passport
     token. Resolves quietly; the address line animates in late. */
  useEffect(() => {
    let token: string | null = null;
    try {
      const params = new URL(window.location.href).searchParams;
      token = params.get('g') || params.get('guest');
    } catch { /* ignore */ }
    if (!token) return;
    const ctrl = new AbortController();
    fetch(`/api/sites/guest-passport?siteSlug=${encodeURIComponent(siteSlug)}&token=${encodeURIComponent(token)}`, {
      cache: 'no-store', signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: null | { guest?: { name?: string } }) => {
        const name = data?.guest?.name;
        if (typeof name === 'string' && name.trim()) setGuestFirst(firstNameOf(name));
      })
      .catch(() => { /* anonymous envelope is fine */ });
    return () => ctrl.abort();
  }, [siteSlug]);

  function open() {
    if (openedRef.current) return;
    openedRef.current = true;
    try { window.localStorage.setItem(seenKey(siteSlug), '1'); } catch { /* ignore */ }
    setPhase('opening');
  }

  // Auto-open a few seconds after ready — the envelope is theatre,
  // never a gate.
  useEffect(() => {
    if (!ready || phase !== 'sealed') return;
    const t = setTimeout(open, 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, phase]);
  useEscapeTo(open, phase === 'sealed');

  // Opening choreography: flap + seal (0–0.6s) → threads draw at the
  // seam (0.35–1.1s) → panels part (0.55–1.5s) → done. Then the RSVP
  // hand-off pill, only if the page actually has an #rsvp anchor.
  useEffect(() => {
    if (phase !== 'opening') return;
    const t = setTimeout(() => {
      setPhase('done');
      if (document.getElementById('rsvp')) setShowPill(true);
    }, 1550);
    return () => clearTimeout(t);
  }, [phase]);

  // The hand-off pill self-dismisses — on timeout or once the guest
  // starts genuinely scrolling (StickyRsvpPill owns the corner from
  // 30% onward).
  useEffect(() => {
    if (!showPill) return;
    const t = setTimeout(() => setShowPill(false), 6500);
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.6) setShowPill(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, [showPill]);

  const opening = phase === 'opening';
  const panelStyle: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, background: paper, overflow: 'hidden',
  };

  return (
    <>
      {phase !== 'done' && (
        <div
          role="presentation"
          onClick={open}
          onPointerMove={onPointerMove}
          style={{ position: 'fixed', inset: 0, zIndex: 9990, cursor: 'pointer' }}
        >
          {/* Curtain panels — part top/bottom when opening. The 1px
              overlap hides the seam until the threads draw over it. */}
          <motion.div
            aria-hidden
            initial={false}
            animate={opening ? { y: '-100%' } : { y: 0 }}
            transition={{ duration: 0.95, delay: opening ? 0.55 : 0, ease: EASE }}
            style={{ ...panelStyle, top: 0, height: 'calc(50% + 1px)' }}
          >
            <Grain />
          </motion.div>
          <motion.div
            aria-hidden
            initial={false}
            animate={opening ? { y: '100%' } : { y: 0 }}
            transition={{ duration: 0.95, delay: opening ? 0.55 : 0, ease: EASE }}
            style={{ ...panelStyle, bottom: 0, height: 'calc(50% + 1px)' }}
          >
            <Grain />
          </motion.div>

          {/* Two-strand thread at the seam — draws as the seal breaks,
              then rides out with the curtain. */}
          <div
            aria-hidden
            style={{
              position: 'absolute', top: '50%', left: 0, right: 0,
              display: 'grid', gap: 3, transform: 'translateY(-2px)',
              pointerEvents: 'none',
            }}
          >
            {[{ c: accent, d: 0.35, o: 0.9 }, { c: gold, d: 0.5, o: 0.7 }].map((s, i) => (
              <motion.span
                key={i}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={opening ? { scaleX: 1, opacity: [0, s.o, 0] } : { scaleX: 0, opacity: 0 }}
                transition={{ scaleX: { duration: 0.75, delay: s.d, ease: EASE }, opacity: { duration: 1.15, delay: s.d, times: [0, 0.45, 1] } }}
                style={{ display: 'block', height: 1, background: s.c, transformOrigin: '50% 50%' }}
              />
            ))}
          </div>

          {/* Centre stage — kicker, envelope, hint. Fades + settles
              away as the seal breaks. */}
          <motion.div
            initial={false}
            animate={opening ? { opacity: 0, scale: 0.96, y: -8 } : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, delay: opening ? 0.18 : 0, ease: EASE }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
              perspective: '1200px', padding: 24,
            }}
          >
            {/* Warm glow + the site's own motif, faint, behind the
                envelope — so the arrival is cut from the same cloth as
                the site. Decorative, non-interactive. */}
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
                // expose the site accent to <Motif>, which binds to --t-motif/--t-accent.
                ['--t-accent' as string]: accent,
                ['--t-motif' as string]: accent,
              }}
            >
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 520, height: 520,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, ${shade(accent, 0.6)} 0%, transparent 62%)`,
                  opacity: 0.18,
                }}
              />
              {motifKind && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
                    style={{ position: 'absolute', left: '8%', top: '18%', transform: 'rotate(-12deg)' }}
                  >
                    <Motif kind={motifKind} size={92} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
                    style={{ position: 'absolute', right: '9%', bottom: '16%', transform: 'rotate(14deg)' }}
                  >
                    <Motif kind={motifKind} size={108} />
                  </motion.div>
                </>
              )}
            </div>

            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              style={{
                fontFamily: mono, fontSize: '0.6rem',
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: inkSoft, margin: 0, position: 'relative',
              }}
            >
              Sealed for {guestFirst ?? 'you'}
            </motion.p>

            {/* The envelope — tilt-tracked, floating. */}
            <motion.div
              style={{
                position: 'relative', width: 300, height: 206,
                transformStyle: 'preserve-3d', rotateX, rotateY,
              }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: [0, -4, 0], opacity: 1 }}
              transition={{ y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.6, delay: 0.15 } }}
            >
              {/* Cast shadow — grounds the envelope so it reads as a
                  real object, not a wireframe. */}
              <div
                aria-hidden
                style={{
                  position: 'absolute', left: '50%', bottom: -16, width: 244, height: 30,
                  transform: 'translateX(-50%)', borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(14,13,11,0.26), transparent 72%)',
                  filter: 'blur(7px)', opacity: 0.5,
                }}
              />

              {/* Envelope body — the back panel + the two lower front
                  flaps meeting at the centre seam. Paper gradient,
                  gold edge. */}
              <svg viewBox="0 0 300 206" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <defs>
                  <linearGradient id="pl-env-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={bodyTop} />
                    <stop offset="1" stopColor={bodyBottom} />
                  </linearGradient>
                  <linearGradient id="pl-env-flap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={shade(card, 0.05)} />
                    <stop offset="1" stopColor={flapBottom} />
                  </linearGradient>
                </defs>
                {/* body */}
                <rect x="14" y="44" width="272" height="150" rx="9" fill="url(#pl-env-body)" stroke={gold} strokeWidth="1.25" />
                {/* the two lower front flaps rising to the centre seam */}
                <path d="M 14 194 L 150 126 L 286 194" fill="none" stroke={line} strokeWidth="1" />
              </svg>

              {/* Addressed to the guest — on the lower front face,
                  below the flap point. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: 26,
                  textAlign: 'center',
                  fontFamily: fontDisplay, fontStyle: 'italic',
                  fontSize: '1.12rem', color: ink,
                }}
              >
                For {guestFirst ?? 'you'}
              </motion.div>

              {/* The flap — folded DOWN over the top, its point at the
                  centre where the wax seal presses. Hinged along the
                  top edge; lifts up and back as the seal breaks. */}
              <motion.svg
                viewBox="0 0 300 206"
                width="100%"
                height="100%"
                style={{ position: 'absolute', inset: 0, transformOrigin: '50% 21.4%', overflow: 'visible' }}
                initial={false}
                animate={opening ? { rotateX: -158 } : { rotateX: 0 }}
                transition={{ duration: 0.85, ease: EASE }}
              >
                <path d="M 14 44 L 286 44 L 150 128 Z" fill="url(#pl-env-flap)" stroke={gold} strokeWidth="1.25" strokeLinejoin="round" />
                {/* hairline liner just inside the flap edges */}
                <path d="M 36 50 L 150 120 L 264 50" fill="none" stroke={accent} strokeOpacity="0.22" strokeWidth="1" />
              </motion.svg>

              {/* The seal medallion. Presses (a small pulse) the
                  moment the page beneath is ready. */}
              <motion.div
                style={{ position: 'absolute', left: '50%', top: 128, marginLeft: -42, marginTop: -42 }}
                initial={false}
                animate={
                  opening
                    ? { scale: 1.18, opacity: 0 }
                    : ready
                      ? { scale: [1, 0.93, 1], opacity: 1 }
                      : { scale: 1, opacity: 1 }
                }
                transition={opening ? { duration: 0.45, ease: EASE } : { duration: 0.5, ease: EASE }}
              >
                <div style={{ position: 'relative', width: 84, height: 84 }}>
                  <svg viewBox="0 0 84 84" width="84" height="84" style={{ display: 'block', filter: 'drop-shadow(0 2px 5px rgba(14,13,11,0.16))' }}>
                    {/* cream wafer + gold hairline rings + a gold pearl at the crown */}
                    <circle cx="42" cy="42" r="38" fill={sealFace} stroke={gold} strokeWidth="1" />
                    <circle cx="42" cy="42" r="32.5" fill="none" stroke={gold} strokeOpacity="0.5" strokeWidth="0.75" />
                    <circle cx="42" cy="6.5" r="2.4" fill={gold} />
                    {/* monogram pressed into the paper: a light ghost below the inked glyph */}
                    <text x="42" y={initB ? 50.4 : 52} textAnchor="middle" fill={sealGhost}
                      fontSize={initB ? 23 : 32} fontStyle="italic" fontWeight={600}
                      style={{ fontFamily: fontDisplay }}>
                      {initB ? `${initA} & ${initB}` : initA}
                    </text>
                    <text x="42" y={initB ? 49.6 : 51.2} textAnchor="middle" fill={accentInk}
                      fontSize={initB ? 23 : 32} fontStyle="italic" fontWeight={600}
                      style={{ fontFamily: fontDisplay }}>
                      {initB ? `${initA} & ${initB}` : initA}
                    </text>
                  </svg>
                </div>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                fontFamily: fontDisplay, fontStyle: 'italic',
                fontSize: '0.95rem', color: inkSoft, margin: 0,
                minHeight: '1.4em',
              }}
            >
              {ready ? 'Tap to break the seal' : 'Threading…'}
            </motion.p>
          </motion.div>

          {/* Screen-reader affordance — the visual stage is decorative. */}
          <button
            type="button"
            onClick={open}
            style={{
              position: 'absolute', width: 1, height: 1, overflow: 'hidden',
              clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', border: 0, padding: 0,
            }}
          >
            Open the invitation
          </button>
        </div>
      )}

      {/* RSVP hand-off — the envelope's parting gift. */}
      <AnimatePresence>
        {showPill && (
          <motion.a
            key="arrival-rsvp"
            href="#rsvp"
            onClick={() => setShowPill(false)}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
            style={{
              position: 'fixed',
              bottom: 'calc(clamp(16px, 3vw, 28px) + env(safe-area-inset-bottom, 0px))',
              right: 'clamp(16px, 3vw, 28px)',
              zIndex: 150,
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '13px 20px', minHeight: 44,
              borderRadius: 'var(--pl-radius-full, 100px)',
              background: theme['--t-rsvp'] ?? accent,
              color: theme['--t-rsvp-ink'] ?? paper,
              textDecoration: 'none',
              fontFamily: mono, fontSize: '0.78rem',
              letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700,
              boxShadow: '0 14px 32px rgba(14,13,11,0.28), 0 2px 6px rgba(14,13,11,0.16)',
            }}
          >
            {rsvpLabel}
            {replyBy && (
              <span style={{ fontWeight: 500, opacity: 0.85, letterSpacing: '0.1em', textTransform: 'none', fontFamily: fontBody, fontSize: '0.74rem' }}>
                by {formatReplyBy(replyBy)}
              </span>
            )}
          </motion.a>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Shared bits ─────────────────────────────────────────────── */

function Grain() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(14,13,11,0.028) 1px, transparent 1px)',
        backgroundSize: '3px 3px',
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }}
    />
  );
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

function useEscapeTo(fn: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') fn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
