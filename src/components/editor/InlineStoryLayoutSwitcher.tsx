'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/InlineStoryLayoutSwitcher.tsx
// Inline canvas control for switching the global story layout.
//
// Appears as a horizontal strip of pill-framed buttons anchored
// to the top of the currently-selected story section. Clicking a
// pill applies the chosen layout immediately via
// `actions.handleDesignChange`.
//
// Trigger: listens for the `pearloom-select-block` CustomEvent
// (fired by EditorCanvas when a block is clicked). Only shows up
// when `detail.blockType === 'story'`. Closes on outside click
// or when a non-story block is selected.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEditor } from '@/lib/editor-state';
import {
  LAYOUT_OPTIONS,
  MiniDiagram,
  resolveStoryLayout,
  type StoryLayoutType,
} from '@/components/blocks/StoryLayouts';

interface Anchor {
  blockId: string;
  top: number;   // viewport-space px (for position: fixed)
  left: number;  // viewport-space px, centered
  width: number; // rect width for sizing the strip
  // Origin point of the triggering click (viewport-space). When present
  // the switcher anchors near the click rather than the block's top
  // edge — feels more like a contextual menu than a banner. Falls back
  // to the block top when missing (keyboard activation, programmatic
  // selection).
  clickX?: number;
  clickY?: number;
}

export function InlineStoryLayoutSwitcher() {
  const { manifest, actions } = useEditor();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeLayout = resolveStoryLayout(manifest.storyLayout, manifest.layoutFormat);

  // Compute fresh anchor rect from a known block id. Carries through
  // any click-origin coordinates so the switcher can anchor to the
  // user's actual click rather than the block top.
  const computeAnchor = useCallback((
    blockId: string,
    clickPos?: { x: number; y: number },
  ): Anchor | null => {
    const el = document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      blockId,
      top: rect.top,
      left: rect.left + rect.width / 2,
      width: rect.width,
      clickX: clickPos?.x,
      clickY: clickPos?.y,
    };
  }, []);

  // ── Show/hide on block selection ──────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { blockType?: string; blockId?: string; clickPos?: { x: number; y: number } }
        | undefined;
      if (!detail) return;

      if (detail.blockType !== 'story') {
        // Selecting any non-story block closes the switcher.
        setAnchor(null);
        return;
      }

      // Find the story section's DOM element. Prefer blockId if
      // provided, else fall back to the first [data-pe-section="story"].
      let blockId = detail.blockId;
      if (!blockId) {
        const sectionEl = document.querySelector<HTMLElement>('[data-pe-section="story"]');
        blockId = sectionEl?.getAttribute('data-block-id') || undefined;
      }
      if (!blockId) {
        // No DOM yet — bail; user will re-trigger on next click.
        setAnchor(null);
        return;
      }

      const next = computeAnchor(blockId, detail.clickPos);
      if (next) {
        setAnchor(next);
        return;
      }
      // DOM not yet painted (e.g. first click during a parent re-render).
      // Retry on the next animation frame so the switcher never silently
      // no-ops and force the user to click twice.
      const id = blockId;
      const cp = detail.clickPos;
      requestAnimationFrame(() => {
        const retry = computeAnchor(id, cp);
        if (retry) setAnchor(retry);
      });
    };

    window.addEventListener('pearloom-select-block', handler);
    return () => window.removeEventListener('pearloom-select-block', handler);
  }, [computeAnchor]);

  // ── Reposition on scroll/resize while visible ─────────────────
  // Note: we *don't* try to track the click origin through scroll —
  // the original page-space click is long gone once the user scrolls.
  // Fall back to block-top anchoring in that case so the strip doesn't
  // drift into nonsense coordinates.
  useEffect(() => {
    if (!anchor) return;
    const reposition = () => {
      const next = computeAnchor(anchor.blockId);
      if (next) setAnchor(next);
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [anchor, computeAnchor]);

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    if (!anchor) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // Clicks inside the switcher itself are fine.
      if (rootRef.current?.contains(target)) return;
      // Clicks that land on a chapter (or other sub-actionable element)
      // should dismiss — they're the user saying "I'm done picking a
      // layout, now let me edit a chapter." Without this, the switcher
      // would linger because chapter clicks don't re-fire the block
      // selection event.
      const el = target as Element;
      const hitSubTarget = el.closest?.('[data-pe-chapter],[data-pe-event-id]');
      if (hitSubTarget) {
        setAnchor(null);
        return;
      }
      // Clicks inside the story block's empty/frame areas keep us open
      // (they'll re-fire pearloom-select-block and reposition).
      const storyEl = document.querySelector(`[data-block-id="${anchor.blockId}"]`);
      if (storyEl && storyEl.contains(target)) return;
      setAnchor(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [anchor]);

  if (!anchor) return null;

  const handleSelect = (type: StoryLayoutType) => {
    if (type === activeLayout) return;
    actions.handleDesignChange({
      ...manifest,
      storyLayout: type,
      // Mirror DesignPanel: clear the legacy field so it cannot
      // silently override the new selection.
      layoutFormat: undefined,
    });
  };

  // Position: prefer anchoring near the user's click — feels like a
  // contextual menu rather than a banner pinned to the block top.
  // Falls back to the block's top edge when no click origin is
  // available (keyboard activation, reposition after scroll).
  const STRIP_OFFSET = 64;
  const useClick = anchor.clickX != null && anchor.clickY != null;
  const topPx = useClick
    ? Math.max((anchor.clickY as number) - STRIP_OFFSET, 8)
    : Math.max(anchor.top - STRIP_OFFSET, 8);
  const leftPx = useClick ? (anchor.clickX as number) : anchor.left;

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label="Story layout"
      style={{
        position: 'fixed',
        top: topPx,
        left: leftPx,
        transform: 'translateX(-50%)',
        // Sits just above other inline popovers (InlineStylePicker /
        // BlockConfigPopover @ 160) but still well below the modal
        // layer (1000+) so publish / tour / welcome sit on top.
        zIndex: 170,
        pointerEvents: 'auto',
        maxWidth: `min(${Math.max(anchor.width - 24, 320)}px, calc(100vw - 32px))`,
        padding: '10px 12px 12px',
        borderRadius: 'var(--pl-radius-xs)',
        background: 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '2px solid rgba(184,147,90,0.55)',
        borderLeft: '1px solid rgba(184,147,90,0.22)',
        borderRight: '1px solid rgba(184,147,90,0.22)',
        borderBottom: '1px solid rgba(184,147,90,0.22)',
        boxShadow: '0 18px 44px rgba(28,22,10,0.20), 0 2px 8px rgba(28,22,10,0.06)',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      {/* Kicker masthead */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(184,147,90,0.28)',
      }}>
        <span style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(184,147,90,0.85)',
        }}>
          Layout · Story
        </span>
        <span style={{
          fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
          fontStyle: 'italic',
          fontSize: 12.5,
          fontWeight: 400,
          color: '#18181B',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        }}>
          Choose the reel.
        </span>
      </div>
      {/* Inner content keyed on blockId so switching between story blocks
          remounts + fades in — avoids a jarring "frozen" re-anchor. The
          outer fixed-position container stays stable. */}
      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={anchor.blockId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, ease: 'linear' }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: '6px',
          // Prevent children from shrinking below the 80px pill width
          // so the horizontal scroll actually kicks in on narrow viewports.
          width: 'max-content',
        }}
      >
        {LAYOUT_OPTIONS.map((opt, idx) => {
          const isActive = opt.type === activeLayout;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(opt.type);
              }}
              title={opt.desc}
              aria-pressed={isActive}
              style={{
                flex: '0 0 auto',
                width: '86px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '5px',
                padding: '8px 7px 9px',
                borderRadius: 'var(--pl-radius-xs)',
                background: isActive ? 'rgba(184,147,90,0.12)' : 'rgba(255,252,245,0.55)',
                border: isActive
                  ? '1px solid rgba(184,147,90,0.65)'
                  : '1px solid rgba(184,147,90,0.18)',
                boxShadow: isActive ? '0 0 0 3px rgba(184,147,90,0.18)' : 'none',
                cursor: 'pointer',
                transition: 'background 180ms cubic-bezier(0.22,1,0.36,1), border-color 180ms ease, box-shadow 180ms ease',
                fontFamily: 'inherit',
                color: '#18181B',
                textAlign: 'left',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(184,147,90,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,252,245,0.55)';
                }
              }}
            >
              <span style={{
                position: 'absolute',
                top: 4,
                right: 6,
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 7.5,
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: isActive ? 'rgba(184,147,90,0.95)' : 'rgba(184,147,90,0.45)',
              }}>
                № {String(idx + 1).padStart(2, '0')}
              </span>
              <div style={{
                width: '100%',
                pointerEvents: 'none',
                marginTop: 8,
                padding: 3,
                background: '#FFFCF6',
                border: '1px solid rgba(184,147,90,0.18)',
                borderRadius: 'var(--pl-radius-xs)',
              }}>
                <MiniDiagram type={opt.type} />
              </div>
              <div
                style={{
                  fontFamily: 'var(--pl-font-display, "Fraunces", serif)',
                  fontStyle: 'italic',
                  fontSize: '0.72rem',
                  fontWeight: 400,
                  lineHeight: 1.15,
                  letterSpacing: '0.005em',
                  color: '#18181B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {opt.label}
              </div>
            </button>
          );
        })}
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
