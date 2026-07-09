/* PEARLOOM — DAY (redesigned, on-brand) */
const { useState: useDyState } = React;
const DY_RUNDOWN = [
  { t: '3:30', l: 'Arrive & settle', s: 'Grab a drink, grab a seat', done: true },
  { t: '4:00', l: 'Ceremony', s: 'Forty minutes, give or take a few happy tears', done: true },
  { t: '4:45', l: 'Cocktail hour', s: 'Signature drinks. Lawn games for the brave', done: true },
  { t: '6:00', l: 'Dinner', s: 'Family-style, local. Toasts from family', done: true },
  { t: '8:30', l: 'First dance + open floor', s: 'The slow one, then the loud one', done: false },
  { t: '10:30', l: 'Late-night bites', s: 'You’ll be hungry again, promise', done: false },
  { t: '11:30', l: 'Send-off', s: 'Sparklers at the entrance', now: true },
];
const DY_BROADCASTS = ['Ceremony beginning now — please find your seats.', 'Cocktail hour — drinks on the patio.', 'Dinner is served. Please head to your tables.', 'First dance starting — gather around.', 'Last call at the bar — last dance coming.', 'Send-off in 10 minutes. Sparklers at the entrance.'];

function DyStat({ icon, label, n, sub, tone }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: `var(--${tone}-2)`, display: 'grid', placeItems: 'center' }}><Icon name={icon} size={13} color="#2a2a22"/></span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(241,235,221,0.6)' }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--cream)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, color: 'rgba(241,235,221,0.55)', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function DayApp() {
  const [msg, setMsg] = useDyState('');
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', position: 'relative' }}>
      <ThemeDefs/><PLAtmosphere/><PLSidebar active="day"/>
      <main style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, padding: '24px 36px 60px', maxWidth: 1160, margin: '0 auto' }}>
        <PLTabs tabs={['Timeline', 'Seating']}/>
        <PLHead pre="Day-of room" title="Today’s the" italic="day." actions={<>
          <button className="btn btn-outline btn-sm"><Icon name="send" size={12}/> Share with crew</button>
          <a href="Pearloom Live Preview.html" className="btn btn-primary btn-sm"><Icon name="eye" size={12} color="var(--cream)"/> View the site</a>
        </>}/>

        {/* live banner */}
        <div style={{ borderRadius: 20, background: 'var(--ink)', padding: '20px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -16, right: -8, opacity: 0.16 }}><OliveSprig size={150} color="var(--cream)" berry="var(--gold)"/></div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B8D66A' }} className="pulse-dot"/>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(241,235,221,0.6)' }}>Live · Monday, June 1</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 600, color: 'var(--cream)', lineHeight: 1 }}>8:44 PM</span>
                <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--peach-2)' }}>it’s happening</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 18, minWidth: 280 }}>
              <DyStat icon="mail" label="RSVPs in" n="0" sub="Waiting on first reply" tone="peach"/>
              <DyStat icon="eye" label="Visits today" n="0" sub="Nothing yet" tone="sage"/>
              <DyStat icon="globe" label="Site visits" n="0" sub="Share your link" tone="lavender"/>
              <DyStat icon="gift" label="Registry" n="0" sub="—" tone="cream"/>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* broadcast */}
            <PLCard>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 4 }}>Live broadcast</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>Push a message that appears as a banner on every guest’s site instantly.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {DY_BROADCASTS.map(b => <button key={b} onClick={() => setMsg(b)} style={{ padding: '10px 11px', borderRadius: 10, background: 'var(--cream-2)', border: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'left', lineHeight: 1.35, cursor: 'pointer' }}>{b}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Custom message — guests scan in two seconds…" style={{ flex: 1, padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, outline: 'none' }}/>
                <button className="btn btn-primary btn-sm">Send</button>
              </div>
            </PLCard>
            {/* rundown */}
            <PLCard title="Today’s rundown" icon="clock" extra={<button className="btn btn-outline btn-sm"><Icon name="brush" size={11}/> Nudge timeline</button>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {DY_RUNDOWN.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 12, background: r.now ? 'var(--peach-bg)' : 'transparent', border: r.now ? '1px solid var(--peach-2)' : '1px solid transparent' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: r.done ? 'var(--sage-2)' : r.now ? 'var(--peach-2)' : 'var(--card)', border: r.done || r.now ? 'none' : '2px solid var(--line)', display: 'grid', placeItems: 'center' }}>{r.done ? <Icon name="check" size={13} color="#3D4A1F"/> : r.now ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink)' }}/> : null}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink-soft)', minWidth: 56 }}>{r.t}</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.l}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{r.s}</div></div>
                    {r.now && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--peach-ink)' }}>HAPPENING NOW</span>}
                  </div>
                ))}
              </div>
            </PLCard>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { t: 'Needs your nod', ic: 'bell', body: 'Vendor check-ins — DJ, catering, photographer — land here as they come. Nothing right now.', cta: 'Add vendors' },
              { t: 'Who’s coming', ic: 'users', body: 'No guests yet. Share your link or import a CSV to start tracking responses.', cta: 'Open editor', href: 'Pearloom Guests.html' },
              { t: 'On the floor', ic: 'music', body: 'Connect a Spotify playlist. Guest song requests from the RSVP form queue up here.', cta: 'Set up playlist' },
              { t: 'Notes from the crowd', ic: 'mail', body: 'Add a guestbook block on your site — any message guests leave shows up here.', cta: 'Add guestbook' },
            ].map(c => (
              <PLCard key={c.t} title={c.t} icon={c.ic}>
                <div style={{ textAlign: 'center', padding: '8px 6px 4px' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 12 }}>{c.body}</div>
                  <a href={c.href || '#'} className="btn btn-outline btn-sm"><Icon name="brush" size={11}/> {c.cta}</a>
                </div>
              </PLCard>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<DayApp/>);
