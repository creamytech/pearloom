'use client';

// ──────────────────────────────────────────────────────────────
// Postcard — the v8 default. Centered editorial composition:
// kicker → big names → date+venue → tagline → primary CTA →
// link tray → countdown → photo strip at the bottom.
// ──────────────────────────────────────────────────────────────

import { Icon, PhotoPlaceholder } from '@/components/pearloom/motifs';
import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '@/components/pearloom/editor/canvas/PhotoActionMenu';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta, HeroLinkTray,
} from './parts';
import type { HeroVariantProps } from './types';

const STRIP_TONES = ['warm', 'field', 'lavender', 'dusk', 'peach'] as const;
const STRIP_ASPECTS = ['3/4', '4/5', '1/1', '5/4', '4/5'] as const;
const STRIP_OFFSETS = [0, -30, 20, -20, 10];

export function HeroPostcard({ manifest, names, siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  return (
    <>
      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <HeroNames n1={n1} n2={n2} onEditNames={onEditNames} />
      </div>
      <HeroDateVenue dateInfo={dateInfo} venue={venue} />
      <HeroTagline manifest={manifest} onEditField={onEditField} />
      <HeroPrimaryCta deadlineStr={deadlineStr} />
      <HeroLinkTray siteSlug={siteSlug} manifest={manifest} names={names} />

      {/* Photo strip — 5 hero polaroids at the bottom. The middle
          tile is the cover photo dropzone; the rest are slideshow. */}
      <div
        className="pl8-hero-strip"
        style={{
          marginTop: 80,
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr 1fr 1.4fr 1fr',
          gap: 14,
          alignItems: 'end',
        }}
      >
        {STRIP_TONES.map((tone, i) => {
          const isHeroCover = i === 2;
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
            <div
              key={i}
              style={{
                marginTop: STRIP_OFFSETS[i],
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.2}deg)`,
              }}
            >
              <PhotoDropTarget onDrop={onDrop} label={isHeroCover ? 'Drop to set cover' : 'Drop a photo'}>
                <PhotoActionMenu
                  imageUrl={isHeroCover ? (coverPhoto ?? photos[0]) : photos[i]}
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
                      background: '#fff',
                      padding: 8,
                      boxShadow: '0 16px 36px rgba(61,74,31,0.14), 0 1px 2px rgba(0,0,0,0.05)',
                      borderRadius: 2,
                    }}
                  >
                    <PhotoPlaceholder
                      tone={tone}
                      aspect={STRIP_ASPECTS[i]}
                      src={isHeroCover ? coverPhoto ?? photos[0] : photos[i]}
                    />
                  </div>
                </PhotoActionMenu>
              </PhotoDropTarget>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--ink-muted)', fontSize: 13 }}>
        <Icon name="chev-down" size={14} /> Scroll for our story
      </div>
    </>
  );
}
