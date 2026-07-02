'use client';

/* eslint-disable no-restricted-syntax */
/* DressCodePanel — Content tab for the Dress code section.
   Editor over manifest.dressCodeSection (typed in src/types.ts):
     { code?, note?, palette?, examples? }
   The code input carries occasion-routed suggestions (a memorial
   host never sees "Festive attire"); palette swatches use the
   custom PlColorPicker well; examples are do/don't chips. */

import type { StoryManifest } from '@/types';
import { FGroup, FSuggest, AddCard, SectionPanelShell, SectionVisibilityFooter, useSectionHidden, FInput } from '../_section-atoms';
import { dressCodeSuggestions } from '../_suggestions';
import { PlColorPicker } from '../../../redesign/PlColorPicker';
import { PhotoUploadSlot } from '../_photo-upload';
import { PearInlineRewrite } from '../../../redesign/PearAssist';
import { FTextArea, readOccasion, RemoveButton, type BlockPanelProps } from './_shared';

/* `photo` powers the Wardrobe layout's "Wear this" plates —
   examples with a photo hang as hairline-framed plates there;
   the Centered layout ignores photos and keeps its chips. */
interface DressExample { label: string; hint?: string; photo?: string }
interface DressData { code?: string; note?: string; palette?: string[]; examples?: DressExample[] }

/** Neutral linen tone — the starting value for a new swatch. */
const NEW_TONE = '#C9BFA9';

export function DressCodePanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'dressCode');
  const loose = manifest as unknown as { dressCodeSection?: DressData };
  const data: DressData = loose.dressCodeSection ?? {};
  const palette = Array.isArray(data.palette) ? data.palette : [];
  const examples = Array.isArray(data.examples) ? data.examples : [];
  const suggestions = dressCodeSuggestions(readOccasion(manifest));

  const write = (patch: Partial<DressData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    dressCodeSection: { ...data, ...patch },
  } as unknown as StoryManifest);

  const patchExample = (idx: number, p: Partial<DressExample>) =>
    write({ examples: examples.map((e, i) => (i === idx ? { ...e, ...p } : e)) });

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="The code" hint="The headline guests dress to.">
          <FSuggest
            value={data.code ?? ''}
            onChange={(v) => write({ code: v })}
            placeholder="Garden formal"
            options={suggestions.options}
          />
        </FGroup>

        <FGroup label="A note" hint="One sentence of guidance — terrain, weather, warmth.">
          <FTextArea
            value={data.note ?? ''}
            onChange={(v) => write({ note: v })}
            rows={2}
            placeholder="The ceremony is on a lawn — leave the stilettos home."
          />
          {(data.note ?? '').trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                fxSection="dressCode"
                value={data.note ?? ''}
                onCommit={(v) => write({ note: v })}
                context="dress-code guidance note"
              />
            </div>
          )}
        </FGroup>

        <FGroup
          label={`Colors to match · ${palette.length}`}
          hint="Optional tones guests can dress to. They show as small circles."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {palette.map((tone, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlColorPicker
                  value={tone}
                  onChange={(hex) => write({ palette: palette.map((t, i) => (i === idx ? hex : t)) })}
                  label="Tone"
                  swatchStyle={{ width: 30, height: 30, flexShrink: 0 }}
                />
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                    fontSize: 11.5, fontWeight: 600,
                    color: 'var(--ink-soft)', textTransform: 'uppercase',
                  }}
                >
                  {tone}
                </span>
                <RemoveButton
                  label="Remove tone"
                  onClick={() => write({ palette: palette.filter((_, i) => i !== idx) })}
                />
              </div>
            ))}
            <AddCard
              label={palette.length === 0 ? 'Add the first tone' : 'Add a tone'}
              onClick={() => write({ palette: [...palette, NEW_TONE] })}
            />
          </div>
        </FGroup>

        <FGroup
          label={`Examples · ${examples.length}`}
          hint={'Do / don’t chips — "Linen suits", "No white". Add a photo and the Wardrobe layout hangs it as a "Wear this" plate.'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {examples.map((ex, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                {/* Paired photo slot — powers the Wardrobe plates. */}
                <div style={{ width: 52, flexShrink: 0 }}>
                  <PhotoUploadSlot
                    url={ex.photo ?? ''}
                    onChange={(url) => patchExample(idx, { photo: url || undefined })}
                    aspectRatio="3/4"
                    size="sm"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <FInput
                    value={ex.label}
                    onChange={(v) => patchExample(idx, { label: v })}
                    placeholder="Linen suits"
                  />
                  <FInput
                    value={ex.hint ?? ''}
                    onChange={(v) => patchExample(idx, { hint: v })}
                    placeholder="Hint (optional)"
                  />
                </div>
                <RemoveButton
                  label="Remove example"
                  onClick={() => write({ examples: examples.filter((_, i) => i !== idx) })}
                />
              </div>
            ))}
            <AddCard
              label={examples.length === 0 ? 'Add the first example' : 'Add an example'}
              onClick={() => write({ examples: [...examples, { label: '' }] })}
            />
          </div>
        </FGroup>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Dress code" />
      </div>
    </SectionPanelShell>
  );
}

export default DressCodePanel;
