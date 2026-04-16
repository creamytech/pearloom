'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/RelationshipGraphPanel.tsx
//
// Editor panel for the relationship graph. Lets the host:
//   - run Claude-powered inference against their chapters + guests
//   - review proposed edges
//   - save / edit / delete edges
//
// Used by the seating optimizer, personalization writer, and
// Post-Event Film to generate specific toasts per person.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

interface Edge {
  id?: string;
  from_guest_id: string | null;
  to_guest_id: string | null;
  kind: string;
  closeness: number | null;
  story: string | null;
}

interface InferredEdge {
  fromName: string;
  toName: string;
  fromGuestId: string | null;
  toGuestId: string | null;
  kind: string;
  closeness: number;
  story: string;
}

export function RelationshipGraphPanel({ siteId }: { siteId: string }) {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [proposed, setProposed] = useState<InferredEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [inferring, setInferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestMap, setGuestMap] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const [edgesRes, guestsRes] = await Promise.all([
        fetch(`/api/relationships?siteId=${siteId}`),
        fetch(`/api/guests?siteId=${siteId}`),
      ]);
      const edgesData = await edgesRes.json();
      if (edgesData.edges) setEdges(edgesData.edges);
      if (guestsRes.ok) {
        const guestsData = await guestsRes.json();
        const map: Record<string, string> = {};
        for (const g of guestsData.guests ?? []) map[g.id] = g.display_name;
        setGuestMap(map);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const infer = async () => {
    setInferring(true);
    setError(null);
    try {
      const r = await fetch('/api/relationships/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || 'Inference failed');
      } else {
        setProposed(data.edges ?? []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setInferring(false);
    }
  };

  const acceptProposed = async (e: InferredEdge) => {
    if (!e.fromGuestId || !e.toGuestId) {
      setError('Match this proposal to known guests before saving.');
      return;
    }
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          from_guest_id: e.fromGuestId,
          to_guest_id: e.toGuestId,
          kind: e.kind,
          closeness: e.closeness,
          story: e.story,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Couldn't save edge (${res.status}).`);
        return;
      }
      setError(null);
      setProposed((list) => list.filter((x) => x !== e));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error saving edge.');
    }
  };

  const labelFor = (id: string | null) => (id && guestMap[id]) || id || '?';

  return (
    <div style={{ padding: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.25rem' }}>
          Relationship graph
        </h3>
        <button
          type="button"
          onClick={() => void infer()}
          disabled={inferring}
          style={{
            padding: '0.5rem 1rem',
            background: '#A3B18A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: inferring ? 0.6 : 1,
          }}
        >
          {inferring ? 'Thinking…' : 'Infer from story'}
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', opacity: 0.75, lineHeight: 1.5, marginBottom: '1rem' }}>
        Your guests&apos; relationships power seat assignments, personalization, and the post-event film.
        Let Claude read your chapters + guest list and propose the graph — review before saving.
      </p>

      {error && (
        <div style={{ padding: '0.75rem', background: '#FFF0F0', color: '#B94A4A', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {proposed.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: '0.5rem' }}>
            Proposed ({proposed.length})
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {proposed.map((e, i) => (
              <li
                key={i}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#FAFAF5',
                  borderRadius: '0.5rem',
                  border: '1px dashed #C6C0B3',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {e.fromName} <span style={{ opacity: 0.5 }}>↔</span> {e.toName}
                  <span style={{ fontSize: '0.75rem', opacity: 0.55, marginLeft: '0.5rem' }}>
                    {e.kind} · closeness {e.closeness}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5 }}>{e.story}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => void acceptProposed(e)}
                    disabled={!e.fromGuestId || !e.toGuestId}
                    style={{
                      padding: '0.35rem 0.9rem',
                      fontSize: '0.8rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: '#2B2B2B',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setProposed((list) => list.filter((x) => x !== e))}
                    style={{
                      padding: '0.35rem 0.9rem',
                      fontSize: '0.8rem',
                      borderRadius: '999px',
                      border: '1px solid #C6C0B3',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: '0.5rem' }}>
        Saved ({edges.length})
      </div>
      {loading ? (
        <div style={{ opacity: 0.6 }}>Loading…</div>
      ) : edges.length === 0 ? (
        <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>
          No edges yet. Click &quot;Infer from story&quot; to get started.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {edges.map((e) => (
            <li
              key={e.id}
              style={{
                padding: '0.75rem 1rem',
                background: '#FFFFFF',
                borderRadius: '0.5rem',
                border: '1px solid #EEE8DC',
                fontSize: '0.9rem',
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {labelFor(e.from_guest_id)} <span style={{ opacity: 0.5 }}>↔</span> {labelFor(e.to_guest_id)}
                <span style={{ fontSize: '0.75rem', opacity: 0.55, marginLeft: '0.5rem' }}>
                  {e.kind}{e.closeness ? ` · closeness ${e.closeness}` : ''}
                </span>
              </div>
              {e.story && (
                <div style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5, marginTop: '0.25rem' }}>
                  {e.story}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
