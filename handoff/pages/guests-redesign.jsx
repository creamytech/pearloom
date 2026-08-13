/* =========================================================================
   PEARLOOM — GUESTS (redesigned to match the editor & generated-site look)
   Warm linen texture, olive motifs, editorial type. Reads real RSVP data
   from the published-site flow (localStorage 'pl-rsvps') + a seed roster.
   ========================================================================= */

const { useState: useGuState, useEffect: useGuEff } = React;

const GU_NAV = [
  { id: 'home', label: 'Home', icon: 'home', href: 'Pearloom Home Redesign.html' },
  { id: 'site', label: 'Site', icon: 'layout', href: 'Pearloom Editor Redesign.html' },
  { id: 'guests', label: 'Guests', icon: 'users', href: '#' },
  { id: 'day', label: 'Day', icon: 'clock', href: 'Pearloom Day.html' },
  { id: 'studio', label: 'Studio', icon: 'brush', href: 'Pearloom Studio Redesign.html' },
  { id: 'memory', label: 'Memory', icon: 'heart-icon', href: 'Pearloom Memory.html' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: 'Pearloom Settings.html' },
];
const GU_EVENTS = [
  { l: 'Arrive & settle', t: '3:30' }, { l: 'Ceremony', t: '4:00' }, { l: 'Cocktail hour', t: '4:45' },
  { l: 'Dinner', t: '6:00' }, { l: 'First dance', t: '8:30' }, { l: 'Late-night bites', t: '10:30' }, { l: 'Send-off', t: '11:30' },
];
const GU_SEED = [
  { name: 'Linda Chen', party: 'Linda Chen', status: 'yes', meal: 'Vegetarian', plus: 'Marco', note: 'Can’t wait!', diet: '' },
  { name: 'Marcus Patel', party: 'The Patels', status: 'yes', meal: 'Chicken', diet: 'Nut allergy' },
  { name: 'Priya Patel', party: 'The Patels', status: 'yes', meal: 'Fish' },
  { name: 'Sam Rivera', party: 'Sam Rivera', status: 'maybe', meal: '' },
  { name: 'Theo Park', party: 'Theo Park', status: 'no', note: 'So sorry to miss it.' },
  { name: 'Aunt Rosa', party: 'Rosa M.', status: 'pending' },
  { name: 'Daniel Okafor', party: 'Daniel O.', status: 'pending' },
];

function readRoster() {
  let live = [];
  try {
    const all = JSON.parse(localStorage.getItem('pl-rsvps') || '{}');
    Object.values(all).forEach(p => (p.guests || []).forEach(g => live.push({ name: g.name, party: p.label, status: g.attending || 'pending', meal: g.meal, diet: g.dietary })));
  } catch (e) {}
  const seen = new Set(live.map(g => g.name.toLowerCase()));
  const merged = [...live, ...GU_SEED.filter(g => !seen.has(g.name.toLowerCase()))];
  return merged;
}

function GuSidebar() {
  return (
    <aside className="pl-sidebar" style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--line-soft)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 0, height: '100vh' }}>
      <a href="Pearloom Home Redesign.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 6px' }}>
        <Pear size={24} tone="sage" shadow={false}/>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>Pearloom</span>
      </a>
      <div className="pl-side-chip" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line-soft)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--lavender-2), var(--peach-2))' }}/>
        <div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Scott &amp; Shauna</div><div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>Apr 26, 2027</div></div>
      </div>
      <nav className="pl-side-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {GU_NAV.map(n => {
          const on = n.id === 'guests';
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

function GuStat({ label, n, tone }) {
  return (
    <div style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line-soft)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1, marginTop: 2 }}>{n}</div>
      <div style={{ height: 3, borderRadius: 999, background: tone, marginTop: 8, opacity: 0.5 }}/>
    </div>
  );
}

function GuestRow({ g }) {
  const statusMap = {
    yes: { l: 'Joyfully', bg: 'var(--sage-tint)', fg: 'var(--sage-deep)' },
    no: { l: 'Regretfully', bg: 'var(--cream-2)', fg: 'var(--ink-muted)' },
    maybe: { l: 'Maybe', bg: 'var(--lavender-bg)', fg: 'var(--lavender-ink)' },
    pending: { l: 'Pending', bg: 'var(--cream-2)', fg: 'var(--ink-soft)' },
  };
  const s = statusMap[g.status] || statusMap.pending;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage), var(--sage-deep))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{g.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}{g.plus && <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 500 }}> · +1 {g.plus}</span>}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{g.party}{g.note ? ` · “${g.note}”` : ''}</div>
      </div>
      {g.meal && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', background: 'var(--cream-2)', padding: '4px 9px', borderRadius: 999 }}>{g.meal}</span>}
      {g.diet && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--peach-ink)', background: 'var(--peach-bg)', padding: '4px 9px', borderRadius: 999 }}>{g.diet}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, color: s.fg, background: s.bg, padding: '5px 11px', borderRadius: 999, minWidth: 78, textAlign: 'center' }}>{s.l}</span>
    </div>
  );
}

function GuestsApp() {
  const [roster, setRoster] = useGuState(readRoster);
  const [filter, setFilter] = useGuState('all');
  const [q, setQ] = useGuState('');
  useGuEff(() => { const h = () => setRoster(readRoster()); window.addEventListener('pl-rsvp-saved', h); return () => window.removeEventListener('pl-rsvp-saved', h); }, []);

  const count = (st) => roster.filter(g => g.status === st).length;
  const tallies = { invited: roster.length, yes: count('yes'), maybe: count('maybe'), pending: count('pending'), declined: count('no') };
  const filtered = roster.filter(g => (filter === 'all' || g.status === filter) && (!q || g.name.toLowerCase().includes(q.toLowerCase()) || (g.party || '').toLowerCase().includes(q.toLowerCase())));
  const diet = roster.filter(g => g.diet).length;
  const plus = roster.filter(g => g.plus).length;
  const notes = roster.filter(g => g.note).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream)', position: 'relative' }}>
      <ThemeDefs/>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 120, right: 60, opacity: 0.07, transform: 'rotate(10deg)' }}><OliveSprig size={230} color="var(--sage)" berry="var(--gold)"/></div>
        <div style={{ position: 'absolute', bottom: 60, left: 260, opacity: 0.05, transform: 'rotate(-8deg) scaleX(-1)' }}><OliveSprig size={190} color="var(--sage)" berry="var(--gold)"/></div>
      </div>
      <GuSidebar/>
      <main style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1, padding: '24px 36px 60px', maxWidth: 1180, margin: '0 auto' }}>
        {/* tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
          {['Roster', 'Submissions', 'Registry'].map((t, i) => (
            <button key={t} style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--cream)' : 'var(--ink-soft)' }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22, alignItems: 'start' }}>
          <div>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>The <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>guest list</span>.</h1>
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 4, maxWidth: 480 }}>Every RSVP, meal note and plus-one, recorded. Pear follows up on the quiet ones once a week.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm">Import CSV</button>
                <button className="btn btn-primary btn-sm"><Icon name="plus" size={12} color="var(--cream)"/> Add a guest</button>
              </div>
            </div>

            {/* tallies */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <GuStat label="Invited" n={tallies.invited} tone="var(--ink-muted)"/>
              <GuStat label="Yes" n={tallies.yes} tone="var(--sage)"/>
              <GuStat label="Maybe" n={tallies.maybe} tone="var(--lavender-2)"/>
              <GuStat label="Pending" n={tallies.pending} tone="var(--cream-3)"/>
              <GuStat label="Declined" n={tallies.declined} tone="var(--peach-2)"/>
            </div>

            {/* by event */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '8px 0 10px' }}>By event</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
              {GU_EVENTS.slice(0, 4).map(e => (
                <div key={e.l} style={{ padding: 13, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{e.l}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginTop: 4 }}>{tallies.yes} <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400 }}>yes</span></div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>{e.t}</div>
                </div>
              ))}
            </div>

            {/* filters + search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              {[['all', 'All'], ['yes', 'Yes'], ['pending', 'Pending'], ['maybe', 'Maybe'], ['no', 'No']].map(([id, l]) => {
                const n = id === 'all' ? roster.length : count(id);
                const on = filter === id;
                return <button key={id} onClick={() => setFilter(id)} style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: on ? 'var(--ink)' : 'var(--card)', color: on ? 'var(--cream)' : 'var(--ink-soft)', border: on ? 'none' : '1px solid var(--line)' }}>{l} · {n}</button>;
              })}
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <Icon name="search" size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}/>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or tag" style={{ padding: '8px 12px 8px 32px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 12.5, width: 200, outline: 'none' }}/>
              </div>
            </div>

            {/* roster */}
            <div style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--line-soft)', overflow: 'hidden', marginTop: 10 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                  <Pear size={44} tone="sage" shadow={false}/>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, marginTop: 10 }}>No guests here yet.</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, maxWidth: 320, marginInline: 'auto' }}>Share your invite link or import a CSV. Pear tracks RSVPs, meals and notes as they come in.</div>
                </div>
              ) : filtered.map((g, i) => <GuestRow key={i} g={g}/>)}
            </div>
          </div>

          {/* right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ borderRadius: 16, background: 'var(--ink)', color: 'var(--cream)', padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -14, right: -10, opacity: 0.18 }}><OliveSprig size={120} color="var(--cream)" berry="var(--gold)"/></div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Pear noticed</div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, lineHeight: 1.35 }}>{tallies.pending} guests haven’t replied. Want me to send a gentle nudge?</div>
                <button className="btn btn-sm" style={{ marginTop: 12, background: 'var(--cream)', color: 'var(--ink)' }}>Draft the reminder</button>
              </div>
            </div>
            <div style={{ borderRadius: 16, background: 'var(--peach-bg)', padding: 18 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 8 }}>Soft insights</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Small things <span style={{ fontStyle: 'italic' }}>matter</span>.</div>
              {[[`${diet} guests`, 'Dietary notes'], [`${plus} guests`, 'Plus-ones confirmed'], [`${notes} notes`, 'Messages left']].map(([n, l]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--card)', marginBottom: 7, fontSize: 12.5 }}>
                  <span style={{ fontWeight: 700 }}>{n}</span><span style={{ color: 'var(--ink-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
            <a href="Pearloom Live Preview.html" className="lift" style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line-soft)', padding: 14, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center' }}><Icon name="eye" size={16} color="var(--lavender-ink)"/></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>Try the guest RSVP</div><div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>See what guests fill in</div></div>
              <Icon name="arrow-right" size={14} color="var(--ink-soft)"/>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GuestsApp/>);
