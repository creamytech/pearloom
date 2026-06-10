'use client';

 
/* LivestreamPanel (redesign) — Content tab for the Livestream
   section. Writes manifest.livestream = { url, startsAt, note,
   buttonLabel }. The CANVAS also reads the legacy
   manifest.blocks[type='livestream'].config shape (wizard-seeded
   memorial sites) as a fallback; saving here writes the canonical
   manifest.livestream path going forward.

   Distinct from the orphaned legacy panel at
   editor/panels/LivestreamPanel.tsx (manifest.blocks[] writer, no
   consumers). */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { FTextArea, type BlockPanelProps } from './_shared';

interface LivestreamData { url?: string; startsAt?: string; note?: string; buttonLabel?: string }

export function LivestreamPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'livestream');
  const loose = manifest as unknown as { livestream?: LivestreamData };
  const data = loose.livestream ?? {};

  const patch = (next: Partial<LivestreamData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    livestream: { ...data, ...next },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Stream link" hint="Zoom, YouTube Live, Vimeo — wherever the camera points.">
          <FInput
            value={data.url ?? ''}
            onChange={(v) => patch({ url: v })}
            type="url"
            icon="link"
            placeholder="https://youtube.com/live/…"
          />
        </FGroup>

        <FGroup label="Starts at" hint='Free-form — "Saturday 2:00 PM CET" reads better than a timestamp.'>
          <FInput
            value={data.startsAt ?? ''}
            onChange={(v) => patch({ startsAt: v })}
            icon="clock"
            placeholder="Saturday · 2:00 PM CET"
          />
        </FGroup>

        <FGroup label="Note to far-away guests" hint="Optional line above the join button.">
          <FTextArea
            value={data.note ?? ''}
            onChange={(v) => patch({ note: v })}
            rows={2}
            placeholder="We'll start the stream ten minutes before the ceremony."
          />
        </FGroup>

        <FGroup label="Button label">
          <FInput
            value={data.buttonLabel ?? ''}
            onChange={(v) => patch({ buttonLabel: v })}
            placeholder="Join the livestream"
          />
        </FGroup>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Livestream" />
      </div>
    </SectionPanelShell>
  );
}

export default LivestreamPanel;
