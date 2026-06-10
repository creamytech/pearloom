'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/PackPreview.tsx
//
// Live themed vignette for a Pack. Renders a real `.pl8-guest`
// scope so the production TextureLayer (CSS) and PatternLayer
// (CSS pseudo-elements) + per-kit overrides all kick in — no
// mockups, no static thumbnails.
//
// Layout (verbatim port of the prototype's PackPreview):
//   • Eyebrow "Save the Date"
//   • Couple names in pack.themeRef['--t-display'] at hero scale
//   • Motif-keyed mini divider (sprig / brush / dot / rule)
//   • Date + location line
//   • Rich mode adds the prototype's RSVP + Our-story button pair
//
// The vignette is drop-in usable wherever you need a tiny
// themed surface: pack cards, the QuickLook hero, cart-drawer
// thumbnails — same component, just different `height` /
// `rich` flags.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';
import type { Pack } from '@/lib/theme-store/packs';
import { SAMPLE_NAMES, dividerForMotif, type DividerStyle } from './utils';

interface PackPreviewProps {
  pack: Pack;
  /** Pixel height of the vignette. Defaults to 188 — the prototype's card thumbnail height. */
  height?: number;
  /** Richer typography + RSVP/Our-story buttons. Used by the QuickLook hero. */
  rich?: boolean;
  /** Index into SAMPLE_NAMES so a grid of cards shows varied couples. */
  nameIdx?: number;
  /** Optional class override for the outer .pl8-guest scope. */
  className?: string;
}

/**
 * Render a tiny divider hairline keyed off motif. Mirrors the
 * prototype's <TDivider look=…> primitive without bringing the
 * whole component over — bigger section dividers on the live
 * site are handled by EditionDivider.
 */
function MiniDivider({ look, width }: { look: DividerStyle; width: number }) {
  const stroke = 'var(--t-accent-ink, var(--t-ink, #2A2A28))';
  if (look === 'sprig') {
    return (
      <svg width={width} height={12} viewBox={`0 0 ${width} 12`} aria-hidden="true">
        <line x1="0" y1="6" x2={width} y2="6" stroke={stroke} strokeWidth="1" />
        <circle cx={width / 2} cy="6" r="2.6" fill="var(--t-gold, #C19A4B)" />
      </svg>
    );
  }
  if (look === 'brush') {
    return (
      <svg width={width} height={10} viewBox={`0 0 ${width} 10`} aria-hidden="true">
        <path
          d={`M2 5 Q ${width * 0.35} 1 ${width * 0.5} 5 T ${width - 2} 5`}
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (look === 'dot') {
    return (
      <svg width={width} height={6} viewBox={`0 0 ${width} 6`} aria-hidden="true">
        <circle cx={width / 2 - 14} cy="3" r="1.4" fill={stroke} />
        <circle cx={width / 2} cy="3" r="1.6" fill="var(--t-gold, #C19A4B)" />
        <circle cx={width / 2 + 14} cy="3" r="1.4" fill={stroke} />
      </svg>
    );
  }
  // 'rule' default
  return (
    <svg width={width} height={2} viewBox={`0 0 ${width} 2`} aria-hidden="true">
      <line x1="0" y1="1" x2={width} y2="1" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

export function PackPreview({ pack, height = 188, rich = false, nameIdx = 0, className }: PackPreviewProps) {
  const [a, b] = SAMPLE_NAMES[nameIdx % SAMPLE_NAMES.length];
  const divider = dividerForMotif(pack.motif);
  // Detect when the display font is a sans (Inter / Space Grotesk
  // / DM Sans / Tenor) so the ampersand stays upright. The
  // prototype's check is more limited; we expand it slightly.
  const displayFamily = pack.themeRef['--t-display'] ?? '';
  const isSansDisplay = /Inter|Space|DM Sans|Tenor/i.test(displayFamily);

  // Stamp every --t-* var on the scope so the inherited CSS
  // (pearloom.css textures + per-kit overrides) reads its colors
  // + fonts from this pack rather than the page chrome.
  const scopeStyle: CSSProperties = {
    ...(pack.themeRef as unknown as CSSProperties),
    position: 'relative',
    height,
    overflow: 'hidden',
    background: 'var(--t-section, var(--t-paper))',
    color: 'var(--t-ink)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: rich ? '34px 28px' : '22px 20px',
  };

  return (
    <div
      className={`pl8-guest pl8-store-preview${className ? ` ${className}` : ''}`}
      data-pl-texture={pack.texture}
      data-pl-pattern={pack.pattern}
      data-pl-kit={pack.kit}
      data-pl-density="comfortable"
      style={scopeStyle}
    >
      {/* PatternLayer — sits behind content via pearloom.css §── PatternLayer ── */}
      <div className="pl8-pattern-layer" data-pl-pattern={pack.pattern} aria-hidden="true" />

      {/* Inner content — z-index 2 so it sits above pattern + texture pseudo-elements. */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 'var(--t-eyebrow-ls, 0.18em)',
            textTransform: 'uppercase',
            color: 'var(--t-accent-ink, var(--t-ink))',
            marginBottom: 8,
          }}
        >
          Save the Date
        </div>
        <div
          style={{
            fontFamily: 'var(--t-display)',
            fontWeight: 'var(--t-display-wght, 600)' as unknown as number,
            fontSize: rich ? 46 : 34,
            lineHeight: 0.98,
            color: 'var(--t-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {a}
          <span
            style={{
              fontStyle: isSansDisplay ? 'normal' : 'italic',
              fontSize: '0.62em',
              color: 'var(--t-ink-soft)',
              margin: '0 0.16em',
              fontWeight: 400,
            }}
          >
            &amp;
          </span>
          {b}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: rich ? '14px 0' : '10px 0' }}>
          <MiniDivider look={divider} width={rich ? 150 : 120} />
        </div>
        <div style={{ fontSize: rich ? 12.5 : 11, color: 'var(--t-ink-soft)', letterSpacing: '0.04em' }}>
          26 · 04 · 2027 &nbsp;·&nbsp; Santorini
        </div>
        {rich && (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              tabIndex={-1}
              style={{
                fontSize: 11,
                padding: '8px 16px',
                borderRadius: 'var(--t-radius, 8px)',
                background: 'var(--t-rsvp, var(--t-ink))',
                color: 'var(--t-rsvp-ink, var(--t-paper))',
                border: 'none',
                fontWeight: 600,
                cursor: 'default',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              RSVP
            </button>
            <button
              type="button"
              tabIndex={-1}
              style={{
                fontSize: 11,
                padding: '8px 16px',
                borderRadius: 'var(--t-radius, 8px)',
                background: 'transparent',
                color: 'var(--t-ink)',
                border: '1px solid var(--t-line, rgba(0,0,0,0.16))',
                fontWeight: 600,
                cursor: 'default',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Our story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
