'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RegistryEditor. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, SectionPanelShell } from './_section-atoms';

interface Store {
  n: string;
  s: string;
  tone: 'peach' | 'sage' | 'lavender';
}

export function RegistryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const intro = (manifest as unknown as { registryIntro?: string }).registryIntro ?? 'Your presence is the gift — but if you insist…';
  const stores: Store[] = [
    { n: 'Honeymoon fund', s: '62% funded', tone: 'peach' },
    { n: 'Crate & Barrel', s: '14 items left', tone: 'sage' },
    { n: 'Zola', s: 'Linked', tone: 'lavender' },
  ];

  const setIntro = (v: string) => onChange({ ...(manifest as unknown as Record<string, unknown>), registryIntro: v } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Intro line">
          <FInput value={intro} onChange={setIntro} />
        </FGroup>
        <FGroup label={`Linked registries · ${stores.length}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stores.map((st) => (
              <div key={st.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${st.tone}-2)`, display: 'grid', placeItems: 'center' }}>
                  <Icon name="gift" size={14} color="#3D4A1F" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{st.n}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{st.s}</div>
                </div>
                <Icon name="arrow-ur" size={13} color="var(--ink-muted)" />
              </div>
            ))}
            <AddCard label="Link a registry" />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default RegistryPanel;
