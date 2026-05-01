'use client';

// ─────────────────────────────────────────────────────────────
// PearActionCard — when Pear emits a pearloom:patch envelope
// with an `action` field, this card renders instead of the
// field-edit PatchProposalCard. Click "Run" → the action's
// handler runs (typically an API call), and the card flips
// to a confirmation state.
//
// Today supports one action kind:
//   • send_nudge_pending — drafts + sends the bulk RSVP nudge
//     to all guests with no responded_at via /api/guests/nudge.
//
// New action kinds are added by:
//   1. Adding a variant to PearAction in patch.ts
//   2. Adding a case in the switch below
//   3. Updating Pear's host system prompt to mention the action
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Pear } from '../../motifs';
import type { PearPatchEnvelope, PearAction } from './patch';

interface Props {
  envelope: PearPatchEnvelope & { action: PearAction };
  /** Site subdomain — needed by the action handlers to know
   *  which site to act on. Without it the card renders read-only. */
  siteSlug?: string;
  /** When the action completes successfully, parent removes the
   *  card from the chat (or transitions it to a "done" state). */
  onDone?: () => void;
  onDismiss: () => void;
}

export function PearActionCard({ envelope, siteSlug, onDone, onDismiss }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const action = envelope.action;
  const canRun = !!siteSlug && !busy && !done;

  async function run() {
    if (!siteSlug || busy) return;
    setBusy(true);
    setError(null);
    try {
      switch (action.kind) {
        case 'send_nudge_pending': {
          // 1) Pull the pending guest IDs.
          const sitesRes = await fetch(`/api/guests/pending-ids?siteSlug=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
          if (!sitesRes.ok) throw new Error(`Could not look up pending guests (${sitesRes.status})`);
          const sitesData = (await sitesRes.json()) as { guestIds?: string[] };
          const ids = Array.isArray(sitesData.guestIds) ? sitesData.guestIds : [];
          if (ids.length === 0) {
            setDone('No pending guests right now — nothing to send.');
            onDone?.();
            return;
          }
          // 2) Use Pear's preview body if provided, otherwise let
          //    /api/guests/draft-nudge produce a fresh one.
          let body = action.previewBody?.trim() ?? '';
          if (!body) {
            const draftRes = await fetch('/api/guests/draft-nudge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteId: siteSlug, pendingCount: ids.length }),
            });
            if (!draftRes.ok) throw new Error(`Pear couldn't draft the nudge (${draftRes.status})`);
            const draftData = (await draftRes.json()) as { body?: string };
            body = draftData.body?.trim() ?? '';
          }
          if (!body) throw new Error('Pear returned an empty nudge body.');
          // 3) Send the nudge. /api/guests/nudge takes siteId
          //    (accepts subdomain too) + guestIds[] + bodyText.
          const sendRes = await fetch('/api/guests/nudge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId: siteSlug, guestIds: ids, bodyText: body }),
          });
          if (!sendRes.ok) {
            const data = await sendRes.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? `Send failed (${sendRes.status})`);
          }
          const sendData = (await sendRes.json()) as { sent?: number };
          setDone(`Sent to ${sendData.sent ?? ids.length} guest${(sendData.sent ?? ids.length) === 1 ? '' : 's'}.`);
          onDone?.();
          return;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run that action.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Pear action proposal"
      style={{
        background: 'linear-gradient(165deg, var(--peach-bg, #FBE8D6) 0%, rgba(232,224,240,0.6) 100%)',
        border: '1px solid rgba(198,112,61,0.22)',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ flexShrink: 0, marginTop: 1 }}>
          <Pear size={20} tone="peach" shadow={false} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
              marginBottom: 2,
            }}
          >
            {done ? 'Sent' : 'Pear can do this'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500 }}>
            {envelope.summary}
          </div>
        </div>
      </div>

      {/* Preview — for nudges, show what Pear would send. */}
      {action.kind === 'send_nudge_pending' && action.previewBody && !done && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(198,112,61,0.18)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--ink)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {action.previewBody}
        </div>
      )}

      {error && (
        <div role="alert" style={{ fontSize: 12, color: 'var(--plum-ink, #7A2D2D)' }}>
          {error}
        </div>
      )}

      {!done && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            className={canRun ? 'pl-pearl-accent' : undefined}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 999,
              border: canRun ? 'none' : '1px solid var(--line)',
              background: canRun ? undefined : 'var(--cream-2)',
              color: canRun ? undefined : 'var(--ink-muted)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: canRun ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {busy ? 'Sending…' : runLabel(action)}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink-soft)',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Not yet
          </button>
        </div>
      )}

      {done && (
        <div
          role="status"
          aria-live="polite"
          style={{
            alignSelf: 'flex-start',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(92,107,63,0.14)',
            color: 'var(--sage-deep, #5C6B3F)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          ✓ {done}
        </div>
      )}
    </div>
  );
}

function runLabel(action: PearAction): string {
  switch (action.kind) {
    case 'send_nudge_pending': return 'Send the nudge';
  }
}
