// ─────────────────────────────────────────────────────────────
// motif-layouts — the motif PLACEMENT catalog, server-safe.
//
// Lives in lib (not in redesign/MotifLayer.tsx) because that file
// is a 'use client' module: importing its value exports into a
// route handler hands you a client-reference proxy, not the
// array/function — `.map is not a function` at module eval. The
// generate routes (via wizard-look) and the smart-palette advisor
// both need these on the server, so the catalog lives here and
// MotifLayer re-exports it for client consumers.
// ─────────────────────────────────────────────────────────────

export type MotifLayout = 'scattered' | 'corners' | 'margins' | 'dividers' | 'crest' | 'none';

export const MOTIF_LAYOUTS: Array<{ id: MotifLayout; label: string; sub: string }> = [
  { id: 'scattered', label: 'Scattered', sub: 'A sprinkle on every section' },
  { id: 'corners',   label: 'Corners',   sub: 'Chapter marks, alternating sides' },
  { id: 'margins',   label: 'Margins',   sub: 'Down the outer edges, manuscript-style' },
  { id: 'dividers',  label: 'Dividers',  sub: 'Only in the seams between sections' },
  { id: 'crest',     label: 'Crest',     sub: 'One large watermark behind the hero' },
  { id: 'none',      label: 'Off',       sub: 'Clean paper, no marks' },
];

/** Kit → default placement, so generated sites compose coherently
 *  before the host touches the picker. */
export function motifLayoutForKit(kitId?: string | null): MotifLayout {
  switch (kitId) {
    case 'scrapbook': return 'scattered';
    case 'plate':     return 'corners';
    case 'index':     return 'margins';
    case 'ticket':    return 'dividers';
    case 'minimal':   return 'none';
    case 'arch':      return 'crest';
    default:          return 'scattered';
  }
}
