/* =========================================================================
   PEARLOOM — SIGN IN
   "Welcome back, beautiful soul."
   ========================================================================= */

const { useState } = React;

/* A real themed site vignette — shows what Pearloom makes */
function SigninSiteCard() {
  const theme = getTheme('santorini');
  return (
    <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), position: 'relative', borderRadius: 8, overflow: 'hidden', background: 'var(--t-section)', textAlign: 'center', padding: '26px 18px', aspectRatio: '4/5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <TextureLayer texture={theme.texture} intensity={1}/>
      <div style={{ position: 'absolute', top: 10, left: 12, opacity: 0.55, transform: 'scaleX(-1)' }}><Motif kind={theme.motif} size={46}/></div>
      <div style={{ position: 'absolute', top: 10, right: 12, opacity: 0.55 }}><Motif kind={theme.motif} size={46}/></div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 7 }}>Save the date</div>
        <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 27, lineHeight: 1, color: 'var(--t-ink)' }}>Alex<span style={{ fontStyle: 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.14em', fontWeight: 400 }}>&amp;</span>Jamie</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '9px 0' }}><TDivider look="sprig" width={104}/></div>
        <div style={{ fontSize: 10, color: 'var(--t-ink-soft)' }}>June 22 · Portland</div>
      </div>
    </div>
  );
}

function SigninApp() {
  const [keep, setKeep] = useState(true);
  const [showPw, setShowPw] = useState(false);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <Atmosphere preset="sparse" />

      {/* Logo */}
      <div style={{ position: 'absolute', top: 40, left: 56, zIndex: 10 }}>
        <a href="Pearloom Landing.html"><PearloomLogo /></a>
      </div>

      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 80,
        alignItems: 'center', minHeight: '100vh',
        padding: '100px 56px 60px', position: 'relative', zIndex: 2,
      }}>
        {/* LEFT — form */}
        <div style={{ maxWidth: 420 }}>
          <Sparkle size={16} style={{ marginBottom: 8 }} />
          <h1 className="display" style={{ fontSize: 56, margin: '4px 0 0' }}>Welcome back,</h1>
          <h1 className="display-italic" style={{ fontSize: 56, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            beautiful soul. <Heart size={24} />
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
            Every moment matters. Let's keep your story growing.
            <Sparkle size={12} />
          </p>

          <button style={{
            width: '100%', padding: '14px 18px',
            background: 'var(--card)', border: '1.5px solid var(--line)',
            borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontWeight: 600, fontSize: 14, color: 'var(--ink)', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 6 29.1 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
              <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 6 29.1 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 44c5 0 9.6-1.9 13.1-5.1l-6-5c-2 1.4-4.5 2.1-7.1 2.1-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6 5c4.1-3.8 6.9-9.4 6.9-16.1 0-1.2-.1-2.4-.4-3.5z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0', color: 'var(--ink-muted)', fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            or
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>Email address</label>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <svg style={{ position: 'absolute', left: 16, top: 14 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
            <input type="email" placeholder="you@example.com"
              style={{
                width: '100%', padding: '12px 16px 12px 42px',
                background: 'var(--card)', border: '1.5px solid var(--line)',
                borderRadius: 12, fontSize: 14, outline: 'none',
              }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Password</label>
            <a style={{ fontSize: 13, color: 'var(--lavender-ink)', textDecoration: 'none' }} href="#">Forgot password?</a>
          </div>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <svg style={{ position: 'absolute', left: 16, top: 14 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
            <input type={showPw ? 'text' : 'password'} placeholder="Enter your password"
              style={{
                width: '100%', padding: '12px 44px 12px 42px',
                background: 'var(--card)', border: '1.5px solid var(--line)',
                borderRadius: 12, fontSize: 14, outline: 'none',
              }} />
            <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: 10, padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 24, cursor: 'pointer' }}>
            <div onClick={() => setKeep(!keep)} style={{
              width: 18, height: 18, borderRadius: 5,
              background: keep ? 'var(--sage-deep)' : 'var(--card)',
              border: '1.5px solid ' + (keep ? 'var(--sage-deep)' : 'var(--line)'),
              display: 'grid', placeItems: 'center',
            }}>
              {keep && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
            </div>
            Keep me signed in
          </label>

          <a href="Pearloom Home Redesign.html" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
            Sign in <Pear size={14} tone="cream" shadow={false} />
          </a>

          <div style={{ marginTop: 40, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <Pear size={58} tone="cream" />
            <div style={{
              background: 'var(--lavender-bg)',
              padding: '12px 16px',
              borderRadius: 14,
              borderBottomLeftRadius: 2,
              border: '1px solid rgba(107,90,140,0.15)',
              maxWidth: 240,
              marginBottom: 8,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--lavender-ink)', fontSize: 14, marginBottom: 2 }}>
                Hi there! I'm Pear.
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                I'm here to help you cherish what matters most. <Heart size={12} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — collage */}
        <div style={{ position: 'relative', height: 560 }}>
          <Blob tone="lavender" size={320} opacity={0.85} style={{ position: 'absolute', top: 20, left: 40, zIndex: 0 }} />
          <Blob tone="sage" size={280} opacity={0.75} style={{ position: 'absolute', bottom: 60, right: -40, zIndex: 0 }} />
          <Blob tone="peach" size={260} opacity={0.7} style={{ position: 'absolute', bottom: 120, left: 100, zIndex: 0 }} />

          {/* Lavender book */}
          <div style={{
            position: 'absolute', top: 70, left: 30, width: 220, height: 290,
            background: '#C4B5D9', borderRadius: '3px 12px 12px 3px',
            boxShadow: '0 20px 40px rgba(61,74,31,0.16), inset 10px 0 0 rgba(0,0,0,0.08)',
            padding: '32px 28px', transform: 'rotate(-4deg)', zIndex: 3,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 30, lineHeight: 1.1, color: 'var(--ink)',
            }}>
              The best<br/>memories<br/>come from<br/>being<br/>together.
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-script)', fontSize: 24, color: 'var(--ink-soft)' }}>~</div>
              <Pear size={42} tone="sage" shadow={false} />
            </div>
          </div>

          {/* Their site — a real themed preview */}
          <div style={{ position: 'absolute', top: 40, right: 20, width: 264, zIndex: 5, transform: 'rotate(3deg)' }}>
            <div style={{ background: '#fff', padding: 10, borderRadius: 14, boxShadow: '0 20px 40px rgba(61,74,31,0.2)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, right: 30, width: 80, height: 26, background: 'rgba(234,178,134,0.55)', transform: 'rotate(-3deg)' }} />
              <SigninSiteCard />
            </div>
          </div>

          {/* Little note */}
          <div style={{ position: 'absolute', bottom: 40, left: 20, zIndex: 6 }}>
            <div style={{
              background: 'var(--cream-2)',
              padding: '20px 28px',
              border: '1px dashed rgba(61,74,31,0.3)',
              borderRadius: 3,
              transform: 'rotate(-6deg)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 24,
              color: 'var(--ink)',
              maxWidth: 230,
              boxShadow: '0 14px 30px rgba(61,74,31,0.15)',
              position: 'relative',
            }}>
              Little moments,<br/>big meaning.
              <Heart size={14} style={{ marginLeft: 8 }} />
              <span style={{ fontFamily: 'var(--font-script)', color: 'var(--ink-muted)', marginLeft: 6 }}>~</span>
            </div>
          </div>

          {/* Stamps */}
          <div style={{ position: 'absolute', top: 0, left: 120, zIndex: 7 }}>
            <Stamp size={88} tone="lavender" text="MADE FOR MEANINGFUL MOMENTS" rotation={-12} icon="pear" />
          </div>
          <div style={{ position: 'absolute', top: 280, right: 30, zIndex: 7 }}>
            <Stamp size={80} tone="peach" text="MADE TO BE REMEMBERED" rotation={10} icon="pear" />
          </div>
          <div style={{ position: 'absolute', bottom: 40, right: 120, zIndex: 7 }}>
            <Stamp size={74} tone="lavender" text="WITH YOU EVERY STEP OF THE WAY" rotation={-8} icon="heart" />
          </div>

          {/* Wildflowers */}
          <svg style={{ position: 'absolute', top: 0, right: 120, zIndex: 6 }} width="80" height="120" viewBox="0 0 80 120">
            <path d="M40 100 Q 35 60, 45 20" stroke="#8B9C5A" strokeWidth="1.5" fill="none"/>
            <circle cx="40" cy="25" r="3" fill="#F3E9D4"/>
            <circle cx="46" cy="22" r="3" fill="#F3E9D4"/>
            <circle cx="34" cy="22" r="3" fill="#F3E9D4"/>
            <circle cx="42" cy="18" r="3" fill="#F3E9D4"/>
            <circle cx="38" cy="28" r="3" fill="#F3E9D4"/>
            <circle cx="42" cy="23" r="2" fill="#D4A95D"/>
            <path d="M30 60 Q 25 50, 28 40" stroke="#8B9C5A" strokeWidth="1" fill="none"/>
            <circle cx="28" cy="40" r="2" fill="#F3E9D4"/>
          </svg>

          {/* Butterfly */}
          <svg style={{ position: 'absolute', bottom: 140, left: 260, zIndex: 6 }} width="30" height="30" viewBox="0 0 40 40">
            <path d="M20 20 C 10 10, 4 14, 6 22 C 8 28, 16 24, 20 20 Z" fill="#C4B5D9"/>
            <path d="M20 20 C 30 10, 36 14, 34 22 C 32 28, 24 24, 20 20 Z" fill="#C4B5D9"/>
            <circle cx="20" cy="20" r="2" fill="#3D4A1F"/>
          </svg>

          {/* Green heart corner */}
          <div style={{ position: 'absolute', bottom: 10, left: 220 }}>
            <Heart size={28} color="#6d7d3f" />
          </div>
        </div>
      </div>

      {/* Bottom meta */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 36,
        fontSize: 13, color: 'var(--ink-soft)',
      }}>
        <span style={{ display: 'flex', gap: 6 }}>🔒 Your data is private and secure</span>
        <span style={{ display: 'flex', gap: 6 }}>🌿 Built with care, by real humans</span>
        <span style={{ display: 'flex', gap: 6 }}>♥ Here for life's big (and small) moments</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SigninApp />);
