'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx DetailsEditor.
   Writes the canonical manifest.detailsCards array that ThemedSite
   reads (each entry is [label, value]). The dressCode toggle now
   writes to detailsCards[0] so the Dress Code card on the canvas
   actually updates. */

import type { StoryManifest } from '@/types';
import { occasionCopyFor } from '../../redesign/occasion-copy';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FSuggest, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import {
  dressCodeSuggestions,
  detailsCardLabelSuggestions,
} from './_suggestions';
import { PearInlineRewrite } from '../../redesign/PearAssist';
import { detailsIconFor } from '../../redesign/details-icons';

/* Third tuple slot is the optional subline — the quieter second
   line the accordion opens onto (also rendered by tiles / iconrow /
   bento / ledger). Legacy 2-tuples stay valid. */
type Card = [string, string, string?];

/* Cap raised 3 → 6 (2026-07-02, with buildCopy in ThemedSite) —
   bento wants 4-6 tiles, and the old cap was invisible: the Add
   button just vanished at three. Both sides slice to the same max. */
const MAX_CARDS = 6;

export function DetailsPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'details');
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const dressSet = dressCodeSuggestions(occasion);
  const labelSet = detailsCardLabelSuggestions(occasion);
  const [detailsEyebrow, setDetailsEyebrow] = useCopyOverride(manifest, onChange, 'detailsEyebrow');
  /* Slice to MAX_CARDS on read so legacy manifests that accumulated
     extra rows don't bleed into the rail. The canvas slices to the
     same max — both sides agree. */
  /* The panel's starter rows MATCH the canvas's editor demo cards
     ('Aegean formal' here vs 'Garden formal' on the canvas left
     hosts unsure which was real) — both sides read
     occasionCopyFor(occasion), so a memorial never opens on
     'Garden formal' and its Gifts card reads in-lieu-of-flowers. */
  const oc = occasionCopyFor(occasion);
  const rawCards: Card[] = ((manifest as unknown as { detailsCards?: Card[] }).detailsCards) ?? [
    ['Dress code', oc.detailsDressDemo],
    ['Kids welcome', 'Ages 10 +'],
    [oc.detailsGiftsCard[0], oc.detailsGiftsCard[1]],
  ];
  const cards: Card[] = rawCards.slice(0, MAX_CARDS);

  const setCards = (next: Card[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    detailsCards: next,
  } as unknown as StoryManifest);

  const setCardValue = (i: number, value: string) => {
    const next = [...cards];
    next[i] = [next[i]?.[0] ?? 'Detail', value, next[i]?.[2]];
    setCards(next);
  };
  const setCardLabel = (i: number, label: string) => {
    const next = [...cards];
    next[i] = [label, next[i]?.[1] ?? '', next[i]?.[2]];
    setCards(next);
  };
  const setCardSub = (i: number, sub: string) => {
    const next = [...cards];
    next[i] = [next[i]?.[0] ?? 'Detail', next[i]?.[1] ?? '', sub || undefined];
    setCards(next);
  };
  const addCard = () => {
    if (cards.length >= MAX_CARDS) return;
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
        {/* ── Zip DetailsEditor layout (section-fields.jsx L231-251):
              Dress code · Kids-welcome toggle · second welcome toggle
              · Good-to-know cards. The production-only extras
              (eyebrow, contact-a-host) live tucked under "More"
              below so the default view is 1:1. */}
        <FGroup label="Dress code">
          <FSuggest
            value={cards[0]?.[1] ?? ''}
            onChange={(v) => setCardValue(0, v)}
            icon="sparkles"
            placeholder="Aegean formal — linen & light colors"
            options={dressSet.options}
            hint={dressSet.hint}
          />
          {/* One-tap presets — FSuggest only shows its chip row while
              the field is EMPTY, but the default card ships with a
              value, so most hosts never see the suggestions. Surface
              the top 4 as preset pills (same write path as typing);
              styling matches the RSVP panel's meal-option quick-adds. */}
          {(cards[0]?.[1] ?? '').trim().length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {dressSet.options
                .filter((o) => o.trim().toLowerCase() !== (cards[0]?.[1] ?? '').trim().toLowerCase())
                .slice(0, 4)
                .map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setCardValue(0, o)}
                    style={{
                      fontSize: 11.5, fontWeight: 600,
                      padding: '4px 9px', borderRadius: 999,
                      background: 'var(--cream-2)', color: 'var(--ink-soft)',
                      border: '1px solid var(--line)', cursor: 'pointer',
                    }}
                  >
                    {o}
                  </button>
                ))}
            </div>
          )}
          {(cards[0]?.[1] ?? '').trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                fxSection="details"
                value={cards[0]?.[1] ?? ''}
                onCommit={(v) => setCardValue(0, v)}
                context="details card value — dress code"
              />
            </div>
          )}
        </FGroup>
        <FToggleStandalone
          label="Kids welcome"
          sub={kidsWelcome ? 'Family-friendly — bring the little ones.' : 'No kids — grown-ups only.'}
          def={kidsWelcome}
          onChange={setKidsWelcome}
        />
        <FToggleStandalone
          label="Plus-ones welcome"
          sub={plusOnesWelcome ? 'Guests can bring a partner.' : 'Single invites only.'}
          def={plusOnesWelcome}
          onChange={setPlusOnesWelcome}
        />
        <FGroup label={`Good-to-know cards · ${cards.length} of ${MAX_CARDS}`} hint="Up to six quick facts. The second line shows where the layout has room — and opens the Accordion rows.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cards.map(([l, v, s], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                {/* Content-aware glyph — the same label→icon map the
                    canvas uses (details-icons.ts), so the rail
                    previews the icon guests will see. */}
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 8 }}>
                  <Icon name={detailsIconFor(l, i)} size={13} color="var(--ink-soft)" />
                </span>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* Show curated label suggestions only on cards 2+
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
                  <FInput value={s ?? ''} onChange={(next) => setCardSub(i, next)} placeholder="Second line (optional — e.g. Enter from Vine St)" />
                </div>
              </div>
            ))}
            {cards.length < MAX_CARDS ? (
              <AddCard label="Add a detail" onClick={addCard} />
            ) : (
              /* The cap, said out loud — it used to be invisible
                 (the Add button just vanished). */
              <div style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center', padding: '4px 0' }}>
                Six is the cap — the grid stays scannable.
              </div>
            )}
          </div>
        </FGroup>

        <details className="pl-panel-more">
          <summary
            style={{
              cursor: 'pointer', listStyle: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}
          >
            <Icon name="chev-down" size={12} /> More — eyebrow, contact a host
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
              <FInput value={detailsEyebrow} onChange={setDetailsEyebrow} placeholder="The fine print" />
            </FGroup>
            <FGroup label="Contact a host" hint="Adds a 'Questions? Text us' button under the details — guests tap it and their Messages opens with your number.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <FInput
                  value={((manifest as unknown as { hostContact?: { name?: string } }).hostContact?.name) ?? ''}
                  onChange={(v) => onChange({
                    ...(manifest as unknown as Record<string, unknown>),
                    hostContact: { ...((manifest as unknown as { hostContact?: Record<string, unknown> }).hostContact ?? {}), name: v || undefined },
                  } as unknown as StoryManifest)}
                  placeholder="Who answers — 'Emma', 'the best man'…"
                />
                <FInput
                  value={((manifest as unknown as { hostContact?: { phone?: string } }).hostContact?.phone) ?? ''}
                  onChange={(v) => onChange({
                    ...(manifest as unknown as Record<string, unknown>),
                    hostContact: { ...((manifest as unknown as { hostContact?: Record<string, unknown> }).hostContact ?? {}), phone: v || undefined },
                  } as unknown as StoryManifest)}
                  type="tel"
                  placeholder="(555) 010-1234 — leave empty to hide the button"
                />
              </div>
            </FGroup>
          </div>
        </details>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Details" />
      </div>
    </SectionPanelShell>
  );
}

export default DetailsPanel;
