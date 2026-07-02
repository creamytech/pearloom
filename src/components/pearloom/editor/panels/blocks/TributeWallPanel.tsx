'use client';

/* eslint-disable no-restricted-syntax */
/* TributeWallPanel — Content tab for the Tribute wall section.
   Writes manifest.tributeWall = { prompt, composerOpen } plus the
   manifest.copy.tributeWallTitle override (same slot the canvas's
   inline title edit writes, so there is one source of truth).

   The wall itself carries NO host-seeded entries — every card is a
   guest submission that the host approved. Guests POST to
   /api/event-os/submissions (blockId 'tributeWall'); rows wait in
   tribute_submissions until approved at Dashboard → Submissions,
   which this panel links to. On memorial sites the canvas falls
   back to manifest.memorial.tributePrompt / tributeWallOpen (the
   Memorial workspace's Tribute wall group) when the fields here
   are unset. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../../motifs';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from '../_section-atoms';
import { PearInlineRewrite } from '../../../redesign/PearAssist';
import { FTextArea, isMemorialOccasion, readOccasion, ToolPointerCard, type BlockPanelProps } from './_shared';

interface TributeWallData { prompt?: string; composerOpen?: boolean }

export function TributeWallPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'tributeWall');
  const [title, setTitle] = useCopyOverride(manifest, onChange, 'tributeWallTitle');
  const loose = manifest as unknown as {
    tributeWall?: TributeWallData;
    memorial?: { tributePrompt?: string; tributeWallOpen?: boolean };
  };
  const data = loose.tributeWall ?? {};
  const solemn = isMemorialOccasion(readOccasion(manifest));
  const promptFallback = loose.memorial?.tributePrompt
    || (solemn ? 'Share a memory' : 'Leave a few words');
  const composerOpen = data.composerOpen ?? loose.memorial?.tributeWallOpen ?? true;

  const patch = (next: Partial<TributeWallData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    tributeWall: { ...data, ...next },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Title" hint="Leave blank for the occasion's own heading.">
          <FInput
            value={title}
            onChange={setTitle}
            placeholder={solemn ? 'Tributes' : 'The tribute wall'}
          />
        </FGroup>

        <FGroup label="Prompt" hint="The line above the composer — it sets the tone for what guests write.">
          <FTextArea
            value={data.prompt ?? ''}
            onChange={(v) => patch({ prompt: v })}
            rows={2}
            placeholder={promptFallback}
          />
          {(data.prompt ?? '').trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                fxSection="tributeWall"
                value={data.prompt ?? ''}
                onCommit={(v) => patch({ prompt: v })}
                context={solemn
                  ? 'tribute-wall prompt on a memorial site — gentle, solemn register'
                  : 'tribute-wall prompt — one warm line inviting guests to write'}
                tones={solemn ? ['shorten', 'warmer', 'poetic'] : undefined}
              />
            </div>
          )}
        </FGroup>

        <FToggleStandalone
          label="Guests can write"
          sub={composerOpen
            ? 'The composer is open — new tributes wait for your approval before they appear'
            : 'Closed — the wall still shows what you’ve already approved'}
          def={composerOpen}
          onChange={(v) => patch({ composerOpen: v })}
        />

        <a
          href="/dashboard/submissions"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--lavender-bg, var(--cream-2))',
            border: '1px solid var(--line-soft)',
            textDecoration: 'none', width: '100%',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="arrow-ur" size={13} color="var(--lavender-ink, var(--ink-soft))" />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              Review what guests have written →
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)', marginTop: 1, lineHeight: 1.4 }}>
              Approve, hide, or flag tributes from Dashboard → Submissions. Only approved words reach the wall.
            </span>
          </span>
        </a>

        {solemn && (
          <ToolPointerCard
            toolId="memorial"
            label="The Memorial workspace feeds this wall"
            body="Its tribute prompt + open/closed setting apply here until you override them above."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Tribute wall" />
      </div>
    </SectionPanelShell>
  );
}

export default TributeWallPanel;
