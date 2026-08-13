/* ─── Pressed — the shared material vocabulary ───────────────────
   RADICAL-DESIGN-DIRECTIONS §E: foil, deboss, and letterpress in ONE
   place so surfaces can't drift. Proven first in the dashboard's
   pressed empty states, the published site's pressed mats, and the
   Type Plate / Cover heroes — extracted here once three consumers
   agreed on the recipe.

   Works in BOTH token worlds: pass site vars (--t-*) or chrome
   colors where a parameter exists; the constants are neutral.

   The matching motion utilities (.pl-type-press, .pl-thread-draw,
   .pl-fade-late) live in src/app/animation.css — CSS classes so the
   prefers-reduced-motion guard is declared once, globally. */

import type { ReactNode } from 'react';

/* ── Foil ─────────────────────────────────────────────────────────
   Gold as METAL, not flat #C19A4B: a four-stop sheen that reads as
   foil stamping on hairlines and strands. The mid stop is
   overridable so site themes can key it to their own --t-gold. */

export const FOIL_STOPS = [
  { offset: '0', color: '#A87F35' },
  { offset: '0.45', color: '#E3C77E' },
  { offset: '0.7', color: '#C19A4B' },
  { offset: '1', color: '#B8913F' },
] as const;

/** SVG defs entry — mount inside a <defs> and stroke/fill with
 *  `url(#id)`. `mid` swaps the 0.7 stop (e.g. 'var(--t-gold)'). */
export function FoilGradient({ id, mid }: { id: string; mid?: string }): ReactNode {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      {FOIL_STOPS.map((s, i) => (
        <stop key={s.offset} offset={s.offset} stopColor={i === 2 && mid ? mid : s.color} />
      ))}
    </linearGradient>
  );
}

/* ── Deboss ───────────────────────────────────────────────────────
   Surfaces are pressed INTO the paper, not outlined on it: a soft
   inner top shade + a light inner bottom edge is the letterpress
   illusion. Use with a whisper (or no) border. */

/** A full sheet/panel sitting into the desk (pressed empty states). */
export const DEBOSS_SHEET =
  'inset 0 2px 6px rgba(31, 36, 24, 0.055), inset 0 -1px 0 rgba(255, 255, 255, 0.75), 0 1px 0 rgba(255, 255, 255, 0.55)';

/** A small circular blind-emboss (maker's marks, stamp rings). */
export const DEBOSS_SEAL =
  'inset 0 1.5px 3px rgba(31, 36, 24, 0.09), inset 0 -1px 1px rgba(255, 255, 255, 0.8)';

/* ── Letterpress type ────────────────────────────────────────────
   Display glyphs sit INTO the paper: a light lower edge + a faint
   ink upper edge. Pass the surface's own paper/ink (tokens or hex)
   so the inset reads correctly on any ground. */
export function letterpressShadow(paper: string, ink: string): string {
  return `0 1px 1px color-mix(in oklab, ${paper} 82%, #fff), 0 -1px 1px color-mix(in oklab, ${ink} 22%, transparent)`;
}

/** Foil-stamped TEXT — the FOIL_STOPS as gradient-clipped type.
 *  Spread onto a display-type element's style. */
export function foilTextStyle(): {
  background: string;
  WebkitBackgroundClip: 'text';
  backgroundClip: 'text';
  color: 'transparent';
} {
  const stops = FOIL_STOPS.map((s) => `${s.color} ${Number(s.offset) * 100}%`).join(', ');
  return {
    background: `linear-gradient(100deg, ${stops})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };
}

/** A whisper of laid-paper grain (horizontal ink lines at ~3%).
 *  Use as a backgroundImage over any paper fill. */
export const PAPER_GRAIN =
  'repeating-linear-gradient(0deg, rgba(31, 36, 24, 0.03) 0 1px, transparent 1px 3px)';
