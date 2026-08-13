/* =========================================================================
   PEARLOOM STATIONERY — a themed Save-the-Date card + matching envelope,
   generated from the same theme packs as the site. Print-ready (Cmd/Ctrl+P).
   ========================================================================= */

const { useState: useStatState, useEffect: useStatEff } = React;

const SCOUPLE = { a: 'Scott', b: 'Shauna', date: 'April 26, 2027', place: 'Santorini, Greece', venue: 'Casa Chorro' };

function StationeryApp() {
  const [themeId, setThemeId] = useStatState(() => localStorage.getItem('pl-stat-theme') || 'santorini');
  const [intensity, setIntensity] = useStatState(() => { const v = localStorage.getItem('pl-stat-tex'); return v == null ? 1 : parseFloat(v); });
  useStatEff(() => { localStorage.setItem('pl-stat-theme', themeId); }, [themeId]);
  useStatEff(() => { localStorage.setItem('pl-stat-tex', String(intensity)); }, [intensity]);
  const theme = getTheme(themeId);

  return (
    <div style={{ minHeight: '100vh', background: '#E7E2D6', display: 'flex', flexDirection: 'column' }}>
      <ThemeDefs/>
      {/* Toolbar */}
      <header className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 30, background: 'rgba(248,241,228,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line-soft)', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
      }}>
        <a href="Pearloom Editor Redesign.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Pear size={26} tone="sage" shadow={false}/>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>Pearloom</span>
        </a>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', borderLeft: '1px solid var(--line)', paddingLeft: 18 }}>Stationery · Save the Date</span>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 7 }}>
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setThemeId(t.id)} title={t.name} style={{
              width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', position: 'relative',
              background: `linear-gradient(135deg, ${t.swatches[3]} 0 50%, ${t.swatches[0]} 50% 100%)`,
              border: t.id === themeId ? '2.5px solid var(--ink)' : '2px solid var(--line)',
            }}/>
          ))}
        </div>
        {theme.texture !== 'none' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 110 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-soft)' }}>Texture</span>
            <input type="range" min={0} max={1.5} step={0.05} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))}
              style={{ width: '100%', height: 6, borderRadius: 999, appearance: 'none', WebkitAppearance: 'none', background: `linear-gradient(90deg, var(--ink) 0 ${(intensity/1.5)*100}%, var(--cream-3) ${(intensity/1.5)*100}% 100%)`, cursor: 'pointer' }}/>
          </div>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <Icon name="download" size={13} color="var(--cream)"/> Print / PDF
        </button>
      </header>

      {/* Stage */}
      <div className="stage" style={{ flex: 1, display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <SaveTheDate theme={theme} intensity={intensity}/>
        <Envelope theme={theme} intensity={intensity}/>
      </div>
    </div>
  );
}

function SaveTheDate({ theme, intensity }) {
  const look = theme.look;
  const motif = theme.motif;
  return (
    <div className="piece" style={{ ...themeRootStyle(theme, 'comfortable'), width: 430, aspectRatio: '5/7',
      position: 'relative', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.28)', borderRadius: theme.id === 'midnight' ? 6 : 2 }}>
      <TextureLayer texture={intensity > 0 ? theme.texture : 'none'} intensity={intensity}/>
      {motif !== 'none' && (
        <>
          <div style={{ position: 'absolute', top: 18, left: 20, zIndex: 2, opacity: 0.7, transform: 'scaleX(-1)' }}><Motif kind={motif} size={86}/></div>
          <div style={{ position: 'absolute', top: 18, right: 20, zIndex: 2, opacity: 0.7 }}><Motif kind={motif} size={86}/></div>
        </>
      )}
      <div style={{ position: 'relative', zIndex: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '54px 40px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 26 }}>Save the Date</div>
        <div style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: 17, color: 'var(--t-ink-soft)', marginBottom: 14 }}>for the wedding of</div>
        <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 52, lineHeight: 1.0, margin: 0, letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>
          {SCOUPLE.a}<br/>
          <span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 400, fontSize: 38, color: 'var(--t-accent-ink)' }}>{theme.id === 'editorial' ? '×' : '&'}</span><br/>
          {SCOUPLE.b}
        </h1>
        <div style={{ margin: '24px 0', width: 180 }}><TDivider look={look.divider} width={150}/></div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 26, color: 'var(--t-ink)' }}>{SCOUPLE.date}</div>
        <div style={{ fontSize: 13.5, color: 'var(--t-ink-soft)', marginTop: 6, letterSpacing: '0.04em' }}>{SCOUPLE.place}</div>
        <div style={{ marginTop: 30, fontSize: 11, color: 'var(--t-ink-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Invitation to follow</div>
      </div>
    </div>
  );
}

function Envelope({ theme, intensity }) {
  const v = theme.vars;
  return (
    <div className="piece" style={{ ...themeRootStyle(theme, 'comfortable'), width: 560, aspectRatio: '7/5',
      position: 'relative', overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.24)', borderRadius: 4 }}>
      <TextureLayer texture={intensity > 0 ? theme.texture : 'none'} intensity={intensity}/>
      {/* flap */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '54%',
        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
        background: 'color-mix(in oklab, var(--t-section) 70%, var(--t-ink) 4%)',
        borderBottom: '1px solid var(--t-line-soft)', zIndex: 2 }}/>
      {/* wax-ish seal */}
      <div style={{ position: 'absolute', top: '46%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 4,
        width: 56, height: 56, borderRadius: '50%', background: 'var(--t-accent)', display: 'grid', placeItems: 'center',
        boxShadow: '0 6px 16px rgba(0,0,0,0.22)' }}>
        <Pear size={28} tone="cream" shadow={false}/>
      </div>
      {/* return address */}
      <div style={{ position: 'absolute', top: 16, left: 18, zIndex: 5, fontSize: 10.5, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}>
        {SCOUPLE.a} &amp; {SCOUPLE.b}<br/>{SCOUPLE.venue}<br/>{SCOUPLE.place}
      </div>
      {/* stamp + postmark */}
      <div style={{ position: 'absolute', top: 16, right: 18, zIndex: 5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true" style={{ filter: 'url(#t-deckle)' }}>
          <rect x="1" y="1" width="62" height="38" fill="var(--t-accent-bg)" stroke="var(--t-accent)" strokeWidth="1" strokeDasharray="2 2"/>
        </svg>
      </div>
      {/* addressee */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, zIndex: 3 }}>
        <div style={{ fontFamily: 'var(--t-script)', fontSize: 28, color: 'var(--t-ink)', lineHeight: 1.05, textAlign: 'center', whiteSpace: 'nowrap' }}>
          The Honoured Guest
        </div>
        <div style={{ fontSize: 13, color: 'var(--t-ink-soft)', textAlign: 'center', lineHeight: 1.5 }}>
          12 Wildflower Lane<br/>Portland, OR 97214
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StationeryApp/>);
