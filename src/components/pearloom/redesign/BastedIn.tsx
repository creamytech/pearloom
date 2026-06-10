'use client';

/* ════════════════════════════════════════════════════════════════
   BASTED IN — "From Pear, while you were away."

   The quiet card that surfaces Pear's bastings (bastings.ts) when
   the editor opens. Hovering a stitch threads the loom FX to the
   section it would land in; SET keeps it (undoable, with the
   weave-settle); PULL THE THREAD unravels it away for good.
   Dismissed + set stitches persist per site so the card never
   nags. Renders nothing when there's nothing worth offering.
   ════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Pear } from '../motifs';
import { deriveBastings, pullThread, type Basting } from './bastings';
import { fireUndoable } from './UndoToast';
import { pearWorking } from './PearLoomFx';

export function BastedIn({
  manifest,
  siteSlug,
  onApply,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  onApply: (next: StoryManifest) => void;
}) {
  /* Derived once per editor open — the card describes the site as
     Pear found it, not a live-updating todo list. */
  const [initial] = useState(() => manifest);
  const derived = useMemo(() => deriveBastings(initial, siteSlug), [initial, siteSlug]);
  const [open, setOpen] = useState(true);
  const [items, setItems] = useState<Basting[]>(derived);

  /* Gentle entrance after the editor settles. */
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 1400);
    return () => window.clearTimeout(t);
  }, []);

  if (!open || items.length === 0) return null;

  const set = (b: Basting) => {
    const before = manifest;
    onApply(b.apply(manifest));
    pearWorking('done', b.section);
    fireUndoable(`${b.label} — set`, () => onApply(before));
    pullThread(siteSlug, b.id); // set stitches don't re-offer
    setItems((prev) => prev.filter((x) => x.id !== b.id));
  };
  const pull = (b: Basting) => {
    pullThread(siteSlug, b.id);
    pearWorking('error', b.section);
    setItems((prev) => prev.filter((x) => x.id !== b.id));
  };

  return (
    <aside
      aria-label="From Pear, while you were away"
      style={{
        position: 'fixed',
        left: 18,
        bottom: 18,
        zIndex: 120,
        width: 300,
        maxWidth: 'calc(100vw - 36px)',
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--line, #D8CFB8)',
        borderRadius: 16,
        boxShadow: '0 18px 44px -18px rgba(14,13,11,0.3)',
        padding: '14px 14px 10px',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 480ms var(--pl-ease-out, ease-out), transform 480ms var(--pl-ease-out, ease-out)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Pear size={18} tone="sage" shadow={false} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          While you were away
        </span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setOpen(false)}
          style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((b) => (
          <div
            key={b.id}
            onMouseEnter={() => pearWorking('start', b.section)}
            onMouseLeave={() => pearWorking('error', b.section)}
            style={{
              padding: '9px 10px',
              borderRadius: 11,
              background: 'var(--sage-tint, rgba(122,138,79,0.10))',
              border: '1px dashed var(--sage, #7A8A4F)',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{b.label}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>{b.detail}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => set(b)}
                style={{
                  padding: '4px 12px', borderRadius: 999, border: 'none',
                  background: 'var(--sage-deep, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Set the stitch
              </button>
              <button
                type="button"
                onClick={() => pull(b)}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: '1px solid var(--line, #D8CFB8)', background: 'transparent',
                  color: 'var(--ink-muted)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Pull the thread
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
