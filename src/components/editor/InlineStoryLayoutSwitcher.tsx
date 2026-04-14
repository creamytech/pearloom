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
}

export function InlineStoryLayoutSwitcher() {
  const { manifest, actions } = useEditor();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeLayout = resolveStoryLayout(manifest.storyLayout, manifest.layoutFormat);

  // Compute fresh anchor rect from a known block id.
  const computeAnchor = useCallback((blockId: string): Anchor | null => {
    const el = document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      blockId,
      top: rect.top,
      left: rect.left + rect.width / 2,
      width: rect.width,
    };
  }, []);

  // ── Show/hide on block selection ──────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { blockType?: string; blockId?: string }
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

      const next = computeAnchor(blockId);
      if (next) setAnchor(next);
    };

    window.addEventListener('pearloom-select-block', handler);
    return () => window.removeEventListener('pearloom-select-block', handler);
  }, [computeAnchor]);

  // ── Reposition on scroll/resize while visible ─────────────────
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
      // Clicks inside the story block are fine — they'll re-fire
      // pearloom-select-block and keep us anchored.
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

  // Position: centered above the story block, offset upward so it
  // hovers clear of the block's top edge.
  const STRIP_OFFSET = 64;

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label="Story layout"
      style={{
        position: 'fixed',
        top: Math.max(anchor.top - STRIP_OFFSET, 8),
        left: anchor.left,
        transform: 'translateX(-50%)',
        // Sits just above other inline popovers (InlineStylePicker /
        // BlockConfigPopover @ 160) but still well below the modal
        // layer (1000+) so publish / tour / welcome sit on top.
        zIndex: 170,
        pointerEvents: 'auto',
        maxWidth: `min(${Math.max(anchor.width - 24, 320)}px, calc(100vw - 32px))`,
        padding: '8px 10px',
        borderRadius: '16px',
        background: 'rgba(250,247,242,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid #E4E4E7',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
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
        {LAYOUT_OPTIONS.map((opt) => {
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
                width: '80px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '4px',
                padding: '6px',
                borderRadius: '10px',
                background: isActive ? '#FFFFFF' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? '#18181B' : 'transparent',
                boxShadow: isActive ? '0 0 0 2px rgba(24,24,27,0.12)' : 'none',
                cursor: 'pointer',
                transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                fontFamily: 'inherit',
                color: '#18181B',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{ width: '100%', pointerEvents: 'none' }}>
                <MiniDiagram type={opt.type} />
              </div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: isActive ? '#18181B' : '#52525B',
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
