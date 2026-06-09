'use client';

// ──────────────────────────────────────────────────────────────
// PhotoFirst — full-bleed cover photo as background. Names + date
// overlay vertically-bottom with a soft gradient scrim so type
// stays legible regardless of photo brightness. Cinematic vibe —
// fits Marfa, Big Sur, Joshua Tree, dark-romance templates.
// ──────────────────────────────────────────────────────────────

import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '@/components/pearloom/editor/canvas/PhotoActionMenu';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, heroFallbackGradient,
} from './parts';
import type { HeroVariantProps } from './types';

export function HeroPhotoFirst({ manifest, names: _names, siteSlug: _siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  const photoSrc = coverPhoto ?? photos[0];
  const focalPoint =
    (manifest as unknown as { coverFocalPoint?: { x: number; y: number } }).coverFocalPoint;
  const bgPosition = focalPoint ? `${focalPoint.x}% ${focalPoint.y}%` : 'center';
  // Edition-driven gradient fallback when no photo is set. The
  // gradient REPLACES the flat PhotoPlaceholder so the hero still
  // wears the active Edition's palette identity (Cinema midnight,
  // Postcard Box tuscan, Quiet matte, etc.) instead of a neutral
  // dusk tone. Photo path is untouched.
  const fallback = heroFallbackGradient(manifest);

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
                className="pl8-hero-kenburns"
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
        <div className="pl-hero-enter" style={{ textAlign: 'center' }}>
          <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
          <HeroNames
            n1={n1} n2={n2} solo={context.solo}
            onEditNames={onEditNames}
            color="var(--cream, #FBF7EE)"
            italicColor="rgba(251, 247, 238, 0.78)"
            letterpress={false}
          />
          <HeroDateVenue
            dateInfo={dateInfo}
            venue={venue}
            color="var(--cream, #FBF7EE)"
            manifest={manifest}
            onEditField={onEditField}
          />
          <HeroTagline manifest={manifest} onEditField={onEditField} color="rgba(251, 247, 238, 0.88)" />
          {/* CTAs — prototype primary+outline pattern. Drops the
              3-link tray for the cleaner two-button row matching
              the prototype's HeroBlock. Outline button is
              cream-on-transparent so it reads against the dark
              gradient scrim. */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              marginTop: 22,
              flexWrap: 'wrap',
            }}
          >
            <HeroPrimaryCta deadlineStr={deadlineStr} />
            <a
              href="#our-story"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 20px',
                borderRadius: 'var(--pl-card-radius, 999px)',
                background: 'transparent',
                border: '1px solid rgba(251,247,238,0.45)',
                color: 'var(--cream, #FBF7EE)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
