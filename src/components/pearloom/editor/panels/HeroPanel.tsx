'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx HeroEditor. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { FGroup, FInput, PearChip, SectionPanelShell } from './_section-atoms';

export function HeroPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [n1, n2] = manifest.names ?? ['', ''];
  const tagline = (manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline ?? '';
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';

  const setTagline = (v: string) => onChange({ ...manifest, poetry: { ...(manifest as unknown as { poetry?: Record<string, unknown> }).poetry, heroTagline: v } } as StoryManifest);
  const setA = (v: string) => onChange({ ...manifest, names: [v, n2] });
  const setB = (v: string) => onChange({ ...manifest, names: [n1, v] });
  const setDate = (v: string) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), date: v } });
  const setVenue = (v: string) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), venue: v } });

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Tagline" action={<PearChip>3 styles</PearChip>}>
          <FInput value={tagline} onChange={setTagline} placeholder="A short line above the fold" />
        </FGroup>
        <FGroup label="Names">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 6, alignItems: 'center' }}>
            <FInput value={n1} onChange={setA} />
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>&amp;</div>
            <FInput value={n2} onChange={setB} />
          </div>
        </FGroup>
        <FGroup label="Date & venue">
          <FInput value={date} onChange={setDate} icon="calendar" placeholder="Monday, April 26, 2027" />
          <div style={{ height: 8 }} />
          <FInput value={venue} onChange={setVenue} icon="pin" placeholder="Casa Chorro · Santorini" />
        </FGroup>
        <FGroup label="Cover photo" hint="Drag a hero image, or let Pear pick from your gallery.">
          <div style={{ display: 'block', width: '100%', aspectRatio: '16/9', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)' }} />
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default HeroPanel;
