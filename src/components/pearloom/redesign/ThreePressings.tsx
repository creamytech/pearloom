'use client';

/* ════════════════════════════════════════════════════════════════
   THREE PRESSINGS — Pear's contact sheet.

   For taste questions, words are the wrong medium. When the host
   asks for "three styles", Pear lays out three LIVE miniature
   canvases side by side — real renders of the real site with each
   variation applied, scrolled to the section in question. Tap one
   to drape it over the site in the Fitting Room (nothing applies
   until Keep).

   Trigger:
     window.dispatchEvent(new CustomEvent('pearloom:pressings', {
       detail: { section: 'hero',
                 variants: [{ label, manifest }, …] }
     }))
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from './ThemedSite';
import { drapeProposal } from './FittingRoom';

export const PRESSINGS_EVENT = 'pearloom:pressings';

export interface Pressing {
  label: string;
  manifest: StoryManifest;
}

export function showPressings(section: string, variants: Pressing[]) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(PRESSINGS_EVENT, { detail: { section, variants } }));
  } catch { /* never break the propose path */ }
}

const MINI_W = 348;       // card window width
const SITE_W = 1100;      // ThemedSite desktop width
const SCALE = MINI_W / SITE_W;

/* One miniature — a real ThemedSite scaled down and scrolled so
   the working section sits in the window. */
function Mini({ pressing, section, names, onPick }: {
  pressing: Pressing;
  section: string;
  names: [string, string];
  onPick: () => void;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    // After render, find the section inside THIS mini and slide the
    // window to it. Hero sits at 0 so the common case is a no-op.
    const t = window.setTimeout(() => {
      const root = innerRef.current;
      if (!root) return;
      const el = root.querySelector(`#${CSS.escape(section)}`) as HTMLElement | null;
      if (!el) return;
      // offsetTop chain relative to the unscaled inner document.
      let y = 0; let cur: HTMLElement | null = el;
      while (cur && cur !== root) { y += cur.offsetTop; cur = cur.offsetParent as HTMLElement | null; }
      setShift(Math.max(0, y - 24));
    }, 60);
    return () => window.clearTimeout(t);
  }, [section]);

  return (
    <button
      type="button"
      onClick={onPick}
      className="pl-rd-pressing"
      style={{
        width: MINI_W,
        borderRadius: 14,
        border: '1px solid var(--line, #D8CFB8)',
        background: 'var(--card, #FBF7EE)',
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px -18px rgba(14,13,11,0.3)',
      }}
    >
      <div style={{ height: 300, overflow: 'hidden', position: 'relative', pointerEvents: 'none', background: 'var(--paper)' }}>
        <div
          ref={innerRef}
          style={{
            width: SITE_W,
            transform: `scale(${SCALE}) translateY(-${shift}px)`,
            transformOrigin: 'top left',
            transition: 'transform 360ms var(--pl-ease-out, ease-out)',
          }}
        >
          <ThemedSite manifest={pressing.manifest} names={names} />
        </div>
        {/* paper fade at the window's foot */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, background: 'linear-gradient(to bottom, transparent, var(--card, #FBF7EE))' }} />
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{pressing.label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage-deep, #5C6B3F)' }}>Drape it →</span>
      </div>
    </button>
  );
}

export function ThreePressings({ names }: { names: [string, string] }) {
  const [state, setState] = useState<{ section: string; variants: Pressing[] } | null>(null);

  useEffect(() => {
    const onShow = (e: Event) => {
      const { section, variants } = (e as CustomEvent).detail ?? {};
      if (!Array.isArray(variants) || variants.length === 0) return;
      setState({ section: section || 'hero', variants: variants.slice(0, 3) });
    };
    window.addEventListener(PRESSINGS_EVENT, onShow);
    return () => window.removeEventListener(PRESSINGS_EVENT, onShow);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setState(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  if (!state) return null;

  return (
    <div
      role="dialog"
      aria-label="Three pressings from Pear"
      onClick={() => setState(null)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        background: 'rgba(14,13,11,0.45)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--cream, #F5EFE2)', opacity: 0.7, marginBottom: 6 }}>
            From Pear
          </div>
          <div style={{ fontFamily: 'var(--font-display, serif)', fontSize: 26, color: 'var(--cream, #F5EFE2)' }}>
            Three pressings — <em style={{ fontStyle: 'italic' }}>pick the one that feels right.</em>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', maxHeight: '70vh', overflowY: 'auto', padding: 4 }}>
          {state.variants.map((p) => (
            <Mini
              key={p.label}
              pressing={p}
              section={state.section}
              names={names}
              onPick={() => {
                setState(null);
                drapeProposal(p.manifest, p.label);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setState(null)}
          style={{
            marginTop: 16, padding: '8px 18px', borderRadius: 999,
            border: '1px solid rgba(245,239,226,0.4)', background: 'transparent',
            color: 'var(--cream, #F5EFE2)', fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          None of these — keep mine
        </button>
      </div>
    </div>
  );
}
