/* ─────────────────────────────────────────────────────────────
   design-feedback — "what changed, and where" for design commits.

   When a host commits a design setting (theme pack, kit, colors,
   texture, spacing, motifs, …) the panel calls
   `announceDesignChange(kind, label)`. DesignChangeBeacon (mounted
   by EditorRedesign) listens and:

     · names the change in a quiet chip over the canvas
       ("Paper · Linen", "Spacing · Airy") — plain words, BRAND §7;
     · runs a brief two-strand thread pass for whole-canvas
       changes, or a hairline pulse over the affected layer for
       scoped ones (motifs, pattern, footer, menu…);
     · scrolls the canvas once to reveal a scoped layer that is
       currently off-screen.

   This module is the pure half (event name, kind → plan mapping,
   chip text) so it can be unit-tested without a DOM.
   ───────────────────────────────────────────────────────────── */

export const DESIGN_CHANGE_EVENT = 'pearloom:design-change';

export type DesignChangeKind =
  | 'theme'      // whole theme pack / catalog theme
  | 'colors'
  | 'fonts'
  | 'kit'        // card style
  | 'texture'    // paper material
  | 'grain'      // texture intensity
  | 'spacing'    // density
  | 'layout'
  | 'background'
  | 'decor'      // whole decor preset (motif + divider + pattern)
  | 'motifs'
  | 'pattern'
  | 'divider'
  | 'monogram'
  | 'menu'
  | 'footer';

export interface DesignChangeDetail {
  kind: DesignChangeKind;
  /** The picked value, already host-worded ("Linen", "Airy"). */
  label?: string;
}

export interface BeaconPlan {
  /** 'canvas' = the whole site changed; 'scoped' = one layer did. */
  scope: 'canvas' | 'scoped';
  /** For scoped plans — first match inside the canvas root gets the
   *  pulse (and the reveal-scroll when off-screen). Missing target
   *  falls back to the canvas treatment at runtime. */
  selector?: string;
  /** Plain-word noun for the chip (BRAND §7 — a first-time host
   *  already has a word for these). */
  noun: string;
}

const PLANS: Record<DesignChangeKind, BeaconPlan> = {
  theme:      { scope: 'canvas', noun: 'Theme' },
  colors:     { scope: 'canvas', noun: 'Colors' },
  fonts:      { scope: 'canvas', noun: 'Fonts' },
  kit:        { scope: 'canvas', noun: 'Cards' },
  texture:    { scope: 'canvas', noun: 'Paper' },
  grain:      { scope: 'canvas', noun: 'Grain' },
  spacing:    { scope: 'canvas', noun: 'Spacing' },
  layout:     { scope: 'canvas', noun: 'Layout' },
  background: { scope: 'canvas', noun: 'Background' },
  decor:      { scope: 'canvas', noun: 'Decorations' },
  motifs:     { scope: 'scoped', selector: '[data-motif-layer]', noun: 'Decorations' },
  pattern:    { scope: 'scoped', selector: '.pl8-pattern-layer', noun: 'Pattern' },
  divider:    { scope: 'scoped', selector: '[data-pl-divider]', noun: 'Dividers' },
  monogram:   { scope: 'scoped', selector: '[data-pl-monogram]', noun: 'Monogram' },
  menu:       { scope: 'scoped', selector: 'nav', noun: 'Menu' },
  footer:     { scope: 'scoped', selector: 'footer', noun: 'Footer' },
};

export function beaconPlanFor(kind: DesignChangeKind): BeaconPlan {
  return PLANS[kind] ?? { scope: 'canvas', noun: 'Look' };
}

/** Chip copy — "NOUN · LABEL" (or just the noun). Mono uppercase
 *  is applied by the chip's CSS, not here. */
export function beaconText(kind: DesignChangeKind, label?: string): string {
  const noun = beaconPlanFor(kind).noun;
  const l = (label ?? '').trim();
  if (!l || l.toLowerCase() === noun.toLowerCase()) return noun;
  return `${noun} · ${l}`;
}

export function announceDesignChange(kind: DesignChangeKind, label?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DesignChangeDetail>(DESIGN_CHANGE_EVENT, {
    detail: { kind, label },
  }));
}

/* ─── Compare (before/after peek) ────────────────────────────
   The Theme rail's hold-to-compare button dispatches this;
   EditorRedesign listens, reads the bridge's undo stack (read-
   only — no history mutation), and swaps the canvas manifest
   while held. */

export const DESIGN_COMPARE_EVENT = 'pearloom:design-compare';

export interface DesignCompareDetail {
  active: boolean;
}

export function setDesignCompare(active: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DesignCompareDetail>(DESIGN_COMPARE_EVENT, {
    detail: { active },
  }));
}
