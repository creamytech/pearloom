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
import { getEventType } from '@/lib/event-os/event-types';
import { Icon } from '../../../motifs';
import { FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { FTextArea, readOccasion, type BlockPanelProps } from './_shared';

interface LivestreamData { url?: string; startsAt?: string; note?: string; buttonLabel?: string }

/* Note example routed by the occasion's voice — solemn events have
   a service, ceremonial ones a ceremony, everything else (a
   graduation party, a milestone) just starts. */
function notePlaceholderFor(occasion?: string): string {
  const voice = getEventType(occasion)?.voice;
  if (voice === 'solemn') return "We'll start the stream ten minutes before the service.";
  if (voice === 'ceremonial') return "We'll start the stream ten minutes before the ceremony.";
  return "We'll go live ten minutes before it starts.";
}

export function LivestreamPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'livestream');
  const notePlaceholder = notePlaceholderFor(readOccasion(manifest));
  const loose = manifest as unknown as { livestream?: LivestreamData };
  const data = loose.livestream ?? {};

  const patch = (next: Partial<LivestreamData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    livestream: { ...data, ...next },
  } as unknown as StoryManifest);

  const url = data.url?.trim() ?? '';

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label="Stream link"
          hint="Zoom, YouTube Live, Vimeo, wherever the camera points. Guests open it in a new tab."
          action={url ? (
            /* Open the pasted URL exactly as a guest will — catches
               typos + permission walls before the day. */
            <button
              type="button"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '2px 4px', fontSize: 11, fontWeight: 700,
                color: 'var(--peach-ink)', fontFamily: 'var(--font-ui)',
              }}
            >
              <Icon name="arrow-ur" size={11} color="var(--peach-ink)" />
              Test link
            </button>
          ) : undefined}
        >
          <FInput
            value={data.url ?? ''}
            onChange={(v) => patch({ url: v })}
            type="url"
            icon="link"
            placeholder="https://youtube.com/live/…"
          />
        </FGroup>

        <FGroup
          label="Starts at"
          hint='Shown as written. Include a full date, "June 14, 2026 2:00 PM", and the site adds a live countdown, restates the time in each guest’s time zone, and flips to “Live now” at start time.'
        >
          <FInput
            value={data.startsAt ?? ''}
            onChange={(v) => patch({ startsAt: v })}
            icon="clock"
            placeholder="June 14, 2026 2:00 PM"
          />
        </FGroup>

        <FGroup label="Note to far-away guests" hint="Optional line above the join button.">
          <FTextArea
            value={data.note ?? ''}
            onChange={(v) => patch({ note: v })}
            rows={2}
            placeholder={notePlaceholder}
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
