'use client';

// ─────────────────────────────────────────────────────────────
// edition-dividers — the rule between sections that gives an
// Edition its visual rhythm. Picked by the active Edition's
// `divider` field; mounted in SiteV8Renderer via
// EditionDivider which dispatches by style id.
//
// Each divider is full-width, ~24-72px tall depending on style,
// and is decorative. They should be the only chrome between
// sections so consecutive sections feel like consecutive
// chapters of the same edition.
// ─────────────────────────────────────────────────────────────

import type { DividerStyle } from '@/lib/site-editions/types';

// ── Almanac — Single hairline thread ─────────────────────────
function ThreadDivider() {
  return (
    <div
      aria-hidden
      style={{
        margin: 'clamp(40px, 6vw, 64px) auto',
        width: 'min(640px, 80%)',
        height: 1,
        background:
          'linear-gradient(to right, transparent 0%, var(--ink-muted, #6F6557) 30%, var(--ink-muted, #6F6557) 70%, transparent 100%)',
        opacity: 0.35,
      }}
    />
  );
}

// ── Cinema — Sprocket-style row ──────────────────────────────
function SprocketDivider() {
  return (
    <div
      aria-hidden
      style={{
        margin: 'clamp(48px, 7vw, 72px) auto',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 4,
            background: 'var(--ink, #0E0D0B)',
            opacity: 0.32,
          }}
        />
      ))}
    </div>
  );
}

// ── Postcard Box — Thread-stitch dashed ──────────────────────
function StitchDivider() {
  return (
    <div
      aria-hidden
      style={{
        margin: 'clamp(40px, 6vw, 64px) auto',
        width: 'min(720px, 88%)',
        height: 1,
        backgroundImage:
          'repeating-linear-gradient(to right, var(--peach-ink, #C6703D) 0, var(--peach-ink, #C6703D) 6px, transparent 6px, transparent 12px)',
        opacity: 0.55,
      }}
    />
  );
}

// ── Linen Folder — Centered gold hairline ────────────────────
function GoldHairlineDivider() {
  return (
    <div
      aria-hidden
      style={{
        margin: 'clamp(48px, 7vw, 72px) auto',
        width: 80,
        height: 1,
        background: 'var(--gold, #B89244)',
      }}
    />
  );
}

// ── Quiet — Whitespace only ──────────────────────────────────
function WhitespaceDivider() {
  return (
    <div
      aria-hidden
      style={{
        margin: 'clamp(64px, 9vw, 96px) auto',
        height: 0,
      }}
    />
  );
}

// ── Dispatcher ───────────────────────────────────────────────
const DIVIDERS: Record<DividerStyle, () => React.ReactElement> = {
  thread: ThreadDivider,
  sprocket: SprocketDivider,
  stitch: StitchDivider,
  'gold-hairline': GoldHairlineDivider,
  whitespace: WhitespaceDivider,
};

export function EditionDivider({ style }: { style: DividerStyle }) {
  const Component = DIVIDERS[style] ?? DIVIDERS.thread;
  return <Component />;
}
