'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/VoiceToastsPanel.tsx
//
// Host-side review for guest voice toasts. Lists pending +
// approved recordings, lets the host play each, mark as highlight,
// and approve/reject. Approved toasts feed the post-event film.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

interface Toast {
  id: string;
  guest_display_name: string | null;
  audio_url: string;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_cleaned: string | null;
  moderation_status: 'pending' | 'approved' | 'rejected' | string;
  is_highlight: boolean;
  created_at: string;
}

type Tab = 'pending' | 'approved' | 'rejected';

export function VoiceToastsPanel({ siteId }: { siteId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/toasts?siteId=${siteId}`);
      const data = await r.json();
      if (!r.ok) setError(data.error ?? 'Failed to load');
      else setToasts(data.toasts ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (siteId) void load();
  }, [load, siteId]);

  const moderate = async (toastId: string, status: Tab, isHighlight?: boolean) => {
    await fetch('/api/toasts/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toastId, status, isHighlight }),
    });
    await load();
  };

  const filtered = toasts.filter((t) => t.moderation_status === tab);
  const counts: Record<Tab, number> = {
    pending: toasts.filter((t) => t.moderation_status === 'pending').length,
    approved: toasts.filter((t) => t.moderation_status === 'approved').length,
    rejected: toasts.filter((t) => t.moderation_status === 'rejected').length,
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.25rem' }}>Voice toasts</h3>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '0.4rem 0.9rem',
                fontSize: '0.8rem',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                background: tab === t ? '#2B2B2B' : '#F0EBE0',
                color: tab === t ? '#FFFFFF' : '#3D3530',
                textTransform: 'capitalize',
              }}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', color: '#B94A4A', fontSize: '0.85rem' }}>{error}</div>
      )}

      {loading && <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Loading…</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>No {tab} toasts yet.</div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((t) => (
          <li
            key={t.id}
            style={{
              padding: '1rem 1.25rem',
              background: '#FFFFFF',
              border: '1px solid #EEE8DC',
              borderRadius: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>{t.guest_display_name ?? 'Anonymous'}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>
                {new Date(t.created_at).toLocaleString()}
                {t.duration_seconds ? ` · ${t.duration_seconds}s` : ''}
              </div>
            </div>

            <audio controls src={t.audio_url} style={{ width: '100%', marginBottom: '0.5rem' }} />

            {t.transcript_cleaned || t.transcript ? (
              <p style={{ fontSize: '0.88rem', lineHeight: 1.5, margin: '0.5rem 0', opacity: 0.9 }}>
                {t.transcript_cleaned || t.transcript}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {tab !== 'approved' && (
                <button
                  type="button"
                  onClick={() => moderate(t.id, 'approved')}
                  style={btn('#A3B18A', '#FFFFFF')}
                >
                  Approve
                </button>
              )}
              {tab !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => moderate(t.id, 'rejected')}
                  style={btn('#FFF0F0', '#B94A4A')}
                >
                  Reject
                </button>
              )}
              {tab === 'approved' && (
                <button
                  type="button"
                  onClick={() => moderate(t.id, 'approved', !t.is_highlight)}
                  style={btn(t.is_highlight ? '#C4A96A' : '#F0EBE0', t.is_highlight ? '#FFFFFF' : '#3D3530')}
                >
                  {t.is_highlight ? '★ Highlight' : '☆ Mark as highlight'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function btn(bg: string, color: string): React.CSSProperties {
  return {
    padding: '0.4rem 1rem',
    fontSize: '0.8rem',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    background: bg,
    color,
    fontWeight: 600,
  };
}
