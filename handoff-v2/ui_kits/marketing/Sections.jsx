/* global React */
// Pearloom marketing — "The three acts" + pricing + footer. The acts
// describe the product arc (Thread it · Press it · Keep it); pricing
// shows the free + studio tiers; the footer signs off with the mark.
(() => {
const { Eyebrow, Thread, Card, Button, PearloomLogo, Pearl } = window.PearloomDesignSystem_55118c;

const ACTS = [
  { no: '01', t: 'Thread it', verb: 'woven', d: 'Answer three questions, hand over a few photos. Pear drafts the whole site in your voice — in about twenty seconds.' },
  { no: '02', t: 'Press it', verb: 'pressed', d: 'Edit anything by hand, set the type, then press publish. Your site goes live at its own occasion address.' },
  { no: '03', t: 'Keep it', verb: 'kept', d: 'RSVPs, a guest thread, a day-of timeline, and a keepsake that stays with you a year later.' },
];

function ActsStrip() {
  return (
    <section style={{ background: 'var(--pl-cream-deep)', padding: '76px 24px', position: 'relative' }} className="pl-grain">
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Eyebrow rule="both">The three acts</Eyebrow>
          <h2 className="pl-display pl-letterpress" style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', margin: '14px 0 0' }}>
            A site, <span className="pl-display-italic" style={{ fontSize: 'inherit' }}>woven</span> then kept
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {ACTS.map((a) => (
            <Card key={a.no} padding={28}>
              <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 11, letterSpacing: '0.22em', color: 'var(--pl-gold)' }}>No. {a.no}</div>
              <h3 className="pl-heading" style={{ fontSize: 24, margin: '12px 0 4px' }}>{a.t}</h3>
              <Thread width="48px" height={10} style={{ margin: '6px 0 14px' }} />
              <p className="pl-body" style={{ fontSize: 14.5, margin: 0, color: 'var(--pl-ink-soft)' }}>{a.d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const TIERS = [
  { name: 'The first thread', price: '$0', sub: 'forever', feats: ['One site, fully woven', 'RSVP + guest thread', 'Your occasion address', 'Pear writes in your voice'], cta: 'Begin a thread', variant: 'paper' },
  { name: 'The full bolt', price: '$48', sub: 'one-time, per occasion', feats: ['Everything in the first thread', 'Theme packs + the stationery studio', 'Day-of timeline + keepsake', 'Custom domain'], cta: 'Press the upgrade', variant: 'pearl', featured: true },
];

function Pricing({ onStart, onToast }) {
  return (
    <section style={{ padding: '76px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <Eyebrow rule="both">Pricing</Eyebrow>
        <h2 className="pl-display pl-letterpress" style={{ fontSize: 'clamp(34px, 4.5vw, 52px)', margin: '14px 0 0' }}>Your first site is free.</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, alignItems: 'stretch' }}>
        {TIERS.map((t) => (
          <Card key={t.name} padding={30} style={t.featured ? { border: '1px solid var(--pl-gold-soft)', boxShadow: 'var(--pl-shadow-lg)' } : {}}>
            <div className="pl-heading" style={{ fontSize: 20 }}>{t.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '10px 0 4px' }}>
              <span className="pl-display" style={{ fontSize: 44 }}>{t.price}</span>
              <span className="pl-body" style={{ fontSize: 13, color: 'var(--pl-muted)' }}>{t.sub}</span>
            </div>
            <Thread width="100%" style={{ margin: '14px 0 18px' }} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {t.feats.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--pl-font-body)', fontSize: 14, color: 'var(--pl-ink-soft)' }}>
                  <Pearl size={9} /> {f}
                </li>
              ))}
            </ul>
            <Button variant={t.variant} size="md" style={{ width: '100%' }} onClick={t.featured ? () => onToast('Pressing the upgrade…') : onStart}>{t.cta}{t.featured ? <Pearl size={8} /> : null}</Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: 'var(--pl-ink)', color: 'var(--pl-cream)', padding: '56px 24px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Thread width="100%" color="var(--pl-olive)" color2="var(--pl-gold)" style={{ marginBottom: 34 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <PearloomLogo size={26} color="var(--pl-cream)" />
            <p style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--pl-gold)', margin: '16px 0 0', fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>A craft house for memory.</p>
          </div>
          <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-stone)' }}>Edition 01 · Pressed in California</div>
        </div>
      </div>
    </footer>
  );
}

window.ActsStrip = ActsStrip;
window.Pricing = Pricing;
window.Footer = Footer;
})();
