'use client';
 
/* Packing list section — what to bring.

   Data: manifest.bachelor.packing[]  — the SAME field the Weekend
   planner tool (BachelorPanel) edits. PackingListPanel is a thin
   editor over it.
     { id, item }

   Rendered READ-ONLY here — per-guest check-off (localStorage per
   site slug, like the legacy PackingListBlock) is design-agent
   work. Variants (layouts.ts): checklist (implemented) | grid. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface PackingRowData { id?: string; item?: string }

export function readPacking(manifest: BlockSectionProps['manifest']): PackingRowData[] {
  const loose = manifest as unknown as { bachelor?: { packing?: PackingRowData[] } };
  return Array.isArray(loose.bachelor?.packing) ? loose.bachelor.packing : [];
}

export function PackingListSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* checklist | grid — design agents dispatch here. */
  const items = readPacking(manifest).filter((p) => (p.item ?? '').trim());
  const empty = items.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'packingListEyebrow', 'Be ready')}
        title={blockCopy(manifest, 'packingListTitle', 'What to bring')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('packingListEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('packingListTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add items in the Packing list panel (or the Weekend planner)." />
      ) : (
        <div
          style={{
            maxWidth: 440,
            margin: '0 auto',
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 14px)',
            padding: '14px 22px',
          }}
        >
          {items.map((row, i) => (
            <div
              key={row.id ?? i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: '1.5px solid var(--t-accent)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 14, color: 'var(--t-ink)' }}>{row.item}</span>
            </div>
          ))}
        </div>
      )}
    </BlockFrame>
  );
}
