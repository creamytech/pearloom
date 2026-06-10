'use client';

 
/* ObituaryPanel — Content tab for the Obituary section. THIN editor
   over manifest.memorial.obituary — the SAME field the Memorial
   workspace (MemorialPanel "Obituary" group) owns. Edits here show
   up there and vice versa. */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
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
