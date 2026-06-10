'use client';

/* eslint-disable no-restricted-syntax */
/* PackingListPanel — Content tab for the Packing list section.
   THIN editor over manifest.bachelor.packing[] — the SAME field the
   Weekend planner tool (BachelorPanel) owns. Never seeds demo rows.

   Rows carry an optional `category` the canvas groups by (blank →
   "Essentials"). The panel mirrors that grouping: items are listed
   under their category header, the header is a rename field that
   retags every row in the group, and each group gets its own
   add-row. Guest check-offs are localStorage-only BY DESIGN (see
   section-variants/blocks/packing-list.tsx) — the hint says so. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { isBachelorOccasion, mkId, readOccasion, RemoveButton, ToolPointerCard, type BlockPanelProps } from './_shared';

interface PackingRow { id: string; item: string; category?: string }

interface PanelGroup {
  /** '' = the uncategorised bucket (renders as "Essentials"). */
  cat: string;
  rows: Array<{ row: PackingRow; idx: number }>;
}

function groupRows(packing: PackingRow[]): PanelGroup[] {
  const order: string[] = [];
  const map = new Map<string, PanelGroup['rows']>();
  packing.forEach((row, idx) => {
    const cat = (row.category ?? '').trim();
    if (!map.has(cat)) { map.set(cat, []); order.push(cat); }
    map.get(cat)!.push({ row, idx });
  });
  return order.map((cat) => ({ cat, rows: map.get(cat)! }));
}

export function PackingListPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'packingList');
  const loose = manifest as unknown as { bachelor?: { packing?: PackingRow[] } & Record<string, unknown> };
  const packing = Array.isArray(loose.bachelor?.packing) ? loose.bachelor.packing : [];

  const write = (next: PackingRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), packing: next },
  } as unknown as StoryManifest);

  const patchRow = (idx: number, p: Partial<PackingRow>) =>
    write(packing.map((r, i) => (i === idx ? { ...r, ...p } : r)));

  /* Renaming a group header retags every row in that group. Clearing
     it folds the group back into Essentials. */
  const renameGroup = (indexes: number[], v: string) =>
    write(packing.map((r, i) => (indexes.includes(i) ? { ...r, category: v } : r)));

  const groups = groupRows(packing);
  const hasGroups = groups.length > 1 || (groups.length === 1 && groups[0].cat !== '');

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label={`Items · ${packing.length}`}
          hint="What everyone should bring. Guests tick items off privately on their own device — checks never sync between guests."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map((group) => (
              <div key={group.cat || '__essentials'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hasGroups && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <FInput
                        value={group.cat}
                        onChange={(v) => renameGroup(group.rows.map((r) => r.idx), v)}
                        placeholder="Essentials"
                        icon="tag"
                      />
                    </div>
                    <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {group.rows.length} item{group.rows.length === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
                {group.rows.map(({ row, idx }) => (
                  <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: hasGroups ? 10 : 0 }}>
                    <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--line)', flexShrink: 0 }} />
                    <FInput
                      value={row.item}
                      onChange={(v) => patchRow(idx, { item: v })}
                      placeholder="Comfortable walking shoes"
                    />
                    <RemoveButton label="Remove item" onClick={() => write(packing.filter((_, i) => i !== idx))} />
                  </div>
                ))}
                <div style={{ paddingLeft: hasGroups ? 10 : 0 }}>
                  <AddCard
                    label={group.cat ? `Add to ${group.cat}` : (packing.length === 0 ? 'Add the first item' : 'Add an item')}
                    onClick={() => write([...packing, { id: mkId('pk'), item: '', category: group.cat }])}
                  />
                </div>
              </div>
            ))}
            {packing.length === 0 && (
              <AddCard
                label="Add the first item"
                onClick={() => write([{ id: mkId('pk'), item: '' }])}
              />
            )}
            {packing.length > 0 && (
              <AddCard
                label="Start a new category"
                onClick={() => write([...packing, { id: mkId('pk'), item: '', category: 'New category' }])}
              />
            )}
          </div>
        </FGroup>

        {isBachelorOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="bachelor"
            label="Also in the Weekend planner"
            body="Costs, polls, and rooms live there — same packing list, one store."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Packing list" />
      </div>
    </SectionPanelShell>
  );
}

export default PackingListPanel;
