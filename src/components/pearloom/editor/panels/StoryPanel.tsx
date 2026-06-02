'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
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
function FInput({ value, onChange, placeholder, icon }: { value: string; onChange?: (v: string) => void; placeholder?: string; icon?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && <Icon name={icon} size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' } as CSSProperties}/>}
      <input value={value} onChange={(e) => onChange && onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: icon ? '10px 12px 10px 32px' : '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)', outline: 'none' }}/>
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

export function StoryPanel({ manifest, onChange }: { manifest: StoryManifest; names?: [string, string]; onChange: (m: StoryManifest) => void }) {
  const firstChapter = manifest.chapters?.[0] as any;
  const [headline, setHeadline] = useState<string>(firstChapter?.title ?? 'How we got here');
  const [body, setBody] = useState<string>((firstChapter?.body as string | undefined) ?? 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza…');

  const writeChapter = (next: { headline?: string; body?: string }) => {
    const newTitle = next.headline ?? headline;
    const newBody = next.body ?? body;
    const chapters = Array.isArray(manifest.chapters) ? [...manifest.chapters] : [];
    if (chapters[0]) {
      chapters[0] = { ...chapters[0], title: newTitle, body: newBody } as any;
    }
    onChange({ ...manifest, chapters: chapters as any });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FGroup label="Headline">
        <FInput value={headline} onChange={(v) => { setHeadline(v); writeChapter({ headline: v }); }}/>
      </FGroup>
      <FGroup label="Your story" action={<PearChip>Draft for me</PearChip>}>
        <textarea value={body} onChange={(e) => { setBody(e.target.value); writeChapter({ body: e.target.value }); }} rows={6} style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}/>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {['Shorten', 'Warmer', 'Funnier', 'More poetic'].map((s) => (
            <button key={s} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>{s}</button>
          ))}
        </div>
      </FGroup>
      <FGroup label="Highlight chips" hint="Little facts shown as pills.">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(manifest.hashtags && manifest.hashtags.length > 0 ? manifest.hashtags : ['Together since 2017', 'Santorini, Greece', 'Aegean blue']).map((c) => (
            <span key={c} style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: 'var(--lavender-bg)', color: 'var(--lavender-ink)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>{c} <Icon name="close" size={9} color="var(--lavender-ink)"/></span>
          ))}
          <button style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 999, border: '1px dashed var(--line)', color: 'var(--ink-soft)' }}>+ Add</button>
        </div>
      </FGroup>
    </div>
  );
}

export default StoryPanel;
