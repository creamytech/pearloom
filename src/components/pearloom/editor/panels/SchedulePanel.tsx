'use client';

import { type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest, WeddingEvent } from '@/types';
import { Icon, Pear } from '@/components/pearloom/motifs';

function FGroup({ label, hint, children, action }: { label: string; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</label>
        {action}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
function PearChip({ children }: { children: ReactNode }) {
  return (
    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', cursor: 'pointer' }}>
      <Pear size={13} tone="sage" shadow={false}/> {children}
    </button>
  );
}
function AddCard({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="lift" style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
      <Icon name="plus" size={13} color="var(--ink-soft)"/> {label}
    </button>
  );
}

type Row = { t: string; l: string; s: string; tone: string };
const FALLBACK_ROWS: Row[] = [
  { t: '4:30 pm', l: 'Ceremony', s: 'Clifftop', tone: 'peach' },
  { t: '5:30 pm', l: 'Cocktails', s: 'Caldera terrace', tone: 'lavender' },
  { t: '7:00 pm', l: 'Dinner', s: 'Long table', tone: 'sage' },
  { t: '9:00 pm', l: 'Dancing', s: 'Until late', tone: 'peach' },
];
const TONES = ['peach', 'lavender', 'sage'];

export function SchedulePanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const events = manifest.events ?? [];
  const rows: Row[] = events.length > 0
    ? events.map((e: WeddingEvent, i: number) => ({
        t: (e.time as string | undefined) ?? '',
        l: (e.name as string | undefined) ?? '',
        s: ((e as any).location as string | undefined) ?? e.venue ?? '',
        tone: TONES[i % TONES.length],
      }))
    : FALLBACK_ROWS;

  const addEvent = () => {
    const next: WeddingEvent = {
      id: `evt-${Date.now()}`,
      name: 'New moment',
      type: 'other',
      date: '',
      time: '',
      venue: '',
      address: '',
    } as WeddingEvent;
    onChange({ ...manifest, events: [...events, next] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FGroup label={`Timeline · ${rows.length} moments`} action={<PearChip>Build from notes</PearChip>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <Icon name="drag" size={14} color="var(--ink-muted)"/>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${r.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0 } as CSSProperties}><Icon name="clock" size={14} color="#3D4A1F"/></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{r.t} · {r.s}</div>
              </div>
              <Icon name="more" size={14} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Add a moment" onClick={addEvent}/>
        </div>
      </FGroup>
    </div>
  );
}

export default SchedulePanel;
