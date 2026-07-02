'use client';

/* eslint-disable no-restricted-syntax */
/* ProgramPanel — Content tab for the Program section (order of the
   ceremony). THIN editor over manifest.memorial.program[] — the
   SAME field the Memorial workspace (MemorialPanel "Order of
   service" group) owns. The field name is historical; it's the
   canonical order-of-service store for every ceremonial occasion
   (memorial, bar/bat mitzvah, quinceañera, baptism). Unlike
   MemorialPanel, this panel never seeds the default five moments —
   an empty list keeps the canvas in its empty state. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { moveItem, ReorderHandle } from '../_reorder';
import { isMemorialOccasion, mkId, readOccasion, RemoveButton, ToolPointerCard, type BlockPanelProps } from './_shared';

interface ProgramRow { id: string; name: string; detail?: string }

/* Roman numerals — mirrors toRoman in the canvas renderer
   (section-variants/blocks/program.tsx) so the panel previews the
   exact leaders the Numbered layout prints. Duplicated (not
   imported) so the editor/panels tree never pulls the redesign
   canvas into its module graph. */
function toRoman(n: number): string {
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let v = Math.floor(n);
  for (const [val, sym] of table) {
    while (v >= val) { out += sym; v -= val; }
  }
  return out || 'I';
}

export function ProgramPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'program');
  const loose = manifest as unknown as { memorial?: { program?: ProgramRow[] } & Record<string, unknown> };
  const program = Array.isArray(loose.memorial?.program) ? loose.memorial.program : [];

  const write = (next: ProgramRow[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    memorial: { ...(loose.memorial ?? {}), program: next },
  } as unknown as StoryManifest);

  const patchRow = (i: number, p: Partial<ProgramRow>) =>
    write(program.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label={`Order of service · ${program.length} moments`} hint="In the order guests will experience them — the Numbered layout prints these leaders as I · II · III.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {program.map((row, i) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <ReorderHandle
                  index={i}
                  count={program.length}
                  label={row.name || 'moment'}
                  onMove={(from, to) => write(moveItem(program, from, to))}
                />
                <span
                  title={`Moment ${i + 1}`}
                  style={{
                    minWidth: 28, height: 28, borderRadius: 8, padding: '0 5px',
                    background: 'var(--lavender-bg)',
                    color: 'var(--lavender-ink)',
                    display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4,
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    fontSize: 11.5, fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  {toRoman(i + 1)}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <FInput value={row.name} onChange={(v) => patchRow(i, { name: v })} placeholder="Processional" />
                  <FInput value={row.detail ?? ''} onChange={(v) => patchRow(i, { detail: v })} placeholder="Who, what, or which reading" />
                </div>
                <RemoveButton label={`Remove ${row.name || 'moment'}`} onClick={() => write(program.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <AddCard
              label={program.length === 0 ? 'Add the first moment' : 'Add a moment'}
              onClick={() => write([...program, { id: mkId('p'), name: '' }])}
            />
          </div>
        </FGroup>

        {isMemorialOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="memorial"
            label="Also in the Memorial workspace"
            body="Obituary + tribute wall live there — same order of service, one store."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Program" />
      </div>
    </SectionPanelShell>
  );
}

export default ProgramPanel;
