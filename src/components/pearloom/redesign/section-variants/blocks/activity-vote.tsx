'use client';

/* Activity vote section — let the group pick.

   Data: manifest.bachelor.votes[]  — the SAME field the Weekend
   planner tool (BachelorPanel) edits. ActivityVotePanel is a thin
   editor over it.
     { id, question, options: string[] }

   GUEST INTERACTIVITY (published only) — ported from the legacy
   src/components/site/ActivityVoteBlock.tsx logic:
     - voterKey: per-browser stable id under 'pearloom:voter-key'
       (same store as legacy so one browser = one identity across
       both renderers).
     - GET  /api/event-os/votes?siteId&blockId&voterKey → { tallies,
       myVote }. Server tallies are authoritative once ANY exist;
       myVote from the server is adopted only when non-null (the
       localStorage copy is the optimistic layer and wins on null —
       a null just means the POST never landed / keyless deploy).
     - POST /api/event-os/votes { siteId, blockId, voterKey,
       optionId|null } — null retracts. On ok, tallies re-fetched.
     - Keyless deploys ({ stored: false }, empty tallies) fall back
       to the local-only MVP: my own vote is the whole tally.
   siteId = manifest.subdomain (the published slug — same value the
   legacy renderer passed). blockId = one per poll (poll.id), so
   each poll tallies independently.

   Variants (layouts.ts): pills | bars. */

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';
import { optionIdsFor, readVotes, votePollsWithIds, type VotePollData } from '@/lib/event-os/activity-votes';

/* Poll shape + id helpers live in lib/event-os/activity-votes so
   the host-side tally on /dashboard/submissions derives the SAME
   block/option ids this section writes — never fork them. */
export { readVotes, type VotePollData };

/* ─── Interaction plumbing (legacy port) ─────────────────────── */

const VOTER_KEY_STORE = 'pearloom:voter-key';

function getOrCreateVoterKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    let key = window.localStorage.getItem(VOTER_KEY_STORE);
    if (!key) {
      key = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(VOTER_KEY_STORE, key);
    }
    return key;
  } catch {
    return `v_${Math.random().toString(36).slice(2)}`;
  }
}

function readSiteId(manifest: BlockSectionProps['manifest']): string {
  return (manifest.subdomain ?? '').trim();
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false),
    () => false,
  );
}

/** Per-poll vote sync — exact port of the legacy block's fetch /
 *  POST shapes, scoped to one (siteId, blockId) pair. `enabled`
 *  is false on the editor canvas: no reads, no writes, no key.
 *  Exported: the name-vote section (blocks/name-vote.tsx) rides the
 *  exact same plumbing under its own block id. */
export function useActivityVote(siteId: string, blockId: string, enabled: boolean) {
  const canSync = enabled && Boolean(siteId && blockId);
  const storeKey = `pearloom:vote:${siteId || 'draft'}:${blockId}`;
  // Lazy useState init reads localStorage once on mount — the key
  // is stable for the poll's lifetime so no effect cascade needed.
  const [myVote, setMyVote] = useState<string | null>(() => {
    if (!enabled || typeof window === 'undefined') return null;
    try { return window.localStorage.getItem(storeKey); } catch { return null; }
  });
  const [serverTallies, setServerTallies] = useState<Record<string, number>>({});
  const [voterKey] = useState(() => (enabled ? getOrCreateVoterKey() : ''));

  const fetchTallies = useCallback(async () => {
    const params = new URLSearchParams({ siteId, blockId, voterKey });
    const res = await fetch(`/api/event-os/votes?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok) return null;
    return data as { tallies?: Record<string, number>; myVote?: string | null };
  }, [siteId, blockId, voterKey]);

  // Server sync — tally + authoritative my-vote.
  useEffect(() => {
    if (!canSync || !voterKey) return;
    let cancelled = false;
    fetchTallies()
      .then((data) => {
        if (cancelled || !data) return;
        setServerTallies(data.tallies ?? {});
        // Adopt the server's record of our vote only when it has
        // one — null just means the POST never landed (offline or
        // keyless deploy). The localStorage copy is the optimistic
        // layer and wins.
        if (data.myVote) setMyVote(data.myVote);
      })
      .catch(() => { /* offline — local wins */ });
    return () => { cancelled = true; };
  }, [canSync, voterKey, fetchTallies]);

  const castVote = async (id: string) => {
    if (!enabled) return;
    const next = myVote === id ? null : id;
    setMyVote(next);
    if (typeof window !== 'undefined') {
      try {
        if (next) window.localStorage.setItem(storeKey, next);
        else window.localStorage.removeItem(storeKey);
      } catch { /* ignore */ }
    }
    if (canSync && voterKey) {
      try {
        const res = await fetch('/api/event-os/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, blockId, voterKey, optionId: next }),
        });
        if (res.ok) {
          // Refresh tallies from server so counts reflect reality.
          const data = await fetchTallies().catch(() => null);
          if (data) setServerTallies(data.tallies ?? {});
        }
      } catch { /* offline — local only */ }
    }
  };

  return { myVote, serverTallies, castVote, canSync };
}

/* ─── Shared bits ────────────────────────────────────────────── */

function GuestHint({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '4px 12px', borderRadius: 999,
          border: '1px dashed var(--t-line)', background: 'var(--t-card)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--t-ink-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)', flexShrink: 0 }} />
        {children}
      </span>
    </div>
  );
}

const pollCardStyle = {
  background: 'var(--t-card)',
  border: '1px solid var(--t-line)',
  borderRadius: 'var(--t-radius-lg, 14px)',
  padding: 'clamp(16px, 3vw, 22px)',
  boxShadow: 'var(--t-shadow-sm, none)',
} as const;

const questionStyle = {
  fontFamily: 'var(--t-display)',
  fontSize: 'clamp(17px, 2.4vw, 19px)',
  color: 'var(--t-ink)',
  lineHeight: 1.25,
  marginBottom: 14,
} as const;

/* ─── One poll — both variants render from the same sync state ── */

function VotePoll({
  poll, blockId, siteId, variant, editable, reduced,
}: {
  poll: VotePollData;
  /** Tally id from votePollsWithIds — assigned by the parent so
   *  it can never drift from the dashboard's. */
  blockId: string;
  siteId: string;
  variant: 'pills' | 'bars';
  editable: boolean;
  reduced: boolean;
}) {
  const labels = (poll.options ?? []).map((o) => o.trim()).filter(Boolean);
  const ids = optionIdsFor(labels);
  const { myVote, serverTallies, castVote, canSync } = useActivityVote(siteId, blockId, !editable);

  // Server tallies are authoritative once any exist; otherwise my
  // own vote is the whole local tally (keyless / offline MVP).
  const serverTotal = Object.values(serverTallies).reduce((a, b) => a + b, 0);
  const useServer = canSync && serverTotal > 0;
  const counts = ids.map((id) => (useServer ? (serverTallies[id] ?? 0) : (myVote === id ? 1 : 0)));
  const total = counts.reduce((a, b) => a + b, 0);
  const maxCount = counts.length ? Math.max(...counts) : 0;
  const leaderIdx = total > 0 && maxCount > 0 ? counts.indexOf(maxCount) : -1;

  if (labels.length === 0 && !poll.question?.trim()) return null;

  return (
    <div style={pollCardStyle}>
      {poll.question?.trim() && <div style={questionStyle}>{poll.question.trim()}</div>}

      {variant === 'pills' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {labels.map((label, i) => {
            const id = ids[i];
            const on = myVote === id;
            return (
              <button
                key={id}
                type="button"
                onClick={editable ? undefined : () => castVote(id)}
                disabled={editable}
                aria-pressed={on}
                title={editable ? undefined : on ? 'Tap again to retract your vote' : 'Tap to vote'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, width: '100%',
                  padding: '11px 16px', borderRadius: 999,
                  border: on ? '1px solid var(--t-accent)' : '1px solid var(--t-line)',
                  background: on ? 'var(--t-accent)' : 'var(--t-paper)',
                  color: on ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                  cursor: editable ? 'default' : 'pointer',
                  textAlign: 'left', fontSize: 13.5, fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: reduced ? 'none' : 'background 160ms ease, border-color 160ms ease, color 160ms ease',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      border: on ? '1.5px solid currentColor' : '1.5px solid var(--t-accent)',
                      background: on ? 'currentColor' : 'transparent',
                      transition: reduced ? 'none' : 'background 160ms ease',
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                  {on && (
                    <span
                      style={{
                        fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                        opacity: 0.85, flexShrink: 0,
                      }}
                    >
                      Your pick
                    </span>
                  )}
                </span>
                {total > 0 && (
                  <span
                    style={{
                      fontFamily: 'var(--t-mono)', fontSize: 11, fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                      padding: '2px 9px', borderRadius: 999,
                      background: 'color-mix(in oklab, currentColor 12%, transparent)',
                    }}
                  >
                    {counts[i]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {labels.map((label, i) => {
            const id = ids[i];
            const on = myVote === id;
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            const isLeader = i === leaderIdx;
            return (
              <div key={id}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {total > 0 && (
                      <span style={{ fontFamily: 'var(--t-mono)', fontSize: 11, fontWeight: 700, color: 'var(--t-ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {pct}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={editable ? undefined : () => castVote(id)}
                      disabled={editable}
                      aria-pressed={on}
                      title={editable ? undefined : on ? 'Tap again to retract your vote' : 'Tap to vote'}
                      style={{
                        padding: '4px 12px', borderRadius: 999,
                        border: '1px solid var(--t-accent)',
                        background: on ? 'var(--t-accent)' : 'transparent',
                        color: on ? 'var(--t-accent-ink)' : 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
                        fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700,
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        cursor: editable ? 'default' : 'pointer',
                        transition: reduced ? 'none' : 'background 160ms ease, color 160ms ease',
                      }}
                    >
                      {on ? '✓ Yours' : 'Vote'}
                    </button>
                  </span>
                </div>
                <div
                  aria-hidden
                  style={{
                    position: 'relative', height: 9, borderRadius: 999,
                    background: 'var(--t-section)', overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', inset: '0 auto 0 0',
                      width: `${pct}%`, borderRadius: 999,
                      background: 'var(--t-accent)',
                      transition: reduced ? 'none' : 'width 320ms ease',
                    }}
                  />
                  {isLeader && pct > 0 && (
                    <span
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `max(calc(${pct}% - 9px), 0px)`, width: 9,
                        borderRadius: 999, background: 'var(--t-gold)',
                        transition: reduced ? 'none' : 'left 320ms ease',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function ActivityVoteSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const v: 'pills' | 'bars' = variant === 'bars' ? 'bars' : 'pills';
  const reduced = usePrefersReducedMotion();
  const siteId = readSiteId(manifest);
  const polls = votePollsWithIds(manifest);
  const empty = polls.length === 0;
  if (empty && !editable) return null;

  const canSync = !editable && Boolean(siteId);

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'activityVoteEyebrow', 'You decide')}
        title={blockCopy(manifest, 'activityVoteTitle', 'Cast your vote')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (val) => onEditCopy('activityVoteEyebrow', val) : undefined}
        onEditTitle={onEditCopy ? (val) => onEditCopy('activityVoteTitle', val) : undefined}
      />
      {editable && !empty && <GuestHint>Guests can vote here</GuestHint>}
      {empty ? (
        <BlockEmpty hint="Add a poll in the Group vote panel (or the Weekend planner)." />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: v === 'bars' ? 580 : 620, margin: '0 auto' }}>
            {polls.map(({ poll, blockId }) => (
              <VotePoll
                key={blockId}
                poll={poll}
                blockId={blockId}
                siteId={siteId}
                variant={v}
                editable={editable}
                reduced={reduced}
              />
            ))}
          </div>
          {!canSync && !editable && (
            <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12, fontStyle: 'italic', color: 'var(--t-ink-muted)' }}>
              Your vote is saved in your browser. Live tallies appear once the site is published.
            </p>
          )}
        </>
      )}
    </BlockFrame>
  );
}
