'use client';

/* eslint-disable no-restricted-syntax */
/* CostSplitterPanel — Content tab for the Cost splitter section.
   THIN editor over manifest.bachelor.costs[] — the SAME field the
   Weekend planner tool (BachelorPanel) owns. No duplicate store:
   edits here show up there and vice versa. Unlike BachelorPanel,
   this panel never seeds demo rows — an empty list keeps the canvas
   section in its empty state.

   Adds on top of the skeleton:
     - per-row "who paid" select (writes row.paidBy — extra optional
       field; BachelorPanel's {...row} patches preserve it). Existing
       payer names become select options; "Someone new…" flips the
       row to a text input.
     - "Split between" head count (manifest.bachelor.splitCount) that
       powers the per-person math on the site. Display + math only —
       no payment rails. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { isBachelorOccasion, mkId, readOccasion, RemoveButton, RowCard, ToolPointerCard, type BlockPanelProps } from './_shared';

interface CostRow { id: string; label: string; amount: string; paidBy?: string }

/* Who-paid select — native <select> over the names already used,
   falling back to a free-text input when there's nobody to pick yet
   (or when the host chooses "Someone new…"). */
function WhoPaidField({ value, payers, onChange }: { value: string; payers: string[]; onChange: (v: string) => void }) {
  const [typing, setTyping] = useState(false);
  const options = payers.filter((p) => p && p !== value);
  if (typing || (options.length === 0 && !value)) {
    return (
      <FInput
        value={value}
        onChange={(v) => { onChange(v); if (!typing) setTyping(true); }}
        placeholder="Who paid? (optional)"
        icon="user"
      />
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__new') { setTyping(true); onChange(''); return; }
        onChange(e.target.value);
      }}
      aria-label="Who paid"
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10,
        border: '1px solid var(--line)', background: 'var(--cream-2)',
        fontSize: 13, color: value ? 'var(--ink)' : 'var(--ink-muted)',
        fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
      }}
    >
      <option value="">Who paid? (optional)</option>
      {value && <option value={value}>{value}</option>}
      {options.map((p) => <option key={p} value={p}>{p}</option>)}
      <option value="__new">+ Someone new…</option>
    </select>
  );
}

export function CostSplitterPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'costSplitter');
  const loose = manifest as unknown as { bachelor?: { costs?: CostRow[]; splitCount?: string | number } & Record<string, unknown> };
  const costs = Array.isArray(loose.bachelor?.costs) ? loose.bachelor.costs : [];
  const splitCount = String(loose.bachelor?.splitCount ?? '');

  const writeBachelor = (next: Record<string, unknown>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), ...next },
  } as unknown as StoryManifest);

  const write = (next: CostRow[]) => writeBachelor({ costs: next });
  const patchRow = (i: number, p: Partial<CostRow>) =>
    write(costs.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const total = costs.reduce((sum, c) => sum + (parseFloat((c.amount ?? '').replace(/[^\d.]/g, '')) || 0), 0);
  const payers = Array.from(new Set(costs.map((c) => (c.paidBy ?? '').trim()).filter(Boolean)));
  const heads = parseInt(splitCount, 10);
  const perHead = Number.isFinite(heads) && heads > 0 ? total / heads : null;

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label={`Line items · $${total.toFixed(0)} total${perHead != null ? ` · $${perHead % 1 === 0 ? perHead.toFixed(0) : perHead.toFixed(2)} each` : ''}`}
          hint="Group costs everyone chips in toward."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {costs.map((c, i) => (
              <RowCard key={c.id}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <FInput
                    value={c.label}
                    onChange={(v) => patchRow(i, { label: v })}
                    placeholder="House rental"
                  />
                  <div style={{ width: 92, flexShrink: 0 }}>
                    <FInput
                      value={c.amount}
                      onChange={(v) => patchRow(i, { amount: v })}
                      placeholder="$0"
                    />
                  </div>
                  <RemoveButton label="Remove cost" onClick={() => write(costs.filter((_, idx) => idx !== i))} />
                </div>
                <WhoPaidField
                  value={(c.paidBy ?? '').trim()}
                  payers={payers}
                  onChange={(v) => patchRow(i, { paidBy: v })}
                />
              </RowCard>
            ))}
            <AddCard label="Add a cost" onClick={() => write([...costs, { id: mkId('c'), label: '', amount: '' }])} />
          </div>
        </FGroup>

        <FGroup
          label="Split between"
          hint="How many people share the bill. Powers the per-person share and the settle-up line on the site — display only, no payments."
        >
          <div style={{ width: 130 }}>
            <FInput
              type="number"
              value={splitCount}
              onChange={(v) => writeBachelor({ splitCount: v })}
              placeholder={payers.length > 1 ? String(payers.length) : '6'}
              icon="users"
            />
          </div>
        </FGroup>

        {isBachelorOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="bachelor"
            label="Also in the Weekend planner"
            body="Polls, packing, rooms, and the group chat link live there — same costs, one store."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Cost splitter" />
      </div>
    </SectionPanelShell>
  );
}

export default CostSplitterPanel;
