'use client';

/* eslint-disable no-restricted-syntax */
// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/editor/EditorThemeShop.tsx
//
// LITERAL PORT of ClaudeDesign/pages/theme-shop.jsx.
//
// JSX structure, classNames, inline styles, animations, and
// keyframes are copied verbatim from the prototype. ONLY the
// data accessors swap to production:
//   • prototype's STORE_PACKS         → import { PACKS }
//   • prototype's STORE_COLLECTIONS   → import { COLLECTIONS }
//   • prototype's localStorage owned  → /api/store/entitlements
//                                       + 'pl-store-owned' cache
//   • prototype's setTimeout unlock   → /api/store/apply-free
//                                       (free) or /api/store/checkout
//                                       (paid) — Stripe-wired
//   • prototype's preview apply       → applyPackToManifest()
//                                       through onChange
//   • prototype's ShopPreview         → PackPreview (the production
//                                       component renders the same
//                                       textured vignette)
//
// The prototype's brand tokens (--cream, --ink, --card, --line,
// --line-soft, --lavender-bg, --lavender-2, --lavender-ink,
// --sage-tint, --sage-deep, --cream-2, --gold, --ink-soft,
// --ink-muted, --font-display) are defined globally in
// src/app/pearloom.css and src/app/globals.css. We bind to them
// directly per the literal-port mandate; the file-level ESLint
// disable above suppresses the editor-chrome guard for this
// surface specifically (the shop renders OVER the canvas and is
// allowed to inherit warm cream chrome).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { StoryManifest } from '@/types';
import { PACKS, COLLECTIONS, type Pack, type CollectionId } from '@/lib/theme-store/packs';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import { PackPreview } from '../store/PackPreview';
import { Icon, Pear } from '../motifs';

// ─── localStorage owned cache (prototype's pl-store-owned) ───

const SHOP_OWNED_KEY = 'pl-store-owned';

function shopLoadOwned(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SHOP_OWNED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function shopSaveOwned(s: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify([...s]));
  } catch {
    /* localStorage disabled or full — server entitlements remain authoritative */
  }
}

// ─── ShopPreview — uses production PackPreview for the textured vignette ───

function ShopPreview({ pack, h = 116 }: { pack: Pack; h?: number }) {
  return <PackPreview pack={pack} height={h} />;
}

// ─── TierTag — verbatim from prototype ──────────────────────────

function TierTag({ tier }: { tier: 'Free' | 'Premium' | 'Signature' }) {
  const m =
    {
      Free: ['var(--sage-tint)', 'var(--sage-deep)'],
      Premium: ['var(--lavender-bg)', 'var(--lavender-ink)'],
      Signature: ['#231F33', '#E5D6A8'],
    }[tier] || ['var(--cream-2)', 'var(--ink-soft)'];
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: m[0],
        color: m[1],
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {tier}
    </span>
  );
}

// Pack tier (production: free/premium/signature lowercase) →
// prototype display label (Free/Premium/Signature).
function tierLabel(tier: Pack['tier']): 'Free' | 'Premium' | 'Signature' {
  if (tier === 'free') return 'Free';
  if (tier === 'signature') return 'Signature';
  return 'Premium';
}

// ─── ShopCard — verbatim from prototype ─────────────────────────

interface ShopCardProps {
  pack: Pack;
  owned: boolean;
  isTrying: boolean;
  busy: boolean;
  onTry: (pack: Pack) => void;
  onUnlock: (pack: Pack) => void;
  onApply: (pack: Pack) => void;
}

function ShopCard({ pack, owned, isTrying, busy, onTry, onUnlock, onApply }: ShopCardProps) {
  const price = pack.priceCents / 100;
  return (
    <div
      className="lift"
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: isTrying ? '2px solid var(--lavender-2)' : '1px solid var(--line-soft)',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onTry(pack)}>
        <ShopPreview pack={pack} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <TierTag tier={tierLabel(pack.tier)} />
        </div>
        {pack.badges && pack.badges.best && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <span
              style={{
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
          </div>
        )}
        {isTrying && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              padding: '3px 9px',
              borderRadius: 999,
              background: 'var(--lavender-2)',
              color: '#3D4A1F',
              fontSize: 10,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="eye" size={10} color="#3D4A1F" /> Previewing
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{pack.name}</div>
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
            <button onClick={() => onApply(pack)} className="shopbtn shopbtn-ink" style={{ flex: 1 }}>
              Apply <Icon name="arrow-right" size={11} color="var(--cream)" />
            </button>
          ) : price === 0 ? (
            <button
              onClick={() => onUnlock(pack)}
              className="shopbtn shopbtn-sage"
              style={{ flex: 1 }}
              disabled={busy}
            >
              {busy ? <span className="shop-spin" /> : 'Get free'}
            </button>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                ${price}
              </span>
              <button
                onClick={() => onUnlock(pack)}
                disabled={busy}
                className="shopbtn shopbtn-ink"
              >
                {busy ? <span className="shop-spin" /> : <>Unlock</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ThemeShop bottom sheet — verbatim from prototype ───────────

export interface EditorThemeShopProps {
  open: boolean;
  onClose: () => void;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  /** Optional id of a pack the host is currently previewing on the
   *  canvas. The prototype lets the parent track tryingId so the
   *  badge stays in sync across screens; the editor's right rail
   *  may also want to subscribe. */
  tryingId?: string | null;
  onTry?: (pack: Pack) => void;
}

type FilterId = 'all' | 'free' | 'owned' | CollectionId;

export function EditorThemeShop({
  open,
  onClose,
  manifest,
  onChange,
  tryingId: tryingIdProp,
  onTry: onTryProp,
}: EditorThemeShopProps) {
  const [owned, setOwned] = useState<Set<string>>(shopLoadOwned);
  const [col, setCol] = useState<FilterId>('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [internalTryingId, setInternalTryingId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // tryingId — caller may control it; otherwise we own it locally.
  const tryingId = tryingIdProp !== undefined ? tryingIdProp : internalTryingId;

  // Snapshot the manifest the first time the sheet opens so a
  // close-without-unlock rolls back any preview.
  const snapshotRef = useRef<StoryManifest | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      snapshotRef.current = manifest;
      setInternalTryingId(null);
      setQ('');
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Hydrate owned set from server entitlements on first open.
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
            shopSaveOwned(fallback);
            setHydrated(true);
          }
          return;
        }
        const json = (await res.json()) as { packIds?: string[]; freePackIds?: string[] };
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
        shopSaveOwned(set);
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

  // Auto-dismiss the toast — prototype timing (2200ms).
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const packs = PACKS;
  const cols = COLLECTIONS;

  const filtered = useMemo<readonly Pack[]>(() => {
    let list: readonly Pack[] = packs;
    if (col === 'free') list = list.filter((p) => p.priceCents === 0);
    else if (col === 'owned') list = list.filter((p) => owned.has(p.id));
    else if (col !== 'all') list = list.filter((p) => p.collection === col);
    const ql = q.trim().toLowerCase();
    if (ql)
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(ql)),
      );
    return list;
  }, [col, q, owned, packs]);

  // Preview a pack — apply its vars through applyPackToManifest so
  // the canvas behind the sheet re-skins in real time.
  const handleTry = useCallback(
    (pack: Pack) => {
      if (onTryProp) {
        onTryProp(pack);
      } else {
        setInternalTryingId(pack.id);
      }
      onChange(applyPackToManifest(pack, manifest));
    },
    [manifest, onChange, onTryProp],
  );

  // Apply an owned pack — commits the theme and updates the
  // snapshot so closing won't roll back.
  const handleApply = useCallback(
    (pack: Pack) => {
      const next = applyPackToManifest(pack, manifest);
      snapshotRef.current = next;
      onChange(next);
      if (!onTryProp) setInternalTryingId(pack.id);
      setToast(`${pack.name} applied`);
    },
    [manifest, onChange, onTryProp],
  );

  // Unlock — free packs hit /api/store/apply-free, paid packs
  // redirect to Stripe via /api/store/checkout. Prototype's setTimeout
  // morph is preserved by the spinner state.
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
          const next = new Set([...owned, pack.id]);
          setOwned(next);
          shopSaveOwned(next);
          handleApply(pack);
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
    [owned, handleApply],
  );

  // Close — roll back preview if not unlocked / applied.
  const handleClose = useCallback(() => {
    if (snapshotRef.current && tryingId && !owned.has(tryingId)) {
      onChange(snapshotRef.current);
    }
    snapshotRef.current = null;
    if (!onTryProp) setInternalTryingId(null);
    onClose();
  }, [tryingId, owned, onChange, onClose, onTryProp]);

  // Escape closes.
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

  if (!open && !wasOpenRef.current) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 85,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
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
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '72vh',
          background: 'var(--card)',
          borderRadius: '22px 22px 0 0',
          boxShadow: '0 -20px 60px rgba(40,40,30,0.22)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 380ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <style>{`
          .shopbtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 13px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:none;min-height:30px;transition:filter .14s}
          .shopbtn-ink{background:var(--ink);color:var(--cream)} .shopbtn-sage{background:var(--sage-deep);color:var(--cream)} .shopbtn:hover{filter:brightness(1.08)}
          .shop-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;animation:shop-spin .7s linear infinite;display:inline-block}
          @keyframes shop-spin{to{transform:rotate(360deg)}}
          @keyframes cmd-in{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        `}</style>
        {/* grab handle + header */}
        <div style={{ padding: '12px 22px 0' }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 999,
              background: 'var(--line)',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'var(--lavender-bg)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="sparkles" size={16} color="var(--lavender-ink)" />
              </span>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  Theme Shop
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                  Tap any pack to preview it live on your site
                </div>
              </div>
            </div>
            <div style={{ flex: 1, maxWidth: 280, marginLeft: 'auto', position: 'relative' }}>
              <Icon
                name="search"
                size={13}
                color="var(--ink-muted)"
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search packs…"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  background: 'var(--cream-2)',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--cream-2)',
                border: 0,
                cursor: 'pointer',
              }}
            >
              <Icon name="close" size={16} color="var(--ink-soft)" />
            </button>
          </div>
          {/* collection chips */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12 }}>
            {(
              [
                { id: 'all', name: 'All' },
                { id: 'free', name: 'Free' },
                ...cols,
                { id: 'owned', name: 'My themes' },
              ] as Array<{ id: FilterId; name: string }>
            ).map((c) => {
              const on = col === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCol(c.id)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 13px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: on ? 'var(--ink)' : 'var(--line)',
                    background: on ? 'var(--ink)' : 'var(--card)',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)',
                    cursor: 'pointer',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
        {/* grid */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 22px 22px',
            background: 'var(--cream)',
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
                isTrying={tryingId === p.id}
                busy={busyId === p.id}
                onTry={handleTry}
                onUnlock={(pk) => void unlock(pk)}
                onApply={handleApply}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)' }}>
              <Pear size={40} tone="sage" shadow={false} />
              <div style={{ marginTop: 10, fontSize: 13.5 }}>No packs match.</div>
            </div>
          )}
        </div>
        {(() => {
          const tp = tryingId ? packs.find((p) => p.id === tryingId) : null;
          if (!tp || owned.has(tp.id) || tp.priceCents === 0) return null;
          const tpTier = tierLabel(tp.tier);
          const price = tp.priceCents / 100;
          return (
            <div
              style={{
                flexShrink: 0,
                borderTop: '1px solid var(--line-soft)',
                background: tpTier === 'Signature' ? '#231F33' : 'var(--lavender-bg)',
                color: tpTier === 'Signature' ? '#EDE7DA' : 'var(--ink)',
                padding: '12px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
                animation: 'cmd-in 220ms ease',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Icon
                  name="eye"
                  size={15}
                  color={tpTier === 'Signature' ? 'var(--gold)' : 'var(--lavender-ink)'}
                />
                You&rsquo;re previewing <b>{tp.name}</b> ·{' '}
                <span style={{ opacity: 0.7 }}>{tpTier}</span>
              </span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                Included with <b>Bloom</b>, or unlock once.
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    try {
                      window.dispatchEvent(new CustomEvent('pl-open-upgrade'));
                      window.dispatchEvent(new CustomEvent('pearloom:open-upgrade'));
                    } catch {
                      /* noop */
                    }
                  }}
                  className="shopbtn"
                  style={{
                    background: 'transparent',
                    color: tpTier === 'Signature' ? '#EDE7DA' : 'var(--ink)',
                    border: '1px solid currentColor',
                  }}
                >
                  Go Bloom
                </button>
                <button
                  onClick={() => void unlock(tp)}
                  disabled={busyId === tp.id}
                  className="shopbtn"
                  style={{
                    background: tpTier === 'Signature' ? 'var(--gold)' : 'var(--ink)',
                    color: tpTier === 'Signature' ? '#231F33' : 'var(--cream)',
                  }}
                >
                  {busyId === tp.id ? <span className="shop-spin" /> : <>Unlock ${price}</>}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(72vh + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            background: 'var(--ink)',
            color: 'var(--cream)',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 10px 26px rgba(0,0,0,0.24)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Pear size={18} tone="cream" shadow={false} /> {toast}
        </div>
      )}
    </div>
  );
}

export default EditorThemeShop;
