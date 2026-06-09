'use client';

/* eslint-disable no-restricted-syntax */
/* =========================================================================
   PEARLOOM — IN-EDITOR THEME SHOP (bottom sheet)
   Literal port of ClaudeDesign/pages/theme-shop.jsx.
   ========================================================================= */

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { PACKS as STORE_PACKS, COLLECTIONS as STORE_COLLECTIONS, type Pack } from '@/lib/theme-store/packs';
import { applyPackToManifest } from '@/lib/theme-store/apply';
import { StoreFonts } from '@/lib/theme-store/fonts';
import { PackPreview } from '../store/PackPreview';
import { Icon, Pear } from '../motifs';
import { UndoToast, fireUndoable } from '../redesign/UndoToast';

const SHOP_OWNED_KEY = 'pl-store-owned';
function shopLoadOwned(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(SHOP_OWNED_KEY) || '[]')); } catch (e) { return new Set(); } }
function shopSaveOwned(s: Set<string>) { localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify([...s])); }

function ShopPreview({ pack, h = 116 }: { pack: Pack; h?: number }) {
  return <PackPreview pack={pack} height={h} />;
}

function tierLabel(tier: Pack['tier']): 'Free' | 'Premium' | 'Signature' {
  if (tier === 'free') return 'Free';
  if (tier === 'signature') return 'Signature';
  return 'Premium';
}

function TierTag({ tier }: { tier: 'Free' | 'Premium' | 'Signature' }) {
  const m: Record<string, [string, string]> = { Free: ['var(--sage-tint)', 'var(--sage-deep)'], Premium: ['var(--lavender-bg)', 'var(--lavender-ink)'], Signature: ['#231F33', '#E5D6A8'] };
  const tone = m[tier] || ['var(--cream-2)', 'var(--ink-soft)'];
  return <span style={{ padding: '2px 8px', borderRadius: 999, background: tone[0], color: tone[1], fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tier}</span>;
}

function ShopCard({ pack, owned, isTrying, busy, onTry, onUnlock, onApply }: { pack: Pack; owned: boolean; isTrying: boolean; busy: boolean; onTry: (p: Pack) => void; onUnlock: (p: Pack) => void; onApply: (p: Pack) => void }) {
  const price = pack.priceCents / 100;
  return (
    <div className="lift" style={{ borderRadius: 14, overflow: 'hidden', border: isTrying ? '2px solid var(--lavender-2)' : '1px solid var(--line-soft)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onTry(pack)}>
        <ShopPreview pack={pack}/>
        <div style={{ position: 'absolute', top: 8, left: 8 }}><TierTag tier={tierLabel(pack.tier)}/></div>
        {pack.badges && pack.badges.best && <div style={{ position: 'absolute', top: 8, right: 8 }}><span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.85)', color: '#3D4A1F', fontSize: 9, fontWeight: 800 }}>★</span></div>}
        {isTrying && <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '3px 9px', borderRadius: 999, background: 'var(--lavender-2)', color: '#3D4A1F', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="eye" size={10} color="#3D4A1F"/> Previewing</div>}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{pack.name}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>{pack.swatches.slice(0, 4).map((c: string, i: number) => <span key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}/>)}</div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          {owned ? (
            <button onClick={() => onApply(pack)} className="shopbtn shopbtn-ink" style={{ flex: 1 }}>Apply <Icon name="arrow-right" size={11} color="var(--cream)"/></button>
          ) : price === 0 ? (
            <button onClick={() => onUnlock(pack)} className="shopbtn shopbtn-sage" style={{ flex: 1 }}>{busy ? <span className="shop-spin"/> : 'Get free'}</button>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>${price}</span>
              <button onClick={() => onUnlock(pack)} disabled={busy} className="shopbtn shopbtn-ink">{busy ? <span className="shop-spin"/> : <>Unlock</>}</button>
            </>
          )}
        </div>
      </div>
    </div>
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
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  /* TRY-ANYTHING-SAFELY — snapshot the manifest the moment the
     sheet opens. "Try" previews paint over the live canvas, so:
       - closing without applying restores this snapshot, and
       - a real Apply fires `pearloom:undoable` whose undo restores
         it (the host's old look survives the whole shop visit,
         even try-A-then-apply-B). */
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;
  const openSnapshotRef = useRef<StoryManifest | null>(null);
  const appliedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    openSnapshotRef.current = manifestRef.current;
    appliedRef.current = false;
    setTryingId(null);
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

  const onTry = (pack: Pack) => { setTryingId(pack.id); onChange(applyPackToManifest(pack, manifest)); };
  const onApply = (pack: Pack) => {
    const prior = openSnapshotRef.current ?? manifest;
    onChange(applyPackToManifest(pack, manifest));
    appliedRef.current = true;
    setTryingId(null);
    /* No "are you sure?" — apply immediately, offer the way back.
       The undo toast doubles as the "applied" confirmation, so the
       sheet's own mini-toast stays quiet here. */
    fireUndoable(`${pack.name} applied — your old look is one tap away`, () => onChange(prior));
  };

  /* Close = discard any un-applied preview, restoring the
     open-time snapshot. Real applies survive. */
  const handleClose = () => {
    if (tryingId && !appliedRef.current && openSnapshotRef.current) {
      onChange(openSnapshotRef.current);
    }
    setTryingId(null);
    onClose();
  };

  const unlock = async (pack: Pack) => {
    setBusyId(pack.id);
    try {
      if (pack.priceCents === 0) {
        await fetch('/api/store/apply-free', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId: pack.id }) }).catch(() => null);
        const next = new Set([...owned, pack.id]); setOwned(next); shopSaveOwned(next);
        setBusyId(null); setToast(`${pack.name} unlocked`);
        onApply(pack);
      } else {
        const res = await fetch('/api/store/checkout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packIds: [pack.id] }) });
        if (!res.ok) { setBusyId(null); setToast('Could not start checkout'); return; }
        const { url } = (await res.json()) as { url?: string };
        if (url) { window.location.assign(url); return; }
        setBusyId(null); setToast('Checkout returned no URL');
      }
    } catch (e) {
      setBusyId(null); setToast('Unlock failed');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }}>
      <StoreFonts />
      <div onClick={handleClose} style={{ position: 'absolute', inset: 0, background: 'rgba(40,40,30,0.32)', opacity: open ? 1 : 0, transition: 'opacity 280ms ease' }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '72vh', background: 'var(--card)', borderRadius: '22px 22px 0 0', boxShadow: '0 -20px 60px rgba(40,40,30,0.22)', transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 380ms cubic-bezier(0.16,1,0.3,1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as CSSProperties}>
        <style>{`
          .shopbtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 13px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:none;min-height:30px;transition:filter .14s}
          .shopbtn-ink{background:var(--ink);color:var(--cream)} .shopbtn-sage{background:var(--sage-deep);color:var(--cream)} .shopbtn:hover{filter:brightness(1.08)}
          .shop-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;animation:shop-spin .7s linear infinite;display:inline-block}
          @keyframes shop-spin{to{transform:rotate(360deg)}}
          @keyframes cmd-in{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        `}</style>
        {/* grab handle + header */}
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--line)', margin: '0 auto 12px' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center' }}><Icon name="sparkles" size={16} color="var(--lavender-ink)"/></span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, lineHeight: 1 }}>Theme Shop</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Tap any pack to preview it live on your site</div>
              </div>
            </div>
            <div style={{ flex: 1, maxWidth: 280, marginLeft: 'auto', position: 'relative' }}>
              <Icon name="search" size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}/>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search packs…" style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 12.5, outline: 'none' }}/>
            </div>
            <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={16} color="var(--ink-soft)"/></button>
          </div>
          {/* collection chips */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12 }}>
            {([{ id: 'all', name: 'All' }, { id: 'free', name: 'Free' }, ...cols, { id: 'owned', name: 'My themes' }] as Array<{ id: string; name: string }>).map((c) => {
              const on = col === c.id;
              return <button key={c.id} onClick={() => setCol(c.id)} style={{ whiteSpace: 'nowrap', padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid', borderColor: on ? 'var(--ink)' : 'var(--line)', background: on ? 'var(--ink)' : 'var(--card)', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>{c.name}</button>;
            })}
          </div>
        </div>
        {/* grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 22px 22px', background: 'var(--cream)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
            {filtered.map((p) => (
              <ShopCard key={p.id} pack={p} owned={owned.has(p.id)} isTrying={tryingId === p.id} busy={busyId === p.id}
                onTry={onTry} onUnlock={unlock} onApply={onApply}/>
            ))}
          </div>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)' }}><Pear size={40} tone="sage" shadow={false}/><div style={{ marginTop: 10, fontSize: 13.5 }}>No packs match.</div></div>}
        </div>
        {(() => {
          const tp = tryingId && packs.find((p) => p.id === tryingId);
          if (!tp || owned.has(tp.id) || tp.priceCents === 0) return null;
          const tpTier = tierLabel(tp.tier);
          const price = tp.priceCents / 100;
          return (
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--line-soft)', background: tpTier === 'Signature' ? '#231F33' : 'var(--lavender-bg)', color: tpTier === 'Signature' ? '#EDE7DA' : 'var(--ink)', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', animation: 'cmd-in 220ms ease' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Icon name="eye" size={15} color={tpTier === 'Signature' ? 'var(--gold)' : 'var(--lavender-ink)'}/>
                You&rsquo;re previewing <b>{tp.name}</b> · <span style={{ opacity: 0.7 }}>{tpTier}</span>
              </span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Included with <b>Bloom</b>, or unlock once.</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={() => { try { window.dispatchEvent(new CustomEvent('pl-open-upgrade')); } catch (e) {} }} className="shopbtn" style={{ background: 'transparent', color: tpTier === 'Signature' ? '#EDE7DA' : 'var(--ink)', border: '1px solid currentColor' }}>Go Bloom</button>
                <button onClick={() => unlock(tp)} disabled={busyId === tp.id} className="shopbtn" style={{ background: tpTier === 'Signature' ? 'var(--gold)' : 'var(--ink)', color: tpTier === 'Signature' ? '#231F33' : 'var(--cream)' }}>{busyId === tp.id ? <span className="shop-spin"/> : <>Unlock ${price}</>}</button>
              </div>
            </div>
          );
        })()}
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 'calc(72vh + 14px)', left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--ink)', color: 'var(--cream)', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: '0 10px 26px rgba(0,0,0,0.24)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Pear size={18} tone="cream" shadow={false}/> {toast}</div>}
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
