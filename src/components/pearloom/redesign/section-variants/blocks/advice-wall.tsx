'use client';
 
/* Advice wall section — words for the honoree.

   Data: manifest.adviceWall  (written by AdviceWallPanel)
     { prompt?, entries?: [{ id, from, body }] }
   Prompt falls back to manifest.memorial.tributePrompt on memorial
   sites (MemorialPanel's Tribute wall group owns that field) so a
   memorial host who configured the tribute prompt there sees it
   here without re-typing.

   Rendered READ-ONLY (host-seeded entries) — guest submission +
   moderation (POST /api/event-os/submissions) is design-agent
   work. Variants (layouts.ts): wall (implemented) | cards | letters. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface AdviceEntryData { id?: string; from?: string; body?: string }

export function readAdviceWall(manifest: BlockSectionProps['manifest']): {
  prompt: string;
  entries: AdviceEntryData[];
} {
  const loose = manifest as unknown as {
    adviceWall?: { prompt?: string; entries?: AdviceEntryData[] };
    memorial?: { tributePrompt?: string };
  };
  return {
    prompt: loose.adviceWall?.prompt?.trim() || loose.memorial?.tributePrompt?.trim() || '',
    entries: Array.isArray(loose.adviceWall?.entries) ? loose.adviceWall.entries : [],
  };
}

export function AdviceWallSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* wall | cards | letters — design agents dispatch here. */
  const { prompt, entries: raw } = readAdviceWall(manifest);
  const entries = raw.filter((e) => (e.body ?? '').trim());
  const empty = entries.length === 0 && !prompt;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad} background="var(--t-section)">
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'adviceWallEyebrow', 'In your words')}
        title={blockCopy(manifest, 'adviceWallTitle', 'Words for the honoree')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('adviceWallEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('adviceWallTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Set a prompt or seed a few notes in the Advice wall panel." />
      ) : (
        <>
          {prompt && (
            <div
              style={{
                fontFamily: 'var(--t-display)',
                fontStyle: 'italic',
                fontSize: 16.5,
                color: 'var(--t-ink-soft)',
                textAlign: 'center',
                maxWidth: 520,
                margin: '0 auto 24px',
                lineHeight: 1.5,
              }}
            >
              {prompt}
            </div>
          )}
          {entries.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {entries.map((e, i) => (
                <div
                  key={e.id ?? i}
                  style={{
                    background: 'var(--t-card)',
                    border: '1px solid var(--t-line)',
                    borderRadius: 'var(--t-radius-lg, 14px)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 13.5, color: 'var(--t-ink)', lineHeight: 1.6 }}>
                    {e.body}
                  </div>
                  {e.from?.trim() && (
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginTop: 'auto' }}>
                      — {e.from}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </BlockFrame>
  );
}
