'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RsvpEditor. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, FToggleStandalone, PearChip, SectionPanelShell } from './_section-atoms';

export function RsvpPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const replyBy = (manifest as unknown as { rsvpDeadline?: string }).rsvpDeadline ?? 'April 28, 2027';
  const setReplyBy = (v: string) => onChange({ ...(manifest as unknown as Record<string, unknown>), rsvpDeadline: v } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label="Reply by">
          <FInput value={replyBy} onChange={setReplyBy} icon="calendar" />
        </FGroup>
        <FGroup label="Questions to ask">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FToggleStandalone label="Meal choice" sub="Chicken · Fish · Vegetarian" def={true} />
            <FToggleStandalone label="Dietary restrictions" def={true} />
            <FToggleStandalone label="Song request" def={true} />
            <FToggleStandalone label="Plus-one" def={false} />
            <AddCard label="Add a custom question" />
          </div>
        </FGroup>
        <FGroup label="After they reply" hint="Pear can chase non-responders for you.">
          <PearChip>Set up reminder cadence</PearChip>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default RsvpPanel;
