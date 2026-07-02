'use client';

/* Dress code section — what to wear, in one glance.

   Data: manifest.dressCodeSection  (typed in src/types.ts)
     { code?, note?, palette?, examples? }
   `code` is the headline ("Garden formal"), `note` a sentence,
   `palette` optional hex swatches guests can dress to, `examples`
   do/don't-style chips ("Linen suits", "No white").
   DressCodePanel (editor/panels/blocks/DressCodePanel.tsx) is the
   editor over the same field.

   Variants (layouts.ts):
     centered — the only layout: mono eyebrow, the code in display
                italic, the note, a swatch row (hairline circles),
                then the example chips. Small and beautiful; no
                photos. */

import type { CSSProperties } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface DressCodeExampleData { label?: string; hint?: string }
export interface DressCodeSectionData {
  code?: string;
  note?: string;
  palette?: string[];
  examples?: DressCodeExampleData[];
}

export function readDressCode(manifest: BlockSectionProps['manifest']): DressCodeSectionData {
  const data = (manifest as unknown as { dressCodeSection?: DressCodeSectionData }).dressCodeSection;
  return data && typeof data === 'object' ? data : {};
}

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

export function DressCodeSection({ manifest, pad, editable, onEditCopy }: BlockSectionProps) {
  const data = readDressCode(manifest);
  const code = (data.code ?? '').trim();
  const note = (data.note ?? '').trim();
  const palette = (data.palette ?? []).map((c) => (c ?? '').trim()).filter(Boolean);
  const examples = (data.examples ?? []).filter((e) => (e.label ?? '').trim());
  const empty = !code && !note && palette.length === 0 && examples.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'dressCodeEyebrow', 'What to wear')}
        title=""
        italic={code || undefined}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('dressCodeEyebrow', v) : undefined}
        divider="none"
        marginBottom={16}
      />
      {empty ? (
        <BlockEmpty hint="Name the code in the Dress code panel — tones and example chips are optional." />
      ) : (
        <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
          {note && (
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: 'var(--t-ink-soft)' }}>
              {note}
            </p>
          )}
          {palette.length > 0 && (
            <div style={{ marginTop: note || code ? 22 : 0 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--t-ink-muted)',
                  marginBottom: 10,
                }}
              >
                Tones to match
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}>
                {palette.map((tone, i) => (
                  <span
                    key={`${tone}-${i}`}
                    title={tone}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: tone,
                      border: '1px solid var(--t-line)',
                      boxShadow: 'inset 0 0 0 2px var(--t-paper)',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {examples.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
              {examples.map((ex, i) => (
                <ExampleChip key={`${ex.label}-${i}`} label={ex.label!} hint={ex.hint} />
              ))}
            </div>
          )}
        </div>
      )}
    </BlockFrame>
  );
}

function ExampleChip({ label, hint }: { label: string; hint?: string }) {
  const chip: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 6,
    padding: '7px 13px',
    borderRadius: 999,
    border: '1px solid var(--t-line)',
    background: 'var(--t-card)',
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--t-ink)',
  };
  return (
    <span style={chip}>
      {label}
      {hint?.trim() && (
        <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 11.5, color: 'var(--t-ink-muted)' }}>
          · {hint}
        </span>
      )}
    </span>
  );
}
