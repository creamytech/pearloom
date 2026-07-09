'use client';

/* ─── VariantThumb — the layout-variant schematic ────────────────
   A ~56×72 STATIC schematic per layout variant — hairline frames +
   thread + type-block glyphs in the chrome palette, NOT a live
   ThemedSite. Six archetypes cover every variant at thumbnail
   scale; full per-variant fidelity is deliberately not attempted.

   Born in the wizard's Sections chooser (2026-07-04); extracted
   2026-07-08 so the editor's on-canvas layout picker shows the SAME
   schematics — one visual language for "which layout is this"
   everywhere. Chrome tokens only (never a site's --t-* bag). */

type Archetype =
  | 'hero' | 'type' | 'list' | 'cards' | 'timeline' | 'grid'
  /* Chrome archetypes (LAY.2): the menu bar, the phone menu's four
     open shapes, and the footer's three sign-offs. */
  | 'nav-centered' | 'nav-split' | 'nav-block' | 'nav-minimal' | 'nav-iconic'
  | 'menu-overlay' | 'menu-slidein' | 'menu-sheet' | 'menu-pill'
  | 'footer-signature' | 'footer-columns' | 'footer-minimal';

/** Map a section+variant to the archetype schematic that evokes it. */
export function archetypeFor(section: string, variant: string): Archetype {
  /* Chrome sections carry bespoke drawings — a bar or a sheet can't
     be evoked by the content archetypes. */
  if (section === 'nav') {
    switch (variant) {
      case 'centered':     return 'nav-centered';
      case 'serif-block':  return 'nav-block';
      case 'minimal-text': return 'nav-minimal';
      case 'iconic':       return 'nav-iconic';
      case 'split':
      default:             return 'nav-split';
    }
  }
  if (section === 'navMobile') {
    switch (variant) {
      case 'overlay':      return 'menu-overlay';
      case 'bottom-sheet': return 'menu-sheet';
      case 'pill':         return 'menu-pill';
      case 'slide-in':
      default:             return 'menu-slidein';
    }
  }
  if (section === 'footer') {
    switch (variant) {
      case 'columns': return 'footer-columns';
      case 'minimal': return 'footer-minimal';
      case 'signature':
      default:        return 'footer-signature';
    }
  }
  if (section === 'hero') {
    // Photo-led heroes → the hero archetype; type-led → big type.
    return variant === 'minimal' || variant === 'typographic' || variant === 'crest'
      || variant === 'plate' || variant === 'cover'
      ? 'type'
      : 'hero';
  }
  if (section === 'gallery' || section === 'thenAndNow') return 'grid';
  // Vertical-rail layouts.
  if (['timeline', 'centerline', 'flow', 'stepper'].includes(variant)) return 'timeline';
  // Framed-card / tile / mosaic layouts.
  if (
    [
      'cards', 'tiles', 'bento', 'slots', 'pairs', 'frames', 'polaroid',
      'masonry', 'grid', 'wall', 'board', 'assignments', 'tickets', 'days',
      'split', 'postcard', 'twocol', 'storecards', 'chips', 'spread',
    ].includes(variant)
  ) {
    return 'cards';
  }
  // Everything else reads as a quiet ruled list at thumbnail scale.
  return 'list';
}

const THUMB_PAPER = 'var(--cream-2, #FBF7EE)';
const THUMB_LINE = 'var(--line, #E4DCCB)';
const THUMB_INK = 'var(--ink-soft, #55503F)';
const THUMB_ACCENT = 'var(--pl-olive, #5C6B3F)';
const THUMB_GOLD = 'var(--pl-gold, #C19A4B)';

function ThumbArt({ arch }: { arch: Archetype }) {
  // 56×72 viewBox, ~5px inset. Blocks are semi-opaque ink; the accent
  // marks the "live" element (photo / rail / lead line).
  const ink = (o: number) => ({ fill: THUMB_INK, opacity: o });
  switch (arch) {
    case 'hero':
      return (
        <>
          <rect x="6" y="6" width="44" height="30" rx="2" fill={THUMB_ACCENT} opacity={0.28} />
          <rect x="6" y="6" width="44" height="30" rx="2" fill="none" stroke={THUMB_LINE} strokeWidth="1" />
          <rect x="16" y="44" width="24" height="4" rx="2" {...ink(0.75)} />
          <rect x="20" y="52" width="16" height="3" rx="1.5" {...ink(0.4)} />
        </>
      );
    case 'type':
      return (
        <>
          <rect x="8" y="16" width="40" height="6" rx="3" {...ink(0.8)} />
          <rect x="8" y="27" width="34" height="6" rx="3" {...ink(0.6)} />
          <rect x="8" y="41" width="20" height="3.5" rx="1.75" fill={THUMB_GOLD} opacity={0.8} />
        </>
      );
    case 'list':
      return (
        <>
          {[14, 27, 40, 53].map((y) => (
            <g key={y}>
              <rect x="8" y={y} width="6" height="6" rx="1.5" fill={THUMB_ACCENT} opacity={0.55} />
              <rect x="18" y={y + 1} width="30" height="3.5" rx="1.75" {...ink(0.55)} />
            </g>
          ))}
        </>
      );
    case 'cards':
      return (
        <>
          {[
            [8, 12], [30, 12], [8, 40], [30, 40],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="18" height="20" rx="2" fill="none" stroke={THUMB_LINE} strokeWidth="1.2" />
          ))}
          {[[8, 12], [30, 12], [8, 40], [30, 40]].map(([x, y]) => (
            <rect key={`b${x}-${y}`} x={x + 3} y={y + 13} width="12" height="2.5" rx="1.25" {...ink(0.45)} />
          ))}
        </>
      );
    case 'timeline':
      return (
        <>
          <rect x="13" y="10" width="1.6" height="52" rx="0.8" fill={THUMB_ACCENT} opacity={0.5} />
          {[14, 30, 46].map((y) => (
            <g key={y}>
              <circle cx="13.8" cy={y + 3} r="3" fill={THUMB_GOLD} />
              <rect x="22" y={y} width="26" height="3.5" rx="1.75" {...ink(0.6)} />
              <rect x="22" y={y + 6} width="18" height="3" rx="1.5" {...ink(0.35)} />
            </g>
          ))}
        </>
      );
    case 'grid':
      return (
        <>
          {[
            [6, 8], [22, 8], [38, 8],
            [6, 30], [22, 30], [38, 30],
            [6, 52], [22, 52], [38, 52],
          ].map(([x, y], i) => (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="12"
              height="16"
              rx="1.5"
              fill={THUMB_ACCENT}
              opacity={i % 3 === 1 ? 0.34 : 0.2}
            />
          ))}
        </>
      );
    /* ── Chrome drawings (LAY.2). The top band is the bar; the page
       below is ghosted so the chrome reads as chrome. ── */
    case 'nav-split':
      return (
        <>
          <rect x="5" y="7" width="46" height="10" rx="2" fill="none" stroke={THUMB_LINE} strokeWidth="1" />
          <rect x="8" y="10.5" width="10" height="3" rx="1.5" fill={THUMB_ACCENT} opacity={0.7} />
          {[30, 37, 44].map((x) => (
            <rect key={x} x={x} y="11" width="4.5" height="2" rx="1" {...{ fill: THUMB_INK, opacity: 0.5 }} />
          ))}
          <rect x="10" y="26" width="36" height="34" rx="2" fill={THUMB_INK} opacity={0.08} />
        </>
      );
    case 'nav-centered':
      return (
        <>
          <rect x="5" y="7" width="46" height="12" rx="2" fill="none" stroke={THUMB_LINE} strokeWidth="1" />
          <rect x="22" y="9.5" width="12" height="3" rx="1.5" fill={THUMB_ACCENT} opacity={0.7} />
          {[16, 24, 32, 40].map((x) => (
            <rect key={x} x={x - 2} y="14.5" width="4" height="1.8" rx="0.9" {...{ fill: THUMB_INK, opacity: 0.5 }} />
          ))}
          <rect x="10" y="28" width="36" height="32" rx="2" fill={THUMB_INK} opacity={0.08} />
        </>
      );
    case 'nav-block':
      return (
        <>
          <rect x="5" y="7" width="46" height="12" rx="2" fill={THUMB_INK} opacity={0.75} />
          <rect x="9" y="11" width="14" height="3.5" rx="1.75" fill={THUMB_PAPER} opacity={0.9} />
          {[34, 41].map((x) => (
            <rect key={x} x={x} y="11.8" width="5" height="2" rx="1" fill={THUMB_PAPER} opacity={0.6} />
          ))}
          <rect x="10" y="26" width="36" height="34" rx="2" fill={THUMB_INK} opacity={0.08} />
        </>
      );
    case 'nav-minimal':
      return (
        <>
          <rect x="8" y="11" width="9" height="2.4" rx="1.2" fill={THUMB_ACCENT} opacity={0.7} />
          {[34, 41, 48].map((x) => (
            <rect key={x} x={x - 4} y="11.2" width="4" height="2" rx="1" {...{ fill: THUMB_INK, opacity: 0.45 }} />
          ))}
          <rect x="5" y="17" width="46" height="0.8" fill={THUMB_LINE} />
          <rect x="10" y="26" width="36" height="34" rx="2" fill={THUMB_INK} opacity={0.08} />
        </>
      );
    case 'nav-iconic':
      return (
        <>
          <rect x="5" y="7" width="46" height="11" rx="2" fill="none" stroke={THUMB_LINE} strokeWidth="1" />
          <circle cx="12" cy="12.5" r="3" fill={THUMB_GOLD} opacity={0.85} />
          {[30, 37, 44].map((x) => (
            <rect key={x} x={x} y="11.5" width="4.5" height="2" rx="1" {...{ fill: THUMB_INK, opacity: 0.5 }} />
          ))}
          <rect x="10" y="26" width="36" height="34" rx="2" fill={THUMB_INK} opacity={0.08} />
        </>
      );
    case 'menu-overlay':
      return (
        <>
          <rect x="5" y="6" width="46" height="60" rx="3" fill={THUMB_ACCENT} opacity={0.16} />
          {[22, 32, 42].map((y) => (
            <rect key={y} x="16" y={y} width="24" height="3.5" rx="1.75" {...{ fill: THUMB_INK, opacity: 0.65 }} />
          ))}
          <circle cx="45" cy="12" r="2.6" fill={THUMB_INK} opacity={0.5} />
        </>
      );
    case 'menu-slidein':
      return (
        <>
          <rect x="5" y="6" width="24" height="60" rx="2" fill={THUMB_INK} opacity={0.08} />
          <rect x="31" y="6" width="20" height="60" rx="2" fill={THUMB_ACCENT} opacity={0.2} />
          {[16, 25, 34].map((y) => (
            <rect key={y} x="35" y={y} width="12" height="3" rx="1.5" {...{ fill: THUMB_INK, opacity: 0.6 }} />
          ))}
        </>
      );
    case 'menu-sheet':
      return (
        <>
          <rect x="5" y="6" width="46" height="30" rx="2" fill={THUMB_INK} opacity={0.08} />
          <rect x="5" y="40" width="46" height="26" rx="4" fill={THUMB_ACCENT} opacity={0.2} />
          <rect x="24" y="43.5" width="8" height="1.8" rx="0.9" {...{ fill: THUMB_INK, opacity: 0.45 }} />
          {[49, 56].map((y) => (
            <rect key={y} x="12" y={y} width="22" height="3" rx="1.5" {...{ fill: THUMB_INK, opacity: 0.6 }} />
          ))}
        </>
      );
    case 'menu-pill':
      return (
        <>
          <rect x="5" y="6" width="46" height="60" rx="3" fill={THUMB_INK} opacity={0.06} />
          <rect x="14" y="52" width="28" height="9" rx="4.5" fill={THUMB_ACCENT} opacity={0.75} />
          {[20, 27, 34].map((x) => (
            <circle key={x} cx={x} cy="56.5" r="1.4" fill={THUMB_PAPER} />
          ))}
        </>
      );
    case 'footer-signature':
      return (
        <>
          <rect x="10" y="8" width="36" height="34" rx="2" fill={THUMB_INK} opacity={0.08} />
          <path d="M25 51 q3 -5 6 0 q-3 5 -6 0" fill="none" stroke={THUMB_GOLD} strokeWidth="1.2" />
          <rect x="17" y="56" width="22" height="3.2" rx="1.6" {...{ fill: THUMB_INK, opacity: 0.7 }} />
          <rect x="21" y="62" width="14" height="2.4" rx="1.2" {...{ fill: THUMB_INK, opacity: 0.4 }} />
        </>
      );
    case 'footer-columns':
      return (
        <>
          <rect x="10" y="8" width="36" height="32" rx="2" fill={THUMB_INK} opacity={0.08} />
          <rect x="8" y="48" width="16" height="3.4" rx="1.7" {...{ fill: THUMB_INK, opacity: 0.7 }} />
          {[48, 54, 60].map((y) => (
            <rect key={y} x="34" y={y} width="14" height="2.4" rx="1.2" {...{ fill: THUMB_INK, opacity: 0.45 }} />
          ))}
        </>
      );
    case 'footer-minimal':
      return (
        <>
          <rect x="10" y="8" width="36" height="40" rx="2" fill={THUMB_INK} opacity={0.08} />
          <rect x="10" y="56" width="36" height="0.8" fill={THUMB_LINE} />
          <rect x="19" y="61" width="18" height="2.6" rx="1.3" {...{ fill: THUMB_INK, opacity: 0.5 }} />
        </>
      );
  }
}

export function VariantThumb({
  section,
  variant,
  size = 'card',
}: {
  section: string;
  variant: string;
  size?: 'card' | 'chip';
}) {
  const w = size === 'card' ? 56 : 44;
  const h = size === 'card' ? 72 : 56;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 56 72"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="0.5" y="0.5" width="55" height="71" rx="6" fill={THUMB_PAPER} stroke={THUMB_LINE} strokeWidth="1" />
      <ThumbArt arch={archetypeFor(section, variant)} />
    </svg>
  );
}
