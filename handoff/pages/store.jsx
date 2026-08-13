/* =========================================================================
   PEARLOOM THEME STORE — the storefront.
   Live pack previews render with the real procedural engine (ThemeDefs +
   TextureLayer + Motif + themed type). Buy → own → apply, persisted locally.
   ========================================================================= */

const { useState: useStoreState, useEffect: useStoreEff, useMemo: useStoreMemo } = React;

const SAMPLE_NAMES = [['Ava','Liam'],['Maya','Noah'],['Elena','Theo'],['Mei','Jonah'],['Zoe','Kai'],['Iris','Hugo'],['Lucia','Sam'],['Nora','Eli']];
const LS_OWNED = 'pl-store-owned';
const LS_CART  = 'pl-store-cart';

function loadSet(key) { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) { return new Set(); } }
function saveSet(key, set) { localStorage.setItem(key, JSON.stringify([...set])); }

function collName(id) { const c = (STORE_COLLECTIONS || []).find(c => c.id === id); return c ? c.name : id; }
function priceLabel(p) { return p === 0 ? 'Free' : '$' + p; }

/* ------------------------------------------------------------------ PREVIEW */
function PackPreview({ pack, height = 188, rich = false, nameIdx = 0 }) {
  const [a, b] = SAMPLE_NAMES[nameIdx % SAMPLE_NAMES.length];
  const divider = dividerForMotif(pack.motif);
  const btnLook = pack.look.button || (pack.kit === 'minimal' ? 'sharp' : pack.kit === 'plate' || pack.kit === 'ticket' ? 'square' : 'pill');
  return (
    <div style={{ ...themeRootStyle({ vars: pack.vars }, 'comfortable'), position: 'relative', height, overflow: 'hidden',
      background: 'var(--t-section)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: rich ? '34px 28px' : '22px 20px' }}>
      <PatternLayer pattern={pack.pattern} intensity={rich ? 1 : 0.85}/>
      <TextureLayer texture={pack.texture} intensity={rich ? 1 : 0.9}/>
      {pack.motif !== 'none' && (
        <>
          <div style={{ position: 'absolute', top: 10, left: 12, opacity: 0.6, transform: 'scaleX(-1)' }}><Motif kind={pack.motif} size={rich ? 64 : 50}/></div>
          <div style={{ position: 'absolute', top: 10, right: 12, opacity: 0.6 }}><Motif kind={pack.motif} size={rich ? 64 : 50}/></div>
        </>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }}>Save the Date</div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: rich ? 46 : 34, lineHeight: 0.98, color: 'var(--t-ink)', letterSpacing: '-0.01em' }}>
          {a}<span style={{ fontStyle: pack.vars['--t-display'].includes('Inter') || pack.vars['--t-display'].includes('Space') ? 'normal' : 'italic', fontSize: '0.62em', color: 'var(--t-ink-soft)', margin: '0 0.16em', fontWeight: 400 }}>&amp;</span>{b}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: rich ? '14px 0' : '10px 0' }}><TDivider look={divider} width={rich ? 150 : 120}/></div>
        <div style={{ fontSize: rich ? 12.5 : 11, color: 'var(--t-ink-soft)', letterSpacing: '0.04em' }}>26 · 04 · 2027 &nbsp;·&nbsp; Santorini</div>
        {rich && (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <TButton look={btnLook} variant="primary" style={{ fontSize: 11, padding: '8px 16px' }}>RSVP</TButton>
            <TButton look={btnLook} variant="outline" style={{ fontSize: 11, padding: '8px 16px' }}>Our story</TButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ STARS */
function Stars({ r }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon name="star" size={12} color="var(--gold)"/>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>{r.toFixed(1)}</span>
    </span>
  );
}

function TierBadge({ tier }) {
  const map = { Free: { bg: 'var(--sage-tint)', fg: 'var(--sage-deep)' }, Premium: { bg: 'var(--lavender-bg)', fg: 'var(--lavender-ink)' }, Signature: { bg: '#231F33', fg: '#E5D6A8' } };
  const c = map[tier] || map.Premium;
  return <span style={{ padding: '3px 9px', borderRadius: 999, background: c.bg, color: c.fg, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tier}</span>;
}

/* ------------------------------------------------------------------ CARD */
function PackCard({ pack, idx, owned, inCart, onAdd, onGetFree, onOpen, onApply }) {
  return (
    <div className="lift" onClick={() => onOpen(pack)} style={{
      background: 'var(--card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line-soft)',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px rgba(61,74,31,0.04)',
    }}>
      <div style={{ position: 'relative' }}>
        <PackPreview pack={pack} nameIdx={idx}/>
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {pack.badges.best && <span style={pillStyle('#3D4A1F', '#F8F1E4')}>★ Bestseller</span>}
          {pack.badges.new && <span style={pillStyle('var(--peach-2)', '#5A2E12')}>New</span>}
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}><TierBadge tier={pack.tier}/></div>
        {owned && <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', color: 'var(--sage-deep)', fontSize: 10.5, fontWeight: 800 }}><Icon name="check" size={11} color="var(--sage-deep)"/> Owned</div>}
      </div>

      <div style={{ padding: '13px 15px 15px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>{pack.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{collName(pack.collection)}</div>
          </div>
          <Stars r={pack.rating}/>
        </div>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {pack.swatches.slice(0, 4).map((c, i) => <span key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}/>)}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--ink-muted)' }}>{pack.sales} sold</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{priceLabel(pack.price)}</span>
          {owned ? (
            <button onClick={(e) => { e.stopPropagation(); onApply(pack); }} className="store-btn store-btn-ink">Apply <Icon name="arrow-right" size={12} color="var(--cream)"/></button>
          ) : pack.price === 0 ? (
            <button onClick={(e) => { e.stopPropagation(); onGetFree(pack); }} className="store-btn store-btn-sage">Get free</button>
          ) : inCart ? (
            <button onClick={(e) => { e.stopPropagation(); onOpen(pack); }} className="store-btn store-btn-soft"><Icon name="check" size={12} color="var(--ink)"/> In cart</button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onAdd(pack); }} className="store-btn store-btn-ink"><Icon name="plus" size={12} color="var(--cream)"/> Add</button>
          )}
        </div>
      </div>
    </div>
  );
}
function pillStyle(bg, fg) { return { padding: '3px 9px', borderRadius: 999, background: bg, color: fg, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em' }; }

/* ------------------------------------------------------------------ QUICK LOOK */
function QuickLook({ pack, owned, inCart, onClose, onAdd, onGetFree, onApply }) {
  if (!pack) return null;
  if (typeof setKit !== 'undefined') setKit(pack.kit);
  const rows = [
    { t: '3:30', m: 'pm', l: 'Ceremony', s: 'Clifftop terrace' },
    { t: '5:00', m: 'pm', l: 'Cocktails', s: 'Sea view' },
    { t: '7:30', m: 'pm', l: 'Dinner & dancing', s: 'Until late' },
  ];
  const incl = [
    { i: 'palette', t: 'Curated palette', s: pack.swatches.length + ' coordinated colors' },
    { i: 'sparkles', t: 'Material texture', s: pack.texture === 'none' ? 'Flat matte finish' : pack.texture[0].toUpperCase() + pack.texture.slice(1) + ' texture' },
    { i: 'text', t: 'Type pairing', s: fontName(pack.vars['--t-display']) + ' + ' + fontName(pack.vars['--t-body']) },
    { i: 'layout', t: 'Component kit', s: (typeof KITS !== 'undefined' ? (KITS.find(k => k.id === pack.kit) || {}).label : pack.kit) + ' styling' },
    { i: 'leaf', t: 'Motifs & dividers', s: pack.motif === 'none' ? 'Clean, no motifs' : pack.motif[0].toUpperCase() + pack.motif.slice(1) + ' artwork' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(40,40,30,0.5)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(940px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'var(--card)', borderRadius: 20, display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', boxShadow: 'var(--shadow-lg)' }}>
        {/* left: previews */}
        <div style={{ background: 'var(--cream-2)', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft)' }}><PackPreview pack={pack} height={250} rich/></div>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft)', ...themeRootStyle({ vars: pack.vars }, 'comfortable'), background: 'var(--t-paper)', padding: '20px 18px', position: 'relative' }}>
            <PatternLayer pattern={pack.pattern} intensity={0.5}/>
            <TextureLayer texture={pack.texture} intensity={0.7}/>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', textAlign: 'center', marginBottom: 12 }}>Schedule · {(typeof KITS !== 'undefined' ? (KITS.find(k => k.id === pack.kit) || {}).label : pack.kit)} kit</div>
              {typeof KSchedule !== 'undefined' && <KSchedule rows={rows} variant="cards" look={pack.look.card || 'soft'}/>}
            </div>
          </div>
        </div>
        {/* right: details */}
        <div style={{ padding: '26px 26px 22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <TierBadge tier={pack.tier}/>
              {pack.badges.best && <span style={pillStyle('#3D4A1F', '#F8F1E4')}>★ Bestseller</span>}
              {pack.badges.new && <span style={pillStyle('var(--peach-2)', '#5A2E12')}>New</span>}
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={15} color="var(--ink-soft)"/></button>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, margin: '12px 0 4px', lineHeight: 1.05 }}>{pack.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-muted)', fontSize: 12.5 }}>
            <span>{collName(pack.collection)}</span><span>·</span><Stars r={pack.rating}/><span>·</span><span>{pack.sales} sold</span>
          </div>
          <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '14px 0 6px' }}>{pack.blurb}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, margin: '12px 0' }}>
            {incl.map((x, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={x.i} size={15} color="var(--ink-soft)"/></span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{x.t}</div><div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{x.s}</div></div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 16px' }}>
            {pack.tags.map(t => <span key={t} style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--cream-2)', fontSize: 11, color: 'var(--ink-soft)' }}>#{t}</span>)}
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 }}>{priceLabel(pack.price)}</span>
            {owned ? (
              <button onClick={() => onApply(pack)} className="store-btn-lg store-btn-ink">Apply to my site <Icon name="arrow-right" size={15} color="var(--cream)"/></button>
            ) : pack.price === 0 ? (
              <button onClick={() => onGetFree(pack)} className="store-btn-lg store-btn-sage">Get it free</button>
            ) : inCart ? (
              <button onClick={onClose} className="store-btn-lg store-btn-soft"><Icon name="check" size={15} color="var(--ink)"/> Added to cart</button>
            ) : (
              <button onClick={() => onAdd(pack)} className="store-btn-lg store-btn-ink"><Icon name="cart" size={15} color="var(--cream)"/> Add to cart · {priceLabel(pack.price)}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function fontName(v) { const m = (v || '').match(/'([^']+)'/); return m ? m[1] : 'Sans'; }

/* ------------------------------------------------------------------ CART */
function CartDrawer({ open, cart, onClose, onRemove, onCheckout }) {
  const items = cart.map(getPack);
  const total = items.reduce((s, p) => s + p.price, 0);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(40,40,30,0.4)', opacity: open ? 1 : 0, transition: 'opacity 220ms ease' }}/>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(400px, 92vw)', background: 'var(--card)', boxShadow: '-12px 0 40px rgba(0,0,0,0.2)', transform: open ? 'none' : 'translateX(100%)', transition: 'transform 280ms cubic-bezier(0.16,1,0.3,1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Your cart</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={15} color="var(--ink-soft)"/></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-muted)', marginTop: 60 }}>
              <Pear size={40} tone="sage" shadow={false}/>
              <div style={{ fontSize: 13.5, marginTop: 10 }}>Your cart is empty.</div>
            </div>
          ) : items.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 12, background: 'var(--cream-2)' }}>
              <div style={{ width: 56, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--line-soft)' }}><PackPreview pack={p} height={44}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{collName(p.collection)}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{priceLabel(p.price)}</span>
              <button onClick={() => onRemove(p.id)} style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}><Icon name="trash" size={13} color="var(--ink-muted)"/></button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div style={{ padding: 18, borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{priceLabel(total)}</span>
            </div>
            <button onClick={onCheckout} className="store-btn-lg store-btn-ink" style={{ width: '100%', justifyContent: 'center' }}>Checkout · {priceLabel(total)}</button>
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', textAlign: 'center', marginTop: 8 }}>Demo checkout — unlocks packs instantly, no payment.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ APP */
function StoreApp() {
  const [owned, setOwned] = useStoreState(() => loadSet(LS_OWNED));
  const [cart, setCart] = useStoreState(() => [...loadSet(LS_CART)]);
  const [q, setQ] = useStoreState('');
  const [col, setCol] = useStoreState('all');
  const [sort, setSort] = useStoreState('featured');
  const [look, setLook] = useStoreState(null);
  const [cartOpen, setCartOpen] = useStoreState(false);
  const [toast, setToast] = useStoreState(null);

  useStoreEff(() => saveSet(LS_OWNED, owned), [owned]);
  useStoreEff(() => localStorage.setItem(LS_CART, JSON.stringify(cart)), [cart]);
  useStoreEff(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const fire = (msg) => setToast(msg);
  const addToCart = (p) => { if (!cart.includes(p.id)) setCart([...cart, p.id]); fire(`${p.name} added to cart`); };
  const removeFromCart = (id) => setCart(cart.filter(x => x !== id));
  const getFree = (p) => { setOwned(new Set([...owned, p.id])); fire(`${p.name} added to your themes 🎉`); };
  const checkout = () => { setOwned(new Set([...owned, ...cart])); setCart([]); setCartOpen(false); fire('Unlocked! Your new themes are ready 🎉'); };
  const apply = (p) => { try { localStorage.setItem('pl-applied-pack', JSON.stringify({ id: p.id, vars: p.vars, kit: p.kit })); } catch (e) {} fire(`Applying ${p.name}…`); setTimeout(() => { window.location.href = 'Pearloom Editor Redesign.html'; }, 700); };

  const filtered = useStoreMemo(() => {
    let list = STORE_PACKS.slice();
    const ql = q.trim().toLowerCase();
    if (ql) list = list.filter(p => p.name.toLowerCase().includes(ql) || p.tags.some(t => t.includes(ql)) || collName(p.collection).toLowerCase().includes(ql));
    if (col === 'free') list = list.filter(p => p.price === 0);
    else if (col === 'best') list = list.filter(p => p.badges.best);
    else if (col === 'new') list = list.filter(p => p.badges.new);
    else if (col === 'owned') list = list.filter(p => owned.has(p.id));
    else if (col !== 'all') list = list.filter(p => p.collection === col);
    if (sort === 'price-lo') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-hi') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'new') list.sort((a, b) => (b.badges.new ? 1 : 0) - (a.badges.new ? 1 : 0));
    else list.sort((a, b) => (b.badges.best ? 1 : 0) - (a.badges.best ? 1 : 0) || b.rating - a.rating);
    return list;
  }, [q, col, sort, owned]);

  const featured = getPack('midnight-velvet');
  const cats = [
    { id: 'all', label: 'All' }, { id: 'free', label: 'Free' }, { id: 'best', label: '★ Bestsellers' }, { id: 'new', label: 'New' },
    ...(STORE_COLLECTIONS || []).map(c => ({ id: c.id, label: c.name })),
    { id: 'owned', label: 'My themes' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <ThemeDefs/>

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(248,241,228,0.86)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--line-soft)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 26px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="Pearloom Editor Redesign.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <Pear size={26} tone="sage" shadow={false}/>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>Pearloom</span>
          </a>
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', borderLeft: '1px solid var(--line)', paddingLeft: 18 }}>Theme Store</span>
          <div style={{ flex: 1, maxWidth: 440, marginInline: 'auto', position: 'relative' }}>
            <Icon name="search" size={15} color="var(--ink-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}/>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search packs, colors, vibes…"
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 13, outline: 'none' }}/>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            <Icon name="check" size={13} color="var(--sage-deep)"/> {owned.size} owned
          </div>
          <button onClick={() => setCartOpen(true)} className="lift" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 13, fontWeight: 600 }}>
            <Icon name="cart" size={15} color="var(--cream)"/> Cart
            {cart.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, padding: '0 5px', borderRadius: 999, background: 'var(--peach-2)', color: '#5A2E12', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>{cart.length}</span>}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '34px 26px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34, alignItems: 'center', background: 'var(--card)', borderRadius: 24, padding: 30, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--lavender-ink)' }}>THE THEME STORE</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 600, lineHeight: 1.02, margin: '8px 0 12px', letterSpacing: '-0.02em' }}>
              A look for every<br/><span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>once-in-a-lifetime</span> day.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 440 }}>
              {STORE_PACKS.length} designer theme packs — each a full kit of palette, real material texture, type, motifs and matching components. One tap to own, one tap to dress your site.
            </p>
            <div style={{ display: 'flex', gap: 22, marginTop: 20 }}>
              {[[STORE_PACKS.length, 'theme packs'], [STORE_COLLECTIONS.length, 'collections'], [(typeof KITS !== 'undefined' ? KITS.length : 6), 'component kits']].map(([n, l]) => (
                <div key={l}><div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{l}</div></div>
              ))}
            </div>
          </div>
          <div onClick={() => setLook(featured)} className="lift" style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line-soft)', position: 'relative' }}>
            <PackPreview pack={featured} height={300} rich/>
            <div style={{ position: 'absolute', top: 12, left: 12 }}><span style={pillStyle('#231F33', '#E5D6A8')}>✦ Featured · Signature</span></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '26px 16px 14px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div><div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>{featured.name}</div><div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11.5 }}>Tap to preview</div></div>
              <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{priceLabel(featured.price)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div style={{ position: 'sticky', top: 57, zIndex: 30, background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 26px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {cats.map(c => {
              const on = col === c.id;
              return <button key={c.id} onClick={() => setCol(c.id)} style={{ whiteSpace: 'nowrap', padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, border: '1px solid', borderColor: on ? 'var(--ink)' : 'var(--line)', background: on ? 'var(--ink)' : 'var(--card)', color: on ? 'var(--cream)' : 'var(--ink-soft)', cursor: 'pointer' }}>{c.label}</button>;
            })}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer', flexShrink: 0 }}>
            <option value="featured">Featured</option>
            <option value="rating">Top rated</option>
            <option value="new">Newest</option>
            <option value="price-lo">Price: low to high</option>
            <option value="price-hi">Price: high to low</option>
          </select>
        </div>
      </div>

      {/* GRID */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '6px 26px 60px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: '4px 2px 14px' }}>{filtered.length} {filtered.length === 1 ? 'pack' : 'packs'}{col !== 'all' && col !== 'owned' ? ` in ${cats.find(c => c.id === col)?.label}` : ''}</div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}><Pear size={44} tone="sage" shadow={false}/><div style={{ marginTop: 12, fontSize: 14 }}>No packs match — try another search.</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
            {filtered.map((p, i) => (
              <PackCard key={p.id} pack={p} idx={i} owned={owned.has(p.id)} inCart={cart.includes(p.id)}
                onAdd={addToCart} onGetFree={getFree} onApply={apply} onOpen={setLook}/>
            ))}
          </div>
        )}
      </main>

      <QuickLook pack={look} owned={look && owned.has(look.id)} inCart={look && cart.includes(look.id)}
        onClose={() => setLook(null)} onAdd={(p) => { addToCart(p); }} onGetFree={(p) => { getFree(p); setLook(null); }} onApply={apply}/>
      <CartDrawer open={cartOpen} cart={cart} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onCheckout={checkout}/>

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--ink)', color: 'var(--cream)', padding: '12px 20px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Pear size={20} tone="cream" shadow={false}/> {toast}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StoreApp/>);
