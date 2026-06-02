'use client';

/* eslint-disable no-restricted-syntax */
/* =========================================================================
   PEARLOOM — SECTION EDITOR PRIMITIVES (literal port of section-fields.jsx)
   Shared atoms used by HeroPanel / StoryPanel / DetailsPanel / SchedulePanel
   / TravelPanel / RegistryPanel / GalleryPanel / RsvpPanel / FaqPanel.
   Every className + inline style here is verbatim from the prototype.
   ========================================================================= */

import { useState, type ReactNode, type CSSProperties } from 'react';
import { Icon, Pear } from '../../motifs';

export function FGroup({
  label,
  hint,
  children,
  action,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
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

export function FInput({
  value,
  onChange,
  placeholder,
  icon,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  icon?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && <Icon name={icon} size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />}
      <input
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: icon ? '10px 12px 10px 32px' : '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, color: 'var(--ink)', outline: 'none' }}
      />
    </div>
  );
}

export function FToggle({ label, sub, on, set }: { label: string; sub?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <button onClick={() => set(!on)} style={{ width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer', border: 'none' }}>
        <span style={{ position: 'absolute', top: 2.5, left: on ? 18.5 : 2.5, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

export function Stars({ r, size = 11 }: { r: number; size?: number }) {
  const full = Math.round(r);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} color={i <= full ? 'var(--gold)' : 'var(--cream-3)'} />)}
    </span>
  );
}

export function AddCard({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lift"
      style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}
    >
      <Icon name="plus" size={13} color="var(--ink-soft)" /> {label}
    </button>
  );
}

export function PearChip({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', cursor: 'pointer' }}
    >
      <Pear size={13} tone="sage" shadow={false} /> {children}
    </button>
  );
}

export function FToggleStandalone({ label, sub, def = false, onChange }: { label: string; sub?: string; def?: boolean; onChange?: (next: boolean) => void }) {
  const [on, set] = useState(!!def);
  if (onChange) {
    /* Controlled: defer to parent. */
    return <FToggle label={label} sub={sub} on={def} set={onChange} />;
  }
  return <FToggle label={label} sub={sub} on={on} set={set} />;
}

/* Outer wrapper used by every panel — pl8 className lets the prototype's
   .lift / .btn / .btn-outline / .btn-primary / .btn-sm classes resolve
   (those are scoped under .pl8 in src/app/pearloom.css). */
export function SectionPanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="pl8" style={{ padding: 14 } as CSSProperties}>
      {children}
    </div>
  );
}
