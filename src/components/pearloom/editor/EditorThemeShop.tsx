'use client';

/* eslint-disable no-restricted-syntax */
/* =========================================================================
   PEARLOOM — IN-EDITOR THEME SHOP (bottom sheet)

   Redesigned 2026-06-12 (host: "fully redo the theme shop popup…
   it looks really bad"). One glass sheet, editorial header, mono
   collection chips, and cards built around the pack preview with
   a single clear action each. Tap a card to TRY it on the live
   canvas behind the sheet; the bottom bar carries the unlock.

   TRY-ANYTHING-SAFELY, now leak-proof: previews paint over the
   live canvas (and ride the editor's autosave), so every exit
   path restores the open-time snapshot — closing the sheet,
   AND pressing Unlock (we restore BEFORE redirecting to Stripe;
   the previous version navigated away with the preview still on
   the manifest, so an abandoned checkout kept the premium look
   forever). A `pl-shop-resume` stash greets the host on return.
   ========================================================================= */

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { PACKS as STORE_PACKS, COLLECTIONS as STORE_COLLECTIONS, type Pack } from '@/lib/theme-store/packs';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import { StoreFonts } from '@/lib/theme-store/fonts';
import { PackPreview } from '../store/PackPreview';
import { Icon, Pear } from '../motifs';
import { UndoToast, fireUndoable } from '../redesign/UndoToast';
import { useIsMobile } from '../redesign/use-nav-hooks';

const SHOP_OWNED_KEY = 'pl-store-owned';
const SHOP_RESUME_KEY = 'pl-shop-resume';
function shopLoadOwned(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(SHOP_OWNED_KEY) || '[]')); } catch { return new Set(); } }

function tierLabel(tier: Pack['tier']): 'Free' | 'Premium' | 'Signature' {
  if (tier === 'free') return 'Free';
  if (tier === 'signature') return 'Signature';
  return 'Premium';
}

const TIER_TONES: Record<string, [string, string]> = {
  Free: ['var(--sage-tint)', 'var(--sage-deep)'],
  Premium: ['var(--lavender-bg)', 'var(--lavender-ink)'],
  Signature: ['#231F33', '#E5D6A8'],
};

function TierTag({ tier }: { tier: 'Free' | 'Premium' | 'Signature' }) {
  const tone = TIER_TONES[tier] ?? ['var(--cream-2)', 'var(--ink-soft)'];
  return (
    <span style={{ padding: '3px 9px', borderRadius: 999, background: tone[0], color: tone[1], fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {tier}
    </span>
  );
}

/* ── Card — preview-led, one action, "on your site" state. ── */
function ShopCard({ pack, owned, isTrying, onTry, onApply }: {
  pack: Pack;
  owned: boolean;
  isTrying: boolean;
  onTry: (p: Pack) => void;
  onApply: (p: Pack) => void;
}) {
  const price = pack.priceCents / 100;
  return (
    <button
      type="button"
      onClick={() => onTry(pack)}
      aria-pressed={isTrying}
      className="lift"
      style={{
        display: 'flex', flexDirection: 'column',
        textAlign: 'left', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
        borderRadius: 16, overflow: 'hidden',
        border: isTrying ? '2px solid var(--gold, #C19A4B)' : '1px solid var(--line-soft)',
        background: 'var(--card)',
        boxShadow: isTrying ? '0 10px 28px rgba(193,154,75,0.22)' : '0 2px 10px rgba(40,28,12,0.06)',
        transition: 'box-shadow 180ms ease, border-color 180ms ease',
      }}
    >
      <div style={{ position: 'relative' }}>
        <PackPreview pack={pack} height={128} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}><TierTag tier={tierLabel(pack.tier)} /></div>
        {/* Price rides the preview so the body stays calm. */}
        <span
          style={{
            position: 'absolute', top: 8, right: 8,
            padding: '3px 9px', borderRadius: 999,
            background: 'rgba(251,247,238,0.92)', color: 'var(--pl-ink, #0E0D0B)',
            fontSize: 10.5, fontWeight: 800,
          }}
        >
          {owned ? 'Owned' : price === 0 ? 'Free' : `$${price}`}
        </span>
        {isTrying && (
          <span
            style={{
              position: 'absolute', bottom: 8, left: 8,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--gold, #C19A4B)', color: '#241B0B',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
            }}
          >
            <Icon name="eye" size={10} color="#241B0B" /> On your site
          </span>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pack.name}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            {pack.swatches.slice(0, 4).map((c: string, i: number) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }} />
            ))}
          </div>
        </div>
        {(owned || price === 0) && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onApply(pack); }}
            className="shopbtn shopbtn-ink"
          >
            Apply
          </span>
        )}
      </div>
    </button>
  );
}

export interface EditorThemeShopProps {
  open: boolean;
  onClose: () => void;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

export function EditorThemeShop({ open, onClose, manifest, onChange }: EditorThemeShopProps) {
  const [owned, setOwned] = useState<Set<string>>(shopLoadOwned);
  const [col, setCol] = useState<string>('all');
  const [q, setQ] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tryingId, setTryingId] = useState<string | null>(null);
  /* Desktop gets a floating centered panel — a full-width bottom
     sheet is a phone pattern and read as one on wide screens. */
  const isNarrow = useIsMobile(760);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  /* TRY-ANYTHING-SAFELY — snapshot the manifest the moment the
     sheet opens. Every exit path that isn't a real Apply restores
     it: closing, AND heading to checkout (the preview must never
     ride the autosave out of the building). */
  const manifestRef = useRef(manifest);
  useEffect(() => { manifestRef.current = manifest; }, [manifest]);
  const openSnapshotRef = useRef<StoryManifest | null>(null);
  const appliedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    openSnapshotRef.current = manifestRef.current;
    appliedRef.current = false;
    /* Back from checkout? Greet the host. Entitlements land via
       the webhook + /store/success (shared 'pl-store-owned' key);
       refresh our copy and point them at the pack. Deferred a
       tick — the compiler lint forbids synchronous setState in
       effects (cascading-render risk). */
    const t = setTimeout(() => {
      try {
        const resume = sessionStorage.getItem(SHOP_RESUME_KEY);
        if (!resume) return;
        sessionStorage.removeItem(SHOP_RESUME_KEY);
        const fresh = shopLoadOwned();
        setOwned(fresh);
        const pack = STORE_PACKS.find((p) => p.id === resume);
        if (pack && fresh.has(pack.id)) {
          setCol('owned');
          setToast(`${pack.name} is yours — tap Apply`);
        }
      } catch { /* stash is a nicety */ }
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const packs = STORE_PACKS;
  const cols = STORE_COLLECTIONS;
  const filtered = useMemo(() => {
    let list: readonly Pack[] = packs;
    if (col === 'free') list = list.filter((p) => p.priceCents === 0);
    else if (col === 'owned') list = list.filter((p) => owned.has(p.id));
    else if (col !== 'all') list = list.filter((p) => p.collection === col);
    const ql = q.trim().toLowerCase();
    if (ql) list = list.filter((p) => p.name.toLowerCase().includes(ql) || (p.tags || []).some((t: string) => t.includes(ql)));
    return list;
  }, [col, q, owned, packs]);

  const restoreSnapshot = () => {
    if (tryingId && !appliedRef.current && openSnapshotRef.current) {
      onChange(openSnapshotRef.current);
    }
    setTryingId(null);
  };

  const onTry = (pack: Pack) => {
    setTryingId(pack.id);
    onChange(applyPackToManifest(pack, openSnapshotRef.current ?? manifest));
  };
  const onApply = (pack: Pack) => {
    /* Owned + free packs only — paid unowned packs go through
       unlock(); the card never offers Apply for them. */
    if (!owned.has(pack.id) && pack.priceCents > 0) return;
    const prior = openSnapshotRef.current ?? manifest;
    onChange(applyPackToManifest(pack, prior));
    appliedRef.current = true;
    setTryingId(null);
    fireUndoable(`${pack.name} applied — your old look is one tap away`, () => onChange(prior));
  };

  /* Close = discard any un-applied preview. */
  const handleClose = () => {
    restoreSnapshot();
    onClose();
  };

  const unlock = async (pack: Pack) => {
    setBusyId(pack.id);
    try {
      if (pack.priceCents === 0) {
        await fetch('/api/store/apply-free', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId: pack.id }) }).catch(() => null);
        const next = new Set([...owned, pack.id]);
        setOwned(next);
        try { localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify([...next])); } catch { /* private mode */ }
        setBusyId(null); setToast(`${pack.name} unlocked`);
        onApply(pack);
      } else {
        const res = await fetch('/api/store/checkout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packIds: [pack.id] }) });
        if (!res.ok) { setBusyId(null); setToast('Couldn’t start checkout — try again?'); return; }
        const { url } = (await res.json()) as { url?: string };
        if (url) {
          /* THE FIX — take the preview OFF the manifest before we
             leave. The editor autosaves (and flushes on unload);
             redirecting mid-preview used to PERSIST the premium
             look, so an abandoned checkout kept the theme without
             paying. Restore first; stash the pack so a successful
             checkout greets them with "tap Apply" on return. */
          restoreSnapshot();
          try { sessionStorage.setItem(SHOP_RESUME_KEY, pack.id); } catch { /* nicety */ }
          window.location.assign(url);
          return;
        }
        setBusyId(null); setToast('Checkout returned no URL');
      }
    } catch {
      setBusyId(null); setToast('Unlock failed — try again?');
    }
  };

  const tryingPack = tryingId ? packs.find((p) => p.id === tryingId) ?? null : null;
  const tryingLocked = !!tryingPack && !owned.has(tryingPack.id) && tryingPack.priceCents > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }}>
      <StoreFonts />
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(40,40,30,0.32)', opacity: open ? 1 : 0, transition: 'opacity 280ms ease' }} />
      <div
        style={{
          position: 'absolute',
          left: isNarrow ? 0 : '50%',
          right: isNarrow ? 0 : 'auto',
          bottom: isNarrow ? 0 : 24,
          width: isNarrow ? 'auto' : 'min(1100px, calc(100vw - 48px))',
          height: 'min(76vh, 720px)',
          background: 'var(--pl-glass)',
          backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          borderBottom: isNarrow ? 'none' : '1px solid var(--pl-glass-border)',
          borderRadius: isNarrow ? '24px 24px 0 0' : 24,
          boxShadow: 'var(--pl-glass-shadow-lg, 0 -20px 60px rgba(40,40,30,0.22))',
          transform: open
            ? (isNarrow ? 'translateY(0)' : 'translate(-50%, 0)')
            : (isNarrow ? 'translateY(100%)' : 'translate(-50%, calc(100% + 32px))'),
          transition: 'transform 380ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        } as CSSProperties}
      >
        <style>{`
          .shopbtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:none;min-height:30px;transition:filter .14s;font-family:inherit}
          .shopbtn-ink{background:var(--ink);color:var(--cream)} .shopbtn:hover{filter:brightness(1.1)}
          .shop-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;animation:shop-spin .7s linear infinite;display:inline-block}
          @keyframes shop-spin{to{transform:rotate(360deg)}}
          @keyframes shop-bar-in{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
          .shop-chip{white-space:nowrap;padding:6px 13px;border-radius:999px;font-family:var(--font-mono,ui-monospace,monospace);font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;font-family:inherit;transition:background .14s,color .14s}
        `}</style>

        {/* ── Header — handle, title, search, close. ── */}
        <div style={{ padding: '10px 22px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line)', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, fontWeight: 600, lineHeight: 1, color: 'var(--ink)' }}>
                The Theme Shop
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4 }}>
                Tap a pack to try it on your live site — nothing sticks until you apply.
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 160, maxWidth: 280, marginLeft: 'auto', position: 'relative' }}>
              <Icon name="search" size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search packs…"
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', color: 'var(--ink)' }}
              />
            </div>
            <button onClick={handleClose} aria-label="Close the shop" style={{ width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', border: '1px solid var(--line-soft)', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="close" size={15} color="var(--ink-soft)" />
            </button>
          </div>
          {/* Collections — mono caps chips. */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' } as CSSProperties}>
            {([{ id: 'all', name: 'All' }, { id: 'free', name: 'Free' }, ...cols, { id: 'owned', name: 'My themes' }] as Array<{ id: string; name: string }>).map((c) => {
              const on = col === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCol(c.id)}
                  className="shop-chip"
                  style={{
                    border: on ? '1px solid var(--ink)' : '1px solid var(--line)',
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Grid — translucent over the glass; cards carry the paper. ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px 22px', borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {filtered.map((p) => (
              <ShopCard key={p.id} pack={p} owned={owned.has(p.id)} isTrying={tryingId === p.id} onTry={onTry} onApply={onApply} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-muted)' }}>
              <Pear size={40} tone="sage" shadow={false} />
              <div style={{ marginTop: 10, fontSize: 13.5 }}>Nothing here yet. Try another collection.</div>
            </div>
          )}
        </div>

        {/* ── The decision bar — only while previewing a locked pack. ── */}
        {tryingPack && tryingLocked && (() => {
          const tpTier = tierLabel(tryingPack.tier);
          const dark = tpTier === 'Signature';
          const price = tryingPack.priceCents / 100;
          return (
            <div
              style={{
                flexShrink: 0,
                borderTop: '1px solid var(--line-soft)',
                background: dark ? '#231F33' : 'var(--card)',
                color: dark ? '#EDE7DA' : 'var(--ink)',
                padding: '12px 22px calc(12px + env(safe-area-inset-bottom, 0px))',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                animation: 'shop-bar-in 220ms ease',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, minWidth: 0 }}>
                <Icon name="eye" size={15} color={dark ? 'var(--gold)' : 'var(--lavender-ink)'} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Wearing <b>{tryingPack.name}</b> — yours for <b>${price}</b>, or step out of it.
                </span>
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={restoreSnapshot}
                  className="shopbtn"
                  style={{ background: 'transparent', color: 'inherit', border: '1px solid currentColor' }}
                >
                  Take it off
                </button>
                <button
                  onClick={() => unlock(tryingPack)}
                  disabled={busyId === tryingPack.id}
                  className="shopbtn"
                  style={{ background: dark ? 'var(--gold)' : 'var(--ink)', color: dark ? '#231F33' : 'var(--cream)' }}
                >
                  {busyId === tryingPack.id ? <span className="shop-spin" /> : <>Unlock · ${price}</>}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 'calc(min(76vh, 720px) + 14px)', left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--ink)', color: 'var(--cream)', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: '0 10px 26px rgba(0,0,0,0.24)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Pear size={18} tone="cream" shadow={false} /> {toast}
        </div>
      )}
      {/* TRY-ANYTHING-SAFELY toast lives here because EditorThemeShop
          is the one owned component EditorDrawers keeps mounted on
          BOTH desktop and mobile, in every editor mode — so undo
          toasts survive rails and bottom sheets unmounting. It is a
          window-event listener (pearloom:undoable), not shop chrome;
          it renders even while the sheet itself is closed. */}
      <UndoToast />
    </div>
  );
}

export default EditorThemeShop;
