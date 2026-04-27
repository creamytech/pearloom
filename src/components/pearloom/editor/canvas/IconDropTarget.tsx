'use client';

// ─────────────────────────────────────────────────────────────
// IconDropTarget — canvas-level drag-drop and click-to-swap for
// every icon on the site. Mounted once at the editor's canvas
// root in edit mode. Two intents share the same surface:
//
//   • Click an icon → fire pearloom:icon-swap (IconSwapModal
//     handles the rest). The swap modal targets the icon's
//     `data-pl-icon-original` so swaps survive previous swaps.
//
//   • Drag an icon tile from the asset library onto a canvas
//     icon → on dragover, the closest icon under the cursor
//     pulses with a peach ring + "Drop to replace ↦ <name>"
//     pill. On drop, the override is written to the manifest.
//
// Library tiles set the drag mime `text/x-pearloom-icon` to
// the *new* icon name. Original-name keying means dropping on
// any existing icon is enough — no per-instance bookkeeping.
//
// EditableText fields call stopPropagation on their clicks so
// a click on a heading that happens to contain an icon won't
// accidentally fire the swap modal.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';

const DRAG_MIME = 'text/x-pearloom-icon';

interface Props {
  /** Edit-mode flag. The component is a no-op when false. */
  editMode: boolean;
  /** Manifest patcher — applies the override on drop. */
  onEditField?: (patch: (m: StoryManifest) => StoryManifest) => void;
  /** Canvas root — the listeners install on this element so they
   *  don't compete with editor chrome (topbar, inspector). */
  canvasRoot: HTMLElement | null;
}

interface Hover {
  el: HTMLElement;
  rect: DOMRect;
  /** Original name from `data-pl-icon-original` — what we key
   *  the override off of. */
  originalName: string;
  /** Currently-displayed name (could already be an override). */
  currentName: string;
}

export function IconDropTarget({ editMode, onEditField, canvasRoot }: Props) {
  const [hover, setHover] = useState<Hover | null>(null);
  const [dropping, setDropping] = useState<{ replacement: string } | null>(null);
  // Track the latest hover via a ref so the keydown handler can
  // read it without re-binding on every state change.
  const hoverRef = useRef<Hover | null>(null);
  hoverRef.current = hover;

  // ── Click handler — opens IconSwapModal for the targeted icon.
  useEffect(() => {
    if (!editMode || !canvasRoot) return;
    function onClick(e: Event) {
      const target = e.target as Element | null;
      const svg = target?.closest('[data-pl-icon-original]') as HTMLElement | null;
      if (!svg) return;
      // Don't hijack clicks inside an EditableText (clicking a
      // heading with an icon inside should still focus the text).
      const editable = target?.closest('[data-pl-editable]');
      if (editable && editable.contains(svg)) return;

      const originalName = svg.getAttribute('data-pl-icon-original') ?? '';
      const currentName = svg.getAttribute('data-pl-icon-name') ?? originalName;
      if (!originalName) return;
      e.stopPropagation();
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('pearloom:icon-swap', {
        detail: { purpose: `icon:${originalName}`, currentName },
      }));
    }
    canvasRoot.addEventListener('click', onClick, true);
    return () => canvasRoot.removeEventListener('click', onClick, true);
  }, [editMode, canvasRoot]);

  // ── Drag-over highlight / drop apply.
  useEffect(() => {
    if (!editMode || !canvasRoot) return;

    function nearestIcon(x: number, y: number): Hover | null {
      const el = document.elementFromPoint(x, y) as Element | null;
      const svg = el?.closest('[data-pl-icon-original]') as HTMLElement | null;
      if (!svg || !canvasRoot?.contains(svg)) return null;
      return {
        el: svg,
        rect: svg.getBoundingClientRect(),
        originalName: svg.getAttribute('data-pl-icon-original') ?? '',
        currentName: svg.getAttribute('data-pl-icon-name') ?? '',
      };
    }

    function isIconDrag(e: DragEvent): boolean {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      // Browsers expose types as a DOMStringList — both Array and
      // for-of work but `.includes` is the cleanest read.
      for (let i = 0; i < types.length; i++) {
        if (types[i] === DRAG_MIME) return true;
      }
      return false;
    }

    function onDragOver(e: DragEvent) {
      if (!isIconDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const next = nearestIcon(e.clientX, e.clientY);
      if (!next) {
        setHover(null);
        return;
      }
      // Only re-set state when the actual target changed — avoids
      // a re-render on every mousemove during drag.
      setHover((prev) =>
        prev && prev.el === next.el && prev.rect.top === next.rect.top ? prev : next,
      );
    }

    function onDragLeave(e: DragEvent) {
      // Real "left the canvas" fires on relatedTarget === null.
      if (!e.relatedTarget) setHover(null);
    }

    function onDrop(e: DragEvent) {
      if (!isIconDrag(e)) return;
      e.preventDefault();
      const replacement = e.dataTransfer?.getData(DRAG_MIME) ?? '';
      const target = nearestIcon(e.clientX, e.clientY);
      if (!replacement || !target || !onEditField) {
        setHover(null);
        return;
      }
      // Apply the override.
      onEditField((m) => {
        const cur = (m as unknown as { iconOverrides?: Record<string, string> }).iconOverrides ?? {};
        return { ...m, iconOverrides: { ...cur, [target.originalName]: replacement } } as StoryManifest;
      });
      // Briefly flash a "Replaced" pill so the host gets
      // confirmation feedback before the next render.
      setDropping({ replacement });
      window.setTimeout(() => setDropping(null), 1200);
      setHover(null);
    }

    canvasRoot.addEventListener('dragover', onDragOver);
    canvasRoot.addEventListener('dragleave', onDragLeave);
    canvasRoot.addEventListener('drop', onDrop);
    return () => {
      canvasRoot.removeEventListener('dragover', onDragOver);
      canvasRoot.removeEventListener('dragleave', onDragLeave);
      canvasRoot.removeEventListener('drop', onDrop);
    };
  }, [editMode, canvasRoot, onEditField]);

  if (!editMode || !hover) {
    // Even when no hover target, render the dropping flash
    // so it lives long enough to fade out.
    if (dropping) return <DropFlash name={dropping.replacement} />;
    return null;
  }

  // Halo + "Drop to replace" pill positioned over the targeted
  // icon. Pointer-events: none so the drop event still reaches
  // the canvas underneath.
  const padding = 8;
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: hover.rect.left - padding,
          top: hover.rect.top - padding,
          width: hover.rect.width + padding * 2,
          height: hover.rect.height + padding * 2,
          borderRadius: 12,
          border: '2px dashed var(--peach-ink, #C6703D)',
          background: 'rgba(198,112,61,0.08)',
          boxShadow: '0 0 0 6px rgba(198,112,61,0.10)',
          pointerEvents: 'none',
          zIndex: 9000,
          transition: 'left 90ms linear, top 90ms linear, width 90ms linear, height 90ms linear',
          animation: 'pl-icon-pulse 1.2s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: hover.rect.left + hover.rect.width / 2,
          top: hover.rect.bottom + padding + 6,
          transform: 'translateX(-50%)',
          padding: '6px 10px',
          background: 'var(--ink, #0E0D0B)',
          color: 'var(--cream, #F5EFE2)',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 16px rgba(14,13,11,0.32)',
          pointerEvents: 'none',
          zIndex: 9001,
        }}
      >
        Drop to replace <span style={{ opacity: 0.7 }}>↦</span>{' '}
        <span style={{ color: 'var(--peach-ink, #C6703D)' }}>{hover.currentName}</span>
      </div>
      <style jsx global>{`
        @keyframes pl-icon-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(198,112,61,0.10); }
          50%      { box-shadow: 0 0 0 10px rgba(198,112,61,0.18); }
        }
      `}</style>
    </>
  );
}

function DropFlash({ name }: { name: string }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 88,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        background: 'var(--ink, #0E0D0B)',
        color: 'var(--cream, #F5EFE2)',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--font-ui)',
        boxShadow: '0 12px 28px rgba(14,13,11,0.36)',
        zIndex: 9002,
        animation: 'pl-icon-flash 1200ms ease-out',
        pointerEvents: 'none',
      }}
    >
      Replaced with <span style={{ color: 'var(--peach-ink, #C6703D)' }}>{name}</span>
      <style jsx global>{`
        @keyframes pl-icon-flash {
          0%   { opacity: 0; transform: translate(-50%, 6px); }
          15%  { opacity: 1; transform: translate(-50%, 0); }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
