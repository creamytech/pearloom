'use client';

/* ========================================================================
   BlockStylePanel — per-section style overrides without leaving the
   block's panel. Each section's panel renders this at the bottom so
   the host can fine-tune just that section: text alignment, max width,
   padding, text colour, hide toggle. Falls back to globals when nothing
   is set. Reset returns the section to defaults.
   ======================================================================== */

import type { StoryManifest, BlockStyleOverride } from '@/types';
import { Field, PanelSection } from '../atoms';
import { Icon } from '../../motifs';
import { Switch, V8Slider } from '../v8-forms';

interface Props {
  manifest: StoryManifest;
  /** Section id — must match the section's id attribute (e.g. 'schedule'). */
  blockId: string;
  /** Human-readable label shown in the panel header. */
  label?: string;
  onChange: (m: StoryManifest) => void;
}

const ALIGN_OPTIONS = [
  { id: 'left',   label: 'Left'   },
  { id: 'center', label: 'Center' },
  { id: 'right',  label: 'Right'  },
] as const;

const SPACING_OPTIONS = [
  { id: '',           label: 'Inherit' },
  { id: 'cozy',       label: 'Cozy'    },
  { id: 'comfortable',label: 'Comfortable' },
  { id: 'spacious',   label: 'Spacious' },
  { id: 'lush',       label: 'Lush'    },
] as const;

const RADIUS_OPTIONS = [
  { id: '',        label: 'Inherit' },
  { id: 'sharp',   label: 'Sharp'   },
  { id: 'soft',    label: 'Soft'    },
  { id: 'rounded', label: 'Rounded' },
  { id: 'pillow',  label: 'Pillow'  },
] as const;

const MAX_WIDTH_OPTIONS = [
  { id: 0,    label: 'Inherit' },
  { id: 720,  label: 'Narrow (720)' },
  { id: 960,  label: 'Standard (960)' },
  { id: 1160, label: 'Wide (1160)'   },
  { id: 1320, label: 'Full (1320)'   },
] as const;

export function BlockStylePanel({ manifest, blockId, label = 'Section style', onChange }: Props) {
  const styles = (manifest as unknown as { blockStyles?: Record<string, BlockStyleOverride> }).blockStyles ?? {};
  const current: BlockStyleOverride = styles[blockId] ?? {};

  function set(patch: Partial<BlockStyleOverride>) {
    const next: BlockStyleOverride = { ...current, ...patch };
    // Strip empty / undefined keys to keep manifest clean.
    Object.keys(next).forEach((k) => {
      const v = (next as Record<string, unknown>)[k];
      if (v === undefined || v === '' || v === 0) delete (next as Record<string, unknown>)[k];
    });
    const nextStyles = { ...styles };
    if (Object.keys(next).length === 0) {
      delete nextStyles[blockId];
    } else {
      nextStyles[blockId] = next;
    }
    onChange({ ...manifest, blockStyles: nextStyles } as unknown as StoryManifest);
  }

  function reset() {
    const nextStyles = { ...styles };
    delete nextStyles[blockId];
    onChange({ ...manifest, blockStyles: nextStyles } as unknown as StoryManifest);
  }

  const hasOverride = Object.keys(current).length > 0;

  return (
    <PanelSection
      label={label}
      hint="Tweak just this section without touching the global theme."
      action={
        hasOverride ? (
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '3px 8px',
              fontSize: 10.5,
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--line)',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reset
          </button>
        ) : undefined
      }
    >
      {/* Hide toggle */}
      <Field label="Visibility">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 10,
          }}
        >
          <Switch
            checked={!current.hidden}
            onChange={(v) => set({ hidden: !v || undefined })}
            ariaLabel="Toggle section visibility"
          />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>Show this section</span>
          {current.hidden && (
            <span style={{ fontSize: 10, color: 'var(--peach-ink)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Hidden
            </span>
          )}
        </div>
      </Field>

      {/* Spacing */}
      <Field label="Section spacing">
        <SegRow
          value={current.spacing ?? ''}
          options={SPACING_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ spacing: v || undefined })}
        />
      </Field>

      {/* Card radius */}
      <Field label="Card radius">
        <SegRow
          value={current.cardRadius ?? ''}
          options={RADIUS_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ cardRadius: v || undefined })}
        />
      </Field>

      {/* Text alignment */}
      <Field label="Text alignment">
        <div style={{ display: 'flex', gap: 4 }}>
          {ALIGN_OPTIONS.map((a) => {
            const on = current.textAlign === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => set({ textAlign: on ? undefined : a.id })}
                title={a.label}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 6,
                  background: on ? 'var(--ink)' : 'var(--card)',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {a.id === 'left' && <AlignIcon variant="left" />}
                {a.id === 'center' && <AlignIcon variant="center" />}
                {a.id === 'right' && <AlignIcon variant="right" />}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Max width */}
      <Field label="Max width">
        <SegRow
          value={String(current.maxWidth ?? 0)}
          options={MAX_WIDTH_OPTIONS.map((m) => ({ id: String(m.id), label: m.label }))}
          onChange={(v) => set({ maxWidth: Number(v) || undefined })}
        />
      </Field>

      {/* Padding Y */}
      <Field label={`Extra padding (${current.paddingY ?? 0}px)`}>
        <V8Slider
          value={current.paddingY ?? 0}
          onChange={(n) => set({ paddingY: n || undefined })}
          min={-40}
          max={120}
          step={4}
          unit="px"
          ariaLabel="Extra section padding"
        />
      </Field>

      {/* Text colour */}
      <Field label="Text colour">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={current.textColor ?? '#000000'}
            onChange={(e) => set({ textColor: e.target.value })}
            style={{
              width: 38,
              height: 32,
              padding: 2,
              border: '1px solid var(--line)',
              borderRadius: 6,
              background: 'var(--card)',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            onClick={() => set({ textColor: undefined })}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              background: 'transparent',
              color: 'var(--ink-muted)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Inherit
          </button>
        </div>
      </Field>

      {hasOverride && (
        <div
          style={{
            marginTop: 10,
            padding: 8,
            background: 'var(--cream-2)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--ink-soft)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="sparkles" size={11} />
          {Object.keys(current).length} override{Object.keys(current).length === 1 ? '' : 's'} on this section
        </div>
      )}
    </PanelSection>
  );
}

function SegRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 4 }}>
      {options.map((o) => {
        const on = String(value) === o.id;
        return (
          <button
            key={o.id || 'inherit'}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              padding: '5px 4px',
              fontSize: 10.5,
              borderRadius: 6,
              background: on ? 'var(--ink)' : 'var(--card)',
              color: on ? 'var(--cream)' : 'var(--ink-soft)',
              border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: on ? 700 : 500,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function AlignIcon({ variant }: { variant: 'left' | 'center' | 'right' }) {
  const lines = variant === 'left'
    ? [{ x1: 4, x2: 14 }, { x1: 4, x2: 18 }, { x1: 4, x2: 12 }]
    : variant === 'right'
      ? [{ x1: 10, x2: 20 }, { x1: 6, x2: 20 }, { x1: 12, x2: 20 }]
      : [{ x1: 7, x2: 17 }, { x1: 5, x2: 19 }, { x1: 9, x2: 15 }];
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={6 + i * 6} x2={l.x2} y2={6 + i * 6} />
      ))}
    </svg>
  );
}
