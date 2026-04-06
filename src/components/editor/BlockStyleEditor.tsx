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
        <span style={labelStyle}>Background Color</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="color"
            value={style.backgroundColor || '#FFFFFF'}
            onChange={(e) => update('backgroundColor', e.target.value)}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid var(--pl-divider)', cursor: 'pointer', padding: 0,
            }}
          />
          <input
            type="text"
            value={style.backgroundColor || ''}
            onChange={(e) => update('backgroundColor', e.target.value)}
            placeholder="transparent"
            className="pl-focus-glow"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px',
              border: '1.5px solid var(--pl-divider)', fontSize: '0.82rem',
              background: 'white', color: 'var(--pl-ink)',
            }}
          />
          {style.backgroundColor && (
            <button
              onClick={() => update('backgroundColor', undefined)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--pl-muted)', fontSize: '0.72rem',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Text color */}
      <div style={{ marginBottom: '16px' }}>
        <span style={labelStyle}>Text Color</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="color"
            value={style.textColor || '#1A1A1A'}
            onChange={(e) => update('textColor', e.target.value)}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid var(--pl-divider)', cursor: 'pointer', padding: 0,
            }}
          />
          <input
            type="text"
            value={style.textColor || ''}
            onChange={(e) => update('textColor', e.target.value)}
            placeholder="inherit"
            className="pl-focus-glow"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px',
              border: '1.5px solid var(--pl-divider)', fontSize: '0.82rem',
              background: 'white', color: 'var(--pl-ink)',
            }}
          />
        </div>
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
        <span style={labelStyle}>Opacity</span>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={(style.opacity ?? 1) * 100}
          onChange={(e) => update('opacity', parseInt(e.target.value) / 100)}
          style={{ width: '100%', accentColor: 'var(--pl-olive)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--pl-muted)' }}>
          <span>10%</span>
          <span style={{ fontWeight: 600, color: 'var(--pl-ink-soft)' }}>{Math.round((style.opacity ?? 1) * 100)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Max Width */}
      <div style={{ marginBottom: '16px' }}>
        <span style={labelStyle}>Max Width</span>
        <select
          value={style.maxWidth || ''}
          onChange={(e) => update('maxWidth', e.target.value || undefined)}
          style={{
            width: '100%', padding: '6px 10px', borderRadius: '6px',
            border: '1.5px solid var(--pl-divider)', fontSize: '0.82rem',
            background: 'white', color: 'var(--pl-ink)', cursor: 'pointer',
          }}
        >
          <option value="">Full width</option>
          <option value="640px">Narrow (640px)</option>
          <option value="800px">Medium (800px)</option>
          <option value="1080px">Standard (1080px)</option>
          <option value="1200px">Wide (1200px)</option>
        </select>
      </div>
    </div>
  );
}
