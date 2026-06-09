'use client';

// ──────────────────────────────────────────────────────────────
// Centered — ported from ClaudeDesign/pages/themed-site.jsx
// HeroBlock default-case (lines 351-362). This is the prototype's
// classic centered editorial hero: kicker → tagline → headline →
// meta → KDivider → buttons → HeroPhotos cluster underneath.
//
// Visually distinct from Postcard (which wraps everything in a
// paper-card with double-bordered inset and uses the 3-arch photo
// silhouette) — Centered has NO card wrapper, NO arches; the
// photos sit as a flat row of three rectangles below the
// buttons, mirroring the prototype's HeroPhotos call at the end
// of the default branch. Reads as the cleaner, "no decoration"
// centered option for hosts who want the prototype's default
// look without the polaroid/arch flair.
// ──────────────────────────────────────────────────────────────

import { Icon, PhotoPlaceholder } from '@/components/pearloom/motifs';
import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '@/components/pearloom/editor/canvas/PhotoActionMenu';
import { MotifScatter, type MotifKind } from '../MotifScatter';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, heroFallbackGradient,
} from './parts';
import type { HeroVariantProps } from './types';

// Same per-Edition motif mapping as Postcard so the "Centered"
// option still wears the right botanical/sprig for the edition.
const EDITION_MOTIF: Record<string, MotifKind> = {
  almanac: 'pressed',
  cinema: 'none',
  'postcard-box': 'olive',
  'linen-folder': 'olive',
  quiet: 'none',
  coastal: 'none',
};

// Three flat photo tiles (vs Postcard's arches). Equal-width with
// soft shadow; the middle is the cover dropzone, outer two slot
// into heroSlideshow[0] and heroSlideshow[2]. Aspect 4/5 portrait
// (matches the prototype's SitePhoto default for the HeroPhotos
// row).
const TILE_TONES = ['warm', 'dusk', 'lavender'] as const;
const TILE_ASPECTS = ['4/5', '4/5', '4/5'] as const;

export function HeroCentered({ manifest, names: _names, siteSlug: _siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  const edition = manifest.edition ?? 'almanac';
  const motif = EDITION_MOTIF[edition] ?? 'pressed';
  const fallback = heroFallbackGradient(manifest);

  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: '12px 0 8px' }}>
      <MotifScatter motif={motif} density="sparse" />

      {/* Kicker → tagline → names → meta — same canonical stack as
          Postcard, but rendered WITHOUT the paper-card wrapper that
          differentiates Postcard. The page background shows through. */}
      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
      <HeroTagline manifest={manifest} onEditField={onEditField} />
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <HeroNames n1={n1} n2={n2} solo={context.solo} onEditNames={onEditNames} />
      </div>
      <HeroDateVenue dateInfo={dateInfo} venue={venue} manifest={manifest} onEditField={onEditField} />

      {/* Gold hairline — matches the prototype's KDivider call
          after meta in the default branch. */}
      <div
        aria-hidden
        style={{
          marginTop: 26,
          marginInline: 'auto',
          width: 220,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--pl-gold, var(--gold, #B8935A)) 50%, transparent)',
          opacity: 0.7,
        }}
      />

      {/* CTAs — primary + outline, mirrors the prototype's `buttons`
          variable rendered in the default branch. */}
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
            background: 'var(--card, transparent)',
            border: '1px solid var(--line, rgba(14,13,11,0.16))',
            color: 'var(--ink)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
          }}
        >
          Learn more
        </a>
      </div>

      {/* HeroPhotos — flat row of three rectangles. This is what
          the prototype's HeroPhotos call (line 359) renders for
          the default centered branch when look.photo isn't 'arch'.
          Tile 1 (middle) is the cover dropzone; tiles 0/2 slot
          into heroSlideshow[0] and heroSlideshow[2]. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          gap: 18,
          marginTop: 56,
          maxWidth: 760,
          marginInline: 'auto',
        }}
      >
        {TILE_TONES.map((tone, i) => {
          const isHeroCover = i === 1;
          const photoSrc = isHeroCover ? (coverPhoto ?? photos[0]) : photos[i];
          const onDrop = (url: string) => {
            if (isHeroCover) {
              onEditField?.((m) => ({ ...m, coverPhoto: url }));
            } else {
              onEditField?.((m) => {
                const next = [...(m.heroSlideshow ?? [])];
                next[i] = url;
                return { ...m, heroSlideshow: next };
              });
            }
          };
          return (
            <div key={i} style={{ flex: '1 1 0', minWidth: 0, maxWidth: 220 }}>
              <PhotoDropTarget
                onDrop={onDrop}
                label={isHeroCover ? 'Drop to set cover' : 'Drop a photo'}
              >
                <PhotoActionMenu
                  imageUrl={photoSrc}
                  onReplace={(url) => onDrop(url)}
                  onRemove={() => {
                    if (isHeroCover) {
                      onEditField?.((m) => {
                        const next = { ...m };
                        delete (next as { coverPhoto?: string }).coverPhoto;
                        return next;
                      });
                    } else {
                      onEditField?.((m) => {
                        const next = [...(m.heroSlideshow ?? [])];
                        next[i] = '';
                        return { ...m, heroSlideshow: next.filter(Boolean) };
                      });
                    }
                  }}
                >
                  <div
                    style={{
                      borderRadius: 'var(--pl-card-radius, 4px)',
                      overflow: 'hidden',
                      background: 'var(--card, #fff)',
                      boxShadow:
                        '0 14px 32px rgba(61,74,31,0.16), 0 1px 2px rgba(0,0,0,0.06)',
                    }}
                  >
                    {photoSrc ? (
                      <PhotoPlaceholder
                        tone={tone}
                        aspect={TILE_ASPECTS[i]}
                        src={photoSrc}
                      />
                    ) : (
                      <div
                        aria-hidden
                        data-pl-edition={fallback.editionId}
                        className={fallback.className}
                        style={{
                          width: '100%',
                          aspectRatio: TILE_ASPECTS[i],
                          background: fallback.background,
                        }}
                      />
                    )}
                  </div>
                </PhotoActionMenu>
              </PhotoDropTarget>
            </div>
          );
        })}
      </div>

      {/* Scroll-down nudge, matching Postcard. */}
      <div style={{ textAlign: 'center', marginTop: 36, color: 'var(--ink-muted)', fontSize: 12, opacity: 0.65 }}>
        <Icon name="chev-down" size={12} />
      </div>
    </div>
  );
}
