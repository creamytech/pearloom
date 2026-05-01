'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/canvas/ThemeQuickBar.tsx
//
// A floating palette picker pinned to the right edge of the
// canvas in edit mode. One-click theme swaps without opening
// the Theme panel. Shows:
//
//   - 8 classic presets from the marketplace palette library
//   - "Ask Pear" → hits /api/wizard/smart-palette with the
//     current manifest context and returns 3 AI-curated picks
//
// Clicking any swatch writes manifest.theme.colors immediately
// so the canvas repaints live.
// ─────────────────────────────────────────────────────────────

import { useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { useIsEditMode } from './EditorCanvasContext';

const CLASSIC_PALETTES: Array<{
  id: string;
  name: string;
  background: string;
  foreground: string;
  accent: string;
  accentLight: string;
  muted: string;
  cardBg: string;
}> = [
  { id: 'groovy-garden', name: 'Groovy Garden', background: '#F5F1E3', foreground: '#2C3522', accent: '#8B9C5A', accentLight: '#E6E7C8', muted: '#6B7358', cardBg: '#FDFBF2' },
  { id: 'pearl-district', name: 'Pearl District', background: '#F4F1EA', foreground: '#131A2A', accent: '#B97A3C', accentLight: '#E7DFD2', muted: '#5B6172', cardBg: '#FFFFFF' },
  { id: 'cannon-beach', name: 'Cannon Beach', background: '#EEEAE0', foreground: '#2B3540', accent: '#6D8B93', accentLight: '#D9E0DE', muted: '#7C8289', cardBg: '#F7F3EA' },
  { id: 'warm-linen', name: 'Warm Linen', background: '#F3E9D4', foreground: '#8B4720', accent: '#C6703D', accentLight: '#F4D8BE', muted: '#7A5A3F', cardBg: '#FFFAEE' },
  { id: 'olive-gold', name: 'Olive & Gold', background: '#F4EFDE', foreground: '#2A2E1A', accent: '#8A7D3B', accentLight: '#E6DFC3', muted: '#6C684E', cardBg: '#FCF8EA' },
  { id: 'lavender-ink', name: 'Lavender Ink', background: '#EDE7F5', foreground: '#1F1A2E', accent: '#7B5FB0', accentLight: '#D8CCEA', muted: '#6B5A8C', cardBg: '#FBF9FE' },
  { id: 'peach-cream', name: 'Peach Cream', background: '#FAEDD6', foreground: '#5C2E18', accent: '#E89261', accentLight: '#F9D6BB', muted: '#8B4720', cardBg: '#FFF8EB' },
  { id: 'midnight', name: 'Midnight Luxe', background: '#0F0E0D', foreground: '#F5F0EA', accent: '#C4A96A', accentLight: '#2A2015', muted: '#7A7068', cardBg: '#1A1815' },
];

type SmartPalette = {
  id: string;
  name: string;
  rationale: string;
  colors: [string, string, string, string];
  tone: string;
  source: string;
};

export interface ThemeQuickBarProps {
  manifest: StoryManifest;
  names: [string, string];
  onApply: (nextTheme: StoryManifest['theme']) => void;
  /** When true, render the picker body inline (no trigger pill,
   *  no fixed positioning). Lets a rail tab host it without the
   *  legacy floating bottom-right card. */
  docked?: boolean;
}

export function ThemeQuickBar({ manifest, names, onApply, docked = false }: ThemeQuickBarProps) {
  const editMode = useIsEditMode();
  const [open, setOpen] = useState(false);
  const [smartPalettes, setSmartPalettes] = useState<SmartPalette[] | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);

  if (!editMode && !docked) return null;

  const applyPreset = (p: (typeof CLASSIC_PALETTES)[number]) => {
    onApply({
      ...(manifest.theme ?? { name: p.id, borderRadius: '0.75rem', fonts: { heading: 'Fraunces', body: 'Inter' } }),
      name: p.id,
      colors: {
        background: p.background,
        foreground: p.foreground,
        accent: p.accent,
        accentLight: p.accentLight,
        muted: p.muted,
        cardBg: p.cardBg,
      },
    });
  };

  const applySmart = (p: SmartPalette) => {
    const [bg, primary, accent, contrast] = p.colors;
    onApply({
      ...(manifest.theme ?? { name: p.id, borderRadius: '0.75rem', fonts: { heading: 'Fraunces', body: 'Inter' } }),
      name: p.id,
      colors: {
        background: bg,
        foreground: contrast,
        accent: accent,
        accentLight: primary,
        muted: contrast,
        cardBg: bg,
      },
    });
  };

  const askPear = async () => {
    setSmartLoading(true);
    try {
      const res = await fetch('/api/wizard/smart-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasion: (manifest as unknown as { occasion?: string }).occasion ?? 'wedding',
          names,
          venue: manifest.logistics?.venue,
          city: manifest.logistics?.venue,
          vibes: [manifest.vibeString].filter(Boolean),
          howWeMet: (manifest as unknown as { factSheet?: { howWeMet?: string } }).factSheet?.howWeMet,
          whyCelebrate: (manifest as unknown as { factSheet?: { why?: string } }).factSheet?.why,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Palette advisor unavailable.');
      setSmartPalettes((data.palettes ?? []) as SmartPalette[]);
    } catch {
      setSmartPalettes([]);
    } finally {
      setSmartLoading(false);
    }
  };

  const triggerStyle: CSSProperties = {
    position: 'fixed',
    right: 332,
    bottom: 32,
    zIndex: 40,
    padding: '10px 14px',
    borderRadius: 999,
    background: 'var(--ink, #18181B)',
    color: 'var(--cream, #FDFAF0)',
    border: 'none',
    boxShadow: '0 8px 20px rgba(14,13,11,0.24)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  // Docked: render just the body inside its parent.
  if (docked) {
    return (
      <div
        style={{
          background: 'transparent',
          padding: '14px 16px 28px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display, Fraunces, serif)',
                fontStyle: 'italic',
                fontSize: 18,
              }}
            >
              Theme
            </span>
            <button
              type="button"
              onClick={askPear}
              disabled={smartLoading}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'transparent',
                fontSize: 12,
                fontWeight: 600,
                cursor: smartLoading ? 'wait' : 'pointer',
                color: 'var(--ink)',
              }}
            >
              {smartLoading ? 'Mixing…' : smartPalettes ? 'Re-ask' : 'Ask Pear'}
            </button>
          </div>
          {smartPalettes && smartPalettes.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                  marginBottom: 8,
                }}
              >
                Pear's picks
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {smartPalettes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applySmart(p)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: 10,
                      alignItems: 'center',
                      padding: 10,
                      borderRadius: 12,
                      background: 'var(--cream-2, #F7F0E0)',
                      border: '1px solid var(--line-soft)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 2 }}>
                      {p.colors.map((c, i) => (
                        <div key={i} style={{ width: 18, height: 22, background: c, borderRadius: 3 }} />
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.35, marginTop: 2 }}>
                        {p.rationale}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              marginBottom: 8,
            }}
          >
            Classic palettes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {CLASSIC_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: 'var(--cream-2, #F7F0E0)',
                  border: '1px solid var(--line-soft)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                  {[p.background, p.accent, p.foreground, p.accentLight].map((c, i) => (
                    <div key={i} style={{ width: 14, height: 18, background: c, borderRadius: 2 }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              </button>
            ))}
          </div>
      </div>
    );
  }

  // Floating (legacy) — trigger pill that pops the picker up from
  // the bottom-right corner. Kept as a fallback entry point; the
  // primary surface now lives in the inspector rail's Theme tab.
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} style={triggerStyle} aria-label="Quick theme change">
        🎨 Theme
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 332,
            bottom: 84,
            zIndex: 41,
            width: 320,
            background: 'var(--cream, #FDFAF0)',
            border: '1px solid var(--line, #E2D9C3)',
            borderRadius: 16,
            boxShadow: '0 20px 50px rgba(14,13,11,0.25)',
            padding: 16,
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display, Fraunces, serif)', fontStyle: 'italic', fontSize: 18, marginBottom: 12 }}>
            Theme
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {CLASSIC_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: 'var(--cream-2, #F7F0E0)',
                  border: '1px solid var(--line-soft)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                  {[p.background, p.accent, p.foreground, p.accentLight].map((c, i) => (
                    <div key={i} style={{ width: 14, height: 18, background: c, borderRadius: 2 }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
