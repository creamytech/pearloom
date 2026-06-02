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
function AddCard({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="lift" style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
      <Icon name="plus" size={13} color="var(--ink-soft)"/> {label}
    </button>
  );
}

type Store = { n: string; s: string; tone: string };
const TONES = ['peach', 'sage', 'lavender'];

export function RegistryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const reg = manifest.registry ?? { enabled: true };
  const entries = reg.entries ?? [];
  const [intro, setIntro] = useState(reg.message ?? 'Your presence is the gift — but if you insist…');

  const stores: Store[] = [];
  if (reg.cashFundUrl) {
    const pct = reg.cashFundTarget && reg.cashFundRaised
      ? Math.min(100, Math.round((reg.cashFundRaised / reg.cashFundTarget) * 100))
      : 62;
    stores.push({ n: 'Honeymoon fund', s: `${pct}% funded`, tone: 'peach' });
  }
  entries.forEach((e, i) => {
    stores.push({ n: e.name, s: e.note ?? 'Linked', tone: TONES[(stores.length + i) % TONES.length] });
  });
  if (stores.length === 0) {
    stores.push({ n: 'Honeymoon fund', s: '62% funded', tone: 'peach' });
    stores.push({ n: 'Crate & Barrel', s: '14 items left', tone: 'sage' });
    stores.push({ n: 'Zola', s: 'Linked', tone: 'lavender' });
  }

  const writeIntro = (v: string) => {
    setIntro(v);
    onChange({ ...manifest, registry: { ...reg, enabled: reg.enabled ?? true, message: v } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FGroup label="Intro line">
        <FInput value={intro} onChange={writeIntro}/>
      </FGroup>
      <FGroup label={`Linked registries · ${stores.length}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stores.map((st) => (
            <div key={st.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${st.tone}-2)`, display: 'grid', placeItems: 'center' } as CSSProperties}><Icon name="gift" size={14} color="#3D4A1F"/></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{st.n}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{st.s}</div></div>
              <Icon name="arrow-ur" size={13} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Link a registry" onClick={() => {
            const nextEntries = [...entries, { name: 'New registry', url: '' }];
            onChange({ ...manifest, registry: { ...reg, enabled: reg.enabled ?? true, entries: nextEntries } });
          }}/>
        </div>
      </FGroup>
    </div>
  );
}

export default RegistryPanel;

// Pear primitive imported but not directly referenced — silence the unused import warning
void Pear;
