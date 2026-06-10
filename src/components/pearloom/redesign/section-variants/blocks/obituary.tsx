'use client';
 
/* Obituary section — a life, remembered.

   Data: manifest.memorial.obituary  — the SAME field the Memorial
   tool (MemorialPanel "Obituary" group) edits. ObituaryPanel is a
   thin editor over it.
     { dates?, body? }

   Variants (layouts.ts): letter (implemented) | columns. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ObituaryData { dates?: string; body?: string }

export function readObituary(manifest: BlockSectionProps['manifest']): ObituaryData {
  const loose = manifest as unknown as { memorial?: { obituary?: ObituaryData } };
  return loose.memorial?.obituary ?? {};
}

export function ObituarySection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* letter | columns — design agents dispatch here. */
  const data = readObituary(manifest);
  const body = data.body?.trim() ?? '';
  const empty = !body;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'obituaryEyebrow', 'In loving memory')}
        title={blockCopy(manifest, 'obituaryTitle', 'A life, remembered')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('obituaryEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('obituaryTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Write the remembrance in the Obituary panel (or the Memorial workspace)." />
      ) : (
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          {data.dates?.trim() && (
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 18 }}>
              {data.dates}
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            {body.split(/\n{2,}|\n/).filter((p) => p.trim()).map((p, i) => (
              <p
                key={i}
                style={{
                  fontFamily: 'var(--t-display)',
                  fontSize: 16.5,
                  lineHeight: 1.75,
                  color: 'var(--t-ink)',
                  margin: i === 0 ? 0 : '14px 0 0',
                }}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      )}
    </BlockFrame>
  );
}
