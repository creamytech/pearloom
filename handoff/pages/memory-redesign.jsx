/* PEARLOOM — MEMORY / Keepsakes (redesigned, on-brand) */
const { useState: useMmState } = React;

function MemoryApp() {
  const [list, setList] = useMmState('Clara Rodriguez\nDavid Mendoza\nPriya Joshi');
  const [tone, setTone] = useMmState('warm');
  const n = list.split('\n').filter(x => x.trim()).length;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', position: 'relative' }}>
      <ThemeDefs/><PLAtmosphere/><PLSidebar active="memory"/>
      <main style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, padding: '24px 36px 60px', maxWidth: 1080, margin: '0 auto' }}>
        <PLTabs tabs={['Keepsakes', 'Book']}/>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, margin: 0 }}>Keepsakes</h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 4 }}>Thank-you notes, anniversary nudges, and every after-the-day kindness — drafted by Pear.</div>
        </div>

        <PLCard style={{ marginBottom: 18, background: 'var(--peach-bg)', border: 'none' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 4 }}>Two-tap thanks</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 10px' }}>Drafted from <span style={{ fontStyle: 'italic' }}>what they did</span>.</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 13px', borderRadius: 11, background: 'var(--card)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Pear size={16} tone="sage" shadow={false}/></span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>Tap a guest → see what they did (memory, song, attendance) → tap Draft → Pear writes a note grounded in their specific contribution. Copy and send. Next.</span>
          </div>
        </PLCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          <PLCard>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 4 }}>After the event</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '0 0 12px' }}>Thank-you notes, <span style={{ fontStyle: 'italic' }}>drafted</span>.</h2>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.45 }}>Paste a list of guest names (one per line). Pear drafts a personalized note for each, referencing the event and what they brought.</div>
            <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Guest list</label>
            <textarea value={list} onChange={(e) => setList(e.target.value)} rows={5} style={{ width: '100%', marginTop: 6, padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Tone:</span>
              {['warm', 'short', 'heartfelt'].map(t => <button key={t} onClick={() => setTone(t)} style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: tone === t ? 'var(--sage-tint)' : 'var(--card)', border: '1px solid', borderColor: tone === t ? 'var(--sage-deep)' : 'var(--line)', color: tone === t ? 'var(--sage-deep)' : 'var(--ink-soft)' }}>{t}</button>)}
            </div>
            <button className="btn btn-primary btn-sm" style={{ background: 'var(--lavender-2)', color: '#3D4A1F' }}><Pear size={14} tone="sage" shadow={false}/> Draft {n} notes</button>
          </PLCard>

          <PLCard>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lavender-ink)', marginBottom: 4 }}>Anniversary nudges</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, margin: '0 0 14px' }}>A chapter on <span style={{ fontStyle: 'italic' }}>the day</span>.</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 13, borderRadius: 12, background: 'var(--peach-bg)', marginBottom: 12 }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}><div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--peach-ink)' }}>26</div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--peach-ink)' }}>APR</div></div>
              <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>Your 1st anniversary</div><div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>329 days away — Mon, April 26, 2028</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 13px', borderRadius: 11, background: 'var(--lavender-bg)', marginBottom: 12 }}>
              <Pear size={18} tone="sage" shadow={false} style={{ flexShrink: 0 }}/>
              <span style={{ fontSize: 12, color: 'var(--lavender-ink)', lineHeight: 1.45 }}>Pear drafts a new chapter each year on the anniversary, looking back and forward. Preview it now — it’ll be saved to the site so you can polish before the day.</span>
            </div>
            <button className="btn btn-outline btn-sm" style={{ background: 'var(--lavender-2)', color: '#3D4A1F', border: 'none' }}><Pear size={13} tone="sage" shadow={false}/> Preview this year</button>
          </PLCard>
        </div>
      </main>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<MemoryApp/>);
