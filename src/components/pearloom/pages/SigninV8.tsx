'use client';

/* ========================================================================
   PEARLOOM — SIGN IN
   "The invitation is the door."

   Redesigned 2026-07-08 to align with the landing page: the same
   editorial-midnight ground the landing hero wears, and the form set
   as THE pressed invitation card (the landing's .pd-std recipe —
   paper gradient + grain, foil hairline frame, letterpress Fraunces,
   thread divider). The old two-column scrapbook collage (blobs,
   stamps, washi tape) is gone — BRAND §10 territory, and it competed
   with the form instead of framing it.

   Auth wiring unchanged: Google OAuth + One Tap + credentials
   (account_credentials, migration 20260625). On success the page
   holds the ThreadingDoor scene over the route swap so the journey
   reads letter → thread → loom, not form → flash → dashboard.
   ======================================================================== */

import Link from 'next/link';
import { PearloomMark } from '@/components/brand/PearloomMark';
import { ThreadingDoor } from '@/components/brand/ThreadingDoor';
import { Thread } from '@/components/brand/Thread';
import { use, useEffect, useRef, useState, type FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GoogleOneTap } from '@/components/auth/GoogleOneTap';
import { PearloomWordmark, Icon, Pear } from '../motifs';

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
  /* Default landing is /welcome — the first-run onboarding gate.
     Finished accounts pass straight through to /dashboard server-
     side, so returning users never see the flow. Explicit ?next=
     deep links still win. */
  const next = params.next || '/welcome';
  const errorKey = params.error;
  const { status } = useSession();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  /* The threshold — once a session exists (fresh credentials or a
     returning visitor's restored session), the ThreadingDoor covers
     the page and stays up through the route swap. */
  const [leaving, setLeaving] = useState(false);
  const holdTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);

  // Redirect after render — calling router.replace() during render
  // triggers React's "Cannot update a component while rendering a
  // different component" warning (it sets Router state mid-render).
  useEffect(() => {
    if (status === 'authenticated') {
      setLeaving(true);
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

  /* Email + password sign-in against the credentials provider
     (account_credentials, migration 20260625). */
  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Doesn’t look like an email address.');
      return;
    }
    if (!password) {
      setEmailError('Enter your password — or use Google above.');
      return;
    }
    setBusy('email');
    try {
      const res = await signIn('credentials', { email: email.trim(), password, redirect: false });
      if (res?.error) {
        setEmailError(res.error === 'CredentialsSignin'
          ? 'That email and password don’t match our records.'
          : res.error);
        setBusy(null);
      } else {
        /* Success — raise the threshold, hold it a beat so the
           thread has time to draw (the wizard's minimum-press rule:
           the moment must not flash), then swap routes beneath it. */
        setLeaving(true);
        holdTimer.current = window.setTimeout(() => {
          router.replace(next);
        }, 1100);
      }
    } catch {
      setEmailError('Something went wrong. Try again.');
      setBusy(null);
    }
  }

  const formLocked = busy !== null || leaving;

  return (
    <div className="pl8 pl-auth">
      {/* Stay-on-page Google sign-in — the One Tap card appears in
          the corner when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set; one
          tap mints the session with no redirect. The button below
          remains the full-OAuth path (it also grants the Google
          Photos scope One Tap can't). */}
      <GoogleOneTap next={next} />

      {/* Ambient strands — two threads crossing the dark behind the
          card, the landing's weave language at whisper volume. */}
      <svg
        aria-hidden
        className="pl-auth-strands"
        width="100%"
        height="160"
        viewBox="0 0 1600 160"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="pl-auth-foil" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a87f35" />
            <stop offset="0.45" stopColor="#e3c77e" />
            <stop offset="0.7" stopColor="#c19a4b" />
            <stop offset="1" stopColor="#b8913f" />
          </linearGradient>
        </defs>
        <path
          className="pl-thread-draw"
          d="M0 70 C 420 46, 900 96, 1600 62"
          fill="none"
          stroke="url(#pl-auth-foil)"
          strokeWidth="1"
          opacity="0.32"
          style={{ ['--pl-draw-len' as string]: 1700, ['--pl-draw-dur' as string]: '2s' } as React.CSSProperties}
        />
        <path
          className="pl-thread-draw"
          d="M0 92 C 460 116, 940 52, 1600 96"
          fill="none"
          stroke="rgba(139,156,90,0.4)"
          strokeWidth="1"
          style={{ ['--pl-draw-len' as string]: 1700, ['--pl-draw-dur' as string]: '2s', ['--pl-draw-delay' as string]: '0.3s' } as React.CSSProperties}
        />
      </svg>

      <div className="pl-auth-logo">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: '#E8DEC4' }}>
          {/* The thread draws itself while the page settles — the
              brand mark's draw-in is the sign-in's welcome gesture. */}
          <PearloomMark size={32} animated color="#E8DEC4" />
          <PearloomWordmark size={20} color="#E8DEC4" />
        </Link>
      </div>

      {/* THE INVITATION — the landing hero's pressed card, holding
          the form. Foil hairline frame, paper grain, letterpress. */}
      <main className="pl-auth-card">
        <div className="au-eyebrow">The loom · Sign in</div>
        <h1 className="au-title">
          Welcome back
          <br />
          <em>to the loom.</em>
        </h1>
        <div className="au-thread">
          <Thread variant="weave" height={11} />
        </div>

        {errorMessage && <div className="au-error">{errorMessage}</div>}

        <button
          type="button"
          className="au-google"
          onClick={handleGoogle}
          disabled={formLocked}
        >
          <GoogleGlyph />
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="au-or" aria-hidden>
          <span className="au-or-line" />
          or with your email
          <span className="au-or-line" />
        </div>

        <form onSubmit={handleEmail}>
          <label htmlFor="pl8-email" className="au-label">Email</label>
          <div className="au-field">
            <Icon name="mail" size={15} style={{ position: 'absolute', left: 14, top: 13 }} color="#8A8069" />
            <input
              id="pl8-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="au-label-row">
            <label htmlFor="pl8-password" className="au-label">Password</label>
            <Link href="/forgot" className="au-link">Forgot password?</Link>
          </div>
          <div className="au-field">
            <Icon name="lock" size={15} style={{ position: 'absolute', left: 14, top: 13 }} color="#8A8069" />
            <input
              id="pl8-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              className="au-eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              <Icon name={showPw ? 'eye-off' : 'eye'} size={17} />
            </button>
          </div>

          {emailError && <p className="au-field-error">{emailError}</p>}

          <button
            type="submit"
            disabled={formLocked || !email.trim() || !password}
            className="btn btn-primary btn-lg pl-pearl-accent"
            style={{ width: '100%', justifyContent: 'center', opacity: !email.trim() || !password ? 0.55 : 1 }}
          >
            {busy === 'email' || leaving ? 'Threading…' : 'Sign in'}
            <Pear size={14} tone="cream" shadow={false} />
          </button>
        </form>

        <div className="au-signup">
          New to Pearloom?{' '}
          <Link href="/signup" className="au-link">Begin a thread</Link>
        </div>
      </main>

      <div className="pl-auth-meta">
        Private by design · Built with care, by real humans · Memorials are always free
      </div>

      {leaving && <ThreadingDoor />}

      <style jsx>{`
        .pl-auth {
          position: relative;
          min-height: 100vh;
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 104px 20px 84px;
          background: #14110c;
          background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.016) 0 1px, transparent 1px 3px);
          overflow: hidden;
          isolation: isolate;
        }
        .pl-auth-strands {
          position: absolute;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          z-index: 0;
          pointer-events: none;
        }
        .pl-auth-logo {
          position: absolute;
          top: 34px;
          left: 44px;
          z-index: 3;
        }
        .pl-auth-card {
          position: relative;
          z-index: 2;
          width: min(460px, 100%);
          border-radius: 10px;
          /* The landing hero's pressed paper: laid grain over a warm
             cream sheet, sunk into the midnight with a deep throw. */
          background-image: repeating-linear-gradient(0deg, rgba(38, 35, 28, 0.028) 0 1px, transparent 1px 3px),
            linear-gradient(150deg, #fdfaf0, #f5ecda);
          padding: 46px 44px 36px;
          text-align: center;
          box-shadow: 0 46px 100px -30px rgba(0, 0, 0, 0.75), 0 2px 0 rgba(255, 255, 255, 0.7) inset,
            0 0 0 1px rgba(120, 90, 50, 0.14);
        }
        .pl-auth-card::before {
          content: '';
          position: absolute;
          inset: 12px;
          /* Foil hairline frame — gold as metal, not flat. */
          border: 1px solid transparent;
          border-image: linear-gradient(100deg, #a87f35, #e3c77e 45%, #c19a4b 70%, #b8913f) 1;
          opacity: 0.55;
          pointer-events: none;
        }
        .au-eyebrow {
          font-family: var(--pl-font-mono, ui-monospace, monospace);
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #5c6b3f;
        }
        .au-title {
          font-family: var(--pl-font-display, serif);
          font-weight: 420;
          font-size: clamp(34px, 7vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #26231c;
          margin: 14px 0 0;
          font-variation-settings: 'opsz' 144, 'SOFT' 70, 'WONK' 0;
          /* Letterpress — the welcome sits INTO the paper. */
          text-shadow: 0 1px 1px rgba(255, 255, 255, 0.85), 0 -1px 1px rgba(38, 35, 28, 0.16);
        }
        .au-title em {
          font-style: italic;
          color: #5c6b3f;
          font-variation-settings: 'opsz' 144, 'SOFT' 80, 'WONK' 1;
        }
        .au-thread {
          max-width: 180px;
          margin: 16px auto 22px;
        }
        .au-error {
          margin-bottom: 16px;
          padding: 11px 14px;
          border-radius: 10px;
          background: rgba(161, 74, 44, 0.08);
          border: 1px solid rgba(161, 74, 44, 0.55);
          color: #a14a2c;
          font-size: 13px;
          text-align: left;
          font-family: var(--pl-font-body, system-ui, sans-serif);
        }
        .au-google {
          width: 100%;
          padding: 13px 18px;
          background: #fffef8;
          border: 1px solid #d8cfb8;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 600;
          font-size: 14px;
          color: #26231c;
          cursor: pointer;
          font-family: var(--pl-font-body, system-ui, sans-serif);
          box-shadow: inset 0 -1px 0 rgba(38, 35, 28, 0.05), 0 1px 2px rgba(38, 35, 28, 0.06);
          transition: transform var(--pl-dur-quick, 140ms) var(--pl-ease-out, ease),
            box-shadow var(--pl-dur-quick, 140ms) var(--pl-ease-out, ease);
        }
        .au-google:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: inset 0 -1px 0 rgba(38, 35, 28, 0.05), 0 6px 16px -6px rgba(38, 35, 28, 0.22);
        }
        .au-google:disabled {
          cursor: wait;
          opacity: 0.75;
        }
        .au-or {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 18px 0 16px;
          font-family: var(--pl-font-mono, ui-monospace, monospace);
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a8069;
          white-space: nowrap;
        }
        .au-or-line {
          flex: 1;
          height: 1px;
          background: rgba(120, 90, 50, 0.22);
        }
        .au-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #3a332c;
          margin-bottom: 6px;
          text-align: left;
          font-family: var(--pl-font-body, system-ui, sans-serif);
        }
        .au-label-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .au-label-row .au-label {
          margin-bottom: 6px;
        }
        .au-field {
          position: relative;
          margin-bottom: 15px;
        }
        .au-field input {
          width: 100%;
          padding: 11px 14px 11px 40px;
          background: #fffef8;
          border: 1px solid #d8cfb8;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          color: #26231c;
          font-family: var(--pl-font-body, system-ui, sans-serif);
          /* Deboss — the field is pressed into the sheet. */
          box-shadow: inset 0 1.5px 3px rgba(38, 35, 28, 0.06), inset 0 -1px 0 rgba(255, 255, 255, 0.7);
          transition: border-color var(--pl-dur-quick, 140ms) ease, box-shadow var(--pl-dur-quick, 140ms) ease;
        }
        .au-field input::placeholder {
          color: #b3a88e;
        }
        .au-field input:focus {
          border-color: #5c6b3f;
          box-shadow: inset 0 1.5px 3px rgba(38, 35, 28, 0.06), 0 0 0 3px rgba(92, 107, 63, 0.14);
        }
        .au-eye {
          position: absolute;
          right: 10px;
          top: 8px;
          padding: 4px;
          background: transparent;
          border: none;
          color: #8a8069;
          cursor: pointer;
        }
        .au-field-error {
          margin: -4px 0 12px;
          font-size: 12.5px;
          color: #7a2d2d;
          text-align: left;
          font-family: var(--pl-font-body, system-ui, sans-serif);
        }
        .au-signup {
          margin-top: 18px;
          font-size: 13px;
          color: #6f6557;
          font-family: var(--pl-font-body, system-ui, sans-serif);
        }
        .pl-auth :global(.au-link) {
          color: #5c6b3f;
          font-weight: 600;
          font-size: 12.5px;
          text-decoration: none;
        }
        .pl-auth :global(.au-link:hover) {
          text-decoration: underline;
        }
        .pl-auth-meta {
          position: absolute;
          bottom: 24px;
          left: 20px;
          right: 20px;
          text-align: center;
          font-family: var(--pl-font-mono, ui-monospace, monospace);
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(232, 222, 196, 0.45);
          z-index: 2;
        }
        @media (max-width: 640px) {
          .pl-auth {
            padding: 92px 14px 76px;
          }
          .pl-auth-logo {
            top: 26px;
            left: 22px;
          }
          .pl-auth-card {
            padding: 36px 24px 30px;
          }
          .pl-auth-meta {
            letter-spacing: 0.12em;
            line-height: 2;
          }
        }
      `}</style>
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
