'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/MultiFieldSelect.tsx
// Shift/Cmd-click multiple editable text fields to select them,
// then apply a single action to all at once: clear, AI rewrite,
// bold/italic toggle. Extends the existing block multi-select
// down to the field level.
//
// Selection is DOM-based (we track [data-pe-path] values), which
// means it naturally clears when selected fields unmount.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eraser, Sparkles, Bold, Italic, X } from 'lucide-react';

const HIGHLIGHT_CLASS = 'pl-multi-field-selected';
const HIGHLIGHT_STYLE_ID = 'pl-multi-field-style';

// Injected once on mount so selected fields get a visible outline.
function ensureHighlightStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid rgba(110,140,92,0.55) !important;
      outline-offset: 2px !important;
      border-radius: 2px !important;
      transition: outline-color 0.15s ease;
    }
  `;
  document.head.appendChild(style);
}

export function MultiFieldSelect() {
  // Key each field by data-pe-path (stable) when present, else by a synthetic id.
  const [selected, setSelected] = useState<Map<string, HTMLElement>>(new Map());
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  // ── One-time style injection ─────────────────────────────
  useEffect(() => { ensureHighlightStyle(); }, []);

  // ── Shift/Cmd-click adds to selection ────────────────────
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Only multi-select when a modifier is held. Regular click → clear.
      if (!(e.shiftKey || e.metaKey || e.ctrlKey)) {
        if (selected.size > 0) {
          const t = e.target as HTMLElement | null;
          // Keep selection alive if the click was on the action bar itself.
          if (!t?.closest('[data-pe-multi-field-bar]')) {
            clearSelection();
          }
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      const field = target?.closest<HTMLElement>('[data-pe-editable="true"]');
      if (!field) return;
      e.preventDefault();
      e.stopPropagation();
      const key = field.getAttribute('data-pe-path')
        || field.getAttribute('data-pe-field')
        || field.id
        || String(Array.from(document.querySelectorAll('[data-pe-editable="true"]')).indexOf(field));
      setSelected(prev => {
        const next = new Map(prev);
        if (next.has(key)) {
          const el = next.get(key);
          el?.classList.remove(HIGHLIGHT_CLASS);
          next.delete(key);
        } else {
          field.classList.add(HIGHLIGHT_CLASS);
          next.set(key, field);
        }
        return next;
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Position the action bar above the first selected field ──
  useEffect(() => {
    if (selected.size === 0) { setAnchor(null); return; }
    const update = () => {
      // Use the topmost selected field as the anchor.
      let best: { el: HTMLElement; top: number } | null = null;
      for (const el of selected.values()) {
        const r = el.getBoundingClientRect();
        if (!best || r.top < best.top) best = { el, top: r.top };
      }
      if (!best) { setAnchor(null); return; }
      const r = best.el.getBoundingClientRect();
      setAnchor({
        top: Math.max(12, r.top - 44),
        left: Math.max(80, Math.min(window.innerWidth - 80, r.left + r.width / 2)),
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [selected]);

  const clearSelection = useCallback(() => {
    selected.forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
    setSelected(new Map());
  }, [selected]);

  // ── Bulk actions ─────────────────────────────────────────
  const applyInputDispatch = useCallback(() => {
    // Fire a synthetic input event on each field so MutationObserver-based
    // autosave (in SiteRenderer) picks up the mutation.
    selected.forEach(el => {
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
  }, [selected]);

  const handleClear = useCallback(() => {
    selected.forEach(el => { el.textContent = ''; });
    applyInputDispatch();
    clearSelection();
  }, [selected, clearSelection, applyInputDispatch]);

  const handleToggleFormat = useCallback((cmd: 'bold' | 'italic') => {
    const sel = window.getSelection();
    selected.forEach(el => {
      // Place caret inside, select all its contents, run execCommand, then
      // restore collapsed selection so the field isn't left visibly selected.
      const range = document.createRange();
      range.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.execCommand(cmd);
    });
    sel?.removeAllRanges();
    applyInputDispatch();
  }, [selected, applyInputDispatch]);

  const handleAIRewrite = useCallback(() => {
    const paths = Array.from(selected.keys()).filter(k => k.startsWith('chapters.') || k.includes('.'));
    const previews = Array.from(selected.values())
      .map(el => `"${(el.textContent || '').slice(0, 60)}…"`)
      .slice(0, 3)
      .join(', ');
    window.dispatchEvent(new CustomEvent('pear-command', {
      detail: {
        prompt: `Rewrite these ${selected.size} fields with consistent tone and rhythm. Keep meaning intact. Fields include: ${previews}${paths.length ? ` (paths: ${paths.slice(0, 4).join(', ')})` : ''}.`,
      },
    }));
    clearSelection();
  }, [selected, clearSelection]);

  const count = selected.size;
  const bar = useMemo(() => {
    if (count < 2 || !anchor) return null;
    return (
      <motion.div
        data-pe-multi-field-bar="true"
        initial={{ opacity: 0, y: 4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: anchor.top,
          left: anchor.left,
          transform: 'translateX(-50%)',
          zIndex: 9990,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          borderRadius: 12,
          background: '#18181B',
          boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
          pointerEvents: 'auto',
        }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
          padding: '0 6px',
        }}>
          {count} fields
        </span>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)' }} />
        <BarBtn icon={Bold} label="Bold all" onClick={() => handleToggleFormat('bold')} />
        <BarBtn icon={Italic} label="Italic all" onClick={() => handleToggleFormat('italic')} />
        <BarBtn icon={Sparkles} label="AI rewrite all" onClick={handleAIRewrite} />
        <BarBtn icon={Eraser} label="Clear all" onClick={handleClear} />
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)' }} />
        <BarBtn icon={X} label="Cancel" onClick={clearSelection} />
      </motion.div>
    );
  }, [anchor, count, handleToggleFormat, handleAIRewrite, handleClear, clearSelection]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>{bar}</AnimatePresence>,
    document.body,
  );
}

function BarBtn({
  icon: Icon, label, onClick,
}: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 26, height: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 8,
        background: 'transparent',
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={12} />
    </button>
  );
}
