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
     centered — mono eyebrow, the code in display italic, the note,
                a swatch row (hairline circles), then the example
                chips. Small and beautiful; no photos.
     wardrobe — "Wear this" photo plates (2026-07-02): examples that
                carry a photo render as hairline-framed plates with
                the label beneath; photo-less examples keep their
                chip form under the plates. DressCodePanel writes
                the per-example photo slots. */

import type { CSSProperties } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';
import { FadeInImage } from '../../graceful-image';

export interface DressCodeExampleData { label?: string; hint?: string; photo?: string }
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

export function DressCodeSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const data = readDressCode(manifest);
  const code = (data.code ?? '').trim();
  const note = (data.note ?? '').trim();
  const palette = (data.palette ?? []).map((c) => (c ?? '').trim()).filter(Boolean);
  const examples = (data.examples ?? []).filter((e) => (e.label ?? '').trim() || (e.photo ?? '').trim());
  const empty = !code && !note && palette.length === 0 && examples.length === 0;
  if (empty && !editable) return null;

  /* Wardrobe split — plates for the photographed examples, chips
     for the rest. Only the wardrobe variant reads the photos. */
  const wardrobe = variant === 'wardrobe';
  const plates = wardrobe ? examples.filter((e) => (e.photo ?? '').trim()) : [];
  const chips = wardrobe
    ? examples.filter((e) => !(e.photo ?? '').trim() && (e.label ?? '').trim())
    : examples.filter((e) => (e.label ?? '').trim());

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
        <BlockEmpty
          hint={wardrobe
            ? 'Name the code in the Dress code panel, add a photo to any example and it becomes a "Wear this" plate.'
            : 'Name the code in the Dress code panel, tones and example chips are optional.'}
        />
      ) : (
        <div style={{ maxWidth: wardrobe ? 640 : 460, margin: '0 auto', textAlign: 'center' }}>
          {note && (
            <p style={{ margin: '0 auto', maxWidth: 460, fontSize: 14.5, lineHeight: 1.65, color: 'var(--t-ink-soft)' }}>
              {note}
            </p>
          )}
          {/* Wardrobe plates — photos in hairline frames, the label
              as the plate's mono caption. BRAND §10: photography
              always wears a hairline frame. */}
          {plates.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fit, minmax(150px, ${plates.length < 3 ? '210px' : '1fr'}))`,
                justifyContent: 'center',
                gap: 16,
                marginTop: note || code ? 26 : 0,
              }}
            >
              {plates.map((ex, i) => (
                <figure key={`${ex.label}-${i}`} style={{ margin: 0 }}>
                  <div
                    style={{
                      background: 'var(--t-card)',
                      border: '1px solid var(--t-line)',
                      padding: 8,
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: 'var(--t-section)', boxShadow: 'inset 0 0 0 1px var(--t-line-soft)' }}>
                      <FadeInImage
                        src={ex.photo!}
                        alt={ex.label ?? 'Dress-code example'}
                        style={{ position: 'absolute', inset: 0 }}
                      />
                    </div>
                  </div>
                  {(ex.label ?? '').trim() && (
                    <figcaption
                      style={{
                        marginTop: 8,
                        fontFamily: MONO,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--t-ink-muted)',
                      }}
                    >
                      {ex.label}
                      {ex.hint?.trim() && (
                        <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--t-display)', fontStyle: 'italic', fontWeight: 400, fontSize: 12, letterSpacing: 0, textTransform: 'none', color: 'var(--t-ink-soft)' }}>
                          {ex.hint}
                        </span>
                      )}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
          {/* Wardrobe + editor, but no photos yet — show the shape. */}
          {wardrobe && plates.length === 0 && editable && (
            <div style={{ marginTop: 22, padding: '18px 16px', border: '1.5px dashed var(--t-line)', borderRadius: 10, fontSize: 12.5, color: 'var(--t-ink-muted)', maxWidth: 460, marginInline: 'auto' }}>
              Add a photo to any example in the Dress code panel and it hangs here as a &ldquo;Wear this&rdquo; plate.
            </div>
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
          {chips.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
              {chips.map((ex, i) => (
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
