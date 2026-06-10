'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/(shell)/templates/TemplateVignette.tsx
//
// One themed-site vignette rendered inside a template card.
// Mirrors the prototype's `<TemplateVignette t={t}/>` precisely:
// real CSS theme scope (--t-* vars from the Pack), real
// procedural texture pseudo-element (pearloom.css §── Texture),
// real motif glyphs in the upper corners, eyebrow keyed to the
// site's STORY shape (not its palette).
//
// This is not a screenshot. It's the same engine the published
// site renders with — just stamped into a small frame.
// ─────────────────────────────────────────────────────────────

import type { CSSProperties } from 'react';
import type { Pack } from '@/lib/theme-store/packs';
import { dividerForMotif } from '@/components/pearloom/store/utils';

/**
 * Story-shape categories used by the templates browser. These
 * are PURE BROWSE-TIME labels — they do not (yet) flow into
 * the manifest. The wizard / editor will read the chosen pack's
 * `themeRef` + `kit` exactly as the Theme Store passes them in.
 */
export type OccasionGroup =
  | 'wedding'
  | 'milestone'
  | 'gathering'
  | 'memorial'
  | 'travel'
  | 'soft';

/**
 * The eyebrow line above the names in the vignette. Each
 * category gets its own copy so a memorial tile reads as "In
 * loving memory" instead of "Save the date".
 */
const EYEBROW: Record<OccasionGroup, string> = {
  wedding: 'Save the date',
  milestone: 'Celebrating',
  gathering: 'Come gather',
  memorial: 'In loving memory',
  travel: 'The trip',
  soft: "You're invited",
};

/**
 * Sample couple / honoree names per category — keeps each
 * vignette feeling like a real preview rather than "Pack 42".
 * Memorial uses a single name; gatherings use a destination,
 * everyone else uses a 2-name pair.
 */
const SAMPLE_TEXT: Record<OccasionGroup, { primary: string; sub: string }> = {
  wedding: { primary: 'Ava & Liam', sub: '26 April 2027' },
  milestone: { primary: 'Margaret · Eighty', sub: '12 October 2026' },
  gathering: { primary: 'Cabin Weekend', sub: 'Lake Tahoe' },
  memorial: { primary: 'Arthur Bell', sub: '1934 – 2026' },
  travel: { primary: 'Tuscany 2027', sub: 'A long lunch' },
  soft: { primary: 'New Apartment', sub: 'Saturday at six' },
};

interface MiniDividerProps {
  look: 'sprig' | 'brush' | 'dot' | 'rule';
  width: number;
}

function MiniDivider({ look, width }: MiniDividerProps) {
  const stroke = 'var(--t-accent-ink, var(--t-ink, #2A2A28))';
  const gold = 'var(--t-gold, #C19A4B)';
  if (look === 'sprig') {
    return (
      <svg width={width} height={12} viewBox={`0 0 ${width} 12`} aria-hidden="true">
        <line x1="0" y1="6" x2={width} y2="6" stroke={stroke} strokeWidth="1" />
        <circle cx={width / 2} cy="6" r="2.6" fill={gold} />
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
        <circle cx={width / 2} cy="3" r="1.6" fill={gold} />
        <circle cx={width / 2 + 14} cy="3" r="1.4" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg width={width} height={2} viewBox={`0 0 ${width} 2`} aria-hidden="true">
      <line x1="0" y1="1" x2={width} y2="1" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

interface TemplateVignetteProps {
  pack: Pack;
  cat: OccasionGroup;
  displayName: string;
}

export function TemplateVignette({ pack, cat, displayName }: TemplateVignetteProps) {
  const eyebrow = EYEBROW[cat];
  const sample = SAMPLE_TEXT[cat];
  const divider = dividerForMotif(pack.motif);
  const isSansDisplay = /Inter|Space|DM Sans|Tenor/i.test(pack.themeRef['--t-display'] ?? '');
  const isMemorial = cat === 'memorial';
  const isSinglePrimary = cat !== 'wedding';

  // Stamp the pack's full --t-* var set onto the scope so the
  // shared pearloom.css texture + pattern pseudo-elements paint
  // the right paper / accent without bringing in any pack-
  // specific styling. Same trick the published-site renderer
  // uses on .pl8-guest.
  const scopeStyle: CSSProperties = {
    ...(pack.themeRef as unknown as CSSProperties),
    position: 'absolute',
    inset: 0,
    background: 'var(--t-section, var(--t-paper))',
    color: 'var(--t-ink)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '22px 20px',
    overflow: 'hidden',
  };

  return (
    <div
      className="pl8-guest pl8-store-preview"
      data-pl-texture={pack.texture}
      data-pl-pattern={pack.pattern}
      data-pl-kit={pack.kit}
      data-pl-density="comfortable"
      style={scopeStyle}
    >
      {/* PatternLayer — sits behind the content, painted by the
          shared CSS in pearloom.css §── PatternLayer ──. */}
      <div className="pl8-pattern-layer" data-pl-pattern={pack.pattern} aria-hidden="true" />

      {/* Inner content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 'var(--t-eyebrow-ls, 0.2em)',
            textTransform: 'uppercase',
            color: 'var(--t-accent-ink, var(--t-ink))',
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'var(--t-display)',
            fontWeight: 'var(--t-display-wght, 600)' as unknown as number,
            fontSize: 28,
            lineHeight: 1.0,
            color: 'var(--t-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {isSinglePrimary ? (
            sample.primary
          ) : (
            <>
              {sample.primary.split(' & ')[0]}
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
              {sample.primary.split(' & ')[1]}
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '11px 0' }}>
          <MiniDivider look={divider} width={120} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--t-ink-soft)',
            letterSpacing: '0.04em',
          }}
        >
          {sample.sub}
        </div>

        {/* Editorial footer — pack name in tiny mono so the host
            sees what theme the vignette was painted with. */}
        <div
          style={{
            marginTop: 18,
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--t-ink-muted)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily:
              'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
          }}
        >
          {pack.name}
        </div>
      </div>

      {/* Memorial overlay — a soft top-down feather that calms the
          card. Skipped for any other category. */}
      {isMemorial && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, var(--t-paper) 0%, transparent 35%, transparent 65%, var(--t-paper) 100%)',
            opacity: 0.55,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
    </div>
  );
}
