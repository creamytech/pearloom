'use client';

// Visual harness for the living-background shader wallpapers. Mirrors
// the v2 showcase (handoff-v2/ui_kits/wallpapers): a full-bleed canvas
// with a switcher + the catalog copy. Drag / click to play.

import { useState } from 'react';
import { LivingBackground } from '@/components/pearloom/site/LivingBackground';
import { WALLPAPERS } from '@/lib/site-look/wallpapers';

export function DevWallpapersClient() {
  const [id, setId] = useState<string>('silk');
  const cur = WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', fontFamily: 'var(--font-ui, system-ui)' }}>
      <LivingBackground id={id} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100dvh', padding: 28, pointerEvents: 'none' }}>
        <div
          style={{
            alignSelf: 'flex-start',
            maxWidth: 420,
            background: 'var(--pl-glass, rgba(251,247,238,0.82))',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--pl-glass-border, rgba(14,13,11,0.1))',
            borderRadius: 16,
            padding: '18px 20px',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)' }}>
            Living background · {cur.occ}
          </div>
          <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 30, color: 'var(--ink, #0E0D0B)', margin: '4px 0 6px' }}>
            {cur.name}{cur.free ? <span style={{ fontSize: 13, color: 'var(--sage-deep, #5C6B3F)', marginLeft: 10 }}>· Free</span> : <span style={{ fontSize: 13, color: 'var(--ink-muted)', marginLeft: 10 }}>· {cur.price}</span>}
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft, #3A332C)', margin: 0 }}>{cur.desc}</p>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', pointerEvents: 'auto' }}>
          {WALLPAPERS.map((w) => {
            const on = w.id === id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setId(w.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: on ? '2px solid var(--cream, #FBF7EE)' : '1px solid rgba(255,255,255,0.5)',
                  background: 'rgba(14,13,11,0.45)',
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span aria-hidden style={{ width: 16, height: 16, borderRadius: 5, background: w.grad, flexShrink: 0 }} />
                {w.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
