'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ThemeRemixMode.tsx
//
// Hold Shift over the canvas, scroll the wheel, and cycle
// through hand-crafted preset themes live on the whole site.
// Release Shift → a small HUD asks "Keep this palette?" with
// Keep / Revert buttons. Esc reverts instantly.
//
// Playful counterpart to the Design panel (which is deliberate
// and slow). The remix mode is for "I'll know it when I see it"
// palette exploration — the site recolors under your hands and
// you commit with a single keystroke.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryManifest } from '@/types';
import type { VibeSkin } from '@/lib/vibe-engine';
import { PRESET_THEMES } from './ThemeSwitcher';

interface ThemeRemixModeProps {
  manifest: StoryManifest;
  onApply: (next: StoryManifest) => void;
}

type HUDState =
  | { kind: 'idle' }
  | { kind: 'active'; idx: number }
  | { kind: 'prompt'; idx: number };

function deriveThemeFromSkin(skin: VibeSkin): StoryManifest['theme'] | undefined {
  const p = skin.palette;
  return {
    name: `remix-${(skin as unknown as { name?: string }).name ?? 'palette'}`,
    fonts: { heading: skin.fonts.heading, body: skin.fonts.body },
    colors: {
      background: p.background,
      foreground: p.foreground,
      accent: p.accent,
      accentLight: p.accent2,
      muted: p.muted,
      cardBg: p.card,
    },
    borderRadius: '1rem',
  };
}

export function ThemeRemixMode({ manifest, onApply }: ThemeRemixModeProps) {
  const [state, setState] = useState<HUDState>({ kind: 'idle' });

  // Snapshot of the manifest vibeSkin + theme we need to revert to if the
  // user cancels remixing.
  const baselineRef = useRef<{ vibeSkin: VibeSkin | undefined; theme: StoryManifest['theme'] | undefined }>({
    vibeSkin: manifest.vibeSkin,
    theme: manifest.theme,
  });

  // Keep manifest fresh for our closures without re-subscribing on every edit.
  const manifestRef = useRef(manifest);
  useEffect(() => { manifestRef.current = manifest; }, [manifest]);

  const shiftHeld = useRef(false);
  const wheelStreak = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyIndex = useCallback((idx: number) => {
    const theme = PRESET_THEMES[((idx % PRESET_THEMES.length) + PRESET_THEMES.length) % PRESET_THEMES.length];
    if (!theme) return;
    const current = manifestRef.current;
    if (!current) return;
    // Strip the `name` label off the skin before writing (VibeSkin doesn't
    // formally include it — we carry it only for the HUD label).
    const { name: _name, ...skin } = theme;
    void _name;
    const nextTheme = deriveThemeFromSkin(skin);
    onApply({
      ...current,
      vibeSkin: skin,
      theme: nextTheme ?? current.theme,
    });
  }, [onApply]);

  const revert = useCallback(() => {
    const current = manifestRef.current;
    if (!current) return;
    const next: StoryManifest = { ...current };
    if (baselineRef.current.vibeSkin) {
      next.vibeSkin = baselineRef.current.vibeSkin;
    } else {
      delete (next as Partial<StoryManifest>).vibeSkin;
    }
    if (baselineRef.current.theme) {
      next.theme = baselineRef.current.theme;
    } else {
      delete (next as Partial<StoryManifest>).theme;
    }
    onApply(next);
  }, [onApply]);

  // Once we commit, the baseline becomes the current skin.
  const commit = useCallback((idx: number) => {
    const theme = PRESET_THEMES[((idx % PRESET_THEMES.length) + PRESET_THEMES.length) % PRESET_THEMES.length];
    if (!theme) return;
    const { name: _name, ...skin } = theme;
    void _name;
    baselineRef.current = {
      vibeSkin: skin,
      theme: deriveThemeFromSkin(skin),
    };
    setState({ kind: 'idle' });
  }, []);

  // ── Shift key tracking ────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeld.current = true;
      if (e.key === 'Escape') {
        if (state.kind !== 'idle') {
          revert();
          setState({ kind: 'idle' });
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftHeld.current = false;
        // On release, if we were actively cycling, prompt the user to
        // Keep / Revert. If no cycling happened (just tapped Shift),
        // drop back to idle silently.
        setState((s) => (s.kind === 'active' ? { kind: 'prompt', idx: s.idx } : s));
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [revert, state.kind]);

  // ── Wheel cycling while Shift is held ─────────────────────
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!shiftHeld.current) return;
      // Don't cycle on trackpad-horizontal or tiny nudges.
      if (Math.abs(e.deltaY) < 6) return;
      // Only intercept scroll when the event originates inside the canvas.
      const target = e.target as HTMLElement | null;
      if (!target?.closest('#pl-editor-canvas')) return;
      e.preventDefault();
      setState((s) => {
        const baseIdx = s.kind === 'idle' ? 0 : s.idx;
        const step = e.deltaY > 0 ? 1 : -1;
        const nextIdx = baseIdx + step;
        applyIndex(nextIdx);
        return { kind: 'active', idx: nextIdx };
      });

      // Debounce — if the user stops scrolling for 700ms while still
      // holding Shift, keep the HUD active but dim the "scrolling" hint.
      if (wheelStreak.current) clearTimeout(wheelStreak.current);
      wheelStreak.current = setTimeout(() => {
        wheelStreak.current = null;
      }, 700);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelStreak.current) clearTimeout(wheelStreak.current);
    };
  }, [applyIndex]);

  if (typeof document === 'undefined') return null;
  if (state.kind === 'idle') return null;

  const currentIdx = state.idx;
  const currentTheme = PRESET_THEMES[((currentIdx % PRESET_THEMES.length) + PRESET_THEMES.length) % PRESET_THEMES.length];
  const palette = currentTheme.palette;
  const folio = String(
    (((currentIdx % PRESET_THEMES.length) + PRESET_THEMES.length) % PRESET_THEMES.length) + 1,
  ).padStart(2, '0');
  const total = String(PRESET_THEMES.length).padStart(2, '0');

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="remix-hud"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-label="Theme remix"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3500,
          minWidth: 360,
          maxWidth: 560,
          padding: '14px 18px 12px',
          borderRadius: 'var(--pl-radius-xs)',
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
          borderTop: '2px solid rgba(184,147,90,0.8)',
          borderLeft: '1px solid rgba(184,147,90,0.28)',
          borderRight: '1px solid rgba(184,147,90,0.28)',
          borderBottom: '1px solid rgba(184,147,90,0.28)',
          boxShadow: '0 22px 48px rgba(22,16,6,0.22), 0 2px 8px rgba(22,16,6,0.08)',
          color: '#18181B',
        }}
      >
        {/* Masthead */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 8,
          borderBottom: '1px dashed rgba(184,147,90,0.35)',
          marginBottom: 10,
        }}>
          <span style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'rgba(184,147,90,0.9)',
          }}>
            Remix · palette cycler
          </span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: 'rgba(184,147,90,0.85)',
          }}>
            № {folio} / {total}
          </span>
        </div>

        {/* Current palette swatches + name */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            border: '1px solid rgba(184,147,90,0.28)',
            borderRadius: 'var(--pl-radius-xs)',
            overflow: 'hidden',
            minWidth: 72,
            height: 36,
          }}>
            {[palette.background, palette.foreground, palette.accent, palette.accent2].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
              fontStyle: 'italic',
              fontSize: '1.15rem',
              fontWeight: 400,
              letterSpacing: '-0.005em',
              lineHeight: 1.15,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}>
              {currentTheme.name}
            </div>
            <div style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(82,82,91,0.75)',
              marginTop: 2,
            }}>
              {currentTheme.fonts.heading} · {currentTheme.tone ?? 'signature'}
            </div>
          </div>
        </div>

        {/* Action row */}
        {state.kind === 'active' ? (
          <div style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'rgba(82,82,91,0.75)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            paddingTop: 2,
          }}>
            <span>scroll · cycle</span>
            <span>release shift · prompt</span>
            <span>esc · revert</span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: 8,
            paddingTop: 2,
          }}>
            <button
              type="button"
              onClick={() => { revert(); setState({ kind: 'idle' }); }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 'var(--pl-radius-xs)',
                border: '1px solid rgba(184,147,90,0.45)',
                background: 'transparent',
                color: '#18181B',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 160ms ease, border-color 160ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(184,147,90,0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.75)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.45)';
              }}
            >
              Revert · Esc
            </button>
            <button
              type="button"
              onClick={() => commit(currentIdx)}
              autoFocus
              style={{
                flex: 1.4,
                padding: '9px 16px',
                borderRadius: 'var(--pl-radius-xs)',
                background: '#18181B',
                color: '#FAF7F2',
                border: 'none',
                borderTop: '1.5px solid rgba(184,147,90,0.95)',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 0 3px rgba(184,147,90,0.22)',
                transition: 'box-shadow 180ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(184,147,90,0.32)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(184,147,90,0.22)';
              }}
            >
              Keep this · ↵
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
