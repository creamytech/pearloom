'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / marketing/SiteShowroom.tsx
//
// The Pearloom showroom — a horizontal paper-shelf of real
// sites that anyone can build today, one per occasion. The
// brand thesis is "we don't ship templates, we weave bespoke
// artifacts" — so every card here is a real Pearloom theme
// rendering with realistic copy. Click → opens the same
// template through the dashboard personalize flow, so the
// visitor can immediately make it theirs.
//
// UX patterns:
//   • scroll-snap shelf (no autoplay carousels)
//   • edge-fade mask (uses the .pl-edge-fade utility)
//   • desktop arrow buttons + keyboard ←/→
//   • final card is the "begin yours" CTA
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { SITE_TEMPLATES } from '@/lib/templates/wedding-templates';
import { Folio } from '@/components/brand/Folio';
import { Thread } from '@/components/brand/Thread';

interface SiteShowroomProps {
  /** Open the marketing auth modal so non-signed-in visitors don't bounce. */
  onGetStarted?: () => void;
}

// Curated showroom — six occasions, each one tied to a real
// Pearloom template the visitor can apply in one click.
interface ShowroomEntry {
  occasion: string;        // human label (mono, uppercase)
  templateId: string;      // existing SiteTemplate.id
  names: string;           // "Emma & James"
  detailLine: string;      // "October 12 · Hudson Valley"
  blurb: string;           // one-line description shown on the card back
}

const SHOWROOM: ShowroomEntry[] = [
  {
    occasion: 'Wedding',
    templateId: 'ethereal-garden',
    names: 'Emma & James',
    detailLine: 'October 12 · Hudson Valley',
    blurb: 'A garden ceremony with sage hairlines and a botanical RSVP.',
  },
  {
    occasion: 'Anniversary',
    templateId: 'golden-hour',
    names: 'Priya & Sam',
    detailLine: 'Five years · A Sunday in June',
    blurb: 'A thank-you letter the year stretched into a small site.',
  },
  {
    occasion: 'Birthday',
    templateId: 'martini-hour',
    names: 'Liam at Forty',
    detailLine: 'A late dinner · The bar at the Hoxton',
    blurb: 'Cocktails-only invitation with the night written like a menu.',
  },
  {
    occasion: 'Engagement',
    templateId: 'art-deco-glamour',
    names: 'Ava & Theo',
    detailLine: 'New Year\u2019s Eve · The Rainbow Room',
    blurb: 'A midnight announcement done in gilt geometry.',
  },
  {
    occasion: 'Memorial',
    templateId: 'rustic-romance',
    names: 'For Margaret',
    detailLine: '1942\u20132025 · A gathering by the lake',
    blurb: 'Stories collected from family, set quietly in cream and oak.',
  },
  {
    occasion: 'Reunion',
    templateId: 'tuscan-villa',
    names: 'The Marshes, twenty years on',
    detailLine: 'A long weekend in Sorrento',
    blurb: 'Itinerary, rooms, dinners — the whole trip in one place.',
  },
];

export function SiteShowroom({ onGetStarted }: SiteShowroomProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Compute the visible card by reading the rail's scrollLeft.
  const onRailScroll = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-showroom-card]'));
    if (cards.length === 0) return;
    const railLeft = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    let nearestDist = Infinity;
    cards.forEach((c, i) => {
      const center = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(center - railLeft);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setActiveIdx(nearest);
  }, []);

  const scrollByDir = useCallback((dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-showroom-card]');
    const stride = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: stride * dir, behavior: 'smooth' });
  }, []);

  // Keyboard nav when the rail is focus-within.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!el.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByDir(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByDir(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scrollByDir]);

  return (
    <section
      id="showroom"
      style={{
        position: 'relative',
        padding: 'clamp(72px, 10vh, 128px) 0 clamp(72px, 10vh, 128px)',
        background: 'var(--pl-cream)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header row ─────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 64px) 36px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <Folio kicker="The showroom" no={2} label="Real sites" size="sm" />
          <h2
            className="pl-letterpress"
            style={{
              margin: '20px 0 12px',
              fontFamily: 'var(--pl-font-display)',
              fontSize: 'clamp(2rem, 4.6vw, 3.2rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              color: 'var(--pl-ink)',
              fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 0',
            }}
          >
            Six sites Pearloom can{' '}
            <em
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                color: 'var(--pl-olive)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              weave for you
            </em>
            , today.
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontSize: 'clamp(1rem, 1.4vw, 1.1rem)',
              lineHeight: 1.55,
              color: 'var(--pl-ink-soft)',
              maxWidth: '52ch',
            }}
          >
            Not a template gallery — a showroom of one-of-one sites you can open, walk through,
            and apply with your own names in one tap.
          </p>
        </div>

        {/* Desktop arrow controls */}
        <div className="pl-showroom-arrows" style={{ display: 'flex', gap: 8 }}>
          <ShelfArrow direction="prev" onClick={() => scrollByDir(-1)} disabled={activeIdx === 0} />
          <ShelfArrow direction="next" onClick={() => scrollByDir(1)} disabled={activeIdx >= SHOWROOM.length} />
        </div>
      </div>

      {/* ── The shelf ──────────────────────────────────────────── */}
      <div className="pl-edge-fade" style={{ position: 'relative' }}>
        <div
          ref={railRef}
          onScroll={onRailScroll}
          aria-label="Pearloom site showroom"
          tabIndex={0}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 24,
            padding: '12px clamp(20px, 5vw, 64px) 28px',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollPaddingInline: 'clamp(20px, 5vw, 64px)',
            scrollbarWidth: 'none',
            outline: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {SHOWROOM.map((entry, i) => (
            <ShowroomCard key={entry.templateId} entry={entry} index={i} />
          ))}
          <BeginYoursCard onGetStarted={onGetStarted} />
        </div>

        {/* Hide native scrollbar */}
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
          @media (max-width: 720px) {
            :global(.pl-showroom-arrows) { display: none !important; }
          }
        `}</style>
      </div>

      {/* ── Pagination dots ───────────────────────────────────── */}
      <div
        role="presentation"
        style={{
          marginTop: 22,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {SHOWROOM.concat([{ occasion: 'Yours', templateId: '_yours', names: '', detailLine: '', blurb: '' }]).map((_, i) => (
          <span
            key={i}
            style={{
              width: i === activeIdx ? 18 : 6,
              height: 4,
              borderRadius: 'var(--pl-radius-full)',
              background: i === activeIdx ? 'var(--pl-olive)' : 'var(--pl-divider)',
              transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        ))}
      </div>
    </section>
  );
}

// ── Card ────────────────────────────────────────────────────────

function ShowroomCard({ entry, index }: { entry: ShowroomEntry; index: number }) {
  const template = SITE_TEMPLATES.find((t) => t.id === entry.templateId);
  const accent = template?.theme.colors.accent ?? 'var(--pl-olive)';
  const bg = template?.theme.colors.background ?? 'var(--pl-cream-card)';
  const fg = template?.theme.colors.foreground ?? 'var(--pl-ink)';
  const muted = template?.theme.colors.muted ?? 'var(--pl-muted)';
  const heading = template?.theme.fonts.heading ?? 'Fraunces';
  const [hovered, setHovered] = useState(false);

  return (
    <motion.article
      data-showroom-card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 4) * 0.06 }}
      style={{
        flex: '0 0 clamp(280px, 86vw, 360px)',
        scrollSnapAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-2xl)',
        boxShadow: hovered
          ? '0 26px 52px -14px color-mix(in oklab, var(--pl-ink) 30%, transparent)'
          : 'var(--pl-shadow-md)',
        transition: 'box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Mini-site preview — uses the template's actual theme colors */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '5 / 6',
          background: template?.previewGradient ?? bg,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: fg,
          overflow: 'hidden',
        }}
      >
        {/* Hover overlay — conic sweep in the template's own
            accent colour so each card feels individually alive
            when the cursor lands on it. Inset is expanded so
            the rotation never exposes the container edges. */}
        <motion.div
          aria-hidden
          animate={{ opacity: hovered ? 0.6 : 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            inset: '-35%',
            pointerEvents: 'none',
            background: `conic-gradient(from 0deg at 50% 50%, ${accent}00 0%, ${accent}88 28%, ${accent}00 52%, ${accent}55 78%, ${accent}00 100%)`,
            mixBlendMode: 'overlay',
            animation: 'pl-conic-spin 10s linear infinite',
            willChange: 'opacity, transform',
          }}
        />

        {/* Pearl bead orbit — only while hovered. A subtle extra
            beat of motion that reads as "this site is awake." */}
        {hovered && (
          <svg
            aria-hidden
            viewBox="0 0 100 120"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            <circle r="1.2" fill="var(--pl-pearl-a)" opacity="0.92">
              <animateMotion
                dur="4.2s"
                repeatCount="indefinite"
                path="M 14 22 Q 90 32 88 92 T 12 102 Q 6 60 14 22"
              />
            </circle>
          </svg>
        )}

        {/* Top folio */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.54rem',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: muted,
          }}
        >
          <span style={{ width: 14, height: 1, background: accent }} />
          <span>{entry.occasion} · No. {String(index + 1).padStart(2, '0')}</span>
        </div>

        {/* Hero name */}
        <div>
          <div
            style={{
              fontFamily: `'${heading}', 'Fraunces', Georgia, serif`,
              fontStyle: 'italic',
              fontSize: 'clamp(1.85rem, 5vw, 2.4rem)',
              lineHeight: 1.02,
              color: fg,
              letterSpacing: '-0.02em',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              maxWidth: '15ch',
            }}
          >
            {entry.names}
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.86rem',
              color: muted,
              lineHeight: 1.4,
            }}
          >
            {entry.detailLine}
          </div>
        </div>

        {/* Mock site rails — gives the card visible "site-ness" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Story', 'RSVP', 'Photos', 'FAQ'].map((label) => (
              <span
                key={label}
                style={{
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.5rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: muted,
                  padding: '4px 6px',
                  border: `1px solid ${accent}33`,
                  borderRadius: 'var(--pl-radius-xs)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <Thread variant="weave" width="100%" height={8} weight={0.8} color={accent} color2={`${accent}66`} ariaHidden style={{ opacity: 0.7 }} />
        </div>
      </div>

      {/* Card meta + CTA */}
      <div
        style={{
          padding: '18px 22px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--pl-cream-card)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--pl-font-display)',
            fontStyle: 'italic',
            fontSize: '0.96rem',
            lineHeight: 1.45,
            color: 'var(--pl-ink-soft)',
            fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0',
          }}
        >
          {entry.blurb}
        </p>
        <Link
          href={`/dashboard?template=${entry.templateId}`}
          className={hovered ? 'pl-pearl-border' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 'var(--pl-radius-md)',
            border: hovered ? undefined : '1px solid var(--pl-ink)',
            background: hovered ? undefined : 'var(--pl-ink)',
            color: hovered ? 'var(--pl-ink)' : 'var(--pl-cream)',
            textDecoration: 'none',
            fontSize: '0.84rem',
            fontWeight: 600,
            letterSpacing: '-0.005em',
            transition:
              'background 220ms ease, color 220ms ease, transform 160ms var(--pl-ease-spring), box-shadow 280ms var(--pl-ease-out)',
          }}
        >
          Open the site
          <ArrowRight size={14} />
        </Link>
      </div>
    </motion.article>
  );
}

// ── "Begin yours" trailing card ─────────────────────────────────

function BeginYoursCard({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <motion.article
      data-showroom-card
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.36 }}
      style={{
        flex: '0 0 clamp(280px, 86vw, 360px)',
        scrollSnapAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-ink)',
        border: '1px solid var(--pl-ink)',
        borderRadius: 'var(--pl-radius-2xl)',
        boxShadow: 'var(--pl-shadow-lg)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '5 / 6',
          background:
            'radial-gradient(ellipse at 30% 30%, color-mix(in oklab, var(--pl-gold) 26%, transparent) 0%, transparent 60%), var(--pl-ink)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'var(--pl-cream)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.54rem',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            color: 'var(--pl-gold)',
          }}
        >
          <span style={{ width: 14, height: 1, background: 'var(--pl-gold)' }} />
          <span>Yours · No. 07</span>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--pl-font-display)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.85rem, 5vw, 2.4rem)',
              lineHeight: 1.02,
              color: 'var(--pl-cream)',
              letterSpacing: '-0.02em',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              maxWidth: '15ch',
            }}
          >
            Your names, set on warm paper.
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--pl-font-body)',
              fontSize: '0.86rem',
              color: 'color-mix(in oklab, var(--pl-cream) 65%, transparent)',
              lineHeight: 1.5,
              maxWidth: '28ch',
            }}
          >
            Three quiet questions. Pear bastes the rest in. You take the pen from there.
          </div>
        </div>

        <Thread
          variant="weave"
          width="100%"
          height={10}
          weight={1}
          color="var(--pl-gold)"
          color2="color-mix(in oklab, var(--pl-cream) 35%, transparent)"
          ariaHidden
        />
      </div>

      <div style={{ padding: '18px 22px 22px', background: 'var(--pl-ink)' }}>
        <button
          onClick={onGetStarted}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 'var(--pl-radius-md)',
            border: 'none',
            background: 'var(--pl-gold)',
            color: 'var(--pl-ink)',
            cursor: 'pointer',
            fontSize: '0.84rem',
            fontWeight: 700,
            letterSpacing: '-0.005em',
            transition: 'transform var(--pl-dur-fast) var(--pl-ease-spring), box-shadow var(--pl-dur-base) var(--pl-ease-out)',
            boxShadow: '0 4px 24px color-mix(in oklab, var(--pl-gold) 30%, transparent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Plus size={14} strokeWidth={2.5} /> Begin a thread
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.article>
  );
}

// ── Arrow control ───────────────────────────────────────────────

function ShelfArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous site' : 'Next site'}
      style={{
        width: 44,
        height: 44,
        borderRadius: 'var(--pl-radius-full)',
        border: '1px solid var(--pl-divider)',
        background: 'var(--pl-cream-card)',
        color: 'var(--pl-ink)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'transform var(--pl-dur-fast) var(--pl-ease-spring), background var(--pl-dur-base) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.background = 'var(--pl-olive-mist)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'var(--pl-cream-card)';
      }}
    >
      {direction === 'prev' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}
