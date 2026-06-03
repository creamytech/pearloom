'use client';

/* eslint-disable no-restricted-syntax */
/* GalleryPanel — host-editable photo tones + Guest uploads toggle.
   Writes manifest.galleryTones[] (6-tone array) + manifest.guestUploads
   which ThemedSite's GalleryBlock reads. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, FToggleStandalone, PearChip, SectionPanelShell, useCopyOverride } from './_section-atoms';

const PALETTE_TONES = ['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'] as const;
type GalleryTone = (typeof PALETTE_TONES)[number];

export function GalleryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const tones: GalleryTone[] = ((manifest as unknown as { galleryTones?: GalleryTone[] }).galleryTones) ?? [...PALETTE_TONES];
  const guestUploads = ((manifest as unknown as { guestUploads?: boolean }).guestUploads) ?? true;
  const [galleryEyebrow, setGalleryEyebrow] = useCopyOverride(manifest, onChange, 'galleryEyebrow');

  const setTones = (next: GalleryTone[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    galleryTones: next,
  } as unknown as StoryManifest);

  const cycleTone = (i: number) => {
    const cur = tones[i];
    const idx = PALETTE_TONES.indexOf(cur);
    const nextTone = PALETTE_TONES[(idx + 1) % PALETTE_TONES.length];
    setTones(tones.map((t, j) => j === i ? nextTone : t));
  };

  const setGuestUploads = (v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    guestUploads: v,
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={galleryEyebrow} onChange={setGalleryEyebrow} placeholder="Gallery" />
        </FGroup>
        <FGroup label={`Photos · ${tones.length}`} action={<PearChip>Auto-arrange</PearChip>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {tones.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => cycleTone(i)}
                title={`Cycle tone (${t})`}
                style={{
                  aspectRatio: '1/1',
                  borderRadius: 8,
                  background: `linear-gradient(140deg, var(--${t}-2, var(--cream-3)), var(--cream-2))`,
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setTones([...tones, 'warm'])}
              style={{ aspectRatio: '1/1', borderRadius: 8, border: '1.5px dashed var(--line)', display: 'grid', placeItems: 'center', background: 'transparent', cursor: 'pointer' }}
            >
              <Icon name="plus" size={16} color="var(--ink-soft)" />
            </button>
          </div>
        </FGroup>
        <FToggleStandalone
          label="Guest photo uploads"
          sub="Let guests add to a shared album"
          def={guestUploads}
          onChange={setGuestUploads}
        />
      </div>
    </SectionPanelShell>
  );
}

export default GalleryPanel;
