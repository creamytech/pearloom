'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/InlineRewriteLauncher.tsx
//
// Ambient "Rewrite with Pear" chip that follows the currently
// hovered or focused editable text element on the canvas. Click
// it → the whole text gets selected and the existing
// PearTextRewrite pill picks up the selectionchange, shows its
// 3-variant panel. No modal, no panel detour — double-click or
// hover, and the chip is there.
//
// Pairs with PearTextRewrite (selection-based) so the user has
// two entry points:
//   • Hover chip — rewrite the whole field at once
//   • Text selection — rewrite a specific phrase mid-paragraph
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PearIcon } from '@/components/icons/PearloomIcons';
import {
  announceInlineToolbar,
  onInlineToolbarActivated,
} from './inline-toolbar-bus';

interface InlineRewriteLauncherProps {
  /** Root DOM node to observe; defaults to document.body. */
  root?: HTMLElement | null;
}

interface ChipPos {
  top: number;
  left: number;
  key: string;
}

export function InlineRewriteLauncher({ root }: InlineRewriteLauncherProps = {}) {
  const [chip, setChip] = useState<ChipPos | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressed = useRef(false);

  const hide = useCallback(() => {
    setChip(null);
    anchorRef.current = null;
  }, []);

  const positionFor = useCallback((el: HTMLElement): ChipPos => {
    const rect = el.getBoundingClientRect();
    return {
      // Anchor to the top-right corner of the field, offset out slightly
      // so the chip doesn't cover first-line text.
      top: Math.max(8, rect.top - 34),
      left: Math.min(window.innerWidth - 150, rect.right - 120),
      key: el.getAttribute('data-pe-path') || `${rect.top}:${rect.left}`,
    };
  }, []);

  // Track the hovered editable element.
  useEffect(() => {
    const host = root || document.body;
    // Only announce to the bus on fresh open (null → chip) or when
    // the anchor changes — announcing on every mousemove hid the
    // Section toolbar whenever the user passed over a chapter's
    // editable title (bug reported 2026-04).
    let lastAnnouncedAnchor: HTMLElement | null = null;
    const onMove = (e: MouseEvent) => {
      if (suppressed.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Don't steal focus from the pill itself or any open AI UI.
      if (target.closest('[data-pear-rewrite-chip]')) return;
      const editable = target.closest?.(
        '[data-pe-editable="true"]',
      ) as HTMLElement | null;
      if (!editable) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => {
          hide();
          lastAnnouncedAnchor = null;
        }, 260);
        return;
      }
      const text = (editable.textContent || '').trim();
      if (text.length < 3) return; // nothing meaningful to rewrite
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      anchorRef.current = editable;
      setChip(positionFor(editable));
      if (lastAnnouncedAnchor !== editable) {
        announceInlineToolbar('rewrite');
        lastAnnouncedAnchor = editable;
      }
    };

    // Hide when any other inline toolbar opens.
    const offBus = onInlineToolbarActivated((id) => {
      if (id !== 'rewrite') {
        hide();
        lastAnnouncedAnchor = null;
      }
    });

    const onScroll = () => {
      if (anchorRef.current) setChip(positionFor(anchorRef.current));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    host.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('keydown', onKey);
    return () => {
      host.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('keydown', onKey);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      offBus();
    };
  }, [root, hide, positionFor]);

  // Listen for double-click to pin the chip + auto-expand into the variant flow.
  useEffect(() => {
    const onDbl = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const editable = target.closest?.(
        '[data-pe-editable="true"]',
      ) as HTMLElement | null;
      if (!editable) return;
      const text = (editable.textContent || '').trim();
      if (text.length < 3) return;
      anchorRef.current = editable;
      setChip(positionFor(editable));
      // Don't auto-fire rewrite here — double-click is the user's request to
      // edit, so let them decide whether they want AI or manual.
    };
    document.addEventListener('dblclick', onDbl);
    return () => document.removeEventListener('dblclick', onDbl);
  }, [positionFor]);

  const triggerRewrite = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    // Select the full text of the editable region so PearTextRewrite's
    // selectionchange handler wakes up with the whole field staged.
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    // Temporarily suppress hover-update so the chip doesn't flicker while the
    // user is working inside the variant panel.
    suppressed.current = true;
    setTimeout(() => { suppressed.current = false; }, 1200);
    hide();
  }, [hide]);

  if (typeof document === 'undefined' || !chip) return null;

  return createPortal(
    <AnimatePresence>
      <motion.button
        key={chip.key}
        type="button"
        data-pear-rewrite-chip=""
        aria-label="Rewrite this with Pear"
        initial={{ opacity: 0, y: 4, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.92 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          triggerRewrite();
        }}
        onMouseEnter={() => {
          // Lock the chip while cursor is on it.
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
        }}
        style={{
          position: 'fixed',
          top: chip.top,
          left: chip.left,
          zIndex: 'var(--z-max)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px 6px 8px',
          borderRadius: 'var(--pl-radius-xs)',
          borderTop: '1.5px solid rgba(193,154,75,0.95)',
          borderLeft: '1px solid rgba(193,154,75,0.32)',
          borderRight: '1px solid rgba(193,154,75,0.32)',
          borderBottom: '1px solid rgba(193,154,75,0.32)',
          background: 'linear-gradient(180deg, #FDFAF0 0%, #F3EFE7 100%)',
          color: '#18181B',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow:
            '0 6px 18px rgba(22,16,6,0.16), 0 1px 4px rgba(22,16,6,0.06), 0 0 0 3px rgba(193,154,75,0.16)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
          }}
        >
          <PearIcon size={12} color="#C6563D" />
        </span>
        Rewrite with Pear
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            marginLeft: 2,
            borderRadius: 'var(--pl-radius-xs)',
            background: 'rgba(193,154,75,0.18)',
            color: 'rgba(82,82,91,0.9)',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.12em',
          }}
        >
          ✦
        </span>
      </motion.button>
    </AnimatePresence>,
    document.body,
  );
}
