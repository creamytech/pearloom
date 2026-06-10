'use client';

 
/* CostSplitterPanel — Content tab for the Cost splitter section.
   THIN editor over manifest.bachelor.costs[] — the SAME field the
   Weekend planner tool (BachelorPanel) owns. No duplicate store:
   edits here show up there and vice versa. Unlike BachelorPanel,
   this panel never seeds demo rows — an empty list keeps the canvas
   section in its empty state. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { isBachelorOccasion, mkId, readOccasion, RemoveButton, ToolPointerCard, type BlockPanelProps } from './_shared';

interface CostRow { id: string; label: string; amount: string }

export function CostSplitterPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'costSplitter');
  const loose = manifest as unknown as { bachelor?: { costs?: CostRow[] } & Record<string, unknown> };
  const costs = Array.isArray(loose.bachelor?.costs) ? loose.bachelor.costs : [];

  const write = (next: CostRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), costs: next },
  } as unknown as StoryManifest);

  const total = costs.reduce((sum, c) => sum + (parseFloat((c.amount ?? '').replace(/[^\d.]/g, '')) || 0), 0);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label={`Line items · $${total.toFixed(0)} total`} hint="Group costs everyone chips in toward.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {costs.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <FInput
                  value={c.label}
                  onChange={(v) => write(costs.map((row, idx) => (idx === i ? { ...row, label: v } : row)))}
                  placeholder="House rental"
                />
                <div style={{ width: 100, flexShrink: 0 }}>
                  <FInput
                    value={c.amount}
                    onChange={(v) => write(costs.map((row, idx) => (idx === i ? { ...row, amount: v } : row)))}
                    placeholder="$0"
                  />
                </div>
                <RemoveButton label="Remove cost" onClick={() => write(costs.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <AddCard label="Add a cost" onClick={() => write([...costs, { id: mkId('c'), label: '', amount: '' }])} />
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
