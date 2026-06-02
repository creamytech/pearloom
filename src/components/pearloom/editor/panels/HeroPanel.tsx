'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '@/components/pearloom/motifs';

/* ---------- shared field primitives ---------- */
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

export function HeroPanel({ manifest, names, onNamesChange, onChange }: { manifest: StoryManifest; names?: [string, string]; onNamesChange?: (n: [string, string]) => void; onChange: (m: StoryManifest) => void }) {
  const [tag, setTag] = useState(manifest.poetry?.heroTagline ?? 'together, finally');
  const [a, setA] = useState(names?.[0] ?? manifest.names?.[0] ?? 'Scott');
  const [b, setB] = useState(names?.[1] ?? manifest.names?.[1] ?? 'Shauna');

  const update = (next: Partial<{ tag: string; a: string; b: string }>) => {
    const nextTag = next.tag ?? tag;
    const nextA = next.a ?? a;
    const nextB = next.b ?? b;
    onNamesChange?.([nextA, nextB]);
    onChange({
      ...manifest,
      names: [nextA, nextB],
      poetry: {
        ...(manifest.poetry ?? { heroTagline: '', closingLine: '', rsvpIntro: '' }),
        heroTagline: nextTag,
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FGroup label="Tagline" action={<PearChip>3 styles</PearChip>}>
        <FInput value={tag} onChange={(v) => { setTag(v); update({ tag: v }); }} placeholder="A short line above the fold"/>
      </FGroup>
      <FGroup label="Names">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 6, alignItems: 'center' }}>
          <FInput value={a} onChange={(v) => { setA(v); update({ a: v }); }}/>
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>&amp;</div>
          <FInput value={b} onChange={(v) => { setB(v); update({ b: v }); }}/>
        </div>
      </FGroup>
      <FGroup label="Date & venue">
        <FInput value={manifest.logistics?.date ?? 'Monday, April 26, 2027'} icon="calendar"
          onChange={(v) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), date: v } })}/>
        <div style={{ height: 8 }}/>
        <FInput value={manifest.logistics?.venue ?? 'Casa Chorro · Santorini'} icon="pin"
          onChange={(v) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), venue: v } })}/>
      </FGroup>
      <FGroup label="Cover photo" hint="Drag a hero image, or let Pear pick from your gallery.">
        <div style={{ display: 'block', width: '100%', aspectRatio: '16/9', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)' }}/>
      </FGroup>
    </div>
  );
}

export default HeroPanel;
