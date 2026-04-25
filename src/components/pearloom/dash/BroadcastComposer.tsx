'use client';

/* ========================================================================
   BroadcastComposer — host-side composer that sends a live update to
   every guest currently viewing the published site. Posts to
   /api/sites/live-updates and shows the running history.

   Quick-pick buttons cover the most-common day-of moments so the host
   isn't typing on a tiny phone keyboard while the ceremony's starting.
   ======================================================================== */

import { useEffect, useState } from 'react';

type LiveUpdate = {
  id: string;
  message: string;
  type?: string;
  created_at: string;
};

interface Props {
  subdomain: string;
}

const QUICK_PICKS: Array<{ type: string; message: string }> = [
  { type: 'ceremony', message: 'Ceremony beginning now — please find your seats.' },
  { type: 'cocktail', message: 'Cocktail hour — drinks on the patio, lawn games out back.' },
  { type: 'reception', message: 'Dinner is served. Please head to your tables.' },
  { type: 'misc', message: 'First dance starting now — gather around the floor.' },
  { type: 'misc', message: 'Last call at the bar — last dance coming up.' },
  { type: 'misc', message: 'Send-off in 10 minutes. Sparklers at the entrance.' },
];

export function BroadcastComposer({ subdomain }: Props) {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/sites/live-updates?subdomain=${encodeURIComponent(subdomain)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { updates?: LiveUpdate[] };
      const sorted = (data.updates ?? []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setUpdates(sorted);
    } catch {}
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function send(message: string, type = 'misc') {
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sites/live-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, message: message.trim(), type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Send failed (${res.status})`);
      }
      setDraft('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: 18,
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 16,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink)',
          marginBottom: 8,
        }}
      >
        Live broadcast
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>
        Push a message that appears as a peach banner at the top of every guest's site instantly.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 12 }}>
        {QUICK_PICKS.map((q) => (
          <button
            key={q.message}
            type="button"
            disabled={busy}
            onClick={() => send(q.message, q.type)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--cream-2)',
              cursor: busy ? 'wait' : 'pointer',
              fontSize: 12.5,
              color: 'var(--ink)',
              lineHeight: 1.4,
              transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms',
            }}
            onMouseEnter={(e) => {
              if (busy) return;
              e.currentTarget.style.background = 'var(--peach-bg)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--cream-2)';
              e.currentTarget.style.transform = '';
            }}
          >
            {q.message}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Custom message — keep it short, guests scan in two seconds…"
          rows={2}
          maxLength={200}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--cream-2)',
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          onClick={() => send(draft, 'misc')}
          disabled={busy || !draft.trim()}
          className="btn btn-primary btn-sm"
          style={{ minWidth: 90 }}
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: '#7A2D2D' }}>{error}</div>}

      {updates.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              marginBottom: 6,
            }}
          >
            Recent ({updates.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {updates.slice(0, 10).map((u) => (
              <div
                key={u.id}
                style={{
                  fontSize: 12.5,
                  color: 'var(--ink-soft)',
                  padding: '6px 10px',
                  background: 'var(--cream-2)',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span>{u.message}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)', flexShrink: 0 }}>
                  {new Date(u.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
