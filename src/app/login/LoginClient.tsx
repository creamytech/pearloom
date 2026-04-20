'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/login/LoginClient.tsx
// Editorial sign-in page. Takes over from the stock next-auth
// default so first-time visitors land on something that reads
// Pearloom, not SaaS-template.
// ─────────────────────────────────────────────────────────────

import { use, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail } from 'lucide-react';

const CREAM = 'var(--pl-cream, #F5EFE2)';
const CREAM_CARD = 'var(--pl-cream-card, #FBF7EE)';
const INK = 'var(--pl-ink, #0E0D0B)';
const INK_SOFT = 'var(--pl-ink-soft, #3A332C)';
const MUTED = 'var(--pl-muted, #6F6557)';
const GOLD = 'var(--pl-gold, #B8935A)';
const GOLD_RULE = 'color-mix(in oklab, var(--pl-gold, #B8935A) 35%, transparent)';
const OLIVE = 'var(--pl-olive, #5C6B3F)';
const CRIMSON = 'var(--pl-plum, #7A2D2D)';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_BODY = 'var(--pl-font-body, system-ui, sans-serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

const ERROR_COPY: Record<string, string> = {
  OAuthCallback: 'Google sign-in couldn\u2019t complete. Try once more.',
  OAuthAccountNotLinked:
    'That email is already linked to a different sign-in method. Use the original one.',
  SessionRequired: 'You need to sign in to see that page.',
  AccessDenied: 'Sign-in was declined. Try again or contact support.',
  Default: 'Something went wrong signing in. Please try again.',
};

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

  // Already signed in? Send them on.
  if (status === 'authenticated') {
    router.replace(next);
  }

  const errorMessage = errorKey
    ? ERROR_COPY[errorKey] || ERROR_COPY.Default
    : null;

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
      setEmailError('Doesn\u2019t look like an email address.');
      return;
    }
    setBusy('email');
    try {
      const res = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: next,
      });
      if (res?.error) {
        setEmailError(
          res.error === 'EmailSignin'
            ? 'We couldn\u2019t send the magic link. Try again in a moment.'
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
      style={{
        minHeight: '100vh',
        background: CREAM,
        color: INK,
        fontFamily: FONT_BODY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 5vw, 56px)',
        position: 'relative',
      }}
    >
      {/* Paper grain */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(14,13,11,0.025) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          padding: 'clamp(32px, 5vw, 56px) clamp(24px, 4vw, 40px)',
          background: CREAM_CARD,
          border: `1px solid ${GOLD_RULE}`,
          boxShadow:
            '0 1px 0 rgba(184,147,90,0.18) inset, 0 24px 60px rgba(40,28,12,0.1), 0 6px 18px rgba(40,28,12,0.05)',
          borderRadius: 'var(--pl-radius-xs)',
        }}
      >
        {/* Masthead */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 20,
            fontFamily: FONT_MONO,
            fontSize: '0.62rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: GOLD,
          }}
        >
          <span style={{ width: 18, height: 1, background: GOLD }} />
          Sign in
          <span style={{ width: 18, height: 1, background: GOLD }} />
        </div>

        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(2rem, 5vw, 2.6rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.014em',
            color: INK,
            margin: '0 0 10px',
            textAlign: 'center',
          }}
        >
          Come back home.
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: 'clamp(0.98rem, 2vw, 1.12rem)',
            color: INK_SOFT,
            lineHeight: 1.5,
            margin: '0 0 28px',
          }}
        >
          Your sites, guests, and drafts are waiting.
        </p>

        {errorMessage && (
          <div
            style={{
              marginBottom: 18,
              padding: '10px 14px',
              borderRadius: 'var(--pl-radius-xs)',
              background: 'color-mix(in oklab, var(--pl-plum, #7A2D2D) 10%, transparent)',
              border: `1px solid color-mix(in oklab, var(--pl-plum, #7A2D2D) 32%, transparent)`,
              color: CRIMSON,
              fontSize: '0.88rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        {sent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '22px 18px',
              borderRadius: 'var(--pl-radius-xs)',
              background: 'color-mix(in oklab, var(--pl-olive, #5C6B3F) 10%, transparent)',
              border: `1px solid color-mix(in oklab, var(--pl-olive, #5C6B3F) 30%, transparent)`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.6rem',
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color: OLIVE,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Check your inbox
            </div>
            <p
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1.1rem',
                color: INK,
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              We sent a magic link to <strong style={{ fontStyle: 'normal' }}>{email}</strong>.
              <br />
              Open it on this device to finish signing in.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Google button — Pearshell signature on the primary entry */}
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogle}
              disabled={busy !== null}
              className="pl-pearl-accent"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '14px 18px',
                borderRadius: 'var(--pl-radius-xs)',
                fontFamily: FONT_MONO,
                fontSize: '0.7rem',
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              <GoogleMark />
              {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
            </motion.button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                margin: '24px 0 20px',
              }}
            >
              <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.56rem',
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                or email
              </span>
              <span style={{ flex: 1, height: 1, background: GOLD_RULE }} />
            </div>

            {/* Email magic link */}
            <form onSubmit={handleEmail}>
              <label
                htmlFor="pl-login-email"
                style={{
                  display: 'block',
                  fontFamily: FONT_MONO,
                  fontSize: '0.58rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: MUTED,
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                Magic link
              </label>
              <input
                id="pl-login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yours.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: CREAM,
                  border: `1px solid ${GOLD_RULE}`,
                  borderRadius: 'var(--pl-radius-xs)',
                  color: INK,
                  fontSize: 'max(16px, 0.95rem)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {emailError && (
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: '0.8rem',
                    color: CRIMSON,
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
                  marginTop: 10,
                  padding: '12px 18px',
                  background: 'transparent',
                  color: INK,
                  border: `1px solid ${INK}`,
                  borderRadius: 'var(--pl-radius-xs)',
                  fontFamily: FONT_MONO,
                  fontSize: '0.68rem',
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  cursor: busy || !email.trim() ? 'not-allowed' : 'pointer',
                  opacity: busy || !email.trim() ? 0.5 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Mail size={12} />
                {busy === 'email' ? 'Sending…' : 'Send me a link'}
              </motion.button>
            </form>
          </>
        )}

        {/* Colophon */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: `1px solid ${GOLD_RULE}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: FONT_MONO,
            fontSize: '0.56rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: MUTED,
            gap: 12,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={10} color={GOLD} />
            Made with Pearloom
          </span>
          <Link
            href="/"
            style={{
              color: MUTED,
              textDecoration: 'none',
              borderBottom: `1px solid ${GOLD_RULE}`,
              paddingBottom: 1,
            }}
          >
            ← Back home
          </Link>
        </div>
      </motion.main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden>
      <path
        d="M19.8 10.2c0-.67-.06-1.31-.17-1.93H10v3.87h5.48c-.24 1.23-.95 2.27-2.03 2.97v2.47h3.28c1.92-1.77 3.03-4.38 3.03-7.38z"
        fill="#FAF7F2"
      />
      <path
        d="M10 20c2.74 0 5.04-.91 6.72-2.46l-3.28-2.47c-.9.6-2.06.96-3.44.96-2.64 0-4.88-1.78-5.69-4.18H.92v2.55C2.59 17.6 6.02 20 10 20z"
        fill="#FAF7F2"
      />
      <path
        d="M4.31 11.85A6 6 0 014 10c0-.65.11-1.27.31-1.85V5.6H.92A10.01 10.01 0 000 10c0 1.6.38 3.12 1.06 4.4l3.25-2.55z"
        fill="#FAF7F2"
        opacity="0.8"
      />
      <path
        d="M10 3.96c1.49 0 2.83.51 3.88 1.52l2.91-2.9C15.03.99 12.72 0 10 0 6.02 0 2.59 2.4.92 5.6l3.39 2.55C5.12 5.74 7.36 3.96 10 3.96z"
        fill="#FAF7F2"
      />
    </svg>
  );
}
