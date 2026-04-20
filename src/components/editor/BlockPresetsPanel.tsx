'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockPresetsPanel.tsx
//
// Save a block's current config as a named preset, load it
// back onto any block of the same type.
// Presets are stored in localStorage keyed by block type.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { Bookmark, Trash2, Download, Plus } from 'lucide-react';
import type { PageBlock } from '@/types';
import { makeId } from '@/lib/editor-ids';
import { logEditorError } from '@/lib/editor-log';
import {
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

const STORAGE_KEY = 'pl-block-presets-v1';

interface BlockPreset {
  id: string;
  name: string;
  type: PageBlock['type'];
  config: Record<string, unknown>;
  blockEffects?: PageBlock['blockEffects'];
  savedAt: string;
}

// ── Persistence helpers ───────────────────────────────────────

function loadPresets(): BlockPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    logEditorError('BlockPresets: load presets', err);
    return [];
  }
}

function savePresets(presets: BlockPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (err) {
    logEditorError('BlockPresets: save presets', err);
  }
}

// ── Hook ─────────────────────────────────────────────────────

export function useBlockPresets(type: PageBlock['type']) {
  const [presets, setPresets] = useState<BlockPreset[]>([]);

  useEffect(() => {
    setPresets(loadPresets().filter(p => p.type === type));
  }, [type]);

  const savePreset = useCallback((name: string, block: PageBlock) => {
    const newPreset: BlockPreset = {
      id: makeId('preset'),
      name: name.trim() || `${block.type} preset`,
      type: block.type,
      config: (block.config || {}) as Record<string, unknown>,
      blockEffects: block.blockEffects,
      savedAt: new Date().toISOString(),
    };
    const all = loadPresets();
    const updated = [newPreset, ...all.slice(0, 19)]; // max 20 presets total
    savePresets(updated);
    setPresets(updated.filter(p => p.type === type));
    return newPreset;
  }, [type]);

  const deletePreset = useCallback((id: string) => {
    const updated = loadPresets().filter(p => p.id !== id);
    savePresets(updated);
    setPresets(updated.filter(p => p.type === type));
  }, [type]);

  return { presets, savePreset, deletePreset };
}

// ── Component ─────────────────────────────────────────────────

interface BlockPresetsPanelProps {
  block: PageBlock;
  onApply: (config: Record<string, unknown>, blockEffects?: PageBlock['blockEffects']) => void;
}

export function BlockPresetsPanel({ block, onApply }: BlockPresetsPanelProps) {
  const { presets, savePreset, deletePreset } = useBlockPresets(block.type);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSave = () => {
    if (!saveName.trim()) return;
    savePreset(saveName, block);
    setSaveName('');
    setSaving(false);
  };

  const pillMono: React.CSSProperties = {
    fontFamily: panelFont.mono,
    fontSize: panelText.meta,
    fontWeight: panelWeight.bold,
    letterSpacing: panelTracking.widest,
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
    lineHeight: 1,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {!saving ? (
        <button
          type="button"
          onClick={() => setSaving(true)}
          style={{
            ...pillMono,
            padding: '9px 12px',
            borderRadius: 'var(--pl-radius-lg)',
            border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 30%, transparent)',
            background: 'color-mix(in srgb, var(--pl-chrome-accent) 4%, transparent)',
            color: 'var(--pl-chrome-text-soft)',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <Plus size={11} strokeWidth={1.75} /> Save current as preset
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'color-mix(in srgb, var(--pl-chrome-accent) 4%, var(--pl-chrome-bg))',
            border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
          }}
        >
          <span
            style={{
              fontFamily: panelFont.mono,
              fontSize: panelText.meta,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.widest,
              textTransform: 'uppercase',
              color: 'var(--pl-chrome-text-faint)',
            }}
          >
            Preset name
          </span>
          <input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setSaving(false);
            }}
            placeholder="e.g. editorial hero"
            style={{
              width: '100%',
              padding: '8px 2px 7px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--pl-chrome-border)',
              borderRadius: 0,
              fontFamily: panelFont.body,
              fontSize: 'max(16px, 0.82rem)',
              color: 'var(--pl-chrome-text)',
              outline: 'none',
              transition: 'border-color 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-accent)';
              e.currentTarget.style.borderBottomWidth = '1.5px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'var(--pl-chrome-border)';
              e.currentTarget.style.borderBottomWidth = '1px';
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setSaving(false)}
              style={{
                ...pillMono,
                padding: '7px 12px',
                borderRadius: 'var(--pl-radius-full)',
                border: '1px solid var(--pl-chrome-border)',
                background: 'transparent',
                color: 'var(--pl-chrome-text-soft)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!saveName.trim()}
              style={{
                ...pillMono,
                padding: '7px 14px',
                borderRadius: 'var(--pl-radius-full)',
                border: '1px solid var(--pl-chrome-accent)',
                background: 'var(--pl-chrome-accent)',
                color: 'var(--pl-chrome-accent-ink)',
                opacity: saveName.trim() ? 1 : 0.4,
                cursor: saveName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Commit
            </button>
          </div>
        </div>
      )}

      {presets.length === 0 ? (
        <div
          style={{
            padding: '14px 12px',
            textAlign: 'center',
            fontFamily: panelFont.body,
            fontStyle: 'italic',
            fontSize: panelText.hint,
            color: 'var(--pl-chrome-text-muted)',
            border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 22%, transparent)',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, transparent)',
          }}
        >
          No saved presets yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {presets.map((preset, idx) => (
            <div
              key={preset.id}
              onMouseEnter={() => setHoveredId(preset.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--pl-radius-lg)',
                background:
                  hoveredId === preset.id
                    ? 'color-mix(in srgb, var(--pl-chrome-accent) 6%, var(--pl-chrome-surface))'
                    : 'var(--pl-chrome-surface)',
                border: '1px solid var(--pl-chrome-border)',
                transition: 'background 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <Bookmark
                size={12}
                strokeWidth={1.5}
                color="var(--pl-chrome-accent)"
                style={{ flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '6px',
                    marginBottom: '2px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: panelFont.mono,
                      fontSize: panelText.meta,
                      fontWeight: panelWeight.bold,
                      letterSpacing: panelTracking.widest,
                      color: 'var(--pl-chrome-text-faint)',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: panelText.itemTitle,
                    fontWeight: panelWeight.regular,
                    color: 'var(--pl-chrome-text)',
                    lineHeight: panelLineHeight.tight,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {preset.name}
                </div>
                <div
                  style={{
                    fontFamily: panelFont.mono,
                    fontSize: panelText.meta,
                    letterSpacing: panelTracking.wider,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-muted)',
                    marginTop: '3px',
                  }}
                >
                  {new Date(preset.savedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApply(preset.config, preset.blockEffects)}
                title="Apply preset"
                style={{
                  ...pillMono,
                  padding: '6px 10px',
                  borderRadius: 'var(--pl-radius-full)',
                  border: '1px solid var(--pl-chrome-accent)',
                  background: 'color-mix(in srgb, var(--pl-chrome-accent) 12%, transparent)',
                  color: 'var(--pl-chrome-accent)',
                  flexShrink: 0,
                }}
              >
                <Download size={10} strokeWidth={1.75} /> Apply
              </button>
              <button
                type="button"
                onClick={() => deletePreset(preset.id)}
                title="Delete preset"
                aria-label="Delete preset"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '1px solid var(--pl-chrome-border)',
                  background: 'transparent',
                  color: 'var(--pl-chrome-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
                }}
              >
                <Trash2 size={11} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
