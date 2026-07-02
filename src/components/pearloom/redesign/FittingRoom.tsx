'use client';

/* ════════════════════════════════════════════════════════════════
   THE FITTING ROOM — drape a proposed look over the live site.

   For whole-site AI proposals (Pear advisor patches, big theme
   asks) Pear doesn't apply — she DRAPES. The proposed manifest
   renders as a full live layer over the current canvas, and the
   host gets a literal thread to pull: a scrubber that crossfades
   current ↔ proposed across the whole page. Keep sets the stitch;
   Release lets the drape fall away. Nothing touches the manifest
   until Keep.

   Trigger:
     window.dispatchEvent(new CustomEvent('pearloom:drape', {
       detail: { proposed: StoryManifest, label?: string,
                 onKeep?: () => void }   // ran after the apply
     }))

   Mounted inside the editor's device frame so the drape aligns
   1:1 with the canvas. The host's apply callback comes via props
   (the bridge's setManifest path) so Keep is undoable like any
   other edit.
   ════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { ThemedSite } from './ThemedSite';
import { fireUndoable } from './UndoToast';
import { pearWorking } from './PearLoomFx';

export const DRAPE_EVENT = 'pearloom:drape';

export function drapeProposal(proposed: StoryManifest, label?: string, onKeep?: () => void) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(DRAPE_EVENT, { detail: { proposed, label, onKeep } }));
  } catch { /* draping must never break the propose path */ }
}

interface DrapeState {
  proposed: StoryManifest;
  label: string;
  onKeep?: () => void;
}

export function FittingRoom({
  manifest,
  names,
  forceMobile,
  onApply,
}: {
  manifest: StoryManifest;
  names: [string, string];
  forceMobile?: boolean;
  onApply: (next: StoryManifest) => void;
}) {
  const [drape, setDrape] = useState<DrapeState | null>(null);
  const [mix, setMix] = useState(0); // 0 = current · 1 = proposed
  const manifestRef = useRef(manifest);
  const onApplyRef = useRef(onApply);
  useEffect(() => { manifestRef.current = manifest; onApplyRef.current = onApply; }, [manifest, onApply]);

  useEffect(() => {
    const onDrape = (e: Event) => {
      const { proposed, label, onKeep } = (e as CustomEvent).detail ?? {};
      if (!proposed) return;
      // Tell the dispatcher a fitting room took the proposal (the
      // advisor falls back to direct-apply when nobody answers).
      e.preventDefault();
      setDrape({ proposed, label: label || 'Pear’s proposal', onKeep });
      setMix(0);
      // Drape falls in: animate the crossfade up so the host SEES
      // the change arrive, then owns the scrubber.
      requestAnimationFrame(() => requestAnimationFrame(() => setMix(1)));
    };
    window.addEventListener(DRAPE_EVENT, onDrape);
    return () => window.removeEventListener(DRAPE_EVENT, onDrape);
  }, []);

  const release = useCallback(() => {
    setMix(0);
    window.setTimeout(() => setDrape(null), 380);
  }, []);

  // Esc releases the drape.
  useEffect(() => {
    if (!drape) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') release(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drape, release]);

  if (!drape) return null;

  const keep = () => {
    const previous = manifestRef.current;
    onApplyRef.current(drape.proposed);
    drape.onKeep?.();
    pearWorking('done', undefined, 'theme');
    fireUndoable(`${drape.label} — set`, () => onApplyRef.current(previous));
    setDrape(null);
  };

  return (
    <>
      {/* The drape — a full live render of the proposal, crossfaded
          by the scrubber. pointer-events off so the host can still
          scroll the canvas underneath. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          opacity: mix,
          transition: 'opacity 420ms var(--pl-ease-out, ease-out)',
          pointerEvents: 'none',
          overflow: 'hidden',
          background: 'var(--paper)',
        }}
      >
        <ThemedSite manifest={drape.proposed} names={names} forceMobile={forceMobile} />
      </div>

      {/* The thread to pull — fixed scrubber bar. */}
      <div
        role="dialog"
        aria-label="Pear’s proposal — compare and decide"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 22,
          transform: 'translateX(-50%)',
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 999,
          background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          boxShadow: 'var(--pl-glass-shadow-lg)',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
          {drape.label}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', flexShrink: 0 }}>now</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(mix * 100)}
          onChange={(e) => setMix(Number(e.target.value) / 100)}
          aria-label="Crossfade between your current site and Pear’s proposal"
          style={{ width: 130, accentColor: 'var(--sage-deep, #5C6B3F)' }}
        />
        <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', flexShrink: 0 }}>Pear’s</span>
        <button
          type="button"
          onClick={keep}
          style={{
            padding: '6px 14px', borderRadius: 999, border: 'none',
            background: 'var(--sage-deep, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={release}
          style={{
            padding: '6px 12px', borderRadius: 999,
            border: '1px solid var(--line, #D8CFB8)', background: 'transparent',
            color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          Release
        </button>
      </div>
    </>
  );
}
