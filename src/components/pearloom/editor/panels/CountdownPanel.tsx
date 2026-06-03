'use client';

/* eslint-disable no-restricted-syntax */
/* CountdownPanel — host config for the Countdown section.
   Writes manifest.countdown = { variant, label, showOnHero }.
   The renderer reads manifest.logistics.date as the target; this
   panel only handles presentation. */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';

/* CountdownPanel — Content tab fields only. The layout variant
   (cards / stripe / minimal / hero / ribbon / flip) is picked
   in the Layout tab via the same LAYOUTS registry every other
   section uses. */
interface CountdownData {
  label?: string;
  showOnHero?: boolean;
}

export function CountdownPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'countdown');
  const loose = manifest as unknown as { countdown?: CountdownData };
  const data: CountdownData = loose.countdown ?? {};
  const label = data.label ?? '';
  const showOnHero = data.showOnHero ?? false;
  const [eyebrow, setEyebrow] = useCopyOverride(manifest, onChange, 'countdownEyebrow');

  const patch = (next: Partial<CountdownData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    countdown: { ...data, ...next },
  } as unknown as StoryManifest);

  const heroDate = manifest.logistics?.date;

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!heroDate && (
          <div style={{
            padding: 10, borderRadius: 10,
            background: 'var(--peach-bg)',
            border: '1px solid rgba(198,112,61,0.18)',
            fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5,
          }}>
            Set the event date in the Hero panel — the countdown reads from there.
          </div>
        )}

        <FGroup label="Eyebrow" hint="Tiny label above the countdown numbers.">
          <FInput value={eyebrow} onChange={setEyebrow} placeholder="The big day" />
        </FGroup>

        <FGroup label="Custom label" hint='Optional — e.g. "Until we say I do" or "Until we celebrate."'>
          <FInput value={label} onChange={(v) => patch({ label: v })} placeholder="Until we say I do" />
        </FGroup>

        <FToggleStandalone
          label="Also show under the hero"
          sub="Tucks a compact stripe right under the hero so guests see it without scrolling."
          def={showOnHero}
          onChange={(v) => patch({ showOnHero: v })}
        />

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Countdown" />
      </div>
    </SectionPanelShell>
  );
}

export default CountdownPanel;
