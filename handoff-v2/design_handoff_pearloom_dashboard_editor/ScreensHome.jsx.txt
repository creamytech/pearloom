/* global React */
// Pearloom dashboard — Home, the cockpit. Open it and know in two
// seconds: are we on track, and what needs me today. Phase-aware
// urgency, an openable budget breakdown, co-host presence, the day-of
// run-of-show + broadcast, and a Pear nudge. Occasion-aware copy.
(() => {
const { Card, Badge, Button, Eyebrow, Thread, Pearl, PearloomGlyph } = window.PearloomDesignSystem_55118c;
const Icon = window.Icon;
const CountUp = window.CountUp;

const STATS = [
  { k: 'rsvp', l: 'Coming', num: 38, v: '38', sub: '+5 likely · of 64', c: 'var(--sage)', i: 'users' },
  { k: 'budget', l: 'Budget used', num: 74, suffix: '%', v: '74%', sub: '$35.4k of $48k · tap to open', c: 'var(--accent-ink, var(--peach-ink))', i: 'heart', bar: 74 },
  { k: 'gifts', l: 'Gifts claimed', num: 12, v: '12', sub: 'of 18 · 3 thank-yous due', c: 'var(--pl-gold)', i: 'gift' },
  { k: 'days', l: 'Days to go', num: 84, v: '84', sub: 'Sept 6, 2026', c: 'var(--lavender-ink)', i: 'clock' },
];
const BUDGET = [
  { cat: 'Venue', used: 14000, cap: 14000 },
  { cat: 'Catering', used: 11000, cap: 13000 },
  { cat: 'Florals', used: 4400, cap: 4000 },
  { cat: 'Music & sound', used: 3000, cap: 3500 },
  { cat: 'Attire', used: 2000, cap: 3000 },
  { cat: 'Stationery & other', used: 1000, cap: 2500 },
];
// Phase-aware decision queue — what Pear surfaces shifts with the count.
const PHASES = {
  planning: { label: 'Planning', note: '84 days out', decide: [
    { i: 'image', t: '3 guest photos are waiting for the wall', sub: 'The Reel', cta: 'Review', accent: true },
    { i: 'users', t: '2 parties opened the invite but never replied', sub: 'Guests · Pear can draft the nudge', cta: 'Nudge' },
    { i: 'heart', t: "You're $400 over on florals", sub: 'Budget · Pear found room in the bar package', cta: 'Show me' },
    { i: 'music', t: 'First-dance song is still open', sub: 'Studio', cta: 'Pick' },
  ] },
  final: { label: 'Final stretch', note: '12 days out', decide: [
    { i: 'users', t: 'Send the final headcount to Lark Hill', sub: 'Day-of · 43 confirmed', cta: 'Send', accent: true },
    { i: 'table', t: '4 parties are still unseated', sub: 'Guests · Seating', cta: 'Seat' },
    { i: 'clock', t: 'Confirm the shuttle window with Renata', sub: 'Day-of', cta: 'Confirm' },
  ] },
  dayof: { label: 'The day', note: 'today', decide: [
    { i: 'clock', t: 'Shuttle leaves in 40 minutes', sub: '42 guests · Lobby', cta: 'Remind all', accent: true },
    { i: 'message', t: 'Cal asked where to park', sub: 'Messages', cta: 'Reply' },
  ] },
};
const WEEK = [
  { t: 'Approve the new guest photos', who: 'The Reel', done: false },
  { t: 'Send the menu to Lark Hill', who: 'Day-of', done: false },
  { t: 'Confirm the shuttle window', who: 'Renata Cole', done: false },
  { t: 'Lock the first-dance song', who: 'Studio', done: true },
];
const RUN = [
  { t: '3:30', label: 'Shuttle leaves the hotel', who: '42 guests' },
  { t: '5:00', label: 'The ceremony', who: 'Under the cypress' },
  { t: '6:30', label: 'Supper & toasts', who: 'The long table' },
];
const FEED = [
  { who: 'Amara', act: 'replied — coming, +1', when: '2 hr', i: 'check', c: 'var(--sage)' },
  { who: 'Jun', act: 'confirmed the florist deposit', when: '4 hr', i: 'heart', c: 'var(--lavender-ink)' },
  { who: 'Priya', act: 'bought the pour-over set', when: 'yesterday', i: 'gift', c: 'var(--pl-gold)' },
];
const fmt = (n) => '$' + (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k';

function Stat({ s, onClick, open }) {
  return (
    <Card padding="16px 18px" interactive onClick={onClick} style={onClick ? { cursor: 'pointer', borderColor: open ? 'var(--accent-ink, var(--peach-ink))' : undefined } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-muted)' }}>{s.l.toUpperCase()}</div>
        <span style={{ display: 'inline-flex', color: s.c }}><Icon name={onClick ? (open ? 'chevron' : 'bars') : s.i} size={15} /></span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)' }}>{CountUp ? <span><CountUp value={s.num} />{s.suffix || ''}</span> : s.v}</div>
      {s.bar != null ? <div style={{ height: 4, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden', margin: '8px 0 6px' }}><div style={{ width: s.bar + '%', height: '100%', background: s.c, borderRadius: 99 }} /></div> : null}
      <div style={{ fontSize: 11.5, color: s.c, marginTop: s.bar != null ? 0 : 8, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>{s.sub}</div>
    </Card>
  );
}

function BudgetBreakdown() {
  const total = BUDGET.reduce((a, b) => a + b.cap, 0);
  const used = BUDGET.reduce((a, b) => a + b.used, 0);
  return (
    <Card padding={26}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Eyebrow rule="none">Budget</Eyebrow>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-soft)' }}><strong style={{ color: 'var(--ink)' }}>{fmt(used)}</strong> committed of {fmt(total)} · <span style={{ color: 'var(--sage-deep)' }}>{fmt(total - used)} left</span></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', marginTop: 16 }} className="pd-budget">
        {BUDGET.map((b) => {
          const over = b.used > b.cap;
          const pct = Math.min(100, (b.used / b.cap) * 100);
          return (
            <div key={b.cat}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{b.cat}</span>
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11.5, color: over ? 'var(--pl-plum)' : 'var(--ink-muted)' }}>{fmt(b.used)} / {fmt(b.cap)}{over ? ' ⚠' : ''}</span>
              </div>
              <div style={{ height: 7, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: over ? 'var(--pl-plum)' : 'var(--sage)', borderRadius: 99 }} /></div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--lavender-bg)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <PearloomGlyph size={18} color="var(--lavender-ink)" />
        <span style={{ flex: 1 }}>Florals are $400 over. Trim the bar package to two signature cocktails to even out?</span>
        <Button variant="ink" size="sm">Do it</Button>
      </div>
    </Card>
  );
}

function Home() {
  const [done, setDone] = React.useState(WEEK.map((w) => w.done));
  const [bc, setBc] = React.useState('');
  const [openBudget, setOpenBudget] = React.useState(false);
  const phase = PHASES.planning;
  const left = done.filter((d) => !d).length;
  return (
    <main style={{ padding: '0 clamp(20px,4vw,40px) 48px', maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding={0} style={{ overflow: 'hidden', background: 'var(--ink)', border: 'none', color: 'var(--cream)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr' }} className="pd-home-hero">
          <div style={{ padding: 'clamp(24px,3vw,36px)' }}>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--pl-gold)', marginBottom: 12 }}>A BRIGHT SATURDAY IN POINT REYES</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px,5.4vw,64px)', lineHeight: 0.98, fontWeight: 400, letterSpacing: '-0.03em' }}>{CountUp ? <CountUp value={84} /> : 84} <span style={{ fontStyle: 'italic', color: 'var(--peach)' }}>days</span></div>
            <div style={{ fontSize: 15, color: 'var(--stone, #C9BFA8)', marginTop: 12, lineHeight: 1.5, fontFamily: 'var(--font-ui)', maxWidth: 420 }}>until two families gather at one very long table. You're on track — {phase.decide.length} things want a decision, and {left} small tasks are left this week.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
              <div style={{ display: 'flex' }}>
                {[['M', 'var(--sage-deep)'], ['J', 'var(--lavender-ink)']].map(([n, c], i) => (
                  <span key={n} style={{ width: 28, height: 28, borderRadius: 999, background: c, border: '2px solid var(--ink)', marginLeft: i ? -8 : 0, display: 'grid', placeItems: 'center', color: 'var(--cream)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13 }}>{n}</span>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--stone, #C9BFA8)', fontFamily: 'var(--font-ui)' }}>You &amp; Jun, co-hosting · <span style={{ color: 'var(--peach)' }}>Jun was here 4h ago</span></span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <Button variant="pearl" size="sm">Open the site <Pearl size={8} /></Button>
              <Button variant="ghost" size="sm" style={{ color: 'var(--cream)', borderColor: 'rgba(245,239,226,0.24)' }}>✦ Ask Pear to plan</Button>
            </div>
          </div>
          <div style={{ position: 'relative', minHeight: 220, background: 'linear-gradient(140deg, rgba(240,201,168,0.22), rgba(196,181,217,0.16))', borderLeft: '1px solid rgba(245,239,226,0.12)', display: 'grid', placeItems: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }} className="pl-tx-laid" />
            <PearloomGlyph size={92} color="rgba(245,239,226,0.5)" />
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }} className="pd-home-stats">
        {STATS.map((s) => <Stat key={s.k} s={s} onClick={s.k === 'budget' ? () => setOpenBudget((v) => !v) : undefined} open={s.k === 'budget' && openBudget} />)}
      </div>
      {openBudget ? <BudgetBreakdown /> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'flex-start' }} className="pd-home-cols">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card padding={26}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--accent-ink, var(--peach-ink))' }} />
              <Eyebrow rule="none" style={{ margin: 0 }}>Needs you now</Eyebrow>
              <span style={{ flex: 1 }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'var(--cream-3)', border: '1px solid var(--line)', fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--ink-soft)' }}>{phase.label.toUpperCase()} · {phase.note.toUpperCase()}</span>
            </div>
            <div className="pl-heading" style={{ fontSize: 22, margin: '4px 0 16px' }}>{phase.decide.length} things only <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>you can decide.</span></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {phase.decide.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: i < phase.decide.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: d.accent ? 'var(--accent-bg, var(--peach-bg))' : 'var(--cream-3)', color: d.accent ? 'var(--accent-ink, var(--peach-ink))' : 'var(--ink-soft)' }}><Icon name={d.i} size={16} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)', lineHeight: 1.35 }}>{d.t}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, fontFamily: 'var(--font-ui)' }}>{d.sub}</span>
                  </span>
                  <Button variant={d.accent ? 'ink' : 'paper'} size="sm">{d.cta}</Button>
                </div>
              ))}
            </div>
          </Card>
          <Card padding={26}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <Eyebrow rule="none">This week</Eyebrow>
              <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, color: 'var(--ink-muted)' }}>{left} open</span>
            </div>
            {WEEK.map((w, i) => (
              <button key={i} onClick={() => setDone((d) => d.map((v, j) => j === i ? !v : v))} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: i < WEEK.length - 1 ? '1px solid var(--line-soft)' : 'none', background: 'transparent', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center', border: `1.5px solid ${done[i] ? 'var(--sage)' : 'var(--line)'}`, background: done[i] ? 'var(--sage)' : 'transparent', color: 'var(--cream)' }}>{done[i] ? <Icon name="check" size={12} strokeWidth={3} /> : null}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: done[i] ? 'var(--ink-muted)' : 'var(--ink)', textDecoration: done[i] ? 'line-through' : 'none', fontFamily: 'var(--font-ui)' }}>{w.t}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginTop: 1, fontFamily: 'var(--font-ui)' }}>{w.who}</span>
                </span>
              </button>
            ))}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Eyebrow rule="none">The day</Eyebrow>
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, color: 'var(--ink-muted)' }}>OPENS SEPT 1</span>
              </div>
              <div className="pl-heading" style={{ fontSize: 19, margin: '6px 0 12px' }}>Run of <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>the day.</span></div>
            </div>
            <div style={{ padding: '0 20px' }}>
              {RUN.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '8px 0', borderBottom: i < RUN.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 12, color: 'var(--accent-ink, var(--peach-ink))', width: 38 }}>{r.t}</span>
                  <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{r.label}</span><span style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{r.who}</span></span>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 20px 18px', marginTop: 8, background: 'var(--ink)', color: 'var(--cream)' }}>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--pl-gold)', marginBottom: 8 }}>IF PLANS SHIFT — ONE LINE TO ALL</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={bc} onChange={(e) => setBc(e.target.value)} placeholder="e.g. Shuttle now at 3:45…" style={{ flex: 1, padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(245,239,226,0.2)', background: 'rgba(245,239,226,0.06)', color: 'var(--cream)', fontSize: 12.5, fontFamily: 'var(--font-ui)', outline: 'none' }} />
                <Button variant="pearl" size="sm">Send</Button>
              </div>
            </div>
          </Card>
          <Card padding={22}>
            <Eyebrow rule="none">Lately</Eyebrow>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {FEED.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < FEED.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--cream-3)', color: f.c }}><Icon name={f.i} size={13} /></span>
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}><strong style={{ fontWeight: 600 }}>{f.who}</strong> {f.act}</span>
                  <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>{f.when}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 26px 0' }}>
          <Eyebrow rule="none">The long view</Eyebrow>
          <div className="pl-heading" style={{ fontSize: 20, margin: '6px 0 2px' }}>This day is the <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>first knot.</span></div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, fontFamily: 'var(--font-ui)', maxWidth: 560, margin: '6px 0 0' }}>A wedding today is a keepsake in forty years. Pear keeps the weave going long after the last dance.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, padding: '20px 26px 24px' }}>
          {[['heart', 'Sept 6, 2026', 'The day', 'var(--accent-ink, var(--peach-ink))', true], ['image', 'That week', 'The Reel fills with guest photos', 'var(--sage)'], ['gift', 'One year on', 'Pear sends a first-anniversary note', 'var(--pl-gold)'], ['sparkles', 'Forever', 'The site becomes a keepsake page', 'var(--lavender-ink)']].map(([ic, when, what, c, now], i, arr) => (
            <div key={when} style={{ position: 'relative', paddingRight: 16 }}>
              {i < arr.length - 1 ? <div style={{ position: 'absolute', left: 16, right: 0, top: 16, height: 2, background: 'var(--line)', backgroundImage: 'linear-gradient(90deg, var(--line) 50%, transparent 50%)', backgroundSize: '8px 2px' }} /> : null}
              <span style={{ position: 'relative', zIndex: 1, width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', background: now ? c : 'var(--card)', color: now ? 'var(--cream)' : c, border: `2px solid ${c}` }}><Icon name={ic} size={15} /></span>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-muted)', marginTop: 12 }}>{when.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)', marginTop: 3, lineHeight: 1.4 }}>{what}</div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

window.Home = Home;
})();
