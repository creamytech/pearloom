'use client';

// ──────────────────────────────────────────────────────────────
// PhotoFirst — full-bleed cover photo as background. Names + date
// overlay vertically-bottom with a soft gradient scrim so type
// stays legible regardless of photo brightness. Cinematic vibe —
// fits Marfa, Big Sur, Joshua Tree, dark-romance templates.
// ──────────────────────────────────────────────────────────────

import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '@/components/pearloom/editor/canvas/PhotoActionMenu';
import { PhotoPlaceholder } from '@/components/pearloom/motifs';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, HeroLinkTray,
} from './parts';
import type { HeroVariantProps } from './types';

export function HeroPhotoFirst({ manifest, names, siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  const photoSrc = coverPhoto ?? photos[0];

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 'min(820px, 92vh)',
        margin: '-clamp(48px, 8cqw, 80px) -32px -clamp(48px, 8cqw, 110px)',
        overflow: 'hidden',
        borderRadius: 0,
      }}
    >
      {/* Cover photo fills the hero. Editor surfaces drop affordance. */}
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
                  background: `url(${photoSrc}) center/cover no-repeat`,
                }}
              />
            ) : (
              <PhotoPlaceholder tone="dusk" aspect="16/10" />
            )}
          </PhotoActionMenu>
        </PhotoDropTarget>
      </div>

      {/* Gradient scrim — dark from bottom, fades up. Keeps text
          legible on bright photos without nuking the image. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to top, rgba(14,13,11,0.62) 0%, rgba(14,13,11,0.32) 38%, rgba(14,13,11,0.05) 70%, transparent 100%)',
        }}
      />

      {/* Content stack — bottom-aligned, centered. */}
      <div
        style={{
          position: 'relative', zIndex: 2,
          minHeight: 'inherit', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', padding: '80px 32px 80px',
          maxWidth: 1160, margin: '0 auto',
          color: 'var(--cream, #FBF7EE)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
          <HeroNames
            n1={n1} n2={n2}
            onEditNames={onEditNames}
            color="var(--cream, #FBF7EE)"
            italicColor="rgba(251, 247, 238, 0.78)"
          />
          <HeroDateVenue
            dateInfo={dateInfo}
            venue={venue}
            color="var(--cream, #FBF7EE)"
          />
          <HeroTagline manifest={manifest} onEditField={onEditField} color="rgba(251, 247, 238, 0.88)" />
          <HeroPrimaryCta deadlineStr={deadlineStr} />
          <HeroLinkTray siteSlug={siteSlug} manifest={manifest} names={names} />
        </div>
      </div>
    </div>
  );
}
