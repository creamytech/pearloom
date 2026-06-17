'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/pearloom/avatars.tsx — the orchard marks.
//
// Twelve hand-drawn SVG avatars users pick as their account mark
// (Settings → Account → "Your mark"). Pear-house iconography —
// pears, sprigs, thread, wax seals, lanterns — in the dashboard
// tint families. No photos required, no generated faces, nothing
// that reads "AI startup" (BRAND.md §10).
//
//   PL_AVATARS        — the registry (id, label, tint, glyph)
//   <PlAvatar />      — renders one mark at any size
//   useUserAvatar()   — module-cached pref hook (user_preferences
//                       .avatar via /api/user/preferences) shared
//                       by the topbar button, sidebar menu, and
//                       the settings picker so they never disagree.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';

interface AvatarDef {
  id: string;
  label: string;
  /** Soft background wash. */
  bg: string;
  /** Glyph, drawn in a 48×48 viewBox. */
  glyph: ReactNode;
}

/* Tint families — dashboard palette hexes as fallbacks so the
   marks read correctly outside the themed shell (emails later). */
const SAGE = '#5C6B3F';
const SAGE_DEEP = '#3D4A1F';
const GOLD = '#C19A4B';
const TERRA = '#C6703D';
const LAVENDER = '#6B5A8C';
const PLUM = '#7A2D2D';
const CREAM = '#FDFAF0';
const MIDNIGHT = '#2A2722';

const SAGE_BG = '#E4E2CC';
const GOLD_BG = '#F2E6CC';
const TERRA_BG = '#F4E3D3';
const LAVENDER_BG = '#E8E0F0';
const PLUM_BG = '#EDD9D9';
const MIDNIGHT_BG = '#34302A';

/** The classic Pearloom pear silhouette + stem; leaf optional. */
function PearGlyph({ body, leaf, x = 0, y = 0, scale = 1 }: { body: string; leaf?: string; x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M24 14.5c-2.6 0-4.6 2-4.6 4.6 0 1.4.4 2.6 1 3.7-2.5 1.4-4.2 4-4.2 7 0 4.3 3.5 7.7 7.8 7.7s7.8-3.4 7.8-7.7c0-3-1.7-5.6-4.2-7 .6-1.1 1-2.3 1-3.7 0-2.6-2-4.6-4.6-4.6z"
        fill={body}
      />
      <path d="M24 14.5c.2-2.2 1.6-3.8 3.6-4.5" fill="none" stroke={SAGE_DEEP} strokeWidth="1.8" strokeLinecap="round" />
      {leaf && (
        <ellipse cx="28.6" cy="11.6" rx="3.4" ry="1.8" fill={leaf} transform="rotate(-28 28.6 11.6)" />
      )}
    </g>
  );
}

export const PL_AVATARS: readonly AvatarDef[] = [
  {
    id: 'pear-olive', label: 'The pear', bg: SAGE_BG,
    glyph: <PearGlyph body={SAGE} leaf={GOLD} />,
  },
  {
    id: 'pear-gold', label: 'Gilded pear', bg: LAVENDER_BG,
    glyph: <PearGlyph body={GOLD} leaf={SAGE} />,
  },
  {
    id: 'pear-terra', label: 'Sun pear', bg: TERRA_BG,
    glyph: <PearGlyph body={TERRA} leaf={SAGE} />,
  },
  {
    id: 'pear-pair', label: 'Two pears', bg: GOLD_BG,
    glyph: (
      <g>
        <g transform="rotate(-10 18 28)"><PearGlyph body={SAGE} x={-7} y={4} scale={0.74} /></g>
        <g transform="rotate(12 32 28)"><PearGlyph body={TERRA} x={9} y={4} scale={0.74} /></g>
      </g>
    ),
  },
  {
    id: 'sprig', label: 'Olive sprig', bg: SAGE_BG,
    glyph: (
      <g fill="none" stroke={SAGE_DEEP} strokeWidth="1.8" strokeLinecap="round">
        <path d="M24 38c0-10 2-18 8-26" />
        <ellipse cx="26.5" cy="20" rx="4.2" ry="2" fill={SAGE} stroke="none" transform="rotate(-38 26.5 20)" />
        <ellipse cx="30.5" cy="15" rx="3.6" ry="1.7" fill={SAGE} stroke="none" transform="rotate(-30 30.5 15)" />
        <ellipse cx="22.5" cy="28" rx="4.2" ry="2" fill={GOLD} stroke="none" transform="rotate(-52 22.5 28)" />
        <circle cx="33.5" cy="11" r="1.6" fill={GOLD} stroke="none" />
      </g>
    ),
  },
  {
    id: 'bloom', label: 'Bloom', bg: PLUM_BG,
    glyph: (
      <g>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="24" cy="17.5" rx="4" ry="6.5" fill={PLUM} opacity="0.85" transform={`rotate(${a} 24 24)`} />
        ))}
        <circle cx="24" cy="24" r="4.2" fill={GOLD} />
      </g>
    ),
  },
  {
    id: 'thread', label: 'The spool', bg: GOLD_BG,
    glyph: (
      <g fill="none" strokeLinecap="round">
        <rect x="17" y="14" width="14" height="20" rx="2.5" fill={CREAM} stroke={SAGE_DEEP} strokeWidth="1.6" />
        <path d="M18 19h12M18 23h12M18 27h12" stroke={SAGE} strokeWidth="2.4" />
        <path d="M30 23c6 0 8 4 6 8s-8 4-12 1" stroke={GOLD} strokeWidth="1.8" strokeDasharray="3 3" />
      </g>
    ),
  },
  {
    id: 'seal', label: 'Wax seal', bg: SAGE_BG,
    glyph: (
      <g>
        <path
          d="M24 10.5c2 1.6 3.6 1 5.6.6 1 1.8 2.4 2.8 4.4 3.2-.2 2 .5 3.6 1.9 5-1 1.7-1.2 3.4-.6 5.3-1.7 1-2.7 2.5-3 4.5-2 .2-3.5 1-4.7 2.6-1.9-.7-3.7-.7-5.6 0-1.2-1.6-2.7-2.4-4.7-2.6-.3-2-1.3-3.5-3-4.5.6-1.9.4-3.6-.6-5.3 1.4-1.4 2.1-3 1.9-5 2-.4 3.4-1.4 4.4-3.2 2 .4 3.6 1 6-.6z"
          fill={PLUM}
        />
        <circle cx="24" cy="24" r="9" fill="none" stroke={CREAM} strokeWidth="1.2" strokeDasharray="2 2.4" opacity="0.85" />
        <text x="24" y="28.2" textAnchor="middle" fontSize="11" fontStyle="italic" fontFamily="Georgia, serif" fill={CREAM}>P</text>
      </g>
    ),
  },
  {
    id: 'letter', label: 'The envelope', bg: LAVENDER_BG,
    glyph: (
      <g>
        <rect x="12" y="17" width="24" height="16" rx="2" fill={CREAM} stroke={LAVENDER} strokeWidth="1.6" />
        <path d="M12.5 18.5 24 27l11.5-8.5" fill="none" stroke={LAVENDER} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="25.5" r="3" fill={GOLD} />
      </g>
    ),
  },
  {
    id: 'lantern', label: 'Paper lantern', bg: TERRA_BG,
    glyph: (
      <g fill="none" strokeLinecap="round">
        <path d="M24 9v3" stroke={SAGE_DEEP} strokeWidth="1.6" />
        <ellipse cx="24" cy="24" rx="9.5" ry="11.5" fill={TERRA} />
        <path d="M19 13.6c-3 5.8-3 15 0 20.8M29 13.6c3 5.8 3 15 0 20.8M24 12.5v23" stroke={CREAM} strokeWidth="1.1" opacity="0.7" />
        <rect x="20.5" y="10.5" width="7" height="3" rx="1.2" fill={SAGE_DEEP} />
        <rect x="20.5" y="34.5" width="7" height="3" rx="1.2" fill={SAGE_DEEP} />
        <path d="M24 38v2.5" stroke={GOLD} strokeWidth="1.6" />
      </g>
    ),
  },
  {
    id: 'bunting', label: 'Bunting', bg: GOLD_BG,
    glyph: (
      <g>
        <path d="M10 16c9 7 19 7 28 0" fill="none" stroke={SAGE_DEEP} strokeWidth="1.5" strokeLinecap="round" />
        <path d="m14.5 19.4 3.4 7.4 2.5-6.1z" fill={TERRA} />
        <path d="m21.5 21.6 2.6 7.8 2.6-7.8z" fill={SAGE} />
        <path d="m28.7 20.7 2.4 6.1 3.4-7.4z" fill={LAVENDER} />
        <circle cx="24" cy="35" r="2" fill={GOLD} />
      </g>
    ),
  },
  {
    id: 'moon', label: 'Editorial midnight', bg: MIDNIGHT_BG,
    glyph: (
      <g>
        <path d="M28 11a13 13 0 1 0 8.5 22.8A14.5 14.5 0 0 1 28 11z" fill={GOLD} opacity="0.92" />
        <circle cx="15" cy="17" r="1.5" fill={CREAM} opacity="0.8" />
        <circle cx="19" cy="31" r="1.1" fill={CREAM} opacity="0.6" />
      </g>
    ),
  },
  {
    id: 'heart', label: 'Woven heart', bg: TERRA_BG,
    glyph: (
      <g>
        <path d="M24 34s-9.6-5.7-9.6-12.3c0-3.1 2.5-5.4 5.5-5.4 2 0 3.6 1.1 4.1 2.8.5-1.7 2.1-2.8 4.1-2.8 3 0 5.5 2.3 5.5 5.4C33.6 28.3 24 34 24 34z" fill={TERRA} />
        <path d="M19.5 22c2.4 1.6 6.6 1.6 9 0" fill="none" stroke={CREAM} strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
      </g>
    ),
  },
  {
    id: 'star', label: 'North star', bg: LAVENDER_BG,
    glyph: (
      <g>
        <path d="M24 11l2.8 8.9 8.9 2.8-8.9 2.8L24 35l-2.8-9.5-8.9-2.8 8.9-2.8z" fill={GOLD} />
        <circle cx="14" cy="32" r="1.3" fill={LAVENDER} />
        <circle cx="34" cy="14" r="1.1" fill={LAVENDER} opacity="0.7" />
      </g>
    ),
  },
  {
    id: 'sun', label: 'Little sun', bg: GOLD_BG,
    glyph: (
      <g stroke={TERRA} strokeWidth="1.8" strokeLinecap="round">
        <circle cx="24" cy="24" r="7" fill={GOLD} stroke="none" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="24" y1="9.5" x2="24" y2="13.5" transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
    ),
  },
  {
    id: 'leaf', label: 'Single leaf', bg: SAGE_BG,
    glyph: (
      <g>
        <path d="M24 12c8.5 4.5 9.5 17 0 24.5C14.5 29 15.5 16.5 24 12z" fill={SAGE} />
        <path d="M24 14.5v20M24 21l5-3M24 27l-5-3M24 33l5-3" fill="none" stroke={CREAM} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
      </g>
    ),
  },
  {
    id: 'pearl', label: 'Pearl on thread', bg: GOLD_BG,
    glyph: (
      <g>
        <path d="M11 18c7 5 19 5 26 0" fill="none" stroke={GOLD} strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeLinecap="round" />
        <circle cx="24" cy="28" r="6" fill={GOLD} />
        <circle cx="21.8" cy="25.8" r="1.8" fill={CREAM} opacity="0.85" />
      </g>
    ),
  },
  {
    id: 'mountain', label: 'The peaks', bg: MIDNIGHT_BG,
    glyph: (
      <g>
        <circle cx="33" cy="15" r="3.4" fill={GOLD} opacity="0.9" />
        <path d="M9 35l9-13.5 5.5 7 5.5-9L37 35z" fill={LAVENDER} />
      </g>
    ),
  },
  {
    id: 'candle', label: 'Candlelight', bg: TERRA_BG,
    glyph: (
      <g>
        <path d="M24 11c2.4 2.2 3.6 4.2 3.6 6.2a3.6 3.6 0 0 1-7.2 0c0-2 1.2-4 3.6-6.2z" fill={GOLD} />
        <rect x="20.5" y="20" width="7" height="16" rx="1.6" fill={CREAM} stroke={TERRA} strokeWidth="1.4" />
        <path d="M24 20.5v15" stroke={TERRA} strokeWidth="0.8" opacity="0.4" />
      </g>
    ),
  },
  {
    id: 'ring', label: 'Gold ring', bg: GOLD_BG,
    glyph: (
      <g>
        <circle cx="24" cy="28" r="8" fill="none" stroke={GOLD} strokeWidth="2.6" />
        <path d="M20 19l4-5 4 5z" fill={CREAM} stroke={GOLD} strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="24" cy="14.5" r="2.6" fill={CREAM} stroke={GOLD} strokeWidth="1.2" />
      </g>
    ),
  },
  {
    id: 'book', label: 'Bound book', bg: PLUM_BG,
    glyph: (
      <g>
        <path d="M24 17c-3.2-1.8-7.5-1.8-11-.6v17.4c3.5-1.2 7.8-1.2 11 .6 3.2-1.8 7.5-1.8 11-.6V16.4c-3.5-1.2-7.8-1.2-11 .6z" fill={PLUM} />
        <path d="M24 17v17.4" stroke={CREAM} strokeWidth="1.2" />
        <path d="M17 21.5c1.8-.5 3.6-.6 5-.3M17 25.5c1.8-.5 3.6-.6 5-.3" stroke={CREAM} strokeWidth="1" opacity="0.7" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'tulip', label: 'Tulip', bg: LAVENDER_BG,
    glyph: (
      <g>
        <path d="M24 36V23" stroke={SAGE_DEEP} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 23c0-5.5 3.2-9.8 7-12 3.8 2.2 7 6.5 7 12-2.3 1.4-4.7 1.4-7-.8-2.3 2.2-4.7 2.2-7 .8z" fill={LAVENDER} />
        <path d="M24 11.5v11.5" stroke={CREAM} strokeWidth="1" opacity="0.6" />
        <ellipse cx="29.5" cy="30.5" rx="3.6" ry="1.7" fill={SAGE} transform="rotate(20 29.5 30.5)" />
      </g>
    ),
  },
] as const;

export type AvatarId = (typeof PL_AVATARS)[number]['id'];

export function avatarById(id: string | null | undefined): AvatarDef | null {
  if (!id) return null;
  return PL_AVATARS.find((a) => a.id === id) ?? null;
}

export function PlAvatar({
  id, size = 32, round = true, style,
}: {
  id: string;
  size?: number;
  /** Circle (chrome) vs rounded-square (picker tiles). */
  round?: boolean;
  style?: React.CSSProperties;
}) {
  const def = avatarById(id);
  if (!def) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={def.label}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {round
        ? <circle cx="24" cy="24" r="24" fill={def.bg} />
        : <rect width="48" height="48" rx="12" fill={def.bg} />}
      {def.glyph}
    </svg>
  );
}

/* ── useUserAvatar — one cache, every chrome surface ─────────── */

let avatarCache: string | null | undefined; // undefined = not loaded yet
let avatarFetch: Promise<void> | null = null;
const avatarSubs = new Set<() => void>();
function notifyAvatar() { avatarSubs.forEach((fn) => fn()); }
function subscribeAvatar(cb: () => void) {
  avatarSubs.add(cb);
  return () => { avatarSubs.delete(cb); };
}
function getAvatarSnapshot(): string | null | undefined { return avatarCache; }
function getAvatarServerSnapshot(): string | null | undefined { return undefined; }

function ensureAvatarLoaded() {
  if (avatarCache !== undefined || avatarFetch) return;
  avatarFetch = fetch('/api/user/preferences', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { avatar?: string | null } | null) => {
      avatarCache = typeof d?.avatar === 'string' && d.avatar ? d.avatar : null;
      notifyAvatar();
    })
    .catch(() => {
      avatarCache = null;
      notifyAvatar();
    });
}

export function useUserAvatar(): {
  /** Picked mark id, null = none picked, undefined = still loading. */
  avatarId: string | null | undefined;
  setAvatarId: (id: string | null) => void;
} {
  const avatarId = useSyncExternalStore(subscribeAvatar, getAvatarSnapshot, getAvatarServerSnapshot);

  useEffect(() => {
    ensureAvatarLoaded();
  }, []);

  const setAvatarId = useCallback((id: string | null) => {
    avatarCache = id; // optimistic — all chrome updates at once
    notifyAvatar();
    void fetch('/api/user/preferences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: id }),
    }).catch(() => { /* re-syncs on next load */ });
  }, []);

  return { avatarId, setAvatarId };
}
