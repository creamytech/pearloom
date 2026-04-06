'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/PropertiesPanel.tsx
// Floating contextual inspector properties — houses Typography Pair,
// Parchment Tint, Watermark toggle, Private Gallery toggle,
// REPLACE IMAGERY / EDIT TYPOGRAPHY quick actions.
// Matches Stitch "Properties" panel from Photo Atelier.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Image, Type, Eye, EyeOff, Lock, Unlock, Pen } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ParchmentTintPanel, type TintId } from './ParchmentTintPanel';
import { TypographyPairSelector, type PairId } from './TypographyPairSelector';
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
    <div>
      {/* Quick actions */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--pl-divider)' }}>
        <h4 style={{
          fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--pl-muted)',
          marginBottom: '10px',
        }}>
          Quick Actions
        </h4>
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
      </div>

      {/* Typography Pair selector */}
      <div style={{ borderBottom: '1px solid var(--pl-divider)' }}>
        <TypographyPairSelector
          value={manifest.typographyPair || 'serif-sans'}
          onChange={handleTypographyChange}
        />
      </div>

      {/* Parchment Tint */}
      <div style={{ borderBottom: '1px solid var(--pl-divider)' }}>
        <ParchmentTintPanel
          currentTint={manifest.parchmentTint || 'none'}
          onApply={handleTintChange}
        />
      </div>

      {/* Watermark toggle */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--pl-divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h4 style={{
            fontSize: '0.82rem', fontWeight: 600,
            color: 'var(--pl-ink)',
            marginBottom: '2px',
          }}>
            Hand-curated with Pearloom
          </h4>
          <p style={{
            fontSize: '0.68rem',
            color: 'var(--pl-muted)',
          }}>
            Show subtle watermark on published site
          </p>
        </div>
        <Switch
          checked={manifest.watermark ?? false}
          onChange={handleWatermarkToggle}
        />
      </div>

      {/* Private Gallery toggle */}
      <div style={{
        padding: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {manifest.privateGallery ? (
            <Lock size={14} className="text-[var(--pl-warning)]" />
          ) : (
            <Unlock size={14} className="text-[var(--pl-olive)]" />
          )}
          <div>
            <h4 style={{
              fontSize: '0.82rem', fontWeight: 600,
              color: 'var(--pl-ink)',
              marginBottom: '2px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              Private Gallery
              {!manifest.privateGallery && (
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--pl-olive)',
                  display: 'inline-block',
                }} />
              )}
            </h4>
            <p style={{
              fontSize: '0.68rem',
              color: 'var(--pl-muted)',
            }}>
              {manifest.privateGallery ? 'Photos hidden from visitors' : 'Photos visible to all visitors'}
            </p>
          </div>
        </div>
        <Switch
          checked={manifest.privateGallery ?? false}
          onChange={handlePrivateGalleryToggle}
        />
      </div>
    </div>
  );
}
