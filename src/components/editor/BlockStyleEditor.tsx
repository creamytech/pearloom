'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockStyleEditor.tsx
// Per-block style controls — background, padding, border-radius,
// text color, font override, opacity, max-width.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Type, Maximize2, Eye } from 'lucide-react';
import { type BlockStyleOverrides, getBlockStyle, setBlockStyle } from '@/lib/block-engine/block-actions';
import { ColorPicker } from '@/components/ui/color-picker';
import { CustomSelect } from '@/components/ui/custom-select';
import { RangeSlider } from '@/components/ui/range-slider';
import type { PageBlock } from '@/types';

const SPACING_OPTIONS = [
  { value: '1rem', label: 'XS' },
  { value: '2rem', label: 'S' },
  { value: '3rem', label: 'M' },
  { value: '5rem', label: 'L' },
  { value: '8rem', label: 'XL' },
];

const RADIUS_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '0.5rem', label: 'S' },
  { value: '1rem', label: 'M' },
  { value: '1.5rem', label: 'L' },
  { value: '2rem', label: 'XL' },
];

interface BlockStyleEditorProps {
  block: PageBlock;
  onChange: (style: BlockStyleOverrides) => void;
}

export function BlockStyleEditor({ block, onChange }: BlockStyleEditorProps) {
  const style = getBlockStyle(block);

  const update = (key: keyof BlockStyleOverrides, value: string | number | undefined) => {
    onChange({ ...style, [key]: value || undefined });
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.62rem', fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--pl-muted)',
    marginBottom: '8px', display: 'block',
  };

  const pillBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: '6px',
    border: active ? '1.5px solid var(--pl-olive)' : '1.5px solid var(--pl-divider)',
    background: active ? 'rgba(163,177,138,0.1)' : 'transparent',
    color: active ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
    fontSize: '0.72rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '16px', paddingBottom: '12px',
        borderBottom: '1px solid var(--pl-divider)',
      }}>
        <Palette size={14} color="var(--pl-olive)" />
        <span style={{
          fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--pl-olive-deep)',
        }}>
          Block Style
        </span>
      </div>

      {/* Background color */}
      <div style={{ marginBottom: '16px' }}>
        <ColorPicker
          label="Background Color"
          value={style.backgroundColor || '#FFFFFF'}
          onChange={(color) => update('backgroundColor', color)}
        />
      </div>

      {/* Text color */}
      <div style={{ marginBottom: '16px' }}>
        <ColorPicker
          label="Text Color"
          value={style.textColor || '#1A1A1A'}
          onChange={(color) => update('textColor', color)}
        />
      </div>

      {/* Padding */}
      <div style={{ marginBottom: '16px' }}>
        <span style={labelStyle}>Padding Top</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {SPACING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update('paddingTop', opt.value)}
              style={pillBtnStyle(style.paddingTop === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <span style={labelStyle}>Padding Bottom</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {SPACING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update('paddingBottom', opt.value)}
              style={pillBtnStyle(style.paddingBottom === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div style={{ marginBottom: '16px' }}>
        <span style={labelStyle}>Border Radius</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update('borderRadius', opt.value)}
              style={pillBtnStyle(style.borderRadius === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div style={{ marginBottom: '16px' }}>
        <RangeSlider
          label="Opacity"
          value={Math.round((style.opacity ?? 1) * 100)}
          onChange={(val) => update('opacity', val / 100)}
          min={10}
          max={100}
          step={5}
          suffix="%"
        />
      </div>

      {/* Max Width */}
      <div style={{ marginBottom: '16px' }}>
        <CustomSelect
          label="Max Width"
          value={style.maxWidth || ''}
          onChange={(val) => update('maxWidth', val || undefined)}
          options={[
            { value: '', label: 'Full width' },
            { value: '640px', label: 'Narrow (640px)' },
            { value: '800px', label: 'Medium (800px)' },
            { value: '1080px', label: 'Standard (1080px)' },
            { value: '1200px', label: 'Wide (1200px)' },
          ]}
        />
      </div>
    </div>
  );
}
