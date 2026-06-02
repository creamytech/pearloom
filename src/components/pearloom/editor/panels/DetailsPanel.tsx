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
function FToggle({ label, sub, on, set }: { label: string; sub?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <button onClick={() => set(!on)} style={{ width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer' }}>
        <span style={{ position: 'absolute', top: 2.5, left: on ? 18.5 : 2.5, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}/>
      </button>
    </div>
  );
}
function FToggleStandalone({ label, sub, def }: { label: string; sub?: string; def?: boolean }) {
  const [on, set] = useState(!!def);
  return <FToggle label={label} sub={sub} on={on} set={set}/>;
}
function AddCard({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="lift" style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
      <Icon name="plus" size={13} color="var(--ink-soft)"/> {label}
    </button>
  );
}

export function DetailsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [dressCode, setDressCode] = useState(manifest.logistics?.dresscode ?? 'Aegean formal — linen & light colors');
  const customCards = manifest.details?.customCards ?? [];
  const presetCards: Array<[string, string]> = [
    ['Dress code', manifest.logistics?.dresscode ?? 'Aegean formal'],
    ['Parking', manifest.details?.parking ?? 'Valet on-site'],
    ['Weather', 'Warm evenings, ~22°C'],
  ];
  const cards: Array<[string, string]> = customCards.length > 0
    ? customCards.map((c) => [c.title, c.body])
    : presetCards;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FGroup label="Dress code">
        <FInput value={dressCode} onChange={(v) => { setDressCode(v); onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), dresscode: v } }); }} icon="sparkles"/>
      </FGroup>
      <FToggleStandalone label="Kids welcome" sub="Shown on the details card" def={false}/>
      <FToggleStandalone label="Adults-only evening" def={true}/>
      <FGroup label="Good-to-know cards" hint="Up to three quick facts.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map(([l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}><Icon name="sparkles" size={13} color="var(--ink-soft)"/></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{v}</div></div>
              <Icon name="more" size={13} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Add a detail" onClick={() => {
            const id = `card-${Date.now()}`;
            const nextCards = [...customCards, { id, title: 'New detail', body: '' }];
            onChange({ ...manifest, details: { ...(manifest.details ?? {}), customCards: nextCards } });
          }}/>
        </div>
      </FGroup>
    </div>
  );
}

export default DetailsPanel;
