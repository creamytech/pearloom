/* PEARLOOM — SETTINGS (redesigned, on-brand) */
const { useState: useStState } = React;
const ST_NAV = ['You, in the loom', 'Pear’s voice', 'Your web address', 'Who can see what', 'Plan', 'Weave a backup'];

function SettingsApp() {
  const [active, setActive] = useStState(0);
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', position: 'relative' }}>
      <ThemeDefs/><PLAtmosphere/><PLSidebar active="settings"/>
      <main style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, padding: '24px 36px 60px', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
          <div style={{ marginInline: 'auto', textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, margin: 0 }}>Your <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>preferences</span>, woven in.</h1>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>Pear learns from every tweak. The more you adjust, the more it matches your voice.</div>
          </div>
          <button className="btn btn-outline btn-sm">Sign out</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 26, alignItems: 'start' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ST_NAV.map((s, i) => (
              <button key={s} onClick={() => setActive(i)} style={{ textAlign: 'left', padding: '9px 13px', borderRadius: 9, fontSize: 13, fontWeight: active === i ? 700 : 500, background: active === i ? 'var(--cream-2)' : 'transparent', color: 'var(--ink)' }}>{s}</button>
            ))}
            <button style={{ textAlign: 'left', padding: '9px 13px', borderRadius: 9, fontSize: 13, fontWeight: 500, color: 'var(--peach-ink)', marginTop: 4 }}>Delicate actions</button>
          </nav>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--line-soft)', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage), var(--sage-deep))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>S</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>Scott B</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>scott@pearloom.com</div>
                <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--peach-ink)', background: 'var(--peach-bg)', padding: '3px 9px', borderRadius: 999 }}>Bloom tier</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 9px', borderRadius: 999 }}>1 site hosted</span>
                </div>
              </div>
            </div>

            <div style={{ borderRadius: 16, background: 'var(--peach-bg)', padding: 22 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 4 }}>The basics</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 18px' }}>How you <span style={{ fontStyle: 'italic' }}>show up</span>.</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['Display name', 'Scott'], ['Pronouns', 'he / him'], ['Email', 'scott@pearloom.com'], ['Time zone', 'America/New_York']].map(([l, v]) => (
                  <div key={l}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{l}</label>
                    <input defaultValue={v} style={{ width: '100%', marginTop: 6, padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 14, outline: 'none' }}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<SettingsApp/>);
