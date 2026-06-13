/* =========================================================================
   PEARLOOM — IN-EDITOR THEME SHOP (bottom sheet)
   A smooth, no-cart marketplace that lives inside the editor. Slides up over
   the lower canvas so the live site re-skins behind it as you Try packs.
   Unlock morphs inline (spinner → owned → auto-apply). Owned persists and
   syncs with the full store ('pl-store-owned'). Export ThemeShop.
   ========================================================================= */

const { useState: useShopState, useEffect: useShopEff, useMemo: useShopMemo } = React;

const SHOP_OWNED_KEY = 'pl-store-owned';
function shopLoadOwned() { try { return new Set(JSON.parse(localStorage.getItem(SHOP_OWNED_KEY) || '[]')); } catch (e) { return new Set(); } }
function shopSaveOwned(s) { localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify([...s])); }

function ShopPreview({ pack, h = 116 }) {
  const divider = (typeof dividerForMotif !== 'undefined') ? dividerForMotif(pack.motif) : 'rule';
  return (
    <div style={{ ...themeRootStyle({ vars: pack.vars }, 'comfortable'), position: 'relative', height: h, overflow: 'hidden', background: 'var(--t-section)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '14px 12px' }}>
      <TextureLayer texture={pack.texture} intensity={0.9}/>
      {pack.motif !== 'none' && <>
        <div style={{ position: 'absolute', top: 7, left: 9, opacity: 0.5, transform: 'scaleX(-1)' }}><Motif kind={pack.motif} size={34}/></div>
        <div style={{ position: 'absolute', top: 7, right: 9, opacity: 0.5 }}><Motif kind={pack.motif} size={34}/></div>
      </>}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 22, lineHeight: 1, color: 'var(--t-ink)' }}>Ava<span style={{ fontStyle: pack.vars['--t-display'].match(/Inter|Space/) ? 'normal' : 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.14em', fontWeight: 400 }}>&amp;</span>Liam</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}><TDivider look={divider} width={84}/></div>
      </div>
    </div>
  );
}

function TierTag({ tier }) {
  const m = { Free: ['var(--sage-tint)', 'var(--sage-deep)'], Premium: ['var(--lavender-bg)', 'var(--lavender-ink)'], Signature: ['#231F33', '#E5D6A8'] }[tier] || ['var(--cream-2)', 'var(--ink-soft)'];
  return <span style={{ padding: '2px 8px', borderRadius: 999, background: m[0], color: m[1], fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tier}</span>;
}

function ShopCard({ pack, owned, isTrying, busy, onTry, onUnlock, onApply }) {
  return (
    <div className="lift" style={{ borderRadius: 14, overflow: 'hidden', border: isTrying ? '2px solid var(--lavender-2)' : '1px solid var(--line-soft)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onTry(pack)}>
        <ShopPreview pack={pack}/>
        <div style={{ position: 'absolute', top: 8, left: 8 }}><TierTag tier={pack.tier}/></div>
        {pack.badges && pack.badges.best && <div style={{ position: 'absolute', top: 8, right: 8 }}><span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.85)', color: '#3D4A1F', fontSize: 9, fontWeight: 800 }}>★</span></div>}
        {isTrying && <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '3px 9px', borderRadius: 999, background: 'var(--lavender-2)', color: '#3D4A1F', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="eye" size={10} color="#3D4A1F"/> Previewing</div>}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{pack.name}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>{pack.swatches.slice(0, 4).map((c, i) => <span key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}/>)}</div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          {owned ? (
            <button onClick={() => onApply(pack)} className="shopbtn shopbtn-ink" style={{ flex: 1 }}>Apply <Icon name="arrow-right" size={11} color="var(--cream)"/></button>
          ) : pack.price === 0 ? (
            <button onClick={() => onUnlock(pack)} className="shopbtn shopbtn-sage" style={{ flex: 1 }}>{busy ? <span className="shop-spin"/> : 'Get free'}</button>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>${pack.price}</span>
              <button onClick={() => onUnlock(pack)} disabled={busy} className="shopbtn shopbtn-ink">{busy ? <span className="shop-spin"/> : <>Unlock</>}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemeShop({ open, onClose, onApply, tryingId, onTry }) {
  const [owned, setOwned] = useShopState(shopLoadOwned);
  const [col, setCol] = useShopState('all');
  const [q, setQ] = useShopState('');
  const [busyId, setBusyId] = useShopState(null);
  const [toast, setToast] = useShopState(null);
  useShopEff(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  const packs = (typeof STORE_PACKS !== 'undefined') ? STORE_PACKS : [];
  const cols = (typeof STORE_COLLECTIONS !== 'undefined') ? STORE_COLLECTIONS : [];
  const filtered = useShopMemo(() => {
    let list = packs;
    if (col === 'free') list = list.filter(p => p.price === 0);
    else if (col === 'owned') list = list.filter(p => owned.has(p.id));
    else if (col !== 'all') list = list.filter(p => p.collection === col);
    const ql = q.trim().toLowerCase();
    if (ql) list = list.filter(p => p.name.toLowerCase().includes(ql) || (p.tags || []).some(t => t.includes(ql)));
    return list;
  }, [col, q, owned, packs]);

  const unlock = (pack) => {
    setBusyId(pack.id);
    setTimeout(() => {
      const next = new Set([...owned, pack.id]); setOwned(next); shopSaveOwned(next);
      setBusyId(null); setToast(`${pack.name} unlocked`);
      onApply && onApply(pack);
    }, 950);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(40,40,30,0.32)', opacity: open ? 1 : 0, transition: 'opacity 280ms ease' }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '72vh', background: 'var(--card)', borderRadius: '22px 22px 0 0', boxShadow: '0 -20px 60px rgba(40,40,30,0.22)', transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 380ms cubic-bezier(0.16,1,0.3,1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <style>{`
          .shopbtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:7px 13px;border-radius:999px;font-size:12px;font-weight:700;cursor:pointer;border:none;min-height:30px;transition:filter .14s}
          .shopbtn-ink{background:var(--ink);color:var(--cream)} .shopbtn-sage{background:var(--sage-deep);color:var(--cream)} .shopbtn:hover{filter:brightness(1.08)}
          .shop-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;animation:shop-spin .7s linear infinite;display:inline-block}
          @keyframes shop-spin{to{transform:rotate(360deg)}}
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
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={16} color="var(--ink-soft)"/></button>
          </div>
          {/* collection chips */}
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12 }}>
            {[{ id: 'all', name: 'All' }, { id: 'free', name: 'Free' }, ...cols, { id: 'owned', name: 'My themes' }].map(c => {
              const on = col === c.id;
              return <button key={c.id} onClick={() => setCol(c.id)} style={{ whiteSpace: 'nowrap', padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid', borderColor: on ? 'var(--ink)' : 'var(--line)', background: on ? 'var(--ink)' : 'var(--card)', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>{c.name}</button>;
            })}
          </div>
        </div>
        {/* grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 22px 22px', background: 'var(--cream)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
            {filtered.map(p => (
              <ShopCard key={p.id} pack={p} owned={owned.has(p.id)} isTrying={tryingId === p.id} busy={busyId === p.id}
                onTry={onTry} onUnlock={unlock} onApply={onApply}/>
            ))}
          </div>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-muted)' }}><Pear size={40} tone="sage" shadow={false}/><div style={{ marginTop: 10, fontSize: 13.5 }}>No packs match.</div></div>}
        </div>
        {(() => {
          const tp = tryingId && packs.find(p => p.id === tryingId);
          if (!tp || owned.has(tp.id) || tp.price === 0) return null;
          return (
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--line-soft)', background: tp.tier === 'Signature' ? '#231F33' : 'var(--lavender-bg)', color: tp.tier === 'Signature' ? '#EDE7DA' : 'var(--ink)', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', animation: 'cmd-in 220ms ease' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Icon name="eye" size={15} color={tp.tier === 'Signature' ? 'var(--gold)' : 'var(--lavender-ink)'}/>
                You’re previewing <b>{tp.name}</b> · <span style={{ opacity: 0.7 }}>{tp.tier}</span>
              </span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Included with <b>Bloom</b>, or unlock once.</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={() => { /* upgrade path */ try { window.dispatchEvent(new CustomEvent('pl-open-upgrade')); } catch (e) {} }} className="shopbtn" style={{ background: 'transparent', color: tp.tier === 'Signature' ? '#EDE7DA' : 'var(--ink)', border: '1px solid currentColor' }}>Go Bloom</button>
                <button onClick={() => unlock(tp)} disabled={busyId === tp.id} className="shopbtn" style={{ background: tp.tier === 'Signature' ? 'var(--gold)' : 'var(--ink)', color: tp.tier === 'Signature' ? '#231F33' : 'var(--cream)' }}>{busyId === tp.id ? <span className="shop-spin"/> : <>Unlock ${tp.price}</>}</button>
              </div>
            </div>
          );
        })()}
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 'calc(72vh + 14px)', left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--ink)', color: 'var(--cream)', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: '0 10px 26px rgba(0,0,0,0.24)', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Pear size={18} tone="cream" shadow={false}/> {toast}</div>}
    </div>
  );
}

Object.assign(window, { ThemeShop });
