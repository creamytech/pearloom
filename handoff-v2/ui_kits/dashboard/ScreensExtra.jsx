/* global React */
// Pearloom dashboard — Registry (gifts + cash funds with group gifting,
// paste-any-store import, and a Pear thank-you composer) and Analytics
// (RSVP funnel, traffic source, and a jump to the quiet guests).
(() => {
const { Card, Badge, Button, Eyebrow, Thread, Pearl, PearloomGlyph } = window.PearloomDesignSystem_55118c;
const Icon = window.Icon;

// ───────────────────────── Registry ─────────────────────────
const GIFTS = [
  { name: 'A weekend in Big Sur', sub: 'Honeymoon fund', price: '$480', kind: 'fund', pct: 62, contrib: 3, tone: 'var(--sage-tint)', ink: 'var(--sage-deep)' },
  { name: 'Cast-iron everything', sub: 'The good skillet set', price: '$210', status: 'claimed', by: 'The Abernathys', tone: 'var(--peach-bg)', ink: 'var(--peach-ink)' },
  { name: 'Hario pour-over set', sub: 'Slow mornings', price: '$84', status: 'purchased', by: 'Priya N.', tone: 'rgba(193,154,75,0.16)', ink: '#8A6A2E' },
  { name: 'Linen table runner', sub: 'For the long table', price: '$120', tone: 'var(--lavender-bg)', ink: 'var(--lavender-ink)' },
  { name: 'A tree in their name', sub: 'Point Reyes restoration', price: '$60', status: 'purchased', by: 'Sage K.', tone: 'var(--sage-tint)', ink: 'var(--sage-deep)' },
  { name: 'Records, dealer\u2019s choice', sub: 'Build the shelf', price: '$45', tone: 'var(--cream-3)', ink: 'var(--ink-soft)' },
];
const THANKS = [
  { who: 'Priya N.', gift: 'Pour-over set', state: 'sent', note: '' },
  { who: 'Sage K.', gift: 'A tree in your name', state: 'drafted', note: 'Sage — a whole tree. We\u2019ll think of you every time we walk the Point Reyes trail. Thank you for rooting something that lasts. — M & J' },
  { who: 'The Abernathys', gift: 'Cast-iron skillet set', state: 'todo', note: 'Glenn & Ruth — the skillets already feel like the start of a hundred Sunday breakfasts. Thank you, and we can\u2019t wait to cook for you. — Mira & Jun' },
];
const T_LABEL = { sent: 'Sent', drafted: 'Drafted', todo: 'Not yet' };
const T_TONE = { sent: 'olive', drafted: 'gold', todo: 'neutral' };
function GiftStatus({ g }) {
  if (g.kind === 'fund') return (
    <div style={{ marginTop: 12 }}>
      <div style={{ height: 6, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: g.pct + '%', height: '100%', background: g.ink, borderRadius: 99 }} /></div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>{g.pct}% there</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--sage-deep)', fontFamily: 'var(--font-ui)' }}><Icon name="users" size={12} /> {g.contrib} chipping in</span>
      </div>
    </div>
  );
  if (g.status) return <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{g.status === 'purchased' ? 'Purchased' : 'Claimed'} by <strong style={{ color: 'var(--ink)' }}>{g.by}</strong></div>;
  return <div style={{ marginTop: 12, fontSize: 12, color: 'var(--sage-deep)', fontFamily: 'var(--font-ui)' }}>Available</div>;
}
function Registry() {
  const [url, setUrl] = React.useState('');
  const [sel, setSel] = React.useState(null);
  const claimed = GIFTS.filter((g) => g.status).length;
  const due = THANKS.filter((t) => t.state !== 'sent').length;
  const selT = sel != null ? THANKS[sel] : null;
  return (
    <main style={{ padding: '0 clamp(20px,4vw,40px) 56px', maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 22, alignItems: 'flex-start' }} className="pd-guests">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding={16} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--cream-3)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink, var(--peach-ink))', flexShrink: 0 }}><Icon name="link" size={16} /></span>
          <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cream-3)', border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px' }}>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a link from any store — Pear pulls in the photo, name & price…" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }} />
          </div>
          <Button variant="ink" size="sm">Add gift</Button>
          <Button variant="paper" size="sm">+ Cash fund</Button>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {GIFTS.map((g, i) => (
            <Card key={i} interactive padding={0} style={{ overflow: 'hidden', opacity: g.status === 'purchased' ? 0.72 : 1 }}>
              <div style={{ height: 110, background: g.tone, display: 'grid', placeItems: 'center', borderBottom: '1px solid var(--line)' }}>
                <Icon name={g.kind === 'fund' ? 'heart' : 'gift'} size={34} color={g.ink} />
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div className="pl-heading" style={{ fontSize: 16 }}>{g.name}</div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>{g.price}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--lavender-ink)', marginTop: 2 }}>{g.sub}</div>
                <GiftStatus g={g} />
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
        <Card padding={22}>
          <Eyebrow rule="none">The registry</Eyebrow>
          {[['Listed', GIFTS.length], ['Claimed', claimed], ['Still open', GIFTS.length - claimed]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{l}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{v}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, fontFamily: 'var(--font-ui)', marginTop: 6 }}>Cash funds settle straight to your account. No fees on gifts.</div>
        </Card>
        <Card padding={22} style={{ border: due ? '1px solid var(--gold-line)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Eyebrow rule="none" style={{ margin: 0 }}>Thank-yous</Eyebrow>
            {due ? <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--pl-gold)', color: 'var(--pl-ink)', borderRadius: 999, padding: '1px 8px' }}>{due} due</span> : null}
          </div>
          {THANKS.map((t, i) => (
            <button key={i} onClick={() => setSel(sel === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < THANKS.length - 1 ? '1px solid var(--line-soft)' : 'none', background: 'transparent', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{t.who}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{t.gift}</span>
              </span>
              <Badge tone={T_TONE[t.state]} variant="pill" dot={t.state === 'sent'}>{T_LABEL[t.state]}</Badge>
            </button>
          ))}
          {selT && selT.state !== 'sent' ? (
            <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'var(--cream-3)', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <PearloomGlyph size={15} color="var(--lavender-ink)" />
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--lavender-ink)' }}>PEAR DREW THIS UP</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: 'var(--ink)' }}>{selT.note}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <Button variant="ink" size="sm" style={{ flex: 1 }}>Send</Button>
                <Button variant="paper" size="sm">Edit</Button>
              </div>
            </div>
          ) : (
            <Button variant="ink" size="sm" style={{ width: '100%', marginTop: 12 }}>✦ Draft all with Pear</Button>
          )}
        </Card>
      </div>
    </main>
  );
}

// ──────────────────────── Analytics ────────────────────────
function Kpi({ l, v, delta, c }) {
  return (
    <Card padding="18px 20px">
      <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-muted)', marginBottom: 8 }}>{l.toUpperCase()}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)' }}>{v}</div>
      <div style={{ fontSize: 11.5, color: c, marginTop: 8, fontWeight: 500, fontFamily: 'var(--font-ui)' }}>{delta}</div>
    </Card>
  );
}
const FUNNEL = [
  { s: 'Invites sent', n: 64, pct: 100, c: 'var(--ink)' },
  { s: 'Opened', n: 56, pct: 88, c: 'var(--sage)' },
  { s: 'Started a reply', n: 49, pct: 77, c: 'var(--pl-gold)' },
  { s: 'Replied', n: 46, pct: 72, c: 'var(--accent-ink, var(--peach-ink))' },
];
const SOURCES = [
  { s: 'Text message', pct: 48, c: 'var(--sage)' },
  { s: 'Email', pct: 31, c: 'var(--pl-gold)' },
  { s: 'Shared link', pct: 21, c: 'var(--lavender-ink)' },
];
function Analytics() {
  return (
    <main style={{ padding: '0 clamp(20px,4vw,40px) 48px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }} className="pd-an-kpi">
        <Kpi l="Site visits · all time" v="2,418" delta="138 today" c="var(--sage)" />
        <Kpi l="Today" v="138" delta="Since midnight" c="var(--pl-gold)" />
        <Kpi l="Mobile share" v="68%" delta="1,644 mobile · 774 desktop" c="var(--lavender-ink)" />
        <Kpi l="RSVP conversion" v="72%" delta="46 of 64 invited" c="var(--accent-ink, var(--peach-ink))" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }} className="pd-an-charts">
        <Card padding={28}>
          <Eyebrow rule="none">From sent to replied</Eyebrow>
          <div className="pl-heading" style={{ fontSize: 22, margin: '8px 0 18px' }}>The RSVP <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>funnel.</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FUNNEL.map((f, i) => (
              <div key={f.s}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{f.s}</span>
                  <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11.5, color: 'var(--ink-muted)' }}>{f.n} · {f.pct}%</span>
                </div>
                <div style={{ height: 14, background: 'var(--cream-3)', borderRadius: 8, overflow: 'hidden' }}><div style={{ width: f.pct + '%', height: '100%', background: f.c, borderRadius: 8 }} /></div>
                {i < FUNNEL.length - 1 ? <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, color: 'var(--ink-muted)', marginTop: 4, textAlign: 'right' }}>↓ {FUNNEL[i].n - FUNNEL[i + 1].n} dropped</div> : null}
              </div>
            ))}
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card padding={24} style={{ background: 'var(--accent-bg, var(--peach-bg))', border: '1px solid var(--accent, var(--peach))' }}>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--accent-ink, var(--peach-ink))', marginBottom: 8 }}>STILL QUIET</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1, color: 'var(--ink)' }}>8 parties</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '8px 0 14px', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>opened the invite but never replied. Two more weeks until your deadline.</div>
            <Button variant="ink" size="sm" style={{ width: '100%' }}>See who in Guests →</Button>
          </Card>
          <Card padding={24}>
            <Eyebrow rule="none">How they arrived</Eyebrow>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SOURCES.map((s) => (
                <div key={s.s}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{s.s}</span>
                    <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, color: s.c }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: s.pct + '%', height: '100%', background: s.c, borderRadius: 99 }} /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }} className="pd-an-scroll">
        <Card padding={28}>
          <Eyebrow rule="none" color="var(--lavender-ink)" ruleColor="var(--lavender-ink)">What people read</Eyebrow>
          <div className="pl-heading" style={{ fontSize: 22, margin: '8px 0 16px' }}>Engagement <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>by section.</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Cover', 100, 'var(--sage)'], ['Our story', 88, 'var(--sage)'], ['The day', 81, 'var(--sage)'], ['Travel', 64, 'var(--pl-gold)'], ['Registry', 52, 'var(--pl-gold)'], ['FAQ', 41, 'var(--accent-ink, var(--peach-ink))'], ['Gallery', 33, 'var(--accent-ink, var(--peach-ink))'], ['RSVP', 71, 'var(--lavender-ink)']].map(([s, pct, c]) => (
              <div key={s} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 48px', gap: 14, alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{s}</div>
                <div style={{ height: 12, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: c, borderRadius: 99 }} /></div>
                <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, textAlign: 'right', color: c, fontWeight: 500 }}>{pct}%</div>
              </div>
            ))}
          </div>
        </Card>
        <Card padding={28} style={{ background: 'var(--ink)', color: 'var(--cream)', border: 'none' }}>
          <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--pl-gold)', marginBottom: 8 }}>PEAR'S READING</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.3, fontStyle: 'italic', fontWeight: 400, marginBottom: 18 }}>"Guests drop off around the Gallery. Want me to move it above Travel?"</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="paper" size="sm">Ask Pear why</Button>
            <Button variant="ghost" size="sm" style={{ color: 'var(--cream)', borderColor: 'rgba(245,239,226,0.22)' }}>Dismiss</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

window.Registry = Registry;
window.Analytics = Analytics;
})();
