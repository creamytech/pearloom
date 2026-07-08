'use client';

/* ════════════════════════════════════════════════════════════════
   BASTED IN — "From Pear, while you were away."

   Pear's bastings (bastings.ts), surfaced INLINE in the section
   rail right under "＋ Add section" — her suggestions are section
   suggestions, so they live where sections are managed. (History:
   born as a floating bottom-left card, docked to a pill 2026-07-08
   AM, moved into the rail 2026-07-08 PM — the floating layer kept
   covering rail rows and read as a popup, not a tool.)

   "Add it" keeps a stitch (undoable, with the weave-settle landing
   on the section); "No thanks" pulls it for good. Dismissed + set
   stitches persist per site so the card never nags. Renders
   nothing when there's nothing worth offering.

   The loom-thread FX deliberately does NOT fire on hover here —
   a gold thread shooting across the canvas for a mouse-over read
   as "something is happening" when nothing was (2026-06-10).
   ════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
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
  const [items, setItems] = useState<Basting[]>(derived);
  /* The story basting awaits a model call — track which stitch is
     in flight so its button can read "Threading…" instead of
     freezing silently. */
  const [busyId, setBusyId] = useState<string | null>(null);

  /* THE RECEIPTS — first open after generation, Pear shows what she
     wove in from the host's own story (factSheet.anchors, stamped
     by the generation route). Once per site; explaining her choices
     is what turns "nice template" into "she listened". */
  const receipts = useMemo(() => {
    if (typeof window === 'undefined') return [] as string[];
    const key = `pl-receipts-shown:${siteSlug}`;
    try {
      if (window.localStorage.getItem(key)) return [];
      const fs = (initial as unknown as { factSheet?: { anchors?: string[] } }).factSheet;
      const list = (fs?.anchors ?? []).filter(Boolean).slice(0, 3);
      if (list.length) window.localStorage.setItem(key, '1');
      return list;
    } catch { return []; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSlug]);

  if (items.length === 0 && receipts.length === 0) return null;

  const set = async (b: Basting) => {
    const before = manifest;
    let next: StoryManifest | null;
    if (b.applyAsync) {
      setBusyId(b.id);
      try {
        next = await b.applyAsync(manifest);
      } finally {
        setBusyId(null);
      }
      if (!next) {
        /* Draft came back empty (keyless deploy / model hiccup) —
           leave the card up so the host can retry or pull it. */
        return;
      }
    } else {
      next = b.apply(manifest);
    }
    onApply(next);
    pearWorking('done', b.section);
    fireUndoable(`${b.label} — added`, () => onApply(before));
    pullThread(siteSlug, b.id); // set stitches don't re-offer
    setItems((prev) => prev.filter((x) => x.id !== b.id));
  };
  const pull = (b: Basting) => {
    pullThread(siteSlug, b.id);
    setItems((prev) => prev.filter((x) => x.id !== b.id));
  };

  return (
    <div
      aria-label="From Pear, while you were away"
      style={{
        marginTop: 10,
        padding: '10px 10px 8px',
        borderRadius: 12,
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--line-soft, #E8E0CC)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Pear size={15} tone="sage" shadow={false} />
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          Pear suggests
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {receipts.length > 0 && (
          <div
            style={{
              padding: '8px 9px',
              borderRadius: 10,
              background: 'var(--gold-mist, rgba(193,154,75,0.10))',
              border: '1px solid var(--gold-line, #D0B070)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 5 }}>
              I wove your story in — look for these:
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {receipts.map((r) => (
                <div key={r} style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                  <span aria-hidden style={{ color: 'var(--pl-gold, #C19A4B)' }}>✦</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {items.map((b) => (
          <div
            key={b.id}
            style={{
              padding: '8px 9px',
              borderRadius: 10,
              background: 'var(--sage-tint, rgba(122,138,79,0.10))',
              border: '1px dashed var(--sage, #7A8A4F)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{b.label}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 7 }}>{b.detail}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => { void set(b); }}
                disabled={busyId === b.id}
                style={{
                  padding: '4px 12px', borderRadius: 999, border: 'none',
                  background: 'var(--sage-deep, #5C6B3F)', color: 'var(--cream, #F5EFE2)',
                  fontSize: 11, fontWeight: 700, cursor: busyId === b.id ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: busyId === b.id ? 0.7 : 1,
                }}
              >
                {busyId === b.id ? 'Threading…' : 'Add it'}
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
                No thanks
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
