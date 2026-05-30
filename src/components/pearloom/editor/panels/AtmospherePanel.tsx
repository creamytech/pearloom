'use client';

/* ========================================================================
   AtmospherePanel — host control over the new Living Atmosphere layer,
   per-section backgrounds, and decor visibility toggles.

   Sits inside the Theme panel today. Three sub-sections:
     1. Atmosphere — pick kind, intensity, accent override, audio.
     2. Section backgrounds — per-section swatch picker.
     3. Decor visibility — show/hide toggles for the dividers and
        decor primitives the renderer ships.
   ======================================================================== */

import type { StoryManifest } from '@/types';
import { PanelSection } from '../atoms';
import {
  LivingAtmosphere,
  type AtmosphereKind,
  type AtmosphereIntensity,
  defaultAtmosphereForOccasion,
} from '../../site/LivingAtmosphere';
import { AMBIENT_PRESETS, type AmbientPresetId } from '../../site/AmbientAudio';
import { CustomSelect, Switch } from '../v8-forms';
import { V8ColorPicker } from '../v8-color-picker';

const KINDS: Array<{ id: AtmosphereKind; label: string; hint: string }> = [
  { id: 'motes',       label: 'Motes',         hint: 'Slow gold particles drifting up.' },
  { id: 'threads',     label: 'Threads',       hint: 'Three olive + gold strands waving.' },
  { id: 'petals',      label: 'Petals',        hint: 'Pale botanical shapes falling.' },
  { id: 'confetti',    label: 'Confetti',      hint: 'Slow trickle, single-piece loop.' },
  { id: 'candlelight', label: 'Candlelight',   hint: 'Three flickering flames at the bottom.' },
  { id: 'stars',       label: 'Stars',         hint: 'Slow-drifting twinkling constellation.' },
  { id: 'sunshimmer',  label: 'Sun shimmer',   hint: 'Radial light arc moving across paper.' },
  { id: 'none',        label: 'None',          hint: 'Disable the animated layer.' },
];

const INTENSITIES: Array<{ id: AtmosphereIntensity; label: string }> = [
  { id: 'subtle',   label: 'Subtle' },
  { id: 'standard', label: 'Standard' },
  { id: 'lush',     label: 'Lush' },
];

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'top',         label: 'Hero' },
  { id: 'our-story',   label: 'Our story' },
  { id: 'schedule',    label: 'Schedule' },
  { id: 'travel',      label: 'Travel' },
  { id: 'registry',    label: 'Registry' },
  { id: 'gallery',     label: 'Gallery' },
  { id: 'faq',         label: 'FAQ' },
  { id: 'rsvp',        label: 'RSVP' },
];

const SECTION_BG_OPTIONS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'paper',      label: 'Paper',      hint: 'Default cream, no extra layer.' },
  { id: 'wash',       label: 'Wash',       hint: 'Single-color radial wash.' },
  { id: 'mesh',       label: 'Mesh',       hint: 'Multi-color subtle gradient mesh.' },
  { id: 'atmosphere', label: 'Atmosphere', hint: 'Repeat the hero atmosphere.' },
  { id: 'none',       label: 'None',       hint: 'Flat, no overlay.' },
];

const DECOR_TOGGLES: Array<{ id: string; label: string }> = [
  { id: 'hero-stamp',          label: 'Hero motif stamp' },
  { id: 'hero-decor',          label: 'Hero ambient shapes' },
  { id: 'divider-our-story',   label: 'Divider · Our story' },
  { id: 'divider-schedule',    label: 'Divider · Schedule' },
  { id: 'divider-travel',      label: 'Divider · Travel' },
  { id: 'divider-registry',    label: 'Divider · Registry' },
  { id: 'divider-gallery',     label: 'Divider · Gallery' },
  { id: 'divider-faq',         label: 'Divider · FAQ' },
  { id: 'divider-rsvp',        label: 'Divider · RSVP' },
  { id: 'footer-bouquet',      label: 'Footer flourish' },
];

export function AtmospherePanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const atmosphere = (manifest as unknown as {
    atmosphere?: { kind?: string; intensity?: string; sections?: string[]; accent?: string; audio?: { url?: string; label?: string; enabled?: boolean; preset?: string } }
  }).atmosphere ?? {};
  const kind = (atmosphere.kind as AtmosphereKind | undefined) ?? defaultAtmosphereForOccasion(occasion);
  const intensity = (atmosphere.intensity as AtmosphereIntensity | undefined) ?? 'standard';
  const audio = atmosphere.audio ?? {};

  // Read order matches SectionBackground at read-time: prefer
  // manifest.blockStyles[id].background (canonical), fall back to
  // manifest.sectionBackgrounds[id] (legacy). The grid below shows
  // the merged value so a host editing a previously-set section
  // sees the same swatch active regardless of which field holds it.
  // Audit #14 (2026-05-30).
  const legacySectionBackgrounds = (manifest as unknown as { sectionBackgrounds?: Record<string, string> }).sectionBackgrounds ?? {};
  const blockStyles = (manifest as unknown as { blockStyles?: Record<string, { background?: string }> }).blockStyles ?? {};
  function readSectionBg(sectionId: string): string {
    const fromBlock = blockStyles[sectionId]?.background;
    if (
      fromBlock === 'paper' || fromBlock === 'wash' || fromBlock === 'mesh' ||
      fromBlock === 'atmosphere' || fromBlock === 'none'
    ) return fromBlock;
    return legacySectionBackgrounds[sectionId] ?? 'paper';
  }
  // Backward-compat alias so the rest of this file keeps reading
  // `sectionBackgrounds[s.id]` without each call site being rewritten.
  const sectionBackgrounds: Record<string, string> = new Proxy({}, {
    get: (_t, p: string) => readSectionBg(p),
  });
  const sectionAtmosphere = (manifest as unknown as { sectionAtmosphere?: Record<string, { kind?: string; intensity?: string }> }).sectionAtmosphere ?? {};
  const decorVisibility = (manifest as unknown as { decorVisibility?: Record<string, boolean> }).decorVisibility ?? {};

  function setAtmosphere(patch: Partial<typeof atmosphere>) {
    onChange({
      ...manifest,
      atmosphere: { ...atmosphere, ...patch },
    } as StoryManifest);
  }

  function setSectionBg(sectionId: string, value: string) {
    // Write to the canonical blockStyles[sectionId].background
    // field (audit #14 consolidation). The legacy
    // manifest.sectionBackgrounds[sectionId] is left alone — it
    // stays as the renderer's fallback for any populated entry
    // that pre-dates this change. The next time the host edits
    // a section, its value migrates over here.
    const existingBlockStyles = blockStyles;
    const existingForSection = existingBlockStyles[sectionId] ?? {};
    onChange({
      ...manifest,
      blockStyles: {
        ...existingBlockStyles,
        [sectionId]: { ...existingForSection, background: value },
      },
    } as StoryManifest);
  }

  function setDecorVisible(id: string, visible: boolean) {
    onChange({
      ...manifest,
      decorVisibility: { ...decorVisibility, [id]: visible },
    } as StoryManifest);
  }

  function setSectionAtmos(sectionId: string, patch: { kind?: string; intensity?: string }) {
    const existing = sectionAtmosphere[sectionId] ?? {};
    onChange({
      ...manifest,
      sectionAtmosphere: { ...sectionAtmosphere, [sectionId]: { ...existing, ...patch } },
    } as StoryManifest);
  }

  return (
    <>
      {/* ── Atmosphere kind ─────────────────────────────────────── */}
      <PanelSection
        label="Living atmosphere"
        hint="An animated background layer that gives the published site movement. Honours reduced-motion settings."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
          {KINDS.map((k) => {
            const active = k.id === kind;
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setAtmosphere({ kind: k.id })}
                style={{
                  padding: 0,
                  borderRadius: 10,
                  background: active ? 'var(--peach-bg, #FCEAD6)' : 'var(--card)',
                  border: `1.5px solid ${active ? 'var(--peach-ink)' : 'var(--line)'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                  overflow: 'hidden',
                }}
              >
                {/* Live preview thumbnail — actually renders the
                    atmosphere kind so the host sees what they pick. */}
                <div
                  style={{
                    position: 'relative',
                    height: 56,
                    background: 'var(--cream-2, #F3E9D4)',
                    overflow: 'hidden',
                    borderBottom: `1px solid ${active ? 'var(--peach-ink)' : 'var(--line-soft)'}`,
                  }}
                >
                  {k.id !== 'none' && (
                    <LivingAtmosphere
                      kind={k.id}
                      intensity="standard"
                      accent={atmosphere.accent}
                      scale={0.4}
                    />
                  )}
                  {k.id === 'none' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--ink-muted)', fontSize: 11, letterSpacing: '0.18em' }}>
                      —
                    </div>
                  )}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{k.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.35, marginTop: 2 }}>{k.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Intensity */}
        <div style={{ marginBottom: 14 }}>
          <div style={LABEL}>Intensity</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {INTENSITIES.map((i) => {
              const active = i.id === intensity;
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setAtmosphere({ intensity: i.id })}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: active ? 'var(--ink)' : 'var(--card)',
                    color: active ? 'var(--cream)' : 'var(--ink)',
                    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent override */}
        <div>
          <div style={LABEL}>Accent override</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <V8ColorPicker
              value={atmosphere.accent ?? '#D4A95D'}
              onChange={(v) => setAtmosphere({ accent: v })}
              ariaLabel="Atmosphere accent colour"
            />
            <button
              type="button"
              onClick={() => setAtmosphere({ accent: undefined })}
              style={{
                padding: '6px 10px',
                fontSize: 11.5,
                background: 'transparent',
                color: 'var(--ink-muted)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Use theme accent
            </button>
          </div>
        </div>
      </PanelSection>

      {/* ── Ambient audio ───────────────────────────────────────── */}
      <PanelSection
        label="Ambient audio"
        hint="Optional looping sound that plays after a guest interacts. Off by default; guests always see a mute control."
      >
        <div style={{ marginBottom: 10 }}>
          <Switch
            checked={!!audio.enabled}
            onChange={(v) => setAtmosphere({ audio: { ...audio, enabled: v } })}
            label="Play ambient sound"
            ariaLabel="Toggle ambient audio"
          />
        </div>
        {audio.enabled && (
          <>
            <div style={LABEL}>Preset (synthesized in-browser, no download)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(Object.entries(AMBIENT_PRESETS) as Array<[AmbientPresetId, { label: string }]>).map(([id, preset]) => {
                const active = audio.preset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setAtmosphere({
                        audio: { ...audio, preset: id, label: preset.label, url: undefined },
                      })
                    }
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      background: active ? 'var(--peach-bg)' : 'var(--card)',
                      border: `1px solid ${active ? 'var(--peach-ink)' : 'var(--line)'}`,
                      color: active ? 'var(--peach-ink)' : 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div style={LABEL}>Or paste a custom looping clip URL (overrides preset)</div>
            <input
              type="url"
              placeholder="https://…/loop.mp3"
              aria-label="Custom looping audio clip URL"
              value={audio.url ?? ''}
              onChange={(e) => setAtmosphere({ audio: { ...audio, url: e.target.value || undefined } })}
              style={INPUT}
            />
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 6 }}>
              Synth presets work without any audio file — they're built live with the Web Audio API.
              Paste a URL only if you have your own seamless loop you'd rather use.
            </div>
          </>
        )}
      </PanelSection>

      {/* ── Per-section backgrounds — collapsed by default ───────
            Audited 2026-04-30: an 8-row × 5-option button grid
            visible by default was overwhelming. Most hosts leave
            every section on 'paper'. Tucked behind a disclosure
            so power users can still reach it; the main flow
            stays focused on the hero atmosphere. */}
      <PanelSection label="Section backgrounds" hint="Per-section override. Most hosts leave this alone — the hero atmosphere fills naturally.">
       <details>
        <summary
          style={{
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 8,
            background: 'var(--cream-2)',
            border: '1px dashed var(--line)',
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--ink-soft)',
            userSelect: 'none',
            marginBottom: 8,
          }}
        >
          Override the paper for individual sections
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
          {SECTIONS.map((s) => {
            const value = sectionBackgrounds[s.id] ?? 'paper';
            const sectAtmos = sectionAtmosphere[s.id];
            const showOverride = value === 'atmosphere';
            return (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 90, fontSize: 12.5, color: 'var(--ink-soft)' }}>{s.label}</div>
                  <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {SECTION_BG_OPTIONS.map((o) => {
                      const active = o.id === value;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSectionBg(s.id, o.id)}
                          title={o.hint}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 6,
                            background: active ? 'var(--ink)' : 'var(--card)',
                            color: active ? 'var(--cream)' : 'var(--ink-soft)',
                            border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                            fontWeight: active ? 600 : 500,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {showOverride && (sectAtmos?.kind || sectAtmos?.intensity) && (
                  /* Inline summary + clear affordance — only shows
                     when an override is already set on a legacy
                     manifest. Default (inherit the hero) is now
                     invisible-by-default. Audited 2026-04-30: the
                     full per-section kind+intensity picker was
                     removed because <2% of hosts ever changed it.
                     Hosts can clear an override and the rest is
                     hero-uniform. */
                  <div
                    style={{
                      marginLeft: 98,
                      paddingLeft: 10,
                      borderLeft: '2px solid var(--peach-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11,
                      color: 'var(--ink-muted)',
                    }}
                  >
                    <span style={{ fontStyle: 'italic' }}>
                      Overriding hero — {sectAtmos.kind ?? 'kind'}{sectAtmos.intensity ? ` · ${sectAtmos.intensity}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSectionAtmos(s.id, { kind: undefined, intensity: undefined })}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid var(--line)',
                        background: 'transparent',
                        color: 'var(--ink-soft)',
                        fontSize: 10.5,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
       </details>
      </PanelSection>

      {/* ── Decor visibility — collapsed by default ────────────
            Audited 2026-04-30: ten individual show/hide switches
            ("Hero motif stamp", "Divider · Our story", etc.) used
            to live as a top-level section. ~1-2% of hosts touch
            them. Tucked behind a native <details> disclosure so
            the main Atmosphere screen stays uncluttered. */}
      <PanelSection label="Advanced">
        <details style={{ fontFamily: 'inherit' }}>
          <summary
            style={{
              cursor: 'pointer',
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--cream-2)',
              border: '1px dashed var(--line)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-soft)',
              userSelect: 'none',
            }}
          >
            Decor visibility — show / hide individual elements
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 4px 4px' }}>
            <p style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5, margin: '0 0 4px' }}>
              Hide specific decor elements without touching their styling.
            </p>
            {DECOR_TOGGLES.map((d) => {
              const visible = decorVisibility[d.id] !== false;
              return (
                <Switch
                  key={d.id}
                  checked={visible}
                  onChange={(v) => setDecorVisible(d.id, v)}
                  label={d.label}
                  size="sm"
                />
              );
            })}
          </div>
        </details>
      </PanelSection>
    </>
  );
}

const LABEL = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: 'var(--ink-muted)',
  marginBottom: 6,
};

const INPUT = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  fontSize: 13,
  background: 'var(--card)',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
};
