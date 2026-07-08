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

type Archetype = 'hero' | 'type' | 'list' | 'cards' | 'timeline' | 'grid';

/** Map a section+variant to the archetype schematic that evokes it. */
export function archetypeFor(section: string, variant: string): Archetype {
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
