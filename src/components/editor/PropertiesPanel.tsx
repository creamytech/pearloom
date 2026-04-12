'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/PropertiesPanel.tsx
// Contextual inspector for the selected block. Houses Typography
// pair, Parchment tint, watermark toggle, and private gallery
// toggle. Uses the shared PanelSection/PanelRoot primitives so
// the chrome matches every other panel in the editor.
// ─────────────────────────────────────────────────────────────

import { Image, Type, Lock, Unlock, Wand2, Sparkles, EyeOff } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ParchmentTintPanel, type TintId } from './ParchmentTintPanel';
import { TypographyPairSelector, type PairId } from './TypographyPairSelector';
import { PanelRoot, PanelSection, panelText, panelWeight } from './panel';
import type { StoryManifest } from '@/types';

interface PropertiesPanelProps {
  manifest: StoryManifest;
  onChange: (manifest: StoryManifest) => void;
}

export function PropertiesPanel({ manifest, onChange }: PropertiesPanelProps) {
  const { dispatch } = useEditor();

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

  return (
    <PanelRoot>
      <PanelSection title="Quick Actions" icon={Wand2}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            icon={<Image size={13} />}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' })}
          >
            Replace Imagery
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            icon={<Type size={13} />}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'design' })}
          >
            Edit Typography
          </Button>
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
                color: '#18181B',
                marginBottom: '2px',
              }}>
                Hand-curated with Pearloom
              </div>
              <div style={{ fontSize: panelText.hint, color: '#71717A' }}>
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
                <Unlock size={14} className="text-[#18181B]" style={{ flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: '#18181B',
                  marginBottom: '2px',
                }}>
                  Private Gallery
                </div>
                <div style={{ fontSize: panelText.hint, color: '#71717A' }}>
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
