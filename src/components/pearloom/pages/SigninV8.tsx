'use client';

/* ========================================================================
   PEARLOOM — SIGN IN (v8 handoff port)
   Keeps NextAuth wiring from the previous LoginClient.
   ======================================================================== */

import Link from 'next/link';
import { PearloomMark } from '@/components/brand/PearloomMark';
import { use, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GoogleOneTap } from '@/components/auth/GoogleOneTap';
import { PearloomWordmark, PearlDot,
  Atmosphere,
  Blob,
  Heart,
  Icon,
  Pear,
  PearloomLogo,
  Sparkle,
  Stamp,
} from '../motifs';
import { Reveal, Float } from '../motion';
import { getPackById, PACKS, type Pack } from '@/lib/theme-store/packs';

const ERROR_COPY: Record<string, string> = {
  OAuthCallback: 'Google sign-in couldn’t complete. Try once more.',
  OAuthAccountNotLinked: 'That email is already linked to a different sign-in method.',
  SessionRequired: 'You need to sign in to see that page.',
  AccessDenied: 'Sign-in was declined. Try again or contact support.',
  Default: 'Something went wrong signing in. Please try again.',
};

/* ─── SigninSiteCard ────────────────────────────────────────────────
   A real themed Save-the-Date vignette inside the signin collage.
   Verbatim port of the prototype's SigninSiteCard: a `.pl8-guest`
   scope with the Santorini Linen pack's --t-* vars stamped on it,
   a centered motif glyph in each top corner, and the pressed-into-
   paper "Save the date" / couple-names / sprig divider / date-line
   stack. Shows guests on first arrival what Pearloom actually makes.
   ─────────────────────────────────────────────────────────────── */

function SigninMotif({ pack, size = 46, flip = false }: { pack: Pack; size?: number; flip?: boolean }) {
  const color = 'var(--t-accent-ink, var(--t-ink, #2A2A28))';
  const gold = 'var(--t-gold, #C19A4B)';
  const transform = flip ? 'scaleX(-1)' : undefined;
  if (pack.motif === 'olive') {
    return (
      <svg width={size} height={size} viewBox="0 0 60 60" style={{ transform }} aria-hidden>
        <path d="M30 6 Q 22 24 30 54 Q 38 24 30 6 Z" fill="none" stroke={color} strokeWidth="1.4" />
        <ellipse cx="18" cy="22" rx="4" ry="2" fill={color} opacity={0.78} transform="rotate(-30 18 22)" />
        <ellipse cx="42" cy="22" rx="4" ry="2" fill={color} opacity={0.78} transform="rotate(30 42 22)" />
        <ellipse cx="20" cy="34" rx="4" ry="2" fill={color} opacity={0.7} transform="rotate(-22 20 34)" />
        <ellipse cx="40" cy="34" rx="4" ry="2" fill={color} opacity={0.7} transform="rotate(22 40 34)" />
        <circle cx="30" cy="40" r="2.6" fill={gold} />
      </svg>
    );
  }
  // Fallback bloom shape — used when the resolved pack doesn't
  // carry an 'olive' motif (e.g., a future SigninSiteCard variant
  // that ships with a different pack).
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ transform }} aria-hidden>
      <circle cx="30" cy="18" r="6" fill={color} opacity={0.62} />
      <circle cx="20" cy="32" r="5.4" fill={color} opacity={0.5} />
      <circle cx="40" cy="32" r="5.4" fill={color} opacity={0.5} />
      <circle cx="30" cy="42" r="6" fill={color} opacity={0.55} />
      <circle cx="30" cy="30" r="3.6" fill={gold} />
    </svg>
  );
}

function SigninSprigDivider({ width = 104 }: { width?: number }) {
  const color = 'var(--t-accent-ink, var(--t-ink, #2A2A28))';
  const gold = 'var(--t-gold, #C19A4B)';
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} aria-hidden>
      <line x1="2" y1="7" x2={width - 2} y2="7" stroke={color} strokeWidth="1" />
      <ellipse cx={width / 2 - 12} cy="7" rx="3.4" ry="1.4" fill={color} opacity={0.75} transform={`rotate(-22 ${width / 2 - 12} 7)`} />
      <ellipse cx={width / 2 + 12} cy="7" rx="3.4" ry="1.4" fill={color} opacity={0.75} transform={`rotate(22 ${width / 2 + 12} 7)`} />
      <circle cx={width / 2} cy="7" r="2.6" fill={gold} />
    </svg>
  );
}

function SigninSiteCard() {
  // Santorini Linen — the prototype's chosen vignette palette.
  // Falls back to the first PACKS entry (also santorini-linen) if
  // the id ever drifts, so the card never silently disappears.
  const pack = getPackById('santorini-linen') ?? PACKS[0]!;
  const scopeStyle: CSSProperties = {
    ...(pack.themeRef as unknown as CSSProperties),
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    background: 'var(--t-section, var(--t-paper))',
    color: 'var(--t-ink)',
    textAlign: 'center',
    padding: '26px 18px',
    aspectRatio: '4/5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <div
      className="pl8-guest"
      data-pl-texture={pack.texture}
      data-pl-pattern={pack.pattern}
      data-pl-kit={pack.kit}
      data-pl-density="comfortable"
      style={scopeStyle}
    >
      <div className="pl8-pattern-layer" data-pl-pattern={pack.pattern} aria-hidden />
      {/* Top-corner motifs — mirrored sprig pair, the prototype's
          signature framing device. */}
      <div style={{ position: 'absolute', top: 10, left: 12, opacity: 0.55 }}>
        <SigninMotif pack={pack} size={46} flip />
      </div>
      <div style={{ position: 'absolute', top: 10, right: 12, opacity: 0.55 }}>
        <SigninMotif pack={pack} size={46} />
      </div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: 'var(--t-eyebrow-ls, 0.2em)',
            textTransform: 'uppercase',
            color: 'var(--t-accent-ink, var(--t-ink))',
            marginBottom: 7,
          }}
        >
          Save the date
        </div>
        <div
          style={{
            fontFamily: 'var(--t-display)',
            fontWeight: 'var(--t-display-wght, 600)' as unknown as number,
            fontSize: 27,
            lineHeight: 1,
            color: 'var(--t-ink)',
          }}
        >
          Alex
          <span
            style={{
              fontStyle: 'italic',
              fontSize: '0.6em',
              color: 'var(--t-ink-soft)',
              margin: '0 0.14em',
              fontWeight: 400,
            }}
          >
            &amp;
          </span>
          Jamie
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '9px 0' }}>
          <SigninSprigDivider width={104} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--t-ink-soft)' }}>June 22 · Portland</div>
      </div>
    </div>
  );
}

export function SigninV8({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
}) {
  const params = use(searchParamsPromise);
  /* Default landing is /welcome — the first-run onboarding gate.
     Finished accounts pass straight through to /dashboard server-
     side, so returning users never see the flow. Explicit ?next=
     deep links still win. */
  const next = params.next || '/welcome';
  const errorKey = params.error;
  const { status } = useSession();
  const router = useRouter();
  const [keep, setKeep] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Redirect after render — calling router.replace() during render
  // triggers React's "Cannot update a component while rendering a
  // different component" warning (it sets Router state mid-render).
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(next);
    }
  }, [status, router, next]);

  const errorMessage = errorKey ? ERROR_COPY[errorKey] ?? ERROR_COPY.Default : null;

  async function handleGoogle() {
    setBusy('google');
    try {
      await signIn('google', { callbackUrl: next });
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Doesn’t look like an email address.');
      return;
    }
    setBusy('email');
    try {
      const res = await signIn('email', { email, redirect: false, callbackUrl: next });
      if (res?.error) {
        setEmailError(
          res.error === 'EmailSignin'
            ? 'We couldn’t send the magic link. Try again in a moment.'
            : res.error
        );
      } else {
        setSent(true);
      }
    } catch {
      setEmailError('Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      {/* Stay-on-page Google sign-in — the One Tap card appears in
          the corner when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set; one
          tap mints the session with no redirect. The button below
          remains the full-OAuth path (it also grants the Google
          Photos scope One Tap can't). */}
      <GoogleOneTap next={next} />
      <Atmosphere preset="sparse" />

      <div className="pl8-signin-logo" style={{ position: 'absolute', top: 40, left: 56, zIndex: 10 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'var(--ink)' }}>
          {/* The thread draws itself while the page settles — the
              brand mark's draw-in is the sign-in's welcome gesture. */}
          <PearloomMark size={34} animated />
          <PearloomWordmark size={22} />
        </Link>
      </div>

      <div
        className="pl8-signin-root pl8-split-auth"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          minHeight: '100vh',
          padding: '100px 56px 60px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* LEFT — form */}
        <Reveal y={18}>
          <div style={{ maxWidth: 420 }}>
            {/* Sparkle glyph — the prototype's understated eyebrow.
                Replaces the earlier peach "SIGN IN" wordmark; the
                page reads as personal letterhead, not marketing. */}
            <Sparkle size={16} style={{ marginBottom: 8 }} />
            <h1
              className="display"
              style={{
                fontSize: 56,
                margin: '4px 0 0',
                lineHeight: 0.98,
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Welcome back,
            </h1>
            <h1
              className="display-italic"
              style={{
                fontSize: 56,
                margin: '0 0 16px',
                lineHeight: 0.98,
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              beautiful soul. <PearlDot size={13} style={{ marginLeft: 2 }} />
            </h1>
            <p
              style={{
                color: 'var(--ink-soft)',
                fontSize: 15,
                marginBottom: 28,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Every moment matters. Let&apos;s keep your story growing.

            </p>

            {errorMessage && (
              <div
                style={{
                  marginBottom: 18,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--pl-warning-mist, rgba(161,74,44,0.10))',
                  border: '1px solid var(--pl-warning, #A14A2C)',
                  color: 'var(--pl-warning, #A14A2C)',
                  fontSize: 13.5,
                }}
              >
                {errorMessage}
              </div>
            )}

            {sent ? (
              <div
                style={{
                  padding: '18px 16px',
                  borderRadius: 14,
                  background: 'var(--sage-tint)',
                  border: '1px solid rgba(107,122,58,0.25)',
                  marginBottom: 16,
                }}
              >
                <div className="eyebrow" style={{ color: 'var(--sage-deep)', marginBottom: 6 }}>
                  Check your inbox
                </div>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink)' }}>
                  We sent a link to <strong>{email}</strong>. Open it on this device to finish signing in.
                </p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy !== null}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    background: 'var(--card)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--ink)',
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  <GoogleGlyph />
                  {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0', color: 'var(--ink-muted)', fontSize: 13 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  or
                  <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>

                <form onSubmit={handleEmail}>
                  <label
                    htmlFor="pl8-email"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}
                  >
                    Email address
                  </label>
                  <div style={{ position: 'relative', marginBottom: 18 }}>
                    <Icon name="mail" size={16} style={{ position: 'absolute', left: 16, top: 14 }} color="var(--ink-muted)" />
                    <input
                      id="pl8-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 42px',
                        background: 'var(--card)',
                        border: '1.5px solid var(--line)',
                        borderRadius: 12,
                        fontSize: 14,
                        outline: 'none',
                        color: 'var(--ink)',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label htmlFor="pl8-password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      Password
                    </label>
                    <Link href="/login?forgot=1" style={{ fontSize: 13, color: 'var(--pl-olive, #5C6B3F)' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <Icon name="lock" size={16} style={{ position: 'absolute', left: 16, top: 14 }} color="var(--ink-muted)" />
                    <input
                      id="pl8-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '12px 44px 12px 42px',
                        background: 'var(--card)',
                        border: '1.5px solid var(--line)',
                        borderRadius: 12,
                        fontSize: 14,
                        outline: 'none',
                        color: 'var(--ink)',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 10,
                        padding: 4,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ink-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon name={showPw ? 'eye-off' : 'eye'} size={18} />
                    </button>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      marginBottom: 24,
                      cursor: 'pointer',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setKeep((v) => !v)}
                      aria-pressed={keep}
                      aria-label="Keep me signed in"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: keep ? 'var(--sage-deep)' : 'var(--card)',
                        border: `1.5px solid ${keep ? 'var(--sage-deep)' : 'var(--line)'}`,
                        display: 'grid',
                        placeItems: 'center',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      {keep && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
                    </button>
                    Keep me signed in
                  </label>

                  {emailError && (
                    <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#7A2D2D' }}>{emailError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={busy !== null || !email.trim()}
                    className="btn btn-primary btn-lg pl-pearl-accent"
                    style={{ width: '100%', justifyContent: 'center', opacity: !email.trim() ? 0.55 : 1 }}
                  >
                    {busy === 'email' ? 'Sending…' : 'Sign in'}
                    <Pear size={14} tone="cream" shadow={false} />
                  </button>
                </form>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-soft)' }}>
              New to Pearloom?{' '}
              <Link href="/wizard/new" style={{ color: 'var(--pl-olive, #5C6B3F)', fontWeight: 500 }}>
                Create an account
              </Link>
            </div>

            {/* Pear chat bubble */}
            <div style={{ marginTop: 40, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              {/* sage, not cream — cream strokes on the cream page
                  rendered as a ghost scribble. */}
              <Pear size={58} tone="sage" />
              <div
                style={{
                  background: 'var(--pl-olive-mist, #E0DDC9)',
                  padding: '12px 16px',
                  borderRadius: 14,
                  borderBottomLeftRadius: 2,
                  border: '1px solid var(--pl-olive-20, rgba(92,107,63,0.20))',
                  maxWidth: 240,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--pl-olive-deep, #363F22)', fontSize: 14, marginBottom: 2 }}>
                  Hi there! I&apos;m Pear.
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                  I&apos;m here to help you cherish what matters most. <PearlDot size={10} />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* RIGHT — collage */}
        <div className="pl8-signin-collage" style={{ position: 'relative', height: 560 }}>
          <Blob tone="cream" size={320} opacity={0.85} style={{ position: 'absolute', top: 20, left: 40, zIndex: 0 }} />
          <Blob tone="sage" size={280} opacity={0.75} style={{ position: 'absolute', bottom: 60, right: -40, zIndex: 0 }} />
          <Blob tone="peach" size={260} opacity={0.7} style={{ position: 'absolute', bottom: 120, left: 100, zIndex: 0 }} />

          <div style={{ position: 'absolute', top: 70, left: 30, zIndex: 3 }}>
            <Float amplitude={6} duration={7}>
              <div
                style={{
                  width: 220,
                  height: 290,
                  background: 'var(--pl-olive-mist, #E0DDC9)',
                  borderRadius: '3px 12px 12px 3px',
                  boxShadow: '0 20px 40px rgba(61,74,31,0.16), inset 10px 0 0 rgba(0,0,0,0.08)',
                  padding: '32px 28px',
                  transform: 'rotate(-4deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, lineHeight: 1.1, color: 'var(--ink)' }}>
                  The best
                  <br />
                  memories
                  <br />
                  come from
                  <br />
                  being
                  <br />
                  together.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-script)', fontSize: 24, color: 'var(--ink-soft)' }}>~</div>
                  <Pear size={42} tone="sage" shadow={false} />
                </div>
              </div>
            </Float>
          </div>

          {/* "Their site" — a real themed Save-the-Date vignette wrapped
              in the prototype's white-mat polaroid frame with a peach
              washi-tape strip. The vignette is a live `.pl8-guest`
              scope so visitors see what Pearloom actually makes, not
              a placeholder. */}
          <div style={{ position: 'absolute', top: 40, right: 20, width: 264, zIndex: 5 }}>
            <Float amplitude={8} duration={6} delay={0.5}>
              <div style={{ transform: 'rotate(3deg)' }}>
                <div
                  style={{
                    background: '#fff',
                    padding: 10,
                    borderRadius: 14,
                    boxShadow: '0 20px 40px rgba(61,74,31,0.2)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: 30,
                      width: 80,
                      height: 26,
                      background: 'rgba(234,178,134,0.55)',
                      transform: 'rotate(-3deg)',
                    }}
                  />
                  <SigninSiteCard />
                </div>
              </div>
            </Float>
          </div>

          <div style={{ position: 'absolute', bottom: 40, left: 20, zIndex: 6 }}>
            <Float amplitude={5} duration={8} delay={1}>
              <div
                style={{
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
                }}
              >
                Little moments,
                <br />
                big meaning.
                <PearlDot size={11} style={{ marginLeft: 8 }} />
              </div>
            </Float>
          </div>

          <div style={{ position: 'absolute', top: 0, left: 120, zIndex: 7 }}>
            <Stamp size={88} tone="sage" text="MADE FOR MEANINGFUL MOMENTS" rotation={-12} icon="pear" />
          </div>
          <div style={{ position: 'absolute', top: 280, right: 30, zIndex: 7 }}>
            <Stamp size={80} tone="peach" text="MADE TO BE REMEMBERED" rotation={10} icon="pear" />
          </div>
          <div style={{ position: 'absolute', bottom: 40, right: 120, zIndex: 7 }}>
            <Stamp size={74} tone="cream" text="WITH YOU EVERY STEP OF THE WAY" rotation={-8} icon="heart" />
          </div>

          {/* Botanical accents — the prototype's wildflower sprig,
              butterfly, and green-heart corner. Tiny details that
              read the collage as "made by hand" rather than
              templated. */}
          <svg
            aria-hidden
            style={{ position: 'absolute', top: 0, right: 120, zIndex: 6 }}
            width="80"
            height="120"
            viewBox="0 0 80 120"
          >
            <path d="M40 100 Q 35 60, 45 20" stroke="#8B9C5A" strokeWidth="1.5" fill="none" />
            <circle cx="40" cy="25" r="3" fill="#F3E9D4" />
            <circle cx="46" cy="22" r="3" fill="#F3E9D4" />
            <circle cx="34" cy="22" r="3" fill="#F3E9D4" />
            <circle cx="42" cy="18" r="3" fill="#F3E9D4" />
            <circle cx="38" cy="28" r="3" fill="#F3E9D4" />
            <circle cx="42" cy="23" r="2" fill="#D4A95D" />
            <path d="M30 60 Q 25 50, 28 40" stroke="#8B9C5A" strokeWidth="1" fill="none" />
            <circle cx="28" cy="40" r="2" fill="#F3E9D4" />
          </svg>

          <svg
            aria-hidden
            style={{ position: 'absolute', bottom: 140, left: 260, zIndex: 6 }}
            width="30"
            height="30"
            viewBox="0 0 40 40"
          >
            <path d="M20 20 C 10 10, 4 14, 6 22 C 8 28, 16 24, 20 20 Z" fill="var(--pl-olive-mist, #E0DDC9)" />
            <path d="M20 20 C 30 10, 36 14, 34 22 C 32 28, 24 24, 20 20 Z" fill="var(--pl-olive-mist, #E0DDC9)" />
            <circle cx="20" cy="20" r="2" fill="#3D4A1F" />
          </svg>

        </div>
      </div>

      <div
        className="pl8-signin-meta"
        style={{
          position: 'absolute',
          bottom: 30,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 36,
          fontSize: 13,
          color: 'var(--ink-soft)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" size={13} /> Your data is private and secure
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="leaf" size={13} /> Built with care, by real humans
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="heart-icon" size={13} /> Here for life&apos;s big (and small) moments
        </span>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 6 29.1 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.7 6 29.1 4 24 4 16.3 4 9.6 8.4 6.3 14.7z" />
      <path fill="#FBBC05" d="M24 44c5 0 9.6-1.9 13.1-5.1l-6-5c-2 1.4-4.5 2.1-7.1 2.1-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
      <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6 5c4.1-3.8 6.9-9.4 6.9-16.1 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
