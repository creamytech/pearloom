'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx GalleryEditor. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FToggleStandalone, PearChip, SectionPanelShell } from './_section-atoms';

export function GalleryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  void manifest;
  void onChange;
  const tones = ['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream'];
  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Photos · 38" action={<PearChip>Auto-arrange</PearChip>}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {tones.map((t, i) => (
              <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, background: `linear-gradient(140deg, var(--${t}-2, var(--cream-3)), var(--cream-2))` }} />
            ))}
            <button style={{ aspectRatio: '1/1', borderRadius: 8, border: '1.5px dashed var(--line)', display: 'grid', placeItems: 'center', background: 'transparent', cursor: 'pointer' }}>
              <Icon name="plus" size={16} color="var(--ink-soft)" />
            </button>
          </div>
        </FGroup>
        <FToggleStandalone label="Guest photo uploads" sub="Let guests add to a shared album" def={true} />
      </div>
    </SectionPanelShell>
  );
}

export default GalleryPanel;
