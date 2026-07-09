/* Shared dashboard chrome for the redesigned Pearloom dashboard pages.
   Export PLSidebar({active}), PLAtmosphere, PLTabs. On-brand: cream, olive
   sprigs, editorial type. */

const PL_NAV = [
  { id: 'home', label: 'Home', icon: 'home', href: 'Pearloom Home Redesign.html' },
  { id: 'site', label: 'Site', icon: 'layout', href: 'Pearloom Editor Redesign.html' },
  { id: 'guests', label: 'Guests', icon: 'users', href: 'Pearloom Guests.html' },
  { id: 'day', label: 'Day', icon: 'clock', href: 'Pearloom Day.html' },
  { id: 'studio', label: 'Studio', icon: 'brush', href: 'Pearloom Studio Redesign.html' },
  { id: 'memory', label: 'Memory', icon: 'heart-icon', href: 'Pearloom Memory.html' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: 'Pearloom Settings.html' },
];

function PLSidebar({ active }) {
  return (
    <aside className="pl-sidebar" style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--line-soft)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 0, height: '100vh', background: 'var(--cream)', zIndex: 2 }}>
      <a href="Pearloom Home Redesign.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 6px' }}>
        <Pear size={24} tone="sage" shadow={false}/>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>Pearloom</span>
      </a>
      <div className="pl-side-chip" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line-soft)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--lavender-2), var(--peach-2))' }}/>
        <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Scott &amp; Shauna</div><div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Apr 26, 2027</div></div>
      </div>
      <nav className="pl-side-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {PL_NAV.map(n => {
          const on = n.id === active;
          return (
            <a key={n.id} href={n.href} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10, fontSize: 13.5, fontWeight: on ? 700 : 500, background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>
              <Icon name={n.icon} size={15} color={on ? 'var(--cream)' : 'var(--ink-muted)'}/> {n.label}
            </a>
          );
        })}
      </nav>
      <div className="pl-side-chip" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 11, background: 'var(--sage-tint)' }}>
        <Pear size={18} tone="sage" shadow={false}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-deep)' }}>Evergreen · trial</span>
        <a href="#" style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: 'var(--peach-ink)' }}>View</a>
      </div>
    </aside>
  );
}

function PLAtmosphere() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: 120, right: 60, opacity: 0.07, transform: 'rotate(10deg)' }}><OliveSprig size={230} color="var(--sage)" berry="var(--gold)"/></div>
      <div style={{ position: 'absolute', bottom: 60, left: 260, opacity: 0.05, transform: 'rotate(-8deg) scaleX(-1)' }}><OliveSprig size={190} color="var(--sage)" berry="var(--gold)"/></div>
    </div>
  );
}

function PLTabs({ tabs, active = 0 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
      {tabs.map((t, i) => (
        <button key={t} style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: i === active ? 'var(--ink)' : 'transparent', color: i === active ? 'var(--cream)' : 'var(--ink-soft)' }}>{t}</button>
      ))}
    </div>
  );
}

function PLHead({ pre, title, italic, sub, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
      <div>
        {pre && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 4 }}>{pre}</div>}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{title} {italic && <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>{italic}</span>}</h1>
        {sub && <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 4, maxWidth: 520 }}>{sub}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

function PLCard({ title, icon, extra, children, style }) {
  return (
    <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--line-soft)', padding: 18, ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon && <Icon name={icon} size={15} color="var(--gold)"/>}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{title}</span>
          </div>
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

Object.assign(window, { PLSidebar, PLAtmosphere, PLTabs, PLHead, PLCard, PL_NAV });
