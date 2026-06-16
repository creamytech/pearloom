'use client';

// ─────────────────────────────────────────────────────────────
// CoEditHighlights — "Maya is editing this section" on the canvas.
//
// Each co-editor broadcasts the section they currently have open
// (useEditorCollab presence). We draw a colored outline + name tag
// around THAT section, measured from THIS browser's own DOM
// (`[data-section-id]` — the same hook the editor uses to jump to
// sections). Measuring locally means no cross-viewport coordinate
// math: every client frames the section in its own layout.
//
// Boxes are position:fixed at the section's viewport rect and
// re-measured on scroll / resize, hidden when the section scrolls
// out of view. Pointer-events:none so they never block editing.
// Honors prefers-reduced-motion (no transition).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { PlAvatar } from '../avatars';
import type { CollabPeer } from './useEditorCollab';

const TOPBAR_H = 56;

export function CoEditHighlights({ peers }: { peers: CollabPeer[] }) {
  const active = peers.filter((p) => p.section);
  const sig = active.map((p) => `${p.key}:${p.section}`).join(',');
  const [rects, setRects] = useState<Record<string, DOMRect>>({});

  useEffect(() => {
    if (active.length === 0) {
      setRects({});
      return;
    }
    let raf = 0;
    const measure = () => {
      const next: Record<string, DOMRect> = {};
      for (const p of active) {
        if (!p.section) continue;
        const el = document.querySelector<HTMLElement>(`[data-section-id="${p.section}"]`);
        if (el) next[p.key] = el.getBoundingClientRect();
      }
      setRects(next);
    };
    measure();
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    // Capture so we catch scrolls on the inner canvas container too.
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    // Slow poll catches layout shifts (sections added, images load).
    const iv = window.setInterval(measure, 350);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      window.clearInterval(iv);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (active.length === 0) return null;

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
      {active.map((p) => {
        const r = rects[p.key];
        if (!r) return null;
        // Hide when the section is scrolled out of the canvas band.
        if (r.bottom < TOPBAR_H + 8 || r.top > window.innerHeight - 8) return null;
        const tagTop = Math.max(r.top, TOPBAR_H + 4);
        const first = (p.name || p.email || 'A co-host').split(' ')[0];
        return (
          <div key={p.key}>
            {/* Section outline */}
            <div
              style={{
                position: 'fixed',
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                border: `2px solid ${p.color}`,
                borderRadius: 14,
                boxShadow: `0 0 0 4px ${p.color}1f`,
                transition: 'all 120ms cubic-bezier(0.16,1,0.3,1)',
                pointerEvents: 'none',
              }}
            />
            {/* Name tag pinned to the section's top-left */}
            <div
              style={{
                position: 'fixed',
                left: r.left + 8,
                top: tagTop - 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                height: 22,
                padding: '0 9px 0 4px',
                borderRadius: 999,
                background: p.color,
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-ui, sans-serif)',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  width: 16, height: 16, borderRadius: '50%', overflow: 'hidden',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.25)', flexShrink: 0,
                }}
              >
                {p.avatar ? <PlAvatar id={p.avatar} size={14} /> : first.charAt(0).toUpperCase()}
              </span>
              {first}
            </div>
          </div>
        );
      })}
      <style>{`@media (prefers-reduced-motion: reduce){div[style*="position: fixed"]{transition:none!important}}`}</style>
    </div>
  );
}

export default CoEditHighlights;
