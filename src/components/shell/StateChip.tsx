'use client';

// ─────────────────────────────────────────────────────────────
// StateChip — THE status chip for dashboard chrome (TASTE-PLAN
// T.1). State is shape + weight, not just a colored word:
//
//   now         ink-solid, reversed text — what's happening/active
//   good        sage tint — resolved-positive (attending, paid,
//               sent, approved, thanked)
//   waiting     quiet paper — pending, scheduled, considering
//   attention   peach tint — due soon, needs a look
//   info        lavender tint — maybe, booked, provenance notes
//   destructive plum — overdue, failed, flagged. Sparingly.
//   quiet       muted outline — declined, archived, not applicable
//
// Chips are for STATUS; the Badge atom stays for editorial
// CATEGORY labels (mono-caps). One recipe — surfaces stop
// improvising colored text. Tokens are the .pl8 aliases (theme-
// aware through --pl-*), with light-mode fallbacks for the rare
// mount outside the scope.
// ─────────────────────────────────────────────────────────────

import { CSSProperties, ReactNode } from 'react';

export type StateKind = 'now' | 'good' | 'waiting' | 'attention' | 'info' | 'destructive' | 'quiet';

const KINDS: Record<StateKind, { bg: string; fg: string; border: string }> = {
  now:         { bg: 'var(--ink, #0E0D0B)',                          fg: 'var(--cream, #F5EFE2)',                 border: 'transparent' },
  info:        { bg: 'var(--lavender-bg, #E8E0F0)',                  fg: 'var(--lavender-ink, #6B5784)',          border: 'transparent' },
  good:        { bg: 'var(--sage-tint, var(--sage-bg, #E3E8CD))',    fg: 'var(--sage-deep, #5C6B3F)',             border: 'transparent' },
  waiting:     { bg: 'var(--cream-2, #EFE9DA)',                      fg: 'var(--ink-soft, #4A4437)',              border: 'var(--line-soft, rgba(14,13,11,0.08))' },
  attention:   { bg: 'var(--peach-bg, #FBE8D6)',                     fg: 'var(--peach-ink, #9D5222)',             border: 'transparent' },
  destructive: { bg: 'var(--pl-plum-mist, rgba(122,45,45,0.10))',    fg: 'var(--pl-plum, #7A2D2D)',               border: 'transparent' },
  quiet:       { bg: 'transparent',                                   fg: 'var(--ink-muted, #6F6557)',             border: 'var(--line-soft, rgba(14,13,11,0.14))' },
};

export function StateChip({
  kind,
  children,
  size = 'md',
  dot = false,
  title,
  style,
}: {
  kind: StateKind;
  children: ReactNode;
  /** 'sm' for table rows / dense lists; 'md' everywhere else. */
  size?: 'sm' | 'md';
  /** Leading status dot (currentColor). */
  dot?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const k = KINDS[kind] ?? KINDS.waiting;
  const sm = size === 'sm';
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sm ? 5 : 6,
        padding: sm ? '3px 9px' : '4px 11px',
        borderRadius: 999,
        background: k.bg,
        color: k.fg,
        border: `1px solid ${k.border}`,
        fontSize: sm ? 10.5 : 11.5,
        fontWeight: 650,
        letterSpacing: '0.01em',
        lineHeight: 1.35,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot ? (
        <span
          aria-hidden
          style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0, opacity: 0.85 }}
        />
      ) : null}
      {children}
    </span>
  );
}

/** The shared RSVP vocabulary → chip kind. Guests surfaces
 *  (roster, drawers, day-of) all speak this one dialect. */
export function rsvpStateKind(status: string | null | undefined): StateKind {
  const s = String(status ?? '').toLowerCase();
  if (s === 'attending' || s === 'yes' || s === 'accepted') return 'good';
  if (s === 'declined' || s === 'no') return 'quiet';
  if (s === 'maybe' || s === 'tentative') return 'info';
  return 'waiting'; // pending / invited / unknown
}

/** Vendor book vocabulary → chip kind. Overdue is computed by the
 *  caller (a date comparison, not a status string). */
export function vendorStateKind(status: string | null | undefined): StateKind {
  const s = String(status ?? '').toLowerCase();
  if (s === 'paid') return 'good';
  if (s === 'booked') return 'info';
  return 'waiting'; // considering
}
