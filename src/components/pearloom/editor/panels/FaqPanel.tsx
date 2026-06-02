'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx FaqEditor. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, PearChip, SectionPanelShell } from './_section-atoms';

export function FaqPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  void onChange;
  const qs: string[] = manifest.faqs?.map((q) => q.question ?? '').filter(Boolean) ?? [
    'What is the dress code?',
    'Can I bring a guest?',
    'Are children welcome?',
    'Where should we stay?',
  ];
  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label={`Questions · ${qs.length}`} action={<PearChip>Suggest from data</PearChip>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {qs.map((qn, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <Icon name="drag" size={13} color="var(--ink-muted)" />
                <span style={{ flex: 1, fontSize: 12.5 }}>{qn}</span>
                <Icon name="chev-down" size={13} color="var(--ink-muted)" />
              </div>
            ))}
            <AddCard label="Add a question" />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default FaqPanel;
