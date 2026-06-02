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

export function RsvpPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const rsvpConfig = manifest.rsvpConfig ?? ({} as NonNullable<StoryManifest['rsvpConfig']>);
  const [deadline, setDeadline] = useState(manifest.logistics?.rsvpDeadline ?? 'April 28, 2027');
  const [mealChoice, setMealChoice] = useState(((rsvpConfig as any).mealChoice as boolean | undefined) ?? true);
  const [dietary, setDietary] = useState(((rsvpConfig as any).dietary as boolean | undefined) ?? true);
  const [songRequests, setSongRequests] = useState(((rsvpConfig as any).songRequests as boolean | undefined) ?? true);
  const [plusOnes, setPlusOnes] = useState(((rsvpConfig as any).plusOnes as boolean | undefined) ?? false);

  const writeDeadline = (v: string) => {
    setDeadline(v);
    onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), rsvpDeadline: v } });
  };
  const writeConfig = (patch: Record<string, boolean>) => {
    onChange({ ...manifest, rsvpConfig: { ...(rsvpConfig as any), ...patch } as any });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FGroup label="Reply by">
        <FInput value={deadline} onChange={writeDeadline} icon="calendar"/>
      </FGroup>
      <FGroup label="Questions to ask">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FToggle label="Meal choice" sub="Chicken · Fish · Vegetarian" on={mealChoice} set={(v) => { setMealChoice(v); writeConfig({ mealChoice: v }); }}/>
          <FToggle label="Dietary restrictions" on={dietary} set={(v) => { setDietary(v); writeConfig({ dietary: v }); }}/>
          <FToggle label="Song request" on={songRequests} set={(v) => { setSongRequests(v); writeConfig({ songRequests: v }); }}/>
          <FToggle label="Plus-one" on={plusOnes} set={(v) => { setPlusOnes(v); writeConfig({ plusOnes: v }); }}/>
          <AddCard label="Add a custom question"/>
        </div>
      </FGroup>
      <FGroup label="After they reply" hint="Pear can chase non-responders for you.">
        <PearChip>Set up reminder cadence</PearChip>
      </FGroup>
    </div>
  );
}

export default RsvpPanel;
