'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ScopeBubble.tsx
// Smart click scope bubbling — press Escape while inside an
// editable field to progressively zoom out:
//
//   field (caret) → block ([data-block-id])
//                 → section ([data-pe-section])
//                 → cleared
//
// Each level draws a visible outline around the current scope
// and a small label pill naming what's selected. Enter drills
// back in (places the caret into the first editable child).
//
// The component is passive — it does not intercept normal clicks,
// only Escape / Enter. Clicking anywhere in an editable region
// resets scope to "field".
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

type Scope = 'field' | 'block' | 'section' | null;

interface ScopeState {
  level: Scope;
  el: HTMLElement | null;
  rect: DOMRect | null;
  label: string;
}

const INITIAL: ScopeState = { level: null, el: null, rect: null, label: '' };

// Human-friendly label for a block / section element.
function labelFor(el: HTMLElement, level: Scope): string {
  if (!level) return '';
  if (level === 'block') {
    const t = el.getAttribute('data-pe-section') || el.getAttribute('data-block-type') || 'block';
    return `${t} block`;
  }
  if (level === 'section') {
    const t = el.getAttribute('data-pe-section') || 'section';
    return `${t} section`;
  }
  return '';
}

export function ScopeBubble() {
  const [scope, setScope] = useState<ScopeState>(INITIAL);
  const scopeRef = useRef(scope);
  useEffect(() => { scopeRef.current = scope; }, [scope]);

  // ── Keep rect up-to-date on scroll / resize ──────────────
  useEffect(() => {
    if (!scope.el) return;
    const update = () => {
      if (!scope.el) return;
      setScope(s => ({ ...s, rect: s.el?.getBoundingClientRect() ?? null }));
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [scope.el]);

  // ── Esc to bubble up; plain click in a field resets ─────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const cur = scopeRef.current;
      // Step 1: inside a focused field → bubble to block.
      const active = document.activeElement as HTMLElement | null;
      const inEditable = active?.closest?.('[data-pe-editable="true"]');
      if (cur.level === null && inEditable) {
        const block = inEditable.closest<HTMLElement>('[data-block-id]');
        if (block) {
          e.preventDefault();
          (active as HTMLElement).blur();
          const r = block.getBoundingClientRect();
          setScope({ level: 'block', el: block, rect: r, label: labelFor(block, 'block') });
          return;
        }
      }
      // Step 2: block → section.
      if (cur.level === 'block' && cur.el) {
        const section = cur.el.closest<HTMLElement>('[data-pe-section]')
          || cur.el.parentElement?.closest<HTMLElement>('[data-pe-section]')
          || null;
        if (section && section !== cur.el) {
          e.preventDefault();
          const r = section.getBoundingClientRect();
          setScope({ level: 'section', el: section, rect: r, label: labelFor(section, 'section') });
          return;
        }
      }
      // Step 3: section → cleared.
      if (cur.level !== null) {
        e.preventDefault();
        setScope(INITIAL);
      }
    };

    const onClick = (e: MouseEvent) => {
      const cur = scopeRef.current;
      if (cur.level === null) return;
      const target = e.target as HTMLElement | null;
      // Clicking inside the scope's own element refines; clicking outside clears.
      if (cur.el && cur.el.contains(target)) {
        setScope(INITIAL);
      } else {
        setScope(INITIAL);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  if (typeof document === 'undefined' || !scope.rect || scope.level === null) return null;

  const color = scope.level === 'block' ? 'rgba(110,140,92,0.9)' : 'rgba(141,171,230,0.9)';
  const fill  = scope.level === 'block' ? 'rgba(110,140,92,0.08)' : 'rgba(141,171,230,0.08)';

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={`${scope.level}-${scope.el === null ? 0 : 1}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        aria-hidden
        style={{
          position: 'fixed',
          top: scope.rect.top,
          left: scope.rect.left,
          width: scope.rect.width,
          height: scope.rect.height,
          border: `2px solid ${color}`,
          borderRadius: 4,
          background: fill,
          pointerEvents: 'none',
          zIndex: 180,
          boxShadow: `0 0 0 1px ${color} inset`,
        }}
      >
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            top: -26,
            left: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 999,
            background: '#18181B',
            color: '#FAF7F2',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {scope.label}
          <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.55)', textTransform: 'none', letterSpacing: 0 }}>
            Esc to zoom out
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
