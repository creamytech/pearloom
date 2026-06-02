/* =========================================================================
   PEARLOOM — DASHBOARD SHELL (sidebar + router)
   Shared across all 10 dashboard screens.
   ========================================================================= */

const { useState: useDashState } = React;

const DASH_NAV = [
  { id: 'dashboard', label: 'Home', icon: 'home', href: 'Pearloom Home Redesign.html' },
  { id: 'site', label: 'Site', icon: 'browser', href: 'Pearloom Editor Redesign.html' },
  { id: 'guests', label: 'Guests', icon: 'users', href: 'Pearloom Guests.html' },
  { id: 'day', label: 'Day', icon: 'timeline', href: 'Pearloom Day.html' },
  { id: 'studio', label: 'Studio', icon: 'paint', href: 'Pearloom Studio Redesign.html' },
  { id: 'memory', label: 'Memory', icon: 'grid', href: 'Pearloom Memory.html' },
  { id: 'settings', label: 'Settings', icon: 'gear', href: 'Pearloom Settings.html' },
];

function DashIcon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return <svg {...common}><path d="M3 10l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z"/></svg>;
    case 'browser': return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>;
    case 'timeline': return <svg {...common}><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 12h8"/><path d="M12 4v4M12 16v4"/></svg>;
    case 'users': return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/></svg>;
    case 'users2': return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'grid': return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'paint': return <svg {...common}><circle cx="6" cy="8" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/><path d="M8 8h8M8 16h8M6 10v4M18 10v4"/></svg>;
    case 'chart': return <svg {...common}><path d="M3 20V4M3 20h18M7 16v-5M12 16V8M17 16v-9"/></svg>;
    case 'gear': return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

function DashSidebar({ active = 'dashboard' }) {
  return (
    <aside style={{
      width: 260, flexShrink: 0,
      padding: '20px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
      background: 'var(--cream)',
      borderRight: '1px solid var(--line-soft)',
      minHeight: '100vh',
    }}>
      <a href="Pearloom Landing.html" style={{ padding: '4px 8px 12px' }}><PearloomLogo /></a>

      {/* Event switcher */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14, padding: 10,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#F0C9A8,#C4B5D9)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>The Parker Wedding</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>June 22, 2025</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
        {DASH_NAV.map(item => {
          const isActive = item.id === active;
          return (
            <a key={item.id} href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                fontSize: 14, fontWeight: 500,
                background: isActive ? 'var(--ink)' : 'transparent',
                color: isActive ? 'var(--cream)' : 'var(--ink)',
                transition: 'background .12s',
              }}>
              <DashIcon name={item.icon} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 999,
                  background: isActive ? 'rgba(255,255,255,0.18)' : 'var(--peach-bg)',
                  color: isActive ? 'var(--cream)' : 'var(--peach-ink)',
                  fontWeight: 700,
                }}>{item.badge}</span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Plan card */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          background: 'var(--cream-2)',
          border: '1px solid var(--line-soft)',
          borderRadius: 14, padding: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          textAlign: 'center',
        }}>
          <Pear size={44} tone="sage" sparkle />
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            You're on the<br/><strong style={{ color: 'var(--ink)' }}>Evergreen Plan</strong><br/>
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>34 days left in trial</span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>View plan</button>
        </div>

        {/* User card */}
        <div style={{
          marginTop: 12,
          background: 'var(--card)',
          border: '1px solid var(--card-ring)',
          borderRadius: 14, padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--lavender)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>A</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Alex Parker</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)', padding: '6px 4px' }}><Icon name="sparkles" size={14}/> What's new</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)', padding: '6px 4px' }}><Icon name="bell" size={14}/> Help center</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-soft)', padding: '6px 4px' }}><Icon name="arrow-right" size={14}/> Log out</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashTopbar({ title = 'Welcome back, Alex', subtitle, ctaText = 'Create new event', onCta }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '24px 32px 8px', gap: 24,
    }}>
      <div>
        <h1 className="display" style={{ fontSize: 40, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {title} <Heart size={22} />
        </h1>
        {subtitle && (
          <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-soft)' }}>{subtitle}</div>
        )}
      </div>
      {ctaText && (
        <button className="btn btn-primary" onClick={onCta}>
          {ctaText} <Pear size={14} tone="cream" shadow={false} />
        </button>
      )}
    </div>
  );
}

function DashLayout({ active, title, subtitle, cta, children, rightChrome, hideTopbar }) {
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: 'var(--cream)',
      position: 'relative',
    }}>
      <DashSidebar active={active} />
      <main style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {/* soft atmosphere */}
        <div style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
          <Blob tone="peach" size={380} opacity={0.35} style={{ position: 'absolute', top: -120, right: -120 }} />
          <Squiggle variant={1} width={180} style={{ position: 'absolute', top: 40, right: 200, transform: 'rotate(-15deg)', opacity: 0.6 }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {!hideTopbar && <DashTopbar title={title} subtitle={subtitle} ctaText={cta && cta.text} onCta={cta && cta.on} />}
          {children}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { DashSidebar, DashTopbar, DashLayout, DashIcon, DASH_NAV });
