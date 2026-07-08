'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / studio/StudioLayouts.tsx
//
// Five front-of-card layouts plus the motif overlay. Each takes
// the resolved palette + font pair + content (eyebrow, headline,
// body lines, cta) and renders a 5×7 (420×588) card.
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import type { StudioPalette, StudioFontPair, StudioContent, StationeryType } from './studio-constants';
import { Stamp, Squiggle } from '../motifs';

interface LayoutProps {
  content: StudioContent;
  palette: StudioPalette;
  font: StudioFontPair;
  type: StationeryType;
  nameA: string;
  /** Empty on solo occasions — layouts render one name, no amp. */
  nameB: string;
  amp?: string;
  /** Cover photo URL — used by the photo layout. Falls back to
   *  a tonal placeholder when not set. */
  photoUrl?: string | null;
}

const AMP_DEFAULT = 'and';

export function ClassicLayout({ content, palette, font, type, nameA, nameB, amp = AMP_DEFAULT }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100%', textAlign: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Rule color={palette.accent} width={48} />
        <div style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', fontWeight: 600, color: palette.ink, opacity: 0.7 }}>
          {content.eyebrow}
        </div>
        <Rule color={palette.accent} width={48} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal',
          fontWeight: font.weight, fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.02em',
          color: palette.ink,
        }}>
          {nameA}
          {nameB && (
            <>
              <div style={{ fontSize: 36, fontStyle: 'italic', color: palette.accent, fontWeight: 400, margin: '4px 0', letterSpacing: '0.04em' }}>{amp}</div>
              {nameB}
            </>
          )}
        </div>
        <div style={{ fontFamily: font.ui, fontSize: 13, color: palette.ink, opacity: 0.85, marginTop: 6, fontStyle: type === 'thanks' ? 'italic' : 'normal' }}>
          {content.line2}
        </div>
        <Rule color={palette.accent} width={120} />
        <div style={{ fontFamily: font.display, fontSize: 16, color: palette.ink, letterSpacing: '0.02em', fontWeight: 500 }}>
          {content.line3}
        </div>
        <div style={{ fontFamily: font.ui, fontSize: 11.5, color: palette.ink, opacity: 0.7, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>
          {content.line4}
        </div>
      </div>

      <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
        {content.cta}
      </div>
    </div>
  );
}

export function AsymLayout({ content, palette, font, nameA, nameB, amp = AMP_DEFAULT }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', zIndex: 2 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: palette.ink, opacity: 0.7, fontWeight: 600 }}>
        {content.eyebrow}
      </div>
      <div style={{ position: 'absolute', top: 0, right: 0, fontSize: 10, color: palette.ink, opacity: 0.6, fontFamily: font.display, fontStyle: 'italic' }}>
        no. 01
      </div>

      <div style={{ position: 'absolute', top: '32%', left: 0, transform: 'translateY(-50%)' }}>
        <div style={{
          fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal',
          fontWeight: font.weight, fontSize: 70, lineHeight: 0.92, letterSpacing: '-0.03em', color: palette.ink,
        }}>
          {nameA}
          {nameB && (
            <>
              <br />
              <span style={{ fontStyle: 'italic', color: palette.accent, fontWeight: 400, fontSize: 56 }}>{amp}</span><br />
              {nameB}
            </>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Rule color={palette.accent} width="100%" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>The day</div>
            <div style={{ fontFamily: font.display, fontSize: 16, color: palette.ink, fontWeight: 500 }}>{content.line3}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600, marginBottom: 4 }}>The place</div>
            <div style={{ fontFamily: font.display, fontSize: 16, color: palette.ink, fontWeight: 500 }}>{content.line4}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhotoLayout({ content, palette, font, photoUrl, nameA, nameB, amp = AMP_DEFAULT }: LayoutProps) {
  const photoBg = photoUrl
    ? `center/cover no-repeat url("${photoUrl}")`
    : `linear-gradient(135deg, ${palette.accent}, ${palette.accent2})`;
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', zIndex: 2, gap: 16, margin: -36, padding: 0 }}>
      <div style={{ height: '62%', background: photoBg }} />
      <div style={{ padding: '0 36px 36px', display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', flex: 1 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: palette.ink, opacity: 0.65, fontWeight: 600, marginBottom: 4 }}>{content.eyebrow}</div>
        <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: 40, lineHeight: 1, color: palette.ink, letterSpacing: '-0.02em' }}>
          {nameA}{nameB && <> <span style={{ fontStyle: 'italic', color: palette.accent, fontSize: 30 }}>{amp}</span> {nameB}</>}
        </div>
        <div style={{ fontFamily: font.display, fontSize: 13, color: palette.ink, fontWeight: 500, marginTop: 8 }}>{content.line3}</div>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.ink, opacity: 0.6, fontWeight: 600 }}>{content.line4}</div>
      </div>
    </div>
  );
}

export function ScriptLayout({ content, palette, font, nameA, nameB }: LayoutProps) {
  const script = font.id === 'site' ? 'var(--t-script, "Caveat", cursive)' : "'Caveat', cursive";
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, zIndex: 2 }}>
      <div style={{ fontFamily: script, fontSize: 32, color: palette.ink, lineHeight: 1.15 }}>
        Dearest friend,
      </div>
      <div style={{ fontFamily: script, fontSize: 24, color: palette.ink, opacity: 0.85, lineHeight: 1.3 }}>
        {content.scriptBody}
      </div>
      <div style={{ marginTop: 14, fontFamily: script, fontSize: 28, color: palette.accent }}>
        — {nameB ? `${nameA} & ${nameB}` : nameA}
      </div>
      <div style={{ marginTop: 'auto', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: palette.ink, opacity: 0.55, fontWeight: 600 }}>
        {content.line3}
      </div>
    </div>
  );
}

export function MinimalLayout({ content, palette, font, nameA, nameB }: LayoutProps) {
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', zIndex: 2, gap: 18 }}>
      <div style={{ fontFamily: font.display, fontStyle: font.italic ? 'italic' : 'normal', fontWeight: font.weight, fontSize: 48, lineHeight: 1, color: palette.ink, letterSpacing: '-0.02em' }}>
        {nameA}{nameB && <> <span style={{ color: palette.accent }}>&</span> {nameB}</>}
      </div>
      <Rule color={palette.accent} width={80} />
      <div style={{ fontSize: 11.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: palette.ink, opacity: 0.7, fontWeight: 600 }}>
        {content.line3}
      </div>
    </div>
  );
}

export function Rule({ color, width = 60, height = 1 }: { color: string; width?: number | string; height?: number }) {
  return <div style={{ width, height, background: color, opacity: 0.6 }} />;
}

export function PaperTexture() {
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} width="100%" height="100%">
      <defs>
        <filter id="paper-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0.95   0 0 0 0 0.92   0 0 0 0 0.85   0 0 0 0.06 0" />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#paper-noise)" />
    </svg>
  );
}

export function MotifOverlay({
  motif,
  palette,
  stampText,
  monogram,
  customUrl,
}: {
  motif: string;
  palette: StudioPalette;
  stampText: string;
  monogram: string;
  /** AI-generated motif URL — when set, the host generated a
   *  custom motif via the asset palette and dragged it into the
   *  card. Renders as a positioned image instead of the SVG glyph. */
  customUrl?: string | null;
}): ReactNode {
  if (customUrl) {
    return (
      <img
        src={customUrl}
        alt=""
        style={{ position: 'absolute', top: 16, right: 16, width: 100, height: 100, objectFit: 'contain', zIndex: 3 }}
      />
    );
  }
  if (motif === 'stamp') {
    return (
      <div style={{ position: 'absolute', top: 16, right: 16, transform: 'rotate(8deg)', zIndex: 3 }}>
        <Stamp size={70} tone={palette.id === 'sage' ? 'sage' : palette.id === 'peach' ? 'peach' : 'lavender'} text={stampText} icon="heart" rotation={0} />
      </div>
    );
  }
  if (motif === 'leaves') {
    return (
      <svg viewBox="0 0 200 200" width={140} height={140} style={{ position: 'absolute', bottom: -10, left: -10, opacity: 0.85, zIndex: 3 }}>
        <path d="M30 170 Q 60 100, 120 110 Q 170 120, 180 60" stroke={palette.accent} strokeWidth="1.5" fill="none" />
        <ellipse cx="55" cy="135" rx="14" ry="6" fill={palette.accent} transform="rotate(-30 55 135)" />
        <ellipse cx="85" cy="115" rx="14" ry="6" fill={palette.accent} transform="rotate(15 85 115)" />
        <ellipse cx="125" cy="105" rx="14" ry="6" fill={palette.accent} transform="rotate(-10 125 105)" />
        <ellipse cx="160" cy="80" rx="12" ry="5" fill={palette.accent} transform="rotate(40 160 80)" />
      </svg>
    );
  }
  if (motif === 'tape') {
    return (
      <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-4deg)', width: 90, height: 22, background: 'rgba(234,178,134,0.55)', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', zIndex: 3 }} />
    );
  }
  if (motif === 'monogram') {
    return (
      <div style={{ position: 'absolute', top: 24, left: 24, fontFamily: 'var(--t-display, "Fraunces", serif)', fontStyle: 'italic', fontSize: 28, color: palette.accent, fontWeight: 600, zIndex: 3 }}>
        {monogram}
      </div>
    );
  }
  if (motif === 'wax') {
    return (
      <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 3 }}>
        <svg viewBox="0 0 60 60" width={60} height={60}>
          <circle cx="30" cy="30" r="22" fill={palette.accent} />
          <circle cx="30" cy="30" r="22" fill="url(#wax2)" opacity="0.45" />
          <text x="30" y="36" textAnchor="middle" fontSize="14" fontFamily="Georgia, serif" fill="rgba(255,255,255,0.75)" fontStyle="italic" fontWeight="700">{monogram}</text>
          <defs><radialGradient id="wax2" cx="35%" cy="35%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#000" /></radialGradient></defs>
        </svg>
      </div>
    );
  }
  if (motif === 'doodle') {
    return (
      <div style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 3, opacity: 0.7 }}>
        <Squiggle width={90} height={36} variant={1} stroke={palette.accent} />
      </div>
    );
  }
  return null;
}
