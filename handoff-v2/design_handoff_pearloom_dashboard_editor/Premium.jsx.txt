/* global React */
// Pearloom dashboard — premium. A warm, letterpress plan surface (three
// tiers + live usage meters) opened by a 'pl-open-plan' event, plus a
// reusable LockChip the screens drop beside full-bolt features. Premium
// reads as gold — the brand's punctuation — never a banner.
(() => {
const Icon = window.Icon;
const { Button, PearloomGlyph, Pearl } = window.PearloomDesignSystem_55118c;
const { useState, useEffect } = React;

const openPlan = () => window.dispatchEvent(new CustomEvent('pl-open-plan'));

function LockChip({ label = 'On the full bolt', onClick }) {
  return (
    <button onClick={onClick || openPlan} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--gold-line)', background: 'rgba(193,154,75,0.12)', color: '#8A6A2E', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <Icon name="lock" size={11} /> {label}
    </button>
  );
}

const TIERS = [
  { name: 'A single thread', price: 'Free', cadence: '', tagline: 'Your first site, forever.', perks: ['One site, kept forever', 'Up to 30 guests', 'RSVPs & a guest message board', 'The Pearloom mark in the footer'], cta: 'Your free thread', current: false },
  { name: 'The full bolt', price: '$18', cadence: '/ month', tagline: 'Everything to host it beautifully.', perks: ['Unlimited sites & guests', 'Your own custom domain', 'Every theme pack, free', 'Fee-free cash funds', 'Pear in your voice + matching suite', 'The Reel, unlimited photos'], cta: 'Your plan', current: true },
  { name: 'The atelier', price: '$48', cadence: '/ month', tagline: 'For weekends, not just days.', perks: ['Everything in the full bolt', 'Linked multi-event weekends', 'Letterpress print credits', 'Priority Pear & white-glove setup', 'A keepsake page that lasts forever'], cta: 'Talk to the atelier', current: false },
];
const USAGE = [
  { l: 'Sites', v: '2', cap: 'unlimited', pct: 20 },
  { l: 'Guests', v: '64', cap: 'unlimited', pct: 28 },
  { l: 'Photos in the Reel', v: '212', cap: '∞', pct: 32 },
  { l: 'Pear credits this month', v: '80%', cap: 'left', pct: 80 },
];

function PlanModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const o = () => setOpen(true);
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pl-open-plan', o);
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('pl-open-plan', o); window.removeEventListener('keydown', k); };
  }, []);
  if (!open) return null;
  return (
    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(14,13,11,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '6vh 20px 40px', animation: 'pl-fade-q 180ms ease both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(980px, 96vw)', background: 'var(--cream)', borderRadius: 22, border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'pl-cmd-in 240ms var(--pl-ease-emphasis) both' }}>
        <div style={{ position: 'relative', padding: 'clamp(24px,3vw,36px) clamp(24px,4vw,44px) 0', textAlign: 'center' }}>
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--accent-ink, var(--peach-ink))', marginBottom: 10 }}>YOUR PLAN</div>
          <h2 className="pl-heading pl-letterpress" style={{ fontSize: 'clamp(26px,3.4vw,34px)', margin: 0, fontWeight: 600 }}>Kept the way it was <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)', fontFamily: 'var(--font-display)' }}>made.</span></h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 460, margin: '10px auto 0', lineHeight: 1.5, fontFamily: 'var(--font-ui)' }}>Pearloom is yours to keep, not to rent by the feature. One quiet price, every craft in the house.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: 'clamp(20px,3vw,32px) clamp(24px,4vw,44px)' }} className="pl-plan-grid">
          {TIERS.map((t) => (
            <div key={t.name} style={{ position: 'relative', borderRadius: 16, padding: '22px 20px 20px', background: t.current ? 'var(--ink)' : 'var(--card)', color: t.current ? 'var(--cream)' : 'var(--ink)', border: t.current ? '1px solid var(--ink)' : '1px solid var(--line)', boxShadow: t.current ? '0 0 0 2px var(--pl-gold)' : 'none' }}>
              {t.current ? <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', borderRadius: 999, background: 'var(--pl-gold)', color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.14em' }}>YOUR PLAN</div> : null}
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 21, fontWeight: 500, color: t.current ? 'var(--pl-gold)' : 'var(--lavender-ink)' }}>{t.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 2px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 400, letterSpacing: '-0.02em' }}>{t.price}</span>
                {t.cadence ? <span style={{ fontSize: 12.5, color: t.current ? 'var(--stone, #C9BFA8)' : 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{t.cadence}</span> : null}
              </div>
              <div style={{ fontSize: 12.5, color: t.current ? 'var(--stone, #C9BFA8)' : 'var(--ink-muted)', fontFamily: 'var(--font-ui)', marginBottom: 16, minHeight: 34 }}>{t.tagline}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                {t.perks.map((p) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12.5, lineHeight: 1.4, fontFamily: 'var(--font-ui)', color: t.current ? 'var(--cream)' : 'var(--ink-soft)' }}>
                    <span style={{ color: t.current ? 'var(--pl-gold)' : 'var(--sage)', flexShrink: 0, marginTop: 1 }}><Icon name="check" size={13} strokeWidth={2.5} /></span>{p}
                  </div>
                ))}
              </div>
              <Button variant={t.current ? 'pearl' : 'paper'} size="sm" style={{ width: '100%' }} disabled={t.current}>{t.current ? '✦ Your plan' : t.cta}</Button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--line)', padding: 'clamp(18px,2.4vw,26px) clamp(24px,4vw,44px)', background: 'var(--cream-2)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: 'var(--ink-muted)' }}>YOUR FULL BOLT, IN USE</div>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-ui)' }}>Renews Mar 2027 · <span style={{ color: 'var(--accent-ink, var(--peach-ink))', cursor: 'pointer' }}>Manage billing</span></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="pl-plan-grid">
            {USAGE.map((u) => (
              <div key={u.l}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{u.v}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-ui)' }}>{u.cap}</span>
                </div>
                <div style={{ height: 5, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}><div style={{ width: u.pct + '%', height: '100%', background: 'var(--sage)', borderRadius: 99 }} /></div>
                <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-muted)', marginTop: 6 }}>{u.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.LockChip = LockChip;
window.PlanModal = PlanModal;
window.openPlan = openPlan;
})();
