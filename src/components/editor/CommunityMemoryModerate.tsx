'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface Memory {
  id: string;
  siteId: string;
  guestName: string;
  relationship: string | null;
  memoryText: string;
  photoUrl: string | null;
  approved: boolean;
  createdAt: string;
}

interface CommunityMemoryModerateProps {
  siteId?: string;
  coupleNames: [string, string];
}

type ActionState = 'idle' | 'loading';

export default function CommunityMemoryModerate({
  siteId,
  coupleNames,
}: CommunityMemoryModerateProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});

  const effectiveSiteId = siteId || 'unknown';

  const load = useCallback(async () => {
    if (!effectiveSiteId || effectiveSiteId === 'unknown') {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/community-memory?siteId=${encodeURIComponent(effectiveSiteId)}&all=true`
      );
      const json = await res.json();
      if (res.ok) {
        setMemories(json.memories || []);
      }
    } catch (err) {
      console.error('[CommunityMemoryModerate] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveSiteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id: string) {
    setActionState((s) => ({ ...s, [id]: 'loading' }));
    // Optimistic update
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, approved: true } : m))
    );
    try {
      await fetch('/api/community-memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approved: true }),
      });
    } catch (err) {
      console.error('[CommunityMemoryModerate] approve error:', err);
      // Revert on error
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, approved: false } : m))
      );
    } finally {
      setActionState((s) => ({ ...s, [id]: 'idle' }));
    }
  }

  async function handleDelete(id: string) {
    setActionState((s) => ({ ...s, [id]: 'loading' }));
    // Optimistic remove
    setMemories((prev) => prev.filter((m) => m.id !== id));
    try {
      await fetch(`/api/community-memory?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('[CommunityMemoryModerate] delete error:', err);
      // Reload on error
      load();
    } finally {
      setActionState((s) => ({ ...s, [id]: 'idle' }));
    }
  }

  // Stats
  const pending = memories.filter((m) => !m.approved);
  const approved = memories.filter((m) => m.approved);

  // Sort: pending first, then approved, each by createdAt desc
  const sorted = [
    ...pending.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    ...approved.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  ];

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  return (
    <div
      style={{
        background: '#1A1A2E',
        borderRadius: 16,
        padding: '28px 24px',
        color: '#E8E8F0',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: 200,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#F5F5FF',
            margin: 0,
          }}
        >
          Community Memories
          <span style={{ color: '#9B9BAF', fontWeight: 400, marginLeft: 6, fontSize: 14 }}>
            — {coupleNames[0]} &amp; {coupleNames[1]}
          </span>
        </h3>
        <button
          onClick={load}
          style={{
            background: 'transparent',
            border: '1px solid #3A3A5C',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#9B9BAF',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div
        style={{
          background: '#13132A',
          borderRadius: 10,
          padding: '12px 18px',
          display: 'flex',
          gap: 24,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <StatPill label="Pending" value={pending.length} color="#F59E0B" />
        <StatPill label="Approved" value={approved.length} color="#10B981" />
        <StatPill label="Total" value={memories.length} color="#9B9BAF" />
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ color: '#9B9BAF', textAlign: 'center', padding: '32px 0' }}>
          Loading memories…
        </div>
      )}

      {/* ── Empty Pending ── */}
      {!loading && pending.length === 0 && approved.length === 0 && (
        <div
          style={{
            color: '#9B9BAF',
            textAlign: 'center',
            padding: '40px 0',
            fontSize: 15,
          }}
        >
          No memories yet. Share the link with guests to get started.
        </div>
      )}

      {/* ── Pending Section ── */}
      {!loading && pending.length === 0 && approved.length > 0 && (
        <div
          style={{
            color: '#10B981',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>✓</span> No memories waiting for review
        </div>
      )}

      {/* ── Memory List ── */}
      {!loading && sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map((memory) => {
            const isLoading = actionState[memory.id] === 'loading';
            return (
              <div
                key={memory.id}
                style={{
                  background: '#21213A',
                  borderRadius: 12,
                  padding: '16px 18px',
                  border: memory.approved
                    ? '1px solid #10B98133'
                    : '1px solid #F59E0B33',
                  opacity: isLoading ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Status badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: memory.approved ? '#10B981' : '#F59E0B',
                        background: memory.approved ? '#10B98120' : '#F59E0B20',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {memory.approved ? 'Approved' : 'Pending'}
                    </span>
                    <span style={{ fontSize: 12, color: '#6B6B8A' }}>
                      {formatDate(memory.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Guest info */}
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#C8C8E0',
                    marginBottom: 6,
                  }}
                >
                  {memory.guestName}
                  {memory.relationship && (
                    <span style={{ fontWeight: 400, color: '#6B6B8A' }}>
                      {' '}— {memory.relationship}
                    </span>
                  )}
                </div>

                {/* Memory text */}
                <p
                  style={{
                    fontSize: 14,
                    color: '#A8A8C0',
                    lineHeight: 1.6,
                    margin: '0 0 12px',
                    
                  }}
                >
                  &ldquo;{memory.memoryText.length > 200
                    ? memory.memoryText.slice(0, 200) + '…'
                    : memory.memoryText}&rdquo;
                </p>

                {/* Photo thumbnail */}
                {memory.photoUrl && (
                  <div style={{ marginBottom: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={memory.photoUrl}
                      alt={`Photo from ${memory.guestName}`}
                      style={{
                        width: 72,
                        height: 72,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #3A3A5C',
                      }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {!memory.approved && (
                    <button
                      onClick={() => handleApprove(memory.id)}
                      disabled={isLoading}
                      style={{
                        background: '#065F46',
                        color: '#D1FAE5',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      ✓ Approve
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(memory.id)}
                    disabled={isLoading}
                    style={{
                      background: '#7F1D1D',
                      color: '#FEE2E2',
                      border: 'none',
                      borderRadius: 8,
                      padding: '7px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {memory.approved ? '✗ Remove' : '✗ Reject'}&nbsp;<Trash2 size={13} style={{ color: 'currentColor', verticalAlign: 'middle' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
        }}
      />
      <span style={{ fontSize: 13, color: '#9B9BAF' }}>{label}:</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
