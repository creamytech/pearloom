/* =========================================================================
   PEARLOOM — RSVP FLOW (working prototype)
   A guest-facing multi-step RSVP that opens from any "RSVP" CTA on the site
   (listens for the 'pl-open-rsvp' window event). Find your invite → respond
   per guest (attending, meal, dietary, +1, song, note) → confirmation with a
   celebration. Persists to localStorage and broadcasts 'pl-rsvp-saved' so the
   site's live counts update. Export RsvpFlow + readRsvpStats.
   ========================================================================= */

const { useState: useRvState, useEffect: useRvEff } = React;

const RV_PARTIES = {
  'linda chen': { id: 'p1', label: 'Linda Chen', guests: ['Linda Chen', 'Marco (+1)'] },
  'the patels': { id: 'p2', label: 'The Patel Family', guests: ['Marcus Patel', 'Priya Patel'] },
  'sam': { id: 'p3', label: 'Sam Rivera', guests: ['Sam Rivera'] },
};
const RV_MEALS = ['Chicken', 'Fish', 'Vegetarian', 'Kids meal'];
const RV_KEY = 'pl-rsvps';

function readRsvpStats() {
  try {
    const all = JSON.parse(localStorage.getItem(RV_KEY) || '{}');
    let yes = 0, no = 0;
    Object.values(all).forEach(p => (p.guests || []).forEach(g => { if (g.attending === 'yes') yes++; else if (g.attending === 'no') no++; }));
    return { yes, no, parties: Object.keys(all).length };
  } catch (e) { return { yes: 0, no: 0, parties: 0 }; }
}

function RvField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 13 }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</label>
      {children}
    </div>
  );
}
function RvInput(props) {
  return <input {...props} style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 14, outline: 'none', fontFamily: 'inherit', ...(props.style || {}) }}/>;
}

function Confetti() {
  const bits = Array.from({ length: 40 });
  const colors = ['var(--sage)', 'var(--peach-2)', 'var(--lavender-2)', 'var(--gold)', 'var(--sage-deep)'];
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`@keyframes rv-fall{0%{transform:translateY(-20px) rotate(0);opacity:1}100%{transform:translateY(420px) rotate(540deg);opacity:0}}`}</style>
      {bits.map((_, i) => (
        <span key={i} style={{ position: 'absolute', top: -10, left: `${(i * 2.5) % 100}%`, width: 7, height: 11, background: colors[i % colors.length], borderRadius: 1, animation: `rv-fall ${1.6 + (i % 5) * 0.3}s ${(i % 7) * 0.12}s ease-in forwards` }}/>
      ))}
    </div>
  );
}

function RsvpFlow() {
  const [open, setOpen] = useRvState(false);
  const [step, setStep] = useRvState('find');
  const [query, setQuery] = useRvState('');
  const [party, setParty] = useRvState(null);
  const [resp, setResp] = useRvState({});

  useRvEff(() => {
    const h = () => { setOpen(true); setStep('find'); setQuery(''); setParty(null); setResp({}); };
    window.addEventListener('pl-open-rsvp', h);
    return () => window.removeEventListener('pl-open-rsvp', h);
  }, []);

  if (!open) return null;

  const find = () => {
    const p = RV_PARTIES[query.trim().toLowerCase()] || Object.values(RV_PARTIES).find(x => x.label.toLowerCase().includes(query.trim().toLowerCase()));
    if (p) {
      setParty(p);
      setResp(Object.fromEntries(p.guests.map(g => [g, { attending: 'yes', meal: 'Chicken', dietary: '' }])));
      setStep('respond');
    } else { setStep('notfound'); }
  };
  const setG = (g, patch) => setResp(r => ({ ...r, [g]: { ...r[g], ...patch } }));
  const save = () => {
    try {
      const all = JSON.parse(localStorage.getItem(RV_KEY) || '{}');
      all[party.id] = { label: party.label, when: Date.now(), guests: party.guests.map(g => ({ name: g, ...resp[g] })) };
      localStorage.setItem(RV_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('pl-rsvp-saved'));
    } catch (e) {}
    setStep('done');
  };
  const close = () => setOpen(false);
  const anyYes = party && party.guests.some(g => resp[g] && resp[g].attending === 'yes');

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(40,40,30,0.5)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'var(--card)', borderRadius: 22, position: 'relative', boxShadow: 'var(--shadow-lg)', animation: 'us-in 240ms cubic-bezier(0.16,1,0.3,1)' }}>
        <style>{`@keyframes us-in{from{transform:scale(0.97);opacity:0}to{transform:none;opacity:1}}`}</style>
        <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', zIndex: 3 }}><Icon name="close" size={15} color="var(--ink-soft)"/></button>

        {step === 'find' && (
          <div style={{ padding: '30px 28px' }}>
            <Pear size={34} tone="sage" sparkle shadow={false}/>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '12px 0 4px' }}>Will you join us?</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 18 }}>Find your invitation to reply. Try “Linda Chen”, “The Patels”, or “Sam”.</p>
            <RvField label="Your name or party">
              <RvInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing your name…" onKeyDown={(e) => e.key === 'Enter' && find()} autoFocus/>
            </RvField>
            <button onClick={find} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Find my invite <Icon name="arrow-right" size={13} color="var(--cream)"/></button>
          </div>
        )}

        {step === 'notfound' && (
          <div style={{ padding: '34px 28px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--peach-bg)', display: 'grid', placeItems: 'center', marginInline: 'auto' }}><Icon name="search" size={22} color="var(--peach-ink)"/></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '14px 0 4px' }}>We couldn’t find that name</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 18 }}>Check the spelling, or use the name on your invitation.</p>
            <button onClick={() => setStep('find')} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>Try again</button>
          </div>
        )}

        {step === 'respond' && party && (
          <div style={{ padding: '28px 26px' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lavender-ink)' }}>{party.label}</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '4px 0 16px' }}>Your reply</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {party.guests.map(g => {
                const r = resp[g] || {};
                return (
                  <div key={g} style={{ padding: 14, borderRadius: 14, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: r.attending === 'yes' ? 12 : 0 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{g}</span>
                      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--card)', borderRadius: 999, border: '1px solid var(--line)' }}>
                        {[['yes', 'Joyfully'], ['no', 'Regretfully']].map(([v, l]) => (
                          <button key={v} onClick={() => setG(g, { attending: v })} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: r.attending === v ? (v === 'yes' ? 'var(--sage-deep)' : 'var(--ink-muted)') : 'transparent', color: r.attending === v ? 'var(--cream)' : 'var(--ink-soft)' }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    {r.attending === 'yes' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {RV_MEALS.map(m => <button key={m} onClick={() => setG(g, { meal: m })} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: '1px solid', borderColor: r.meal === m ? 'var(--sage-deep)' : 'var(--line)', background: r.meal === m ? 'var(--sage-tint)' : 'var(--card)', color: r.meal === m ? 'var(--sage-deep)' : 'var(--ink-soft)' }}>{m}</button>)}
                        </div>
                        <RvInput value={r.dietary || ''} onChange={(e) => setG(g, { dietary: e.target.value })} placeholder="Allergies or dietary notes (optional)" style={{ padding: '9px 11px', fontSize: 13 }}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {anyYes && (
              <div style={{ marginTop: 14 }}>
                <RvField label="A song to get you dancing"><RvInput value={resp._song || ''} onChange={(e) => setResp(r => ({ ...r, _song: e.target.value }))} placeholder="e.g. At Last — Etta James"/></RvField>
                <RvField label="A note to the couple"><textarea value={resp._note || ''} onChange={(e) => setResp(r => ({ ...r, _note: e.target.value }))} rows={2} placeholder="Optional — say hello" style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}/></RvField>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setStep('find')} className="btn btn-outline" style={{ flex: '0 0 auto' }}><Icon name="arrow-left" size={13}/></button>
              <button onClick={save} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Send our reply <Icon name="heart-icon" size={13} color="var(--cream)"/></button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ padding: '40px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <Confetti/>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--sage-tint)', display: 'grid', placeItems: 'center', marginInline: 'auto' }}><Pear size={34} tone="sage" shadow={false}/></div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '16px 0 6px' }}>{anyYes ? 'You’re on the list!' : 'Thank you for letting us know'}</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 320, marginInline: 'auto', lineHeight: 1.55 }}>
                {anyYes ? 'We can’t wait to celebrate with you. We’ll email your details and any updates.' : 'You’ll be missed — thank you for the kind reply. The door stays open if plans change.'}
              </p>
              <button onClick={close} className="btn btn-primary" style={{ marginTop: 20, justifyContent: 'center' }}>Back to the site</button>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-muted)' }}>You can update your reply anytime before April 28.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function openRsvp() { try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch (e) {} }

Object.assign(window, { RsvpFlow, readRsvpStats, openRsvp });
