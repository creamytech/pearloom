'use client';

/* NameVotePanel — Content tab for the Name vote section (the
   baby-shower / gender-reveal name ballot). Edits
   manifest.nameVote = { question?, options?: string[], reveal? }.
   Guest votes ride the SAME /api/event-os/votes backend as the
   Group vote block, under the constant block id 'name-vote'
   (lib/event-os/activity-votes.ts).

   TALLY CAVEAT (same as ActivityVotePanel): option ids are slugs
   of the NAME text, so renaming a name after guests vote resets
   its live tally. Reordering is safe — ids travel with the label. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { moveItem, ReorderHandle } from '../_reorder';
import { RemoveButton, type BlockPanelProps } from './_shared';

interface NameVoteData { question?: string; options?: string[]; reveal?: boolean }

export function NameVotePanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'nameVote');
  const data: NameVoteData = manifest.nameVote ?? {};
  const options = Array.isArray(data.options) ? data.options : [];

  const patch = (next: Partial<NameVoteData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    nameVote: { ...data, ...next },
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="The question" hint="Optional, one line above the ballot.">
          <FInput
            value={data.question ?? ''}
            onChange={(v) => patch({ question: v })}
            placeholder="Help us pick the name"
          />
        </FGroup>

        <FGroup
          label={`Names · ${options.length}`}
          hint="Guests tap their favorite on the site. Live tallies key off the name text, renaming after guests vote resets that name's count (reordering is safe)."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {options.map((name, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <ReorderHandle
                  index={i}
                  count={options.length}
                  label={name || 'name'}
                  onMove={(from, to) => patch({ options: moveItem(options, from, to) })}
                />
                <FInput
                  value={name}
                  onChange={(v) => patch({ options: options.map((o, k) => (k === i ? v : o)) })}
                  placeholder="Juniper"
                />
                <RemoveButton
                  label={`Remove ${name || 'name'}`}
                  onClick={() => patch({ options: options.filter((_, k) => k !== i) })}
                />
              </div>
            ))}
            <AddCard
              label={options.length === 0 ? 'Add the first name' : 'Add a name'}
              onClick={() => patch({ options: [...options, ''] })}
            />
          </div>
        </FGroup>

        <FToggleStandalone
          label="Reveal tallies after voting"
          sub="Guests see the counts only once they've cast their own vote, no bandwagon"
          def={data.reveal === true}
          onChange={(v) => patch({ reveal: v })}
        />

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Name vote" />
      </div>
    </SectionPanelShell>
  );
}

export default NameVotePanel;
