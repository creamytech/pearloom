'use client';
 
/* Cost splitter section — who owes what, settled gently.

   Data: manifest.bachelor.costs[]  — the SAME field the Weekend
   planner tool (BachelorPanel) edits. CostSplitterPanel is a thin
   editor over it; neither duplicates the store.
     { id, label, amount }   (amount = free-form dollar string)

   Read-only here — settlement / per-person share is design-agent
   work. Variants (layouts.ts): ledger (implemented) | cards. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface CostRowData { id?: string; label?: string; amount?: string }

export function readCosts(manifest: BlockSectionProps['manifest']): CostRowData[] {
  const loose = manifest as unknown as { bachelor?: { costs?: CostRowData[] } };
  return Array.isArray(loose.bachelor?.costs) ? loose.bachelor.costs : [];
}

function parseAmount(raw?: string): number {
  return parseFloat((raw ?? '').replace(/[^\d.]/g, '')) || 0;
}

export function CostSplitterSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* ledger | cards — design agents dispatch here. */
  const costs = readCosts(manifest).filter((c) => (c.label ?? '').trim() || (c.amount ?? '').trim());
  const empty = costs.length === 0;
  if (empty && !editable) return null;
  const total = costs.reduce((sum, c) => sum + parseAmount(c.amount), 0);

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'costSplitterEyebrow', 'The kitty')}
        title={blockCopy(manifest, 'costSplitterTitle', 'Who owes what')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('costSplitterEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('costSplitterTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add line items in the Cost splitter panel (or the Weekend planner)." />
      ) : (
        <div
          style={{
            maxWidth: 560,
            margin: '0 auto',
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 14px)',
            padding: '8px 22px',
          }}
        >
          {costs.map((c, i) => (
            <div
              key={c.id ?? i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 16,
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--t-ink)', minWidth: 0 }}>
                {c.label?.trim() || 'Untitled cost'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                ${parseAmount(c.amount).toFixed(0)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 16,
              padding: '14px 0 12px',
              borderTop: '1.5px solid var(--t-line)',
            }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-ink-soft)' }}>
              Together
            </span>
            <span style={{ fontFamily: 'var(--t-display)', fontSize: 20, color: 'var(--t-ink)', fontVariantNumeric: 'tabular-nums' }}>
              ${total.toFixed(0)}
            </span>
          </div>
        </div>
      )}
    </BlockFrame>
  );
}
