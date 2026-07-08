'use client';

// ─────────────────────────────────────────────────────────────
// ManualAuthPages — the email + password flows, on letterhead.
//
//   <SignupClient />  — /signup. Name, email, password → POST
//     /api/auth/register → signIn('credentials') → /welcome
//     (the onboarding flow takes it from there).
//   <ForgotClient />  — /forgot. Email → POST /api/auth/forgot.
//     Always shows the check-your-inbox card (the endpoint never
//     confirms which emails have accounts).
//   <ResetClient />   — /reset/[token]. New password → POST
//     /api/auth/reset → on to /login.
//
// Visual language mirrors SigninV8's left column: cream paper,
// Fraunces display + italic turn, pill inputs with leading
// icons, pearl-accent primary.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PearloomMark } from '@/components/brand/PearloomMark';
import { PearloomWordmark, Atmosphere, Icon, Pear, Sparkle } from '@/components/pearloom/motifs';
import { Reveal } from '@/components/pearloom/motion';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';

const inputWrap: CSSProperties = { position: 'relative', marginBottom: 16 };
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px 12px 42px',
  background: 'var(--card)',
  border: '1.5px solid var(--line)',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  color: 'var(--ink)',
  fontFamily: 'inherit',
};
const labelStyle: CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6,
};

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <Atmosphere preset="sparse" />
      <div style={{ position: 'absolute', top: 40, left: 'clamp(20px, 5vw, 56px)', zIndex: 10 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'var(--ink)' }}>
          <PearloomMark size={34} animated />
          <PearloomWordmark size={22} />
        </Link>
      </div>
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          minHeight: '100vh',
          padding: '120px clamp(20px, 5vw, 32px) 60px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Reveal y={18}>{children}</Reveal>
      </div>
    </div>
  );
}

function Heading({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <>
      <Sparkle size={16} style={{ marginBottom: 8 }} />
      <h1 className="display" style={{ fontSize: 'clamp(38px, 7vw, 52px)', margin: '4px 0 0', lineHeight: 0.98, fontWeight: 600, letterSpacing: '-0.02em' }}>
        {line1}
      </h1>
      <h1 className="display-italic" style={{ fontSize: 'clamp(38px, 7vw, 52px)', margin: '0 0 14px', lineHeight: 0.98, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.02em' }}>
        {line2}
      </h1>
    </>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        marginBottom: 16, padding: '12px 16px', borderRadius: 12,
        background: 'var(--pl-warning-mist, rgba(161,74,44,0.10))',
        border: '1px solid var(--pl-warning, #A14A2C)',
        color: 'var(--pl-warning, #A14A2C)', fontSize: 13.5,
      }}
    >
      {children}
    </div>
  );
}

function PasswordField({
  id, value, onChange, label, autoComplete, placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <div style={inputWrap}>
        <Icon name="lock" size={16} style={{ position: 'absolute', left: 16, top: 14 }} color="var(--ink-muted)" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: 12, top: 10, padding: 4, background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}
        >
          <Icon name={show ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
    </>
  );
}

/* ── /signup ─────────────────────────────────────────────────── */

/** Read a `?next=` deep link, but only honour a same-origin absolute
 *  path (starts with a single `/`, never `//host`) so it can't become
 *  an open-redirect. Read at redirect time from window.location so the
 *  component needs no useSearchParams Suspense boundary. Forwarded
 *  THROUGH /welcome so onboarding (terms) is never skipped — e.g. a
 *  logged-out wizard finisher returns to /wizard/new with their
 *  answers restored (WizardV8's 401 catch). */
function welcomeHref(): string {
  if (typeof window === 'undefined') return '/welcome';
  const n = new URLSearchParams(window.location.search).get('next');
  return n && /^\/(?!\/)/.test(n) ? `/welcome?next=${encodeURIComponent(n)}` : '/welcome';
}

/* ── The claim card (PERSONA-PLAN S3, law 3: never drop the thing
   they just made). A host who pressed "Weave my site" signed out
   lands here — the wizard stashes a small claim payload
   (pl-wizard-claim) and this card carries their pressed site
   through the account gate: name, date, palette, and one sentence
   that says it's safe. The wizard clears the stash on a
   successful press. ── */
interface WizardClaim {
  eyebrow?: string;
  title?: string;
  date?: string;
  location?: string;
  colors?: string[];
  ts?: number;
}

function useWizardClaim(): (WizardClaim & { dateLabel?: string }) | null {
  const [claim, setClaim] = useState<(WizardClaim & { dateLabel?: string }) | null>(null);
  useEffect(() => {
    // Deferred a tick — the compiler lint (rightly) bans synchronous
    // setState in effects, and localStorage is client-only anyway.
    const t = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('pl-wizard-claim');
        if (!raw) return;
        const c = JSON.parse(raw) as WizardClaim;
        if (!c || typeof c !== 'object') return;
        // A week-old stash is a different visit — don't resurrect it.
        if (typeof c.ts === 'number' && Date.now() - c.ts > 7 * 24 * 3600_000) return;
        let dateLabel: string | undefined;
        if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) {
          const [y, m, d] = c.date.split('-').map(Number);
          dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          });
        }
        setClaim({ ...c, dateLabel });
      } catch { /* a malformed stash is just no card */ }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  return claim;
}

function WizardClaimCard({ claim }: { claim: WizardClaim & { dateLabel?: string } }) {
  const meta = [claim.dateLabel, claim.location].filter(Boolean).join(' · ');
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 16,
        background: 'var(--card)',
        padding: '20px 22px',
        marginBottom: 24,
        boxShadow: '0 18px 40px -30px rgba(60,50,20,0.35)',
      }}
    >
      {claim.eyebrow ? (
        <div
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 9.5,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-muted)',
            marginBottom: 8,
          }}
        >
          {claim.eyebrow}
        </div>
      ) : null}
      {claim.title ? (
        <div className="display" style={{ fontSize: 26, lineHeight: 1.1, color: 'var(--ink)' }}>
          {claim.title}
        </div>
      ) : null}
      {meta ? (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>{meta}</div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        {(claim.colors ?? []).slice(0, 4).map((c, i) => (
          <span key={i} style={{ width: 13, height: 13, borderRadius: 999, background: c, border: '1px solid var(--line-soft, var(--line))' }} />
        ))}
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
          Pressed and saved — it will be here the moment you're in.
        </span>
      </div>
    </div>
  );
}

export function SignupClient() {
  const router = useRouter();
  const claim = useWizardClaim();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That doesn’t look like an email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters — a few words you'll remember beat a short scramble.`);
      return;
    }
    setBusy('email');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not create the account. Try again?');
        return;
      }
      const signedIn = await signIn('credentials', { email: email.trim(), password, redirect: false });
      if (signedIn?.error) {
        // Account exists — but the fresh sign-in tripped. Send them
        // to /login rather than stranding them here.
        router.replace('/login');
        return;
      }
      router.replace(welcomeHref());
    } catch {
      setError('Something went wrong. Try again?');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthShell>
      {claim ? (
        <>
          <Heading line1="Claim your" line2="pressing." />
          <WizardClaimCard claim={claim} />
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 26 }}>
            An account keeps it — the moment you're in, the press finishes on its own.
          </p>
        </>
      ) : (
        <>
          <Heading line1="Begin your" line2="own thread." />
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 26 }}>
            An account keeps your sites, guests, and keepsakes in one place — no Google required.
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => { setBusy('google'); void signIn('google', { callbackUrl: welcomeHref() }); }}
        disabled={busy !== null}
        style={{
          width: '100%', padding: '14px 18px',
          background: 'var(--card)', border: '1.5px solid var(--line)', borderRadius: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontWeight: 600, fontSize: 14, color: 'var(--ink)',
          cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
        }}
      >
        {busy === 'google' ? 'Opening Google…' : 'Continue with Google instead'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0', color: 'var(--ink-muted)', fontSize: 13 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        or with email
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <form onSubmit={submit}>
        <label htmlFor="su-name" style={labelStyle}>
          Name <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional)</span>
        </label>
        <div style={inputWrap}>
          <Icon name="user" size={16} style={{ position: 'absolute', left: 16, top: 14 }} color="var(--ink-muted)" />
          <input id="su-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Alex" style={inputStyle} />
        </div>

        <label htmlFor="su-email" style={labelStyle}>Email address</label>
        <div style={inputWrap}>
          <Icon name="mail" size={16} style={{ position: 'absolute', left: 16, top: 14 }} color="var(--ink-muted)" />
          <input id="su-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
        </div>

        <PasswordField
          id="su-password"
          value={password}
          onChange={setPassword}
          label="Password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        />

        <button
          type="submit"
          disabled={busy !== null || !email.trim() || !password}
          className="btn btn-primary btn-lg pl-pearl-accent"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8, opacity: !email.trim() || !password ? 0.55 : 1 }}
        >
          {busy === 'email' ? 'Threading…' : 'Create my account'}
          <Pear size={14} tone="cream" shadow={false} />
        </button>
      </form>

      <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 14, lineHeight: 1.55 }}>
        You’ll review and agree to the Terms of Service and Privacy Policy on the next step,
        before anything is created.
      </p>

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-soft)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--pl-olive, #5C6B3F)', fontWeight: 500 }}>Sign in</Link>
      </div>
    </AuthShell>
  );
}

/* ── /forgot ─────────────────────────────────────────────────── */

export function ForgotClient() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That doesn’t look like an email address.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Too many attempts — try again shortly.');
        return;
      }
      setSent(true);
    } catch {
      setError('Something went wrong. Try again?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Heading line1="Lost the" line2="thread?" />
      <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 26 }}>
        Tell us your email — if it has a Pearloom account, a one-hour reset link is on its way.
      </p>

      {sent ? (
        <div style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--sage-tint)', border: '1px solid rgba(107,122,58,0.25)' }}>
          <div className="eyebrow" style={{ color: 'var(--sage-deep)', marginBottom: 6 }}>Check your inbox</div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            If <strong>{email}</strong> has an account, the reset link is on its way. It works once and expires in an hour.
          </p>
        </div>
      ) : (
        <>
          {error && <ErrorNote>{error}</ErrorNote>}
          <form onSubmit={submit}>
            <label htmlFor="fp-email" style={labelStyle}>Email address</label>
            <div style={inputWrap}>
              <Icon name="mail" size={16} style={{ position: 'absolute', left: 16, top: 14 }} color="var(--ink-muted)" />
              <input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="btn btn-primary btn-lg pl-pearl-accent"
              style={{ width: '100%', justifyContent: 'center', opacity: !email.trim() ? 0.55 : 1 }}
            >
              {busy ? 'Threading…' : 'Send the reset link'}
            </button>
          </form>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-soft)' }}>
        Remembered after all?{' '}
        <Link href="/login" style={{ color: 'var(--pl-olive, #5C6B3F)', fontWeight: 500 }}>Sign in</Link>
      </div>
    </AuthShell>
  );
}

/* ── /reset/[token] ──────────────────────────────────────────── */

export function ResetClient({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not save the new password. Try again?');
        return;
      }
      setDone(true);
      setTimeout(() => router.replace('/login'), 1800);
    } catch {
      setError('Something went wrong. Try again?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Heading line1="Set a new" line2="password." />
      {done ? (
        <div style={{ padding: '18px 16px', borderRadius: 14, background: 'var(--sage-tint)', border: '1px solid rgba(107,122,58,0.25)' }}>
          <div className="eyebrow" style={{ color: 'var(--sage-deep)', marginBottom: 6 }}>All set</div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            Your password is saved — taking you to sign in.
          </p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 26 }}>
            Pick something with a little length to it — a few words you’ll remember.
          </p>
          {error && <ErrorNote>{error}</ErrorNote>}
          <form onSubmit={submit}>
            <PasswordField
              id="rs-password"
              value={password}
              onChange={setPassword}
              label="New password"
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
            <button
              type="submit"
              disabled={busy || !password}
              className="btn btn-primary btn-lg pl-pearl-accent"
              style={{ width: '100%', justifyContent: 'center', opacity: !password ? 0.55 : 1 }}
            >
              {busy ? 'Threading…' : 'Save & sign in'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
