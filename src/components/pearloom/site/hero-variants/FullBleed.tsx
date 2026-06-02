'use client';

// ──────────────────────────────────────────────────────────────
// Full-bleed — ported from ClaudeDesign/pages/themed-site.jsx
// HeroBlock 'fullbleed' branch (lines 310-325).
//
// Visually distinct from PhotoFirst:
//   - PhotoFirst is BOTTOM-anchored content (names + tagline +
//     date + two CTAs sit at the bottom of a 92vh frame) with a
//     soft scrim
//   - Full-bleed is CENTER-anchored content (placeItems:center)
//     with a deeper top-to-bottom gradient and a smaller,
//     poster-like type stack: lead → big stacked names → meta →
//     primary CTA only. No outline button, no tagline. Reads as
//     a magazine cover or movie poster.
//
// The prototype's structure: 460px+ min-height grid with
// placeItems center, full-bleed photo, dark 180deg gradient
// (rgba 0.18 → 0.5), centered 76px serif names with italic "and"
// connector, date · place meta, single primary CTA.
// ──────────────────────────────────────────────────────────────

import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '@/components/pearloom/editor/canvas/PhotoActionMenu';
import {
  HeroKicker, HeroNames, HeroDateVenue,
  HeroPrimaryCta, heroFallbackGradient,
} from './parts';
import type { HeroVariantProps } from './types';

export function HeroFullBleed({ manifest, names: _names, siteSlug: _siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  const photoSrc = coverPhoto ?? photos[0];
  const focalPoint =
    (manifest as unknown as { coverFocalPoint?: { x: number; y: number } }).coverFocalPoint;
  const bgPosition = focalPoint ? `${focalPoint.x}% ${focalPoint.y}%` : 'center';
  const fallback = heroFallbackGradient(manifest);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 'min(680px, 80vh)',
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        margin: '-clamp(48px, 8cqw, 80px) -32px -clamp(48px, 8cqw, 110px)',
        borderRadius: 0,
      }}
    >
      {/* Cover photo bg — fills the grid cell. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <PhotoDropTarget
          onDrop={(url) => onEditField?.((m) => ({ ...m, coverPhoto: url }))}
          label="Drop to set cover"
        >
          <PhotoActionMenu
            imageUrl={photoSrc}
            onReplace={(url) => onEditField?.((m) => ({ ...m, coverPhoto: url }))}
            onRemove={() => onEditField?.((m) => {
              const next = { ...m };
              delete (next as { coverPhoto?: string }).coverPhoto;
              return next;
            })}
          >
            {photoSrc ? (
              <div
                role="img"
                aria-label="Cover photo"
                style={{
                  width: '100%', height: '100%', minHeight: 'inherit',
                  backgroundImage: `url(${photoSrc})`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: bgPosition,
                }}
              />
            ) : (
              <div
                aria-hidden
                data-pl-edition={fallback.editionId}
                className={fallback.className}
                style={{
                  width: '100%', height: '100%', minHeight: 'inherit',
                  background: fallback.background,
                }}
              />
            )}
          </PhotoActionMenu>
        </PhotoDropTarget>
      </div>

      {/* Deeper, more even gradient — top 18% → bottom 50% black.
          Matches the prototype's 0.18 → 0.5 spec which is darker
          and more centered than PhotoFirst's bottom-heavy scrim. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Content — centered in the grid cell (no flex/bottom-align). */}
      <div
        className="pl-hero-enter"
        style={{
          position: 'relative', zIndex: 2,
          padding: '40px 24px',
          color: 'var(--cream, #FBF7EE)',
          maxWidth: 920,
          marginInline: 'auto',
        }}
      >
        {/* Kicker — reused but rendered on the cream side. */}
        <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />

        {/* Names — no letterpress (the inset shadow would muddy
            against a dark gradient). */}
        <HeroNames
          n1={n1} n2={n2}
          onEditNames={onEditNames}
          color="var(--cream, #FBF7EE)"
          italicColor="rgba(251, 247, 238, 0.78)"
          letterpress={false}
        />

        {/* Meta — date · venue. No tagline (the prototype's
            fullbleed branch is intentionally tight). */}
        <HeroDateVenue
          dateInfo={dateInfo}
          venue={venue}
          color="var(--cream, #FBF7EE)"
          manifest={manifest}
          onEditField={onEditField}
        />

        {/* Single primary CTA — no outline secondary. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 22,
          }}
        >
          <HeroPrimaryCta deadlineStr={deadlineStr} />
        </div>
      </div>
    </div>
  );
}
