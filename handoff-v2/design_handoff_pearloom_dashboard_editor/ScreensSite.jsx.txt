/* global React */
// Pearloom dashboard — My sites. Every celebration you're hosting, each
// card carrying its live pulse, its co-hosts, its address, and the one
// thing it needs next. New sites start from an occasion; old ones rest
// in the archive.
(() => {
const { Card, Badge, Button, Eyebrow, Pearl, PearloomGlyph } = window.PearloomDesignSystem_55118c;
const Icon = window.Icon;
const LockChip = window.LockChip;

const MY = [
  { name: 'Mira & Jun', occ: 'Wedding', date: 'Sept 6, 2026', status: 'live', tint: 'var(--peach-bg)', ink: 'var(--peach-ink)', img: '../../assets/imagery/vase-linen-still.png', rsvp: '38 / 64', visits: '2,418', theme: 'Pressed Garden', next: '3 photos to approve', domain: 'mira-and-jun.com', domainOk: true, hosts: [['M', 'var(--sage-deep)'], ['J', 'var(--lavender-ink)']] },
  { name: "Maya's 30th", occ: 'Birthday', date: 'Aug 16, 2026', status: 'draft', tint: 'rgba(193,154,75,0.16)', ink: '#8A6A2E', img: null, rsvp: '— / 24', visits: '0', theme: 'First Light', next: 'Pear has a draft ready', domain: 'pearloom.com/mayas-30th', domainOk: false, hosts: [['M', 'var(--sage-deep)']] },
];
const ARCHIVED = [{ name: 'Vega family reunion', occ: 'Reunion', date: 'Last July', tint: 'var(--sage-tint)', ink: 'var(--sage-deep)' }];
const OCCASIONS = [['Wedding', 'heart'], ['Birthday', 'sparkles'], ['Anniversary', 'gift'], ['Memorial', 'pin'], ['Shower', 'image'], ['Something else', 'plus']];

function SiteCard({ s }) {
  return (
    <Card interactive padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ height: 150, position: 'relative', background: s.img ? `center/cover url(${s.img})` : s.tint, borderBottom: '1px solid var(--line)' }}>
        {!s.img ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><PearloomGlyph size={54} color={s.ink} /></div> : null}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--pl-glass)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--pl-glass-border)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: s.status === 'live' ? 'var(--sage)' : 'var(--pl-gold)' }} />
          <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>{s.status === 'live' ? 'Live' : 'Draft'}</span>
        </div>
        <button style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 999, border: 'none', background: 'var(--pl-glass)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'var(--ink)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, lineHeight: 1 }} title="Archive · duplicate · delete">⋯</button>
      </div>
      <div style={{ padding: '16px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div className="pl-heading" style={{ fontSize: 21 }}>{s.name}</div>
          <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10.5, color: 'var(--ink-muted)' }}>{s.date}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--lavender-ink)', marginTop: 3 }}>{s.occ} · {s.theme}</div>
        <div style={{ display: 'flex', gap: 22, margin: '14px 0', paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          {[['RSVPs', s.rsvp], ['Visits', s.visits]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>{l.toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ display: 'flex' }}>
              {s.hosts.map(([n, c], i) => <span key={n} style={{ width: 24, height: 24, borderRadius: 999, background: c, border: '2px solid var(--card)', marginLeft: i ? -7 : 0, display: 'grid', placeItems: 'center', color: 'var(--cream)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 11 }}>{n}</span>)}
            </div>
            <button style={{ width: 24, height: 24, borderRadius: 999, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Invite a co-host"><Icon name="plus" size={12} /></button>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--pl-font-mono)', fontSize: 10, color: s.domainOk ? 'var(--sage-deep)' : 'var(--ink-muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: s.domainOk ? 'var(--sage)' : 'var(--line)' }} />{s.domain}{!s.domainOk ? <span style={{ marginLeft: 6 }}><LockChip label="Connect a domain" /></span> : null}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 10, background: 'var(--accent-bg, var(--peach-bg))', marginBottom: 14 }}>
          <span style={{ color: 'var(--accent-ink, var(--peach-ink))', display: 'inline-flex' }}><Icon name="sparkles" size={13} /></span>
          <span style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{s.next}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ink" size="sm" style={{ flex: 1 }}>Open editor</Button>
          <Button variant="paper" size="sm">Preview</Button>
        </div>
      </div>
    </Card>
  );
}
function MySites() {
  const [picking, setPicking] = React.useState(false);
  return (
    <main style={{ padding: '0 clamp(20px,4vw,40px) 56px', maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {MY.map((s) => <SiteCard key={s.name} s={s} />)}
        <div style={{ minHeight: 380, borderRadius: 'var(--r)', border: '1.5px dashed var(--line)', background: picking ? 'var(--card)' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, boxSizing: 'border-box', transition: 'background 180ms var(--pl-ease-out)' }}>
          {!picking ? (
            <button onClick={() => setPicking(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ width: 52, height: 52, borderRadius: 999, border: '1.5px solid var(--accent-ink, var(--peach-ink))', display: 'grid', placeItems: 'center', color: 'var(--accent-ink, var(--peach-ink))' }}><Icon name="plus" size={22} /></span>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 19, color: 'var(--ink)' }}>Begin a new site</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', maxWidth: 200, textAlign: 'center', lineHeight: 1.5 }}>Start from the occasion and Pear drafts the first weave.</span>
            </button>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-muted)' }}>WHAT ARE WE CELEBRATING?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                {OCCASIONS.map(([o, ic]) => (
                  <button key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--cream-3)', border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-ink, var(--peach-ink))'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}>
                    <span style={{ color: 'var(--accent-ink, var(--peach-ink))', display: 'inline-flex' }}><Icon name={ic} size={15} /></span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>{o}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>Hosting a whole weekend? <LockChip label="Linked events · atelier" /></div>
              <button onClick={() => setPicking(false)} style={{ fontSize: 11.5, color: 'var(--ink-muted)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Cancel</button>
            </>
          )}
        </div>
      </div>
      <div>
        <Eyebrow rule="none" style={{ marginBottom: 12 }}>Archived</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {ARCHIVED.map((a) => (
            <Card key={a.name} padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.85 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: a.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}><PearloomGlyph size={24} color={a.ink} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{a.occ} · {a.date}</div>
              </div>
              <Button variant="paper" size="sm">Restore</Button>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

window.MySites = MySites;
})();
