'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/VotesSummary.tsx
// Host-only tally view of activityVote blocks on a single site.
// Groups by block_id; shows winning option + full breakdown.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { CurvedText } from '@/components/brand/groove';

interface BlockTally {
  tallies: Record<string, number>;
  voterCount: number;
}

interface Props {
  siteId: string;
}

export function VotesSummary({ siteId }: Props) {
  const [blocks, setBlocks] = useState<Record<string, BlockTally>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/event-os/votes/moderation?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setBlocks(data.blocks ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vote tallies.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const blockIds = Object.keys(blocks);

  return (
    <section style={{ marginTop: 48 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <div>
          <div
            aria-hidden
            style={{
              marginBottom: 2,
              marginLeft: -6,
              color: 'var(--pl-groove-terra)',
            }}
          >
            <CurvedText
              variant="arc"
              width={220}
              amplitude={10}
              fontFamily='var(--pl-font-body)'
              fontSize={13}
              fontWeight={500}
              letterSpacing={1.4}
              aria-label="Activity votes"
            >
              ✦  Activity votes  ✦
            </CurvedText>
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-body)',
              fontWeight: 700,
              fontSize: 'clamp(1.4rem, 2.8vw, 1.8rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: 'var(--pl-groove-ink)',
            }}
          >
            What guests picked
          </h2>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--pl-groove-radius-pill)',
            border: '1px solid color-mix(in oklab, var(--pl-groove-terra) 30%, transparent)',
            background: 'var(--pl-groove-cream)',
            color: 'var(--pl-groove-ink)',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} />
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
          No votes cast yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blockIds.map((blockId) => {
            const block = blocks[blockId];
            const total = block.voterCount;
            const entries = Object.entries(block.tallies)
              .map(([optionId, votes]) => ({ optionId, votes, pct: total > 0 ? (votes / total) * 100 : 0 }))
              .sort((a, b) => b.votes - a.votes);
            const leader = entries[0];
            return (
              <article
                key={blockId}
                style={{
                  padding: '16px 18px',
                  borderRadius: 'var(--pl-radius-lg)',
                  background: 'var(--pl-cream-card)',
                  border: '1px solid var(--pl-divider)',
                }}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                    }}
                  >
                    {blockId}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--pl-muted)' }}>
                    <TrendingUp size={12} />
                    <strong style={{ color: 'var(--pl-ink)' }}>{leader.optionId}</strong>
                    <span>&middot; {Math.round(leader.pct)}% &middot; {total} {total === 1 ? 'vote' : 'votes'}</span>
                  </div>
                </header>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {entries.map((entry) => (
                    <li
                      key={entry.optionId}
                      style={{
                        position: 'relative',
                        padding: '8px 14px',
                        borderRadius: 'var(--pl-radius-sm)',
                        background: 'color-mix(in oklab, var(--pl-olive) 5%, transparent)',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: `${entry.pct}%`,
                          background: 'color-mix(in oklab, var(--pl-olive) 14%, transparent)',
                          transition: 'width var(--pl-dur-base) var(--pl-ease-out)',
                        }}
                      />
                      <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.85rem', color: 'var(--pl-ink)' }}>
                        <span>{entry.optionId}</span>
                        <span style={{ fontFamily: 'var(--pl-font-mono)', fontSize: '0.72rem', color: 'var(--pl-olive)', fontVariantNumeric: 'tabular-nums' }}>
                          {entry.votes} &middot; {Math.round(entry.pct)}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
