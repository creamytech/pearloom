'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/login/LoginClient.tsx
// Split-layout sign-in: form on the left, editorial still-life on
// the right. Google is the primary method; email magic-link is
// the secondary path (we don't do passwords).
// ─────────────────────────────────────────────────────────────

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '@/components/marketing/design/DesignAtoms';
import { Sparkle } from '@/components/brand/groove';

const ERROR_COPY: Record<string, string> = {
  OAuthCallback: 'Google sign-in couldn’t complete. Try once more.',
  OAuthAccountNotLinked:
    'That email is already linked to a different sign-in method. Use the original one.',
  SessionRequired: 'You need to sign in to see that page.',
  AccessDenied: 'Sign-in was declined. Try again or contact support.',
  Default: 'Something went wrong signing in. Please try again.',
};

// Editorial still-life — linen, dried flowers, Pearloom card, coffee.
// Replace with a commissioned asset when available.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=80';

interface Props {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
}

export function LoginClient({ searchParamsPromise }: Props) {
  const params = use(searchParamsPromise);
  const next = params.next || '/dashboard';
  const errorKey = params.error;
  const { status } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (status === 'authenticated') {
    router.replace(next);
  }

  const errorMessage = errorKey ? ERROR_COPY[errorKey] || ERROR_COPY.Default : null;

  async function handleGoogle() {
    setBusy('google');
    try {
      await signIn('google', { callbackUrl: next });
    } finally {
      setBusy(null);
    }
  }

  async function handleEmail(e: React.FormEvent) {
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
            : res.error,
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
    <div
      className="pl-login-root"
      style={{
        minHeight: '100vh',
        background: PD.paper,
        color: PD.ink,
        fontFamily: 'var(--pl-font-body)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        overflow: 'hidden',
      }}
    >
      {/* ═══════ LEFT COLUMN ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(40px, 5vw, 72px)',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: PD.ink,
            marginBottom: 'clamp(40px, 7vw, 80px)',
          }}
        >
          <Pear size={40} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <span
            style={{
              ...DISPLAY_STYLE,
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: '-0.02em',
            }}
          >
            Pearloom
          </span>
        </Link>

        <div style={{ maxWidth: 460, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Kicker */}
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 11,
              color: '#6E5BA8',
              letterSpacing: '0.28em',
              marginBottom: 22,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            WELCOME BACK
          </div>

          {/* Headline */}
          <h1
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(40px, 5vw, 60px)',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              margin: '0 0 20px',
              position: 'relative',
            }}
          >
            Let&rsquo;s pick up
            <br />
            where{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              you
            </span>{' '}
            left off.
            <Sparkle
              size={24}
              color={PD.gold}
              style={{ position: 'absolute', top: 6, right: -6 }}
            />
          </h1>

          <p
            style={{
              fontSize: 15.5,
              color: PD.inkSoft,
              lineHeight: 1.6,
              margin: '0 0 36px',
              maxWidth: 400,
            }}
          >
            Sign in to your Pearloom account to continue planning meaningful moments with
            clarity and care.
          </p>

          {/* Error */}
          {errorMessage && (
            <div
              style={{
                marginBottom: 18,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(122,45,45,0.08)',
                border: '1px solid rgba(122,45,45,0.22)',
                color: PD.plum,
                fontSize: 13.5,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Sign-in card */}
          <div
            style={{
              background: PD.paperCard,
              border: '1px solid rgba(31,36,24,0.08)',
              borderRadius: 20,
              padding: 'clamp(24px, 3vw, 32px)',
              boxShadow: '0 20px 50px rgba(31,36,24,0.06)',
            }}
          >
            <h2
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: '-0.01em',
                margin: '0 0 20px',
                color: PD.ink,
              }}
            >
              Sign in to Pearloom
            </h2>

            {sent ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '18px 16px',
                  borderRadius: 12,
                  background: 'rgba(107,122,58,0.1)',
                  border: '1px solid rgba(107,122,58,0.3)',
                }}
              >
                <div
                  style={{
                    ...MONO_STYLE,
                    fontSize: 10,
                    color: PD.olive,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  CHECK YOUR INBOX
                </div>
                <p
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 16,
                    margin: 0,
                    lineHeight: 1.5,
                    color: PD.ink,
                  }}
                >
                  We sent a link to{' '}
                  <strong style={{ fontStyle: 'normal' }}>{email}</strong>. Open it on this
                  device to finish signing in.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Google — primary */}
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogle}
                  disabled={busy !== null}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: PD.olive,
                    color: '#FFFEF7',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: busy ? 'wait' : 'pointer',
                    boxShadow: '0 6px 18px rgba(76,90,38,0.24)',
                    transition: 'transform 180ms var(--pl-ease-spring)',
                  }}
                >
                  <GoogleBadge />
                  {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
                </motion.button>

                {/* Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '22px 0',
                  }}
                >
                  <span style={{ flex: 1, height: 1, background: 'rgba(31,36,24,0.08)' }} />
                  <span style={{ fontSize: 13, color: PD.inkSoft, opacity: 0.7 }}>or</span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(31,36,24,0.08)' }} />
                </div>

                {/* Email magic link */}
                <form onSubmit={handleEmail}>
                  <label
                    htmlFor="pl-login-email"
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: PD.ink,
                      marginBottom: 6,
                    }}
                  >
                    Email address
                  </label>
                  <input
                    id="pl-login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: PD.paper,
                      border: '1px solid rgba(31,36,24,0.12)',
                      borderRadius: 10,
                      color: PD.ink,
                      fontSize: 15,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {emailError && (
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 12.5,
                        color: PD.plum,
                      }}
                    >
                      {emailError}
                    </p>
                  )}
                  <motion.button
                    type="submit"
                    disabled={busy !== null || !email.trim()}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      marginTop: 14,
                      padding: '13px 18px',
                      background: PD.olive,
                      color: '#FFFEF7',
                      border: 'none',
                      borderRadius: 12,
                      fontFamily: 'inherit',
                      fontSize: 14.5,
                      fontWeight: 500,
                      cursor: busy || !email.trim() ? 'not-allowed' : 'pointer',
                      opacity: busy || !email.trim() ? 0.5 : 1,
                    }}
                  >
                    {busy === 'email' ? 'Sending…' : 'Send me a sign-in link'}
                  </motion.button>
                </form>
              </>
            )}

            <p
              style={{
                textAlign: 'center',
                marginTop: 20,
                marginBottom: 0,
                fontSize: 13,
                color: PD.inkSoft,
              }}
            >
              New to Pearloom?{' '}
              <button
                onClick={handleGoogle}
                style={{
                  color: '#6E5BA8',
                  textDecoration: 'none',
                  fontWeight: 500,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                }}
              >
                Create an account
              </button>
            </p>
          </div>

          {/* A note from Pear */}
          <PearNote />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            fontSize: 12,
            color: PD.inkSoft,
            opacity: 0.7,
            flexWrap: 'wrap',
          }}
        >
          <span>© 2025 Pearloom, Inc.</span>
          <div style={{ display: 'flex', gap: 22 }}>
            <Link href="/privacy" style={footerLink}>Privacy</Link>
            <Link href="/terms" style={footerLink}>Terms</Link>
            <Link href="/dashboard/help" style={footerLink}>Help</Link>
          </div>
        </div>
      </motion.div>

      {/* ═══════ RIGHT COLUMN — editorial hero ═══════ */}
      <div
        className="pl-login-hero"
        style={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Curved mask — organic blob edge */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: PD.paper,
            clipPath: 'url(#pl-login-curve)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <clipPath id="pl-login-curve" clipPathUnits="objectBoundingBox">
            <path d="M 0 0 C 0.08 0.35, 0.08 0.6, 0 0.92 L 0 1 L 1 1 L 1 0 Z" />
          </clipPath>
        </svg>

        {/* Image */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src={HERO_IMAGE}
            alt="Pressed flowers, a Pearloom card on a wooden tray, a coffee mug"
            fill
            priority
            sizes="50vw"
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Soft vignette */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 30% 70%, transparent 40%, rgba(244,236,216,0.24) 100%)',
            zIndex: 1,
          }}
        />
      </div>

      {/* Responsive: collapse to single column on small screens */}
      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl-login-root) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl-login-hero) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

const footerLink: React.CSSProperties = {
  color: PD.inkSoft,
  textDecoration: 'none',
};

function GoogleBadge() {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        background: '#FFFEF7',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    </span>
  );
}

function PearNote() {
  return (
    <div
      style={{
        marginTop: 28,
        padding: '16px 18px',
        border: '1px dashed rgba(31,36,24,0.2)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'relative',
        maxWidth: 460,
      }}
    >
      <Pear size={38} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
      <div style={{ flex: 1 }}>
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 9.5,
            color: '#6E5BA8',
            marginBottom: 4,
            letterSpacing: '0.22em',
          }}
        >
          A NOTE FROM PEAR
        </div>
        <div
          style={{
            fontFamily: '"Caveat", "Fraunces", cursive',
            fontSize: 16,
            fontStyle: 'italic',
            color: PD.ink,
            lineHeight: 1.4,
          }}
        >
          Every plan you make becomes a moment worth remembering.
        </div>
      </div>
      <span style={{ fontSize: 14, color: '#6E5BA8' }}>♡</span>
    </div>
  );
}
