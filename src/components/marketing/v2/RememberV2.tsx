'use client';

// Remember page orchestrator — composes hero, voices, photos,
// heirloom archive, time capsule + anniversary, closing.
// Non-wedding occasions swap the wedding-centric middle sections
// for a leaner per-occasion card grid driven by dashboard-presets.

import Link from 'next/link';
import { useMemo } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../design/DesignAtoms';
import { useSelectedSite } from '../design/dash/hooks';
import { useToasts } from './DayOfHooks';
import { flattenPhotos, useRememberCounts } from './RememberHooks';
import { RememberHero } from './RememberHero';
import {
  VoicesSection,
  PhotosSection,
  HeirloomArchive,
  CapsuleAnniversary,
  ClosingStrip,
} from './RememberSections';
import {
  getRememberHeadline,
  getRememberSections,
  type RememberSection,
} from '@/lib/event-os/dashboard-presets';
import { getEventType } from '@/lib/event-os/event-types';
import type { StoryManifest } from '@/types';

function sectionTone(tone: RememberSection['tone']) {
  switch (tone) {
    case 'peach':    return { bg: '#F1D7CE', ink: PD.terra };
    case 'lavender': return { bg: '#E4DFF1', ink: PD.plum };
    case 'sage':     return { bg: '#E6EAC8', ink: PD.olive };
    case 'cream':
    default:         return { bg: PD.paper3, ink: PD.ink };
  }
}

function OccasionSectionsGrid({ occasion }: { occasion?: string | null }) {
  const headline = getRememberHeadline(occasion);
  const sections = getRememberSections(occasion);
  return (
    <section style={{ padding: '72px 40px', background: PD.paper, borderTop: `1px solid ${PD.paper3}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ ...MONO_STYLE, fontSize: 10, letterSpacing: '0.18em', color: PD.gold, marginBottom: 10 }}>
          {headline.eyebrow.toUpperCase()}
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 52,
            lineHeight: 1.02,
            margin: '0 0 18px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
        >
          {headline.title}{' '}
          <i style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1', color: PD.olive }}>
            {headline.italic}
          </i>
        </h2>
        <p style={{ fontSize: 15, color: PD.inkSoft, maxWidth: 640, marginBottom: 32, lineHeight: 1.55 }}>
          {headline.body}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          {sections.map((s) => {
            const tone = sectionTone(s.tone);
            return (
              <div
                key={s.id}
                style={{
                  background: tone.bg,
                  borderRadius: 20,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 200,
                }}
              >
                <div style={{ ...MONO_STYLE, fontSize: 10, color: tone.ink, letterSpacing: '0.12em' }}>
                  {s.icon.toUpperCase()}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 24,
                    fontWeight: 400,
                    lineHeight: 1.1,
                    letterSpacing: '-0.01em',
                    color: tone.ink,
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 13.5, color: PD.inkSoft, lineHeight: 1.5, flex: 1 }}>
                  {s.body}
                </div>
                <Link
                  href={s.ctaHref}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: tone.ink,
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                  }}
                >
                  {s.ctaLabel} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RememberV2() {
  const { site } = useSelectedSite();
  const toasts = useToasts(site?.id);
  const manifest = (site?.manifest ?? null) as StoryManifest | null;

  const photos = useMemo(() => flattenPhotos(manifest), [manifest]);
  const counts = useRememberCounts(manifest, toasts.items.length);

  const occasion = site?.occasion ?? null;
  const preset = getEventType(occasion as never)?.rsvpPreset ?? 'wedding';
  const isWeddingArc = preset === 'wedding' || preset === 'cultural';

  return (
    <div style={{ background: PD.paper, minHeight: '100%' }}>
      <RememberHero
        manifest={manifest}
        onWatch={() => {
          if (site?.domain) window.open(`/sites/${site.domain}/recap`, '_blank');
        }}
        onPeek={() => {
          if (site?.domain) window.open(`/sites/${site.domain}`, '_blank');
        }}
      />
      {isWeddingArc ? (
        <>
          <VoicesSection toasts={toasts.items} loading={toasts.loading} />
          <PhotosSection photos={photos} siteDomain={site?.domain} />
          <HeirloomArchive counts={counts} siteDomain={site?.domain} />
          <CapsuleAnniversary anniversaryDate={manifest?.logistics?.date} />
        </>
      ) : (
        <>
          <PhotosSection photos={photos} siteDomain={site?.domain} />
          <OccasionSectionsGrid occasion={occasion} />
        </>
      )}
      <ClosingStrip />
    </div>
  );
}
