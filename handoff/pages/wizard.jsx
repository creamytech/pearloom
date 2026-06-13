/* =========================================================================
   PEARLOOM — WIZARD · "Set your look & feel"
   Rebuilt to match the generated sites & editor: real material textures,
   botanical motifs, editorial type, and a LIVE preview of the couple's site
   that updates as they choose a vibe, theme pack, and layout.
   ========================================================================= */

const { useState: useWizState } = React;

const WIZ_STEPS = ['Occasion', 'Basics', 'Story', 'Look & feel', 'People', 'Review', 'Weave'];
const WIZ_ACTIVE = 3;

const WIZ_COUPLE = { a: 'Alex', b: 'Jamie', date: 'June 22, 2025', place: 'Portland, Oregon' };

const WIZ_VIBES = [
  { label: 'Romantic', motif: 'bloom' }, { label: 'Joyful', motif: 'sun' }, { label: 'Intimate', motif: 'olive' },
  { label: 'Elegant', motif: 'laurel' }, { label: 'Relaxed', motif: 'fern' }, { label: 'Playful', motif: 'citrus' },
  { label: 'Coastal', motif: 'shell' }, { label: 'Rustic', motif: 'wheat' }, { label: 'Modern', motif: 'deco' },
];

const WIZ_LAYOUTS = [
  { id: 'stacked', name: 'Classic scroll', body: 'A flowing single page, top to bottom.' },
  { id: 'boxed', name: 'Invitation', body: 'The whole suite as a card on a mat.' },
  { id: 'split', name: 'Split lockup', body: 'A sticky title beside scrolling details.' },
];

/* ---- a live, textured hero vignette in the chosen theme ---- */
function SiteVignette({ theme, vibe, height = 230, big }) {
  const divider = ({ olive: 'sprig', bloom: 'brush', pressed: 'dot' })[theme.motif] || 'rule';
  return (
    <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), position: 'relative', height, borderRadius: 16, overflow: 'hidden',
      background: 'var(--t-section)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: big ? '30px 26px' : '22px 18px', border: '1px solid var(--t-line)' }}>
      <TextureLayer texture={theme.texture} intensity={1}/>
      {theme.motif !== 'none' && (
        <>
          <div style={{ position: 'absolute', top: 10, left: 12, opacity: 0.55, transform: 'scaleX(-1)' }}><Motif kind={theme.motif} size={big ? 58 : 46}/></div>
          <div style={{ position: 'absolute', top: 10, right: 12, opacity: 0.55 }}><Motif kind={theme.motif} size={big ? 58 : 46}/></div>
        </>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 7 }}>{vibe || 'Together, at last'}</div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: big ? 44 : 27, lineHeight: 0.98, color: 'var(--t-ink)', letterSpacing: '-0.01em' }}>
          {WIZ_COUPLE.a}<span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.16em', fontWeight: 400 }}>&amp;</span>{WIZ_COUPLE.b}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}><TDivider look={divider} width={big ? 150 : 120}/></div>
        <div style={{ fontSize: big ? 12.5 : 11, color: 'var(--t-ink-soft)', letterSpacing: '0.04em' }}>{WIZ_COUPLE.date} · {WIZ_COUPLE.place}</div>
        {big && <div style={{ marginTop: 16 }}><TButton look={theme.look.button} variant="primary" style={{ fontSize: 11, padding: '8px 18px' }}>RSVP</TButton></div>}
      </div>
    </div>
  );
}

/* ---- progress ---- */
function WizThread({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', padding: '0 4px' }}>
      {WIZ_STEPS.map((s, i) => {
        const done = i < active, cur = i === active;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: cur ? 'var(--ink)' : done ? 'var(--sage)' : 'var(--cream-2)', color: cur || done ? 'var(--cream)' : 'var(--ink-muted)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, border: cur ? '2px solid var(--gold)' : '1.5px solid var(--line)' }}>
                {done ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: 12, fontWeight: cur ? 700 : 500, color: cur ? 'var(--ink)' : 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < WIZ_STEPS.length - 1 && <div style={{ flex: 1, minWidth: 12, height: 1.5, margin: '0 10px', borderTop: `1.5px dashed ${done ? 'var(--sage)' : 'var(--line)'}` }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function WizQ({ n, title, sub, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: sub ? 3 : 11 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{n}</span>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 11, paddingLeft: 22 }}>{sub}</div>}
      <div style={{ paddingLeft: 22 }}>{children}</div>
    </div>
  );
}

function WizardApp() {
  const [vibes, setVibes] = useWizState(new Set(['Romantic', 'Intimate']));
  const [themeId, setThemeId] = useWizState('santorini');
  const [layout, setLayout] = useWizState('stacked');
  const theme = getTheme(themeId);
  const firstVibe = [...vibes][0];

  const toggleVibe = (label) => { const n = new Set(vibes); n.has(label) ? n.delete(label) : n.add(label); setVibes(n); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <ThemeDefs/>
      {/* botanical atmosphere */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, color: 'var(--sage)' }}>
        <div style={{ position: 'absolute', top: 90, left: -10, opacity: 0.10, transform: 'rotate(-12deg)' }}><OliveSprig size={220}/></div>
        <div style={{ position: 'absolute', bottom: 40, right: -20, opacity: 0.09, transform: 'rotate(8deg) scaleX(-1)' }}><OliveSprig size={260}/></div>
        <div style={{ position: 'absolute', top: '46%', right: '34%', opacity: 0.06 }}><PressedFlower size={120}/></div>
      </div>

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 20, padding: '14px 28px', background: 'rgba(248,241,228,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--line-soft)' }}>
        <a href="Pearloom Home Redesign.html"><PearloomLogo/></a>
        <WizThread active={WIZ_ACTIVE}/>
        <button className="btn btn-outline btn-sm">Save &amp; exit</button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 28px 40px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 22, alignItems: 'start' }}>
          {/* LEFT — the form */}
          <div className="card" style={{ padding: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div className="eyebrow" style={{ color: 'var(--lavender-ink)' }}>STEP 4 OF 7</div>
                <h1 className="display" style={{ fontSize: 38, margin: '4px 0 6px' }}>Set your look &amp; feel</h1>
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', maxWidth: 460 }}>Pick a feeling and a theme — we&rsquo;ll dress your whole site, invites and keepsakes to match.</div>
              </div>
              <span className="pill pill-cream" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>About 2 min</span>
            </div>

            <WizQ n="1." title="How should your day feel?" sub="Pick a few — they tune the words, motifs and pace.">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {WIZ_VIBES.map(v => {
                  const on = vibes.has(v.label);
                  return (
                    <button key={v.label} onClick={() => toggleVibe(v.label)} className="lift" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px 9px 11px', borderRadius: 999, cursor: 'pointer',
                      background: on ? 'var(--ink)' : 'var(--card)', color: on ? 'var(--cream)' : 'var(--ink)', border: on ? '1px solid var(--ink)' : '1px solid var(--line)', fontSize: 13.5, fontWeight: 600,
                    }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: on ? 'rgba(255,255,255,0.16)' : 'var(--cream-2)', display: 'grid', placeItems: 'center', color: on ? 'var(--cream)' : 'var(--sage-deep)' }}>
                        <span style={{ display: 'grid', placeItems: 'center', transform: 'scale(0.42)', transformOrigin: 'center' }}><Motif kind={v.motif} size={44}/></span>
                      </span>
                      {v.label}
                      {on && <Icon name="check" size={13} color="var(--cream)"/>}
                    </button>
                  );
                })}
              </div>
            </WizQ>

            <WizQ n="2." title="Choose a theme pack" sub="Each is a full look — texture, palette, type & motifs. Browse the full store anytime.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {THEMES.map(t => {
                  const on = themeId === t.id;
                  return (
                    <button key={t.id} onClick={() => setThemeId(t.id)} className="lift" style={{ padding: 0, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', background: 'var(--card)', border: on ? '2.5px solid var(--ink)' : '1px solid var(--line)', position: 'relative' }}>
                      <SiteVignette theme={t} vibe={firstVibe} height={132}/>
                      {on && <span style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', display: 'grid', placeItems: 'center', zIndex: 3 }}><Icon name="check" size={12} color="var(--cream)"/></span>}
                      <div style={{ padding: '9px 12px', textAlign: 'left' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{t.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 1, lineHeight: 1.3 }}>{t.blurb}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <a href="Pearloom Theme Store.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--lavender-ink)' }}>
                <Icon name="sparkles" size={13} color="var(--lavender-ink)"/> Browse 60+ packs in the Theme Store
              </a>
            </WizQ>

            <WizQ n="3." title="Pick a layout" sub="How the page is built — you can change it later.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {WIZ_LAYOUTS.map(l => {
                  const on = layout === l.id;
                  return (
                    <button key={l.id} onClick={() => setLayout(l.id)} className="lift" style={{ padding: 16, borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: on ? 'var(--lavender-bg)' : 'var(--card)', border: on ? '2px solid var(--lavender-ink)' : '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <WizLayoutGlyph variant={l.id} on={on}/>
                      <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{l.name}</div><div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{l.body}</div></div>
                    </button>
                  );
                })}
              </div>
            </WizQ>
          </div>

          {/* RIGHT — live preview + Pear */}
          <aside style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Pear size={24} tone="sage" shadow={false}/>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Your site, live</span>
                <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 9px', borderRadius: 999 }}>{theme.name}</span>
              </div>
              <SiteVignette theme={theme} vibe={firstVibe} height={244} big/>
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'center' }}>
                Updates as you choose · {[...vibes].join(' · ') || 'pick a vibe'}
              </div>
            </div>

            <div style={{ background: 'var(--peach-bg)', borderRadius: 16, padding: 15, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Pear size={26} tone="sage" sparkle shadow={false} style={{ flexShrink: 0 }}/>
              <div style={{ fontSize: 12.5, color: 'var(--peach-ink)', lineHeight: 1.45 }}>
                <strong>Not sure?</strong> Tell me a place or a feeling — &ldquo;Santorini, relaxed&rdquo; — and I&rsquo;ll pick the theme, motifs and words for you.
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <div className="card" style={{ marginTop: 18, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="Pearloom Home Redesign.html" className="btn btn-outline">← Back</a>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Looking lovely{firstVibe ? `, ${firstVibe.toLowerCase()} it is` : ''} ✦</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>Step 4 of 7 — almost there.</div>
          </div>
          <a href="Pearloom Editor Redesign.html" className="btn btn-primary">Continue to your site <Icon name="arrow-right" size={13} color="var(--cream)"/></a>
        </div>
      </div>
    </div>
  );
}

function WizLayoutGlyph({ variant, on }) {
  const c = on ? 'var(--lavender-ink)' : 'var(--ink-muted)';
  const sets = {
    stacked: [[6, 4, 28, 7], [10, 14, 20, 3], [6, 20, 28, 5], [6, 28, 28, 5]],
    boxed: [[7, 5, 26, 26]],
    split: [[4, 4, 14, 32], [21, 6, 15, 5], [21, 14, 13, 4], [21, 22, 15, 9]],
  };
  return (
    <svg width="40" height="36" viewBox="0 0 40 38" style={{ borderRadius: 5, background: 'var(--cream-2)' }} aria-hidden="true">
      {(sets[variant] || sets.stacked).map((r, i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="1.5" fill={c} opacity={on ? 0.85 : 0.45}/>)}
    </svg>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WizardApp/>);
