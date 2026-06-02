'use client';

/* ========================================================================
   EditorDialBar — bottom fine-tune dial row.

   LITERAL port of the prototype's right-rail ThemePicker fine-tune
   dials (ClaudeDesign/pages/editor-redesign.jsx) + tweaks-panel
   control primitives (ClaudeDesign/shared/tweaks-panel.jsx),
   surfaced as a single bottom bar that runs the width of the canvas.

   Dials, left to right:
     • Event chip      — opens the command palette filtered by event
     • Theme chip      — opens the Theme Shop bottom sheet
     • Kit chip        — opens the kit picker (jumps to inspector Theme tab)
     • Layout chip     — opens the layout picker (jumps to inspector Theme tab)
     • Voice           — segmented (Match / Classic / Playful / Poetic)
     • Density         — segmented (Cozy / Comfy / Airy)
     • Texture dial    — slider 0–1.5
     • Motifs toggle   — pill toggle (pear stamp / squiggle / blob)
     • Match photos    — file input
     • Generate        — text input that calls /api/look/from-story
     • Saved looks     — 6-slot localStorage chip strip
     • Shuffle         — random pull across all dials

   All controls write straight to manifest via onChange — no internal
   state coupling. State lives upstream in EditorV8.
   ====================================================================== */

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { lookDefaultsFor, getEventType } from '@/lib/event-os/event-types';
import { EDITIONS } from '@/lib/site-editions/editions';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { paletteFromFile } from '@/lib/look-engine/palette-from-photo';
import { generateLookFromStory, type SuggestedLook } from '@/lib/look-engine/generate-from-story';

type Density = NonNullable<StoryManifest['density']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;
type EditionId = NonNullable<StoryManifest['edition']>;
type TextureId = NonNullable<StoryManifest['texture']>;
type KitId = NonNullable<StoryManifest['kitId']>;
type SiteLayoutId = NonNullable<StoryManifest['siteLayout']>;

interface SavedLook {
  edition?: EditionId;
  texture?: TextureId;
  density: Density;
  textureIntensity: number;
  voiceOverride?: VoiceOverride;
  kitId?: KitId;
  siteLayout?: SiteLayoutId;
}

const LOOKS_KEY = 'pl-looks';
const MAX_LOOKS = 6;

const KIT_LABEL: Record<KitId, string> = {
  classic: 'Classic',
  ticket: 'Ticket',
  plate: 'Plate',
  scrapbook: 'Scrapbook',
  index: 'Index',
  minimal: 'Minimal',
  arch: 'Arch',
  stamp: 'Stamp',
  deco: 'Deco',
};

const LAYOUT_LABEL: Record<SiteLayoutId, string> = {
  stacked: 'Stacked',
  boxed: 'Boxed',
  split: 'Split',
};

/* ---------- Primitives (tweaks-panel.jsx port) ---------- */

/* Segmented control — port of TweakRadio (tweaks-panel.jsx ~L293). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-chrome-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        style={{
          position: 'relative',
          display: 'inline-flex',
          padding: 2,
          background: 'rgba(0,0,0,0.06)',
          borderRadius: 8,
          userSelect: 'none',
        }}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '5px 10px',
                minHeight: 22,
                borderRadius: 6,
                border: 0,
                background: on ? 'rgba(255,255,255,0.92)' : 'transparent',
                boxShadow: on ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
                color: 'var(--pl-chrome-text)',
                fontFamily: 'inherit',
                fontSize: 11.5,
                fontWeight: on ? 600 : 500,
                lineHeight: 1.2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 150ms cubic-bezier(0.3,0.7,0.4,1)',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Range slider — port of TweakSlider (tweaks-panel.jsx ~L273). */
function RangeDial({
  value,
  min,
  max,
  step,
  onChange,
  label,
  valueLabel,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label: string;
  valueLabel: string;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-chrome-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          width: 110,
          height: 4,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.12)',
          outline: 'none',
          margin: 0,
        }}
        className="pl8-dial-range"
      />
      <span style={{ fontSize: 11, color: 'var(--pl-chrome-text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 48 }}>
        {valueLabel}
      </span>
    </div>
  );
}

/* Toggle — port of TweakToggle (tweaks-panel.jsx ~L282). */
function ToggleDial({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-chrome-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          position: 'relative',
          width: 32,
          height: 18,
          border: 0,
          borderRadius: 999,
          padding: 0,
          background: value ? '#34c759' : 'rgba(0,0,0,0.15)',
          cursor: 'pointer',
          transition: 'background 150ms ease',
        }}
      >
        <i
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            transform: value ? 'translateX(14px)' : 'translateX(0)',
            transition: 'transform 150ms ease',
          }}
        />
      </button>
    </div>
  );
}

/* Chip — clickable summary pill (theme/event/kit/layout chips). */
function Chip({
  label,
  value,
  onClick,
  icon,
  tone,
}: {
  label: string;
  value: string;
  onClick: () => void;
  icon?: string;
  tone?: 'default' | 'sage' | 'peach' | 'lavender';
}) {
  const tones: Record<string, { bg: string; ink: string; ring: string }> = {
    default: { bg: 'var(--pl-chrome-surface)', ink: 'var(--pl-chrome-text)', ring: 'var(--pl-chrome-border)' },
    sage: { bg: 'rgba(92,107,63,0.12)', ink: 'var(--sage-deep, #3D4A1F)', ring: 'rgba(92,107,63,0.30)' },
    peach: { bg: 'rgba(198,112,61,0.12)', ink: 'var(--peach-ink, #C6703D)', ring: 'rgba(198,112,61,0.30)' },
    lavender: { bg: 'rgba(196,181,217,0.18)', ink: 'var(--lavender-ink, #5A4A78)', ring: 'rgba(196,181,217,0.40)' },
  };
  const t = tones[tone || 'default'];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 11px',
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.ring}`,
        color: t.ink,
        fontFamily: 'inherit',
        fontSize: 11.5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {icon && <Icon name={icon} size={11} />}
      <span style={{ fontWeight: 500, opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
      <Icon name="chev-down" size={9} />
    </button>
  );
}

function intensityLabel(v: number): string {
  if (v <= 0.01) return 'Off';
  if (v < 0.6) return 'Faint';
  if (v < 1.05) return 'Natural';
  if (v < 1.35) return 'Rich';
  return 'Bold';
}

/* ---------- Main bar ---------- */

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  onOpenEvent: () => void;
  onOpenTheme: () => void;
  onOpenKit: () => void;
  onOpenLayout: () => void;
}

export function EditorDialBar({
  manifest,
  onChange,
  onOpenEvent,
  onOpenTheme,
  onOpenKit,
  onOpenLayout,
}: Props) {
  const lookDefaults = lookDefaultsFor(manifest.occasion);
  const density: Density = manifest.density ?? lookDefaults.density;
  const intensity = manifest.textureIntensity ?? lookDefaults.textureIntensity;
  const voiceOverride = manifest.voiceOverride; // undefined = "match event"
  const texture = manifest.texture ?? 'smooth';

  /* Resolve active edition / layout / kit / event labels for the
     chip summary text — same fallback chain the renderer uses. */
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const eventLabel = eventType?.label ?? 'Wedding';
  const editionId = manifest.edition ?? 'almanac';
  const activeEdition =
    EDITIONS.find((e) => e.id === editionId) ??
    resolveEdition({ edition: editionId, occasion, voice: eventType?.voice ?? 'celebratory' });
  const themeLabel = activeEdition.label;
  const kitId: KitId = manifest.kitId ?? lookDefaults.kitId;
  const kitLabel = KIT_LABEL[kitId] ?? kitId;
  const siteLayout: SiteLayoutId =
    manifest.siteLayout ?? activeEdition.recommendedLayout ?? 'stacked';
  const layoutLabel = LAYOUT_LABEL[siteLayout] ?? siteLayout;

  /* motifs: derive an "active" state from the multi-slot manifest.motifs.
     prototype keeps a single boolean (motifsOn); production reflects
     that by keying off whether ANY of the recognised motif slots are
     populated. Toggling on writes a default sage-blob; toggling off
     wipes every slot. */
  const motifsOn = Boolean(
    manifest.motifs?.blob ||
      manifest.motifs?.squiggle ||
      manifest.motifs?.sparkle ||
      manifest.motifs?.stamp ||
      manifest.motifs?.heart ||
      manifest.motifs?.polaroid,
  );

  /* ---------- saved looks (localStorage) ---------- */
  const [looks, setLooks] = useState<SavedLook[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOOKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLooks(parsed.slice(0, MAX_LOOKS));
      }
    } catch {
      /* fall through */
    }
  }, []);
  function persistLooks(next: SavedLook[]) {
    setLooks(next);
    try {
      localStorage.setItem(LOOKS_KEY, JSON.stringify(next));
    } catch {
      /* fall through */
    }
  }
  function saveCurrent() {
    const snapshot: SavedLook = {
      edition: manifest.edition,
      texture: manifest.texture,
      density,
      textureIntensity: intensity,
      voiceOverride: manifest.voiceOverride,
      kitId: manifest.kitId,
      siteLayout: manifest.siteLayout,
    };
    persistLooks([...looks, snapshot].slice(-MAX_LOOKS));
  }
  function applyLook(lk: SavedLook) {
    onChange({
      ...manifest,
      edition: lk.edition ?? manifest.edition,
      texture: lk.texture ?? manifest.texture,
      density: lk.density,
      textureIntensity: lk.textureIntensity,
      voiceOverride: lk.voiceOverride,
      kitId: lk.kitId ?? manifest.kitId,
      siteLayout: lk.siteLayout ?? manifest.siteLayout,
    });
  }
  function removeLook(idx: number) {
    persistLooks(looks.filter((_, i) => i !== idx));
  }

  /* ---------- match my photos ---------- */
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [paletteBusy, setPaletteBusy] = useState(false);
  async function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaletteBusy(true);
    try {
      const palette = await paletteFromFile(file);
      if (!palette) return;
      const existingTheme =
        (manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {};
      const existingColors =
        ((existingTheme as { colors?: Record<string, string> }).colors ?? {}) as Record<
          string,
          string
        >;
      onChange({
        ...manifest,
        theme: {
          ...existingTheme,
          colors: {
            ...existingColors,
            accent: palette.accent,
            accentLight: palette.accentLight,
          },
        },
      } as unknown as StoryManifest);
    } catch {
      /* fall through */
    } finally {
      setPaletteBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /* ---------- generate from story ---------- */
  const [storyText, setStoryText] = useState('');
  const [storyBusy, setStoryBusy] = useState(false);
  async function runGenerate() {
    const text = storyText.trim();
    if (!text) return;
    setStoryBusy(true);
    let look: SuggestedLook;
    try {
      const res = await fetch('/api/look/from-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const body = (await res.json()) as SuggestedLook;
        look = body;
      } else {
        look = generateLookFromStory(text);
      }
    } catch {
      look = generateLookFromStory(text);
    }
    onChange({
      ...manifest,
      occasion: look.occasion,
      edition: look.edition,
      texture: look.texture,
      density: look.density,
      textureIntensity: look.textureIntensity,
      voiceOverride: look.voiceOverride,
    } as StoryManifest);
    setStoryBusy(false);
    setStoryText('');
  }

  /* ---------- shuffle ---------- */
  const SOMBER: ReadonlySet<string> = new Set(['memorial', 'funeral']);
  function shuffleLook() {
    if (SOMBER.has(occasion)) return;
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const editions: EditionId[] = ['almanac', 'cinema', 'postcard-box', 'linen-folder', 'quiet'];
    const textures: TextureId[] = ['smooth', 'watercolor', 'linen', 'letterpress', 'vellum', 'newsprint'];
    const kits: KitId[] = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal'];
    const densities: Density[] = ['cozy', 'comfortable', 'spacious'];
    const intensitySteps = [0.6, 1, 1.3];
    const voices: VoiceOverride[] = ['classic', 'playful', 'poetic'];
    onChange({
      ...manifest,
      edition: pick(editions),
      texture: pick(textures),
      kitId: pick(kits),
      density: pick(densities),
      textureIntensity: pick(intensitySteps),
      voiceOverride: pick(voices),
    } as StoryManifest);
  }

  /* ---------- writers ---------- */
  function setDensity(v: Density) {
    onChange({ ...manifest, density: v });
  }
  function setIntensity(v: number) {
    onChange({ ...manifest, textureIntensity: v });
  }
  function setVoice(v: VoiceOverride | 'match') {
    const next = { ...manifest } as StoryManifest;
    if (v === 'match') delete (next as { voiceOverride?: VoiceOverride }).voiceOverride;
    else next.voiceOverride = v;
    onChange(next);
  }
  function toggleMotifs(on: boolean) {
    if (on) {
      onChange({
        ...manifest,
        motifs: {
          ...(manifest.motifs ?? {}),
          blob: manifest.motifs?.blob ?? 'sage',
        },
      });
    } else {
      onChange({ ...manifest, motifs: undefined });
    }
  }

  return (
    <footer
      aria-label="Fine-tune the look"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px',
        background: 'var(--pl-chrome-surface-2)',
        borderTop: '1px solid var(--pl-chrome-border)',
        fontFamily: 'var(--font-ui)',
        color: 'var(--pl-chrome-text)',
        fontSize: 12,
        overflowX: 'auto',
        flexWrap: 'nowrap',
        minHeight: 52,
        position: 'relative',
        zIndex: 4,
      }}
    >
      {/* Identity dials — open existing pickers / palettes */}
      <Chip label="Event" value={eventLabel} onClick={onOpenEvent} icon="sparkles" tone="lavender" />
      <Chip label="Theme" value={themeLabel} onClick={onOpenTheme} icon="palette" tone="sage" />
      <Chip label="Kit" value={kitLabel} onClick={onOpenKit} icon="grid" />
      <Chip label="Layout" value={layoutLabel} onClick={onOpenLayout} icon="layout" />

      <span style={{ width: 1, height: 22, background: 'var(--pl-chrome-border)', flexShrink: 0 }} aria-hidden />

      {/* Voice — segmented control with "Match" reset option */}
      <Segmented
        label="Voice"
        value={voiceOverride ?? 'match'}
        options={[
          { value: 'match', label: 'Match event' },
          { value: 'classic', label: 'Classic' },
          { value: 'playful', label: 'Playful' },
          { value: 'poetic', label: 'Poetic' },
        ]}
        onChange={(v) => setVoice(v as VoiceOverride | 'match')}
      />

      {/* Density — three-step segmented */}
      <Segmented
        label="Spacing"
        value={density}
        options={[
          { value: 'cozy', label: 'Cozy' },
          { value: 'comfortable', label: 'Comfy' },
          { value: 'spacious', label: 'Airy' },
        ]}
        onChange={(v) => setDensity(v as Density)}
      />

      {/* Texture intensity — slider (only when active texture isn't off) */}
      {texture !== 'smooth' && texture !== 'none' && (
        <RangeDial
          label="Grain"
          value={intensity}
          min={0}
          max={1.5}
          step={0.1}
          onChange={setIntensity}
          valueLabel={intensityLabel(intensity)}
        />
      )}

      {/* Motifs — pear-stamp / squiggle / blob toggle */}
      <ToggleDial label="Motifs" value={motifsOn} onChange={toggleMotifs} />

      <span style={{ width: 1, height: 22, background: 'var(--pl-chrome-border)', flexShrink: 0 }} aria-hidden />

      {/* Match my photos — file input */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={paletteBusy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 11px',
          borderRadius: 999,
          background: 'var(--pl-chrome-surface)',
          border: '1px solid var(--pl-chrome-border)',
          color: 'var(--pl-chrome-text-soft)',
          fontFamily: 'inherit',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: paletteBusy ? 'progress' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: paletteBusy ? 0.6 : 1,
        }}
        title="Pick a photo — Pear pulls a palette from it"
      >
        <Icon name="image" size={11} />
        {paletteBusy ? 'Threading…' : 'Match my photos'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onPhotoPicked}
        style={{ display: 'none' }}
      />

      {/* Generate from story — small inline input */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 2px 2px 10px',
          borderRadius: 999,
          background: 'rgba(198,112,61,0.12)',
          border: '1px solid rgba(198,112,61,0.30)',
          minWidth: 220,
        }}
      >
        <Icon name="sparkles" size={11} color="var(--peach-ink, #C6703D)" />
        <input
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !storyBusy) runGenerate();
          }}
          placeholder="Describe the day — Pear picks a look"
          aria-label="Generate look from story"
          style={{
            flex: 1,
            border: 0,
            background: 'transparent',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 11.5,
            color: 'var(--pl-chrome-text)',
            padding: '4px 0',
            minWidth: 140,
          }}
        />
        <button
          type="button"
          onClick={runGenerate}
          disabled={storyBusy || !storyText.trim()}
          aria-label="Generate"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 999,
            border: 0,
            background: 'var(--peach-ink, #C6703D)',
            color: 'var(--pl-chrome-bg)',
            cursor: storyBusy || !storyText.trim() ? 'not-allowed' : 'pointer',
            opacity: storyBusy || !storyText.trim() ? 0.5 : 1,
          }}
        >
          <Icon name="arrow-right" size={11} color="var(--pl-chrome-bg)" />
        </button>
      </div>

      <span style={{ width: 1, height: 22, background: 'var(--pl-chrome-border)', flexShrink: 0 }} aria-hidden />

      {/* Saved looks — chip strip with × to remove */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-chrome-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Looks
        </span>
        {looks.map((lk, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 2px 2px 8px',
              borderRadius: 999,
              background: 'var(--pl-chrome-surface)',
              border: '1px solid var(--pl-chrome-border)',
              fontSize: 10.5,
              color: 'var(--pl-chrome-text-soft)',
            }}
          >
            <button
              type="button"
              onClick={() => applyLook(lk)}
              title={`${lk.edition ?? 'edition'} · ${lk.texture ?? 'smooth'} · ${lk.density}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 10.5,
                color: 'inherit',
                padding: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--sage-deep, #5C6B3F)',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              />
              {i + 1}
            </button>
            <button
              type="button"
              onClick={() => removeLook(i)}
              aria-label="Remove saved look"
              style={{
                width: 16,
                height: 16,
                display: 'grid',
                placeItems: 'center',
                border: 0,
                background: 'transparent',
                color: 'var(--pl-chrome-text-muted)',
                cursor: 'pointer',
                fontSize: 11,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
        {looks.length < MAX_LOOKS && (
          <button
            type="button"
            onClick={saveCurrent}
            title="Save current look"
            aria-label="Save current look"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
              borderRadius: 999,
              border: '1px dashed var(--pl-chrome-border-strong)',
              background: 'transparent',
              color: 'var(--pl-chrome-text-muted)',
              fontFamily: 'inherit',
              fontSize: 10.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={10} /> Save
          </button>
        )}
      </div>

      {/* Shuffle — random pull across all dials, right-aligned */}
      <button
        type="button"
        onClick={shuffleLook}
        title="Shuffle the look"
        aria-label="Shuffle the look"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'var(--pl-chrome-text)',
          color: 'var(--pl-chrome-bg)',
          border: 0,
          fontFamily: 'inherit',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
          marginLeft: 'auto',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name="sparkles" size={11} color="var(--pl-chrome-bg)" />
        Shuffle
      </button>
    </footer>
  );
}

/* CSS — range slider thumb (can't be styled inline). Inject once. */
if (typeof document !== 'undefined' && !document.getElementById('pl8-dial-bar-style')) {
  const style = document.createElement('style');
  style.id = 'pl8-dial-bar-style';
  style.textContent = `
    .pl8-dial-range::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; border: 0.5px solid rgba(0,0,0,0.12);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2); cursor: pointer;
    }
    .pl8-dial-range::-moz-range-thumb {
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; border: 0.5px solid rgba(0,0,0,0.12);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2); cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}
