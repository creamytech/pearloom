'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RegistryEditor —
   intro line + editable store list. Writes manifest.registryIntro
   + manifest.registryStores[] which ThemedSite's RegistryBlock reads. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, SectionPanelShell } from './_section-atoms';

const TONES: Array<'peach' | 'sage' | 'lavender'> = ['peach', 'sage', 'lavender'];

const DEFAULT_STORES: string[] = ['Honeymoon fund', 'Crate & Barrel', 'Zola'];

export function RegistryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const intro = ((manifest as unknown as { registryIntro?: string }).registryIntro) ?? 'Your presence is the gift — but if you insist…';
  const stores: string[] = ((manifest as unknown as { registryStores?: string[] }).registryStores) ?? DEFAULT_STORES;

  const setIntro = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    registryIntro: v,
  } as unknown as StoryManifest);
  const writeStores = (next: string[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    registryStores: next,
  } as unknown as StoryManifest);
  const patchStore = (i: number, value: string) => writeStores(stores.map((s, idx) => idx === i ? value : s));
  const removeStore = (i: number) => writeStores(stores.filter((_, idx) => idx !== i));
  const addStore = () => writeStores([...stores, 'New registry']);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Intro line">
          <FInput value={intro} onChange={setIntro} />
        </FGroup>
        <FGroup label={`Linked registries · ${stores.length}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stores.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${TONES[i % TONES.length]}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="gift" size={14} color="#3D4A1F" />
                </span>
                <div style={{ flex: 1 }}>
                  <FInput value={s} onChange={(v) => patchStore(i, v)} placeholder="Registry name" />
                </div>
                <button
                  type="button"
                  onClick={() => removeStore(i)}
                  aria-label={`Remove ${s}`}
                  style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)' }}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
            <AddCard label="Link a registry" onClick={addStore} />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default RegistryPanel;
