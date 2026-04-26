'use client';

// ──────────────────────────────────────────────────────────────
// Carousel — horizontal scroll-snap reel of slideshow photos sits
// ABOVE the names. Reads as a magazine spread with a scrolling
// strip of moments at the top. Best for couples with many
// great photos who want all of them visible.
// ──────────────────────────────────────────────────────────────

import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoPlaceholder } from '@/components/pearloom/motifs';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, HeroLinkTray,
} from './parts';
import type { HeroVariantProps } from './types';

const STRIP_TONES = ['warm', 'lavender', 'dusk', 'peach', 'field', 'cream'] as const;

export function HeroCarousel({ manifest, names, siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;

  // Up to 6 slots: cover + 5 slideshow.
  const slots: Array<{ url?: string; isCover: boolean; idx: number }> = [];
  slots.push({ url: coverPhoto ?? photos[0], isCover: true, idx: 0 });
  for (let i = 1; i < 6; i++) {
    slots.push({ url: photos[i] ?? photos[i - 1], isCover: false, idx: i });
  }

  return (
    <>
      {/* Reel — full-bleed horizontal scroll-snap. */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          padding: '4px 32px 28px',
          margin: '0 -32px 40px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slots.map((s, i) => {
          const onDrop = (url: string) => {
            if (s.isCover) onEditField?.((m) => ({ ...m, coverPhoto: url }));
            else onEditField?.((m) => {
              const next = [...(m.heroSlideshow ?? [])];
              next[s.idx] = url;
              return { ...m, heroSlideshow: next };
            });
          };
          return (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: 'min(360px, 70cqw)',
                aspectRatio: '4/5',
                scrollSnapAlign: 'center',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 16px 36px rgba(61,74,31,0.14)',
              }}
            >
              <PhotoDropTarget onDrop={onDrop} label={s.isCover ? 'Drop cover' : 'Drop a photo'}>
                {s.url ? (
                  <div style={{ width: '100%', height: '100%', background: `url(${s.url}) center/cover no-repeat` }} />
                ) : (
                  <PhotoPlaceholder tone={STRIP_TONES[i]} aspect="4/5" />
                )}
              </PhotoDropTarget>
            </div>
          );
        })}
      </div>

      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <HeroNames n1={n1} n2={n2} onEditNames={onEditNames} />
      </div>
      <HeroDateVenue dateInfo={dateInfo} venue={venue} />
      <HeroTagline manifest={manifest} onEditField={onEditField} />
      <HeroPrimaryCta deadlineStr={deadlineStr} />
      <HeroLinkTray siteSlug={siteSlug} manifest={manifest} names={names} />
    </>
  );
}
