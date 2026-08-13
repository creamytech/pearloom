/* PEARLOOM — STUDIO (invite designer, redesigned on-brand) */
const { useState: useSuState } = React;
const SU_PAL = [['Dusk', ['#B7A4D0', '#C4B5D9']], ['Garden', ['#8B9C5A', '#CBD29E']], ['Apricot', ['#EAB286', '#F3DDC2']], ['Letterpress', ['#F3E9D4', '#3D4A1F']], ['Twilight', ['#283D4E', '#B7A4D0']], ['Rose', ['#CE8E8E', '#E8C9C9']]];
const SU_LAYOUTS = [['Classic', 'centered · airy'], ['Asymmetric', 'off-center · stamp'], ['Photo-led', 'big image · caption'], ['Letter', 'handwritten note'], ['Minimal', 'two lines + rule']];
const SU_MOTIFS = [['Clean', 'square'], ['Stamp', 'sun'], ['Leaves', 'leaf'], ['Tape', 'sparkles'], ['Monogram', 'heart-icon'], ['Wax seal', 'dot']];

function SuRailHead({ children }) { return <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '16px 0 9px' }}>{children}</div>; }

function StudioApp() {
  const [pal, setPal] = useSuState(0);
  const [layout, setLayout] = useSuState(0);
  const [motif, setMotif] = useSuState(1);
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', position: 'relative' }}>
      <ThemeDefs/><PLSidebar active="studio"/>
      {/* drafts panel */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--line-soft)', padding: 16, background: 'var(--cream-2)', height: '100vh', overflow: 'auto', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}><Pear size={18} tone="sage" shadow={false}/><span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Pear’s drafts</span></div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 12 }}>Three directions, all editable. Click one to make it the canvas.</div>
        {[['Letterpress', 'classic · centered', 'var(--cream)'], ['En plein air', 'natural · pressed leaves', 'var(--sage-tint)'], ['Modern', 'sans · asymmetric', 'var(--ink)']].map(([n, s, bg], i) => (
          <div key={n} style={{ borderRadius: 12, overflow: 'hidden', border: i === 2 ? '2px solid var(--ink)' : '1px solid var(--line)', marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ height: 90, background: bg, display: 'grid', placeItems: 'center', color: bg === 'var(--ink)' ? 'var(--cream)' : 'var(--ink)' }}><span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13 }}>S &amp; S</span></div>
            <div style={{ padding: '8px 10px', background: 'var(--card)' }}><div style={{ fontSize: 12, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{s}</div></div>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}><Pear size={13} tone="sage" shadow={false}/> Draft another</button>
      </div>

      {/* canvas */}
      <main style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0' }}>
          {['Save the date', 'Invitation', 'Thank-you'].map((t, i) => <button key={t} style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--cream)' : 'var(--ink-soft)' }}>{t}</button>)}
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', position: 'relative' }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: 40, left: 60, transform: 'rotate(-8deg)', background: 'var(--lavender-2)', padding: '10px 16px', borderRadius: 3, fontFamily: 'var(--font-script)', fontSize: 15, boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}>send by the deadline</div>
          {/* invite card */}
          <div style={{ ...themeRootStyle({ vars: getTheme('santorini').vars }, 'comfortable'), width: 300, aspectRatio: '5/7', borderRadius: 6, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.28)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, background: `linear-gradient(180deg, var(--${SU_PAL[pal][1][0] === '#283D4E' ? '' : ''}lavender-2, #B7A4D0), ${SU_PAL[pal][1][1]})` , position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${SU_PAL[pal][1][0]}, ${SU_PAL[pal][1][1]})` }}/>
            </div>
            <div style={{ background: '#1F2A36', color: '#EDE7DA', padding: '22px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 8.5, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>You are invited to celebrate</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, lineHeight: 1 }}>Scott <span style={{ fontStyle: 'italic', color: '#B7A4D0' }}>and</span> Shauna</div>
              <div style={{ fontSize: 10.5, marginTop: 8, opacity: 0.85 }}>Monday, April 26, 2027</div>
              <div style={{ fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4, opacity: 0.6 }}>Casa Chorro · Santorini</div>
            </div>
          </div>
        </div>
      </main>

      {/* design rail */}
      <aside style={{ width: 250, flexShrink: 0, borderLeft: '1px solid var(--line-soft)', padding: 16, background: 'var(--card)', height: '100vh', overflow: 'auto', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--cream-2)', borderRadius: 9, marginBottom: 4 }}>
          {['Design', 'Copy', 'Pear'].map((t, i) => <button key={t} style={{ flex: 1, padding: 7, borderRadius: 6, fontSize: 12, fontWeight: 600, background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--cream)' : 'var(--ink-soft)' }}>{t}</button>)}
        </div>
        <SuRailHead>Palette</SuRailHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {SU_PAL.map(([n, cols], i) => (
            <button key={n} onClick={() => setPal(i)} style={{ borderRadius: 9, overflow: 'hidden', border: pal === i ? '2px solid var(--ink)' : '1px solid var(--line)', cursor: 'pointer' }}>
              <div style={{ height: 30, display: 'flex' }}>{cols.map(c => <span key={c} style={{ flex: 1, background: c }}/>)}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, padding: '3px 0', background: 'var(--card)' }}>{n}</div>
            </button>
          ))}
        </div>
        <SuRailHead>Layout</SuRailHead>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {SU_LAYOUTS.map(([n, s], i) => <button key={n} onClick={() => setLayout(i)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9, background: layout === i ? 'var(--ink)' : 'var(--cream-2)', color: layout === i ? 'var(--cream)' : 'var(--ink)', cursor: 'pointer' }}><div style={{ fontSize: 11.5, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 9, opacity: 0.7 }}>{s}</div></button>)}
        </div>
        <SuRailHead>Motif</SuRailHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7 }}>
          {SU_MOTIFS.map(([n, ic], i) => <button key={n} onClick={() => setMotif(i)} style={{ padding: '10px 4px', borderRadius: 9, background: motif === i ? 'var(--lavender-2)' : 'var(--cream-2)', display: 'grid', placeItems: 'center', gap: 4, cursor: 'pointer' }}><Icon name={ic} size={16} color="#3D4A1F"/><span style={{ fontSize: 9.5, fontWeight: 600 }}>{n}</span></button>)}
        </div>
      </aside>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<StudioApp/>);
