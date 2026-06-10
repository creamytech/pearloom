'use client';
/* eslint-disable no-restricted-syntax */
/* Five desktop nav variant components for the canvas. ThemedSite
   dispatches between these (and the mobile drawer variants) based on
   the host's pick + viewport. Each variant takes the same NavProps
   shape, so the dispatch site is a one-line switch.

   Activation behaviour: when an item's id matches activeId, that link
   gets var(--t-accent-ink) + a 1px gold underline. Sticky behaviour:
   when props.sticky is true, the outer chrome is position:sticky top:0
   with a saturated paper backdrop. */

import type { CSSProperties, MouseEvent } from 'react';
import { Pear } from '../../motifs';
import { Monogram, deriveInitials, type MonogramFrame } from '../../site/Monogram';

export interface NavProps {
  headline: string;
  navItems: { id: string; label: string }[];
  cta: string;
  onNavClick: (id: string) => void;
  onCtaClick: () => void;
  activeId: string | null;
  sticky?: boolean;
  /** When set, renders the host's Decor-Library monogram in
   *  place of the Pear glyph. Falls through to Pear when undefined.
   *  Source: manifest.monogram. `solo` marks a single-honoree site
   *  so the headline-derived fallback crests one initial. */
  monogram?: { initials?: string; frame?: MonogramFrame; solo?: boolean };
}

/* NavLogo — renders the host's monogram when configured, the Pear
   glyph otherwise. Sized to fit inside the nav strip's height.

   Activation logic: if the host has touched monogram at all
   (typed initials OR picked a frame other than `none`/undefined),
   we render the monogram. Initials fall through to a derivation
   from the headline ("Scott & Shauna" → "S&S") so the host doesn't
   have to fill in two fields just to see their monogram in the
   nav. Pear remains the fallback when nothing's configured. */
function NavLogo({ monogram, headline, size = 26 }: { monogram?: NavProps['monogram']; headline?: string; size?: number }) {
  const typed = monogram?.initials?.trim();
  const hasFrame = monogram?.frame && monogram.frame !== 'none';
  const wantsMonogram = !!typed || !!hasFrame;
  if (wantsMonogram) {
    let initials = typed;
    if (!initials) {
      /* Derive from headline. Falls back to "S&S" defaults when
         the headline is the canvas placeholder too. Solo honoree:
         one initial, never a phantom '& B'. */
      const { initA, initB } = deriveInitials(headline ?? '', { solo: monogram?.solo });
      initials = initB ? `${initA || 'A'} & ${initB}` : (initA || 'A');
    }
    return (
      <Monogram
        initials={initials}
        frame={(monogram?.frame ?? 'none') as MonogramFrame}
        size={size + 6}
        withCard={false}
        ariaHidden
      />
    );
  }
  return <Pear size={size} tone="sage" shadow={false} />;
}

/* ─── Shared style helpers ─────────────────────────────────────── */

function stickyStyle(sticky: boolean | undefined): CSSProperties {
  if (!sticky) return {};
  return {
    position: 'sticky',
    top: 0,
    zIndex: 'var(--z-sticky)',
    background: 'var(--t-paper)',
    backdropFilter: 'saturate(140%) blur(6px)',
    WebkitBackdropFilter: 'saturate(140%) blur(6px)',
  };
}

function linkStyle(active: boolean, base: CSSProperties): CSSProperties {
  return {
    ...base,
    color: active ? 'var(--t-accent-ink)' : (base.color as string),
    borderBottom: active ? '1px solid var(--t-gold)' : '1px solid transparent',
    paddingBottom: 2,
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'color var(--pl-dur-fast) var(--pl-ease-out)',
  };
}

function handleNav(
  e: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  id: string,
  onNavClick: (id: string) => void,
) {
  e.preventDefault();
  onNavClick(id);
}

/* ─── (a) NavCentered ──────────────────────────────────────────────
   Logo + headline centered on top row. Links flank in a second
   centered row. Compact pill CTA anchored to the right edge. */

export function NavCentered(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, sticky, monogram } = props;
  return (
    <nav
      style={{
        ...stickyStyle(sticky),
        padding: '18px 36px 14px',
        textAlign: 'center',
        borderBottom: '1px solid var(--t-line-soft)',
        background: 'var(--t-paper)',
        position: sticky ? 'sticky' : 'relative',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'center',
        }}
      >
        <NavLogo monogram={monogram} headline={headline} size={26} />
        <span
          style={{
            fontFamily: 'var(--t-display)',
            fontStyle: 'italic',
            fontSize: 22,
            color: 'var(--t-ink)',
            lineHeight: 1,
          }}
        >
          {headline}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 28,
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleNav(e, item.id, onNavClick)}
            style={linkStyle(activeId === item.id, {
              fontSize: 12.5,
              color: 'var(--t-ink-soft)',
              fontFamily: 'var(--t-body)',
            })}
          >
            {item.label}
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={onCtaClick}
        style={{
          position: 'absolute',
          right: 36,
          top: 18,
          padding: '8px 16px',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--t-accent-ink)',
          background: 'var(--t-accent-bg)',
          border: '1px solid var(--t-accent)',
          borderRadius: 'var(--t-radius)',
          cursor: 'pointer',
          fontFamily: 'var(--t-body)',
        }}
      >
        {cta}
      </button>
    </nav>
  );
}

/* ─── (b) NavSplit ────────────────────────────────────────────────
   The current default: logo + headline left, centered link rail
   (flex:1), CTA pill right. This is the layout the existing inline
   navEl uses, kept here as the fallback variant. */

export function NavSplit(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, sticky, monogram } = props;
  return (
    <nav
      style={{
        ...stickyStyle(sticky),
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '14px 32px',
        borderBottom: '1px solid var(--t-line-soft)',
        background: 'var(--t-paper)',
        position: sticky ? 'sticky' : 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <NavLogo monogram={monogram} headline={headline} size={24} />
        <span
          style={{
            fontFamily: 'var(--t-display)',
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--t-ink)',
            lineHeight: 1,
          }}
        >
          {headline}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleNav(e, item.id, onNavClick)}
            style={linkStyle(activeId === item.id, {
              fontSize: 12.5,
              color: 'var(--t-ink-soft)',
              fontFamily: 'var(--t-body)',
            })}
          >
            {item.label}
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={onCtaClick}
        style={{
          flexShrink: 0,
          padding: '9px 18px',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--t-accent-ink)',
          background: 'var(--t-accent-bg)',
          border: '1px solid var(--t-accent)',
          borderRadius: 'var(--t-radius)',
          cursor: 'pointer',
          fontFamily: 'var(--t-body)',
        }}
      >
        {cta}
      </button>
    </nav>
  );
}

/* ─── (c) NavSerifBlock ────────────────────────────────────────────
   Display-font block header. BIG italic headline up top, tiny mono
   uppercase link rail below. CTA is a transparent ghost button on
   the right. Heavier accent underline declares the section. */

export function NavSerifBlock(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, sticky, monogram } = props;
  return (
    <nav
      style={{
        ...stickyStyle(sticky),
        padding: '24px 40px',
        borderBottom: '2px solid var(--t-accent)',
        background: 'var(--t-paper)',
        position: sticky ? 'sticky' : 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <NavLogo monogram={monogram} headline={headline} size={30} />
        <span
          style={{
            fontFamily: 'var(--t-display)',
            fontStyle: 'italic',
            fontSize: 28,
            color: 'var(--t-ink)',
            lineHeight: 1,
          }}
        >
          {headline}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleNav(e, item.id, onNavClick)}
              style={linkStyle(activeId === item.id, {
                fontFamily: 'var(--t-mono)',
                fontSize: 10.5,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--t-ink-soft)',
              })}
            >
              {item.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={onCtaClick}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '6px 14px',
            fontFamily: 'var(--t-mono)',
            fontSize: 10.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: 'var(--t-accent)',
            background: 'transparent',
            border: '1px solid var(--t-accent)',
            borderRadius: 'var(--t-radius)',
            cursor: 'pointer',
          }}
        >
          {cta}
        </button>
      </div>
    </nav>
  );
}

/* ─── (d) NavMinimalText ───────────────────────────────────────────
   Pure text links centered. No Pear glyph, no headline, no pill.
   The RSVP CTA is rendered as the last link in the row (text-only
   "RSVP →") to preserve the affordance without breaking the visual
   minimalism. */

export function NavMinimalText(props: NavProps) {
  const { navItems, cta, onNavClick, onCtaClick, activeId, sticky } = props;
  return (
    <nav
      style={{
        ...stickyStyle(sticky),
        padding: '14px 32px',
        textAlign: 'center',
        borderBottom: '1px solid var(--t-line-soft)',
        background: 'var(--t-paper)',
        position: sticky ? 'sticky' : 'relative',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {navItems.map((item) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleNav(e, item.id, onNavClick)}
              style={linkStyle(active, {
                fontSize: 12,
                color: 'var(--t-ink-soft)',
                fontFamily: 'var(--t-body)',
              })}
            >
              {item.label}
            </a>
          );
        })}
        <button
          type="button"
          onClick={onCtaClick}
          style={{
            fontSize: 12,
            color: 'var(--t-accent-ink)',
            fontFamily: 'var(--t-body)',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            padding: '0 0 2px',
            borderBottom: '1px solid transparent',
            cursor: 'pointer',
          }}
        >
          {cta} →
        </button>
      </div>
    </nav>
  );
}

/* ─── (e) NavIconic ───────────────────────────────────────────────
   Pear glyph only (no headline text) on the left. Centre is a
   tightly-packed dot-separated link rail. Right is a small pill
   CTA. The iconic variant — works well when the headline lives
   inside the hero and the nav stays purely navigational. */

export function NavIconic(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, sticky, monogram } = props;
  return (
    <nav
      style={{
        ...stickyStyle(sticky),
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '14px 32px',
        borderBottom: '1px solid var(--t-line-soft)',
        background: 'var(--t-paper)',
        position: sticky ? 'sticky' : 'relative',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <NavLogo monogram={monogram} headline={headline} size={22} />
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 0,
          flexWrap: 'wrap',
        }}
      >
        {navItems.map((item, i) => (
          <span
            key={item.id}
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => handleNav(e, item.id, onNavClick)}
              style={linkStyle(activeId === item.id, {
                fontSize: 11.5,
                color: 'var(--t-ink-muted)',
                fontFamily: 'var(--t-body)',
              })}
            >
              {item.label}
            </a>
            {i < navItems.length - 1 && (
              <span
                aria-hidden
                style={{
                  margin: '0 10px',
                  color: 'var(--t-ink-muted)',
                  fontSize: 11.5,
                  opacity: 0.6,
                }}
              >
                ·
              </span>
            )}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onCtaClick}
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--t-accent-ink)',
          background: 'var(--t-accent-bg)',
          border: '1px solid var(--t-accent)',
          borderRadius: 'var(--t-radius)',
          cursor: 'pointer',
          fontFamily: 'var(--t-body)',
        }}
      >
        {cta}
      </button>
    </nav>
  );
}
