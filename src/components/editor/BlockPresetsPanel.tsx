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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Save button */}
      {!saving ? (
        <button
          onClick={() => setSaving(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 10px', borderRadius: '8px',
            border: '1px dashed rgba(24,24,27,0.08)',
            background: 'transparent', color: '#71717A',
            cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            width: '100%', justifyContent: 'center',
          }}
        >
          <Plus size={11} /> Save current as preset
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            autoFocus
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false); }}
            placeholder="Preset name…"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px',
              border: '1px solid rgba(24,24,27,0.08)',
              background: '#F4F4F5',
              color: '#18181B', fontSize: '0.75rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            style={{
              padding: '6px 10px', borderRadius: '6px',
              border: 'none', background: 'rgba(24,24,27,0.12)',
              color: '#71717A', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
              opacity: saveName.trim() ? 1 : 0.4,
            }}
          >Save</button>
          <button
            onClick={() => setSaving(false)}
            style={{
              padding: '6px 8px', borderRadius: '6px',
              border: 'none', background: 'rgba(0,0,0,0.04)',
              color: '#3F3F46', cursor: 'pointer', fontSize: '0.75rem',
            }}
          >✕</button>
        </div>
      )}

      {/* Presets list */}
      {presets.length === 0 ? (
        <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.7rem', color: '#71717A' }}>
          No saved presets yet
        </div>
      ) : (
        presets.map(preset => (
          <div
            key={preset.id}
            onMouseEnter={() => setHoveredId(preset.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', borderRadius: '8px',
              background: hoveredId === preset.id ? 'rgba(24,24,27,0.04)' : 'rgba(24,24,27,0.03)',
              border: '1px solid rgba(0,0,0,0.04)',
              transition: 'background 0.15s',
            }}
          >
            <Bookmark size={12} color="#A1A1AA" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.name}</div>
              <div style={{ fontSize: '0.6rem', color: '#71717A' }}>
                {new Date(preset.savedAt).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => onApply(preset.config, preset.blockEffects)}
              title="Apply preset"
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '4px 8px', borderRadius: '6px',
                border: '1px solid rgba(24,24,27,0.12)',
                background: 'rgba(24,24,27,0.04)',
                color: '#71717A', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <Download size={10} /> Apply
            </button>
            <button
              onClick={() => deletePreset(preset.id)}
              title="Delete preset"
              style={{
                display: 'flex', padding: '4px', borderRadius: '6px',
                border: 'none', background: 'none',
                color: '#71717A', cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
