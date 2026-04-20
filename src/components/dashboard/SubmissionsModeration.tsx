'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SubmissionsModeration.tsx
// Host-only moderation UI for tribute_submissions.
// Pulls all states (approved / hidden / flagged) from
// /api/event-os/submissions/moderation and lets the host flip
// them per entry.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { Check, EyeOff, Flag, RefreshCw } from 'lucide-react';

type State = 'approved' | 'hidden' | 'flagged';

interface Entry {
  id: string;
  blockId: string;
  from: string;
  body: string;
  state: State;
  at: string;
}

interface Props {
  siteId: string;
  initialEntries?: Entry[];
}

const STATE_LABEL: Record<State, string> = {
  approved: 'Visible',
  hidden: 'Hidden',
  flagged: 'Flagged',
};

const STATE_TINT: Record<State, string> = {
  approved: 'color-mix(in oklab, var(--pl-olive) 18%, transparent)',
  hidden:   'color-mix(in oklab, var(--pl-muted) 18%, transparent)',
  flagged:  'color-mix(in oklab, var(--pl-plum) 18%, transparent)',
};

export function SubmissionsModeration({ siteId, initialEntries = [] }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [filter, setFilter] = useState<State | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/event-os/submissions/moderation?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setEntries((data.entries ?? []) as Entry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setState = async (id: string, state: State) => {
    setPendingId(id);
    setError(null);
    // Optimistic update
    const prev = entries;
    setEntries((rows) => rows.map((r) => (r.id === id ? { ...r, state } : r)));
    try {
      const res = await fetch('/api/event-os/submissions/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, state }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
    } catch (err) {
      // Rollback
      setEntries(prev);
      setError(err instanceof Error ? err.message : 'Could not update state.');
    } finally {
      setPendingId(null);
    }
  };

  const visible = entries.filter((e) => filter === 'all' || e.state === filter);
  const counts = entries.reduce<Record<State, number>>(
    (acc, e) => { acc[e.state] = (acc[e.state] ?? 0) + 1; return acc; },
    { approved: 0, hidden: 0, flagged: 0 },
  );

  return (
    <section>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div
            className="pl-overline"
            style={{ color: 'var(--pl-olive)', marginBottom: 8 }}
          >
            Advice + tribute wall
          </div>
          <h1
            className="pl-display"
            style={{
              margin: 0,
              fontStyle: 'italic',
              fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
              color: 'var(--pl-ink)',
            }}
          >
            Guest submissions
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--pl-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Everything guests have posted to advice walls, tribute walls, and memory walls on this site.
          </p>
        </div>
        <button
          onClick={() => { void refresh(); }}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--pl-radius-full)',
            border: '1px solid var(--pl-divider)',
            background: 'var(--pl-cream-card)',
            color: 'var(--pl-ink)',
            fontSize: '0.8rem',
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

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterChip active={filter === 'all'}      label={`All · ${entries.length}`}         onClick={() => setFilter('all')} />
        <FilterChip active={filter === 'approved'} label={`Visible · ${counts.approved}`}   onClick={() => setFilter('approved')} />
        <FilterChip active={filter === 'flagged'}  label={`Flagged · ${counts.flagged}`}    onClick={() => setFilter('flagged')} />
        <FilterChip active={filter === 'hidden'}   label={`Hidden · ${counts.hidden}`}      onClick={() => setFilter('hidden')} />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-sm)',
            background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
            color: 'var(--pl-plum)',
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--pl-muted)',
            fontStyle: 'italic',
            border: '1px dashed var(--pl-divider)',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'var(--pl-cream-card)',
          }}
        >
          Nothing yet. Begin a thread.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((entry) => (
            <article
              key={entry.id}
              style={{
                padding: '16px 18px',
                borderRadius: 'var(--pl-radius-lg)',
                background: 'var(--pl-cream-card)',
                border: '1px solid var(--pl-divider)',
                opacity: entry.state === 'hidden' ? 0.55 : 1,
              }}
            >
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                  }}
                >
                  {entry.from} · {new Date(entry.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {entry.blockId}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.56rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    padding: '2px 10px',
                    borderRadius: 'var(--pl-radius-full)',
                    background: STATE_TINT[entry.state],
                    color: entry.state === 'flagged' ? 'var(--pl-plum)' : 'var(--pl-ink)',
                  }}
                >
                  {STATE_LABEL[entry.state]}
                </span>
              </header>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--pl-font-display, Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: '1rem',
                  lineHeight: 1.55,
                  color: 'var(--pl-ink-soft)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {entry.body}
              </p>
              <footer style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <ActionButton
                  active={entry.state === 'approved'}
                  disabled={pendingId === entry.id}
                  icon={<Check size={12} />}
                  label="Visible"
                  onClick={() => { void setState(entry.id, 'approved'); }}
                />
                <ActionButton
                  active={entry.state === 'hidden'}
                  disabled={pendingId === entry.id}
                  icon={<EyeOff size={12} />}
                  label="Hide"
                  onClick={() => { void setState(entry.id, 'hidden'); }}
                />
                <ActionButton
                  active={entry.state === 'flagged'}
                  disabled={pendingId === entry.id}
                  icon={<Flag size={12} />}
                  label="Flag"
                  onClick={() => { void setState(entry.id, 'flagged'); }}
                />
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--pl-radius-full)',
        border: `1px solid ${active ? 'var(--pl-ink)' : 'var(--pl-divider)'}`,
        background: active ? 'var(--pl-ink)' : 'transparent',
        color: active ? 'var(--pl-cream)' : 'var(--pl-ink-soft)',
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({
  active, disabled, icon, label, onClick,
}: { active: boolean; disabled: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || active}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--pl-radius-sm)',
        border: `1px solid ${active ? 'var(--pl-olive)' : 'var(--pl-divider)'}`,
        background: active ? 'color-mix(in oklab, var(--pl-olive) 14%, transparent)' : 'transparent',
        color: active ? 'var(--pl-olive)' : 'var(--pl-ink-soft)',
        fontSize: '0.74rem',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled && !active ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
