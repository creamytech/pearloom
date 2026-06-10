'use client';

/* eslint-disable no-restricted-syntax */
/* PackingListPanel — Content tab for the Packing list section.
   THIN editor over manifest.bachelor.packing[] — the SAME field the
   Weekend planner tool (BachelorPanel) owns. Never seeds demo rows. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { isBachelorOccasion, mkId, readOccasion, RemoveButton, ToolPointerCard, type BlockPanelProps } from './_shared';

interface PackingRow { id: string; item: string }

export function PackingListPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'packingList');
  const loose = manifest as unknown as { bachelor?: { packing?: PackingRow[] } & Record<string, unknown> };
  const packing = Array.isArray(loose.bachelor?.packing) ? loose.bachelor.packing : [];

  const write = (next: PackingRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), packing: next },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label={`Items · ${packing.length}`} hint="What everyone should bring.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {packing.map((row, i) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--line)', flexShrink: 0 }} />
                <FInput
                  value={row.item}
                  onChange={(v) => write(packing.map((p, idx) => (idx === i ? { ...p, item: v } : p)))}
                  placeholder="Comfortable walking shoes"
                />
                <RemoveButton label="Remove item" onClick={() => write(packing.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <AddCard
              label={packing.length === 0 ? 'Add the first item' : 'Add an item'}
              onClick={() => write([...packing, { id: mkId('pk'), item: '' }])}
            />
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
