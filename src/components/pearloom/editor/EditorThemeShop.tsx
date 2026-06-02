'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/editor/EditorThemeShop.tsx
//
// In-editor Theme Shop — a bottom-sheet drawer that lets the
// host browse + preview + unlock theme packs without leaving
// the canvas. Port of ClaudeDesign/pages/theme-shop.jsx but
// wired to the production catalog + entitlements + Stripe.
//
// What makes this DISTINCT from /store:
//   • Slides up over the lower canvas; the live site re-skins
//     behind the sheet as you Try packs (apply pack vars
//     directly to the open manifest via onChange).
//   • No cart — Unlock morphs inline: spinner → owned →
//     auto-apply. Free packs hit /api/store/apply-free; paid
//     packs redirect to /api/store/checkout (single-item
//     checkout session).
//   • Closing the sheet without unlocking RESTORES the
//     pre-preview manifest snapshot, so a preview never
//     accidentally becomes the host's saved theme.
//   • Contextual upgrade bar slides up when the host is
//     previewing an unowned Premium/Signature pack ("Included
//     with Bloom — Go Bloom · Unlock $X").
//
// Persistence: localStorage 'pl-store-owned' mirrors the
// server-side entitlements for instant rehydrate (so the
// sheet doesn't flicker the "Unlock" button on reopen). The
// authoritative source is still /api/store/entitlements.
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

// ─── Tier tag pill ─────────────────────────────────────────────

function TierTag({ tier }: { tier: Pack['tier'] }) {
  const palette: Record<Pack['tier'], { bg: string; fg: string; label: string }> = {
    free: { bg: 'rgba(123,138,93,0.20)', fg: '#3D4A1F', label: 'Free' },
    premium: { bg: 'rgba(149,141,176,0.22)', fg: '#5C4F8C', label: 'Premium' },
    signature: { bg: '#231F33', fg: '#E5D6A8', label: 'Signature' },
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

function ShopCard({ pack, owned, isPreviewing, busy, onPreview, onUnlock, onApply }: ShopCardProps) {
  const priceDollars = pack.priceCents / 100;
  return (
    <div
      className="pl-lift"
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: isPreviewing
          ? '2px solid var(--lavender-2, #B7A4D0)'
          : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        background: 'var(--card, #FBF7EE)',
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
        }}
        aria-label={`Preview ${pack.name} on the canvas`}
      >
        <PackPreview pack={pack} height={116} />
        <span style={{ position: 'absolute', top: 8, left: 8 }}>
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
              color: '#3D4A1F',
              fontSize: 9,
              fontWeight: 800,
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
              background: 'var(--lavender-2, #B7A4D0)',
              color: '#3D4A1F',
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="eye" size={10} color="#3D4A1F" />
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
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #0E0D0B)' }}>{pack.name}</div>
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
              <Icon name="arrow-right" size={11} color="var(--cream, #F5EFE2)" />
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
              <span style={{ fontFamily: 'var(--font-display, serif)', fontSize: 15, fontWeight: 700 }}>
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
  // The snapshot is captured on every fresh open (open false →
  // true) — applying an owned pack while open commits the new
  // theme; the snapshot is overwritten on next open.
  const snapshotRef = useRef<StoryManifest | null>(null);
  const wasOpenRef = useRef(false);

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

  // Fetch entitlements once when the sheet first opens. Free
  // packs are folded server-side via /api/store/entitlements
  // (which returns freePackIds alongside the paid packIds).
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
          // 401 / 404 / network — silently fall back to free-only
          // ownership from the catalog.
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
          // Backstop with the catalog so a degraded response
          // still shows the free shelf as owned.
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

  // Escape closes (and reverts via the close handler below).
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Body scroll lock while the sheet is open so the canvas behind
  // doesn't move under finger-scrolling on touch devices.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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
   *  re-skin is visually identical to a real apply. The
   *  manifest snapshot taken on sheet open is what restores
   *  on close-without-unlock. */
  const preview = useCallback(
    (pack: Pack) => {
      setPreviewId(pack.id);
      onChange(applyPackToManifest(pack, manifest));
    },
    [manifest, onChange],
  );

  /** Apply an owned pack — commits the theme, clears the
   *  preview indicator, and updates the snapshot so closing
   *  the sheet doesn't roll back the apply. */
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

  /** Unlock a pack inline — free packs hit /api/store/apply-free,
   *  paid packs redirect to Stripe Checkout. Free unlocks
   *  optimistically update the owned set + cache and auto-apply
   *  the pack so the host sees the result without another tap. */
  const unlock = useCallback(
    async (pack: Pack) => {
      setBusyId(pack.id);
      try {
        if (pack.priceCents === 0) {
          // Free path — synchronous-feeling but spins briefly so
          // the morph reads as a real action, not a no-op.
          await fetch('/api/store/apply-free', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packId: pack.id }),
          }).catch(() => null);
          // Optimistic: mark owned locally + cache, auto-apply.
          const nextOwned = new Set(owned);
          nextOwned.add(pack.id);
          setOwned(nextOwned);
          saveOwnedCache(nextOwned);
          applyOwned(pack);
          setToast(`${pack.name} unlocked`);
        } else {
          // Paid path — single-item checkout session, then redirect.
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
            // The Stripe webhook is what actually grants
            // entitlement; on return we'll re-hydrate from
            // /api/store/entitlements and the pack will read
            // as owned.
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

  // Sheet body height — 72vh per the prototype, with a soft
  // cubic-bezier slide-up curve.
  const sheetStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72vh',
    background: 'var(--card, #FBF7EE)',
    borderRadius: '22px 22px 0 0',
    boxShadow: '0 -20px 60px rgba(40,40,30,0.22)',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  if (!open && !wasOpenRef.current) {
    // Never mounted — skip render entirely so we don't add a
    // hidden full-screen overlay on every editor route.
    return null;
  }

  // Triggered-upgrade dispatch — surfaces the Bloom upgrade flow
  // via the existing pearloom:open-upgrade event the rest of
  // the editor listens for. Other surfaces (PricingPreview,
  // PearNudges) wire the listener.
  const onGoBloom = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:open-upgrade'));
    }
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
      <div style={sheetStyle}>
        <style>{`
          .pl-shop-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 13px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; min-height: 30px; transition: filter 140ms ease; }
          .pl-shop-btn-ink { background: var(--ink, #0E0D0B); color: var(--cream, #F5EFE2); }
          .pl-shop-btn-sage { background: var(--sage-deep, #5C6B3F); color: var(--cream, #F5EFE2); }
          .pl-shop-btn:hover:not(:disabled) { filter: brightness(1.08); }
          .pl-shop-btn:disabled { opacity: 0.7; cursor: progress; }
          .pl-shop-spin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; animation: pl-shop-spin 700ms linear infinite; display: inline-block; }
          @keyframes pl-shop-spin { to { transform: rotate(360deg); } }
          .pl-lift { transition: transform 180ms ease, box-shadow 180ms ease; }
          .pl-lift:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(40,40,30,0.10); }
        `}</style>

        {/* Header — grab handle + title + search + close */}
        <div style={{ padding: '12px 22px 0' }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              background: 'var(--line, rgba(14,13,11,0.16))',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'var(--lavender-bg, rgba(149,141,176,0.18))',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="sparkles" size={16} color="var(--lavender-ink, #5C4F8C)" />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display, serif)',
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1,
                    color: 'var(--ink, #0E0D0B)',
                  }}
                >
                  Theme Shop
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', marginTop: 2 }}>
                  Tap any pack to preview it live on your site
                </div>
              </div>
            </div>
            <div style={{ flex: 1, maxWidth: 280, marginLeft: 'auto', position: 'relative', minWidth: 160 }}>
              <Icon
                name="search"
                size={13}
                color="var(--ink-muted, #6F6557)"
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search packs…"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 999,
                  border: '1px solid var(--line, rgba(14,13,11,0.16))',
                  background: 'var(--cream-2, #EBE3D2)',
                  fontSize: 12.5,
                  outline: 'none',
                  fontFamily: 'var(--font-ui, inherit)',
                  color: 'var(--ink, #0E0D0B)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Theme Shop"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--cream-2, #EBE3D2)',
                border: 0,
                cursor: 'pointer',
              }}
            >
              <Icon name="close" size={16} color="var(--ink-soft, #3A332C)" />
            </button>
          </div>

          {/* Collection chips */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12 }}>
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
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 13px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: on ? 'var(--ink, #0E0D0B)' : 'var(--line, rgba(14,13,11,0.16))',
                    background: on ? 'var(--ink, #0E0D0B)' : 'var(--card, #FBF7EE)',
                    color: on ? 'var(--cream, #F5EFE2)' : 'var(--ink-soft, #3A332C)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui, inherit)',
                  }}
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
            background: 'var(--cream, #F5EFE2)',
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
                color: 'var(--ink-muted, #6F6557)',
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
              borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
              background:
                previewingPack.tier === 'signature' ? '#231F33' : 'var(--lavender-bg, rgba(149,141,176,0.18))',
              color: previewingPack.tier === 'signature' ? '#EDE7DA' : 'var(--ink, #0E0D0B)',
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              animation: 'pl-shop-nudge-in 220ms ease',
            }}
          >
            <style>{`
              @keyframes pl-shop-nudge-in { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Icon
                name="eye"
                size={15}
                color={
                  previewingPack.tier === 'signature'
                    ? 'var(--gold, #B8935A)'
                    : 'var(--lavender-ink, #5C4F8C)'
                }
              />
              You’re previewing <b>{previewingPack.name}</b> ·{' '}
              <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{previewingPack.tier}</span>
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
                  color: previewingPack.tier === 'signature' ? '#EDE7DA' : 'var(--ink, #0E0D0B)',
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
                    previewingPack.tier === 'signature' ? 'var(--gold, #B8935A)' : 'var(--ink, #0E0D0B)',
                  color: previewingPack.tier === 'signature' ? '#231F33' : 'var(--cream, #F5EFE2)',
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
            background: 'var(--ink, #0E0D0B)',
            color: 'var(--cream, #F5EFE2)',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 10px 26px rgba(0,0,0,0.24)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-ui, inherit)',
          }}
        >
          <Pear size={18} tone="cream" shadow={false} /> {toast}
        </div>
      )}
    </div>
  );
}

export default EditorThemeShop;
