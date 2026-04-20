'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/ToastClaimsList.tsx
// Host-only view of toast slot claims across every toastSignup
// block on a site. Void button deletes a claim so the slot
// reopens for another guest.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Mic, X } from 'lucide-react';

interface Claim {
  id: string;
  blockId: string;
  slotIndex: number;
  claimedBy: string;
  at: string;
}

interface Props {
  siteId: string;
}

export function ToastClaimsList({ siteId }: Props) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/event-os/toasts/moderation?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setClaims((data.claims ?? []) as Claim[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load claims.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const voidClaim = async (id: string) => {
    if (!confirm('Void this claim? The slot will reopen.')) return;
    setPendingId(id);
    setError(null);
    const prev = claims;
    setClaims((rows) => rows.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/event-os/toasts/moderation?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
    } catch (err) {
      setClaims(prev);
      setError(err instanceof Error ? err.message : 'Could not void claim.');
    } finally {
      setPendingId(null);
    }
  };

  // Group by block
  const byBlock = claims.reduce<Record<string, Claim[]>>((acc, c) => {
    if (!acc[c.blockId]) acc[c.blockId] = [];
    acc[c.blockId].push(c);
    return acc;
  }, {});
  const blockIds = Object.keys(byBlock);

  return (
    <section style={{ marginTop: 48 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <div>
          <div className="pl-overline" style={{ color: 'var(--pl-olive)', marginBottom: 6 }}>
            Toast signups
          </div>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontStyle: 'italic',
              fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
              color: 'var(--pl-ink)',
            }}
          >
            Who\u2019s speaking
          </h2>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={loading}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--pl-radius-full)',
            border: '1px solid var(--pl-divider)',
            background: 'var(--pl-cream-card)',
            color: 'var(--pl-ink)',
            fontSize: '0.78rem',
            cursor: loading ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : undefined} />
          Refresh
        </button>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-sm)',
            background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
            color: 'var(--pl-plum)',
            fontSize: '0.86rem',
          }}
        >
          {error}
        </div>
      )}

      {blockIds.length === 0 && !loading ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--pl-muted)',
            fontStyle: 'italic',
            border: '1px dashed var(--pl-divider)',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'var(--pl-cream-card)',
          }}
        >
          No toast slots claimed yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blockIds.map((blockId) => (
            <article
              key={blockId}
              style={{
                padding: '16px 18px',
                borderRadius: 'var(--pl-radius-lg)',
                background: 'var(--pl-cream-card)',
                border: '1px solid var(--pl-divider)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-olive)',
                  marginBottom: 12,
                }}
              >
                {blockId}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byBlock[blockId]
                  .slice()
                  .sort((a, b) => a.slotIndex - b.slotIndex)
                  .map((claim) => (
                    <li
                      key={claim.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: 'var(--pl-radius-sm)',
                        background: 'color-mix(in oklab, var(--pl-olive) 6%, transparent)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--pl-font-mono)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.18em',
                          color: 'var(--pl-olive)',
                        }}
                      >
                        #{String(claim.slotIndex + 1).padStart(2, '0')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pl-ink)', fontSize: '0.92rem' }}>
                        <Mic size={11} color="var(--pl-muted)" />
                        {claim.claimedBy}
                      </span>
                      <button
                        onClick={() => { void voidClaim(claim.id); }}
                        disabled={pendingId === claim.id}
                        title="Void this claim so the slot reopens"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--pl-radius-sm)',
                          border: '1px solid var(--pl-divider)',
                          background: 'transparent',
                          color: 'var(--pl-plum)',
                          fontSize: '0.72rem',
                          cursor: pendingId === claim.id ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <X size={11} />
                        Void
                      </button>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
