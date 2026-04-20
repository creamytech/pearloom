'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockPresetPicker.tsx
//
// Intercept layer between "add a block" and the actual insert.
// When the user drops/picks a new block from the library or "+"
// button, this modal pops with 3 preset tiles for that block
// type (Minimalist / Cinematic / Playful). Each tile shows a
// mini mock-up so the choice feels visual, not abstract.
//
// "Skip" falls back to the original default-config flow — we
// don't want to turn a 1-click action into a 3-click one for
// power users who already know what they want.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { presetsFor, type BlockPreset } from './block-presets';

export interface PendingBlock {
  blockType: string;
  position: number;
}

interface BlockPresetPickerProps {
  pending: PendingBlock | null;
  onPick: (preset: BlockPreset | null) => void;
  onClose: () => void;
}

export function BlockPresetPicker({ pending, onPick, onClose }: BlockPresetPickerProps) {
  const firstTileRef = useRef<HTMLButtonElement>(null);
  // Guard: when the picker opens immediately after a drag-and-drop, the
  // trailing mouseup/click from the drop event can land on the backdrop
  // and dismiss the picker before the user even sees it. We swallow
  // backdrop clicks for the first 280 ms after open.
  const openedAtRef = useRef<number>(0);
  useEffect(() => {
    if (pending) openedAtRef.current = Date.now();
  }, [pending]);

  const handleBackdropClick = () => {
    if (Date.now() - openedAtRef.current < 280) return;
    onClose();
  };

  // Autofocus the first tile + handle keyboard — Esc cancels, 1/2/3 picks
  // a variant, Enter accepts the focused tile.
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => firstTileRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '1' || e.key === '2' || e.key === '3') {
        const idx = Number(e.key) - 1;
        const p = presetsFor(pending.blockType)[idx];
        if (p) onPick(p);
      } else if (e.key.toLowerCase() === 's') {
        onPick(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [pending, onPick, onClose]);

  if (!pending) return null;
  const presets = presetsFor(pending.blockType);

  const blockLabel = pending.blockType.charAt(0).toUpperCase() + pending.blockType.slice(1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 4000,
          background: 'rgba(22,16,6,0.58)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Pick a ${blockLabel} variant`}
          style={{
            width: '100%',
            maxWidth: 820,
            background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
            borderTop: '2px solid rgba(184,147,90,0.65)',
            borderLeft: '1px solid rgba(184,147,90,0.22)',
            borderRight: '1px solid rgba(184,147,90,0.22)',
            borderBottom: '1px solid rgba(184,147,90,0.22)',
            borderRadius: 'var(--pl-radius-xs)',
            boxShadow: '0 32px 80px rgba(22,16,6,0.32), 0 2px 10px rgba(22,16,6,0.08)',
            padding: '26px 28px 24px',
            color: '#18181B',
          }}
        >
          {/* Masthead */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'rgba(184,147,90,0.85)',
            }}>
              New block · {blockLabel} · pick a variant
            </span>
            <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.45)' }} />
            <span style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: 'rgba(184,147,90,0.75)',
            }}>
              № 00 / 03
            </span>
          </div>

          <h2 style={{
            margin: '4px 0 18px',
            fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
            fontStyle: 'italic',
            fontSize: '1.65rem',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.008em',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}>
            how should this {blockLabel.toLowerCase()} feel?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}>
            {presets.map((preset, i) => (
              <motion.button
                key={preset.id}
                ref={i === 0 ? firstTileRef : undefined}
                type="button"
                onClick={() => onPick(preset)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 12,
                  borderRadius: 'var(--pl-radius-xs)',
                  background: 'rgba(250,247,242,0.75)',
                  borderTop: '1.5px solid rgba(184,147,90,0.55)',
                  borderLeft: '1px solid rgba(184,147,90,0.3)',
                  borderRight: '1px solid rgba(184,147,90,0.3)',
                  borderBottom: '1px solid rgba(184,147,90,0.3)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  color: 'inherit',
                  transition: 'box-shadow 180ms ease, border-color 180ms ease',
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(184,147,90,0.22)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.85)';
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(184,147,90,0.3)';
                }}
              >
                {/* Mini mock-up preview */}
                <PresetPreview preset={preset} blockType={pending.blockType} />

                {/* Caption */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  paddingTop: 2,
                  borderTop: '1px dashed rgba(184,147,90,0.35)',
                  marginTop: 2,
                }}>
                  <span style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    color: 'rgba(184,147,90,0.9)',
                    paddingTop: 6,
                  }}>
                    № 0{i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: '#18181B',
                      marginTop: 6,
                    }}>
                      {preset.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                      fontStyle: 'italic',
                      fontSize: '0.82rem',
                      color: '#52525B',
                      marginTop: 2,
                      lineHeight: 1.25,
                      letterSpacing: '-0.003em',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}>
                      {preset.tagline}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Footer — shortcuts + skip */}
          <div style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid rgba(184,147,90,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'rgba(82,82,91,0.75)',
            }}>
              <span><kbd style={kbdStyle}>1</kbd> minimalist</span>
              <span><kbd style={kbdStyle}>2</kbd> cinematic</span>
              <span><kbd style={kbdStyle}>3</kbd> playful</span>
              <span><kbd style={kbdStyle}>esc</kbd> cancel</span>
            </div>
            <button
              type="button"
              onClick={() => onPick(null)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--pl-radius-xs)',
                border: '1px solid rgba(184,147,90,0.45)',
                background: 'transparent',
                color: '#18181B',
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 9.5,
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
              Skip · use defaults
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  marginRight: 4,
  borderRadius: 'var(--pl-radius-xs)',
  background: 'rgba(184,147,90,0.18)',
  border: '1px solid rgba(184,147,90,0.35)',
  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: '#18181B',
};

// ── Mini preview — a tiny abstract sketch of what the block will look like ──
function PresetPreview({ preset, blockType }: { preset: BlockPreset; blockType: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        aspectRatio: '16 / 10',
        borderRadius: 'var(--pl-radius-xs)',
        background: preset.swatch,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(184,147,90,0.22)',
      }}
    >
      {/* Top kicker line */}
      <div style={{
        position: 'absolute',
        top: '16%',
        left: '14%',
        width: '28%',
        height: 2,
        background: preset.ink,
        opacity: 0.7,
      }} />

      {/* Block-specific mock-up */}
      {blockType === 'hero' ? (
        <>
          <div style={{
            position: 'absolute',
            top: '34%',
            left: '14%',
            right: '14%',
            height: '22%',
            background: preset.ink,
            opacity: 0.85,
            borderRadius: 'var(--pl-radius-xs)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '18%',
            left: '14%',
            width: '42%',
            height: 2,
            background: preset.ink,
            opacity: 0.4,
          }} />
        </>
      ) : blockType === 'story' ? (
        <>
          <div style={{
            position: 'absolute',
            top: '32%',
            left: '14%',
            width: '36%',
            height: '46%',
            background: preset.ink,
            opacity: 0.25,
            borderRadius: 'var(--pl-radius-xs)',
          }} />
          <div style={{
            position: 'absolute',
            top: '36%',
            right: '14%',
            width: '28%',
            height: 2,
            background: preset.ink,
            opacity: 0.65,
          }} />
          <div style={{
            position: 'absolute',
            top: '46%',
            right: '14%',
            width: '32%',
            height: 2,
            background: preset.ink,
            opacity: 0.4,
          }} />
          <div style={{
            position: 'absolute',
            top: '56%',
            right: '14%',
            width: '26%',
            height: 2,
            background: preset.ink,
            opacity: 0.4,
          }} />
        </>
      ) : blockType === 'countdown' ? (
        <div style={{
          position: 'absolute',
          top: '32%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 4,
        }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 22,
                borderRadius: 'var(--pl-radius-xs)',
                background: preset.ink,
                opacity: 0.75 - i * 0.08,
              }}
            />
          ))}
        </div>
      ) : blockType === 'event' ? (
        <>
          <div style={{
            position: 'absolute',
            top: '34%',
            left: '14%',
            width: '72%',
            height: 3,
            background: preset.ink,
            opacity: 0.75,
          }} />
          <div style={{
            position: 'absolute',
            top: '46%',
            left: '14%',
            width: '48%',
            height: 2,
            background: preset.ink,
            opacity: 0.4,
          }} />
          <div style={{
            position: 'absolute',
            top: '56%',
            left: '14%',
            width: '56%',
            height: 2,
            background: preset.ink,
            opacity: 0.4,
          }} />
          <div style={{
            position: 'absolute',
            bottom: '16%',
            right: '14%',
            width: 14,
            height: 14,
            background: preset.ink,
            opacity: 0.6,
            borderRadius: '50%',
          }} />
        </>
      ) : (
        <>
          <div style={{
            position: 'absolute',
            top: '32%',
            left: '14%',
            right: '14%',
            height: 3,
            background: preset.ink,
            opacity: 0.65,
          }} />
          <div style={{
            position: 'absolute',
            top: '44%',
            left: '14%',
            width: '68%',
            height: 2,
            background: preset.ink,
            opacity: 0.35,
          }} />
          <div style={{
            position: 'absolute',
            top: '52%',
            left: '14%',
            width: '52%',
            height: 2,
            background: preset.ink,
            opacity: 0.35,
          }} />
        </>
      )}

      {/* Folio corner */}
      <div style={{
        position: 'absolute',
        top: 6,
        right: 8,
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        fontSize: 7,
        fontWeight: 700,
        letterSpacing: '0.22em',
        color: preset.ink,
        opacity: 0.7,
      }}>
        № 01
      </div>
    </div>
  );
}
