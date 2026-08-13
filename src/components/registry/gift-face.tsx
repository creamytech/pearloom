'use client';

/* ─────────────────────────────────────────────────────────────
   gift-face.tsx — every gift gets a face (REGISTRY-PLAN RG.2)

   The registry's shared face system:

   • GIFT_PLATES — hand-drawn category plates in the motif language
     (hairline strokes + one gold pearl), rendered in whatever ink/
     tint the mounting surface passes, so the same plate reads right
     on the dashboard's cream and the published site's --t-* bag.
   • The `plate:<id>` sentinel — a plate pick persists through the
     existing image_url column (no migration); every reader routes
     through GiftFace, which understands the sentinel, real URLs,
     and the broken-image confess state.
   • Link intake helpers — looksLikeUrl / extractUrls /
     readProductPage — shared by the editor panel and the dashboard
     manager so the two add flows can't drift (RG.1).

   Closed decision (plan §5 Q1): NO image-search-by-name. A wrong
   photo on a gift is worse than a plate.
   ───────────────────────────────────────────────────────────── */

import { useState, type CSSProperties, type ReactNode } from 'react';

// ── The plate set ─────────────────────────────────────────────

export interface GiftPlateDef {
  id: string;
  label: string;
  /** Category words that suggest this plate (lowercase substring match). */
  match: readonly string[];
}

export const GIFT_PLATES: readonly GiftPlateDef[] = [
  { id: 'kitchen',    label: 'Kitchen',      match: ['kitchen', 'cook', 'bake', 'pan', 'knife'] },
  { id: 'table',      label: 'Table',        match: ['table', 'dining', 'dinner', 'china', 'glass'] },
  { id: 'home',       label: 'Home',         match: ['home', 'bed', 'bath', 'linen', 'decor', 'furniture'] },
  { id: 'garden',     label: 'Garden',       match: ['garden', 'plant', 'outdoor', 'patio'] },
  { id: 'away',       label: 'Away',         match: ['honeymoon', 'travel', 'trip', 'away', 'adventure'] },
  { id: 'little-one', label: 'Little one',   match: ['baby', 'little', 'nursery', 'kid'] },
  { id: 'experience', label: 'Experience',   match: ['experience', 'class', 'dinner out', 'tickets', 'date'] },
  { id: 'treasure',   label: 'Treasure',     match: [] },
] as const;

export const PLATE_PREFIX = 'plate:';

export function isPlateUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(PLATE_PREFIX);
}

export function plateIdFrom(url: string | null | undefined): string | null {
  if (!isPlateUrl(url)) return null;
  const id = (url as string).slice(PLATE_PREFIX.length);
  return GIFT_PLATES.some((p) => p.id === id) ? id : null;
}

/** Suggest a plate from the item's category text ('' → treasure). */
export function platePickFor(category: string | null | undefined): string {
  const c = (category ?? '').toLowerCase();
  if (c) {
    for (const p of GIFT_PLATES) {
      if (p.match.some((m) => c.includes(m))) return p.id;
    }
  }
  return 'treasure';
}

// ── The drawings — 48×36 viewBox, hairline ink + one gold pearl ──

function PlateArt({ id, ink, gold }: { id: string; ink: string; gold: string }) {
  const s = { fill: 'none', stroke: ink, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'kitchen': // a dutch oven
      return (
        <>
          <path {...s} d="M12 16 h24 v10 a6 6 0 0 1 -6 6 h-12 a6 6 0 0 1 -6 -6 Z" />
          <path {...s} d="M9 16 h30 M18 12 h12 a2 2 0 0 1 2 2 v2 h-16 v-2 a2 2 0 0 1 2 -2 Z" />
          <circle cx="24" cy="10" r="1.6" fill={gold} stroke="none" />
        </>
      );
    case 'table': // stacked plates + a glass
      return (
        <>
          <ellipse {...s} cx="20" cy="24" rx="10" ry="3.4" />
          <ellipse {...s} cx="20" cy="20.5" rx="10" ry="3.4" />
          <path {...s} d="M34 13 v8 m-3.5 -10 h7 l-1 7 a2.6 2.6 0 0 1 -5 0 Z M31.5 24 h5" />
          <circle cx="20" cy="14" r="1.6" fill={gold} stroke="none" />
        </>
      );
    case 'home': // a small house with a stitched roof
      return (
        <>
          <path {...s} d="M14 20 24 11 34 20 M17 18.5 V27 h14 v-8.5" />
          <path {...s} d="M22 27 v-5 h4 v5" />
          <circle cx="24" cy="8" r="1.6" fill={gold} stroke="none" />
        </>
      );
    case 'garden': // a sprig in a pot
      return (
        <>
          <path {...s} d="M18 22 h12 l-1.5 7 h-9 Z M16.5 22 h15" />
          <path {...s} d="M24 22 c0 -6 0 -8 0 -10 M24 16 c-3 -1 -5 -3 -5 -6 c3 0 5 2 5 6 Z M24 14 c3 -1 5 -3 5 -6 c-3 0 -5 2 -5 6 Z" />
          <circle cx="24" cy="6.5" r="1.4" fill={gold} stroke="none" />
        </>
      );
    case 'away': // a paper plane over a dotted arc
      return (
        <>
          <path {...s} d="M10 26 q14 -12 28 -8" strokeDasharray="0.5 4" />
          <path {...s} d="M28 12 l10 -4 -4 10 -3.5 -3.5 Z M34 18 l-4 2" />
          <circle cx="10" cy="26" r="1.6" fill={gold} stroke="none" />
        </>
      );
    case 'little-one': // a tiny sock on a line
      return (
        <>
          <path {...s} d="M8 12 q16 6 32 0" strokeDasharray="0.5 4" />
          <path {...s} d="M21 14 v8 a4 4 0 0 0 4 4 h1 a4 4 0 0 0 1.5 -7.7 V14 Z M21 17.5 h6.5" />
          <circle cx="24" cy="9" r="1.6" fill={gold} stroke="none" />
        </>
      );
    case 'experience': // two tickets
      return (
        <>
          <rect {...s} x="12" y="14" width="18" height="11" rx="2" transform="rotate(-6 21 19.5)" />
          <rect {...s} x="19" y="17" width="18" height="11" rx="2" transform="rotate(4 28 22.5)" />
          <path {...s} d="M26 18.4 v8" strokeDasharray="0.5 2.6" transform="rotate(4 28 22.5)" />
          <circle cx="15" cy="12" r="1.6" fill={gold} stroke="none" />
        </>
      );
    case 'treasure': // the gift box (the general plate)
    default:
      return (
        <>
          <rect {...s} x="13" y="17" width="22" height="13" rx="1.5" />
          <path {...s} d="M13 21 h22 M24 17 v13 M24 17 c-5 0 -7 -2 -7 -4 a3 3 0 0 1 6 -1 c0.4 1 1 3 1 5 c0 -2 0.6 -4 1 -5 a3 3 0 0 1 6 1 c0 2 -2 4 -7 4" />
          <circle cx="24" cy="10" r="1.4" fill={gold} stroke="none" />
        </>
      );
  }
}

/** A gift plate at any size — paper tile + hairline drawing. */
export function GiftPlate({
  plate,
  ink = 'var(--ink-soft, #55503F)',
  gold = 'var(--pl-gold, #C19A4B)',
  paper = 'var(--cream-2, #F5EFE2)',
  style,
}: {
  plate: string;
  ink?: string;
  gold?: string;
  paper?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        width: '100%', height: '100%', display: 'grid', placeItems: 'center',
        background: paper,
        ...style,
      }}
    >
      <svg width="64%" height="64%" viewBox="0 0 48 36" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 120, opacity: 0.9 }}>
        <PlateArt id={plate} ink={ink} gold={gold} />
      </svg>
    </div>
  );
}

/** The universal item face: real photo → plate sentinel → fallback
 *  plate. Broken photos confess (host surfaces set `confess`) and
 *  fall back to the plate rather than a gray gap. */
export function GiftFace({
  url,
  category,
  alt = '',
  confess = false,
  ink,
  gold,
  paper,
  style,
  children,
}: {
  url: string | null | undefined;
  category?: string | null;
  alt?: string;
  confess?: boolean;
  ink?: string;
  gold?: string;
  paper?: string;
  style?: CSSProperties;
  /** Overlay slot (badges) rendered above the face. */
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const plate = plateIdFrom(url) ?? platePickFor(category);
  const showPhoto = !!url && !isPlateUrl(url) && !failed;
  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {showPhoto ? (
        <img
          src={url as string}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <GiftPlate plate={plate} ink={ink} gold={gold} paper={paper} style={{ position: 'absolute', inset: 0 }} />
      )}
      {failed && confess && (
        <span
          style={{
            position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)',
            whiteSpace: 'nowrap', padding: '3px 9px', borderRadius: 999,
            background: 'var(--pl-plum, #6E3B4E)', color: 'var(--pl-cream, #F5EFE2)',
            fontSize: 10, fontWeight: 700, pointerEvents: 'none',
          }}
        >
          Photo didn&rsquo;t load
        </span>
      )}
      {children}
    </div>
  );
}

/** The plate picker row — small tiles, one per category. */
export function PlateRow({
  value,
  onPick,
  ink,
  gold,
  paper,
}: {
  /** Current imageUrl value (plate sentinel or otherwise). */
  value: string;
  onPick: (sentinel: string) => void;
  ink?: string;
  gold?: string;
  paper?: string;
}) {
  const current = plateIdFrom(value);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {GIFT_PLATES.map((p) => {
        const on = current === p.id;
        return (
          <button
            key={p.id}
            type="button"
            title={p.label}
            onClick={() => onPick(`${PLATE_PREFIX}${p.id}`)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: 4, borderRadius: 9, cursor: 'pointer',
              border: on ? '1.5px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line, rgba(61,74,31,0.14))',
              background: on ? 'var(--sage-tint, rgba(92,107,63,0.10))' : 'transparent',
            }}
          >
            <span style={{ display: 'block', width: '100%', aspectRatio: '4/3', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <GiftPlate plate={p.id} ink={ink} gold={gold} paper={paper} style={{ position: 'absolute', inset: 0 }} />
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-soft, #55503F)', lineHeight: 1.1 }}>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Link intake (RG.1) ────────────────────────────────────────

const URL_RX = /https?:\/\/[^\s"'<>)]+/gi;

export function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

/** Every URL in a pasted blob — the multi-link queue's splitter. */
export function extractUrls(s: string): string[] {
  const found = s.match(URL_RX) ?? [];
  return [...new Set(found.map((u) => u.trim()))];
}

export interface ProductRead {
  title: string | null;
  imageUrl: string | null;
  price: number | null;
  store: string | null;
}

/** One product-page read through the SSRF-guarded server route.
 *  Throws with a host-safe message on failure. */
export async function readProductPage(url: string): Promise<ProductRead> {
  const r = await fetch('/api/registry-items/from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const d = (await r.json().catch(() => ({}))) as {
    ok?: boolean; title?: string | null; imageUrl?: string | null;
    price?: number | null; store?: string | null; error?: string;
  };
  if (!r.ok || !d.ok) throw new Error(d.error ?? 'Couldn’t read that page — add it by hand.');
  return {
    title: d.title ?? null,
    imageUrl: d.imageUrl ?? null,
    price: typeof d.price === 'number' ? d.price : null,
    store: d.store ?? null,
  };
}

/** Store label for an item link ("crateandbarrel.com"). */
export function storeDomainFor(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

/** RG.4 de-dupe guard — the existing item whose itemUrl matches a
 *  just-pasted link (normalized: host + path, query stripped). */
export function findDuplicateByUrl<T extends { itemUrl?: string | null }>(
  items: readonly T[],
  url: string,
): T | null {
  const norm = (u: string) => {
    try { const p = new URL(u); return `${p.hostname.replace(/^www\./, '')}${p.pathname.replace(/\/$/, '')}`; } catch { return u; }
  };
  const target = norm(url);
  return items.find((it) => it.itemUrl && norm(it.itemUrl) === target) ?? null;
}
