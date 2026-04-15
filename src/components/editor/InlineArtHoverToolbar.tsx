'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/InlineArtHoverToolbar.tsx
//
// Wraps a decorative SVG surface with a hover-reveal mini toolbar
// that lets the user remove or regenerate that single piece of AI
// art from right where it lives on the canvas. Used for:
//   - sectionBorderSvg (between chapters)
//   - medallionSvg     (top of story)
//   - chapterIcons[i]  (above each chapter)
//   - heroBlobSvg      (hero overlay)
//   - cornerFlourishSvg
//   - accentBlobSvg
//
// Clicking the corner chip opens an expanded popover with proper
// controls: style / preset picker (separator only), opacity + scale
// sliders, color override, placement (separator only), plus the
// remove + regenerate actions. Settings write through to
// `manifest.artSettings[slotKey]` via the `pearloom-art-edit` event
// ({ action: 'set-setting' }). EditorCanvas applies the patch.
//
// Positioning contract: the wrapper inherits positioning from the
// `style` prop (callers pass the same absolute/relative geometry
// the raw SVG used to have). The inner artwork keeps its original
// pointer-events: none so clicks over the art fall through to the
// content behind it. Only the tiny corner chip captures pointer
// events, so no critical UI (hero CTA, chapter title) gets hijacked.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Sparkles, Loader2, Settings, Check } from 'lucide-react';
import { SEPARATOR_PRESETS } from '@/lib/separator-presets';
import type { StoryManifest } from '@/types';

export type ArtSlotKey =
  | 'heroBlobSvg'
  | 'cornerFlourishSvg'
  | 'accentBlobSvg'
  | 'sectionBorderSvg'
  | 'medallionSvg'
  | 'heroPatternSvg'
  | 'chapterIcon';

export type ArtAction =
  | 'remove'
  | 'regenerate'
  | 'set-setting'
  | 'set-variant';

export interface ArtEditDetail {
  slot: ArtSlotKey;
  action: ArtAction;
  /** Index into chapterIcons[] when slot === 'chapterIcon'. */
  index?: number;
  /** For 'set-setting' — partial patch merged into artSettings[settingKey]. */
  settingKey?: keyof NonNullable<StoryManifest['artSettings']>;
  settingPatch?: Record<string, unknown>;
  /** For 'set-variant' — preset id from SEPARATOR_PRESETS. */
  variantId?: string;
}

// Maps ArtSlotKey → artSettings sub-key. Not all slots have settings
// yet; undefined means "no per-slot settings available for this slot".
const SETTING_KEY_FOR_SLOT: Partial<Record<ArtSlotKey,
  keyof NonNullable<StoryManifest['artSettings']>>> = {
  sectionBorderSvg: 'sectionBorder',
  medallionSvg: 'medallion',
  heroBlobSvg: 'heroBlob',
  cornerFlourishSvg: 'cornerFlourish',
  accentBlobSvg: 'accentBlob',
  heroPatternSvg: 'heroPattern',
};

interface Props {
  children: React.ReactNode;
  slot: ArtSlotKey;
  /** Array index for chapterIcon only. */
  index?: number;
  /** Label for the hover tooltip (e.g. "Chapter divider"). */
  label: string;
  /** Inline style for the outer wrapper (positioning inherited from parent). */
  style?: React.CSSProperties;
  /** Pass through className — used by callers that rely on CSS classes. */
  className?: string;
  /** When false, render children unchanged with no hover UI (public site). */
  editable?: boolean;
  /**
   * Current artSettings for this slot — read-only, used to populate the
   * popover controls. Parent (StoryLayouts / SiteRenderer) passes the
   * already-resolved value so the toolbar itself stays prop-light.
   */
  settings?: {
    opacity?: number;
    scale?: number;
    color?: string;
    variant?: string;
    placement?: 'between' | 'bookend' | 'top' | 'bottom' | 'none';
  };
}

export function InlineArtHoverToolbar({
  children, slot, index, label, style, className, editable, settings,
}: Props) {
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState<null | 'remove' | 'regenerate'>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelRect, setPanelRect] = useState<{ top: number; left: number } | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Live ref so async handlers don't re-trigger in-flight calls.
  const busyRef = useRef<null | 'remove' | 'regenerate'>(null);

  const settingKey = SETTING_KEY_FOR_SLOT[slot];
  const isSeparator = slot === 'sectionBorderSvg';

  const dispatch = useCallback((detail: ArtEditDetail) => {
    window.dispatchEvent(new CustomEvent('pearloom-art-edit', { detail }));
  }, []);

  const dispatchWithBusy = (action: 'remove' | 'regenerate') => {
    if (busyRef.current) return;
    busyRef.current = action;
    setBusy(action);
    const detail: ArtEditDetail = { slot, action, index };
    window.dispatchEvent(new CustomEvent('pearloom-art-edit', { detail }));
    const doneHandler = (e: Event) => {
      const d = (e as CustomEvent).detail as ArtEditDetail & { ok?: boolean };
      if (d?.slot === slot && d?.action === action && d?.index === index) {
        busyRef.current = null;
        setBusy(null);
        window.removeEventListener('pearloom-art-edit-done', doneHandler);
      }
    };
    window.addEventListener('pearloom-art-edit-done', doneHandler);
    // Safety timeout — release busy even if no done event comes back.
    setTimeout(() => {
      if (busyRef.current === action) {
        busyRef.current = null;
        setBusy(null);
        window.removeEventListener('pearloom-art-edit-done', doneHandler);
      }
    }, 15000);
  };

  // ── Position the popover beneath the chip ────────────────────
  useEffect(() => {
    if (!panelOpen) return;
    const reposition = () => {
      const chip = chipRef.current;
      if (!chip) return;
      const rect = chip.getBoundingClientRect();
      // Default: beneath the chip, right-aligned. Clamp to viewport.
      const panelWidth = 280;
      const panelHeight = 360;
      let left = rect.right - panelWidth;
      let top = rect.bottom + 6;
      if (left < 8) left = 8;
      if (left + panelWidth > window.innerWidth - 8) {
        left = window.innerWidth - panelWidth - 8;
      }
      if (top + panelHeight > window.innerHeight - 8) {
        // Flip above if there's no room below.
        top = Math.max(8, rect.top - panelHeight - 6);
      }
      setPanelRect({ top, left });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [panelOpen]);

  // ── Close panel on outside click / Escape ─────────────────────
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (chipRef.current?.contains(t)) return;
      setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  if (!editable) {
    // Public site / non-edit preview: no-op wrapper that doesn't change
    // layout or interaction.
    return <div style={{ pointerEvents: 'none', ...style }} className={className}>{children}</div>;
  }

  // Helper: patch a single field on artSettings[settingKey].
  const patchSetting = (patch: Record<string, unknown>) => {
    if (!settingKey) return;
    dispatch({ slot, action: 'set-setting', settingKey, settingPatch: patch, index });
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        // Wrapper itself doesn't capture pointer events — we rely on the
        // child art (pointer-events:none still) and the tiny corner chip
        // (pointer-events:auto). This keeps hero CTAs / chapter text
        // beneath the decorative SVG fully clickable in edit mode.
        pointerEvents: 'none',
        ...style,
      }}
      className={className}
    >
      {children}

      {/* Always-visible corner chip */}
      <div
        ref={chipRef}
        role="toolbar"
        aria-label={`${label} actions`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          zIndex: 20,
          display: 'flex',
          gap: 2,
          padding: 3,
          borderRadius: 8,
          background: 'rgba(24,24,27,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
          pointerEvents: 'auto',
          opacity: hover || busy || panelOpen ? 1 : 0.55,
          transform: hover || busy || panelOpen ? 'scale(1)' : 'scale(0.92)',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        {settingKey && (
          <ArtBtn
            title={`Edit ${label.toLowerCase()}`}
            onClick={() => setPanelOpen(o => !o)}
            disabled={!!busy}
            active={panelOpen}
            Icon={Settings}
          />
        )}
        <ArtBtn
          title={`Regenerate ${label.toLowerCase()}`}
          onClick={() => dispatchWithBusy('regenerate')}
          disabled={!!busy}
          loading={busy === 'regenerate'}
          Icon={Sparkles}
        />
        <ArtBtn
          title={`Remove ${label.toLowerCase()}`}
          onClick={() => dispatchWithBusy('remove')}
          disabled={!!busy}
          loading={busy === 'remove'}
          Icon={Trash2}
          danger
        />
      </div>

      {/* Expanded options popover (portaled to body so it escapes the
          pointer-events:none wrapper + any ancestor stacking contexts). */}
      {panelOpen && panelRect && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`${label} options`}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: panelRect.top,
            left: panelRect.left,
            width: 280,
            zIndex: 9999,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(250,247,242,0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid #E4E4E7',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.05)',
            fontFamily: 'inherit',
            color: '#18181B',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#52525B' }}>
              {label}
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close"
              style={{
                border: 'none', background: 'transparent', color: '#71717A',
                cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
              }}
            >×</button>
          </div>

          {/* Separator-only: preset style picker */}
          {isSeparator && (
            <PopoverSection label="Style">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}>
                <PresetTile
                  active={!settings?.variant}
                  onClick={() => dispatch({ slot, action: 'set-variant', variantId: '' })}
                  label="AI"
                >
                  {/* Tiny sparkle-ish indicator */}
                  <Sparkles size={14} color="currentColor" />
                </PresetTile>
                {SEPARATOR_PRESETS.map(p => (
                  <PresetTile
                    key={p.id}
                    active={settings?.variant === p.id}
                    onClick={() => dispatch({ slot, action: 'set-variant', variantId: p.id })}
                    label={p.label}
                  >
                    <div
                      aria-hidden="true"
                      style={{ width: '100%', height: '100%', color: '#18181B', display: 'flex', alignItems: 'center' }}
                      dangerouslySetInnerHTML={{ __html: p.svg }}
                    />
                  </PresetTile>
                ))}
              </div>
            </PopoverSection>
          )}

          {/* Placement — separator only */}
          {isSeparator && (
            <PopoverSection label="Placement">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {([
                  { id: 'between', label: 'Between' },
                  { id: 'bookend', label: 'Top+Btm' },
                  { id: 'top',     label: 'Top'     },
                  { id: 'bottom',  label: 'Bottom'  },
                  { id: 'none',    label: 'None'    },
                ] as const).map(opt => {
                  const on = (settings?.placement ?? 'between') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patchSetting({ placement: opt.id })}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 6,
                        border: on ? '1px solid #18181B' : '1px solid #E4E4E7',
                        background: on ? 'rgba(24,24,27,0.06)' : '#fff',
                        color: '#18181B',
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </PopoverSection>
          )}

          {/* Opacity slider */}
          <PopoverSection label={`Opacity  ${Math.round(((settings?.opacity ?? 0.5) * 100))}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(((settings?.opacity ?? 0.5) * 100))}
              onChange={(e) => patchSetting({ opacity: Number(e.target.value) / 100 })}
              style={{ width: '100%', accentColor: '#18181B' }}
            />
          </PopoverSection>

          {/* Scale slider */}
          <PopoverSection label={`Scale  ${((settings?.scale ?? 1) * 100).toFixed(0)}%`}>
            <input
              type="range"
              min={50}
              max={200}
              value={Math.round((settings?.scale ?? 1) * 100)}
              onChange={(e) => patchSetting({ scale: Number(e.target.value) / 100 })}
              style={{ width: '100%', accentColor: '#18181B' }}
            />
          </PopoverSection>

          {/* Color override */}
          <PopoverSection label="Color">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { value: '', label: 'Theme' },
                { value: '#18181B', label: 'Ink' },
                { value: '#8B7355', label: 'Warm' },
                { value: '#A3B18A', label: 'Olive' },
                { value: '#C4A96A', label: 'Gold' },
                { value: '#6B7280', label: 'Gray' },
              ].map(c => {
                const on = (settings?.color ?? '') === c.value;
                return (
                  <button
                    key={c.value || 'theme'}
                    type="button"
                    title={c.label}
                    aria-label={`Color ${c.label}`}
                    onClick={() => patchSetting({ color: c.value })}
                    style={{
                      width: 22, height: 22, padding: 0,
                      borderRadius: '50%',
                      border: on ? '2px solid #18181B' : '1.5px solid rgba(0,0,0,0.1)',
                      background: c.value || 'linear-gradient(135deg,#eee,#aaa)',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {!c.value && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#52525B' }}>A</span>
                    )}
                  </button>
                );
              })}
              <input
                type="color"
                value={settings?.color || '#18181B'}
                onChange={(e) => patchSetting({ color: e.target.value })}
                aria-label="Custom color"
                style={{
                  width: 22, height: 22, padding: 0,
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              />
            </div>
          </PopoverSection>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => dispatchWithBusy('regenerate')}
              disabled={!!busy}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #18181B',
                background: '#18181B',
                color: '#FAF7F2',
                fontSize: 11,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {busy === 'regenerate'
                ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Sparkles size={12} />}
              Regenerate AI
            </button>
            <button
              type="button"
              onClick={() => dispatchWithBusy('remove')}
              disabled={!!busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid #E4E4E7',
                background: '#fff',
                color: '#B91C1C',
                fontSize: 11,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {busy === 'remove'
                ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Trash2 size={12} />}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────
function PopoverSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#71717A',
        marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function PresetTile({
  active, onClick, label, children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 2,
        padding: 4,
        borderRadius: 6,
        border: active ? '1.5px solid #18181B' : '1px solid #E4E4E7',
        background: active ? 'rgba(24,24,27,0.04)' : '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
        position: 'relative',
      }}
    >
      <div style={{
        height: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {children}
      </div>
      <div style={{ fontSize: 8, fontWeight: 600, color: '#52525B', letterSpacing: '0.02em' }}>
        {label}
      </div>
      {active && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          width: 12, height: 12, borderRadius: '50%',
          background: '#18181B', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={8} />
        </span>
      )}
    </button>
  );
}

function ArtBtn({
  title, onClick, disabled, loading, Icon, danger, active,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  Icon: React.ElementType;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        border: 'none',
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        color: danger ? '#ff8a8a' : '#fff',
        cursor: disabled ? 'wait' : 'pointer',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? 'rgba(248,113,113,0.22)'
          : 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = active
          ? 'rgba(255,255,255,0.18)'
          : 'transparent';
      }}
    >
      {loading ? (
        <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
      ) : (
        <Icon size={11} />
      )}
    </button>
  );
}
