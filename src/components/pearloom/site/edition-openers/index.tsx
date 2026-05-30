'use client';

// ─────────────────────────────────────────────────────────────
// edition-openers — the small mark above each section title that
// gives an Edition its rhythm. Picked by the active Edition's
// `sectionOpener` field; mounted in SiteV8Renderer via
// EditionSectionOpener which dispatches by style id.
//
// Each opener receives the same loose interface so the renderer
// can drop them in interchangeably. Keep these PURE and small —
// they fire once per section, no state, no effects.
// ─────────────────────────────────────────────────────────────

import type { SectionOpenerStyle } from '@/lib/site-editions/types';

export interface OpenerProps {
  /** 1-indexed position of the section in the page. Almanac's
   *  chapter mark uses this for the roman numeral. */
  index: number;
  /** Section title text (the renderer's section name). */
  title: string;
  /** Optional kicker line — used by Cinema's slug-line. */
  kicker?: string;
}

// ── Almanac — Roman numeral + serif drop cap ────────────────
function ChapterMarkOpener({ index, title }: OpenerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        marginBottom: 18,
        fontFamily: 'var(--pl-font-display, Fraunces, Georgia, serif)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontStyle: 'italic',
          color: 'var(--peach-ink, #C6703D)',
          letterSpacing: '0.04em',
        }}
      >
        Chapter {toRoman(index)}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', fontFamily: 'inherit' }}>
        — {title}
      </span>
    </div>
  );
}

// ── Cinema — Black-bar SCENE 02 slug line ────────────────────
function SlugLineOpener({ index, title, kicker }: OpenerProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 22,
        padding: '6px 12px',
        background: 'var(--ink, #0E0D0B)',
        color: 'var(--cream, #FBF7EE)',
        fontFamily: 'var(--font-ui, Geist, system-ui, sans-serif)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
      }}
    >
      <span>Scene {String(index).padStart(2, '0')}</span>
      <span aria-hidden style={{ opacity: 0.4 }}>·</span>
      <span style={{ opacity: 0.85 }}>{kicker ?? title}</span>
    </div>
  );
}

// ── Postcard Box — Stamp + handwritten kicker ────────────────
function StampOpener({ index, title }: OpenerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 38,
          height: 38,
          border: '1px dashed var(--peach-ink, #C6703D)',
          color: 'var(--peach-ink, #C6703D)',
          fontFamily: 'var(--font-ui, Geist, system-ui, sans-serif)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transform: 'rotate(-6deg)',
        }}
      >
        № {index}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-script, "Caveat", cursive)',
          fontSize: 20,
          color: 'var(--ink-soft, #3A332C)',
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Linen Folder — Mono label with gold dot ──────────────────
function MonoLabelOpener({ title }: OpenerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 22,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'var(--gold, #B89244)',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-ui, Geist, system-ui, sans-serif)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft, #3A332C)',
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Quiet — Tiny overline, 10px 0.28em tracking ──────────────
function OverlineOpener({ title }: OpenerProps) {
  return (
    <div
      style={{
        marginBottom: 14,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-ui, Geist, system-ui, sans-serif)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, #6F6557)',
        }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Dispatcher ───────────────────────────────────────────────
const OPENERS: Record<SectionOpenerStyle, (props: OpenerProps) => React.ReactElement> = {
  'chapter-mark': ChapterMarkOpener,
  'slug-line': SlugLineOpener,
  stamp: StampOpener,
  'mono-label': MonoLabelOpener,
  overline: OverlineOpener,
};

export function EditionSectionOpener({
  style,
  ...props
}: OpenerProps & { style: SectionOpenerStyle }) {
  const Component = OPENERS[style] ?? OPENERS['chapter-mark'];
  return <Component {...props} />;
}

// ── Helpers ──────────────────────────────────────────────────
function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let rem = n;
  for (const [v, sym] of map) {
    while (rem >= v) { out += sym; rem -= v; }
  }
  return out || 'I';
}
