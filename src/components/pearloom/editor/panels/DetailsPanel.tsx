'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx DetailsEditor.
   Writes the canonical manifest.detailsCards array that ThemedSite
   reads (each entry is [label, value]). The dressCode toggle now
   writes to detailsCards[0] so the Dress Code card on the canvas
   actually updates. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import {
  dressCodeSuggestions,
  detailsCardLabelSuggestions,
} from './_suggestions';
import { PearInlineRewrite } from '../../redesign/PearAssist';

type Card = [string, string];

export function DetailsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'details');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const dressSet = dressCodeSuggestions(occasion);
  const labelSet = detailsCardLabelSuggestions(occasion);
  const [detailsEyebrow, setDetailsEyebrow] = useCopyOverride(manifest, onChange, 'detailsEyebrow');
  /* Slice to 3 on read so legacy manifests that accumulated 4+
     cards from earlier sessions (before the cap was enforced)
     don't bleed extra rows into the rail. The canvas already
     slices to 3 too — both sides agree on the max. */
  const rawCards: Card[] = ((manifest as unknown as { detailsCards?: Card[] }).detailsCards) ?? [
    ['Dress code', 'Aegean formal'],
    ['Parking', 'Valet on-site'],
    ['Weather', 'Warm evenings, ~22°C'],
  ];
  const cards: Card[] = rawCards.slice(0, 3);

  const setCards = (next: Card[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    detailsCards: next,
  } as unknown as StoryManifest);

  const setCardValue = (i: number, value: string) => {
    const next = [...cards];
    next[i] = [next[i]?.[0] ?? 'Detail', value];
    setCards(next);
  };
  const setCardLabel = (i: number, label: string) => {
    const next = [...cards];
    next[i] = [label, next[i]?.[1] ?? ''];
    setCards(next);
  };
  const addCard = () => {
    if (cards.length >= 3) return;
    setCards([...cards, ['New detail', '']]);
  };

  /* Audience toggles — "kids welcome" and "plus-ones welcome" run
     as parallel inclusion toggles. We dropped the old "adults-only
     evening" toggle that was logically inconsistent with "kids
     welcome" (they fought each other) — back-compat: legacy
     adultsOnly: true is normalized to kidsWelcome: false on first
     read so existing manifests still behave correctly. */
  const looseAud = manifest as unknown as { kidsWelcome?: boolean; adultsOnly?: boolean; plusOnesWelcome?: boolean };
  const kidsWelcome = looseAud.kidsWelcome ?? !looseAud.adultsOnly;
  const plusOnesWelcome = looseAud.plusOnesWelcome ?? true;
  const setKidsWelcome = (v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    kidsWelcome: v,
    /* Keep legacy adultsOnly in sync so any other surface still
       reading it gets the right answer. */
    adultsOnly: !v,
  } as unknown as StoryManifest);
  const setPlusOnesWelcome = (v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    plusOnesWelcome: v,
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={detailsEyebrow} onChange={setDetailsEyebrow} placeholder="The fine print" />
        </FGroup>
        <FGroup label="Dress code">
          <FSuggest
            value={cards[0]?.[1] ?? ''}
            onChange={(v) => setCardValue(0, v)}
            icon="sparkles"
            placeholder="Aegean formal — linen & light colors"
            options={dressSet.options}
            hint={dressSet.hint}
          />
          {(cards[0]?.[1] ?? '').trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                value={cards[0]?.[1] ?? ''}
                onCommit={(v) => setCardValue(0, v)}
                context="details card value — dress code"
              />
            </div>
          )}
        </FGroup>
        <FGroup label="Who's welcome" hint="Two simple toggles guests scan in seconds.">
          <FToggleStandalone
            label="Kids welcome"
            sub={kidsWelcome ? 'Family-friendly — bring the little ones.' : 'No kids — grown-ups only.'}
            def={kidsWelcome}
            onChange={setKidsWelcome}
          />
          <div style={{ height: 6 }} />
          <FToggleStandalone
            label="Plus-ones welcome"
            sub={plusOnesWelcome ? 'Guests can bring a partner.' : 'Single invites only.'}
            def={plusOnesWelcome}
            onChange={setPlusOnesWelcome}
          />
        </FGroup>
        <FGroup label="Good-to-know cards" hint="Up to three quick facts.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cards.map(([l, v], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 8 }}>
                  <Icon name="sparkles" size={13} color="var(--ink-soft)" />
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* Show curated label suggestions only on cards 2 + 3
                      (i >= 1) — card 0 is the dedicated "Dress code" card
                      whose label shouldn't be re-pickable. */}
                  {i === 0 ? (
                    <FInput value={l} onChange={(next) => setCardLabel(i, next)} placeholder="Label (e.g. Parking)" />
                  ) : (
                    <FSuggest
                      value={l}
                      onChange={(next) => setCardLabel(i, next)}
                      placeholder="Label (e.g. Parking)"
                      options={labelSet.options}
                    />
                  )}
                  <FInput value={v} onChange={(next) => setCardValue(i, next)} placeholder="Value (e.g. Valet on-site)" />
                </div>
              </div>
            ))}
            {cards.length < 3 && <AddCard label="Add a detail" onClick={addCard} />}
          </div>
        </FGroup>
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Details" />
      </div>
    </SectionPanelShell>
  );
}

export default DetailsPanel;
