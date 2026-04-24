'use client';

/* ========================================================================
   PEARLOOM — SIGN IN (v8 handoff port)
   Keeps NextAuth wiring from the previous LoginClient.
   ======================================================================== */

import Link from 'next/link';
import { use, useState, type FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Atmosphere,
  Blob,
  Heart,
  Icon,
  Pear,
  PearloomLogo,
  PhotoPlaceholder,
  Sparkle,
  Stamp,
} from '../motifs';
import { Reveal } from '../motion';

const ERROR_COPY: Record<string, string> = {
  OAuthCallback: 'Google sign-in couldn’t complete. Try once more.',
  OAuthAccountNotLinked: 'That email is already linked to a different sign-in method.',
  SessionRequired: 'You need to sign in to see that page.',
  AccessDenied: 'Sign-in was declined. Try again or contact support.',
  Default: 'Something went wrong signing in. Please try again.',
};

export function SigninV8({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
}) {
  const params = use(searchParamsPromise);
  const next = params.next || '/dashboard';
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

  if (status === 'authenticated') {
    router.replace(next);
  }

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
      <Atmosphere preset="sparse" />

      <div className="pl8-signin-logo" style={{ position: 'absolute', top: 40, left: 56, zIndex: 10 }}>
        <Link href="/">
          <PearloomLogo />
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
            <Sparkle size={16} style={{ marginBottom: 8 }} />
            <h1 className="display" style={{ fontSize: 56, margin: '4px 0 0', lineHeight: 1.02 }}>
              Welcome back,
            </h1>
            <h1
              className="display-italic"
              style={{ fontSize: 56, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.02 }}
            >
              beautiful soul. <Heart size={24} />
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
              <Sparkle size={12} />
            </p>

            {errorMessage && (
              <div
                style={{
                  marginBottom: 18,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(198,86,61,0.08)',
                  border: '1px solid rgba(198,86,61,0.22)',
                  color: '#7A2D2D',
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
                    <Link href="/login?forgot=1" style={{ fontSize: 13, color: 'var(--lavender-ink)' }}>
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
                    className="btn btn-primary btn-lg"
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
              <Link href="/wizard/new" style={{ color: 'var(--lavender-ink)', fontWeight: 500 }}>
                Create an account
              </Link>
            </div>

            {/* Pear chat bubble */}
            <div style={{ marginTop: 40, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <Pear size={58} tone="cream" />
              <div
                style={{
                  background: 'var(--lavender-bg)',
                  padding: '12px 16px',
                  borderRadius: 14,
                  borderBottomLeftRadius: 2,
                  border: '1px solid rgba(107,90,140,0.15)',
                  maxWidth: 240,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--lavender-ink)', fontSize: 14, marginBottom: 2 }}>
                  Hi there! I&apos;m Pear.
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                  I&apos;m here to help you cherish what matters most. <Heart size={12} />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* RIGHT — collage */}
        <div className="pl8-signin-collage" style={{ position: 'relative', height: 560 }}>
          <Blob tone="lavender" size={320} opacity={0.85} style={{ position: 'absolute', top: 20, left: 40, zIndex: 0 }} />
          <Blob tone="sage" size={280} opacity={0.75} style={{ position: 'absolute', bottom: 60, right: -40, zIndex: 0 }} />
          <Blob tone="peach" size={260} opacity={0.7} style={{ position: 'absolute', bottom: 120, left: 100, zIndex: 0 }} />

          <div
            style={{
              position: 'absolute',
              top: 70,
              left: 30,
              width: 220,
              height: 290,
              background: '#C4B5D9',
              borderRadius: '3px 12px 12px 3px',
              boxShadow: '0 20px 40px rgba(61,74,31,0.16), inset 10px 0 0 rgba(0,0,0,0.08)',
              padding: '32px 28px',
              transform: 'rotate(-4deg)',
              zIndex: 3,
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

          <div style={{ position: 'absolute', top: 40, right: 20, width: 260, zIndex: 5, transform: 'rotate(3deg)' }}>
            <div style={{ background: '#fff', padding: '14px 14px 50px', boxShadow: '0 20px 40px rgba(61,74,31,0.2)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, right: 30, width: 80, height: 26, background: 'rgba(234,178,134,0.55)', transform: 'rotate(-3deg)' }} />
              <PhotoPlaceholder tone="warm" aspect="1/1" label="together" />
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: 40, left: 20, zIndex: 6 }}>
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
              <Heart size={14} style={{ marginLeft: 8 }} />
            </div>
          </div>

          <div style={{ position: 'absolute', top: 0, left: 120, zIndex: 7 }}>
            <Stamp size={88} tone="lavender" text="MADE FOR MEANINGFUL MOMENTS" rotation={-12} icon="pear" />
          </div>
          <div style={{ position: 'absolute', top: 280, right: 30, zIndex: 7 }}>
            <Stamp size={80} tone="peach" text="MADE TO BE REMEMBERED" rotation={10} icon="pear" />
          </div>
          <div style={{ position: 'absolute', bottom: 40, right: 120, zIndex: 7 }}>
            <Stamp size={74} tone="lavender" text="WITH YOU EVERY STEP OF THE WAY" rotation={-8} icon="heart" />
          </div>
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
