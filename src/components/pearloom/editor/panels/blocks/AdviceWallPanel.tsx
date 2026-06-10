'use client';

 
/* AdviceWallPanel — Content tab for the Advice wall section.
   Writes manifest.adviceWall = { prompt, entries: [{ id, from,
   body }] }. On memorial sites, the CANVAS falls back to
   manifest.memorial.tributePrompt (MemorialPanel's Tribute wall
   group) when no adviceWall.prompt is set — setting a prompt here
   overrides it for this section only. Guest submissions +
   moderation are design-agent work; entries here are host seeds. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { FTextArea, isMemorialOccasion, mkId, readOccasion, RemoveButton, RowCard, ToolPointerCard, type BlockPanelProps } from './_shared';

interface AdviceEntryRow { id: string; from?: string; body?: string }
interface AdviceWallData { prompt?: string; entries?: AdviceEntryRow[] }

export function AdviceWallPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'adviceWall');
  const loose = manifest as unknown as { adviceWall?: AdviceWallData; memorial?: { tributePrompt?: string } };
  const data = loose.adviceWall ?? {};
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const memorialFallback = loose.memorial?.tributePrompt ?? '';

  const patch = (next: Partial<AdviceWallData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    adviceWall: { ...data, ...next },
  } as unknown as StoryManifest);

  const patchEntry = (i: number, p: Partial<AdviceEntryRow>) =>
    patch({ entries: entries.map((e, idx) => (idx === i ? { ...e, ...p } : e)) });

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Prompt" hint="One line that tone-sets what guests write.">
          <FTextArea
            value={data.prompt ?? ''}
            onChange={(v) => patch({ prompt: v })}
            rows={2}
            placeholder={memorialFallback || 'Your best advice for the years ahead.'}
          />
        </FGroup>

        <FGroup label={`Seeded notes · ${entries.length}`} hint="A few from you so the wall never opens empty.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e, i) => (
              <RowCard key={e.id}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <FTextArea value={e.body ?? ''} onChange={(v) => patchEntry(i, { body: v })} rows={2} placeholder="The note itself." />
                    <FInput value={e.from ?? ''} onChange={(v) => patchEntry(i, { from: v })} icon="user" placeholder="From — “Aunt June”" />
                  </div>
                  <RemoveButton label="Remove note" onClick={() => patch({ entries: entries.filter((_, idx) => idx !== i) })} />
                </div>
              </RowCard>
            ))}
            <AddCard
              label={entries.length === 0 ? 'Seed the first note' : 'Add a note'}
              onClick={() => patch({ entries: [...entries, { id: mkId('adv') }] })}
            />
          </div>
        </FGroup>

        {isMemorialOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="memorial"
            label="Tribute wall lives in the Memorial workspace"
            body="Guest tribute settings + the tribute prompt are managed there; this section displays them."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Advice wall" />
      </div>
    </SectionPanelShell>
  );
}

export default AdviceWallPanel;
