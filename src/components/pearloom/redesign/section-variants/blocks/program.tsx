'use client';
 
/* Program section — the order of the ceremony.

   Data: manifest.memorial.program[]  — the SAME field the Memorial
   tool (MemorialPanel "Order of service" group) edits. The field
   name is historical: it's the canonical order-of-service store
   for EVERY ceremonial occasion (memorial, bar/bat mitzvah,
   quinceañera, baptism). ProgramPanel is a thin editor over it.
     { id, name, detail? }

   Variants (layouts.ts): classic (implemented) | numbered | centerline. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ProgramRowData { id?: string; name?: string; detail?: string }

export function readProgram(manifest: BlockSectionProps['manifest']): ProgramRowData[] {
  const loose = manifest as unknown as { memorial?: { program?: ProgramRowData[] } };
  return Array.isArray(loose.memorial?.program) ? loose.memorial.program : [];
}

export function ProgramSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* classic | numbered | centerline — design agents dispatch here. */
  const rows = readProgram(manifest).filter((r) => (r.name ?? '').trim());
  const empty = rows.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'programEyebrow', 'Order of service')}
        title={blockCopy(manifest, 'programTitle', 'The program')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('programEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('programTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Build the order of service in the Program panel (or the Memorial workspace)." />
      ) : (
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          {rows.map((row, i) => (
            <div
              key={row.id ?? i}
              style={{
                padding: '16px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
              }}
            >
              <div style={{ fontFamily: 'var(--t-display)', fontSize: 19, color: 'var(--t-ink)', lineHeight: 1.25 }}>
                {row.name}
              </div>
              {row.detail?.trim() && (
                <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--t-ink-soft)', marginTop: 4, lineHeight: 1.5 }}>
                  {row.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </BlockFrame>
  );
}
