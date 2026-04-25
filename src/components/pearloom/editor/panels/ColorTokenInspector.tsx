'use client';

/* ========================================================================
   ColorTokenInspector — surgical control over each theme token without
   leaving the active palette. Six color swatches: Paper / Ink / Accent /
   Soft / Muted / Card. Click any to pick a new hex; live previews update
   the swatch + the running mini-preview row.

   Subtle but powerful: lets the host nudge a single token (e.g. warm up
   the accent by 10%) without picking a new palette or breaking the rest.
   ======================================================================== */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, PanelSection, TextInput } from '../atoms';
import { Icon } from '../../motifs';

type TokenKey = 'background' | 'foreground' | 'accent' | 'accentLight' | 'muted' | 'cardBg';

const TOKENS: Array<{ key: TokenKey; label: string; hint: string }> = [
  { key: 'background', label: 'Paper', hint: 'The cream surface behind everything.' },
  { key: 'foreground', label: 'Ink', hint: 'Body and heading text colour.' },
  { key: 'accent',     label: 'Accent', hint: 'Primary brand colour — buttons, links.' },
  { key: 'accentLight', label: 'Soft', hint: 'Tinted version of accent — chips, washes.' },
  { key: 'muted',      label: 'Muted', hint: 'Quiet grey-tone for hairlines + captions.' },
  { key: 'cardBg',     label: 'Card',  hint: 'Slightly lifted surface for cards.' },
];

export function ColorTokenInspector({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const themeColors = (manifest as unknown as { theme?: { colors?: Record<TokenKey, string> } }).theme?.colors;
  const [activeToken, setActiveToken] = useState<TokenKey | null>(null);

  function setColor(key: TokenKey, value: string) {
    const existing = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    const colors = (existing.colors as Record<string, string> | undefined) ?? {};
    onChange({
      ...manifest,
      theme: { ...existing, colors: { ...colors, [key]: value } },
    } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="Color tokens"
      hint="Tweak any individual color in the active palette. Useful when you love a preset but want to warm up the accent."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {TOKENS.map((t) => {
          const value = themeColors?.[t.key] ?? '#FFFFFF';
          const on = activeToken === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveToken(on ? null : t.key)}
              title={t.hint}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: 10,
                borderRadius: 10,
                background: on ? 'var(--cream-2)' : 'var(--card)',
                border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 36,
                  borderRadius: 8,
                  background: value,
                  border: '1px solid var(--line)',
                }}
              />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{t.label}</div>
              <div style={{ fontSize: 9.5, fontFamily: 'ui-monospace, monospace', color: 'var(--ink-muted)' }}>
                {value.toUpperCase()}
              </div>
            </button>
          );
        })}
      </div>

      {activeToken && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: 'var(--cream-2)',
            borderRadius: 10,
            border: '1px solid var(--line)',
          }}
        >
          <Field label={`Edit ${TOKENS.find((t) => t.key === activeToken)?.label}`}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={themeColors?.[activeToken] ?? '#FFFFFF'}
                onChange={(e) => setColor(activeToken, e.target.value)}
                style={{
                  width: 44,
                  height: 38,
                  padding: 2,
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  background: 'var(--card)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <TextInput
                value={(themeColors?.[activeToken] ?? '#FFFFFF').toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v)) {
                    setColor(activeToken, v);
                  }
                }}
                placeholder="#3D4A1F"
              />
            </div>
          </Field>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 6, lineHeight: 1.45 }}>
            <Icon name="sparkles" size={11} /> {TOKENS.find((t) => t.key === activeToken)?.hint}
          </div>
        </div>
      )}

      {/* Mini live preview — shows how the tokens compose in a real card. */}
      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 12,
          background: themeColors?.background ?? '#F3E9D4',
          border: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: themeColors?.cardBg ?? '#FBF4E0',
            border: `1px solid ${themeColors?.muted ?? '#6D7D3F'}33`,
          }}
        >
          <div style={{ color: themeColors?.foreground ?? '#2A3512', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Card title
          </div>
          <div style={{ color: themeColors?.muted ?? '#6D7D3F', fontSize: 12, marginBottom: 10 }}>
            Quiet caption text in the muted tone.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: themeColors?.accent ?? '#3D4A1F',
                color: themeColors?.background ?? '#F3E9D4',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Accent
            </span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: themeColors?.accentLight ?? '#D7CCE5',
                color: themeColors?.foreground ?? '#2A3512',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Soft
            </span>
          </div>
        </div>
      </div>
    </PanelSection>
  );
}
