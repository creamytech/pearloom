'use client';

// ─────────────────────────────────────────────────────────────
// WalletPassCard — "keep this in your phone".
//
// The passport already holds everything a guest needs; what it
// can't do is survive the walk from the car park with no signal,
// or surface itself on a lock screen at the right moment. A wallet
// pass does both, which is why it earns a card here rather than a
// settings toggle.
//
// It asks the server what's actually available before offering
// anything. Apple needs a Pass Type ID certificate and Google a
// service-account key; a deployment may have neither, one, or
// both. An unconfigured platform renders NOTHING — a dead "Add to
// Apple Wallet" button teaches a guest the product is broken, and
// they'd be right.
//
// Solemn occasions get plainer language: a memorial pass is a way
// to keep the details close, never a ticket to an event.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface Props {
  token: string;
  /** Memorial / funeral voice. */
  solemn?: boolean;
}

interface Availability { apple: boolean; google: boolean }

export function WalletPassCard({ token, solemn = false }: Props) {
  const [avail, setAvail] = useState<Availability | null>(null);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/wallet/${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { apple?: boolean; google?: boolean };
        if (alive) setAvail({ apple: Boolean(json.apple), google: Boolean(json.google) });
      } catch {
        /* Offer nothing rather than a button that can't work. */
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // Nothing configured — the card doesn't exist. No teaser, no
  // "coming soon": a guest shouldn't be shown a door that isn't there.
  if (!avail || (!avail.apple && !avail.google)) return null;

  async function addToGoogle() {
    setBusy('google');
    setError(null);
    try {
      const res = await fetch(`/api/wallet/${encodeURIComponent(token)}?platform=google`);
      const json = (await res.json()) as { saveUrl?: string; error?: string };
      if (json.saveUrl) window.location.href = json.saveUrl;
      else setError(json.error || 'That didn’t work. Try again in a moment.');
    } catch {
      setError('That didn’t work. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      style={{
        border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
        borderRadius: 16,
        padding: 20,
        background: 'var(--card, #FBF7EE)',
      }}
    >
      <h2 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 20, margin: '0 0 6px' }}>
        {solemn ? 'Keep the details with you' : 'Keep it in your phone'}
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 14px' }}>
        {solemn
          ? 'The time and place, saved to your phone — there when you need it, without hunting for an email.'
          : 'The date, the place and what to wear, saved to your phone. It’s there on the day even if the signal isn’t.'}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {avail.apple && (
          <a
            href={`/api/wallet/${encodeURIComponent(token)}?platform=apple`}
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none' }}
          >
            Add to Apple Wallet
          </a>
        )}
        {avail.google && (
          <button
            type="button"
            onClick={addToGoogle}
            disabled={busy === 'google'}
            className="btn btn-outline btn-sm"
          >
            {busy === 'google' ? 'One moment…' : 'Save to Google Wallet'}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--pl-plum, #7A2D2D)' }}>
          {error}
        </p>
      )}
    </section>
  );
}

export default WalletPassCard;
