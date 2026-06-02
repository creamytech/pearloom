'use client';

import { type CSSProperties, type ReactNode } from 'react';
import type { StoryManifest, FaqItem } from '@/types';
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

const FALLBACK_QS = ['What is the dress code?', 'Can I bring a guest?', 'Are children welcome?', 'Where should we stay?'];

export function FaqPanel({ manifest, onChange }: { manifest: StoryManifest; names?: [string, string]; onChange: (m: StoryManifest) => void }) {
  const items = (manifest.faqs ?? []) as FaqItem[];
  const qs = items.length > 0 ? items.map((it) => it.question ?? '') : FALLBACK_QS;

  const addQuestion = () => {
    const next: FaqItem = { id: `faq-${Date.now()}`, question: 'New question', answer: '' } as any;
    onChange({ ...manifest, faqs: [...items, next] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FGroup label={`Questions · ${qs.length}`} action={<PearChip>Suggest from data</PearChip>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {qs.map((qn, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <Icon name="drag" size={13} color="var(--ink-muted)"/>
              <span style={{ flex: 1, fontSize: 12.5 }}>{qn}</span>
              <Icon name="chev-down" size={13} color="var(--ink-muted)"/>
            </div>
          ))}
          <AddCard label="Add a question" onClick={addQuestion}/>
        </div>
      </FGroup>
    </div>
  );
}

export default FaqPanel;

// Ensure CSSProperties used; suppress unused
type _CSS = CSSProperties;
