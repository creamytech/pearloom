'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RsvpEditor.
   The 4 question toggles now write manifest.rsvpConfig.{mealChoice,
   dietary, songRequest, plusOne} — the canonical shape the RSVP
   form + canvas read. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, FToggleStandalone, PearChip, SectionPanelShell } from './_section-atoms';

interface RsvpConfig {
  mealChoice?: boolean;
  dietary?: boolean;
  songRequest?: boolean;
  plusOne?: boolean;
}

export function RsvpPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const loose = manifest as unknown as { rsvpDeadline?: string; rsvpConfig?: RsvpConfig };
  const replyBy = loose.rsvpDeadline ?? 'April 28, 2027';
  const config: RsvpConfig = loose.rsvpConfig ?? { mealChoice: true, dietary: true, songRequest: true, plusOne: false };

  const setReplyBy = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    rsvpDeadline: v,
  } as unknown as StoryManifest);

  const patchConfig = (k: keyof RsvpConfig, v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    rsvpConfig: { ...config, [k]: v },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FGroup label="Reply by">
          <FInput value={replyBy} onChange={setReplyBy} icon="calendar" />
        </FGroup>
        <FGroup label="Questions to ask">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FToggleStandalone label="Meal choice" sub="Chicken · Fish · Vegetarian" def={!!config.mealChoice} onChange={(v) => patchConfig('mealChoice', v)} />
            <FToggleStandalone label="Dietary restrictions" def={!!config.dietary} onChange={(v) => patchConfig('dietary', v)} />
            <FToggleStandalone label="Song request" def={!!config.songRequest} onChange={(v) => patchConfig('songRequest', v)} />
            <FToggleStandalone label="Plus-one" def={!!config.plusOne} onChange={(v) => patchConfig('plusOne', v)} />
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
