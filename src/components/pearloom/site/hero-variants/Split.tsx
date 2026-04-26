'use client';

// ──────────────────────────────────────────────────────────────
// Split — 50/50 horizontal layout. Cover photo on left, text
// stack on right. Stacks vertically below 720px. Magazine-cover
// vibe — fits Vintage Romance, Hudson Valley, Old Money, Hotel
// Costes templates.
// ──────────────────────────────────────────────────────────────

import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoPlaceholder } from '@/components/pearloom/motifs';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, HeroLinkTray,
} from './parts';
import type { HeroVariantProps } from './types';

export function HeroSplit({ manifest, names, siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  const photoSrc = coverPhoto ?? photos[0];

  return (
    <div
      className="pl8-hero-split"
      style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 'clamp(28px, 5vw, 72px)',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Photo column */}
      <div style={{ position: 'relative' }}>
        <PhotoDropTarget
          onDrop={(url) => onEditField?.((m) => ({ ...m, coverPhoto: url }))}
          label="Drop to set cover"
        >
          <div
            style={{
              aspectRatio: '4/5',
              borderRadius: 6,
              overflow: 'hidden',
              boxShadow: '0 24px 56px rgba(61,74,31,0.18), 0 1px 2px rgba(0,0,0,0.05)',
              background: photoSrc
                ? `url(${photoSrc}) center/cover no-repeat`
                : 'var(--cream-2)',
            }}
          >
            {!photoSrc && <PhotoPlaceholder tone="warm" aspect="4/5" />}
          </div>
        </PhotoDropTarget>
      </div>

      {/* Text column */}
      <div style={{ minWidth: 0 }}>
        <div style={{ textAlign: 'left' }}>
          <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
          {/* Override centering of HeroKicker via wrapper alignment.
              The kicker keeps its hairlines but reads left in this layout. */}
        </div>
        <div style={{ textAlign: 'left' }}>
          <HeroNames n1={n1} n2={n2} onEditNames={onEditNames} scale={0.78} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <HeroDateVenue dateInfo={dateInfo} venue={venue} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <HeroTagline manifest={manifest} onEditField={onEditField} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <HeroPrimaryCta deadlineStr={deadlineStr} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <HeroLinkTray siteSlug={siteSlug} manifest={manifest} names={names} />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          .pl8-hero-split {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
