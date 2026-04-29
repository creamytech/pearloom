'use client';

/* ========================================================================
   BlockStylePanel — per-section style overrides without leaving the
   block's panel. Each section's panel renders this at the bottom so
   the host can fine-tune just that section: text alignment, max width,
   padding, text colour, hide toggle. Falls back to globals when nothing
   is set. Reset returns the section to defaults.
   ======================================================================== */

import { useMemo, useState } from 'react';
import type { StoryManifest, BlockStyleOverride } from '@/types';
import { Field, PanelSection } from '../atoms';
import { Icon } from '../../motifs';
import { Switch, V8Slider } from '../v8-forms';
import { V8ColorPicker } from '../v8-color-picker';
import { contrastRatio } from '@/lib/color-utils';

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

const SHADOW_OPTIONS = [
  { id: '',         label: 'Inherit'  },
  { id: 'none',     label: 'Flat'     },
  { id: 'soft',     label: 'Soft'     },
  { id: 'lifted',   label: 'Lifted'   },
  { id: 'floating', label: 'Floating' },
] as const;

const BORDER_OPTIONS = [
  { id: '',         label: 'Inherit'  },
  { id: 'none',     label: 'None'     },
  { id: 'hairline', label: 'Hairline' },
  { id: 'heavy',    label: 'Heavy'    },
] as const;

const PADDING_OPTIONS = [
  { id: '',         label: 'Inherit'  },
  { id: 'compact',  label: 'Compact'  },
  { id: 'default',  label: 'Default'  },
  { id: 'generous', label: 'Generous' },
] as const;

const SHAPE_OPTIONS = [
  { id: '',        label: 'Default' },
  { id: 'pillow',  label: 'Pillow'  },
  { id: 'sharp',   label: 'Sharp'   },
  { id: 'scallop', label: 'Scallop' },
  { id: 'arch',    label: 'Arch'    },
] as const;

const BACKDROP_OPTIONS = [
  { id: '',           label: 'Inherit'  },
  { id: 'paper',      label: 'Paper'    },
  { id: 'cream-2',    label: 'Cream'    },
  { id: 'vellum',     label: 'Vellum'   },
  { id: 'gold-mist',  label: 'Gold mist' },
] as const;

// ── Scene presets ─────────────────────────────────────────────
// Six named combinations of card style values. Picking one
// applies all of its fields at once; clearing reverts to inherit.
// Designed to feel like "moods" rather than mechanical settings —
// hosts pick "Linen" rather than tweaking five sliders.
type Scene = {
  id: 'letterpress' | 'carved' | 'scrapbook' | 'linen' | 'slate' | 'vellum';
  label: string;
  hint: string;
  apply: Partial<BlockStyleOverride>;
};

const SCENES: readonly Scene[] = [
  {
    id: 'letterpress', label: 'Letterpress',
    hint: 'Sharp ink, hairline border, no shadow. Reads like a printed card.',
    apply: { cardRadius: 'sharp', cardBorder: 'hairline', cardShadow: 'none', cardBackdrop: 'paper' },
  },
  {
    id: 'carved', label: 'Carved',
    hint: 'Pillow shape, lifted shadow, generous padding. Feels embossed.',
    apply: { cardRadius: 'pillow', cardShadow: 'lifted', cardPadding: 'generous', cardBackdrop: 'paper' },
  },
  {
    id: 'scrapbook', label: 'Scrapbook',
    hint: 'Scallop edges, soft shadow, cream backdrop. Hand-cut feel.',
    apply: { cardShape: 'scallop', cardShadow: 'soft', cardBackdrop: 'cream-2', cardPadding: 'compact' },
  },
  {
    id: 'linen', label: 'Linen',
    hint: 'Vellum tint, soft radius, no border. Layered + airy.',
    apply: { cardRadius: 'soft', cardShadow: 'soft', cardBorder: 'none', cardBackdrop: 'vellum' },
  },
  {
    id: 'slate', label: 'Slate',
    hint: 'Sharp, heavy border, floating shadow. Architectural.',
    apply: { cardRadius: 'sharp', cardBorder: 'heavy', cardShadow: 'floating', cardBackdrop: 'paper', cardPadding: 'generous' },
  },
  {
    id: 'vellum', label: 'Vellum',
    hint: 'Rounded, gold-mist backdrop, no shadow. Quiet warmth.',
    apply: { cardRadius: 'rounded', cardShadow: 'none', cardBorder: 'hairline', cardBackdrop: 'gold-mist' },
  },
];

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
      {/* Scene presets — six named card-style combos. One click
          applies the whole stack so hosts pick a feel ("Linen")
          rather than tweaking five sliders. */}
      <Field label="Scene preset" help="Apply a named look in one click. Tweak any field below to fine-tune.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {SCENES.map((s) => {
            // A scene is "active" when every key it sets matches
            // the current override exactly. Strict comparison keeps
            // the highlight honest — partial matches don't light up.
            const on = Object.entries(s.apply).every(
              ([k, v]) => (current as Record<string, unknown>)[k] === v,
            );
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => set(s.apply)}
                title={s.hint}
                style={{
                  padding: '8px 6px',
                  borderRadius: 8,
                  background: on ? 'var(--ink, #0E0D0B)' : 'var(--card)',
                  color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink)',
                  border: `1px solid ${on ? 'var(--ink, #0E0D0B)' : 'var(--line)'}`,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: on ? 700 : 600,
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '0.01em',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Field>

      <PearSceneSuggest
        manifest={manifest}
        blockId={blockId}
        onPick={(sceneId) => {
          const scene = SCENES.find((s) => s.id === sceneId);
          if (scene) set(scene.apply);
        }}
      />

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

      {/* Card shadow */}
      <Field label="Card shadow" help="From flat to floating — pick what reads with the rest of the section's chrome.">
        <SegRow
          value={current.cardShadow ?? ''}
          options={SHADOW_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ cardShadow: v ? (v as 'none' | 'soft' | 'lifted' | 'floating') : undefined })}
        />
      </Field>

      {/* Card border */}
      <Field label="Card border">
        <SegRow
          value={current.cardBorder ?? ''}
          options={BORDER_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ cardBorder: v ? (v as 'none' | 'hairline' | 'heavy') : undefined })}
        />
      </Field>

      {/* Card padding */}
      <Field label="Card padding">
        <SegRow
          value={current.cardPadding ?? ''}
          options={PADDING_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ cardPadding: v ? (v as 'compact' | 'default' | 'generous') : undefined })}
        />
      </Field>

      {/* Card silhouette — different language than radius. Pillow
          rounds harder than 'rounded' radius; scallop gives a wavy
          edge; arch keeps the bottom flat with a rounded top. */}
      <Field label="Card shape" help="Goes beyond corner radius — scallop gives wavy edges, arch curves only the top.">
        <SegRow
          value={current.cardShape ?? ''}
          options={SHAPE_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ cardShape: v ? (v as 'pillow' | 'sharp' | 'scallop' | 'arch') : undefined })}
        />
      </Field>

      {/* Card backdrop — adds a subtle tint layer behind the card
          without affecting any other style. Useful when cards live
          on a section's main background and need separation. */}
      <Field label="Card backdrop">
        <SegRow
          value={current.cardBackdrop ?? ''}
          options={BACKDROP_OPTIONS as readonly { id: string; label: string }[]}
          onChange={(v) => set({ cardBackdrop: v ? (v as 'paper' | 'cream-2' | 'vellum' | 'gold-mist') : undefined })}
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

      {/* Background */}
      <Field
        label="Background"
        help="Tap a swatch for a quick wash, or pick a custom colour. Pear flips text contrast automatically."
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {[
            { id: '', label: 'Inherit', sw: 'transparent', border: '1px dashed var(--line)' },
            { id: 'paper', label: 'Paper', sw: 'var(--cream)' },
            { id: 'wash', label: 'Wash', sw: 'radial-gradient(circle at 50% 30%, rgba(198,112,61,0.18), transparent 70%)' },
            { id: 'mesh', label: 'Mesh', sw: 'radial-gradient(circle at 20% 30%, #F4C7A4 0%, transparent 60%), radial-gradient(circle at 80% 70%, #C9D6B5 0%, transparent 60%)' },
          ].map((p) => {
            const on = (current.background ?? '') === p.id;
            return (
              <button
                key={p.id || 'inherit'}
                type="button"
                onClick={() => set({ background: (p.id || undefined) as BlockStyleOverride['background'] })}
                title={p.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px 4px 4px',
                  borderRadius: 999,
                  background: 'var(--card)',
                  border: on ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: on ? 700 : 500,
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: p.sw,
                    border: p.border ?? '1px solid var(--line-soft)',
                  }}
                />
                {p.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <V8ColorPicker
            value={
              current.background && current.background.startsWith('#')
                ? current.background
                : '#FBF7EE'
            }
            onChange={(v) => set({ background: v })}
            ariaLabel="Section background colour"
          />
          <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
            Custom colour — text contrast auto-adjusts.
          </span>
        </div>
      </Field>

      {/* Text colour */}
      <Field label="Text colour">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <V8ColorPicker
            value={current.textColor ?? '#000000'}
            onChange={(v) => set({ textColor: v })}
            ariaLabel="Section text colour"
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
        <ContrastWarning
          background={current.background}
          textColor={current.textColor}
        />
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

// ── ContrastWarning ──────────────────────────────────────────
// Reads the current background + textColor overrides, computes
// the WCAG contrast ratio, and surfaces a warning when it falls
// below the 4.5 AA threshold for body text. Silent when colors
// pass, when colors aren't set, or when the background isn't a
// hex (e.g. 'paper' / 'wash' / 'mesh' presets — those are theme-
// driven and the renderer auto-picks an ink family for them).
function ContrastWarning({
  background,
  textColor,
}: {
  background?: string;
  textColor?: string;
}) {
  // contrastRatio only handles hex pairs; the string presets
  // 'paper' / 'wash' / 'mesh' are theme-driven and the renderer
  // already auto-picks a readable ink family for them, so we
  // skip checks when either side isn't a #RRGGBB literal.
  const ratio = useMemo(() => {
    if (!background || !textColor) return null;
    if (!/^#[0-9a-fA-F]{6}$/.test(background)) return null;
    if (!/^#[0-9a-fA-F]{6}$/.test(textColor)) return null;
    return contrastRatio(background, textColor);
  }, [background, textColor]);

  if (!background || !textColor) return null;
  if (ratio === null) return null;
  if (ratio >= 4.5) {
    return (
      <div style={{ fontSize: 10.5, color: 'var(--sage-deep, #5C6B3F)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>
        ✓ Contrast {ratio.toFixed(1)} — easy to read.
      </div>
    );
  }
  const label = ratio < 3 ? 'Hard to read' : 'Tight';
  return (
    <div
      role="alert"
      style={{
        marginTop: 6,
        padding: '6px 10px',
        background: 'rgba(122,45,45,0.08)',
        border: '1px solid rgba(122,45,45,0.22)',
        borderRadius: 8,
        fontSize: 11,
        color: '#7A2D2D',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.4,
      }}
    >
      {label} — {ratio.toFixed(1)}:1 contrast. Body text needs at least 4.5:1 for AA.
      Try a darker text color, or pick a lighter background.
    </div>
  );
}

// ── Pear scene suggester ─────────────────────────────────────
// Calls /api/pear-scene with the section + manifest context and
// surfaces a single recommended preset with a one-line reason.
// Click the suggestion → applies it via the existing scene-apply
// path. Network failures fall back to "Linen" with a calm note.
function PearSceneSuggest({
  manifest,
  blockId,
  onPick,
}: {
  manifest: StoryManifest;
  blockId: string;
  onPick: (sceneId: 'letterpress' | 'carved' | 'scrapbook' | 'linen' | 'slate' | 'vellum') => void;
}) {
  const [busy, setBusy] = useState(false);
  const [scene, setScene] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pear-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest, blockId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { scene?: string; reason?: string };
      if (!data.scene) throw new Error('Empty response');
      setScene(data.scene);
      setReason(data.reason ?? null);
    } catch {
      setError('Pear hesitated. Try again?');
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!scene) return;
    onPick(scene as 'letterpress' | 'carved' | 'scrapbook' | 'linen' | 'slate' | 'vellum');
    setScene(null);
    setReason(null);
  }

  return (
    <div
      style={{
        marginTop: 6,
        padding: '8px 10px',
        background: 'var(--cream-2, #F5EFE2)',
        border: '1px dashed var(--line-soft)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {!scene ? (
        <button
          type="button"
          onClick={suggest}
          disabled={busy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 999,
            background: 'transparent',
            border: '1px dashed var(--peach-ink, #C6703D)',
            color: 'var(--peach-ink, #C6703D)',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'var(--font-ui)',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Icon name="sparkles" size={11} /> {busy ? 'Pear is reading…' : 'Pear, pick a scene for this section'}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)' }}>
            Pear suggests · {scene[0].toUpperCase() + scene.slice(1)}
          </div>
          {reason && (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 13,
                color: 'var(--ink)',
                lineHeight: 1.4,
              }}
            >
              {reason}
            </p>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button type="button" onClick={apply} style={{ flex: 1, padding: '5px 10px', borderRadius: 999, background: 'var(--ink, #0E0D0B)', color: 'var(--cream)', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              Apply
            </button>
            <button type="button" onClick={() => { setScene(null); setReason(null); }} style={{ padding: '5px 10px', borderRadius: 999, background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              Skip
            </button>
          </div>
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 11, color: '#7A2D2D' }}>{error}</div>}
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
