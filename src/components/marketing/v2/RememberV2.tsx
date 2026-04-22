'use client';

// Remember page orchestrator — composes hero, voices, photos,
// heirloom archive, time capsule + anniversary, closing.

import { useMemo } from 'react';
import { PD } from '../design/DesignAtoms';
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
import type { StoryManifest } from '@/types';

export function RememberV2() {
  const { site } = useSelectedSite();
  const toasts = useToasts(site?.id);
  const manifest = (site?.manifest ?? null) as StoryManifest | null;

  const photos = useMemo(() => flattenPhotos(manifest), [manifest]);
  const counts = useRememberCounts(manifest, toasts.items.length);

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
      <VoicesSection toasts={toasts.items} loading={toasts.loading} />
      <PhotosSection photos={photos} siteDomain={site?.domain} />
      <HeirloomArchive counts={counts} siteDomain={site?.domain} />
      <CapsuleAnniversary anniversaryDate={manifest?.logistics?.date} />
      <ClosingStrip />
    </div>
  );
}
