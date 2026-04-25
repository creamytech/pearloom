'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/CustomizationPanel.tsx
// Visual customization picker — borders, frames, monograms,
// transitions, countdown styles, text effects, music. Uses the
// shared editor/panel primitives for consistent chrome.
// ─────────────────────────────────────────────────────────────

import { Check, Palette, Image as ImageIcon, Waves, Timer, Sparkles, Layers, Music, Feather } from 'lucide-react';
import {
  CARD_BORDERS, SECTION_BACKGROUNDS, PHOTO_FRAMES,
  MONOGRAM_STYLES, SECTION_TRANSITIONS, COUNTDOWN_STYLES,
  TEXT_EFFECTS, generateMonogram,
  DEFAULT_MUSIC_CONFIG,
} from '@/lib/customization';
import type { SiteCustomization } from '@/types';
import { RangeSlider } from '@/components/ui/range-slider';
import {
  PanelRoot,
  PanelSection,
  PanelField,
  PanelInput,
  panelText,
  panelWeight,
} from './panel';

interface CustomizationPanelProps {
  customization: SiteCustomization;
  onChange: (customization: SiteCustomization) => void;
  names?: [string, string];
  accentColor?: string;
}

function PickerGrid<T extends { id: string; name: string; preview: string }>({
  items, value, onChange, columns = 2,
}: {
  items: T[]; value: string; onChange: (id: string) => void; columns?: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '6px' }}>
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              padding: '10px',
              border: active
                ? '2px solid var(--pl-chrome-accent)'
                : '1px solid var(--pl-chrome-border)',
              background: active
                ? 'var(--pl-chrome-accent-soft)'
                : 'var(--pl-chrome-surface)',
              color: 'var(--pl-chrome-text)',
              borderRadius: 'var(--pl-radius-lg)',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all var(--pl-dur-instant)',
            }}
            aria-pressed={active}
          >
            {active && (
              <div style={{ position: 'absolute', top: '4px', right: '4px' }}>
                <Check size={10} style={{ color: 'var(--pl-chrome-accent)' }} />
              </div>
            )}
            <div style={{
              fontSize: panelText.chip,
              fontWeight: panelWeight.semibold,
              color: 'var(--pl-chrome-text)',
              marginBottom: '2px',
            }}>
              {item.name}
            </div>
            <div style={{ fontSize: panelText.meta, color: 'var(--pl-chrome-text-muted)' }}>
              {item.preview}
            </div>
          </button>
        );
      })}
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
    <PanelRoot>
      <PanelSection title="Card Borders" icon={Palette}>
        <PickerGrid
          items={CARD_BORDERS}
          value={customization.cardBorder || 'none'}
          onChange={(id) => update('cardBorder', id)}
        />
      </PanelSection>

      <PanelSection title="Photo Frames" icon={ImageIcon}>
        <PickerGrid
          items={PHOTO_FRAMES}
          value={customization.photoFrame || 'none'}
          onChange={(id) => update('photoFrame', id)}
        />
      </PanelSection>

      <PanelSection title="Section Dividers" icon={Waves}>
        <PickerGrid
          items={SECTION_TRANSITIONS}
          value={customization.sectionTransition || 'none'}
          onChange={(id) => update('sectionTransition', id)}
        />
      </PanelSection>

      <PanelSection title="Countdown Style" icon={Timer}>
        <PickerGrid
          items={COUNTDOWN_STYLES}
          value={customization.countdownStyle || 'cards'}
          onChange={(id) => update('countdownStyle', id)}
        />
      </PanelSection>

      <PanelSection title="Text Animation" icon={Sparkles} defaultOpen={false}>
        <PickerGrid
          items={TEXT_EFFECTS}
          value={customization.textEffect || 'none'}
          onChange={(id) => update('textEffect', id)}
        />
      </PanelSection>

      <PanelSection title="Section Background" icon={Layers} defaultOpen={false}>
        <PickerGrid
          items={SECTION_BACKGROUNDS}
          value={Object.values(customization.sectionBackgrounds || {})[0] || 'none'}
          onChange={(id) => update('sectionBackgrounds', { _default: id })}
        />
      </PanelSection>

      <PanelSection title="Monogram" icon={Feather} defaultOpen={false}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {MONOGRAM_STYLES.map((style) => {
            const active = customization.monogram?.style === style.id;
            return (
              <button
                key={style.id}
                onClick={() => update('monogram', { style: style.id, initials, color: accentColor || '#C4A96A' })}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: active
                    ? '2px solid var(--pl-chrome-accent)'
                    : '1px solid var(--pl-chrome-border)',
                  background: active
                    ? 'var(--pl-chrome-accent-soft)'
                    : 'var(--pl-chrome-surface)',
                  borderRadius: 'var(--pl-radius-lg)',
                  transition: 'all var(--pl-dur-instant)',
                }}
              >
                <div
                  style={{ width: '40px', height: '40px', margin: '0 auto' }}
                  dangerouslySetInnerHTML={{
                    __html: generateMonogram(initials, style.id, accentColor || '#C4A96A'),
                  }}
                />
                <div style={{ fontSize: panelText.meta, color: 'var(--pl-chrome-text-muted)', marginTop: '4px' }}>
                  {style.name}
                </div>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Background Music" icon={Music} defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PanelField label="Music URL" hint="Paste a Spotify track or YouTube video URL.">
            <PanelInput
              type="url"
              value={customization.backgroundMusic?.url || ''}
              onChange={(v) => update('backgroundMusic', {
                ...(customization.backgroundMusic || DEFAULT_MUSIC_CONFIG),
                url: v,
              })}
              placeholder="Spotify or YouTube URL"
            />
          </PanelField>
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
      </PanelSection>
    </PanelRoot>
  );
}
