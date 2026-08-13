/* =========================================================================
   PEARLOOM — LANDING (pre-signup marketing page)
   The hook: type your event → a real themed site builds itself live, using
   the actual Pearloom engine (generateFromStory + theme vars + textures +
   motifs). Then the gentle ask. Simplicity first: one decision per screen.
   ========================================================================= */

const { useState: useLandState, useEffect: useLandEff, useRef: useLandRef } = React;

/* Small decorative flourishes so the Pear mark isn't carrying every accent. */
function Spark({ size = 16, color = 'var(--gold)', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <path d="M12 2c.6 4.8 2.6 6.8 7.4 7.4-4.8.6-6.8 2.6-7.4 7.4-.6-4.8-2.6-6.8-7.4-7.4C9.4 8.8 11.4 6.8 12 2Z" fill={color}/>
      <circle cx="19" cy="18" r="1.6" fill={color} opacity="0.6"/>
      <circle cx="5" cy="4" r="1.1" fill={color} opacity="0.5"/>
    </svg>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "headline": "calm"
}/*EDITMODE-END*/;

const LAND_EXAMPLES = [
  'Our summer wedding in Santorini, olive groves, relaxed',
  'Dad’s 70th birthday — warm, a little fancy',
  'A celebration of Grandma Rose’s life',
  'Tuscan vineyard wedding, lemons, romantic',
  'Maya’s baby shower, garden, soft & sweet',
  'New Year’s Eve gala, black-tie, candlelight',
];

const LAND_HEADLINES = {
  calm:    { a: 'Your whole day,', b: 'one calm place', sub: 'Tell us about your celebration — a wedding, a birthday, a remembrance. Pear designs your site, invites and RSVPs while you breathe.' },
  plan:    { a: 'Plan less.', b: 'Celebrate more', sub: 'Describe your event in a sentence. Pear builds the site, sends the invites, and tracks every RSVP — so you can stay in the moment.' },
  done:    { a: 'Every gathering,', b: 'beautifully done', sub: 'One calm place for weddings, birthdays and remembrances. A site that feels like you — designed, sent and managed by Pear.' },
};

const LAND_QUOTES = [
  { q: 'I described our wedding in one line and had a real site before my coffee went cold. My mom cried.', who: 'Priya & Daniel', ev: 'Wedding · Santorini', tone: 'sage' },
  { q: 'I planned my dad’s 70th in an evening. The RSVP tracking alone saved my sanity.', who: 'Marcus R.', ev: '70th birthday', tone: 'peach' },
  { q: 'We made a remembrance page for my grandmother. Gentle, beautiful, and so easy in a hard week.', who: 'The Okafor family', ev: 'Celebration of life', tone: 'lavender' },
];

const LAND_SUBJECT = {
  wedding: ['Ava', 'Liam'], engagement: ['Ava', 'Liam'], vow: ['Ava', 'Liam'],
  birthday: ['James', null], memorial: ['Rose', null], shower: ['Maya', null],
  baby: ['Maya', null], gala: ['The Hartwell', null], party: ['James', null],
};
const LAND_EYEBROW = {
  wedding: 'Save the date', engagement: 'We’re engaged', memorial: 'In loving memory',
  birthday: 'You’re invited', shower: 'Join us', gala: 'An evening of', party: 'Come celebrate',
};

/* the live-built preview card in the matched theme */
function BuiltSite({ cfg, seed }) {
  const theme = getTheme(cfg.themeId);
  const divider = ({ olive: 'sprig', bloom: 'brush', pressed: 'dot' })[theme.motif] || 'rule';
  const subj = LAND_SUBJECT[cfg.eventId] || ['Ava', 'Liam'];
  const eyebrow = LAND_EYEBROW[cfg.eventId] || 'Save the date';
  const single = !subj[1];
  const stp = () => ({});
  return (
    <div key={seed} style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), animation: 'land-fade 520ms ease both', position: 'relative', borderRadius: 18, overflow: 'hidden', background: 'var(--t-section)', border: '1px solid var(--t-line)', boxShadow: '0 40px 90px rgba(40,40,30,0.22)', minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '44px 34px' }}>
      <TextureLayer texture={theme.texture} intensity={1}/>
      {theme.motif !== 'none' && (
        <>
          <div style={{ position: 'absolute', top: 18, left: 22, opacity: 0.6, transform: 'scaleX(-1)', ...stp(0) }}><Motif kind={theme.motif} size={76}/></div>
          <div style={{ position: 'absolute', top: 18, right: 22, opacity: 0.6, ...stp(0) }}><Motif kind={theme.motif} size={76}/></div>
        </>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 14, ...stp(1) }}>{eyebrow}</div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: single ? 52 : 58, lineHeight: 0.96, color: 'var(--t-ink)', letterSpacing: '-0.02em', ...stp(2) }}>
          {single ? subj[0] : <>{subj[0]}<span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.16em', fontWeight: 400 }}>{theme.id === 'editorial' ? '×' : '&'}</span>{subj[1]}</>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0', ...stp(3) }}><TDivider look={divider} width={180}/></div>
        <div style={{ fontSize: 14, color: 'var(--t-ink-soft)', letterSpacing: '0.04em', ...stp(4) }}>Saturday, June 14 · A place you love</div>
        <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'center', ...stp(5) }}>
          <span style={{ padding: '11px 22px', borderRadius: theme.look.button === 'sharp' ? 0 : theme.look.button === 'square' ? 4 : 999, background: 'var(--t-rsvp)', color: 'var(--t-rsvp-ink)', fontSize: 13, fontWeight: 700 }}>RSVP</span>
          <span style={{ padding: '11px 22px', borderRadius: theme.look.button === 'sharp' ? 0 : theme.look.button === 'square' ? 4 : 999, border: '1px solid var(--t-line)', color: 'var(--t-ink)', fontSize: 13, fontWeight: 600 }}>Our story</span>
        </div>
      </div>
    </div>
  );
}

function GenHero({ headline }) {
  const H = LAND_HEADLINES[headline] || LAND_HEADLINES.calm;
  const [text, setText] = useLandState('');
  const [cfg, setCfg] = useLandState(null);
  const [rationale, setRationale] = useLandState('');
  const [busy, setBusy] = useLandState(false);
  const [seed, setSeed] = useLandState(0);
  const [ph, setPh] = useLandState(0);
  const taRef = useLandRef(null);

  // cycle ghost placeholder until they type/build (stop once busy or built)
  useLandEff(() => {
    if (text || cfg || busy) return;
    const t = setInterval(() => setPh(p => (p + 1) % LAND_EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, [text, cfg, busy]);

  const build = (q) => {
    const query = q != null ? q : text;
    if (!query.trim()) { taRef.current && taRef.current.focus(); return; }
    if (q != null) setText(q);
    setBusy(true); setCfg(null);
    setTimeout(() => {
      const { config, rationale } = generateFromStory(query);
      setCfg(config); setRationale(rationale); setSeed(s => s + 1); setBusy(false);
    }, 1100);
  };

  return (
    <section style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '40px 28px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        {/* left — the ask */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'var(--sage-tint)', color: 'var(--sage-deep)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
            <Spark size={15}/> The first AI-native event platform
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            {H.a}<br/><span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>{H.b}</span>.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 440, margin: '0 0 24px' }}>
            {H.sub}
          </p>

          {/* the magic input */}
          <div style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--line)', boxShadow: '0 12px 30px rgba(61,74,31,0.08)', padding: 14 }}>
            <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} rows={2}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }}
              placeholder={LAND_EXAMPLES[ph]}
              style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontSize: 16, lineHeight: 1.5, color: 'var(--ink)', fontFamily: 'inherit' }}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', flex: 1 }}>No account needed to try.</span>
              <button onClick={() => build()} disabled={busy} className="btn btn-primary" style={{ borderRadius: 999 }}>
                {busy ? <><span className="land-spin"/> Designing…</> : <><Spark size={15} color="var(--cream)"/> Build my site</>}
              </button>
            </div>
          </div>

          {/* example chips */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-muted)', alignSelf: 'center' }}>Try:</span>
            {LAND_EXAMPLES.slice(0, 3).map(ex => (
              <button key={ex} onClick={() => build(ex)} style={{ padding: '6px 12px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-soft)', cursor: 'pointer' }}>{ex.split(',')[0].split('—')[0].trim()}</button>
            ))}
          </div>
        </div>

        {/* right — the live build */}
        <div style={{ position: 'relative' }}>
          {!cfg && !busy && <HeroIdle/>}
          {busy && <HeroBuilding/>}
          {cfg && !busy && (
            <div>
              <BuiltSite cfg={cfg} seed={seed}/>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--line-soft)', animation: 'land-rise 500ms ease 700ms both' }}>
                <Pear size={26} tone="sage" sparkle shadow={false} style={{ flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{rationale}</div>
                </div>
                <a href="Pearloom Wizard.html" className="btn btn-primary btn-sm" style={{ flexShrink: 0, borderRadius: 999 }}>Make it mine <Icon name="arrow-right" size={13} color="var(--cream)"/></a>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11.5, color: 'var(--ink-muted)' }}>Free to build · no credit card · change anything later</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroIdle() {
  return (
    <div style={{ position: 'relative', borderRadius: 18, border: '1.5px dashed var(--line)', background: 'var(--cream-2)', minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 40 }}>
      <div>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--card)', display: 'grid', placeItems: 'center', marginInline: 'auto', boxShadow: '0 8px 20px rgba(61,74,31,0.08)' }}><OliveSprig size={48} color="var(--sage)" berry="var(--gold)"/></div>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink-soft)', marginTop: 16 }}>Your site appears here.</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginTop: 4, maxWidth: 280, marginInline: 'auto' }}>Describe your event and watch Pear design it — live, in real time.</div>
      </div>
    </div>
  );
}
function HeroBuilding() {
  return (
    <div style={{ position: 'relative', borderRadius: 18, border: '1px solid var(--line)', background: 'var(--card)', minHeight: 420, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)', backgroundSize: '200% 100%', animation: 'land-shimmer 1.2s infinite' }}/>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <Spark size={40} color="var(--sage-deep)"/>
        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, marginTop: 14, color: 'var(--ink)' }}>Pear is designing…</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
          {['Choosing a palette', 'Setting the type', 'Placing motifs'].map((s, i) => (
            <span key={s} style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '4px 9px', borderRadius: 999, animation: `land-pulse 1.4s ${i * 0.25}s infinite` }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- proof moments + closing ---- */
function ProofMoment({ pre, title, body, children, flip }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'center', direction: flip ? 'rtl' : 'ltr' }}>
      <div style={{ direction: 'ltr' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 8 }}>{pre}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' }}>{title}</h3>
        <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 380 }}>{body}</p>
      </div>
      <div style={{ direction: 'ltr' }}>{children}</div>
    </div>
  );
}

function MiniVignette({ themeId, h = 240 }) {
  const theme = getTheme(themeId);
  const divider = ({ olive: 'sprig', bloom: 'brush', pressed: 'dot' })[theme.motif] || 'rule';
  return (
    <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), position: 'relative', height: h, borderRadius: 16, overflow: 'hidden', background: 'var(--t-section)', border: '1px solid var(--t-line)', boxShadow: '0 20px 50px rgba(40,40,30,0.14)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <TextureLayer texture={theme.texture} intensity={1}/>
      {theme.motif !== 'none' && <div style={{ position: 'absolute', top: 12, left: 14, opacity: 0.5 }}><Motif kind={theme.motif} size={44}/></div>}
      <div style={{ position: 'relative', zIndex: 2, padding: 20 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }}>Save the date</div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 32, color: 'var(--t-ink)' }}>Ava <span style={{ fontStyle: 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)' }}>&amp;</span> Liam</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}><TDivider look={divider} width={120}/></div>
      </div>
    </div>
  );
}

function LandingApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <ThemeDefs/>
      <style>{`
        @keyframes land-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes land-fade{from{opacity:0;transform:translateY(10px) scale(0.99)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){ [style*="land-fade"],[style*="land-rise"]{animation:none!important} }
        @keyframes land-shimmer{to{background-position:-200% 0}}
        @keyframes land-pulse{0%,100%{opacity:0.45}50%{opacity:1}}
        .land-spin{width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;animation:land-sp .7s linear infinite;display:inline-block;vertical-align:-2px;margin-right:4px}
        @keyframes land-sp{to{transform:rotate(360deg)}}
      `}</style>

      {/* atmosphere */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 80, left: -30, opacity: 0.07, transform: 'rotate(-12deg)' }}><OliveSprig size={240} color="var(--sage)" berry="var(--gold)"/></div>
        <div style={{ position: 'absolute', top: 520, right: -20, opacity: 0.06, transform: 'rotate(10deg) scaleX(-1)' }}><OliveSprig size={210} color="var(--sage)" berry="var(--gold)"/></div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* top bar — minimal */}
        <header style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="Pearloom Home Redesign.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <Pear size={28} tone="sage" shadow={false}/>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>Pearloom</span>
          </a>
          <div style={{ flex: 1 }}/>
          <a href="Pearloom Signin.html" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>Sign in</a>
          <a href="Pearloom Wizard.html" className="btn btn-primary btn-sm" style={{ borderRadius: 999 }}>Start free</a>
        </header>

        <GenHero headline={t.headline}/>

        {/* differentiation — the AI-native wedge */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '46px 28px 8px' }}>
          <div style={{ borderRadius: 22, border: '1px solid var(--line-soft)', background: 'var(--card)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '26px 28px', borderRight: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 14 }}>The old way</div>
              {['Pick a blank template', 'Fill in every field yourself', 'Copy-paste guest emails', 'Write all the wording alone', 'Chase RSVPs by hand'].map(x => (
                <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, color: 'var(--ink-muted)' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--line)', flexShrink: 0 }}/>{x}
                </div>
              ))}
            </div>
            <div style={{ padding: '26px 28px', background: 'var(--sage-tint)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage-deep)', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Spark size={14} color="var(--sage-deep)"/> With Pearloom</div>
              {['Describe it in a sentence', 'Pear builds the whole site', 'AI drafts your wording & vows', 'Smart RSVPs with meal & song', 'Pear nudges late guests for you'].map(x => (
                <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--sage-deep)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="check" size={11} color="var(--cream)"/></span>{x}
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)', marginTop: 14 }}>Other builders hand you a blank template. Pearloom hands you a finished site — and an assistant.</div>
        </section>

        {/* breadth line */}
        <section style={{ textAlign: 'center', padding: '52px 28px 20px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 14 }}>One place, every kind of gathering</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 720, margin: '0 auto' }}>
            {['Weddings', 'Birthdays', 'Memorials', 'Showers', 'Engagements', 'Anniversaries', 'Galas', 'Reunions', 'Graduations'].map(e => (
              <span key={e} style={{ padding: '8px 16px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line-soft)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{e}</span>
            ))}
          </div>
        </section>

        {/* proof moments */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 28px', display: 'flex', flexDirection: 'column', gap: 56 }}>
          <ProofMoment pre="A site they'll remember" title="Beautiful, in every theme." body="Real material textures — linen, watercolor, pressed paper — with type and motifs that match your day. Not a template. A look that feels like you.">
            <MiniVignette themeId="santorini"/>
          </ProofMoment>
          <ProofMoment flip pre="RSVPs, handled" title="One tap for your guests." body="Guests find their invite, pick a meal, note allergies, request a song — and you watch it all land in a calm dashboard. Pear chases the quiet ones for you.">
            <MiniVignette themeId="tuscan"/>
          </ProofMoment>
          <ProofMoment pre="The day itself" title="A calm command center." body="On the day, broadcast a note to every guest, run your timeline, and keep vendors in step — all from one warm room. Then keepsakes, after.">
            <MiniVignette themeId="garden"/>
          </ProofMoment>
        </section>

        {/* testimonials / trust */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '44px 28px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              <span style={{ display: 'inline-flex', gap: 1 }}>{[1,2,3,4,5].map(i => <Icon key={i} name="star" size={15} color="var(--gold)"/>)}</span>
              Loved by thousands of hosts
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {LAND_QUOTES.map((c, i) => (
              <div key={i} style={{ borderRadius: 16, background: 'var(--card)', border: '1px solid var(--line-soft)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ display: 'inline-flex', gap: 1 }}>{[1,2,3,4,5].map(s => <Icon key={s} name="star" size={12} color="var(--gold)"/>)}</span>
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16.5, lineHeight: 1.45, color: 'var(--ink)', margin: 0, flex: 1 }}>&ldquo;{c.q}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: `var(--${c.tone}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#3D4A1F' }}>{c.who[0]}</span>
                  <div><div style={{ fontSize: 13, fontWeight: 700 }}>{c.who}</div><div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{c.ev}</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pear */}
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 28px 20px', textAlign: 'center' }}>
          <Pear size={48} tone="sage" sparkle shadow={false}/>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, margin: '16px 0 12px', letterSpacing: '-0.01em' }}>Pear does the <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>heavy lifting</span>.</h2>
          <p style={{ fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto' }}>
            Your friendly planner-in-residence. Pear designs the look, drafts the wording, nudges late guests, and writes your thank-yous — so planning feels less like work and more like looking forward to it.
          </p>
        </section>

        {/* final CTA */}
        <section style={{ maxWidth: 900, margin: '20px auto 0', padding: '0 28px 70px' }}>
          <div style={{ borderRadius: 26, background: 'var(--ink)', padding: '50px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: 30, opacity: 0.16 }}><OliveSprig size={170} color="var(--cream)" berry="var(--gold)"/></div>
            <div style={{ position: 'absolute', bottom: -30, left: 20, opacity: 0.12, transform: 'scaleX(-1)' }}><OliveSprig size={150} color="var(--cream)" berry="var(--gold)"/></div>
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--cream)', margin: '0 0 10px', letterSpacing: '-0.01em' }}>Start with a sentence.</h2>
              <p style={{ fontSize: 16, color: 'rgba(248,241,228,0.8)', maxWidth: 420, margin: '0 auto 24px' }}>Build your site free in the next two minutes. Bring it to life when you’re ready.</p>
              <a href="Pearloom Wizard.html" className="btn" style={{ background: 'var(--cream)', color: 'var(--ink)', borderRadius: 999, fontSize: 15, padding: '13px 28px' }}><Spark size={17} color="var(--sage-deep)"/> Start your site — free</a>
              <div style={{ fontSize: 12.5, color: 'rgba(248,241,228,0.6)', marginTop: 14 }}>No credit card · free to build · every kind of event</div>
            </div>
          </div>
        </section>

        <footer style={{ borderTop: '1px solid var(--line-soft)', padding: '24px 28px', maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Pear size={20} tone="sage" shadow={false}/>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Pearloom</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginLeft: 8 }}>Every gathering, in one calm place.</span>
          <div style={{ flex: 1 }}/>
          <a href="Pearloom Signin.html" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sign in</a>
        </footer>
      </div>

      <TweaksPanel>
        <TweakSection label="Hero headline (A/B)"/>
        <TweakRadio label="Variant" value={t.headline} options={[{value:'calm',label:'Calm'},{value:'plan',label:'Plan less'},{value:'done',label:'Done'}]} onChange={(v) => setTweak('headline', v)}/>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<LandingApp/>);
