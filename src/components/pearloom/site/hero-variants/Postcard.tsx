'use client';

// ──────────────────────────────────────────────────────────────
// Postcard — direct port of the design prototype's centered
// HeroBlock (shared/themed-site.jsx HeroBlock variant 'centered').
//
// Structure (top → bottom):
//   1. Lead eyebrow ("SAVE THE DATE") — peach-ink, all-caps, wide tracking
//   2. Tagline italic — Fraunces italic, ink-soft, 19px
//   3. Headline — huge serif names with italic "and" connector
//   4. Date+venue meta — inline icon + text, no tag pills
//   5. Horizontal hairline accent (small thread)
//   6. Primary RSVP + secondary "Read our story" outline — side by side
//   7. Three-arch hero photo treatment — wider middle, outer two
//      translated down 14px, all arch-topped via border-radius 50%/0
//
// This replaces the prior v8 layout (5-tile rotated polaroid strip,
// 3-link bottom tray with Add-to-Calendar / Save-Contact, scroll
// hint at the bottom) with the prototype's cleaner centered hero.
//
// Edit-mode wiring (onEditField, onEditNames, PhotoDropTarget,
// PhotoActionMenu) is preserved — the rewrite only changes layout +
// visual structure, not the editor's ability to mutate each field.
// ──────────────────────────────────────────────────────────────

import { Icon, PhotoPlaceholder } from '@/components/pearloom/motifs';
import { PhotoDropTarget } from '@/components/pearloom/editor/canvas/PhotoDropTarget';
import { PhotoActionMenu } from '@/components/pearloom/editor/canvas/PhotoActionMenu';
import { MotifScatter, type MotifKind } from '../MotifScatter';
import {
  HeroKicker, HeroNames, HeroDateVenue, HeroTagline,
  HeroPrimaryCta,
} from './parts';
import type { HeroVariantProps } from './types';

/* Per-Edition recommended motif — matches the prototype's themed
   look mapping. Almanac/garden = pressed flowers. Postcard Box +
   Linen Folder (mediterranean events) = olive sprig. Cinema + Quiet
   stay clean (no decorative motifs). */
const EDITION_MOTIF: Record<string, MotifKind> = {
  almanac: 'pressed',
  cinema: 'none',
  'postcard-box': 'olive',
  'linen-folder': 'olive',
  quiet: 'none',
};

/* Three-arch hero photo layout from the prototype's HeroPhotos
   (arch/deckle path). Middle photo is 150w + tallest 3:4; outer
   pair is 116w + 4:5 + translated 14px down. Arch shape = top
   corners at 50% radius (50% 50% 0 0) so the silhouette reads
   as a Mediterranean window. */
const ARCH_TONES = ['warm', 'dusk', 'lavender'] as const;
const ARCH_WIDTHS = [116, 150, 116] as const;
const ARCH_OFFSETS = [14, 0, 14] as const;
const ARCH_ASPECTS = ['4/5', '3/4', '4/5'] as const;

export function HeroPostcard({ manifest, names, siteSlug: _siteSlug, onEditField, onEditNames, context }: HeroVariantProps) {
  const { n1, n2, dateInfo, venue, deadlineStr, coverPhoto, photos } = context;
  const edition = manifest.edition ?? 'almanac';
  const motif = EDITION_MOTIF[edition] ?? 'pressed';
  return (
    <div style={{ position: 'relative' }}>
      {/* MOTIF SCATTER — port of the prototype's MotifScatter
          (themed-site.jsx HeroBlock). Decorative SVG sprigs /
          pressed flowers / olive branches scattered in the hero's
          corners. Per-Edition motif via EDITION_MOTIF mapping;
          density 'generous' on hero (two motifs, mirrored). */}
      <MotifScatter motif={motif} density="generous" />
      {/* 1. LEAD EYEBROW — uses Pearloom's existing HeroKicker which
            reads manifest.heroKicker (or derives from dateInfo
            weekday). Editable in edit mode. */}
      <HeroKicker manifest={manifest} dateInfo={dateInfo} onEditField={onEditField} />

      {/* 2. TAGLINE — italic line above the names (was below
            date+venue in v8; prototype's order is tagline-before-
            names so the eye reads: SAVE THE DATE → "together,
            tuesday" → Scott and Shauna). */}
      <HeroTagline manifest={manifest} onEditField={onEditField} />

      {/* 3. HEADLINE — big serif names with italic connector. */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <HeroNames n1={n1} n2={n2} onEditNames={onEditNames} />
      </div>

      {/* 4. META — inline calendar+date / pin+venue, NO tag pills.
            Pearloom's HeroDateVenue already renders inline icons +
            text in non-edit mode; in edit mode pills are clickable
            (preserved by the existing component). */}
      <HeroDateVenue dateInfo={dateInfo} venue={venue} manifest={manifest} onEditField={onEditField} />

      {/* 5. HORIZONTAL HAIRLINE ACCENT — small thread between the
            meta row and the CTAs. Mirrors the prototype's
            <KDivider/> width=200 below meta. */}
      <div
        aria-hidden
        style={{
          marginTop: 28,
          marginInline: 'auto',
          width: 200,
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--pl-olive, var(--gold)) 50%, transparent)',
          opacity: 0.55,
        }}
      />

      {/* 6. PRIMARY + SECONDARY CTAs — side by side. Primary RSVP
            uses Pearloom's existing HeroPrimaryCta; secondary
            "Learn more" is a paper-bg outline button that anchors
            to #our-story. Replaces the v8 HeroLinkTray (which had
            three link-style actions including Add-to-Calendar +
            Save-Contact). The dropped actions remain available on
            the published site via the standalone GuestKit
            components that mount elsewhere — they're just not in
            the hero CTA row anymore. */}
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
            transition: 'background 200ms ease, border-color 200ms ease',
          }}
        >
          Learn more
        </a>
      </div>

      {/* 7. THREE-ARCH HERO PHOTO TREATMENT — prototype's HeroPhotos
            arch path. Middle (cover) photo is the dropzone for
            coverPhoto; outer photos slot into heroSlideshow[0]
            and heroSlideshow[2]. Arch silhouette via
            border-radius: 50% 50% 0 0. */}
      <div
        className="pl8-hero-arch-strip"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 16,
          marginTop: 56,
        }}
      >
        {ARCH_TONES.map((tone, i) => {
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
            <div
              key={i}
              style={{
                width: ARCH_WIDTHS[i],
                transform: `translateY(${ARCH_OFFSETS[i]}px)`,
              }}
            >
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
                      /* Arch silhouette — top corners full-round,
                         bottom corners square. Inset shadow gives
                         the photo a Mediterranean-window depth. */
                      borderRadius: '50% 50% 0 0',
                      overflow: 'hidden',
                      background: 'var(--card, #fff)',
                      boxShadow:
                        '0 10px 28px rgba(61,74,31,0.14), 0 1px 2px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.6)',
                    }}
                  >
                    <PhotoPlaceholder
                      tone={tone}
                      aspect={ARCH_ASPECTS[i]}
                      src={photoSrc}
                    />
                  </div>
                </PhotoActionMenu>
              </PhotoDropTarget>
            </div>
          );
        })}
      </div>

      {/* Scroll-for-our-story affordance kept BUT moved to a
          smaller in-line chevron below the photos, not a separate
          large block. The prototype doesn't have this; Pearloom's
          v8 did. Keeping at minimal size as a wayfinding nudge. */}
      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--ink-muted)', fontSize: 12, opacity: 0.65 }}>
        <Icon name="chev-down" size={12} />
      </div>
    </div>
  );
}
