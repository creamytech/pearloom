'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/pearloom/avatars.tsx — the account marks.
//
// An animal-persona menagerie users pick as their account mark
// (Settings → Account → "Your mark"). Eighteen creatures drawn in
// the Pearloom single-stroke hand — round caps, fill:none, ink-dot
// eyes, a single gold pearl on the nose/beak as the brand signature
// — over the dashboard tint families. No photos, no generated
// faces, nothing that reads "AI startup" (BRAND.md §10).
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

/* Tint families (design system v2 "Your Mark"): bg wash, stroke ink,
   accent for the pearl. Hexes are fixed so the marks read correctly
   anywhere — picker tiles, chrome, emails later. */
const T = {
  sage:  { bg: '#E7E5D3', ink: '#586A3C', acc: '#B8923F' },
  cream: { bg: '#F3EAD6', ink: '#6F6557', acc: '#B8923F' },
  peach: { bg: '#F1DECE', ink: '#BB6A39', acc: '#B8923F' },
  rose:  { bg: '#F0DCD6', ink: '#C0543B', acc: '#B8923F' },
  gold:  { bg: '#EFE4CB', ink: '#9A7838', acc: '#586A3C' },
  night: { bg: '#292B21', ink: '#EFE9DA', acc: '#D4B373' },
} as const;
type Tint = keyof typeof T;

/* The menagerie, in the single-stroke hand. Each (ink, acc) → the
   inner SVG content of a 48×48 mark (paths inherit the wrapper's
   stroke; eyes/nose are ink/accent dots). Ported verbatim from the
   design system's "Your Mark" card. */
const G: Record<string, (k: string, a: string) => string> = {
  fox: (k, a) =>
    `<path d="M13 16 L15.5 4 L23 13"/><path d="M35 16 L32.5 4 L25 13"/><path d="M13 15 C 11 25 16 32 24 39 C 32 32 37 25 35 15"/><path d="M17.5 21 L24 27 L30.5 21"/><circle cx="18.5" cy="19.5" r="1.5" fill="${k}" stroke="none"/><circle cx="29.5" cy="19.5" r="1.5" fill="${k}" stroke="none"/><circle cx="24" cy="30" r="1.8" fill="${a}" stroke="none"/>`,
  bear: (k, a) =>
    `<circle cx="14" cy="13" r="5"/><circle cx="34" cy="13" r="5"/><path d="M11 20 C 9 30 15 39 24 39 C 33 39 39 30 37 20 C 35 14 29 11 24 11 C 19 11 13 14 11 20 Z"/><path d="M19 27 C 21 31 27 31 29 27"/><circle cx="18" cy="22" r="1.5" fill="${k}" stroke="none"/><circle cx="30" cy="22" r="1.5" fill="${k}" stroke="none"/><circle cx="24" cy="26" r="1.9" fill="${a}" stroke="none"/>`,
  cat: (k, a) =>
    `<path d="M13 18 L13 6 L23 13"/><path d="M35 18 L35 6 L25 13"/><path d="M13 16 C 11 26 16 34 24 38 C 32 34 37 26 35 16"/><circle cx="18" cy="22" r="1.4" fill="${k}" stroke="none"/><circle cx="30" cy="22" r="1.4" fill="${k}" stroke="none"/><circle cx="24" cy="27" r="1.5" fill="${a}" stroke="none"/><path d="M16 28 L7 26 M16 30.5 L7 31 M32 28 L41 26 M32 30.5 L41 31"/>`,
  hare: (k, a) =>
    `<path d="M18 21 C 14 12 14 4 17 3 C 20 4 20 13 20 21"/><path d="M30 21 C 34 12 34 4 31 3 C 28 4 28 13 28 21"/><path d="M15 23 C 13 31 17 39 24 39 C 31 39 35 31 33 23 C 31 18 28 17 24 17 C 20 17 17 18 15 23 Z"/><circle cx="19" cy="27" r="1.4" fill="${k}" stroke="none"/><circle cx="29" cy="27" r="1.4" fill="${k}" stroke="none"/><circle cx="24" cy="31" r="1.6" fill="${a}" stroke="none"/><path d="M24 32.5 L24 35"/>`,
  deer: (k, a) =>
    `<path d="M18 14 C 14 9 13 5 13 3 M18 13 C 14 11 11 11 9 12 M14 8.5 C 11.5 8 9.5 8.5 8.5 9.5"/><path d="M30 14 C 34 9 35 5 35 3 M30 13 C 34 11 37 11 39 12 M34 8.5 C 36.5 8 38.5 8.5 39.5 9.5"/><path d="M17 17 C 14 23 16 31 24 39 C 32 31 34 23 31 17 C 29 14 27 13 24 13 C 21 13 19 14 17 17 Z"/><circle cx="19.5" cy="22" r="1.4" fill="${k}" stroke="none"/><circle cx="28.5" cy="22" r="1.4" fill="${k}" stroke="none"/><circle cx="24" cy="31" r="1.7" fill="${a}" stroke="none"/>`,
  owl: (k, a) =>
    `<path d="M11 16 C 8 8 14 5 17 10"/><path d="M37 16 C 40 8 34 5 31 10"/><path d="M12 19 C 10 31 16 40 24 40 C 32 40 38 31 36 19 C 33 12 28 10 24 10 C 20 10 15 12 12 19 Z"/><circle cx="18" cy="22" r="4"/><circle cx="30" cy="22" r="4"/><circle cx="18" cy="22" r="1.5" fill="${k}" stroke="none"/><circle cx="30" cy="22" r="1.5" fill="${k}" stroke="none"/><path d="M24 25 L21 28.5 L24 30.5 L27 28.5 Z" fill="${a}" stroke="${a}"/><path d="M16 34 q 8 5 16 0"/>`,
  mouse: (k, a) =>
    `<circle cx="13" cy="14" r="7"/><circle cx="35" cy="14" r="7"/><path d="M14 22 C 12 31 17 39 24 39 C 31 39 36 31 34 22 C 32 17 28 16 24 16 C 20 16 16 17 14 22 Z"/><circle cx="19" cy="25" r="1.3" fill="${k}" stroke="none"/><circle cx="29" cy="25" r="1.3" fill="${k}" stroke="none"/><circle cx="24" cy="30" r="1.6" fill="${a}" stroke="none"/><path d="M24 31.5 L24 34"/>`,
  dog: (k, a) =>
    `<path d="M14 14 C 8 16 7 26 12 30 L14.5 18"/><path d="M34 14 C 40 16 41 26 36 30 L33.5 18"/><path d="M14 14 C 14 12 18 10 24 10 C 30 10 34 12 34 14 C 36 22 33 31 24 38 C 15 31 12 22 14 14 Z"/><circle cx="19" cy="21" r="1.4" fill="${k}" stroke="none"/><circle cx="29" cy="21" r="1.4" fill="${k}" stroke="none"/><path d="M20 29 q 4 4 8 0"/><circle cx="24" cy="27" r="1.9" fill="${a}" stroke="none"/>`,
  frog: (k, a) =>
    `<circle cx="16" cy="13" r="5"/><circle cx="32" cy="13" r="5"/><circle cx="16" cy="13" r="1.6" fill="${k}" stroke="none"/><circle cx="32" cy="13" r="1.6" fill="${k}" stroke="none"/><path d="M9 23 C 9 17 15 16 24 16 C 33 16 39 17 39 23 C 39 33 33 39 24 39 C 15 39 9 33 9 23 Z"/><path d="M16 31 q 8 6 16 0"/><circle cx="21.5" cy="23" r="1" fill="${a}" stroke="none"/><circle cx="26.5" cy="23" r="1" fill="${a}" stroke="none"/>`,
  koala: (k, a) =>
    `<circle cx="11" cy="15" r="6"/><circle cx="37" cy="15" r="6"/><path d="M12 18 C 11 28 16 37 24 37 C 32 37 37 28 36 18 C 34 13 29 12 24 12 C 19 12 14 13 12 18 Z"/><path d="M21 21 C 18.5 23 18.5 30 24 31.5 C 29.5 30 29.5 23 27 21 Z" fill="${a}" stroke="${a}"/><circle cx="17.5" cy="21" r="1.3" fill="${k}" stroke="none"/><circle cx="30.5" cy="21" r="1.3" fill="${k}" stroke="none"/>`,
  panda: (k, a) =>
    `<circle cx="13" cy="13" r="5" fill="${k}" stroke="${k}"/><circle cx="35" cy="13" r="5" fill="${k}" stroke="${k}"/><path d="M11 20 C 9 30 15 38 24 38 C 33 38 39 30 37 20 C 35 14 29 12 24 12 C 19 12 13 14 11 20 Z"/><ellipse cx="18" cy="22" rx="2.6" ry="3.6" transform="rotate(-18 18 22)" fill="${k}" stroke="${k}"/><ellipse cx="30" cy="22" rx="2.6" ry="3.6" transform="rotate(18 30 22)" fill="${k}" stroke="${k}"/><circle cx="18" cy="22" r="0.9" fill="${a}" stroke="none"/><circle cx="30" cy="22" r="0.9" fill="${a}" stroke="none"/><circle cx="24" cy="28" r="1.7" fill="${k}" stroke="none"/><path d="M21 31.5 q 3 2 6 0"/>`,
  pig: (k, a) =>
    `<path d="M13 16 L11 9 L18.5 13"/><path d="M35 16 L37 9 L29.5 13"/><path d="M12 18 C 10 28 16 37 24 37 C 32 37 38 28 36 18 C 33 13 28 12 24 12 C 20 12 15 13 12 18 Z"/><ellipse cx="24" cy="28" rx="6" ry="4"/><circle cx="22" cy="28" r="1" fill="${a}" stroke="none"/><circle cx="26" cy="28" r="1" fill="${a}" stroke="none"/><circle cx="18.5" cy="21" r="1.3" fill="${k}" stroke="none"/><circle cx="29.5" cy="21" r="1.3" fill="${k}" stroke="none"/>`,
  bee: (k, a) =>
    `<ellipse cx="24" cy="29" rx="9" ry="11"/><path d="M16.5 24 H31.5" stroke="${a}"/><path d="M15.5 30 H32.5"/><path d="M17.5 36 H30.5"/><ellipse cx="14" cy="17" rx="5" ry="7" transform="rotate(-22 14 17)"/><ellipse cx="34" cy="17" rx="5" ry="7" transform="rotate(22 34 17)"/><path d="M21 18 C 19 12 17 10 15 9"/><path d="M27 18 C 29 12 31 10 33 9"/><circle cx="15" cy="9" r="1.4" fill="${a}" stroke="none"/><circle cx="33" cy="9" r="1.4" fill="${a}" stroke="none"/>`,
  fish: (k, a) =>
    `<path d="M8 24 C 14 13 28 13 34 24 C 28 35 14 35 8 24 Z"/><path d="M34 24 L43 16 L41 24 L43 32 Z"/><path d="M20 16 C 18 21 18 27 20 32"/><path d="M16 34 q 5 4 10 0"/><circle cx="15" cy="21" r="1.5" fill="${k}" stroke="none"/><circle cx="27" cy="20" r="1.2" fill="${a}" stroke="none"/>`,
  tortoise: (k, a) =>
    `<path d="M8 31 C 8 20 15 15 24 15 C 33 15 40 20 40 31 Z"/><path d="M20 20 L28 20 L31 26 L28 31 L20 31 L17 26 Z"/><path d="M17 26 L9 27 M31 26 L39 27 M20 20 L18 16 M28 20 L30 16"/><path d="M8 29 C 3 29 1 25 3 22 C 4.5 20 8 21 8.5 24"/><circle cx="4.6" cy="24" r="0.9" fill="${k}" stroke="none"/><path d="M14 31 L12 35 M34 31 L36 35 M40 30 L43 31"/><circle cx="24" cy="25" r="1.3" fill="${a}" stroke="none"/>`,
  snail: (k, a) =>
    `<circle cx="29" cy="23" r="10"/><circle cx="29" cy="23" r="6"/><circle cx="29" cy="23" r="2.4"/><path d="M19 24 C 12 25 8 30 8 37 L20 37 C 22 37 22 35 22 33"/><path d="M8 37 C 6 36 5 33 6 30"/><path d="M7 30 C 6 26 5 24 4 23 M11 30 C 11 27 10 25 9 24"/><circle cx="4" cy="23" r="1.2" fill="${a}" stroke="none"/><circle cx="9" cy="24" r="1.2" fill="${a}" stroke="none"/>`,
  robin: (k, a) =>
    `<path d="M14 16 C 22 12 32 14 36 22 C 38 28 34 36 26 38 C 18 40 12 34 12 27 C 12 22 12 18 14 16 Z"/><path d="M12 30 L4 34 L12 37"/><path d="M20 25 q 8 1 12 7"/><circle cx="30" cy="21" r="1.4" fill="${k}" stroke="none"/><path d="M36 22 L43 23 L36 25 Z" fill="${a}" stroke="${a}"/><path d="M22 38 L22 43 M28 38 L28 43"/>`,
  butterfly: (k, a) =>
    `<path d="M24 13 L24 36"/><path d="M24 19 C 14 8 6 12 8 20 C 9 27 18 27 24 22 Z"/><path d="M24 19 C 34 8 42 12 40 20 C 39 27 30 27 24 22 Z"/><path d="M24 24 C 16 26 12 32 16 38 C 20 43 24 35 24 28 Z"/><path d="M24 24 C 32 26 36 32 32 38 C 28 43 24 35 24 28 Z"/><path d="M24 13 C 22 9 20 7 18 6.5"/><path d="M24 13 C 26 9 28 7 30 6.5"/><circle cx="14" cy="18" r="1.6" fill="${a}" stroke="none"/><circle cx="34" cy="18" r="1.6" fill="${a}" stroke="none"/>`,
};

/* The menagerie in reading order (3 rows × 6): id, tint, label. */
const MARKS: ReadonlyArray<readonly [string, Tint, string]> = [
  ['fox', 'peach', 'Fox'], ['bear', 'sage', 'Bear'], ['cat', 'cream', 'Cat'],
  ['hare', 'rose', 'Hare'], ['deer', 'sage', 'Deer'], ['owl', 'night', 'Owl'],
  ['mouse', 'cream', 'Mouse'], ['dog', 'peach', 'Dog'], ['frog', 'sage', 'Frog'],
  ['koala', 'cream', 'Koala'], ['panda', 'night', 'Panda'], ['pig', 'rose', 'Pig'],
  ['bee', 'gold', 'Bee'], ['fish', 'cream', 'Fish'], ['tortoise', 'sage', 'Tortoise'],
  ['snail', 'peach', 'Snail'], ['robin', 'rose', 'Robin'], ['butterfly', 'gold', 'Butterfly'],
];

export const PL_AVATARS: readonly AvatarDef[] = MARKS.map(([id, tint, label]) => {
  const t = T[tint];
  return {
    id,
    label,
    bg: t.bg,
    glyph: (
      <g
        fill="none"
        stroke={t.ink}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: G[id](t.ink, t.acc) }}
      />
    ),
  };
});

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

/* ── MonogramSeal — the zero-effort default mark ──────────────
   ONBOARDING-PLAN O1: nobody leaves blank. When a person has no
   photo and no mark, they carry their initial(s) letterpressed in
   a wax-seal roundel — pressed from their name, tinted
   deterministically so the same name always wears the same seal.
   Not a gray silhouette; a made thing. */

const SEAL_TINTS: ReadonlyArray<{ bg: string; ink: string }> = [
  { bg: '#E7E5D3', ink: '#586A3C' }, // sage
  { bg: '#F3EAD6', ink: '#6F6557' }, // cream
  { bg: '#F1DECE', ink: '#BB6A39' }, // peach
  { bg: '#F0DCD6', ink: '#C0543B' }, // rose
  { bg: '#EFE4CB', ink: '#9A7838' }, // gold
];

export function monogramFrom(name: string | null | undefined): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '·';
}

export function MonogramSeal({
  name, size = 32, round = true, style,
}: {
  name: string | null | undefined;
  size?: number;
  round?: boolean;
  style?: React.CSSProperties;
}) {
  const initials = monogramFrom(name);
  const sum = Array.from(String(name ?? '')).reduce((n, c) => n + c.charCodeAt(0), 0);
  const t = SEAL_TINTS[sum % SEAL_TINTS.length];
  return (
    <span
      role="img"
      aria-label={name ? `${name}'s mark` : 'Account mark'}
      style={{
        width: size, height: size, borderRadius: round ? '50%' : Math.round(size * 0.25),
        display: 'inline-grid', placeItems: 'center', flexShrink: 0,
        background: t.bg,
        color: t.ink,
        border: '1px solid rgba(193,154,75,0.4)',
        /* The blind deboss — the seal is pressed, not printed. */
        boxShadow: 'inset 0 1.5px 3px rgba(31,36,24,0.12), inset 0 -1px 1px rgba(255,255,255,0.75)',
        fontFamily: 'var(--pl-font-display, var(--font-display, serif))',
        fontStyle: 'italic',
        fontWeight: 500,
        fontSize: size * (initials.length > 1 ? 0.36 : 0.46),
        letterSpacing: initials.length > 1 ? '0.02em' : 0,
        lineHeight: 1,
        userSelect: 'none',
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

/* ── AccountMark — THE fallback chain, one component ──────────
   avatar photo (uploaded) → orchard mark → sign-in photo →
   monogram seal. Every chrome surface that shows the account's
   face renders this instead of hand-rolling the chain. */

export function AccountMark({
  photoUrl, markId, signInImage, name, size = 32, round = true, style,
}: {
  /** user_preferences.avatar_url — the uploaded photograph. */
  photoUrl?: string | null;
  /** user_preferences.avatar — an orchard mark id. */
  markId?: string | null;
  /** OAuth profile image (Google) — below an explicit pick. */
  signInImage?: string | null;
  name?: string | null;
  size?: number;
  round?: boolean;
  style?: React.CSSProperties;
}) {
  const radius = round ? '50%' : Math.round(size * 0.25);
  if (photoUrl) {
    return (
      <span
        role="img"
        aria-label={name ? `${name}'s photo` : 'Account photo'}
        style={{
          width: size, height: size, borderRadius: radius, flexShrink: 0,
          display: 'inline-block', overflow: 'hidden',
          background: `#F3EAD6 center / cover no-repeat url("${photoUrl.replace(/"/g, '%22')}")`,
          border: '1px solid rgba(193,154,75,0.4)',
          ...style,
        }}
      />
    );
  }
  if (markId && avatarById(markId)) {
    return <PlAvatar id={markId} size={size} round={round} style={style} />;
  }
  if (signInImage) {
    return (
      <span
        role="img"
        aria-label={name ? `${name}'s photo` : 'Account photo'}
        style={{
          width: size, height: size, borderRadius: radius, flexShrink: 0,
          display: 'inline-block', overflow: 'hidden',
          background: `#F3EAD6 center / cover no-repeat url("${signInImage.replace(/"/g, '%22')}")`,
          ...style,
        }}
      />
    );
  }
  return <MonogramSeal name={name} size={size} round={round} style={style} />;
}

/* ── useUserAvatar — one cache, every chrome surface ─────────── */

interface AvatarState {
  /** Orchard mark id (user_preferences.avatar). */
  id: string | null;
  /** Uploaded photo (user_preferences.avatar_url) — wins the chain. */
  url: string | null;
}

let avatarCache: AvatarState | undefined; // undefined = not loaded yet
let avatarFetch: Promise<void> | null = null;
const avatarSubs = new Set<() => void>();
function notifyAvatar() { avatarSubs.forEach((fn) => fn()); }
function subscribeAvatar(cb: () => void) {
  avatarSubs.add(cb);
  return () => { avatarSubs.delete(cb); };
}
function getAvatarSnapshot(): AvatarState | undefined { return avatarCache; }
function getAvatarServerSnapshot(): AvatarState | undefined { return undefined; }

function ensureAvatarLoaded() {
  if (avatarCache !== undefined || avatarFetch) return;
  avatarFetch = fetch('/api/user/preferences', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { avatar?: string | null; avatar_url?: string | null } | null) => {
      avatarCache = {
        id: typeof d?.avatar === 'string' && d.avatar ? d.avatar : null,
        url: typeof d?.avatar_url === 'string' && d.avatar_url ? d.avatar_url : null,
      };
      notifyAvatar();
    })
    .catch(() => {
      avatarCache = { id: null, url: null };
      notifyAvatar();
    });
}

export function useUserAvatar(): {
  /** Picked mark id, null = none picked, undefined = still loading. */
  avatarId: string | null | undefined;
  /** Uploaded photo URL — wins the fallback chain when set. */
  avatarUrl: string | null | undefined;
  setAvatarId: (id: string | null) => void;
  /** Optimistic local update after /api/user/avatar succeeds. */
  setAvatarUrl: (url: string | null) => void;
} {
  const state = useSyncExternalStore(subscribeAvatar, getAvatarSnapshot, getAvatarServerSnapshot);

  useEffect(() => {
    ensureAvatarLoaded();
  }, []);

  const setAvatarId = useCallback((id: string | null) => {
    /* Picking a mark is an explicit choice — it also retires the
       uploaded photo (the chain would otherwise hide the pick). */
    const hadPhoto = Boolean(avatarCache?.url);
    avatarCache = { id, url: null }; // optimistic — all chrome updates at once
    notifyAvatar();
    void fetch('/api/user/preferences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: id }),
    }).catch(() => { /* re-syncs on next load */ });
    if (hadPhoto) {
      void fetch('/api/user/avatar', { method: 'DELETE', credentials: 'include' })
        .catch(() => { /* re-syncs on next load */ });
    }
  }, []);

  const setAvatarUrl = useCallback((url: string | null) => {
    avatarCache = { id: avatarCache?.id ?? null, url };
    notifyAvatar();
  }, []);

  return {
    avatarId: state === undefined ? undefined : state.id,
    avatarUrl: state === undefined ? undefined : state.url,
    setAvatarId,
    setAvatarUrl,
  };
}
