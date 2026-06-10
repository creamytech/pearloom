'use client';

// ─────────────────────────────────────────────────────────────
// theme-panel-sections.tsx — direct ports of the prototype's
// Theme tab sub-components. Lives in its own file so the
// monolithic ThemePanel.tsx doesn't grow past 2000 lines.
//
// Renders (in prototype order):
//   SiteLookHeader            — "SITE LOOK · Theme packs" + Shuffle
//   EventTypeSection          — collapsible search-grouped picker
//   GenerateFromStoryCard     — peach card with textarea + chips + CTA
//   FineTuneSection           — voice / spacing / theme-bound texture
//                                slider / motifs / photos / AA badge
//   MatchMyPhotosSection      — file picker → palette extract
//   SavedLooksSection         — 6-slot localStorage chips
//   MatchingSaveTheDateCTA    — dark sage cross-link to Studio
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import type { EditionDefinition } from '@/lib/site-editions/types';
import { EDITIONS } from '@/lib/site-editions/editions';
import { getEventType, EVENT_TYPES } from '@/lib/event-os/event-types';
import { paletteFromFile } from '@/lib/look-engine/palette-from-photo';
import { generateLookFromStory, type SuggestedLook } from '@/lib/look-engine/generate-from-story';
import { Pear, Sparkle, Icon } from '../../motifs';
import { V8Slider } from '../v8-forms';

// Shared color tokens for all sections in this file.
const PEACH_INK = 'var(--peach-ink, #C6703D)';
const PEACH_BG = 'var(--peach-bg, rgba(198,112,61,0.10))';
const INK = 'var(--ink, #0E0D0B)';
const INK_MUTED = 'var(--ink-muted, #6F6557)';
const CARD = 'var(--card, #FBF7EE)';
const CREAM2 = 'var(--cream-2, #EBE3D2)';
const SAGE_DEEP = 'var(--sage-deep, #3D4A1F)';

/* ───── SiteLookHeader ─────────────────────────────────────── */
export function SiteLookHeader({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  function shuffle() {
    const others = EDITIONS.filter((e) => e.id !== manifest.edition);
    const pick = others[Math.floor(Math.random() * others.length)] ?? EDITIONS[0];
    const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    const nextTheme: Record<string, unknown> = { ...existingTheme };
    if (pick.recommendedTheme?.colors) nextTheme.colors = { ...pick.recommendedTheme.colors };
    if (pick.recommendedTheme?.fonts) nextTheme.fonts = { ...pick.recommendedTheme.fonts };
    if (pick.recommendedTheme?.cardRadius) nextTheme.cardRadius = pick.recommendedTheme.cardRadius;
    onChange({
      ...manifest,
      edition: pick.id,
      theme: nextTheme,
      texture: pick.naturalTexture ?? manifest.texture,
    } as unknown as StoryManifest);
  }
  return (
    <div style={{ padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="eyebrow" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: PEACH_INK }}>
        Site Look
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: INK, margin: 0, lineHeight: 1.1 }}>
          Theme packs
        </h2>
        <button
          type="button"
          onClick={shuffle}
          title="Shuffle to a different Edition"
          style={{
            padding: '6px 14px', borderRadius: 999, background: CARD,
            border: '1px solid var(--line, rgba(14,13,11,0.16))',
            color: INK, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}
        >
          <Sparkle size={11} color={PEACH_INK} /> Shuffle
        </button>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: INK_MUTED, lineHeight: 1.5 }}>
        A whole look — texture, palette, type &amp; motifs, tuned to your event.
      </p>
    </div>
  );
}

/* ───── EventTypeSection ───────────────────────────────────── */
export function EventTypeSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const active = getEventType(manifest.occasion ?? 'wedding');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return EVENT_TYPES;
    return EVENT_TYPES.filter((t) => t.label.toLowerCase().includes(needle));
  }, [q]);
  const grouped = useMemo(() => {
    const groups: Record<string, typeof EVENT_TYPES> = {};
    for (const t of filtered) {
      const key = String(t.category ?? 'other').toUpperCase().replace(/-/g, ' & ');
      (groups[key] = groups[key] ?? []).push(t);
    }
    return groups;
  }, [filtered]);
  function pick(id: string) {
    onChange({ ...manifest, occasion: id } as unknown as StoryManifest);
    setOpen(false);
    setQ('');
  }
  return (
    <div style={{ padding: '0 14px 4px' }}>
      <div className="eyebrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_MUTED, marginBottom: 8 }}>
        Event type
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%', padding: '12px 14px', background: CARD,
          border: '1px solid var(--line, rgba(14,13,11,0.14))', borderRadius: 12,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}
      >
        <span aria-hidden style={{ width: 32, height: 32, borderRadius: 8, background: PEACH_BG, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="heart" size={16} color={PEACH_INK} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: INK, lineHeight: 1.15 }}>
            {active?.label ?? 'Wedding'}
          </span>
          <span style={{ display: 'block', fontSize: 11.5, color: INK_MUTED, marginTop: 2 }}>
            {active?.hostRole ?? 'Pick what you’re hosting'}
          </span>
        </span>
        <Icon name="chev-down" size={12} color={INK_MUTED} />
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: 12, background: CARD,
          border: '1px solid var(--line, rgba(14,13,11,0.14))',
          borderRadius: 12, maxHeight: 360, overflowY: 'auto',
        }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${EVENT_TYPES.length}+ event types…`}
              style={{
                width: '100%', padding: '8px 10px', background: CREAM2,
                border: 'none', borderRadius: 8, fontSize: 12.5,
                color: INK, outline: 'none', fontFamily: 'var(--font-ui)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel} style={{ marginBottom: 12 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_MUTED, padding: '0 6px 4px' }}>
                {groupLabel}
              </div>
              {items.map((t) => {
                const on = t.id === manifest.occasion;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pick(t.id)}
                    style={{
                      width: '100%', padding: '8px 10px',
                      background: on ? PEACH_BG : 'transparent',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                      color: INK, fontSize: 13, fontWeight: on ? 700 : 500,
                    }}
                  >
                    <Icon name="heart" size={12} color={on ? PEACH_INK : INK_MUTED} />
                    <span style={{ flex: 1 }}>{t.label}</span>
                    {on && <Icon name="check" size={12} color={PEACH_INK} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── GenerateFromStoryCard ──────────────────────────────── */
export function GenerateFromStoryCard({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const examples = ['July wedding in Santorini', 'Black-tie evening gala', 'Tuscan vineyard'];
  function apply(look: SuggestedLook) {
    const ed = EDITIONS.find((e) => e.id === look.edition);
    const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    const nextTheme: Record<string, unknown> = { ...existingTheme };
    if (ed?.recommendedTheme?.colors) nextTheme.colors = { ...ed.recommendedTheme.colors };
    if (ed?.recommendedTheme?.fonts) nextTheme.fonts = { ...ed.recommendedTheme.fonts };
    onChange({
      ...manifest,
      occasion: look.occasion ?? manifest.occasion,
      edition: look.edition,
      texture: ed?.naturalTexture ?? look.texture ?? manifest.texture,
      voiceOverride: look.voiceOverride ?? manifest.voiceOverride,
      density: look.density ?? manifest.density,
      textureIntensity: look.textureIntensity ?? manifest.textureIntensity,
      theme: nextTheme,
    } as unknown as StoryManifest);
  }
  async function run(textOverride?: string) {
    const value = (textOverride ?? text).trim();
    if (!value) return;
    if (textOverride) setText(textOverride);
    setBusy(true);
    try {
      const res = await fetch('/api/look/from-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: value }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.look) { apply(body.look as SuggestedLook); return; }
      }
      apply(generateLookFromStory(value));
    } catch {
      apply(generateLookFromStory(value));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ padding: '0 14px 4px' }}>
      <div style={{
        padding: 16, background: PEACH_BG, border: `1px solid ${PEACH_INK}`,
        borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={20} tone="ink" shadow={false} />
          <span style={{ fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 16, fontWeight: 700, color: PEACH_INK }}>
            Generate a look from your story
          </span>
        </div>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Sunset wedding in Santorini, lots of olive groves, relaxed and warm…"
          style={{
            width: '100%', padding: '10px 12px', background: CARD,
            border: '1px solid var(--line, rgba(14,13,11,0.14))', borderRadius: 10,
            fontFamily: 'var(--font-ui)', fontSize: 13, color: INK,
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => run(ex)}
              disabled={busy}
              style={{
                padding: '6px 12px', background: CARD,
                border: '1px solid var(--line, rgba(14,13,11,0.12))',
                borderRadius: 999, fontSize: 11.5, color: INK,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {ex}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => run()}
          disabled={busy || !text.trim()}
          style={{
            padding: '11px 14px', background: SAGE_DEEP, border: 'none',
            borderRadius: 999, color: 'var(--cream, #FBF7EE)',
            fontSize: 13.5, fontWeight: 700,
            cursor: busy || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: !text.trim() ? 0.5 : 1,
            letterSpacing: '0.02em',
            display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8,
          }}
        >
          <Sparkle size={12} color="var(--cream, #FBF7EE)" />
          {busy ? 'Threading…' : 'Design my site'}
        </button>
      </div>
    </div>
  );
}

/* ───── FineTuneSection ────────────────────────────────────── */
export function FineTuneSection({
  manifest,
  onChange,
  activeEdition,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  activeEdition: EditionDefinition;
}) {
  const voice = manifest.voiceOverride ?? 'classic';
  const density = manifest.density ?? 'comfortable';
  const intensity = manifest.textureIntensity ?? 1;
  const motifsOn = manifest.motifsEnabled ?? true;
  const photosOn = Boolean((manifest as unknown as { usePhotosForPalette?: boolean }).usePhotosForPalette);
  const themeColors = ((manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors ?? {}) as Record<string, string>;
  const paper = themeColors.background ?? activeEdition.recommendedTheme?.colors?.background ?? '#F5EFE2';
  const ink = themeColors.foreground ?? activeEdition.recommendedTheme?.colors?.foreground ?? '#0E0D0B';
  const ratio = useMemo(() => {
    function lum(hex: string): number {
      const m = hex.replace('#', '');
      const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
      const r = parseInt(n.slice(0, 2), 16) / 255;
      const g = parseInt(n.slice(2, 4), 16) / 255;
      const b = parseInt(n.slice(4, 6), 16) / 255;
      const t = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return 0.2126 * t(r) + 0.7152 * t(g) + 0.0722 * t(b);
    }
    const a = lum(paper);
    const b = lum(ink);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  }, [paper, ink]);
  const passes = ratio >= 4.5;
  const intensityName = intensity <= 0.05 ? 'Off' : intensity < 0.6 ? 'Faint' : intensity < 1.1 ? 'Natural' : intensity < 1.4 ? 'Rich' : 'Bold';
  const textureLabel = activeEdition.textureSliderLabel ?? 'Texture';
  // Slider hidden when texture is 'none' (or legacy 'smooth') —
  // Modern Editorial has no texture so the dial would be inert.
  const textureSmooth =
    manifest.texture === 'none' ||
    manifest.texture === 'smooth' ||
    activeEdition.naturalTexture === 'none';
  return (
    <div style={{ padding: '12px 14px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="eyebrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_MUTED }}>
        Fine-tune · {activeEdition.label.toUpperCase()}
      </div>
      <SegRow label="Voice">
        {(['classic', 'playful', 'poetic'] as const).map((v) => (
          <SegBtn key={v} on={voice === v} onClick={() => onChange({ ...manifest, voiceOverride: v } as unknown as StoryManifest)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </SegBtn>
        ))}
      </SegRow>
      <SegRow label="Spacing">
        {([
          { id: 'cozy', label: 'Cozy' },
          { id: 'comfortable', label: 'Comfy' },
          { id: 'spacious', label: 'Airy' },
        ] as const).map((s) => (
          <SegBtn key={s.id} on={density === s.id} onClick={() => onChange({ ...manifest, density: s.id } as unknown as StoryManifest)}>
            {s.label}
          </SegBtn>
        ))}
      </SegRow>
      {!textureSmooth && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>{textureLabel}</span>
            <span style={{ fontSize: 11, color: INK_MUTED }}>{intensityName}</span>
          </div>
          <V8Slider
            min={0}
            max={1.5}
            step={0.05}
            value={intensity}
            onChange={(n) => onChange({ ...manifest, textureIntensity: n } as unknown as StoryManifest)}
            ariaLabel="Texture intensity"
          />
        </div>
      )}
      <ToggleRow label="Motifs" on={motifsOn} onChange={(v) => onChange({ ...manifest, motifsEnabled: v } as unknown as StoryManifest)} />
      <ToggleRow label="Use my photos" on={photosOn} onChange={(v) => onChange({ ...manifest, usePhotosForPalette: v } as unknown as StoryManifest)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: passes ? SAGE_DEEP : '#A14A2C' }}>
          <span aria-hidden style={{ fontWeight: 700 }}>{passes ? '✓' : '!'}</span>
          <span>Text contrast {passes ? 'AA' : 'low'} · {ratio.toFixed(1)}:1</span>
        </div>
        {/* High-texture legibility nudge — direct port of the
            prototype's LegibilityNote second branch. When the
            texture slider is past 1.1 the grain starts to muddy
            body type; offer a one-tap "Soften" that snaps the
            intensity to 0.7 (the prototype's chosen safe point). */}
        {intensity > 1.1 && !textureSmooth && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            padding: '7px 10px', borderRadius: 8,
            background: 'color-mix(in oklab, var(--pl-gold, #C19A4B) 16%, var(--cream-2, #EBE3D2))',
          }}>
            <span style={{ fontSize: 11, color: INK_MUTED }}>High texture can reduce legibility</span>
            <button
              type="button"
              onClick={() => onChange({ ...manifest, textureIntensity: 0.7 } as unknown as StoryManifest)}
              style={{
                fontSize: 11, fontWeight: 700, color: INK,
                padding: '3px 9px', borderRadius: 999,
                background: CARD, border: '1px solid var(--line, rgba(14,13,11,0.16))',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              Soften
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SegRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: INK, minWidth: 72 }}>{label}</span>
      <div style={{
        display: 'inline-flex', padding: 2, background: CREAM2, borderRadius: 999,
        gap: 2, flex: 1, justifyContent: 'flex-end',
      }}>
        {children}
      </div>
    </div>
  );
}
function SegBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        padding: '6px 14px', background: on ? SAGE_DEEP : 'transparent',
        color: on ? 'var(--cream, #FBF7EE)' : INK, border: 'none', borderRadius: 999,
        fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {children}
    </button>
  );
}
function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        style={{
          width: 42, height: 24, padding: 2,
          background: on ? SAGE_DEEP : CREAM2, border: 'none',
          borderRadius: 999, cursor: 'pointer', position: 'relative',
          transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
        }}
      >
        <span aria-hidden style={{
          position: 'absolute', top: 2, left: on ? 20 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--cream, #FBF7EE)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.20)',
          transition: 'left var(--pl-dur-fast) var(--pl-ease-out)',
        }} />
      </button>
    </div>
  );
}

/* ───── MatchMyPhotosSection ───────────────────────────────── */
export function MatchMyPhotosSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const palette = await paletteFromFile(file);
      if (!palette) { setError('Couldn’t read that image. Try a JPG or PNG.'); return; }
      const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
      const existingColors = ((existingTheme as { colors?: Record<string, string> }).colors ?? {}) as Record<string, string>;
      onChange({
        ...manifest,
        theme: { ...existingTheme, colors: { ...existingColors, accent: palette.accent, accentLight: palette.accentLight } },
      } as unknown as StoryManifest);
    } catch {
      setError('Couldn’t read that image. Try a JPG or PNG.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }
  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div className="eyebrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_MUTED, marginBottom: 6 }}>
        Match my photos
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: INK_MUTED, lineHeight: 1.5 }}>
        Pear pulls the palette from a photo and retints this theme.
      </p>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        style={{
          padding: '9px 14px', background: 'transparent',
          border: '1px solid var(--line, rgba(14,13,11,0.16))',
          borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: INK,
          cursor: busy ? 'wait' : 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        <Icon name="image" size={12} />
        {busy ? 'Threading…' : 'Upload a photo'}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onPicked} style={{ display: 'none' }} />
      {error && <div style={{ marginTop: 8, fontSize: 11.5, color: '#A14A2C' }}>{error}</div>}
    </div>
  );
}

/* ───── SavedLooksSection ──────────────────────────────────── */
const SAVED_LOOKS_KEY = 'pl-looks';
const MAX_SAVED = 6;
interface SavedLook {
  edition?: NonNullable<StoryManifest['edition']>;
  texture?: NonNullable<StoryManifest['texture']>;
  density?: NonNullable<StoryManifest['density']>;
  textureIntensity?: number;
  voiceOverride?: NonNullable<StoryManifest['voiceOverride']>;
}
export function SavedLooksSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [looks, setLooks] = useState<SavedLook[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_LOOKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLooks(parsed.slice(0, MAX_SAVED));
      }
    } catch { /* ignored */ }
  }, []);
  function persist(next: SavedLook[]) {
    setLooks(next);
    try { localStorage.setItem(SAVED_LOOKS_KEY, JSON.stringify(next)); } catch { /* ignored */ }
  }
  function saveCurrent() {
    persist([
      ...looks,
      {
        edition: manifest.edition,
        texture: manifest.texture,
        density: manifest.density,
        textureIntensity: manifest.textureIntensity,
        voiceOverride: manifest.voiceOverride,
      },
    ].slice(-MAX_SAVED));
  }
  function apply(lk: SavedLook) {
    const ed = EDITIONS.find((e) => e.id === lk.edition);
    const existingTheme = ((manifest as unknown as { theme?: Record<string, unknown> }).theme ?? {}) as Record<string, unknown>;
    const nextTheme: Record<string, unknown> = { ...existingTheme };
    if (ed?.recommendedTheme?.colors) nextTheme.colors = { ...ed.recommendedTheme.colors };
    if (ed?.recommendedTheme?.fonts) nextTheme.fonts = { ...ed.recommendedTheme.fonts };
    onChange({
      ...manifest,
      edition: lk.edition ?? manifest.edition,
      texture: lk.texture ?? manifest.texture,
      density: lk.density ?? manifest.density,
      textureIntensity: lk.textureIntensity ?? manifest.textureIntensity,
      voiceOverride: lk.voiceOverride ?? manifest.voiceOverride,
      theme: nextTheme,
    } as unknown as StoryManifest);
  }
  function remove(idx: number) {
    persist(looks.filter((_, i) => i !== idx));
  }
  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="eyebrow" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: INK_MUTED }}>
          Saved looks
        </span>
        <button
          type="button"
          onClick={saveCurrent}
          style={{ background: 'transparent', border: 'none', color: PEACH_INK, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          + Save current
        </button>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: INK_MUTED, lineHeight: 1.5 }}>
        Save a combo you love to revisit it later.
      </p>
      {looks.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {looks.map((lk, i) => {
            const ed = EDITIONS.find((e) => e.id === lk.edition);
            const tint = ed?.recommendedTheme?.colors?.accent ?? PEACH_INK;
            return (
              <div
                key={i}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px 4px 4px', background: CARD,
                  border: '1px solid var(--line, rgba(14,13,11,0.12))',
                  borderRadius: 999, fontSize: 11.5,
                }}
              >
                <button
                  type="button"
                  onClick={() => apply(lk)}
                  title="Apply this look"
                  style={{ width: 16, height: 16, borderRadius: '50%', background: tint, border: 'none', cursor: 'pointer' }}
                />
                <span style={{ color: INK }}>{ed?.label ?? 'Look'}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove saved look"
                  style={{ background: 'transparent', border: 'none', color: INK_MUTED, cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───── MatchingSaveTheDateCTA ─────────────────────────────── */
export function MatchingSaveTheDateCTA() {
  return (
    <div style={{ padding: '12px 14px 18px' }}>
      <a
        href="/dashboard/invite"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: SAGE_DEEP,
          color: 'var(--cream, #FBF7EE)', textDecoration: 'none', borderRadius: 14,
        }}
      >
        <span aria-hidden style={{ flexShrink: 0 }}>
          <Icon name="send" size={18} color="var(--cream, #FBF7EE)" />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-display, Fraunces, Georgia, serif)', fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
            Matching Save-the-Date
          </span>
          <span style={{ display: 'block', fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>
            Same theme, print-ready card &amp; envelope
          </span>
        </span>
        <span aria-hidden style={{ flexShrink: 0 }}>→</span>
      </a>
    </div>
  );
}
