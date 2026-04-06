'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/CustomizationPanel.tsx
// Visual customization picker — borders, frames, monograms,
// transitions, countdown styles, text effects, music.
// Each picker renders previews and applies instantly.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  CARD_BORDERS, SECTION_BACKGROUNDS, PHOTO_FRAMES,
  MONOGRAM_STYLES, SECTION_TRANSITIONS, COUNTDOWN_STYLES,
  TEXT_EFFECTS, generateMonogram,
  type BackgroundMusicConfig, DEFAULT_MUSIC_CONFIG,
} from '@/lib/customization';
import type { SiteCustomization } from '@/types';
import { RangeSlider } from '@/components/ui/range-slider';

interface CustomizationPanelProps {
  customization: SiteCustomization;
  onChange: (customization: SiteCustomization) => void;
  names?: [string, string];
  accentColor?: string;
}

function PickerGrid<T extends { id: string; name: string; preview: string }>({
  items, value, onChange, label, columns = 3,
}: {
  items: T[]; value: string; onChange: (id: string) => void; label: string; columns?: number;
}) {
  return (
    <div className="pl-panel-section" style={{ margin: '4px 0' }}>
      <div className="pl-panel-label">{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '4px' }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="pl-panel-card"
            style={{
              padding: '8px',
              border: value === item.id ? '2px solid var(--pl-olive)' : undefined,
              background: value === item.id ? 'rgba(163,177,138,0.08)' : undefined,
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {value === item.id && (
              <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                <Check size={10} color="var(--pl-olive-deep)" />
              </div>
            )}
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--pl-ink)', marginBottom: '2px' }}>
              {item.name}
            </div>
            <div style={{ fontSize: '0.55rem', color: 'var(--pl-muted)' }}>
              {item.preview}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CustomizationPanel({ customization, onChange, names, accentColor }: CustomizationPanelProps) {
  const update = (key: keyof SiteCustomization, value: unknown) => {
    onChange({ ...customization, [key]: value });
  };

  const initials = names
    ? (names[0]?.charAt(0) || '') + (names[1]?.charAt(0) || '')
    : 'AB';

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Card Borders */}
      <PickerGrid
        items={CARD_BORDERS}
        value={customization.cardBorder || 'none'}
        onChange={(id) => update('cardBorder', id)}
        label="Card Borders"
        columns={2}
      />

      {/* Photo Frames */}
      <PickerGrid
        items={PHOTO_FRAMES}
        value={customization.photoFrame || 'none'}
        onChange={(id) => update('photoFrame', id)}
        label="Photo Frames"
        columns={2}
      />

      {/* Section Transitions */}
      <PickerGrid
        items={SECTION_TRANSITIONS}
        value={customization.sectionTransition || 'none'}
        onChange={(id) => update('sectionTransition', id)}
        label="Section Dividers"
        columns={2}
      />

      {/* Countdown Style */}
      <PickerGrid
        items={COUNTDOWN_STYLES}
        value={customization.countdownStyle || 'cards'}
        onChange={(id) => update('countdownStyle', id)}
        label="Countdown Style"
        columns={2}
      />

      {/* Text Effects */}
      <PickerGrid
        items={TEXT_EFFECTS}
        value={customization.textEffect || 'none'}
        onChange={(id) => update('textEffect', id)}
        label="Text Animation"
        columns={2}
      />

      {/* Section Backgrounds */}
      <PickerGrid
        items={SECTION_BACKGROUNDS}
        value={Object.values(customization.sectionBackgrounds || {})[0] || 'none'}
        onChange={(id) => update('sectionBackgrounds', { _default: id })}
        label="Section Background"
        columns={2}
      />

      {/* Monogram */}
      <div className="pl-panel-section" style={{ margin: '4px 0' }}>
        <div className="pl-panel-label">Monogram</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
          {MONOGRAM_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => update('monogram', { style: style.id, initials, color: accentColor || '#C4A96A' })}
              className="pl-panel-card"
              style={{
                padding: '6px', cursor: 'pointer', textAlign: 'center',
                border: customization.monogram?.style === style.id ? '2px solid var(--pl-olive)' : undefined,
              }}
            >
              <div
                style={{ width: '40px', height: '40px', margin: '0 auto' }}
                dangerouslySetInnerHTML={{
                  __html: generateMonogram(initials, style.id, accentColor || '#C4A96A'),
                }}
              />
              <div style={{ fontSize: '0.5rem', color: 'var(--pl-muted)', marginTop: '2px' }}>
                {style.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Background Music */}
      <div className="pl-panel-section" style={{ margin: '4px 0' }}>
        <div className="pl-panel-label">Background Music</div>
        <input
          type="url"
          value={customization.backgroundMusic?.url || ''}
          onChange={(e) => update('backgroundMusic', {
            ...(customization.backgroundMusic || DEFAULT_MUSIC_CONFIG),
            url: e.target.value,
          })}
          placeholder="Spotify or YouTube URL"
          className="w-full px-3 py-2 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--pl-divider)] bg-white text-[0.82rem] text-[var(--pl-ink)] outline-none pl-focus-glow mb-2"
        />
        {customization.backgroundMusic?.url && (
          <RangeSlider
            label="Volume"
            value={Math.round((customization.backgroundMusic?.volume || 0.3) * 100)}
            onChange={(v) => update('backgroundMusic', {
              ...(customization.backgroundMusic || DEFAULT_MUSIC_CONFIG),
              volume: v / 100,
            })}
            min={0} max={100} suffix="%"
          />
        )}
      </div>
    </div>
  );
}
