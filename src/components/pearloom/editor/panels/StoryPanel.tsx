'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx StoryEditor. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, PearChip, SectionPanelShell } from './_section-atoms';

export function StoryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const story = (manifest as unknown as { storySection?: { headline?: string; body?: string; chips?: string[] } }).storySection ?? {};
  const headline = story.headline ?? '';
  const body = story.body ?? '';
  const chips = story.chips ?? ['Together since 2017', 'Santorini, Greece', 'Aegean blue'];

  const patch = (next: Partial<{ headline: string; body: string; chips: string[] }>) =>
    onChange({ ...manifest, storySection: { ...story, ...next } } as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Headline">
          <FInput value={headline} onChange={(v) => patch({ headline: v })} placeholder="How we got here" />
        </FGroup>
        <FGroup label="Your story" action={<PearChip>Draft for me</PearChip>}>
          <textarea
            value={body}
            onChange={(e) => patch({ body: e.target.value })}
            rows={6}
            placeholder="We met on an ordinary Tuesday…"
            style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {['Shorten', 'Warmer', 'Funnier', 'More poetic'].map((s) => (
              <button key={s} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer' }}>{s}</button>
            ))}
          </div>
        </FGroup>
        <FGroup label="Highlight chips" hint="Little facts shown as pills.">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c) => (
              <span key={c} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--lavender-bg)', color: 'var(--lavender-ink)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                {c} <Icon name="close" size={9} color="var(--lavender-ink)" />
              </span>
            ))}
            <button style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, border: '1px dashed var(--line)', color: 'var(--ink-soft)', background: 'transparent', cursor: 'pointer' }}>+ Add</button>
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default StoryPanel;
