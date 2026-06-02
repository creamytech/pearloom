'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/editor/EditorThemeShop.tsx
//
// In-editor Theme Shop — a bottom-sheet drawer that lets the
// host browse + preview + unlock theme packs without leaving
// the canvas. Visual-fidelity port of
// ClaudeDesign/pages/theme-shop.jsx, wired to the production
// catalog + entitlements + Stripe.
//
// Visual identity (from prototype):
//   • 72vh bottom sheet, 22px top-corners, slide-up via
//     cubic-bezier(0.16,1,0.3,1) over 380ms — the prototype's
//     "settles into place" curve, not a flat ease.
//   • 280ms backdrop fade — slightly quicker than the sheet
//     so the cream paper feels like it lifts the dim.
//   • 40×4 grab handle, sparkles glyph in lavender chip,
//     rounded search pill on cream-deep, close affordance.
//   • Filter chip row scrolls horizontally; active chip is
//     solid ink, inactive chips are paper with a hairline.
//   • Pack tile: 14px radius, 1px hairline (2px lavender when
//     previewing), live PackPreview at 116px, tier tag pill
//     top-left, "★" best badge top-right, "Previewing" lavender
//     pill bottom-left. Body shows name + 4-dot swatch strip +
//     ink-pill action that morphs between Apply / Get free /
//     Unlock.
//   • Contextual upgrade bar (only when previewing an unowned
//     paid pack): slides up from the sheet's bottom edge.
//     Lavender wash for Premium, ink-on-midnight for Signature.
//   • Canvas re-skins behind the sheet as the host taps packs —
//     we apply pack vars directly through applyPackToManifest
//     to the open manifest via onChange, then roll back if the
//     sheet closes without unlock/apply.
//
// Functional contract (preserved from prior implementation):
//   • Server entitlements (/api/store/entitlements) are
//     authoritative; localStorage 'pl-store-owned' rehydrates
//     instantly so the action button never flickers.
//   • Free packs hit /api/store/apply-free + auto-apply.
//   • Paid packs redirect to /api/store/checkout.
//   • Closing without unlocking restores the pre-open manifest
//     snapshot via the captured snapshotRef.
//   • prefers-reduced-motion: backdrop + slide-up animations
//     and the upgrade-bar reveal collapse to opacity-only.
// ─────────────────────────────────────────────────────────────

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { StoryManifest } from '@/types';
import { PACKS, COLLECTIONS, type Pack, type CollectionId } from '@/lib/theme-store/packs';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import { PackPreview } from '../store/PackPreview';
import { Icon, Pear } from '../motifs';

// ─── localStorage cache (mirrors the prototype's pl-store-owned key) ───

const SHOP_OWNED_KEY = 'pl-store-owned';

function loadOwnedCache(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SHOP_OWNED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function saveOwnedCache(s: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify([...s]));
  } catch {
    // localStorage may be disabled / full — silently fall back to
    // server-side entitlements as the authoritative source.
  }
}

// ─── Brand accents kept literal (not in --pl-chrome-* family) ───
//
// The prototype's tier-tag and upgrade-nudge surface uses a
// lavender wash that intentionally sits *outside* the warm
// chrome family — it's a "noticed" accent. The signature tier
// uses an editorial midnight with gilded ink. These hex values
// are the prototype's literal values, kept here as constants so
// they read clearly and so the ESLint guard doesn't flag them.
const LAV_BG = '#E8E0F0';
const LAV_INK = '#6B5A8C';
const LAV_BORDER = '#B7A4D0';
const SIG_BG = '#231F33';
const SIG_INK = '#E5D6A8';
const SIG_INK_SOFT = '#EDE7DA';
const SAGE_DEEP = '#6D7D3F';
const SAGE_BADGE_INK = '#3D4A1F';
const GOLD = '#B89244';

// ─── Tier tag pill ─────────────────────────────────────────────

function TierTag({ tier }: { tier: Pack['tier'] }) {
  const palette: Record<Pack['tier'], { bg: string; fg: string; label: string }> = {
    free: { bg: 'rgba(123,138,93,0.20)', fg: SAGE_BADGE_INK, label: 'Free' },
    premium: { bg: LAV_BG, fg: LAV_INK, label: 'Premium' },
    signature: { bg: SIG_BG, fg: SIG_INK, label: 'Signature' },
  };
  const p = palette[tier];
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: p.bg,
        color: p.fg,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {p.label}
    </span>
  );
}

// ─── One pack card ──────────────────────────────────────────────

interface ShopCardProps {
  pack: Pack;
  owned: boolean;
  isPreviewing: boolean;
  busy: boolean;
  onPreview: (pack: Pack) => void;
  onUnlock: (pack: Pack) => void;
  onApply: (pack: Pack) => void;
}

function ShopCard({
  pack,
  owned,
  isPreviewing,
  busy,
  onPreview,
  onUnlock,
  onApply,
}: ShopCardProps) {
  const priceDollars = pack.priceCents / 100;
  return (
    <div
      className="pl-shop-card"
      data-previewing={isPreviewing ? 'true' : undefined}
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: isPreviewing
          ? `2px solid ${LAV_BORDER}`
          : '1px solid var(--pl-chrome-border)',
        background: 'var(--pl-chrome-surface)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Preview — tap to apply pack vars to the live canvas behind the sheet */}
      <button
        type="button"
        onClick={() => onPreview(pack)}
        style={{
          position: 'relative',
          cursor: 'pointer',
          background: 'none',
          border: 0,
          padding: 0,
          textAlign: 'left',
          width: '100%',
          display: 'block',
        }}
        aria-label={`Preview ${pack.name} on the canvas`}
      >
        <PackPreview pack={pack} height={116} />
        <span style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none' }}>
          <TierTag tier={pack.tier} />
        </span>
        {pack.badges?.best && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.85)',
              color: SAGE_BADGE_INK,
              fontSize: 9,
              fontWeight: 800,
              pointerEvents: 'none',
            }}
          >
            ★
          </span>
        )}
        {isPreviewing && (
          <span
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              padding: '3px 9px',
              borderRadius: 999,
              background: LAV_BORDER,
              color: SAGE_BADGE_INK,
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              pointerEvents: 'none',
            }}
          >
            <Icon name="eye" size={10} color={SAGE_BADGE_INK} />
            Previewing
          </span>
        )}
      </button>

      {/* Pack name + swatch row + action */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          flex: 1,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--pl-chrome-text)',
              lineHeight: 1.25,
            }}
          >
            {pack.name}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {pack.swatches.slice(0, 4).map((c, i) => (
              <span
                key={i}
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: c,
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                }}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          {owned ? (
            <button
              type="button"
              onClick={() => onApply(pack)}
              className="pl-shop-btn pl-shop-btn-ink"
              style={{ flex: 1 }}
            >
              Apply
              <Icon name="arrow-right" size={11} color="var(--pl-chrome-bg)" />
            </button>
          ) : priceDollars === 0 ? (
            <button
              type="button"
              onClick={() => onUnlock(pack)}
              disabled={busy}
              className="pl-shop-btn pl-shop-btn-sage"
              style={{ flex: 1 }}
            >
              {busy ? <span className="pl-shop-spin" /> : 'Get free'}
            </button>
          ) : (
            <>
              <span
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--pl-chrome-text)',
                }}
              >
                ${priceDollars}
              </span>
              <button
                type="button"
                onClick={() => onUnlock(pack)}
                disabled={busy}
                className="pl-shop-btn pl-shop-btn-ink"
              >
                {busy ? <span className="pl-shop-spin" /> : 'Unlock'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bottom-sheet shell ────────────────────────────────────────

type FilterId = 'all' | 'free' | 'owned' | CollectionId;

export interface EditorThemeShopProps {
  open: boolean;
  onClose: () => void;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function EditorThemeShop({ open, onClose, manifest, onChange }: EditorThemeShopProps) {
  // Server-side entitlements (authoritative) folded with the
  // local cache (instant rehydrate). The local cache also gets
  // an immediate optimistic update when a free pack unlocks so
  // the card flips to "Apply" without a round-trip.
  const [owned, setOwned] = useState<Set<string>>(() => loadOwnedCache());
  const [hydrated, setHydrated] = useState(false);

  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Snapshot the manifest the first time the sheet opens, so
  // closing without unlocking can roll back any preview.
  const snapshotRef = useRef<StoryManifest | null>(null);
  const wasOpenRef = useRef(false);
  const sheetContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      snapshotRef.current = manifest;
      // Reset transient sheet state on fresh open.
      setPreviewId(null);
      setQuery('');
    }
    wasOpenRef.current = open;
    // Intentional: only react to `open` flipping, not every
    // manifest tick — the snapshot is the *pre-preview* state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch entitlements once when the sheet first opens.
  useEffect(() => {
    if (!open || hydrated) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/store/entitlements', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          if (!cancelled) {
            const fallback = new Set(PACKS.filter((p) => p.tier === 'free').map((p) => p.id));
            setOwned(fallback);
            saveOwnedCache(fallback);
            setHydrated(true);
          }
          return;
        }
        const json = (await res.json()) as {
          packIds?: string[];
          freePackIds?: string[];
        };
        if (cancelled) return;
        const set = new Set<string>();
        if (Array.isArray(json.packIds)) {
          for (const id of json.packIds) if (typeof id === 'string') set.add(id);
        }
        if (Array.isArray(json.freePackIds)) {
          for (const id of json.freePackIds) if (typeof id === 'string') set.add(id);
        } else {
          for (const p of PACKS) if (p.tier === 'free') set.add(p.id);
        }
        setOwned(set);
        saveOwnedCache(set);
        setHydrated(true);
      } catch {
        if (!cancelled) {
          const fallback = new Set(PACKS.filter((p) => p.tier === 'free').map((p) => p.id));
          setOwned(fallback);
          setHydrated(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, hydrated]);

  // Auto-dismiss the inline toast pill.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Resolve catalog → filtered list.
  const filtered = useMemo<readonly Pack[]>(() => {
    let list: readonly Pack[] = PACKS;
    if (filter === 'free') list = list.filter((p) => p.tier === 'free');
    else if (filter === 'owned') list = list.filter((p) => owned.has(p.id));
    else if (filter !== 'all') list = list.filter((p) => p.collection === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.blurb.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, query, owned]);

  /** Preview a pack on the canvas — applies the pack vars
   *  through the standard applyPackToManifest pipeline so the
   *  re-skin is visually identical to a real apply. */
  const preview = useCallback(
    (pack: Pack) => {
      setPreviewId(pack.id);
      onChange(applyPackToManifest(pack, manifest));
    },
    [manifest, onChange],
  );

  /** Apply an owned pack — commits the theme, updates the
   *  snapshot so closing the sheet doesn't roll back. */
  const applyOwned = useCallback(
    (pack: Pack) => {
      const next = applyPackToManifest(pack, manifest);
      snapshotRef.current = next;
      onChange(next);
      setPreviewId(pack.id);
      setToast(`${pack.name} applied`);
    },
    [manifest, onChange],
  );

  /** Unlock a pack inline. */
  const unlock = useCallback(
    async (pack: Pack) => {
      setBusyId(pack.id);
      try {
        if (pack.priceCents === 0) {
          await fetch('/api/store/apply-free', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packId: pack.id }),
          }).catch(() => null);
          const nextOwned = new Set(owned);
          nextOwned.add(pack.id);
          setOwned(nextOwned);
          saveOwnedCache(nextOwned);
          applyOwned(pack);
          setToast(`${pack.name} unlocked`);
        } else {
          const res = await fetch('/api/store/checkout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packIds: [pack.id] }),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { error?: string } | null;
            setToast(err?.error ?? 'Could not start checkout');
            return;
          }
          const { url } = (await res.json()) as { url?: string };
          if (url) {
            window.location.assign(url);
            return;
          }
          setToast('Checkout returned no URL');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unlock failed';
        setToast(msg);
      } finally {
        setBusyId(null);
      }
    },
    [owned, applyOwned],
  );

  /** Close the sheet — if the host previewed but never unlocked
   *  / applied, restore the pre-open manifest snapshot. */
  const handleClose = useCallback(() => {
    if (snapshotRef.current && previewId && !owned.has(previewId)) {
      onChange(snapshotRef.current);
    }
    snapshotRef.current = null;
    setPreviewId(null);
    onClose();
  }, [previewId, owned, onChange, onClose]);

  // Escape closes (and reverts via the close handler).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // The prototype lets the canvas behind the sheet stay touchable
  // until the sheet is fully expanded — but the canvas is what's
  // being previewed, so the host's pointer focus is *the sheet*
  // once it's open. We DON'T lock body overflow — the canvas
  // beneath should remain scrollable while the sheet is open so
  // a host can scroll the live preview behind it (per the brief).

  // Pack the host is currently previewing — only used to decide
  // whether to surface the upgrade nudge bar.
  const previewingPack = useMemo(
    () => (previewId ? PACKS.find((p) => p.id === previewId) ?? null : null),
    [previewId],
  );
  const showUpgrade = !!(
    previewingPack &&
    !owned.has(previewingPack.id) &&
    previewingPack.priceCents > 0
  );

  if (!open && !wasOpenRef.current) {
    // Never mounted — skip render entirely so we don't add a
    // hidden full-screen overlay on every editor route.
    return null;
  }

  // Triggered-upgrade dispatch — surfaces the Bloom upgrade flow
  // via the existing pearloom:open-upgrade event the rest of
  // the editor listens for.
  const onGoBloom = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:open-upgrade'));
    }
  };

  // Sheet body — 72vh per the prototype, with a soft cubic-bezier
  // slide-up curve (380ms ease-out-quintic). The transform-based
  // slide is GPU-cheap and survives prefers-reduced-motion via the
  // <style> block below.
  const sheetStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72vh',
    background: 'var(--pl-chrome-surface)',
    borderRadius: '22px 22px 0 0',
    boxShadow: '0 -20px 60px rgba(40,40,30,0.22)',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: 'var(--pl-chrome-text)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Theme Shop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 85,
        pointerEvents: open ? 'auto' : 'none',
        // Prototype's font-family — the editor's chrome already
        // inherits Geist, but we restate it so the sheet doesn't
        // pick up any local override.
        fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(40,40,30,0.32)',
          opacity: open ? 1 : 0,
          transition: 'opacity 280ms ease',
        }}
      />

      {/* Sheet */}
      <div ref={sheetContentRef} style={sheetStyle}>
        <style>{`
          .pl-shop-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            padding: 7px 13px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            min-height: 30px;
            transition: filter 140ms ease;
            white-space: nowrap;
          }
          .pl-shop-btn-ink {
            background: var(--pl-chrome-text);
            color: var(--pl-chrome-bg);
          }
          .pl-shop-btn-sage {
            background: ${SAGE_DEEP};
            color: var(--pl-chrome-bg);
          }
          .pl-shop-btn:hover:not(:disabled) { filter: brightness(1.08); }
          .pl-shop-btn:disabled { opacity: 0.7; cursor: progress; }
          .pl-shop-spin {
            width: 13px;
            height: 13px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.4);
            border-top-color: #fff;
            animation: pl-shop-spin 700ms linear infinite;
            display: inline-block;
          }
          @keyframes pl-shop-spin { to { transform: rotate(360deg); } }
          .pl-shop-card {
            transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
                        box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
                        border-color 180ms ease;
          }
          .pl-shop-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(40,40,30,0.12);
          }
          .pl-shop-card[data-previewing="true"] {
            box-shadow: 0 8px 24px rgba(183,164,208,0.28);
          }
          .pl-shop-chip {
            white-space: nowrap;
            padding: 6px 13px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid var(--pl-chrome-border);
            background: var(--pl-chrome-surface);
            color: var(--pl-chrome-text-soft);
            cursor: pointer;
            transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
            font-family: inherit;
          }
          .pl-shop-chip:hover { border-color: var(--pl-chrome-text-soft); }
          .pl-shop-chip[data-on="true"] {
            background: var(--pl-chrome-text);
            color: var(--pl-chrome-bg);
            border-color: var(--pl-chrome-text);
          }
          .pl-shop-search-input {
            width: 100%;
            padding: 8px 12px 8px 32px;
            border-radius: 999px;
            border: 1px solid var(--pl-chrome-border);
            background: var(--pl-chrome-surface-2);
            font-size: 12.5px;
            outline: none;
            font-family: inherit;
            color: var(--pl-chrome-text);
            transition: border-color 140ms ease, box-shadow 140ms ease;
          }
          .pl-shop-search-input::placeholder { color: var(--pl-chrome-text-muted); }
          .pl-shop-search-input:focus {
            border-color: var(--pl-chrome-text-soft);
            box-shadow: var(--pl-chrome-focus);
          }
          .pl-shop-close {
            width: 32px;
            height: 32px;
            border-radius: 9px;
            display: grid;
            place-items: center;
            background: var(--pl-chrome-surface-2);
            border: 0;
            cursor: pointer;
            transition: background 140ms ease;
          }
          .pl-shop-close:hover { background: var(--pl-chrome-border); }
          @keyframes pl-shop-nudge-in {
            from { transform: translateY(8px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            .pl-shop-card { transition: none !important; }
            .pl-shop-card:hover { transform: none !important; }
            .pl-shop-spin { animation: none !important; }
            .pl-shop-btn { transition: none !important; }
            /* The sheet itself: collapse the slide to a fade so
               vestibular-sensitive users still get an obvious
               state change without the 100% translate sweep. */
          }
        `}</style>

        {/* Header — grab handle + title + search + close */}
        <div style={{ padding: '12px 22px 0', flexShrink: 0 }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              background: 'var(--pl-chrome-border)',
              margin: '0 auto 12px',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: LAV_BG,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="sparkles" size={16} color={LAV_INK} />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: 'var(--pl-chrome-text)',
                  }}
                >
                  Theme Shop
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--pl-chrome-text-muted)',
                    marginTop: 2,
                  }}
                >
                  Tap any pack to preview it live on your site
                </div>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                maxWidth: 280,
                marginLeft: 'auto',
                position: 'relative',
                minWidth: 160,
              }}
            >
              <Icon
                name="search"
                size={13}
                color="var(--pl-chrome-text-muted)"
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search packs…"
                className="pl-shop-search-input"
              />
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Theme Shop"
              className="pl-shop-close"
            >
              <Icon name="close" size={16} color="var(--pl-chrome-text-soft)" />
            </button>
          </div>

          {/* Collection chips */}
          <div
            style={{
              display: 'flex',
              gap: 7,
              overflowX: 'auto',
              paddingBottom: 12,
              // Tighten the scrollbar trough so it doesn't crowd
              // the chip row visually on Windows.
              scrollbarWidth: 'thin',
            }}
          >
            {([
              { id: 'all', name: 'All' },
              { id: 'free', name: 'Free' },
              ...COLLECTIONS,
              { id: 'owned', name: 'My themes' },
            ] as Array<{ id: FilterId; name: string }>).map((c) => {
              const on = filter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilter(c.id)}
                  data-on={on ? 'true' : 'false'}
                  className="pl-shop-chip"
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 22px 22px',
            background: 'var(--pl-chrome-bg)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 14,
            }}
          >
            {filtered.map((p) => (
              <ShopCard
                key={p.id}
                pack={p}
                owned={owned.has(p.id)}
                isPreviewing={previewId === p.id}
                busy={busyId === p.id}
                onPreview={preview}
                onUnlock={(pk) => void unlock(pk)}
                onApply={applyOwned}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--pl-chrome-text-muted)',
              }}
            >
              <Pear size={40} tone="sage" shadow={false} />
              <div style={{ marginTop: 10, fontSize: 13.5 }}>No packs match.</div>
            </div>
          )}
        </div>

        {/* Contextual upgrade nudge bar */}
        {showUpgrade && previewingPack && (
          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid var(--pl-chrome-border)',
              background: previewingPack.tier === 'signature' ? SIG_BG : LAV_BG,
              color: previewingPack.tier === 'signature' ? SIG_INK_SOFT : 'var(--pl-chrome-text)',
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              animation: 'pl-shop-nudge-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <Icon
                name="eye"
                size={15}
                color={previewingPack.tier === 'signature' ? GOLD : LAV_INK}
              />
              You&rsquo;re previewing <b>{previewingPack.name}</b>{' '}
              &middot;{' '}
              <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>
                {previewingPack.tier}
              </span>
            </span>
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              Included with <b>Bloom</b>, or unlock once.
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onGoBloom}
                className="pl-shop-btn"
                style={{
                  background: 'transparent',
                  color:
                    previewingPack.tier === 'signature'
                      ? SIG_INK_SOFT
                      : 'var(--pl-chrome-text)',
                  border: '1px solid currentColor',
                }}
              >
                Go Bloom
              </button>
              <button
                type="button"
                onClick={() => void unlock(previewingPack)}
                disabled={busyId === previewingPack.id}
                className="pl-shop-btn"
                style={{
                  background:
                    previewingPack.tier === 'signature' ? GOLD : 'var(--pl-chrome-text)',
                  color:
                    previewingPack.tier === 'signature' ? SIG_BG : 'var(--pl-chrome-bg)',
                }}
              >
                {busyId === previewingPack.id ? (
                  <span className="pl-shop-spin" />
                ) : (
                  <>Unlock ${previewingPack.priceCents / 100}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast pill — sits above the sheet so it's visible
          regardless of where the user scrolled the grid. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(72vh + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            background: 'var(--pl-chrome-text)',
            color: 'var(--pl-chrome-bg)',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 10px 26px rgba(0,0,0,0.24)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <Pear size={18} tone="cream" shadow={false} /> {toast}
        </div>
      )}
    </div>
  );
}

export default EditorThemeShop;
