'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx DetailsEditor. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FToggleStandalone, SectionPanelShell } from './_section-atoms';

export function DetailsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const dressCode = (manifest as unknown as { dressCode?: string }).dressCode ?? 'Aegean formal — linen & light colors';
  const cards = (manifest as unknown as { detailsCards?: [string, string][] }).detailsCards ?? [
    ['Dress code', 'Aegean formal'],
    ['Parking', 'Valet on-site'],
    ['Weather', 'Warm evenings, ~22°C'],
  ];

  const setDressCode = (v: string) => onChange({ ...(manifest as unknown as Record<string, unknown>), dressCode: v } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Dress code">
          <FInput value={dressCode} onChange={setDressCode} icon="sparkles" />
        </FGroup>
        <FToggleStandalone label="Kids welcome" sub="Shown on the details card" def={false} />
        <FToggleStandalone label="Adults-only evening" def={true} />
        <FGroup label="Good-to-know cards" hint="Up to three quick facts.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cards.map(([l, v]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="sparkles" size={13} color="var(--ink-soft)" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{v}</div>
                </div>
                <Icon name="more" size={13} color="var(--ink-muted)" />
              </div>
            ))}
            <AddCard label="Add a detail" />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default DetailsPanel;
