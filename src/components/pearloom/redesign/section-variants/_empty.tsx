'use client';

/* Shared editable-only empty-state for the CORE sections (gallery,
   countdown, map, music, …). The Event-OS block sections keep their
   own <BlockEmpty /> in blocks/_shared.tsx; this is its sibling for
   the sections that live inside ThemedSite.

   Contract (mirrors BlockEmpty + the honesty rule, CLAUDE-DESIGN §7):
     - Callers MUST gate mounting on `editable`. Published + wizard
       demoCopy paths never render this — guests never see
       scaffolding, and the demo pressings keep their dressed preview.
     - Reads only --t-* site tokens, so it is legible on EVERY site
       theme (cream, editorial, midnight…). No hardcoded pastels.
     - The enclosing TSection already opens the section's panel on
       tap; `onAdd` is an optional *direct* affordance (e.g. open the
       photo picker) layered on top of that. */

import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../../motifs';

export function SectionEmpty({
  eyebrow,
  title = 'Nothing here yet.',
  hint,
  icon,
  onAdd,
  addLabel,
  pad = 1,
}: {
  /** Uppercase mono eyebrow — the section's plain-word name. */
  eyebrow: string;
  /** Display line. Defaults to the BRAND §7 empty-state key; pass a
   *  section-specific line where that reads better. */
  title?: string;
  /** One plain-word instruction line. */
  hint: string;
  /** Optional glyph name from the motifs Icon set (e.g. 'camera'). */
  icon?: string;
  /** Optional direct action (e.g. open the photo picker). */
  onAdd?: () => void;
  addLabel?: string;
  /** Density multiplier (ThemedSite ctx.pad). */
  pad?: number;
}): ReactNode {
  return (
    <div style={{ padding: `${48 * pad}px clamp(16px, 4vw, 32px)`, background: 'var(--t-paper)' }}>
      <div
        className="pl8-card"
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '34px 26px',
          borderRadius: 'var(--t-radius-lg, 14px)',
          border: '1.5px dashed var(--t-line)',
          background: 'var(--t-card)',
          textAlign: 'center',
          color: 'var(--t-ink-muted)',
        }}
      >
        {icon && (
          <div
            aria-hidden
            style={{
              width: 46, height: 46, margin: '0 auto 14px',
              borderRadius: '50%',
              background: 'var(--t-accent-bg, var(--t-section))',
              display: 'grid', placeItems: 'center',
            }}
          >
            <Icon name={icon} size={20} color="var(--t-accent-ink, var(--t-ink))" />
          </div>
        )}
        <div
          style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: 'var(--t-eyebrow-ls, 0.18em)',
            textTransform: 'uppercase',
            color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'var(--t-display)', fontStyle: 'italic',
            fontSize: 22, lineHeight: 1.2, color: 'var(--t-ink-soft)',
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--t-ink-muted)' }}>
          {hint}
        </div>
        {onAdd && addLabel && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="pl-hit44"
            style={{
              marginTop: 16,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 999,
              background: 'var(--t-ink)', color: 'var(--t-rsvp-ink, var(--t-paper))',
              border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 300 }}>+</span>
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* Dynamic-import loading fallback for the code-split section
   variants. next/dynamic renders null while a chunk streams in — on
   a slow phone that paints a beat of bare section texture. This
   paints the section's paper with a woven loader + "Threading…" so
   the canvas never flashes an anonymous void. Published HTML is
   SSR'd (the real markup ships in the first paint), so guests
   effectively never see this — it's an editor-canvas comfort. */
export function SectionChunkLoading(): ReactNode {
  const wrap: CSSProperties = {
    minHeight: 200,
    display: 'grid',
    placeItems: 'center',
    /* Transparent — inherits whichever section surface (paper /
       section / rsvp) the ThemedSite wrapper already painted, so the
       loader never flashes a mismatched ground. */
    background: 'transparent',
    padding: '32px 16px',
  };
  /* Two-strand thread (olive + gold, in --t-* so it reads on any
     site theme), stroke-dashoffset animated by the GLOBAL
     `pl-thread-dash` keyframe (globals.css) so this stays styled-jsx
     free — WeaveLoader's <style jsx> leaks a `jsx` attribute under
     jsdom renderToString and trips the hydration smoke tests. */
  return (
    <div style={wrap} aria-label="Threading" role="status">
      <div style={{ display: 'grid', placeItems: 'center', gap: 10 }}>
        <svg width="34" height="18" viewBox="0 0 34 18" fill="none" aria-hidden>
          <path d="M1 9 C 9 1, 17 17, 25 9 S 33 1, 33 9" stroke="var(--t-accent)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="6 6" style={{ animation: 'pl-thread-dash 1.1s linear infinite' }} />
          <path d="M1 9 C 9 17, 17 1, 25 9 S 33 17, 33 9" stroke="var(--t-gold)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="6 6" style={{ animation: 'pl-thread-dash 1.1s linear infinite reverse' }} />
        </svg>
        <span style={{ fontFamily: 'var(--t-mono, ui-monospace, monospace)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>
          One moment…
        </span>
      </div>
    </div>
  );
}
