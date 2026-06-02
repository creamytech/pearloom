'use client';

// ─────────────────────────────────────────────────────────────
// DetailsPanel — host control for the Details strip cards. The
// preset 3 (ceremony / reception / dress code) come from
// logistics + events; this panel layers on:
//   • Per-card "What to expect" expand body (editorial paragraph
//     that reveals when guests tap the card's More pill).
//   • Custom cards — host can add any number of additional cards
//     (childcare, valet, gift table, COVID notes, etc.) with a
//     title + body + icon + tone + optional address & time. Each
//     custom card with an address auto-renders a Directions chip;
//     custom cards with a time render the calendar chip too.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { Field, PanelDisclosure, PanelGroup, PanelSection, PanelSmartActions, PanelTabs, SelectInput, TextArea, TextInput, type PanelSmartAction } from '../atoms';
import { TimePicker } from '../v8-forms';
import { Icon } from '../../motifs';
import { LivestreamPanel } from './LivestreamPanel';
import { BlockStylePicker } from './BlockStylePicker';
// Side-effect import — registers the 5 prototype Details layouts
// (tiles / iconrow / list / accordion / bento) with the
// block-style registry.
import '@/components/pearloom/site/details-variants';

const DRESS_CODES = [
  { value: '', label: 'Not specified' },
  { value: 'Casual', label: 'Casual' },
  { value: 'Garden party', label: 'Garden party' },
  { value: 'Cocktail', label: 'Cocktail' },
  { value: 'Black tie', label: 'Black tie' },
  { value: 'Black tie optional', label: 'Black tie optional' },
  { value: 'Beach formal', label: 'Beach formal' },
  { value: 'Dressy', label: 'Dressy' },
  { value: 'Festive', label: 'Festive' },
];

const CARD_ICON_OPTIONS = [
  { value: 'star', label: 'Star' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'heart-icon', label: 'Heart' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'gift', label: 'Gift' },
  { value: 'pin', label: 'Pin' },
  { value: 'compass', label: 'Compass' },
  { value: 'map', label: 'Map' },
  { value: 'home', label: 'Home' },
  { value: 'users', label: 'Users' },
  { value: 'user', label: 'User' },
  { value: 'mic', label: 'Mic' },
  { value: 'music', label: 'Music' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'clock', label: 'Clock' },
  { value: 'bell', label: 'Bell' },
  { value: 'sun', label: 'Sun' },
  { value: 'moon', label: 'Moon' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'gallery', label: 'Gallery' },
];

const TONE_OPTIONS = [
  { value: 'lavender', label: 'Lavender' },
  { value: 'peach', label: 'Peach' },
  { value: 'sage', label: 'Sage' },
] as const;

type Details = NonNullable<StoryManifest['details']>;
type CustomCard = NonNullable<Details['customCards']>[number];

const PRESET_EXPAND_KEYS: Array<{ id: 'ceremony' | 'reception' | 'dressCode'; label: string; placeholder: string }> = [
  { id: 'ceremony', label: 'Ceremony', placeholder: "Brief and outdoors. Bring sunglasses — the sun lands on the seats around 5." },
  { id: 'reception', label: 'Reception', placeholder: "Cocktails on the lawn, dinner under the trellis, dancing till midnight. Cake at 9." },
  { id: 'dressCode', label: 'Dress code', placeholder: "Block heels, please — it's grass. Bring a layer for the evening; the breeze picks up." },
];

export function DetailsPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const logistics = manifest.logistics ?? {};
  const details = manifest.details ?? {};
  const expand = details.expand ?? {};
  const customCards = details.customCards ?? [];

  function setDetails(patch: Partial<Details>) {
    onChange({ ...manifest, details: { ...details, ...patch } });
  }
  function setExpand(key: string, value: string) {
    const next = { ...expand };
    if (value) next[key] = value;
    else delete next[key];
    setDetails({ expand: next });
  }
  function setCustomCards(next: CustomCard[]) {
    setDetails({ customCards: next });
  }
  function addCustomCard() {
    const id = `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setCustomCards([
      ...customCards,
      { id, title: 'New card', body: '', icon: 'star', tone: 'sage' },
    ]);
  }

  const smartActions: PanelSmartAction[] = [
    {
      label: 'Add a card',
      icon: 'plus',
      onClick: addCustomCard,
      primary: true,
    },
    {
      label: 'Set dress code',
      icon: 'type',
      onClick: () => {
        const el = document.querySelector('[data-pl-details-dresscode]') as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
  ];

  // Content tab — the cards guests actually read: ceremony,
  // what-to-expect, parking, custom cards. Per-field pear glyph
  // on Dress code (suggest-dress-code is registered in the
  // suggestions strip already; the field-level glyph just gives
  // the host a one-tap entry without scrolling).
  const content = (
    <PanelGroup>
      <PanelSection label="The ceremony" hint="Guests see these three cards in the Details strip.">
        <Field label="Ceremony start" help="Displays as the first card. Pulls from the hero time by default.">
          <TimePicker
            value={logistics.time ?? ''}
            onChange={(v) =>
              onChange({ ...manifest, logistics: { ...logistics, time: v || undefined } })
            }
            ariaLabel="Ceremony start time"
          />
        </Field>

        <Field
          label="Dress code"
          pearAction={{ block: 'details', pass: 'suggest-dress-code', label: 'Suggest dress-code copy' }}
        >
          <div data-pl-details-dresscode>
            <SelectInput
              value={logistics.dresscode ?? ''}
              onChange={(v) =>
                onChange({ ...manifest, logistics: { ...logistics, dresscode: v || undefined } })
              }
              options={DRESS_CODES}
              placeholder="Select a dress code"
            />
          </div>
        </Field>

        <Field label="Dress-code notes" help="A warm, specific line — 'Block heels — it's grass.'">
          <TextArea
            value={logistics.notes ?? ''}
            onChange={(e) =>
              onChange({ ...manifest, logistics: { ...logistics, notes: e.target.value || undefined } })
            }
            rows={3}
            placeholder="Soft colors. Block heels — it's grass."
          />
        </Field>
      </PanelSection>

      <PanelSection
        label="What to expect"
        hint="Editorial paragraph that reveals when guests tap a card's More pill — no longer feels like a wall of text on first scroll."
      >
        {PRESET_EXPAND_KEYS.map((preset) => (
          <Field key={preset.id} label={preset.label} help="Optional. Stays hidden until guests open it.">
            <TextArea
              value={expand[preset.id] ?? ''}
              onChange={(e) => setExpand(preset.id, e.target.value)}
              rows={2}
              placeholder={preset.placeholder}
            />
          </Field>
        ))}
      </PanelSection>

      <PanelSection
        label="Parking + arrival"
        hint="Optional but appreciated — helps guests land smoothly."
      >
        <Field label="Parking & arrival notes">
          <div data-pl-details-parking>
            <TextArea
              value={details.parking ?? ''}
              onChange={(e) => setDetails({ parking: e.target.value || undefined })}
              rows={3}
              placeholder="Complimentary valet. Self-parking garage one block east (entrance on Market)."
            />
          </div>
        </Field>

        <Field label="Accessibility notes">
          <TextArea
            value={details.accessibility ?? ''}
            onChange={(e) => setDetails({ accessibility: e.target.value || undefined })}
            rows={2}
            placeholder="Step-free access from the east entrance. Accessible restrooms on ground level."
          />
        </Field>
      </PanelSection>

      <PanelSection
        label="Custom cards"
        hint="Add any number of extra cards — childcare, valet, gift table, dietary notes, COVID protocols. Each renders next to the preset three."
      >
        {customCards.length === 0 && (
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--cream-2)',
              border: '1px dashed var(--line)',
              borderRadius: 12,
              fontSize: 12.5,
              color: 'var(--ink-soft)',
              lineHeight: 1.5,
            }}
          >
            No custom cards yet. Use <strong>Add a card</strong> at the top of this panel — handy for childcare,
            gift table, hotel block code, parking, or anything you want to surface in the Details strip.
          </div>
        )}
        {customCards.map((card, i) => (
          <CustomCardEditor
            key={card.id}
            card={card}
            expand={expand[card.id] ?? ''}
            onChange={(next) => setCustomCards(customCards.map((c) => (c.id === card.id ? next : c)))}
            onChangeExpand={(v) => setExpand(card.id, v)}
            onRemove={() => setCustomCards(customCards.filter((c) => c.id !== card.id))}
            onMove={(dir) => {
              const swapWith = i + dir;
              if (swapWith < 0 || swapWith >= customCards.length) return;
              const next = [...customCards];
              [next[i], next[swapWith]] = [next[swapWith], next[i]];
              setCustomCards(next);
            }}
            isFirst={i === 0}
            isLast={i === customCards.length - 1}
          />
        ))}
        <button
          type="button"
          onClick={addCustomCard}
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px dashed var(--peach-ink, #C6703D)',
            background: 'transparent',
            color: 'var(--peach-ink, #C6703D)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="plus" size={11} /> Add a card
        </button>
      </PanelSection>

      {/* Phase 5.1 of AUDIT-2026-05-29 — surface the livestream
          block's URL editor where memorial hosts already are.
          Renders a "+ Add livestream block" CTA if the block
          doesn't exist yet; renders the full form when it does. */}
      <LivestreamPanel manifest={manifest} onChange={onChange} />
    </PanelGroup>
  );

  // Layout tab — surfaces below-the-cards chrome the host can shape
  // without touching content. Today: the editorial weather strip's
  // voice / glyph / day-of behaviour.
  const layout = (
    <PanelGroup>
      {/* Per-section layout variant — the 5 prototype shapes
          (tiles / iconrow / list / accordion / bento). Registered
          for picker discovery; ThemedSiteRenderer's ThemedDetails
          currently dispatches on kit (classic/ticket/plate/…) and
          will dispatch on this variant id in Phase 2. */}
      <BlockStylePicker
        blockType="details"
        manifest={manifest}
        onChange={onChange}
        defaultStyleId="tiles"
        label="Details layout"
        hint="How the detail cards render — equal tiles, icon row, leader list, accordion, or asymmetric bento."
      />
      <WeatherStyleSection manifest={manifest} onChange={onChange} />
    </PanelGroup>
  );

  return (
    <>
      <PanelSmartActions actions={smartActions} />
      <PanelTabs slots={{ content, layout }} />
    </>
  );
}

// ── WeatherStyleSection ───────────────────────────────────────
// Lives at the bottom of the Details panel — controls the small
// weather strip that renders below the Details cards. Voice +
// glyph treatment + day-of suppression. Stored at
// manifest.weatherStyle so the renderer reads it directly.
function WeatherStyleSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  type WS = NonNullable<StoryManifest['weatherStyle']>;
  const ws: WS = manifest.weatherStyle ?? {};
  function set(patch: Partial<WS>) {
    const next: WS = { ...ws, ...patch };
    Object.keys(next).forEach((k) => {
      const v = (next as Record<string, unknown>)[k];
      if (v === undefined || v === '') delete (next as Record<string, unknown>)[k];
    });
    onChange({ ...manifest, weatherStyle: Object.keys(next).length ? next : undefined });
  }
  return (
    <PanelSection
      label="Weather strip"
      hint="The single editorial line below the cards."
      defaultOpen={false}
    >
      <Field label="Voice">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {(['poetic', 'plain', 'brief'] as const).map((v) => {
            const on = (ws.voice ?? 'poetic') === v;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={on}
                onClick={() => set({ voice: v === 'poetic' ? undefined : v })}
                style={voiceBtn(on)}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            );
          })}
        </div>
      </Field>
      <PanelDisclosure label="Advanced">
        <Field label="Glyph">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {(['line', 'filled', 'none'] as const).map((g) => {
              const on = (ws.glyph ?? 'line') === g;
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ glyph: g === 'line' ? undefined : g })}
                  style={voiceBtn(on)}
                >
                  {g[0].toUpperCase() + g.slice(1)}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Day-of">
          <button
            type="button"
            onClick={() => set({ hideOnDay: ws.hideOnDay ? undefined : true })}
            style={{
              ...voiceBtn(!!ws.hideOnDay),
              width: '100%',
              justifyContent: 'flex-start',
              padding: '8px 12px',
            }}
          >
            {ws.hideOnDay ? '✓ Hide the strip on the day-of' : 'Keep the strip showing on the day-of'}
          </button>
        </Field>
      </PanelDisclosure>
    </PanelSection>
  );
}

const voiceBtn = (on: boolean): React.CSSProperties => ({
  padding: '6px 8px',
  borderRadius: 6,
  background: on ? 'var(--ink, #0E0D0B)' : 'var(--card)',
  color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft)',
  border: `1px solid ${on ? 'var(--ink, #0E0D0B)' : 'var(--line)'}`,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: on ? 700 : 600,
  fontFamily: 'var(--font-ui)',
});

function CustomCardEditor({
  card,
  expand,
  onChange,
  onChangeExpand,
  onRemove,
  onMove,
  isFirst,
  isLast,
}: {
  card: CustomCard;
  expand: string;
  onChange: (next: CustomCard) => void;
  onChangeExpand: (v: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        marginBottom: 10,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon name={card.icon || 'star'} size={14} color="var(--peach-ink, #C6703D)" />
        <strong style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.title || 'Untitled'}
        </strong>
        <button type="button" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move up" style={iconBtnStyle(isFirst)}>
          <Icon name="chev-up" size={11} />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={isLast} aria-label="Move down" style={iconBtnStyle(isLast)}>
          <Icon name="chev-down" size={11} />
        </button>
        <button type="button" onClick={onRemove} aria-label="Remove" style={iconBtnStyle(false, true)}>
          <Icon name="close" size={11} />
        </button>
      </div>

      <Field label="Title">
        <TextInput
          value={card.title}
          onChange={(e) => onChange({ ...card, title: e.target.value })}
          placeholder="Childcare on site"
        />
      </Field>

      <Field label="Body" help="One or two sentences — what guests need to know.">
        <TextArea
          value={card.body}
          onChange={(e) => onChange({ ...card, body: e.target.value })}
          rows={2}
          placeholder="Sitters in the garden room from 5–10 PM. Bring favourite snack."
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Icon">
          <SelectInput
            value={card.icon ?? 'star'}
            onChange={(v) => onChange({ ...card, icon: v })}
            options={CARD_ICON_OPTIONS}
          />
        </Field>
        <Field label="Tone">
          <SelectInput
            value={card.tone ?? 'sage'}
            onChange={(v) => onChange({ ...card, tone: v as CustomCard['tone'] })}
            options={TONE_OPTIONS as unknown as Array<{ value: string; label: string }>}
          />
        </Field>
      </div>

      <Field label="Time (optional)" help="Renders as the headline on the card.">
        <TimePicker
          value={card.time ?? ''}
          onChange={(v) => onChange({ ...card, time: v || undefined })}
          ariaLabel={`${card.title || 'Card'} time`}
        />
      </Field>

      <Field label="Address (optional)" help="Add an address to surface a Directions chip.">
        <TextInput
          value={card.address ?? ''}
          onChange={(e) => onChange({ ...card, address: e.target.value || undefined })}
          placeholder="If different from the venue"
        />
      </Field>

      <Field label="What to expect (optional)" help="Reveals when a guest taps the More pill on the card.">
        <TextArea
          value={expand}
          onChange={(e) => onChangeExpand(e.target.value)}
          rows={2}
          placeholder="Optional editorial detail for guests who want more context."
        />
      </Field>
    </div>
  );
}

function iconBtnStyle(disabled: boolean, danger = false): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'transparent',
    border: '1px solid var(--line-soft)',
    color: danger ? 'var(--plum, #7A2D2D)' : 'var(--ink-soft)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    flexShrink: 0,
  };
}
