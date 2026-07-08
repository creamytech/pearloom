'use client';

// The pre-launch access wall. Everything except the marketing
// landing page redirects here until the shared preview word is
// entered. On-brand: warm paper, letterpress Fraunces, a two-strand
// thread, "Threading…" not "Loading…". See src/lib/site-gate.ts.

import { useState } from 'react';

// Only accept same-origin, single-slash relative paths as the
// post-unlock destination (no open redirects).
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard';
  return raw;
}

export default function GatePage() {
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'checking' || !password) return;
    setState('checking');
    setError('');
    try {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Read the post-unlock destination at submit time (avoids a
        // setState-in-effect) and do a full navigation so the proxy
        // sees the fresh cookie.
        let next = '/dashboard';
        try {
          next = safeNext(new URLSearchParams(window.location.search).get('next'));
        } catch {
          /* keep default */
        }
        window.location.assign(next);
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "That word isn't right.");
      setState('error');
    } catch {
      setError('Something slipped. Try again.');
      setState('error');
    }
  }

  return (
    <main
      id="pl-main"
      className="pl-grain"
      style={{
        position: 'relative',
        flex: 1,
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--pl-cream, #FDFAF0)',
        color: 'var(--pl-ink, #18181B)',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {/* eyebrow */}
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            textTransform: 'uppercase',
            letterSpacing: '0.24em',
            fontSize: 10,
            color: 'var(--pl-muted, #6F6557)',
            marginBottom: 20,
          }}
        >
          Private preview
        </div>

        {/* two-strand thread */}
        <svg
          width="72"
          height="8"
          viewBox="0 0 72 8"
          fill="none"
          aria-hidden="true"
          style={{ display: 'block', margin: '0 auto 28px' }}
        >
          <path d="M0 3 H72" stroke="var(--pl-olive, #5C6B3F)" strokeWidth="1" />
          <path d="M0 5 H72" stroke="var(--pl-gold, #C19A4B)" strokeWidth="1" />
        </svg>

        <h1
          className="pl-letterpress"
          style={{
            fontFamily: 'var(--pl-font-display, Fraunces, serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(2rem, 6vw, 2.9rem)',
            lineHeight: 1.05,
            margin: '0 0 14px',
          }}
        >
          Pearloom is on the loom.
        </h1>

        <p
          style={{
            fontFamily: 'var(--pl-font-body, Geist, system-ui, sans-serif)',
            fontSize: 15,
            lineHeight: 1.5,
            color: 'var(--pl-ink-soft, #4A5642)',
            margin: '0 0 30px',
          }}
        >
          We&rsquo;re still weaving. Enter the word to come inside.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (state === 'error') setState('idle');
            }}
            placeholder="The word"
            autoFocus
            autoComplete="off"
            aria-label="Preview password"
            style={{
              width: '100%',
              padding: '13px 16px',
              fontFamily: 'var(--pl-font-body, Geist, system-ui, sans-serif)',
              fontSize: 15,
              textAlign: 'center',
              color: 'var(--pl-ink, #18181B)',
              background: 'var(--pl-cream-card, #FBF7EE)',
              border: `1px solid ${state === 'error' ? 'var(--pl-plum, #C6563D)' : 'var(--pl-divider, #E2D9C3)'}`,
              borderRadius: 'var(--pl-radius-lg, 0.75rem)',
              outline: 'none',
            }}
          />

          {error ? (
            <div
              role="alert"
              style={{
                fontFamily: 'var(--pl-font-body, Geist, system-ui, sans-serif)',
                fontSize: 13,
                color: 'var(--pl-plum, #C6563D)',
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={state === 'checking' || !password}
            style={{
              width: '100%',
              padding: '13px 16px',
              fontFamily: 'var(--pl-font-body, Geist, system-ui, sans-serif)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--pl-cream, #FDFAF0)',
              background: 'var(--pl-olive, #5C6B3F)',
              border: 'none',
              borderRadius: 'var(--pl-radius-lg, 0.75rem)',
              cursor: state === 'checking' || !password ? 'default' : 'pointer',
              opacity: state === 'checking' || !password ? 0.6 : 1,
              transition: 'opacity var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease)',
            }}
          >
            {state === 'checking' ? 'Checking…' : 'Come in'}
          </button>
        </form>
      </div>
    </main>
  );
}
