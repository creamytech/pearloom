/* global React */
// Pearloom wizard — experiential rebuild. Five woven steps with the
// motion system: letterpress questions, thread-in transitions, a live
// phone preview, Pear's running commentary, and a threading finale.
// Built on the .pl8 chrome tokens + the new logo/monogram/motifs.
(() => {
const NS = window.PearloomDesignSystem_55118c;
const { PearloomGlyph, PearloomWordmark, Pearl, WeaveLoader, Monogram, Motif, Divider } = NS;

const OCCASIONS = [
  { id: 'wedding', label: 'Wedding', verb: 'are getting married', motif: 'rings', voice: 'A bright day, two families, one long table.' },
  { id: 'anniversary', label: 'Anniversary', verb: 'are celebrating', motif: 'laurel', voice: 'The years, gathered and toasted.' },
  { id: 'birthday', label: 'Milestone birthday', verb: 'is turning', motif: 'cake', voice: 'Citrus, ros\u00e9, no speech over 90 seconds.' },
  { id: 'memorial', label: 'Memorial', verb: 'a gathering for', motif: 'dove', voice: 'Tea, their records, their people.' },
  { id: 'baby', label: 'Baby shower', verb: 'are expecting', motif: 'bloom', voice: 'Soft mornings and small things.' },
  { id: 'reunion', label: 'Reunion', verb: 'are reuniting', motif: 'sun', voice: 'Everyone, back in one place.' },
];

const VIBES = [
  { id: 'romantic', label: 'Romantic', face: { fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontWeight: 500 } },
  { id: 'joyful', label: 'Joyful', face: { fontWeight: 700 } },
  { id: 'intimate', label: 'Intimate', face: { fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontWeight: 500 } },
  { id: 'editorial', label: 'Editorial', face: { textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 12, fontWeight: 700 } },
  { id: 'quiet', label: 'Quiet', face: { fontWeight: 400, letterSpacing: '0.14em' } },
  { id: 'elegant', label: 'Elegant', face: { fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', letterSpacing: '0.06em' } },
  { id: 'bold', label: 'Bold', face: { fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 13 } },
  { id: 'outdoorsy', label: 'Outdoorsy', face: { fontWeight: 600, letterSpacing: '0.02em' } },
];

const PALETTES = [
  { id: 'garden', name: 'Pressed Garden', bg: '#FDFAF0', ink: '#3D4A1F', accent: '#5C6B3F', gold: '#C19A4B', swatch: ['#FDFAF0', '#5C6B3F', '#C19A4B', '#D9A89E'] },
  { id: 'amalfi', name: 'Amalfi Citrus', bg: '#FBF6EA', ink: '#1A2A33', accent: '#2E6B8A', gold: '#D9B44A', swatch: ['#FBF6EA', '#2E6B8A', '#C6703D', '#D9B44A'] },
  { id: 'midnight', name: 'Midnight Velvet', bg: '#1A1B2E', ink: '#F1EBDD', accent: '#B9A6E0', gold: '#C9A24B', swatch: ['#1A1B2E', '#C9A24B', '#B9A6E0', '#262842'], dark: true },
  { id: 'first-light', name: 'First Light', bg: '#FCF4EE', ink: '#3A2A2A', accent: '#C6563D', gold: '#C19A4B', swatch: ['#FCF4EE', '#C6563D', '#C19A4B', '#D9A89E'] },
];

const STEPS = ['Occasion', 'The basics', 'The feeling', 'Photos', 'Review'];
const PEAR_LINES = [
  "Let's start with the occasion — I'll set the whole tone from here.",
  "Just the essentials. I'll write everything else in your voice.",
  "Pick what it should feel like. The type and color follow.",
  "Hand me a few photos and I'll cluster them into chapters.",
  "Here's your loom. Press it, and I'll weave the whole site.",
];

function threadingMessages() {
  return ['reading your photos', 'pressing a palette', 'writing your story', 'weaving your RSVP', 'setting the type', 'pressing publish'];
}

function Wizard() {
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [st, setSt] = React.useState({ occasion: '', n1: '', n2: '', date: '', place: '', vibes: [], palette: 'garden', photos: 0 });

  const occ = OCCASIONS.find((o) => o.id === st.occasion);
  const pal = PALETTES.find((p) => p.id === st.palette);
  const canNext = [
    !!st.occasion,
    st.n1.trim().length > 0,
    st.vibes.length > 0,
    true,
    true,
  ][step];

  const go = (d) => {
    if (d > 0 && !canNext) return;
    if (step === STEPS.length - 1 && d > 0) { generate(); return; }
    setDir(d);
    if (window.PearloomMotion && !window.PearloomMotion.reduced) {
      window.PearloomMotion.weave(() => setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d))), { duration: 540 });
    } else {
      setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d)));
    }
  };

  const generate = () => {
    setBusy(true);
    setTimeout(() => { setBusy(false); setDone(true); }, 4200);
  };

  // ── progress thread ──
  const Progress = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 'clamp(20px,4vh,40px)' }}>
      {STEPS.map((s, i) => {
        const on = i === step, past = i < step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
              <div style={{ width: on ? 13 : 10, height: on ? 13 : 10, borderRadius: '50%', background: past || on ? 'var(--pl-olive)' : 'var(--cream-3)', border: on ? '2px solid var(--pl-cream)' : '1.5px solid var(--pl-divider)', outline: on ? '2px solid var(--pl-olive)' : 'none', transition: 'all var(--pl-dur-base) var(--pl-ease-spring)' }} />
              <span style={{ position: 'absolute', top: 20, fontFamily: 'var(--pl-font-mono)', fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: on ? 'var(--pl-olive)' : 'var(--pl-muted)', whiteSpace: 'nowrap', fontWeight: on ? 700 : 400, opacity: on ? 1 : 0.6 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 ? <div style={{ width: 'clamp(28px,7vw,64px)', height: 2, margin: '0 4px', background: 'var(--pl-divider)', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0, background: 'var(--pl-gold)', transform: `scaleX(${past ? 1 : 0})`, transformOrigin: 'left', transition: 'transform var(--pl-dur-slow) var(--pl-ease-emphasis)' }} /></div> : null}
          </React.Fragment>
        );
      })}
    </div>
  );

  if (done) return <DonePanel st={st} occ={occ} pal={pal} onReopen={() => { setDone(false); setStep(0); }} />;
  if (busy) return <Generating />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
      {/* top bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><PearloomGlyph size={26} color="var(--pl-olive)" /><PearloomWordmark size={17} color="var(--pl-ink)" /></span>
        <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>New site · {step + 1} of {STEPS.length}</span>
      </header>

      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: step >= 2 ? '1fr minmax(0,300px)' : '1fr', gap: 40, alignItems: 'center', maxWidth: step >= 2 ? 1080 : 720, margin: '0 auto', width: '100%', padding: '0 28px 40px', boxSizing: 'border-box' }} className="wz-main">
        <div style={{ width: '100%' }}>
          {Progress}
          <div key={step} className="wz-step">
            <Step step={step} st={st} setSt={setSt} occ={occ} />
          </div>

          {/* Pear line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 26, color: 'var(--pl-ink-soft)' }}>
            <span style={{ flexShrink: 0 }}><Pearl size={11} iridescent /></span>
            <span style={{ fontSize: 13.5, fontStyle: 'italic', fontFamily: 'var(--pl-font-display)', color: 'var(--pl-olive)' }}>{PEAR_LINES[step]}</span>
          </div>

          {/* nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
            {step > 0 ? <button onClick={() => go(-1)} className="wz-btn ghost">← Back</button> : <span />}
            <div style={{ flex: 1 }} />
            <button onClick={() => go(1)} className={'wz-btn ' + (canNext ? 'pearl' : 'disabled')} disabled={!canNext}>
              {step === STEPS.length - 1 ? 'Weave my site' : 'Continue'} <Pearl size={8} />
            </button>
          </div>
        </div>

        {step >= 2 ? <LivePreview st={st} occ={occ} pal={pal} /> : null}
      </main>
    </div>
  );
}

function Step({ step, st, setSt, occ }) {
  if (step === 0) return (
    <div data-wz>
      <Q>What are we <i>celebrating?</i></Q>
      <Sub>Pick the closest — it sets the whole tone. You can change it any time.</Sub>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 12, marginTop: 24 }}>
        {OCCASIONS.map((o) => {
          const on = st.occasion === o.id;
          return (
            <button key={o.id} onClick={() => setSt((s) => ({ ...s, occasion: o.id }))} className="wz-tile" style={{ borderColor: on ? 'var(--pl-olive)' : 'var(--pl-divider)', background: on ? 'var(--pl-olive-8)' : 'var(--pl-cream-card)', boxShadow: on ? '0 0 0 3px var(--pl-olive-12)' : 'none' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: on ? 'var(--pl-olive)' : 'var(--peach-bg)', display: 'grid', placeItems: 'center', transition: 'background var(--pl-dur-base)' }}>
                <Motif name={o.motif} size={26} color={on ? 'var(--pl-cream)' : 'var(--pl-olive)'} accent={on ? 'var(--pl-gold)' : 'var(--pl-gold)'} />
              </span>
              <span style={{ fontFamily: 'var(--pl-font-display)', fontSize: 15.5, color: 'var(--pl-ink)' }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (step === 1) return (
    <div data-wz>
      <Q>The <i>essentials.</i></Q>
      <Sub>Just enough to start. Pear writes the rest in your voice.</Sub>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Inp label={occ && occ.id === 'memorial' ? 'In memory of' : 'Your name'} v={st.n1} on={(v) => setSt((s) => ({ ...s, n1: v }))} ph="Mira" />
          <Inp label="& (optional)" v={st.n2} on={(v) => setSt((s) => ({ ...s, n2: v }))} ph="Jun" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Inp label="Date" v={st.date} on={(v) => setSt((s) => ({ ...s, date: v }))} ph="Sept 6, 2026" />
          <Inp label="Where" v={st.place} on={(v) => setSt((s) => ({ ...s, place: v }))} ph="Point Reyes, CA" />
        </div>
      </div>
    </div>
  );

  if (step === 2) return (
    <div data-wz>
      <Q>How should it <i>feel?</i></Q>
      <Sub>Tap a few. The type and palette follow your mood.</Sub>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 22 }}>
        {VIBES.map((v) => {
          const on = st.vibes.includes(v.id);
          return (
            <button key={v.id} onClick={() => setSt((s) => ({ ...s, vibes: on ? s.vibes.filter((x) => x !== v.id) : [...s.vibes, v.id] }))} className="wz-chip" style={{ borderColor: on ? 'var(--pl-olive)' : 'var(--pl-divider)', background: on ? 'var(--pl-olive)' : 'var(--pl-cream-card)', color: on ? 'var(--pl-cream)' : 'var(--pl-ink)', ...v.face }}>{v.label}</button>
          );
        })}
      </div>
      <div style={{ marginTop: 26, fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-muted)', marginBottom: 12 }}>And a palette</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {PALETTES.map((p) => {
          const on = st.palette === p.id;
          return (
            <button key={p.id} onClick={() => setSt((s) => ({ ...s, palette: p.id }))} className="wz-pal" style={{ borderColor: on ? 'var(--pl-gold)' : 'var(--pl-divider)', boxShadow: on ? '0 0 0 2px var(--pl-gold-soft)' : 'none' }}>
              <span style={{ display: 'flex', height: 30, borderRadius: 7, overflow: 'hidden', flex: 1 }}>{p.swatch.map((c, i) => <span key={i} style={{ flex: 1, background: c }} />)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)', whiteSpace: 'nowrap' }}>{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (step === 3) return (
    <div data-wz>
      <Q>Hand over a few <i>photos.</i></Q>
      <Sub>Pear clusters them into chapters. You can also start empty.</Sub>
      <button onClick={() => setSt((s) => ({ ...s, photos: Math.min(24, s.photos + 6) }))} className="wz-drop" style={{ marginTop: 22 }}>
        <Motif name="feather" size={40} color="var(--pl-olive)" accent="var(--pl-gold)" />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)', marginTop: 8 }}>Drop photos, or tap to add</span>
        <span style={{ fontSize: 12, color: 'var(--pl-muted)' }}>JPG, PNG, HEIC · up to 24</span>
      </button>
      {st.photos > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8, marginTop: 14 }}>
          {Array.from({ length: st.photos }).map((_, i) => (
            <div key={i} className="pl-pearl-pop" style={{ aspectRatio: '1', borderRadius: 8, background: `linear-gradient(135deg, var(--pl-olive-20), var(--pl-gold-mist))`, animationDelay: (i % 6) * 40 + 'ms' }} />
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--pl-muted)' }}>{st.photos === 0 ? 'No photos yet — Pear will start with an empty canvas.' : st.photos + ' photos ready. Pear clusters them into chapters.'}</div>
    </div>
  );

  // review
  return (
    <div data-wz>
      <Q>Ready to <i>weave.</i></Q>
      <Sub>Here's what Pear heard. Press the button and watch it come together.</Sub>
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--pl-cream-card)', border: '1px solid var(--pl-divider)', borderRadius: 16, overflow: 'hidden' }}>
        {[['Occasion', occ ? occ.label : '—'], ['Names', [st.n1, st.n2].filter(Boolean).join(' & ') || '—'], ['When · where', [st.date, st.place].filter(Boolean).join(' · ') || '—'], ['Feeling', st.vibes.join(', ') || '—'], ['Photos', st.photos ? st.photos + ' ready' : 'Empty canvas']].map((r, i, a) => (
          <div key={r[0]} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '13px 18px', borderBottom: i < a.length - 1 ? '1px solid var(--pl-divider-soft)' : 'none' }}>
            <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>{r[0]}</span>
            <span style={{ fontSize: 14, color: 'var(--pl-ink)', textAlign: 'right', fontWeight: 500 }}>{r[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivePreview({ st, occ, pal }) {
  const names = [st.n1, st.n2].filter(Boolean).join(' & ') || 'Your names';
  return (
    <div className="wz-preview" style={{ justifySelf: 'center' }}>
      <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--pl-muted)', textAlign: 'center', marginBottom: 10 }}>Live · your site</div>
      <div key={pal.id + names} className="pl-press-in" style={{ width: 264, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--pl-divider)', boxShadow: 'var(--pl-shadow-xl)', background: pal.bg }}>
        <div style={{ padding: '30px 22px 22px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.5 }}><Motif name={occ ? occ.motif : 'sprig'} size={26} color={pal.accent} accent={pal.gold} /></div>
          <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: pal.accent, marginBottom: 10, opacity: 0.8 }}>Save the date</div>
          <Monogram left={(st.n1 || 'M')[0].toUpperCase()} right={(st.n2 || 'J')[0].toUpperCase()} single={!st.n2} frame="ring" size={70} ink={pal.ink} accent={pal.accent} paper={pal.bg} />
          <div style={{ fontFamily: 'var(--pl-font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1.05, color: pal.ink, marginTop: 10 }}>{names}</div>
          <div style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 13, color: pal.accent, marginTop: 4 }}>{occ ? occ.verb : 'are celebrating'}</div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}><Divider ornament="sprig" width="90px" ink={pal.accent} accent={pal.gold} color={pal.accent + '33'} /></div>
          <div style={{ fontSize: 10, color: pal.ink, opacity: 0.6, fontFamily: 'var(--pl-font-mono)', letterSpacing: '0.04em' }}>{(st.date || 'SEPT 6, 2026').toUpperCase()}</div>
        </div>
        <div style={{ padding: 12, borderTop: `1px solid ${pal.accent}22` }}>
          <div style={{ padding: '9px', borderRadius: 999, background: pal.accent, color: pal.bg, textAlign: 'center', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--pl-font-body)' }}>Press RSVP →</div>
        </div>
      </div>
    </div>
  );
}

function Generating() {
  const [i, setI] = React.useState(0);
  const msgs = threadingMessages();
  React.useEffect(() => { const id = setInterval(() => setI((x) => Math.min(msgs.length - 1, x + 1)), 680); return () => clearInterval(id); }, []);
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <WeaveLoader size="xl" />
        <div className="pl-press-in" style={{ fontFamily: 'var(--pl-font-display)', fontSize: 'clamp(28px,4vw,40px)', color: 'var(--pl-ink)' }}>Pear is <span style={{ fontStyle: 'italic', color: 'var(--pl-olive)' }}>weaving</span> your site</div>
        <div aria-live="polite" style={{ fontFamily: 'var(--pl-font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--pl-olive)', minHeight: 24 }}>{msgs[i]}…</div>
        <div style={{ width: 220, height: 3, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--pl-olive), var(--pl-gold))', width: ((i + 1) / msgs.length * 100) + '%', transition: 'width var(--pl-dur-slow) var(--pl-ease-emphasis)' }} />
        </div>
      </div>
    </div>
  );
}

function DonePanel({ st, occ, pal, onReopen }) {
  const names = [st.n1, st.n2].filter(Boolean).join(' & ') || 'Your site';
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 2, padding: 28 }}>
      <div className="pl-press-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 460 }}>
        <Monogram left={(st.n1 || 'M')[0].toUpperCase()} right={(st.n2 || 'J')[0].toUpperCase()} single={!st.n2} frame="wreath" size={104} />
        <div style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--pl-gold)' }}>Woven · ready to press</div>
        <h1 className="pl-letterpress" style={{ fontFamily: 'var(--pl-font-display)', fontSize: 'clamp(34px,5vw,56px)', lineHeight: 1.0, margin: 0, color: 'var(--pl-ink)' }}>{names} <span style={{ fontStyle: 'italic', color: 'var(--pl-olive)' }}>is woven.</span></h1>
        <p style={{ fontSize: 15.5, color: 'var(--pl-ink-soft)', lineHeight: 1.6, margin: 0 }}>Pear drafted the cover, story, schedule, RSVP, and travel guide — all in your voice. Open the editor to press it, then publish.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="wz-btn pearl">Open the editor <Pearl size={8} /></button>
          <button onClick={onReopen} className="wz-btn ghost">Start another</button>
        </div>
      </div>
    </div>
  );
}

function Q({ children }) { return <h1 className="pl-letterpress" style={{ fontFamily: 'var(--pl-font-display)', fontWeight: 400, fontSize: 'clamp(32px,5vw,52px)', lineHeight: 1.02, letterSpacing: '-0.02em', margin: 0, color: 'var(--pl-ink)' }}>{wrapItalic(children)}</h1>; }
function wrapItalic(children) { return React.Children.map(children, (c) => (c && c.type === 'i') ? <span style={{ fontStyle: 'italic', color: 'var(--pl-olive)' }}>{c.props.children}</span> : c); }
function Sub({ children }) { return <p style={{ fontSize: 16, color: 'var(--pl-ink-soft)', lineHeight: 1.55, margin: '12px 0 0', maxWidth: 480 }}>{children}</p>; }
function Inp({ label, v, on, ph }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-muted)' }}>{label}</span>
      <input value={v} onChange={(e) => on(e.target.value)} placeholder={ph} className="wz-input" />
    </label>
  );
}

window.PearloomWizard = Wizard;
})();
