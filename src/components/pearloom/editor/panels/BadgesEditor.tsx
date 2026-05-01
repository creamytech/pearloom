'use client';

// ─────────────────────────────────────────────────────────────
// BadgesEditor — host control for per-row badges. Originally
// scoped to hotels (Pear's pick / Closest / Best value); now
// shared across FAQ / schedule / registry / hotels so any
// section with structured rows can let hosts:
//
//   • Suppress an auto-tagged badge per row.
//   • Add custom badges with v8 tones (peach / sage / lavender
//     / ink), e.g. "Couple's pick", "Most asked", "Group gift",
//     "Optional", "After-party", "Photographer's note".
//
// The data shape is identical regardless of section so renderers
// + panels share a single editor + render component pair. The
// `autoLabels` map (e.g. { top: "Pear's pick" }) is supplied per
// section since auto-badge semantics differ per row type.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

export interface BadgeOverrides<AutoKey extends string = string> {
  /** Auto-detected badge keys the host wants to hide. */
  hideAuto?: AutoKey[];
  /** Host-authored badges. */
  custom?: Array<{ id: string; label: string; tone?: BadgeTone }>;
}

export type BadgeTone = 'peach' | 'sage' | 'lavender' | 'ink';

export const BADGE_TONES: Array<{ value: BadgeTone; label: string; bg: string; fg: string }> = [
  { value: 'peach',    label: 'Peach',    bg: 'rgba(198,112,61,0.10)',  fg: 'var(--peach-ink, #C6703D)' },
  { value: 'sage',     label: 'Sage',     bg: 'rgba(123,138,93,0.18)',  fg: '#3D4A1F' },
  { value: 'lavender', label: 'Lavender', bg: 'rgba(149,141,176,0.16)', fg: '#5C4F8C' },
  { value: 'ink',      label: 'Ink',      bg: 'rgba(14,13,11,0.85)',    fg: '#FFFFFF' },
];

/** Renderer-side helper: a single custom badge pill. Used by site
 *  sections that surface host-authored badges. Consumers in
 *  SiteV8Renderer import this so the chip styling stays consistent
 *  across hotel / FAQ / schedule / registry sections. */
export function CustomBadgePill({ label, tone }: { label: string; tone: BadgeTone }) {
  const t = BADGE_TONES.find((x) => x.value === tone) ?? BADGE_TONES[0];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        border: '1px solid rgba(0,0,0,0.06)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

interface Props<AutoKey extends string> {
  badges: BadgeOverrides<AutoKey>;
  onChange: (next: BadgeOverrides<AutoKey>) => void;
  /** When the section auto-tags some badges, pass a map of
   *  {key: visible label} so the editor can render Hide pills. */
  autoLabels?: Record<AutoKey, string>;
  placeholder?: string;
  /** Compact label override — "Tags" vs. "Badges" depending on
   *  context. Defaults to "Badges". */
  label?: string;
}

export function BadgesEditor<AutoKey extends string>({
  badges,
  onChange,
  autoLabels,
  placeholder = "Most asked, Optional, Group gift…",
  label = 'Badges',
}: Props<AutoKey>) {
  const hideAuto = (badges.hideAuto ?? []) as AutoKey[];
  const custom = badges.custom ?? [];
  const [draft, setDraft] = useState('');
  const [draftTone, setDraftTone] = useState<BadgeTone>('peach');

  function toggleAuto(key: AutoKey) {
    const set = new Set<AutoKey>(hideAuto);
    if (set.has(key)) set.delete(key); else set.add(key);
    onChange({ ...badges, hideAuto: Array.from(set) });
  }
  function addCustom() {
    const next = draft.trim();
    if (!next) return;
    onChange({
      ...badges,
      custom: [
        ...custom,
        {
          id: `bdg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          label: next,
          tone: draftTone,
        },
      ],
    });
    setDraft('');
  }
  function removeCustom(id: string) {
    onChange({ ...badges, custom: custom.filter((c) => c.id !== id) });
  }

  const autoEntries = autoLabels ? (Object.keys(autoLabels) as AutoKey[]) : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--cream-2)',
        border: '1px dashed var(--line-soft)',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
        }}
      >
        {label}
      </div>
      {autoEntries.length > 0 && autoLabels && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {autoEntries.map((key) => {
            const hidden = hideAuto.includes(key);
            return (
              <button
                key={String(key)}
                type="button"
                onClick={() => toggleAuto(key)}
                title={hidden ? `Show ${autoLabels[key]} when it auto-tags` : `Hide ${autoLabels[key]}`}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  border: hidden ? '1px dashed var(--line)' : '1px solid var(--peach-ink, #C6703D)',
                  background: hidden ? 'transparent' : 'var(--peach-ink, #C6703D)',
                  color: hidden ? 'var(--ink-muted)' : '#FFFFFF',
                  textDecoration: hidden ? 'line-through' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                }}
              >
                {autoLabels[key]}
              </button>
            );
          })}
        </div>
      )}
      {custom.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {custom.map((c) => {
            const tone = BADGE_TONES.find((t) => t.value === (c.tone ?? 'peach')) ?? BADGE_TONES[0];
            return (
              <span
                key={c.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 4px 3px 9px',
                  borderRadius: 999,
                  background: tone.bg,
                  color: tone.fg,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                {c.label}
                <button
                  type="button"
                  onClick={() => removeCustom(c.id)}
                  aria-label={`Remove ${c.label} badge`}
                  style={{
                    width: 16, height: 16,
                    borderRadius: 999,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={placeholder}
          aria-label="New custom badge label"
          maxLength={28}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <select
          value={draftTone}
          onChange={(e) => setDraftTone(e.target.value as BadgeTone)}
          aria-label="Badge tone"
          style={{
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            fontSize: 11.5,
            fontFamily: 'var(--font-ui)',
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          {BADGE_TONES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addCustom}
          disabled={!draft.trim()}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #FBF7EE)',
            fontSize: 11,
            fontWeight: 700,
            cursor: draft.trim() ? 'pointer' : 'default',
            opacity: draft.trim() ? 1 : 0.5,
            fontFamily: 'var(--font-ui)',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
