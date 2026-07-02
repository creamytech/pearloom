'use client';

/* eslint-disable no-restricted-syntax */
/* ObituaryPanel — Content tab for the Obituary section. THIN editor
   over manifest.memorial.obituary — the SAME field the Memorial
   workspace (MemorialPanel "Obituary" group) owns. Edits here show
   up there and vice versa.

   Pear helps IN PLACE (2026-07-02) — a grieving host at an empty
   remembrance box used to be pointed away to the Memorial
   workspace. The inline rewriter runs preview-before-apply
   (mandatory review — CLAUDE-PRODUCT Q5: a gentle draft, never an
   auto-write), in the gentle register ('funnier' never offered
   here). */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { PearInlineRewrite } from '../../../redesign/PearAssist';
import { FTextArea, isMemorialOccasion, readOccasion, ToolPointerCard, type BlockPanelProps } from './_shared';

interface ObituaryData { dates?: string; body?: string }

export function ObituaryPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'obituary');
  const loose = manifest as unknown as { memorial?: { obituary?: ObituaryData } & Record<string, unknown> };
  const obituary = loose.memorial?.obituary ?? {};

  const patch = (next: Partial<ObituaryData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    memorial: { ...(loose.memorial ?? {}), obituary: { ...obituary, ...next } },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label="Dates"
          hint="Shown above the remembrance in small capitals. A dash or middot between dates ('1942 — 2026') renders as a quiet gold mark on the site."
        >
          <FInput
            value={obituary.dates ?? ''}
            onChange={(v) => patch({ dates: v })}
            icon="calendar"
            placeholder="March 12, 1942 — April 8, 2026"
          />
        </FGroup>

        <FGroup
          label="Remembrance"
          hint="Family details, what they loved, what they leave behind. Blank lines become paragraphs; the first letter opens the setting."
        >
          <FTextArea
            value={obituary.body ?? ''}
            onChange={(v) => patch({ body: v })}
            rows={8}
            placeholder="A short remembrance."
          />
          {(obituary.body ?? '').trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                fxSection="obituary"
                value={obituary.body ?? ''}
                onCommit={(v) => patch({ body: v })}
                context="obituary remembrance — solemn, gentle register; plain and true, never flowery"
                tones={['shorten', 'warmer', 'poetic']}
              />
              <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.5, color: 'var(--ink-muted)' }}>
                Pear only suggests — nothing changes until you keep it. Read every word before it reaches the family.
              </div>
            </div>
          )}
        </FGroup>

        {isMemorialOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="memorial"
            label="Also in the Memorial workspace"
            body="Order of service + tribute wall live there — same obituary, one store. Pear can help rewrite the remembrance there."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Obituary" />
      </div>
    </SectionPanelShell>
  );
}

export default ObituaryPanel;
