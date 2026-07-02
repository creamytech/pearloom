/* global React */
// Pearloom dashboard — the host↔guest bridge. A "guest's-eye view"
// drawer that renders the published site exactly as one guest sees it
// (their greeting, RSVP, table, meal, the day, travel), opened with a
// 'pl-guest-view' event. Plus the shared invite front-door card.
(() => {
const Icon = window.Icon;
const { Button, PearloomGlyph, Pearl, Monogram, Thread } = window.PearloomDesignSystem_55118c;
const { useState, useEffect } = React;

const openGuestView = (guest) => window.dispatchEvent(new CustomEvent('pl-guest-view', { detail: guest || {} }));
const first = (p) => (p || 'Guest').replace(/ &.*| \+.*|'s.*/,'').split(' ')[0];

const RUN = [
  { t: '4:00', label: 'Gather on the lawn' },
  { t: '5:00', label: 'The ceremony', star: true },
  { t: '6:30', label: 'Supper & toasts' },
  { t: '9:00', label: 'Dancing in the barn' },
];

function GuestView() {
  const [g, setG] = useState(null);
  useEffect(() => {
    const o = (e) => setG(e.detail || {});
    const k = (e) => { if (e.key === 'Escape') setG(null); };
    window.addEventListener('pl-guest-view', o);
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('pl-guest-view', o); window.removeEventListener('keydown', k); };
  }, []);
  if (!g) return null;
  const name = g.party || 'Your guests';
  const coming = g.rsvp === 'yes';
  const pending = !g.rsvp || g.rsvp === 'pending';
  const fn = first(name);
  return (
    <div onClick={() => setG(null)} style={{ position: 'fixed', inset: 0, zIndex: 9700, background: 'rgba(14,13,11,0.42)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end', animation: 'pl-fade-q 160ms ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 96vw)', height: '100%', background: 'var(--cream)', borderLeft: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', animation: 'pl-drawer-in 280ms var(--pl-ease-emphasis) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center', color: 'var(--lavender-ink)' }}><Icon name="users" size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-muted)' }}>GUEST'S-EYE VIEW</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>How {fn} sees the site</div>
          </div>
          <button onClick={() => setG(null)} style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* The live guest site, personalized */}
          <div style={{ position: 'relative', height: 200, background: 'center/cover url(../../assets/imagery/vase-linen-still.png)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(24,24,27,0.6), transparent 60%)' }} />
            <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: '0 22px 18px', color: 'var(--pl-cream)' }}>
              <Monogram left="M" right="J" frame="ring" size={44} ink="var(--pl-cream)" accent="var(--pl-cream)" paper="transparent" />
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, lineHeight: 1, marginTop: 6 }}>Mira & Jun</div>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.2em', marginTop: 6 }}>SEPT 6, 2026 · POINT REYES</div>
            </div>
          </div>
          <div style={{ padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink)' }}>Welcome, {fn}.</div>
            {/* Their RSVP state */}
            <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: pending ? 'var(--peach-bg)' : 'var(--sage-tint)', border: `1px solid ${pending ? 'var(--peach)' : 'var(--sage-bg)'}` }}>
              {pending ? (
                <>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)', marginBottom: 12 }}>We're holding a place for you. Will you join us?</div>
                  <div style={{ display: 'flex', gap: 8 }}><Button variant="ink" size="sm" style={{ flex: 1 }}>Joyfully yes</Button><Button variant="paper" size="sm">Can't make it</Button></div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--sage-deep)', marginBottom: 6 }}>YOU'RE {coming ? 'COMING' : g.rsvp === 'maybe' ? 'A MAYBE' : 'NOT COMING'}</div>
                  <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>{g.count > 1 ? `Party of ${g.count}` : 'Just you'}{g.meal ? ` · ${g.meal}` : ''}{g.table ? ` · Table ${g.table}` : ''}. We can't wait.</div>
                </>
              )}
            </div>
            {/* The day */}
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--ink-muted)', margin: '22px 0 10px' }}>THE DAY</div>
            {RUN.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '7px 0', borderBottom: i < RUN.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11.5, color: r.star ? 'var(--accent-ink, var(--peach-ink))' : 'var(--ink-muted)', width: 36 }}>{r.t}</span>
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)', fontWeight: r.star ? 600 : 400 }}>{r.label}</span>
              </div>
            ))}
            <Thread width="100%" style={{ margin: '20px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['pin', 'Travel & stay'], ['gift', 'The registry'], ['image', 'Add your photos'], ['message', 'Message the hosts']].map(([ic, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 10, background: 'var(--cream-2)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>
                  <span style={{ color: 'var(--lavender-ink)', display: 'inline-flex' }}><Icon name={ic} size={14} /></span>{l}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flexShrink: 0, padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--cream-2)' }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)', flex: 1 }}>This is the live site, signed in as {fn}.</span>
          <Button variant="paper" size="sm">Resend {fn}'s link</Button>
        </div>
      </div>
    </div>
  );
}

window.GuestView = GuestView;
window.openGuestView = openGuestView;
})();
