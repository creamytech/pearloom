'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/RelationshipGraphPanel.tsx
//
// Editor panel for the relationship graph — Claude infers edges
// from chapters + guest list, host reviews & saves them. Powers
// seating, personalization, and the post-event film. Rendered in
// the editorial chrome: Fraunces italic names, mono meta, gold
// hairlines, cream surfaces.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Check, X, Loader2, Users, AlertTriangle } from 'lucide-react';
import {
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

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

const eyebrowStyle: React.CSSProperties = {
  fontFamily: panelFont.mono,
  fontSize: panelText.meta,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.widest,
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-faint)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const pillMono: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: panelFont.mono,
  fontSize: panelText.meta,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.widest,
  textTransform: 'uppercase',
  transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
  lineHeight: 1,
};

function ClosenessMeter({ value }: { value: number }) {
  const dots = 5;
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: dots }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background:
              i < value
                ? 'var(--pl-chrome-accent)'
                : 'color-mix(in srgb, var(--pl-chrome-accent) 18%, transparent)',
            transition: 'background 0.18s ease',
          }}
        />
      ))}
    </span>
  );
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
    <div style={{ padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '14px 16px',
          borderRadius: '10px',
          background:
            'color-mix(in srgb, var(--pl-chrome-accent) 4%, var(--pl-chrome-surface))',
          border: '1px solid var(--pl-chrome-border)',
          boxShadow: 'var(--pl-chrome-shadow)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={eyebrowStyle}>
              <Users size={11} strokeWidth={1.75} color="var(--pl-chrome-accent)" />
              Graph
            </span>
            <h3
              style={{
                margin: 0,
                fontFamily: panelFont.display,
                fontStyle: 'italic',
                fontSize: panelText.sectionTitle,
                fontWeight: panelWeight.regular,
                letterSpacing: '-0.01em',
                color: 'var(--pl-chrome-text)',
                lineHeight: panelLineHeight.tight,
              }}
            >
              Relationships
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void infer()}
            disabled={inferring}
            style={{
              ...pillMono,
              padding: '8px 14px',
              borderRadius: '99px',
              background: 'var(--pl-chrome-accent)',
              color: 'var(--pl-chrome-accent-ink)',
              border: '1px solid var(--pl-chrome-accent)',
              cursor: inferring ? 'not-allowed' : 'pointer',
              opacity: inferring ? 0.6 : 1,
            }}
          >
            {inferring ? (
              <Loader2 size={11} strokeWidth={2} style={{ animation: 'pl-rel-spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={11} strokeWidth={1.75} />
            )}
            {inferring ? 'Reading' : 'Infer from story'}
          </button>
        </div>
        {/* gold hairline */}
        <div
          style={{
            height: '1px',
            margin: '8px 0 2px',
            background: 'color-mix(in srgb, var(--pl-chrome-accent) 26%, transparent)',
          }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: panelFont.body,
            fontSize: panelText.hint,
            fontStyle: 'italic',
            color: 'var(--pl-chrome-text-muted)',
            lineHeight: panelLineHeight.normal,
          }}
        >
          Power seating, personalization, and the post-event film. Claude reads your
          chapters and guest list, then proposes edges for your review.
        </p>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'color-mix(in srgb, var(--pl-chrome-danger) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--pl-chrome-danger) 28%, transparent)',
            color: 'var(--pl-chrome-danger)',
            fontFamily: panelFont.body,
            fontSize: panelText.hint,
            lineHeight: panelLineHeight.snug,
          }}
        >
          <AlertTriangle size={13} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{error}</span>
        </div>
      )}

      {proposed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={eyebrowStyle}>Proposed</span>
            <span
              style={{
                fontFamily: panelFont.mono,
                fontSize: panelText.meta,
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.wider,
                color: 'var(--pl-chrome-accent)',
                padding: '3px 9px',
                borderRadius: '99px',
                background: 'var(--pl-chrome-accent-soft)',
              }}
            >
              {String(proposed.length).padStart(2, '0')}
            </span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {proposed.map((e, i) => {
              const missingMatch = !e.fromGuestId || !e.toGuestId;
              return (
                <li
                  key={i}
                  style={{
                    padding: '12px 14px',
                    background:
                      'color-mix(in srgb, var(--pl-chrome-accent) 3%, var(--pl-chrome-surface))',
                    borderRadius: '10px',
                    border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 32%, transparent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          fontFamily: panelFont.display,
                          fontStyle: 'italic',
                          fontSize: panelText.itemTitle,
                          fontWeight: panelWeight.regular,
                          color: 'var(--pl-chrome-text)',
                          letterSpacing: '-0.01em',
                          lineHeight: panelLineHeight.tight,
                        }}
                      >
                        {e.fromName}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          color: 'var(--pl-chrome-accent)',
                          fontFamily: panelFont.mono,
                          fontSize: panelText.hint,
                        }}
                      >
                        ↔
                      </span>
                      <span
                        style={{
                          fontFamily: panelFont.display,
                          fontStyle: 'italic',
                          fontSize: panelText.itemTitle,
                          fontWeight: panelWeight.regular,
                          color: 'var(--pl-chrome-text)',
                          letterSpacing: '-0.01em',
                          lineHeight: panelLineHeight.tight,
                        }}
                      >
                        {e.toName}
                      </span>
                    </div>
                    <ClosenessMeter value={e.closeness} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: panelFont.mono,
                        fontSize: panelText.meta,
                        fontWeight: panelWeight.bold,
                        letterSpacing: panelTracking.widest,
                        textTransform: 'uppercase',
                        color: 'var(--pl-chrome-text-muted)',
                        padding: '3px 8px',
                        borderRadius: '99px',
                        background: 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)',
                      }}
                    >
                      {e.kind}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: panelFont.body,
                      fontSize: panelText.hint,
                      color: 'var(--pl-chrome-text)',
                      lineHeight: panelLineHeight.normal,
                    }}
                  >
                    {e.story}
                  </p>
                  {missingMatch && (
                    <p
                      style={{
                        margin: 0,
                        fontFamily: panelFont.body,
                        fontSize: panelText.meta,
                        fontStyle: 'italic',
                        color: 'var(--pl-chrome-text-muted)',
                      }}
                    >
                      Match both names to a known guest before saving.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => void acceptProposed(e)}
                      disabled={missingMatch}
                      style={{
                        ...pillMono,
                        padding: '6px 12px',
                        borderRadius: '99px',
                        border: '1px solid var(--pl-chrome-accent)',
                        background: missingMatch
                          ? 'color-mix(in srgb, var(--pl-chrome-accent) 8%, transparent)'
                          : 'var(--pl-chrome-accent)',
                        color: missingMatch ? 'var(--pl-chrome-text-muted)' : 'var(--pl-chrome-accent-ink)',
                        cursor: missingMatch ? 'not-allowed' : 'pointer',
                        opacity: missingMatch ? 0.6 : 1,
                      }}
                    >
                      <Check size={11} strokeWidth={2} /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setProposed((list) => list.filter((x) => x !== e))}
                      style={{
                        ...pillMono,
                        padding: '6px 12px',
                        borderRadius: '99px',
                        border: '1px solid var(--pl-chrome-border)',
                        background: 'transparent',
                        color: 'var(--pl-chrome-text-soft)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={11} strokeWidth={2} /> Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={eyebrowStyle}>Saved</span>
          <span
            style={{
              fontFamily: panelFont.mono,
              fontSize: panelText.meta,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.wider,
              color: 'var(--pl-chrome-text-muted)',
              padding: '3px 9px',
              borderRadius: '99px',
              background: 'var(--pl-chrome-accent-soft)',
            }}
          >
            {String(edges.length).padStart(2, '0')}
          </span>
        </div>
        {loading ? (
          <div
            style={{
              padding: '14px 12px',
              textAlign: 'center',
              fontFamily: panelFont.mono,
              fontSize: panelText.meta,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.widest,
              textTransform: 'uppercase',
              color: 'var(--pl-chrome-text-muted)',
            }}
          >
            Loading
          </div>
        ) : edges.length === 0 ? (
          <div
            style={{
              padding: '18px 14px',
              textAlign: 'center',
              fontFamily: panelFont.body,
              fontStyle: 'italic',
              fontSize: panelText.hint,
              color: 'var(--pl-chrome-text-muted)',
              border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
              borderRadius: '10px',
              background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, transparent)',
              lineHeight: panelLineHeight.normal,
            }}
          >
            No edges yet. Use <em>Infer from story</em> to get Claude&apos;s first draft.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {edges.map((e, idx) => (
              <li
                key={e.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--pl-chrome-surface)',
                  borderRadius: '10px',
                  border: '1px solid var(--pl-chrome-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: panelFont.mono,
                        fontSize: panelText.meta,
                        fontWeight: panelWeight.bold,
                        letterSpacing: panelTracking.widest,
                        color: 'var(--pl-chrome-accent)',
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontFamily: panelFont.display,
                        fontStyle: 'italic',
                        fontSize: panelText.itemTitle,
                        fontWeight: panelWeight.regular,
                        color: 'var(--pl-chrome-text)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {labelFor(e.from_guest_id)}
                    </span>
                    <span aria-hidden style={{ color: 'var(--pl-chrome-accent)' }}>↔</span>
                    <span
                      style={{
                        fontFamily: panelFont.display,
                        fontStyle: 'italic',
                        fontSize: panelText.itemTitle,
                        fontWeight: panelWeight.regular,
                        color: 'var(--pl-chrome-text)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {labelFor(e.to_guest_id)}
                    </span>
                  </div>
                  {e.closeness ? <ClosenessMeter value={e.closeness} /> : null}
                </div>
                <span
                  style={{
                    alignSelf: 'flex-start',
                    fontFamily: panelFont.mono,
                    fontSize: panelText.meta,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-muted)',
                    padding: '3px 8px',
                    borderRadius: '99px',
                    background: 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)',
                  }}
                >
                  {e.kind}
                </span>
                {e.story && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: panelFont.body,
                      fontSize: panelText.hint,
                      color: 'var(--pl-chrome-text)',
                      lineHeight: panelLineHeight.normal,
                    }}
                  >
                    {e.story}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <style>{`@keyframes pl-rel-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
