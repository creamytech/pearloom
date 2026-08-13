'use client';

// ─────────────────────────────────────────────────────────────
// GuestbookSection — the published site's guestbook: guests leave
// a wish, everyone reads the wall. Posts to /api/guestbook (which
// resolves the slug → site uuid, tags the entry to the guest's
// pearloom_guests row when a ?g= token is present, and pings the
// host). Themed entirely with the site's --t-* vars so it wears
// the couple's look. Mounted by ThemedSite before the footer when
// manifest.features.guestbook is on.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

interface Wish {
  id: string;
  guestName: string;
  message: string;
  createdAt?: string;
  highlighted?: boolean;
}

interface Props {
  /** Subdomain — /api/guestbook resolves it to the site uuid. */
  siteSlug?: string;
  /** Editor canvas has no live slug; show a non-posting preview. */
  preview?: boolean;
  eyebrow?: string;
  title?: string;
}

export function GuestbookSection({ siteSlug, preview = false, eyebrow = 'Guestbook', title = 'Leave a wish' }: Props) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteSlug) return;
    try {
      const r = await fetch(`/api/guestbook?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as { wishes?: Wish[] };
      setWishes(d.wishes ?? []);
    } catch { /* wall stays as-is */ }
  }, [siteSlug]);

  useEffect(() => {
    const t = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const submit = async () => {
    if (state === 'sending' || !name.trim() || message.trim().length < 2 || !siteSlug) return;
    setState('sending');
    setError(null);
    try {
      let guestToken: string | undefined;
      try {
        const sp = new URLSearchParams(window.location.search);
        guestToken = sp.get('g') || sp.get('guest') || undefined;
      } catch { /* no token */ }
      const r = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: siteSlug, guestName: name.trim(), message: message.trim(), guestToken }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? 'Could not save your wish.');
      }
      setMessage('');
      setState('sent');
      await refresh();
      setTimeout(() => setState('idle'), 2600);
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : 'Could not save your wish.');
    }
  };

  const disabled = preview || !siteSlug;

  return (
    <div style={{ background: 'var(--t-paper)', padding: '56px clamp(16px, 4vw, 32px)' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontFamily: 'var(--t-script, "Caveat", cursive)',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--t-accent)', marginBottom: 6,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: 'var(--t-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic', fontWeight: 500,
              fontSize: 'clamp(26px, 5vw, 40px)', color: 'var(--t-ink)', lineHeight: 1.1,
            }}
          >
            {title}
          </div>
        </div>

        {/* Sign form */}
        <div
          style={{
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 16px)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
            disabled={disabled}
            style={gbInput}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share a wish, a memory, a few warm words…"
            rows={3}
            maxLength={500}
            disabled={disabled}
            style={{ ...gbInput, resize: 'vertical', lineHeight: 1.5 }}
          />
          {error && <div style={{ fontSize: 12.5, color: 'var(--t-accent)' }}>{error}</div>}
          <button
            type="button"
            onClick={submit}
            disabled={disabled || state === 'sending' || !name.trim() || message.trim().length < 2}
            style={{
              alignSelf: 'flex-end',
              padding: '10px 20px',
              borderRadius: 999,
              background: 'var(--t-rsvp, var(--t-accent))',
              color: 'var(--t-rsvp-ink, var(--t-paper))',
              border: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: disabled || state === 'sending' ? 'default' : 'pointer',
              opacity: disabled || state === 'sending' || !name.trim() || message.trim().length < 2 ? 0.55 : 1,
              fontFamily: 'inherit',
            }}
          >
            {preview ? 'Live on your site' : state === 'sending' ? 'Signing…' : state === 'sent' ? 'Added ✓' : 'Sign the guestbook'}
          </button>
        </div>

        {/* The wall */}
        {wishes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {wishes.map((w) => (
              <div
                key={w.id}
                style={{
                  background: 'var(--t-section)',
                  border: `1px solid ${w.highlighted ? 'var(--t-gold, var(--t-accent))' : 'var(--t-line)'}`,
                  borderRadius: 'var(--t-radius, 12px)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 14.5, color: 'var(--t-ink)', lineHeight: 1.55, fontStyle: 'italic' }}>
                  “{w.message}”
                </div>
                <div style={{ fontSize: 12, color: 'var(--t-ink-muted, var(--t-ink-soft))', marginTop: 8, fontWeight: 600 }}>
                  , {w.guestName}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const gbInput: React.CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 'var(--t-radius, 10px)',
  border: '1px solid var(--t-line)',
  background: 'var(--t-paper)',
  color: 'var(--t-ink)',
  fontSize: 'max(16px, 0.95rem)',
  fontFamily: 'var(--t-body, inherit)',
  outline: 'none',
  boxSizing: 'border-box',
};

export default GuestbookSection;
