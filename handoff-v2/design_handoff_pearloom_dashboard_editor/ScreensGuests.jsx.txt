/* global React */
// Pearloom dashboard — Guests. One home for everything guest-shaped:
// Roster (RSVPs · meals · dietary · follow-up cadence · table links),
// Messages (broadcast + DMs), and Seating. Built for what a host
// actually frets over — a confident headcount and a fed, seated room.
(() => {
const { Card, Badge, Button, Eyebrow, Thread, Pearl, PearloomGlyph } = window.PearloomDesignSystem_55118c;
const Icon = window.Icon;
const openGuestView = window.openGuestView;

// party = seats in the reply · kids = of which children · meal = entrée chosen · table = seated at
const GUESTS = [
  { party: 'Amara + Tobi', em: 'amara@hey.com', rsvp: 'yes', count: 2, kids: 0, meal: 'Fish', diet: 'Pescatarian', allergy: 'Tree nuts', note: '', track: 'opened', table: 3 },
  { party: 'Jonah Reyes', em: 'jonah@reyes.co', rsvp: 'yes', count: 1, kids: 0, meal: 'Garden', diet: 'Vegetarian', allergy: '', note: '', track: 'opened', table: 3 },
  { party: 'Cal & Dana Whitmore', em: 'cal@whitmore.net', rsvp: 'maybe', count: 2, kids: 1, meal: '', diet: '', allergy: '', note: 'High chair for the little one', track: 'opened' },
  { party: 'Priya + guest', em: 'priya.nair@gmail.com', rsvp: 'pending', count: 2, kids: 0, meal: '', diet: '', allergy: '', note: '', track: 'opened' },
  { party: 'Dewei Lin', em: 'dewei@lin.dev', rsvp: 'pending', count: 1, kids: 0, meal: '', diet: '', allergy: '', note: '', track: 'sent', stale: true },
  { party: 'Marisol + Diego', em: 'marisol@vega.mx', rsvp: 'yes', count: 2, kids: 0, meal: 'Beef', diet: '', allergy: 'Shellfish', note: '', track: 'opened', table: 1 },
  { party: 'Glenn & Ruth Abernathy', em: 'glenn@abernathy.us', rsvp: 'no', count: 0, kids: 0, meal: '', diet: '', allergy: '', note: 'Sends love', track: 'opened' },
  { party: 'Sage Kowalski', em: 'sage.k@proton.me', rsvp: 'pending', count: 1, kids: 0, meal: '', diet: 'Vegan', allergy: '', note: '', track: 'opened', stale: true },
];
const RSVP_TONE = { yes: 'olive', maybe: 'gold', no: 'plum', pending: 'neutral' };
const RSVP_LABEL = { yes: 'Coming', maybe: 'Maybe', no: 'Declined', pending: 'Pending' };
const CADENCE = [
  { when: 'Sent', label: 'Save-the-date', done: true },
  { when: 'Sun', label: 'Gentle reminder', done: true },
  { when: 'Aug 1', label: 'Firm nudge — Pear drafts', now: true },
  { when: 'Aug 8', label: 'Final call', done: false },
];

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 38, height: 22, borderRadius: 999, border: 'none', background: on ? 'var(--sage)' : 'var(--line)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 99, background: 'var(--cream)', transition: 'left 160ms var(--pl-ease-spring)', boxShadow: 'var(--shadow-sm)' }} />
    </button>
  );
}

function Roster() {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [pol, setPol] = React.useState({ plus: true, kids: true });
  const c = GUESTS.reduce((a, g) => { a.all++; a[g.rsvp]++; if (g.stale) a.stale++; return a; }, { all: 0, yes: 0, maybe: 0, no: 0, pending: 0, stale: 0 });
  const coming = GUESTS.filter((g) => g.rsvp === 'yes').reduce((s, g) => s + g.count, 0);
  const likely = GUESTS.filter((g) => g.rsvp === 'maybe').reduce((s, g) => s + g.count, 0);
  const kids = GUESTS.filter((g) => g.rsvp === 'yes').reduce((s, g) => s + g.kids, 0);
  const meals = GUESTS.filter((g) => g.meal).reduce((m, g) => { m[g.meal] = (m[g.meal] || 0) + 1; return m; }, {});
  const mealsLeft = coming - Object.values(meals).reduce((a, b) => a + b, 0);
  const allergies = GUESTS.filter((g) => g.allergy).map((g) => g.allergy);
  const rows = GUESTS.filter((g) => {
    const fm = filter === 'all' ? true : filter === 'stale' ? g.stale : g.rsvp === filter;
    return fm && (!q || (g.party + g.em + g.diet + g.allergy + g.note).toLowerCase().includes(q.toLowerCase()));
  });
  return (
    <div className="pd-guests" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--accent-bg, var(--peach-bg))', border: '1px solid var(--accent, var(--peach))', borderRadius: 12 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--card)', color: 'var(--accent-ink, var(--peach-ink))', flexShrink: 0 }}><Icon name="sparkles" size={15} /></span>
          <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, fontFamily: 'var(--font-ui)' }}><strong>{c.stale} parties</strong> opened the invite a week ago and never replied. Pear can send a gentle nudge in your voice.</span>
          <Button variant="terra" size="sm">Draft a nudge</Button>
        </div>
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
            <div className="pl-hscroll" style={{ display: 'flex', gap: 8 }}>
              {[['all', 'All'], ['yes', 'Coming'], ['maybe', 'Maybe'], ['pending', 'Pending'], ['stale', 'Quiet'], ['no', 'Declined']].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 13px', fontSize: 12, borderRadius: 999, background: filter === k ? 'var(--ink)' : 'transparent', color: filter === k ? 'var(--cream)' : 'var(--ink)', border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500, whiteSpace: 'nowrap' }}>{l} · {c[k] ?? c.all}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cream-3)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 12px', minWidth: 150 }}>
              <Icon name="search" size={13} color="var(--ink-muted)" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, diet, note…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }} />
            </div>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--sage-deep)' }}>Nobody here yet.</div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 6, fontFamily: 'var(--font-ui)' }}>Try another filter, or clear the search.</div>
            </div>
          ) : null}
          <div>
            {rows.map((g, i) => (
              <div key={g.em} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: 14, alignItems: 'center', padding: '13px 18px', borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{g.party}{g.count > 1 ? <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> · party of {g.count}{g.kids ? ` (${g.kids} child)` : ''}</span> : null}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--pl-font-mono)', marginTop: 2 }}>{g.em}{g.table ? <span style={{ color: 'var(--sage-deep)' }}> · table {g.table}</span> : g.track === 'opened' && g.rsvp === 'yes' ? ' · unseated' : ''}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                  {g.meal ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--cream-3)', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{g.meal}</span> : null}
                  {g.diet ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--sage-tint)', color: 'var(--sage-deep)', fontFamily: 'var(--font-ui)' }}>{g.diet}</span> : null}
                  {g.allergy ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--pl-plum-mist)', color: 'var(--pl-plum)', fontFamily: 'var(--font-ui)' }}>⚠ {g.allergy}</span> : null}
                  {g.note ? <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontStyle: 'italic', fontFamily: 'var(--font-ui)' }}>{g.note}</span> : null}
                </div>
                {g.stale ? <Button variant="paper" size="sm" onClick={() => openGuestView(g)}>Resend link</Button> : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge tone={RSVP_TONE[g.rsvp]} variant="pill" dot>{RSVP_LABEL[g.rsvp]}</Badge>
                    <button onClick={() => openGuestView(g)} title="See the site as this guest" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="arrow" size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
        <Card padding={22}>
          <Eyebrow rule="none">The count</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '10px 0 4px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 1, color: 'var(--ink)' }}>{coming}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontFamily: 'var(--font-ui)' }}>coming for sure</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', marginBottom: 14 }}>+{likely} likely · {kids} {kids === 1 ? 'child' : 'children'} · {c.pending} parties yet to reply</div>
          <Thread width="100%" style={{ margin: '0 0 12px' }} />
          <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-muted)', marginBottom: 8 }}>MEALS CHOSEN</div>
          {Object.entries(meals).map(([m, n]) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{m}</span>
              <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 12, color: 'var(--ink)' }}>{n}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>{mealsLeft} still to choose</div>
          {allergies.length ? <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--pl-plum-mist)', fontSize: 12, color: 'var(--pl-plum)', fontFamily: 'var(--font-ui)', lineHeight: 1.4 }}>⚠ Allergies: {allergies.join(', ')}</div> : null}
          <Button variant="paper" size="sm" style={{ width: '100%', marginTop: 12 }}>Export catering sheet</Button>
        </Card>
        <Card padding={22}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <Eyebrow rule="none" style={{ margin: 0 }}>Replies by</Eyebrow>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>Aug 10</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', marginBottom: 12 }}>23 days out · Pear's nudge cadence</div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'var(--line)' }} />
            {CADENCE.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', position: 'relative' }}>
                <span style={{ width: 12, height: 12, borderRadius: 99, flexShrink: 0, zIndex: 1, background: s.done ? 'var(--sage)' : s.now ? 'var(--accent-ink, var(--peach-ink))' : 'var(--cream)', border: `2px solid ${s.done ? 'var(--sage)' : s.now ? 'var(--accent-ink, var(--peach-ink))' : 'var(--line)'}` }} />
                <span style={{ flex: 1, fontSize: 12.5, color: s.done ? 'var(--ink-muted)' : 'var(--ink)', fontWeight: s.now ? 600 : 400, fontFamily: 'var(--font-ui)' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>{s.when}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card padding={22}>
          <Eyebrow rule="none">Reply form rules</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 10px', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>Allow a plus-one</span><span style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>Guests may bring one</span></span>
            <Toggle on={pol.plus} onClick={() => setPol((p) => ({ ...p, plus: !p.plus }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 2px' }}>
            <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>Kids welcome</span><span style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>Show a children count field</span></span>
            <Toggle on={pol.kids} onClick={() => setPol((p) => ({ ...p, kids: !p.kids }))} />
          </div>
        </Card>
        <Card padding={22} style={{ textAlign: 'center' }}>
          <Eyebrow rule="none">Each guest's own door</Eyebrow>
          <div style={{ width: 92, height: 92, margin: '12px auto 10px', borderRadius: 12, background: 'var(--cream-3)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}><PearloomGlyph size={40} /></div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-ui)', lineHeight: 1.5, marginBottom: 12 }}>Every guest gets a personal link. The site greets them by name and pre-fills their reply — and you see who's opened it.</div>
          <Button variant="ink" size="sm" style={{ width: '100%', marginBottom: 8 }} onClick={() => openGuestView({})}>Preview as a guest</Button>
          <button style={{ width: '100%', padding: '6px', background: 'transparent', border: 'none', color: 'var(--accent-ink, var(--peach-ink))', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}>See the live site →</button>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Messages ─────────────────────────
const TEMPLATES = ['Shuttle & parking', 'Weather update', 'Dress code', 'Thank you', 'Schedule change'];
const PARTY = [
  { from: 'Mira (you)', host: true, when: 'Jun 12', body: 'Shuttle leaves the hotel at 3:30 sharp — don\u2019t be the one we wait for!', to: 'All 64 guests' },
  { from: 'Jonah Reyes', host: false, when: 'Jun 13', body: 'Anyone want to split a cab from the airport Friday?' },
  { from: 'Priya Nair', host: false, when: 'Jun 14', body: 'I\u2019m in! Landing at 2pm.' },
];
const DMS = [
  { name: 'Cal Whitmore', last: 'We\u2019ll need a high chair for the little one.', msgs: [{ host: false, body: 'We\u2019ll need a high chair for the little one — possible?' }, { host: true, body: 'Absolutely, I\u2019ll let the venue know. Can\u2019t wait to meet them!' }] },
  { name: 'Sage Kowalski', last: 'You: See you there!', msgs: [{ host: false, body: 'Is the ceremony outdoors?' }, { host: true, body: 'It is — bring a layer for the evening. See you there!' }] },
];
function Messages() {
  const [draft, setDraft] = React.useState('');
  const [to, setTo] = React.useState('all');
  const [open, setOpen] = React.useState(0);
  const AUD = [['all', 'Everyone · 64'], ['yes', 'Coming · 38'], ['pending', 'Not replied · 8']];
  return (
    <div className="pd-msgs" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'flex-start' }}>
      <Card padding={22}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-muted)' }}>BROADCAST</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}><Icon name="clock" size={12} /> 1 scheduled for Aug 1</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {PARTY.map((m, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 12, background: m.host ? 'var(--sage-tint)' : 'var(--cream-3)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: m.host ? 'var(--sage-deep)' : 'var(--ink)', marginBottom: 3, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 6 }}>{m.from}{m.to ? <span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: 10 }}>→ {m.to}</span> : null}<span style={{ flex: 1 }} /><span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: 10.5 }}>{m.when}</span></div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{m.body}</div>
              {m.host ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--sage-bg)', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, letterSpacing: '0.08em', color: 'var(--sage-deep)' }}>SEEN BY 41 OF 64</span>
                <span style={{ flex: 1 }} />
                {['Site', 'Email', 'Text'].map((ch) => <span key={ch} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--sage-bg)', color: 'var(--sage-deep)', fontFamily: 'var(--font-ui)' }}>{ch}</span>)}
              </div> : null}
            </div>
          ))}
        </div>
        <div className="pl-hscroll" style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {AUD.map(([k, l]) => <button key={k} onClick={() => setTo(k)} style={{ padding: '5px 11px', fontSize: 11.5, borderRadius: 999, background: to === k ? 'var(--ink)' : 'transparent', color: to === k ? 'var(--cream)' : 'var(--ink)', border: `1px solid ${to === k ? 'var(--ink)' : 'var(--line)'}`, cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>{l}</button>)}
        </div>
        <div className="pl-hscroll" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {TEMPLATES.map((t) => <button key={t} onClick={() => setDraft(t + ': ')} style={{ padding: '5px 11px', fontSize: 11.5, borderRadius: 999, background: 'var(--cream-3)', border: '1px solid var(--line)', color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>{t}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setDraft(''); }} style={{ display: 'flex', gap: 8 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write to the chosen group…" style={{ flex: 1, padding: '10px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--cream-3)', fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--ink)', outline: 'none' }} />
          <Button variant="ink" size="sm" type="submit">Post</Button>
        </form>
      </Card>
      <Card padding={22} style={{ background: 'var(--cream-3)' }}>
        <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-muted)', marginBottom: 12 }}>DIRECT MESSAGES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DMS.map((d, i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</span>
                <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)' }}>{d.last}</span>
                <span style={{ color: 'var(--sage)', transform: open === i ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}><Icon name="chevron" size={13} /></span>
              </button>
              {open === i ? (
                <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.msgs.map((m, j) => (
                    <div key={j} style={{ alignSelf: m.host ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: '8px 12px', borderRadius: 12, fontSize: 12.5, lineHeight: 1.5, background: m.host ? 'var(--ink)' : 'var(--cream-3)', color: m.host ? 'var(--cream)' : 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{m.body}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────── Seating ─────────────────────────
const TABLES = [
  { n: 1, label: 'Family · Vega', seats: 8, filled: 8 },
  { n: 2, label: 'Family · Park', seats: 8, filled: 7 },
  { n: 3, label: 'College', seats: 10, filled: 6 },
  { n: 4, label: 'The neighbours', seats: 8, filled: 8 },
  { n: 5, label: 'Work & travel', seats: 10, filled: 4 },
  { n: 0, label: 'Sweetheart', seats: 2, filled: 2, head: true },
];
const UNSEATED = ['Dewei Lin', 'Sage Kowalski', 'Priya + 1', 'The Whitmores (+ high chair)'];
function TableToken({ tb, active, onClick }) {
  const full = tb.filled >= tb.seats;
  const ring = tb.head ? 'var(--pl-gold)' : full ? 'var(--sage)' : tb.filled === 0 ? 'var(--line)' : 'var(--accent-ink, var(--peach-ink))';
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 6 }}>
      <span style={{ position: 'relative', width: 74, height: 74, borderRadius: 999, background: active ? 'var(--accent-bg, var(--peach-bg))' : 'var(--card)', border: `2px solid ${active ? 'var(--ink)' : ring}`, display: 'grid', placeItems: 'center', boxShadow: active ? 'var(--shadow)' : 'var(--shadow-sm)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', lineHeight: 1 }}>{tb.head ? '♥' : tb.n}</span>
        {Array.from({ length: tb.seats }).map((_, i) => {
          const a = (i / tb.seats) * Math.PI * 2 - Math.PI / 2; const rad = 45;
          return <span key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 9, height: 9, borderRadius: 99, transform: `translate(-50%,-50%) translate(${Math.cos(a) * rad}px, ${Math.sin(a) * rad}px)`, background: i < tb.filled ? (tb.head ? 'var(--pl-gold)' : full ? 'var(--sage)' : 'var(--accent-ink, var(--peach-ink))') : 'var(--cream-3)', border: '1.5px solid var(--card)' }} />;
        })}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{tb.label}</span>
      <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: full ? 'var(--sage-deep)' : 'var(--ink-muted)' }}>{tb.filled}/{tb.seats}</span>
    </button>
  );
}
function Seating() {
  const [active, setActive] = React.useState(3);
  const seated = TABLES.reduce((a, t) => a + t.filled, 0);
  return (
    <div className="pd-conn" style={{ display: 'grid', gridTemplateColumns: '1.5fr 300px', gap: 20, alignItems: 'flex-start' }}>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-muted)' }}>THE FLOOR</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 3, fontWeight: 500, color: 'var(--ink)' }}>{TABLES.length} tables · {seated} seated</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--pl-plum)' }} /> allergy</span>
            <Button variant="paper" size="sm">+ Table</Button>
          </div>
        </div>
        <div className="pl-tx-dotwork" style={{ padding: '28px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 12, justifyItems: 'center', minHeight: 420, background: 'linear-gradient(180deg, var(--cream-2), var(--cream-3))' }}>
          {TABLES.map((tb) => <TableToken key={tb.label} tb={tb} active={active === tb.n} onClick={() => setActive(tb.n)} />)}
        </div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
        <Card padding={22} style={{ background: 'var(--lavender-bg)', border: '1px solid var(--lavender-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <PearloomGlyph size={20} color="var(--lavender-ink)" />
            <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--lavender-ink)' }}>LET PEAR SOLVE IT</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, fontFamily: 'var(--font-ui)', marginBottom: 14 }}>Keep the Vegas and Parks apart, sit the Whitmores near a high chair, group the allergies away from the shellfish course — Pear seats the last {UNSEATED.length} parties to your rules.</div>
          <Button variant="ink" size="sm" style={{ width: '100%' }}>✦ Auto-seat the rest</Button>
        </Card>
        <Card padding={22}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <Eyebrow rule="none">Unseated</Eyebrow>
            <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, color: 'var(--accent-ink, var(--peach-ink))' }}>{UNSEATED.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {UNSEATED.map((u) => (
              <span key={u} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'var(--cream-3)', border: '1px dashed var(--line)', fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font-ui)', cursor: 'grab' }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent-ink, var(--peach-ink))' }} />{u}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ───────────────────────── Guests shell ─────────────────────────
const TABS = [['roster', 'Roster', 'users'], ['messages', 'Messages', 'message'], ['seating', 'Seating', 'table']];
function Guests() {
  const [tab, setTab] = React.useState('roster');
  return (
    <main style={{ padding: '0 clamp(20px,4vw,40px) 48px', maxWidth: 1180, margin: '0 auto' }}>
      <div className="pl-hscroll" style={{ display: 'flex', gap: 8, marginBottom: 22, borderBottom: '1px solid var(--line)' }}>
        {TABS.map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 4px', marginRight: 18, fontSize: 14, fontWeight: tab === k ? 600 : 500, color: tab === k ? 'var(--ink)' : 'var(--ink-muted)', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === k ? 'var(--ink)' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>
            <Icon name={ic} size={15} /> {l}
          </button>
        ))}
      </div>
      {tab === 'roster' ? <Roster /> : tab === 'messages' ? <Messages /> : <Seating />}
    </main>
  );
}

window.Guests = Guests;
})();
