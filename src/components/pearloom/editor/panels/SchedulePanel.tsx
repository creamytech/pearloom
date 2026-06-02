'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx ScheduleEditor. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, PearChip, SectionPanelShell } from './_section-atoms';

interface ScheduleRow {
  t: string;
  l: string;
  s: string;
  tone: 'peach' | 'lavender' | 'sage';
}

const TONE_BY_INDEX: ScheduleRow['tone'][] = ['peach', 'lavender', 'sage', 'peach', 'lavender', 'sage'];

export function SchedulePanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  void onChange;
  // Read schedule items from manifest.events; fall back to prototype-style demo rows.
  const events = manifest.events ?? [];
  const rows: ScheduleRow[] = events.length > 0
    ? events.map((e, i) => ({
        t: e.time ?? '',
        l: e.name ?? '',
        s: e.venue ?? '',
        tone: TONE_BY_INDEX[i % TONE_BY_INDEX.length],
      }))
    : [
        { t: '4:30 pm', l: 'Ceremony', s: 'Clifftop', tone: 'peach' },
        { t: '5:30 pm', l: 'Cocktails', s: 'Caldera terrace', tone: 'lavender' },
        { t: '7:00 pm', l: 'Dinner', s: 'Long table', tone: 'sage' },
        { t: '9:00 pm', l: 'Dancing', s: 'Until late', tone: 'peach' },
      ];

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label={`Timeline · ${rows.length} moments`} action={<PearChip>Build from notes</PearChip>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <Icon name="drag" size={14} color="var(--ink-muted)" />
                <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${r.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="clock" size={14} color="#3D4A1F" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.l}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{r.t} · {r.s}</div>
                </div>
                <Icon name="more" size={14} color="var(--ink-muted)" />
              </div>
            ))}
            <AddCard label="Add a moment" />
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default SchedulePanel;
