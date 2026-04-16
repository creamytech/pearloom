'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/PropertiesPanel.tsx
// Contextual inspector for the selected block. Houses Typography
// pair, Parchment tint, watermark toggle, and private gallery
// toggle. Uses the shared PanelSection/PanelRoot primitives so
// the chrome matches every other panel in the editor.
// ─────────────────────────────────────────────────────────────

import { Type, Lock, Unlock, Sparkles, EyeOff, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ParchmentTintPanel, type TintId } from './ParchmentTintPanel';
import { TypographyPairSelector, type PairId } from './TypographyPairSelector';
import { PanelRoot, PanelSection, PanelField, PanelInput, panelText, panelWeight } from './panel';
import type { StoryManifest } from '@/types';

interface PropertiesPanelProps {
  manifest: StoryManifest;
  onChange: (manifest: StoryManifest, opts?: { coalesceKey?: string; label?: string }) => void;
  /** Fallback names from the account/couple record when manifest.names is unset. */
  fallbackNames?: [string, string];
}

export function PropertiesPanel({ manifest, onChange, fallbackNames }: PropertiesPanelProps) {
  const handleTintChange = (tint: TintId) => {
    onChange({ ...manifest, parchmentTint: tint });
  };

  const handleTypographyChange = (pair: PairId) => {
    onChange({ ...manifest, typographyPair: pair });
  };

  const handleWatermarkToggle = (checked: boolean) => {
    onChange({ ...manifest, watermark: checked });
  };

  const handlePrivateGalleryToggle = (checked: boolean) => {
    onChange({ ...manifest, privateGallery: checked });
  };

  const currentNames: [string, string] =
    manifest.names || fallbackNames || ['', ''];

  const handleNameChange = (which: 0 | 1, value: string) => {
    const next: [string, string] =
      which === 0 ? [value, currentNames[1]] : [currentNames[0], value];
    onChange(
      { ...manifest, names: next },
      { coalesceKey: `names:${which}`, label: 'Edit couple name' },
    );
  };

  return (
    <PanelRoot>
      <PanelSection title="Couple Names" icon={Users}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PanelField label="First Name">
            <PanelInput
              value={currentNames[0]}
              onChange={(v) => handleNameChange(0, v)}
              placeholder="e.g. Amelia"
            />
          </PanelField>
          <PanelField
            label="Second Name"
            hint="Shown throughout your site — hero, invite, RSVP."
          >
            <PanelInput
              value={currentNames[1]}
              onChange={(v) => handleNameChange(1, v)}
              placeholder="e.g. Benjamin"
            />
          </PanelField>
        </div>
      </PanelSection>

      <PanelSection title="Typography" icon={Type} card={false}>
        <TypographyPairSelector
          value={manifest.typographyPair || 'serif-sans'}
          onChange={handleTypographyChange}
        />
      </PanelSection>

      <PanelSection title="Parchment Tint" icon={Sparkles} card={false}>
        <ParchmentTintPanel
          currentTint={manifest.parchmentTint || 'none'}
          onApply={handleTintChange}
        />
      </PanelSection>

      <PanelSection title="Site Visibility" icon={EyeOff}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Watermark toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                color: 'var(--pl-chrome-text)',
                marginBottom: '2px',
              }}>
                Hand-curated with Pearloom
              </div>
              <div style={{ fontSize: panelText.hint, color: 'var(--pl-chrome-text-muted)' }}>
                Show subtle watermark on published site
              </div>
            </div>
            <Switch
              checked={manifest.watermark ?? false}
              onChange={handleWatermarkToggle}
            />
          </div>

          {/* Private gallery toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              {manifest.privateGallery ? (
                <Lock size={14} className="text-[var(--pl-warning)]" style={{ flexShrink: 0 }} />
              ) : (
                <Unlock size={14} style={{ color: 'var(--pl-chrome-text)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: 'var(--pl-chrome-text)',
                  marginBottom: '2px',
                }}>
                  Private Gallery
                </div>
                <div style={{ fontSize: panelText.hint, color: 'var(--pl-chrome-text-muted)' }}>
                  {manifest.privateGallery ? 'Photos hidden from visitors' : 'Photos visible to all visitors'}
                </div>
              </div>
            </div>
            <Switch
              checked={manifest.privateGallery ?? false}
              onChange={handlePrivateGalleryToggle}
            />
          </div>
        </div>
      </PanelSection>
    </PanelRoot>
  );
}
