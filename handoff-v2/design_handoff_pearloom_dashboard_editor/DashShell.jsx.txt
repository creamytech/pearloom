/* global React */
// Pearloom dashboard — shared chrome, rebuilt to the production IA
// (src/components/pearloom/dash/DashShell.tsx). A 264px cream sidebar:
// logo · celebration switcher · grouped nav with an ink active pill ·
// compact plan strip · user-menu popover. A glass utility bar rides the
// top of the scroll column (Pear command search · notifications ·
// avatar). PageHead is the per-route DashTopbar — letterpress display
// title knotted with the gold pearl, subtitle, right-aligned actions.
(() => {
const { PearloomLogo, PearloomGlyph, Button, Pearl, Thread } = window.PearloomDesignSystem_55118c;
const Icon = window.Icon;

const NAV = [
  { group: '', items: [{ k: 'home', l: 'Home', i: 'home' }] },
  { group: 'Your loom', items: [
    { k: 'sites', l: 'My sites', i: 'layout' },
  ] },
  { group: 'This event', items: [
    { k: 'guests', l: 'Guests', i: 'users', badge: '5', tone: 'peach' },
    { k: 'studio', l: 'Studio', i: 'sparkles' },
    { k: 'gallery', l: 'The Reel', i: 'image', badge: '3', tone: 'gold' },
    { k: 'registry', l: 'Registry', i: 'gift' },
  ] },
  { group: 'The house', items: [
    { k: 'analytics', l: 'Analytics', i: 'bars' },
  ] },
];

const SITES = [
  { id: 'mj', name: 'Mira & Jun', occ: 'Wedding', date: 'Sept 6, 2026', tint: 'var(--peach-bg)', ink: 'var(--peach-ink)' },
  { id: 'maya', name: "Maya's shower", occ: 'Bridal shower', date: 'Aug 16, 2026', tint: 'rgba(193,154,75,0.16)', ink: '#8A6A2E' },
];

function Crest({ site, size = 38 }) {
  const r = Math.max(8, Math.round(size * 0.26));
  return (
    <div aria-hidden style={{ width: size, height: size, borderRadius: r, flexShrink: 0, background: site.tint, border: '1px solid var(--card-ring)', display: 'grid', placeItems: 'center', position: 'relative' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: size * 0.48, lineHeight: 1, color: site.ink }}>{site.name[0]}</span>
      <span style={{ position: 'absolute', right: Math.round(size * 0.14), bottom: Math.round(size * 0.14), width: Math.max(4, Math.round(size * 0.13)), height: Math.max(4, Math.round(size * 0.13)), borderRadius: 999, background: 'var(--pl-gold)' }} />
    </div>
  );
}

function CelebrationCard() {
  const [open, setOpen] = React.useState(false);
  const [sel, setSel] = React.useState(SITES[0]);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} className="dash-cele" style={{ width: '100%', background: open ? 'var(--cream-2)' : 'var(--card)', border: '1px solid var(--card-ring)', borderRadius: 14, padding: 10, display: 'flex', gap: 10, alignItems: 'center', textAlign: 'left', cursor: 'pointer', color: 'inherit', transition: 'background 200ms var(--pl-ease-out)' }}>
        <Crest site={sel} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-ui)' }}>{sel.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{sel.date}</div>
        </div>
        <span style={{ display: 'inline-flex', color: 'var(--ink-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--pl-ease-out)' }}><Icon name="chevron" size={12} /></span>
      </button>
      {open ? (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, background: 'var(--card)', border: '1px solid var(--card-ring)', borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 6 }}>
          {SITES.map((s) => {
            const on = s.id === sel.id;
            return (
              <button key={s.id} onClick={() => { setSel(s); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 'none', background: on ? 'var(--cream-2)' : 'transparent', color: 'var(--ink)', cursor: 'pointer', textAlign: 'left' }}>
                <Crest site={s} size={28} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>{s.name}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{s.occ} · {s.date}</span>
                </span>
                {on ? <span style={{ color: 'var(--pl-gold)' }}><Icon name="check" size={13} strokeWidth={3} /></span> : null}
              </button>
            );
          })}
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12.5, fontWeight: 600, color: 'var(--accent-ink, var(--peach-ink))', cursor: 'pointer' }}><Icon name="sparkles" size={13} /> Manage sites</div>
        </div>
      ) : null}
    </div>
  );
}

function NavLink({ it, on, onNav }) {
  return (
    <button onClick={() => onNav(it.k)} className="dash-navbtn" data-on={on ? '1' : undefined}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14, fontWeight: on ? 600 : 500, color: on ? 'var(--cream)' : 'var(--ink)', backgroundColor: on ? 'var(--ink)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)' }}>
      <span className="dash-navrail" aria-hidden="true" />
      <span className="dash-navicon" style={{ display: 'inline-flex' }}><Icon name={it.i} size={18} /></span>
      <span className="dash-navlabel" style={{ flex: 1 }}>{it.l}</span>
      {it.badge ? <span className="dash-navbadge" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700, fontFamily: 'var(--pl-font-mono)', background: it.tone === 'gold' ? 'rgba(193,154,75,0.18)' : 'var(--accent-bg, var(--peach-bg))', color: it.tone === 'gold' ? '#8A6A2E' : 'var(--accent-ink, var(--peach-ink))' }}>{it.badge}</span> : null}
    </button>
  );
}

function UserMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const items = [['sliders', 'Settings', 'Profile, preferences, theme'], ['heart', 'Plan & billing', null], ['sparkles', 'Usage & credits', null], ['bell', 'Help center', null]];
  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 12 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: '100%', background: 'var(--card)', border: `1px solid ${open ? 'var(--ink)' : 'var(--card-ring)'}`, borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left', color: 'inherit', transition: 'border-color 160ms var(--pl-ease-out)' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--cream)', flexShrink: 0, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>M</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mira Vega</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>mira@vega.mx</div>
        </div>
        <span style={{ display: 'inline-flex', color: 'var(--ink-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--pl-ease-out)' }}><Icon name="chevron" size={11} /></span>
      </button>
      {open ? (
        <div className="pl-glass-surface" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, borderRadius: 14, padding: 6, boxShadow: 'var(--shadow-lg)', zIndex: 5 }}>
          {items.map(([ic, l, d]) => (
            <div key={l} onClick={() => { if (l === 'Plan & billing') window.dispatchEvent(new CustomEvent('pl-open-plan')); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ display: 'inline-flex', color: 'var(--ink-soft)' }}><Icon name={ic} size={14} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>{l}</span>
                {d ? <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{d}</span> : null}
              </span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <Icon name="arrow" size={14} /> Log out
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({ active, onNav }) {
  return (
    <aside className="dash-side" style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--cream)', borderRight: '1px solid var(--line-soft)', position: 'sticky', top: 0, height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ padding: '18px 14px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="dash-logo" style={{ padding: '4px 8px 4px' }}><PearloomLogo size={24} color="var(--pl-ink)" /></div>
        <CelebrationCard />
      </div>
      <nav className="dash-nav" onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const btns = [...e.currentTarget.querySelectorAll('.dash-navbtn')];
        const i = btns.indexOf(document.activeElement);
        if (i < 0) return; e.preventDefault();
        const next = e.key === 'ArrowDown' ? Math.min(btns.length - 1, i + 1) : Math.max(0, i - 1);
        btns[next].focus();
      }} style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 12px' }}>
        {NAV.map((g, gi) => (
          <div key={g.group || gi} className="dash-navgroup">
            {g.group ? <div className="dash-grouplabel" style={{ padding: '4px 12px 6px', fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{g.group}</div> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {g.items.map((it) => <NavLink key={it.k} it={it} on={active === it.k} onNav={onNav} />)}
            </div>
          </div>
        ))}
      </nav>
      <div style={{ flexShrink: 0, padding: '0 14px 18px' }}>
        <div style={{ background: 'var(--cream-2)', border: '1px solid var(--line-soft)', borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PearloomGlyph size={24} color="var(--sage)" />
          <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.3, fontFamily: 'var(--font-ui)' }}>
            <strong style={{ color: 'var(--ink)' }}>The full bolt</strong><span style={{ color: 'var(--ink-muted)', marginLeft: 4 }}>· plan</span>
          </div>
          <span onClick={() => window.dispatchEvent(new CustomEvent('pl-open-plan'))} style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink, var(--peach-ink))', padding: '2px 6px', borderRadius: 6, cursor: 'pointer' }}>View</span>
        </div>
        <UserMenu />
      </div>
    </aside>
  );
}

function NotifBell() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const NOTES = [
    { i: 'users', c: 'var(--sage)', t: 'Amara replied — coming, +1', w: '2h' },
    { i: 'image', c: 'var(--accent-ink, var(--peach-ink))', t: 'Jonah added a photo to the Reel', w: '5h' },
    { i: 'gift', c: 'var(--pl-gold)', t: 'Priya bought the pour-over set', w: '1d' },
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen((v) => !v)} title="Notifications" style={{ position: 'relative', width: 34, height: 34, borderRadius: 999, border: `1px solid ${open ? 'var(--ink)' : 'var(--line)'}`, background: 'var(--card)', color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
        <Icon name="bell" size={16} />
        <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 99, background: 'var(--accent-ink, var(--peach-ink))', border: '1.5px solid var(--card)' }} />
      </button>
      {open ? (
        <div className="pl-glass-surface" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, borderRadius: 14, padding: 8, boxShadow: 'var(--shadow-lg)', zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 8px 8px' }}>
            <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--ink-muted)' }}>LATELY</span>
            <span style={{ fontSize: 11, color: 'var(--accent-ink, var(--peach-ink))', fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>Mark all read</span>
          </div>
          {NOTES.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--cream-3)', color: n.c }}><Icon name={n.i} size={13} /></span>
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)', lineHeight: 1.35 }}>{n.t}</span>
              <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>{n.w}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UtilityBar() {
  const [focus, setFocus] = React.useState(false);
  return (
    <div className="pl-glass-surface dash-topbar" style={{ position: 'sticky', top: 0, zIndex: 20, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, maxWidth: 440, display: 'flex', alignItems: 'center', gap: 10, background: focus ? 'var(--card)' : 'var(--cream-3)', border: `1px solid ${focus ? 'var(--accent-ink, var(--peach-ink))' : 'var(--line)'}`, borderRadius: 999, padding: '8px 14px', transition: 'all var(--pl-dur-fast) var(--pl-ease-out)' }}>
        <span style={{ display: 'inline-flex', color: 'var(--accent-ink, var(--peach-ink))' }}><Icon name="search" size={15} /></span>
        <input onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder="Ask Pear anything, or jump to a block…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink)' }} />
        <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-muted)', padding: '2px 6px', background: 'var(--accent-bg, var(--peach-bg))', borderRadius: 4 }}>⌘K</span>
      </div>
      <div style={{ flex: 1 }} />
      <NotifBell />
      <div style={{ position: 'relative', width: 34, height: 34 }}>
        <div style={{ width: 34, height: 34, borderRadius: 999, background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cream)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>M</div>
        <span style={{ position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: 99, background: 'var(--sage)', border: '2px solid var(--cream)' }} />
      </div>
    </div>
  );
}

function PageHead({ pre, title, italic, sub, actions, pearl = true }) {
  return (
    <header style={{ padding: 'clamp(18px,2.8vw,30px) clamp(20px,4vw,40px) clamp(10px,1.4vw,14px)', maxWidth: 1240, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        {pre ? <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent-ink, var(--peach-ink))', marginBottom: 8 }}>{pre}</div> : null}
        <h1 className="pl-heading pl-letterpress" style={{ fontSize: 'clamp(28px,3.6vw,38px)', lineHeight: 1.08, margin: 0, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {title} {italic ? <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>{italic}</span> : null}
          {pearl ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ marginLeft: 8, verticalAlign: 'baseline' }}><circle cx="6" cy="6" r="4.4" fill="var(--pl-gold)" stroke="var(--pl-cream)" strokeWidth="1.4" /></svg> : null}
        </h1>
        {sub ? <p style={{ marginTop: 10, color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.5, maxWidth: 640, fontFamily: 'var(--font-ui)' }}>{sub}</p> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>{actions}</div> : null}
    </header>
  );
}

function DashShell({ active, onNav, children, texture = 'none', density = 'comfortable' }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream-3)' }}>
      <Sidebar active={active} onNav={onNav} />
      <div className="dash-main" style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--glow, var(--cream-3))' }}>
        {texture !== 'none' ? <div className={'pl-tx-' + texture} style={{ position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none', zIndex: 0 }} /> : null}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <UtilityBar />
          <div style={{ flex: 1, zoom: density === 'compact' ? 0.92 : density === 'spacious' ? 1.06 : 1 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

window.DashShell = DashShell;
window.PageHead = PageHead;
})();
