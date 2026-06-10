'use client';

/* ════════════════════════════════════════════════════════════════
   MOTIF LAYER — where the motifs live.

   Until now "which motif" was a choice but "where" was hardcoded:
   17 inline MotifScatter calls inside individual section
   components, with fixed spots and half the sections getting
   nothing. This layer makes placement a first-class axis —
   rendered by the section wrapper so EVERY section participates
   by construction, seeded by section id so the composition is
   deterministic (same site, same marks, no hydration drift).

   manifest.motifLayout:
     scattered — the classic sprinkle, now on every section,
                 varied per-section by seed
     corners   — one mark pinned per section corner, alternating
                 sides down the page like chapter ornaments
     margins   — small marks down the outer margins,
                 illuminated-manuscript style
     dividers  — marks live only in the seams between sections
     crest     — one large watermark behind the hero, a faint
                 echo on the footer, nothing else
     none      — off

   Defaults follow the component kit (scrapbook→scattered,
   plate→corners, index→margins, minimal→none …) so the page is
   coherent before the host ever opens the picker.
   ════════════════════════════════════════════════════════════════ */

import type { CSSProperties } from 'react';
import { Motif, type MotifKind } from '../site/MotifScatter';

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

/* Deterministic per-section seed — tiny string hash. */
function seedFor(sectionId: string): number {
  let h = 0;
  for (let i = 0; i < sectionId.length; i++) h = ((h << 5) - h + sectionId.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* zIndex 1, matching the retired inline MotifScatter — section
   content wrappers are positioned, so a z-0 layer paints UNDER
   their backgrounds and the marks vanish. */
const wrap: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 };

export function MotifLayer({
  layout,
  kind,
  sectionId,
}: {
  layout: MotifLayout;
  kind: MotifKind;
  sectionId: string;
}) {
  if (!kind || kind === 'none' || layout === 'none') return null;
  const seed = seedFor(sectionId);
  const left = seed % 2 === 0; // which side this section leans
  const isHero = sectionId === 'hero';
  const isFooter = sectionId === 'footer';

  switch (layout) {
    case 'scattered': {
      // 1-2 marks, position varied by seed so the page doesn't
      // read as a repeated stamp.
      const a = 12 + (seed % 18);
      const b = 14 + ((seed >> 3) % 20);
      return (
        <div aria-hidden data-motif-layer={layout} style={wrap}>
          <Motif kind={kind} size={isHero ? 104 : 88} style={{ position: 'absolute', top: a, ...(left ? { left: b } : { right: b }), opacity: 0.5, transform: left ? 'scaleX(-1)' : undefined }} />
          {(seed % 3 !== 0 || isHero) && (
            <Motif kind={kind} size={72} style={{ position: 'absolute', bottom: b, ...(left ? { right: a } : { left: a }), opacity: 0.38, transform: left ? undefined : 'scaleX(-1)' }} />
          )}
        </div>
      );
    }
    case 'corners':
      return (
        <div aria-hidden data-motif-layer={layout} style={wrap}>
          <Motif kind={kind} size={64} style={{ position: 'absolute', top: 14, ...(left ? { left: 16 } : { right: 16 }), opacity: 0.5, transform: left ? 'scaleX(-1)' : undefined }} />
        </div>
      );
    case 'margins':
      return (
        <div aria-hidden data-motif-layer={layout} style={wrap} className="pl8-motif-margins">
          <Motif kind={kind} size={40} style={{ position: 'absolute', top: '22%', ...(left ? { left: 10 } : { right: 10 }), opacity: 0.45, transform: left ? 'scaleX(-1)' : undefined }} />
          <Motif kind={kind} size={32} style={{ position: 'absolute', top: '64%', ...(left ? { left: 14 } : { right: 14 }), opacity: 0.35 }} />
        </div>
      );
    case 'dividers':
      // One small centered mark at the section's top seam.
      if (isHero) return null; // no seam above the hero
      return (
        <div aria-hidden data-motif-layer={layout} style={{ ...wrap, overflow: 'visible' }}>
          <div style={{ position: 'absolute', top: -19, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.8 }}>
            <span style={{ width: 44, height: 1, background: 'var(--t-accent, var(--t-line, rgba(0,0,0,0.2)))', opacity: 0.5 }} />
            <Motif kind={kind} size={38} />
            <span style={{ width: 44, height: 1, background: 'var(--t-accent, var(--t-line, rgba(0,0,0,0.2)))', opacity: 0.5 }} />
          </div>
        </div>
      );
    case 'crest':
      // Letterhead watermark: multiply-blended so it presses
      // through the hero card like a stationery seal instead of
      // painting a gray smudge over the copy. z-1 because the
      // hero's atmosphere wash is a positioned later sibling that
      // would otherwise cover it.
      if (isHero) {
        return (
          <div aria-hidden data-motif-layer={layout} style={wrap}>
            <Motif kind={kind} size={560} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -52%)', opacity: 0.22, mixBlendMode: 'multiply' }} />
          </div>
        );
      }
      if (isFooter) {
        return (
          <div aria-hidden data-motif-layer={layout} style={wrap}>
            <Motif kind={kind} size={120} style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', opacity: 0.14, mixBlendMode: 'multiply' }} />
          </div>
        );
      }
      return null;
    default:
      return null;
  }
}
