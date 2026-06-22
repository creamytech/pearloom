/* global React */
// Pearloom marketing — hero. Two columns: editorial copy + a live
// threading indicator + stats on the left; a switchable preview-site
// card (wedding / milestone / memorial) on the right. Recreated from
// the product's DesignHero.
(() => {
const { Button, Pearl, PearloomGlyph, Thread } = window.PearloomDesignSystem_55118c;

const THREADING = ['reading your photos', 'pressing a palette', 'writing your story', 'weaving your RSVP', 'setting the type'];

const DATA = {
  wedding:   { hosts: 'Mira & Jun', verb: 'are getting married', sub: 'A bright Saturday in Point Reyes, two families, one very long table.', date: 'Sept 6, 2026', slug: 'mira-and-jun', accent: 'var(--pl-gold)' },
  milestone: { hosts: 'Maya turns 30', verb: 'is throwing a supper', sub: 'Citrus, rosé, the garden hose for the kids, no speeches longer than 90 seconds.', date: 'Aug 15, 2026', slug: 'maya-at-thirty', accent: 'var(--pl-terra)' },
  memorial:  { hosts: 'For Amara Osei', verb: 'a quiet gathering', sub: 'Tea, her records, her people. Come as you are.', date: 'Nov 15, 2026', slug: 'for-amara', accent: 'var(--pl-plum)' },
};

function Hero({ onStart, onToast }) {
  const [occasion, setOccasion] = React.useState('wedding');
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % THREADING.length), 1500);
    return () => clearInterval(id);
  }, []);
  const d = DATA[occasion];

  return (
    <section style={{ position: 'relative', padding: '52px 24px 120px', maxWidth: 1180, margin: '0 auto' }}>
      <div className="pd-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center' }}>
        {/* Left */}
        <div>
          <h1 className="pl-letterpress" style={{ fontFamily: 'var(--pl-font-display)', fontWeight: 400, fontVariationSettings: '"opsz" 144, "SOFT" 50', fontSize: 'clamp(48px, 6vw, 92px)', lineHeight: 0.94, letterSpacing: '-0.028em', color: 'var(--pl-ink)', margin: '0 0 22px' }}>
            <span style={{ display: 'block' }}>The days that</span>
            <span style={{ display: 'block' }}>
              <span style={{ fontStyle: 'italic', color: 'var(--pl-olive)', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>matter</span>, woven
            </span>
            <span style={{ display: 'block' }}>in an afternoon.</span>
          </h1>
          <p style={{ fontFamily: 'var(--pl-font-body)', fontSize: 18, lineHeight: 1.55, maxWidth: 500, color: 'var(--pl-ink-soft)', margin: '0 0 28px' }}>
            Answer three questions. Hand over a few photos. Pearloom drafts the whole site — cover, story, RSVP, schedule, travel, registry. Pear, our in-house planner, writes it in your voice.
          </p>

          <div aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--pl-cream-deep)', borderRadius: 999, marginBottom: 28, border: '1px solid var(--pl-olive-10)' }}>
            <Pearl size={9} iridescent />
            <span style={{ fontFamily: 'var(--pl-font-mono)', textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 10, color: 'var(--pl-muted)' }}>Pear is</span>
            <span style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--pl-olive)', fontFamily: 'var(--pl-font-display)', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1', minWidth: 180, display: 'inline-block' }}>{THREADING[step]}…</span>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 38 }}>
            <Button variant="pearl" size="lg" onClick={onStart}>Start your loom <Pearl size={9} /></Button>
            <Button variant="ghost" size="lg" onClick={() => onToast('Watch Pear thread a site')}>▶ &nbsp;Watch Pear thread a site</Button>
          </div>

          <div style={{ display: 'flex', gap: 28, alignItems: 'center', paddingTop: 24, borderTop: '1px solid var(--pl-olive-12)', flexWrap: 'wrap' }}>
            {[['28', 'occasions, one voice each', 'var(--pl-olive)'], ['20 sec', 'to a first draft', 'var(--pl-gold)'], ['$0', 'your first site, forever', 'var(--pl-olive)']].map(([n, l, c], i) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <div>
                  <div style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 26, color: c, lineHeight: 1, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>{n}</div>
                  <div style={{ fontFamily: 'var(--pl-font-body)', fontSize: 12, color: 'var(--pl-muted)', marginTop: 3, maxWidth: 140 }}>{l}</div>
                </div>
                {i < 2 ? <div style={{ width: 1, height: 36, background: 'var(--pl-olive-12)' }} /> : null}
              </div>
            ))}
          </div>
        </div>

        {/* Right — preview site card */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: -36, left: -10, opacity: 0.9 }} aria-hidden="true"><PearloomGlyph size={130} /></div>
          <div style={{ position: 'relative', width: 'min(440px, 92vw)' }}>
            <div style={{ background: 'var(--pl-cream-card)', color: 'var(--pl-ink)', borderRadius: 24, border: '1px solid var(--pl-divider)', overflow: 'hidden', boxShadow: 'var(--pl-shadow-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--pl-divider)', background: 'var(--pl-cream-deep)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--pl-stone)' }} />
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--pl-stone)' }} />
                <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--pl-stone)' }} />
                <span style={{ marginLeft: 10, fontFamily: 'var(--pl-font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9, color: 'var(--pl-muted)' }}>pearloom.com/{occasion}/{d.slug}</span>
              </div>
              <div style={{ padding: '34px 30px 24px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 22, right: 22 }}><PearloomGlyph size={34} /></div>
                <div style={{ fontFamily: 'var(--pl-font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10, color: 'var(--pl-muted)', marginBottom: 12 }}>Pressed by Pear · {d.date}</div>
                <div className="pl-letterpress" style={{ fontFamily: 'var(--pl-font-display)', fontSize: 42, lineHeight: 0.95, fontWeight: 400, letterSpacing: '-0.025em', fontVariationSettings: '"opsz" 144, "SOFT" 60' }}>{d.hosts}</div>
                <div style={{ fontFamily: 'var(--pl-font-display)', fontSize: 17, fontStyle: 'italic', color: d.accent, margin: '6px 0 14px', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>{d.verb}</div>
                <p style={{ fontFamily: 'var(--pl-font-body)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-soft)', margin: 0, maxWidth: 340 }}>{d.sub}</p>
              </div>
              <div style={{ padding: '16px 30px 22px', background: 'var(--pl-cream-card)', borderTop: '1px solid var(--pl-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Pearl size={10} />
                <div style={{ flex: 1, fontSize: 13, fontFamily: 'var(--pl-font-body)' }}>Kindly reply by <em style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic' }}>Aug 10</em>.</div>
                <button onClick={() => onToast('RSVP pressed — see you there')} style={{ background: d.accent, color: 'var(--pl-cream-card)', border: 'none', padding: '9px 16px', borderRadius: 999, fontSize: 12, fontFamily: 'var(--pl-font-body)', fontWeight: 500, cursor: 'pointer' }}>Press RSVP →</button>
              </div>
            </div>
            {/* occasion switcher */}
            <div className="pl-glass-surface" style={{ position: 'absolute', left: '50%', bottom: -54, transform: 'translateX(-50%)', display: 'flex', gap: 4, padding: 4, borderRadius: 999 }}>
              {[['wedding', 'Wedding'], ['milestone', 'Milestone'], ['memorial', 'Memorial']].map(([k, l]) => (
                <button key={k} onClick={() => setOccasion(k)} style={{ background: occasion === k ? 'var(--pl-ink)' : 'transparent', color: occasion === k ? 'var(--pl-cream)' : 'var(--pl-ink)', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--pl-font-body)', transition: 'all var(--pl-dur-fast) var(--pl-ease-out)' }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
})();
