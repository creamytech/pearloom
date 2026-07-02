'use client';

// Guests — real /api/guests wiring + RSVP stats derived from
// the guest list client-side.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, EmptyShell, btnInk, btnGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLAtmosphere } from '@/components/pearloom/dash/PLChrome';
import { Icon, Sprig } from '@/components/pearloom/motifs';
import Link from 'next/link';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { buildSiteUrl } from '@/lib/site-urls';
import { GuestImportDialog } from '@/components/dashboard/GuestImportDialog';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';
import { findDuplicateGroups } from '@/lib/guest-dedupe';
import { normaliseRsvpStatus } from '@/lib/rsvp-status';
import { BrandedQR } from '@/components/pearloom/editor/panels/BrandedQR';

// Occasion-aware copy for the guests page. Falls back to wedding-y
// defaults when an occasion isn't recognised.
function guestCopy(occasion?: string | null) {
  const e = getEventType(occasion as never) ?? null;
  const preset = e?.rsvpPreset ?? 'wedding';
  // Solemn presets (memorial / funeral): Pear never chases anyone —
  // no stale stat, no nudge affordances, gentler panel labels.
  const solemn = preset === 'memorial';
  const base = (() => {
  switch (preset) {
    case 'memorial':
      return {
        topSubtitle: 'Every note of attendance, and memories shared.',
        emptyHint: "Share the site link so family and friends can let you know they're coming.",
        fifthColumn: 'Memory',
        fifthKey: 'note' as const,
        verbComing: 'attending',
        verbQuiet: "haven't replied",
      };
    case 'bachelor':
      return {
        topSubtitle: 'Who’s in, which days, bed prefs, and cost acks.',
        emptyHint: 'Drop the link in the group chat — Pear tracks who’s in.',
        fifthColumn: 'Bed pref',
        fifthKey: 'note' as const,
        verbComing: 'in',
        verbQuiet: 'haven’t replied',
      };
    case 'shower':
      return {
        topSubtitle: 'Who’s coming, who’s bringing what, and any advice shared.',
        emptyHint: 'Share the link — guests can RSVP and leave a note for the guest of honor.',
        fifthColumn: 'Gift',
        fifthKey: 'note' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
    case 'reunion':
      return {
        topSubtitle: 'Every RSVP, by day, with room and t-shirt prefs.',
        emptyHint: 'Share the link with the group chat, and Pear will track replies.',
        fifthColumn: 'T-shirt',
        fifthKey: 'note' as const,
        verbComing: 'in',
        verbQuiet: 'still quiet',
      };
    case 'milestone':
    case 'casual':
      return {
        topSubtitle: 'Every RSVP and note, in one list.',
        emptyHint: 'Share your link, add guests by hand, or import a CSV. Pear tracks everyone in one list.',
        fifthColumn: 'Note',
        fifthKey: 'note' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
    case 'cultural':
      return {
        topSubtitle: 'Every RSVP, dietary note, and ceremony tradition tracked.',
        emptyHint: 'Share the link — Pear tracks RSVPs and ceremony preferences.',
        fifthColumn: 'Meal',
        fifthKey: 'meal' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
    case 'wedding':
    default:
      return {
        topSubtitle: 'Every RSVP, meal note, and plus-one recorded.',
        emptyHint: 'Share your invite link, add guests by hand, or import a CSV. Pear tracks RSVPs, meals, and accessibility notes as they come in.',
        fifthColumn: 'Meal',
        fifthKey: 'meal' as const,
        verbComing: 'coming',
        verbQuiet: 'still quiet',
      };
  }
  })();
  return { ...base, solemn };
}

type RsvpKey = 'yes' | 'no' | 'maybe' | 'pending';

interface ApiGuest {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  status: string; // 'pending' | 'attending' | 'declined' | 'maybe'
  plusOne: boolean;
  plusOneName: string | null;
  /** Host granted this guest a plus-one. */
  plusOneAllowed?: boolean;
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  message: string | null;
  respondedAt: string | null;
  invitedAt?: string | null;
  createdAt?: string | null;
  guestToken?: string | null;
  emailSentAt?: string | null;
  emailDeliveredAt?: string | null;
  emailOpenedAt?: string | null;
  emailClickedAt?: string | null;
  emailBouncedAt?: string | null;
  eventIds: string[];
}

interface Guest {
  id: string;
  n: string;
  em: string;
  /** Phone, when the import/add captured one — powers "Text invite". */
  phone: string;
  party: string;
  rsvp: RsvpKey;
  meal: string;
  /** Clean dietary restriction text (separate from the merged note),
   *  so the caterer summary can tally it. */
  dietary: string;
  note: string;
  tags: string[];
  /** ISO timestamp the guest was invited (or imported). */
  invitedAt: string | null;
  /** ISO timestamp the guest replied. */
  respondedAt: string | null;
  /** Email lifecycle from the Resend webhook. */
  emailSentAt: string | null;
  emailDeliveredAt: string | null;
  emailOpenedAt: string | null;
  emailBouncedAt: string | null;
  /** Host granted this guest a plus-one (they may bring someone). */
  plusOneAllowed: boolean;
  /** Per-guest token, used to deep-link to /g/[token]. */
  token: string | null;
  /** True when invited >7 days ago and still pending. */
  stale: boolean;
  /** True when the email opened the invite but didn't reply. The
   *  funnel surfaces these as "ready for a nudge". */
  opened: boolean;
  /** Events the guest opted into (manifest.events ids). When the
   *  site has more than one event, the per-event headcount strip
   *  groups guests by these. */
  eventIds: string[];
}

interface ManifestEvent {
  id: string;
  name?: string;
  time?: string;
  type?: string;
}

const STALE_DAYS = 7;
const STALE_MS = STALE_DAYS * 86_400_000;
function isStale(invitedAtIso: string | null | undefined, status: RsvpKey, now = Date.now()): boolean {
  if (status !== 'pending') return false;
  if (!invitedAtIso) return false;
  const t = new Date(invitedAtIso).getTime();
  if (Number.isNaN(t)) return false;
  return now - t > STALE_MS;
}

/** Copy the guest list from another of the host's sites — the
 *  sibling-event handoff. The bachelorette host shouldn't re-type
 *  the 15 people who already RSVP'd to the wedding. Sites sharing
 *  the destination's celebration id sort first; person-stable
 *  facts copy, per-event answers (status, meal) reset. */
function CopyGuestsDialog({
  destId,
  destCelebrationId,
  sites,
  onClose,
  onCopied,
}: {
  destId: string;
  destCelebrationId: string | null;
  sites: Array<{ id: string; domain: string; names: [string, string] | null; occasion?: string; manifest: unknown }>;
  onClose: () => void;
  onCopied: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const sources = useMemo(() => {
    const celebOf = (m: unknown) =>
      (m as { celebration?: { id?: string } } | null)?.celebration?.id ?? null;
    return sites
      .filter((s) => s.id !== destId)
      .sort((a, b) => {
        const aSib = destCelebrationId != null && celebOf(a.manifest) === destCelebrationId ? 0 : 1;
        const bSib = destCelebrationId != null && celebOf(b.manifest) === destCelebrationId ? 0 : 1;
        return aSib - bSib;
      })
      .map((s) => ({
        ...s,
        sibling: destCelebrationId != null && celebOf(s.manifest) === destCelebrationId,
      }));
  }, [sites, destId, destCelebrationId]);

  async function copyFrom(fromSiteId: string) {
    if (busyId) return;
    setBusyId(fromSiteId);
    try {
      const r = await fetch('/api/guests/copy-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: destId, fromSiteId }),
      });
      const data = (await r.json()) as { inserted?: number; skipped?: number; error?: string };
      if (!r.ok) throw new Error(data.error ?? `Failed (${r.status})`);
      const inserted = data.inserted ?? 0;
      const skipped = data.skipped ?? 0;
      setResults((m) => ({
        ...m,
        [fromSiteId]: inserted === 0
          ? (skipped > 0 ? 'Everyone is already here.' : 'No guests on that site yet.')
          : `✓ ${inserted} brought in${skipped > 0 ? ` · ${skipped} already here` : ''}`,
      }));
      if (inserted > 0) onCopied();
    } catch (err) {
      setResults((m) => ({ ...m, [fromSiteId]: err instanceof Error ? err.message : 'Copy failed.' }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Copy guests from another event"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,13,11,0.5)',
        backdropFilter: 'blur(8px)',
        zIndex: 360,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 100%)',
          background: 'var(--card, #FBF7EE)',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink, #C6703D)' }}>
            One guest list, many events
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 22,
              margin: '4px 0 0',
              color: 'var(--ink, #0E0D0B)',
              lineHeight: 1.2,
            }}
          >
            Copy guests from another event
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft, #3A332C)', margin: '6px 0 0', lineHeight: 1.5 }}>
            Names, emails, and addresses come over. Replies don&apos;t — everyone starts pending here, because this is a different invitation.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {sources.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: 'var(--paper, #FBF7EE)',
                border: '1px solid var(--line, rgba(14,13,11,0.14))',
                borderRadius: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #0E0D0B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(s.names ?? []).filter(Boolean).join(' & ') || s.domain}
                  {s.sibling && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: 'var(--peach-ink, #C6703D)', letterSpacing: '0.06em' }}>
                      SAME CELEBRATION
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)' }}>
                  {results[s.id] ?? (s.occasion ? s.occasion.replace(/-/g, ' ') : s.domain)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyFrom(s.id)}
                disabled={busyId !== null || results[s.id]?.startsWith('✓')}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none',
                  background: results[s.id]?.startsWith('✓') ? 'var(--cream-2, #F5EFE2)' : 'var(--ink, #0E0D0B)',
                  color: results[s.id]?.startsWith('✓') ? 'var(--ink-muted, #6F6557)' : 'var(--cream, #FBF7EE)',
                  fontSize: 12, fontWeight: 700,
                  cursor: busyId ? 'wait' : 'pointer',
                  fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                {busyId === s.id ? 'Copying…' : results[s.id]?.startsWith('✓') ? 'Done' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '10px 16px', borderRadius: 999,
            background: 'transparent', color: 'var(--ink-soft, #3A332C)',
            border: '1px solid var(--line, rgba(14,13,11,0.14))',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** Nudge strip + Pear-drafted composer modal. Two voices: the
 *  opened-but-quiet funnel line, and — when the host set an RSVP
 *  deadline that's now inside two weeks — the deadline line,
 *  which widens recipients to EVERY pending guest. */
function NudgeStrip({
  count,
  recipients,
  siteId,
  onSeePending,
  deadline,
}: {
  count: number;
  recipients: Guest[];
  siteId: string;
  onSeePending: () => void;
  /** Set when the manifest's RSVP deadline is near. */
  deadline?: { label: string; daysLeft: number };
}) {
  const [open, setOpen] = useState(false);
  const deadlineWhen = deadline
    ? deadline.daysLeft === 0 ? 'today'
    : deadline.daysLeft === 1 ? 'tomorrow'
    : `in ${deadline.daysLeft} days`
    : null;
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(135deg, rgba(251,232,214,0.85) 0%, rgba(232,224,240,0.65) 100%)',
          border: '1px solid rgba(198,112,61,0.28)',
          borderRadius: 12,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--peach-ink, #C6703D)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12.5, color: 'var(--ink, #0E0D0B)', flex: 1 }}>
          {deadline ? (
            <>
              Your RSVP deadline ({deadline.label}) is <strong style={{ fontWeight: 700 }}>{deadlineWhen}</strong>
              {' — '}
              <strong style={{ fontWeight: 700 }}>{count}</strong> {count === 1 ? 'guest hasn’t' : 'guests haven’t'} replied.
            </>
          ) : (
            <>
              <strong style={{ fontWeight: 700 }}>{count}</strong>
              {' '}
              {count === 1 ? 'guest opened' : 'guests opened'} the invite but haven&apos;t replied. Ready for a nudge.
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: 'var(--peach-ink, #C6703D)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✦ Send a nudge
        </button>
        <button
          type="button"
          onClick={onSeePending}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            color: 'var(--peach-ink, #C6703D)',
            border: 'none',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          See pending →
        </button>
      </div>
      {open && (
        <NudgeComposer
          siteId={siteId}
          recipients={recipients}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NudgeComposer({
  siteId,
  recipients,
  onClose,
}: {
  siteId: string;
  recipients: Guest[];
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  const [drafting, setDrafting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<number | null>(null);

  // Auto-fire Pear draft on open. Skip when we already have a body
  // (the host re-opens to send to a different selection).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/guests/draft-nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, pendingCount: recipients.length }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { body?: string } | null) => {
        if (cancelled) return;
        if (data?.body) setBody(data.body);
      })
      .catch(() => { /* keep textarea empty so the host can write their own */ })
      .finally(() => { if (!cancelled) setDrafting(false); });
    return () => { cancelled = true; };
  }, [siteId, recipients.length]);

  async function send() {
    if (busy) return;
    if (!body.trim()) {
      setError('Write a body first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/guests/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestIds: recipients.map((g) => g.id),
          bodyText: body,
        }),
      });
      const data = (await r.json()) as { sent?: number; error?: string };
      if (!r.ok) throw new Error(data.error ?? `Failed (${r.status})`);
      setSent(data.sent ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send a nudge"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.5)',
        backdropFilter: 'blur(8px)',
        zIndex: 360,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(540px, 100%)',
          background: 'var(--card, #FBF7EE)',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 32px 60px rgba(14,13,11,0.4)',
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
            }}
          >
            Pear&apos;s nudge
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 22,
              margin: '4px 0 0',
              color: 'var(--ink, #0E0D0B)',
              lineHeight: 1.2,
            }}
          >
            {sent !== null
              ? `Nudge sent to ${sent} ${sent === 1 ? 'guest' : 'guests'}.`
              : `To ${recipients.length} ${recipients.length === 1 ? 'guest' : 'guests'}`}
          </h3>
          {sent === null && (
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft, #3A332C)', margin: '6px 0 0', lineHeight: 1.5 }}>
              Pear drafted a body in your voice. Edit anything you want, then send.
              Each email lands in the recipient&apos;s inbox with their personal RSVP link.
            </p>
          )}
        </div>

        {sent === null && (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder={drafting ? 'Pear is drafting…' : 'Write your nudge…'}
              maxLength={4000}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid rgba(14,13,11,0.14)',
                background: 'var(--paper, #FBF7EE)',
                fontSize: 13.5,
                color: 'var(--ink, #0E0D0B)',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                minHeight: 120,
              }}
              disabled={drafting}
            />
            {/* Recipient preview row — first 3 names + count. */}
            <div style={{ fontSize: 11, color: 'var(--ink-muted, #6F6557)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>RECIPIENTS:</span>
              {recipients.slice(0, 3).map((g) => (
                <span key={g.id}>{g.n.split(' ')[0]}</span>
              ))}
              {recipients.length > 3 && <span>+ {recipients.length - 3} more</span>}
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  padding: '8px 12px',
                  background: 'rgba(122,45,45,0.08)',
                  border: '1px solid rgba(122,45,45,0.22)',
                  borderRadius: 8,
                  color: '#7A2D2D',
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {sent !== null ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 999,
                background: 'var(--ink, #0E0D0B)',
                color: 'var(--cream, #FBF7EE)',
                border: 'none',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={send}
                disabled={busy || drafting || !body.trim()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: busy || drafting || !body.trim() ? 'var(--cream-2, #F5EFE2)' : 'var(--ink, #0E0D0B)',
                  color: busy || drafting || !body.trim() ? 'var(--ink-muted, #6F6557)' : 'var(--cream, #FBF7EE)',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy ? 'wait' : drafting ? 'wait' : !body.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {busy ? 'Sending…' : `Send to ${recipients.length}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                style={{
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: 'transparent',
                  color: 'var(--ink-soft, #3A332C)',
                  border: '1px solid var(--line, rgba(14,13,11,0.14))',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline email lifecycle pips: 📨 sent → ✓ delivered → 👁 opened.
 *  Bounced overrides the chain with a single terra pip. Each pip
 *  is small (~6px) so the row stays visually quiet. Hovering any
 *  pip shows its exact timestamp. */
function EmailTrackingStrip({
  sentAt,
  deliveredAt,
  openedAt,
  bouncedAt,
}: {
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  bouncedAt: string | null;
}) {
  if (bouncedAt) {
    return (
      <div
        style={{
          fontSize: 10,
          color: PD.terra,
          fontWeight: 700,
          letterSpacing: '0.04em',
          marginTop: 1,
        }}
        title={`Bounced ${new Date(bouncedAt).toLocaleString()}`}
      >
        ⚠ bounced — wrong address?
      </div>
    );
  }
  type Pip = { label: string; ts: string | null; tone: string };
  const pips: Pip[] = [
    { label: 'sent', ts: sentAt, tone: '#9A9488' },
    { label: 'delivered', ts: deliveredAt, tone: '#9A9488' },
    { label: 'opened', ts: openedAt, tone: PD.olive },
  ];
  if (!pips.some((p) => p.ts)) return null;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        marginTop: 2,
        fontSize: 9.5,
        color: '#9A9488',
        letterSpacing: '0.04em',
      }}
    >
      {pips.map((p, i) => {
        const lit = !!p.ts;
        return (
          <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              aria-hidden
              title={p.ts ? `${p.label} ${new Date(p.ts).toLocaleString()}` : `not ${p.label} yet`}
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: lit ? p.tone : 'rgba(14,13,11,0.12)',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            />
            {lit && (
              <span style={{ color: p.tone, fontWeight: 600 }}>{p.label}</span>
            )}
            {i < pips.length - 1 && lit && <span aria-hidden style={{ opacity: 0.4 }}>→</span>}
          </span>
        );
      })}
    </div>
  );
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const rsvpMap: Record<RsvpKey, { bg: string; fg: string; label: string }> = {
  yes: { bg: '#E6EAC8', fg: PD.oliveDeep, label: 'Yes' },
  no: { bg: '#F1D7CE', fg: PD.plum, label: 'No' },
  maybe: { bg: '#F4E1BC', fg: PD.gold, label: 'Maybe' },
  pending: { bg: '#E6DFC9', fg: '#6A6A56', label: 'Pending' },
};

/* Delegates to the shared normaliser so this page, the Analytics
   funnel and /api/dashboard/sites-stats can never disagree on what
   counts as "coming". */
function normaliseStatus(s: string): RsvpKey {
  return normaliseRsvpStatus(s);
}

function shapeGuest(g: ApiGuest): Guest {
  const tags: string[] = [];
  if (g.dietaryRestrictions) tags.push('dietary');
  if (g.plusOne) tags.push('plus-one');
  const status = normaliseStatus(g.status);
  const invitedAt = g.invitedAt ?? g.createdAt ?? null;
  const stale = isStale(invitedAt, status);
  const opened = !!g.emailOpenedAt && status === 'pending';
  if (stale) tags.push('stale');
  if (opened) tags.push('opened');
  return {
    id: g.id,
    n: g.name,
    em: g.email || '—',
    party: g.plusOne ? `${g.name.split(' ')[0]} + 1${g.plusOneName ? ` (${g.plusOneName})` : ''}` : g.name,
    rsvp: status,
    meal: g.mealPreference || '—',
    dietary: (g.dietaryRestrictions ?? '').trim(),
    note:
      (g.dietaryRestrictions ? `${g.dietaryRestrictions}. ` : '') + (g.message ?? ''),
    tags,
    invitedAt,
    respondedAt: g.respondedAt,
    emailSentAt: g.emailSentAt ?? null,
    emailDeliveredAt: g.emailDeliveredAt ?? null,
    emailOpenedAt: g.emailOpenedAt ?? null,
    emailBouncedAt: g.emailBouncedAt ?? null,
    plusOneAllowed: !!g.plusOneAllowed,
    token: g.guestToken ?? null,
    phone: g.phone ?? '',
    stale,
    opened,
    eventIds: g.eventIds ?? [],
  };
}

export function DashGuests() {
  const { site, loading: siteLoading } = useSelectedSite();
  const { sites } = useUserSites();
  // Tagged result so loading + error + rows all derive from
  // a single state value — no setState-in-effect cascade.
  type GuestsResult = {
    siteId: string;
    rows: Guest[] | null;  // null = no site selected branch
    error: string | null;
  };
  const [result, setResult] = useState<GuestsResult | null>(null);
  // 'stale' is a virtual filter — not on the row's RSVP status,
  // but on its lifecycle (invited >7d ago, no response). Lives
  // alongside the rsvp keys so the same pill UI handles both.
  const [filter, setFilter] = useState<RsvpKey | 'all' | 'stale' | 'dupes'>('all');
  const [q, setQ] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  /* Bulk SMS invites (Twilio server-side). Arm-then-confirm in
     the button itself; 503 from the route = Twilio not configured
     yet, surfaced as a plain sentence. */
  const [smsState, setSmsState] = useState<'idle' | 'armed' | 'sending'>('idle');
  const [smsNote, setSmsNote] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Per-guest invite-link sharing (copy / email / text / QR).
  const [shareGuest, setShareGuest] = useState<Guest | null>(null);
  const [copyAllNote, setCopyAllNote] = useState<string | null>(null);

  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;
    const currentSiteId = site.id;
    fetch(`/api/guests?siteId=${encodeURIComponent(currentSiteId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { guests?: ApiGuest[] }) => {
        if (cancelled) return;
        setResult({
          siteId: currentSiteId,
          rows: (data.guests ?? []).map(shapeGuest),
          error: null,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setResult({
          siteId: currentSiteId,
          rows: null,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [site?.id, refreshKey]);

  // Derived from the tagged result. `loading` is true until the
  // fetch for the current site.id lands.
  const loading = site?.id ? (result?.siteId !== site.id) : false;
  const rows = result?.rows ?? null;
  const error = result?.error ?? null;

  const counts = useMemo(() => {
    const base = { all: 0, yes: 0, no: 0, maybe: 0, pending: 0, stale: 0, opened: 0, bounced: 0 };
    if (!rows) return base;
    base.all = rows.length;
    for (const g of rows) {
      base[g.rsvp] += 1;
      if (g.stale) base.stale += 1;
      if (g.opened) base.opened += 1;
      if (g.emailBouncedAt) base.bounced += 1;
    }
    return base;
  }, [rows]);

  // Per-event roster from the manifest. When a site has 2+ events
  // (rehearsal dinner / ceremony / reception / brunch), the host
  // gets a headcount strip per event so caterers / venues / bars
  // can plan from real numbers instead of "everyone's coming".
  const events = useMemo<ManifestEvent[]>(() => {
    const m = site?.manifest as { events?: ManifestEvent[] } | undefined | null;
    return Array.isArray(m?.events) ? m!.events : [];
  }, [site?.manifest]);

  // RSVP-deadline awareness — the wizard/editor stamp
  // logistics.rsvpDeadline; once it's inside two weeks the nudge
  // strip switches to deadline voice and widens its recipients
  // from "opened but quiet" to every pending guest with an email.
  // Lazy-init timestamp: render-pure, fresh enough for day math.
  const [nowTs] = useState(() => Date.now());
  const rsvpDeadline = useMemo(() => {
    const m = site?.manifest as { logistics?: { rsvpDeadline?: string } } | undefined | null;
    const iso = m?.logistics?.rsvpDeadline;
    const match = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
    if (!match) return null;
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(d.getTime())) return null;
    return {
      daysLeft: Math.round((d.getTime() - nowTs) / 86_400_000),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }, [site?.manifest, nowTs]);
  const showPerEvent = events.length > 1;
  // For each event, count how many "yes" guests have it on their
  // selected list. Only attending guests count — declined guests
  // technically have an event_ids array but they're not coming, so
  // including them would be misleading.
  const perEventCounts = useMemo(() => {
    const out: Record<string, { yes: number; maybe: number }> = {};
    if (!rows || !showPerEvent) return out;
    for (const ev of events) out[ev.id] = { yes: 0, maybe: 0 };
    for (const g of rows) {
      if (g.rsvp !== 'yes' && g.rsvp !== 'maybe') continue;
      const ids = g.eventIds.length > 0 ? g.eventIds : events.map((e) => e.id);
      for (const id of ids) {
        if (!out[id]) continue;
        out[id][g.rsvp] += 1;
      }
    }
    return out;
  }, [rows, events, showPerEvent]);

  // Possible-duplicate detection — a guest list assembled from a
  // CSV + hand-adds + open RSVPs that minted their own row drifts
  // into near-duplicates ("Jon" / "John Smith", an email entered
  // twice). We GROUP them and flag — never auto-merge.
  const duplicateIds = useMemo(() => {
    if (!rows || rows.length < 2) return new Set<string>();
    const groups = findDuplicateGroups(rows.map((g) => ({ id: g.id, name: g.n, email: g.em })));
    const ids = new Set<string>();
    for (const grp of groups) for (const id of grp) ids.add(id);
    return ids;
  }, [rows]);

  /* Caterer summary — meal choices + dietary notes tallied across
     everyone who's coming (the v2 "The count" sidebar). Real data
     only; the panel hides when no one has picked a meal or flagged a
     dietary need yet (honesty rule). */
  const cater = useMemo(() => {
    const meals = new Map<string, number>();
    const diets = new Map<string, number>();
    for (const g of rows ?? []) {
      if (g.rsvp !== 'yes') continue;
      if (g.meal && g.meal !== '—') meals.set(g.meal, (meals.get(g.meal) ?? 0) + 1);
      if (g.dietary) {
        // Split "tree nuts, shellfish" into individual flags.
        for (const raw of g.dietary.split(/[,;·]/)) {
          const d = raw.trim();
          if (d) {
            const key = d.charAt(0).toUpperCase() + d.slice(1);
            diets.set(key, (diets.get(key) ?? 0) + 1);
          }
        }
      }
    }
    const byCount = (a: [string, number], b: [string, number]) => b[1] - a[1];
    return {
      meals: [...meals.entries()].sort(byCount),
      diets: [...diets.entries()].sort(byCount),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(
      (g) => {
        const rsvpMatch =
          filter === 'all' ? true
          : filter === 'stale' ? g.stale
          : filter === 'dupes' ? duplicateIds.has(g.id)
          : g.rsvp === filter;
        const queryMatch = q === '' || (g.n + g.em + g.note + g.tags.join(' ')).toLowerCase().includes(q.toLowerCase());
        return rsvpMatch && queryMatch;
      }
    );
  }, [rows, filter, q, duplicateIds]);

  if (!siteLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="guests" title="Guests" subtitle="Create a site first, then invite guests.">
        <EmptyShell message="Create a site first, then invite guests." />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="guests" title="Guests" subtitle="Pick a site from the top-right menu to see its guests.">
        <EmptyShell message="Pick a site from the top-right menu to see its guests." />
      </DashLayout>
    );
  }

  const siteName = siteDisplayName(site);
  const phoneCount = (rows ?? []).filter((g) => g.phone).length;
  const sendTextInvites = async () => {
    if (!site?.id || smsState === 'sending') return;
    setSmsState('sending');
    setSmsNote(null);
    try {
      const r = await fetch('/api/guests/text-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id }),
      });
      const data = await r.json().catch(() => ({})) as { sent?: number; failed?: number; error?: string; note?: string };
      if (!r.ok) throw new Error(data.error ?? `Failed (${r.status})`);
      setSmsNote(
        (data.sent ?? 0) > 0
          ? `✓ Texted ${data.sent} ${data.sent === 1 ? 'guest' : 'guests'}${data.failed ? ` · ${data.failed} failed` : ''}`
          : (data.note ?? 'Everyone with a phone has already been texted.'),
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSmsNote(err instanceof Error ? err.message : 'Texting failed.');
    } finally {
      setSmsState('idle');
    }
  };
  /* A guest's personal invite link — site URL + their ?g= token.
     Opening it shows the addressed envelope, auto-recognizes them
     in the RSVP modal, and passes the invitation-only gate. */
  const guestLink = (g: Guest): string | null => {
    if (!g.token || !site?.domain) return null;
    return buildSiteUrl(site.domain, '', undefined, site.occasion) + `?g=${encodeURIComponent(g.token)}`;
  };
  const copyAllLinks = async () => {
    const lines = (rows ?? [])
      .map((g) => { const l = guestLink(g); return l ? `${g.n} — ${l}` : null; })
      .filter((x): x is string => !!x);
    if (lines.length === 0) {
      setCopyAllNote('No personal links yet — add or import guests first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyAllNote(`✓ Copied ${lines.length} personal ${lines.length === 1 ? 'link' : 'links'}.`);
    } catch {
      setCopyAllNote('Couldn’t copy — your browser blocked clipboard access.');
    }
    window.setTimeout(() => setCopyAllNote(null), 4000);
  };
  const capacity = Math.max(rows?.length ?? 0, counts.yes + counts.pending + counts.maybe, 1);
  const hasGuests = (rows?.length ?? 0) > 0;
  const copy = guestCopy(site?.occasion);
  const solemn = copy.solemn;
  // The 5th roster column only renders when the guest row actually
  // carries a distinct field for it (meal). Presets whose fifthKey is
  // the merged note would just duplicate the Note column — drop the
  // column entirely for those occasions instead of a row of "—".
  const showFifth = copy.fifthKey !== 'note';
  const rosterColumns = showFifth ? '1.3fr 1fr 0.7fr 1.5fr 90px' : '1.3fr 1fr 0.7fr 1.5fr';
  const guestListOnly = Boolean(
    (site?.manifest as { rsvpConfig?: { guestListOnly?: boolean } } | null)?.rsvpConfig?.guestListOnly,
  );

  return (
    <DashLayout
      active="guests"
      eyebrow="Guests"
      title={
        hasGuests ? (
          <span>
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {counts.yes}
            </i>{' '}
            {copy.verbComing},{' '}
            <i style={{ color: PD.gold, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {counts.maybe}
            </i>{' '}
            maybe,{' '}
            <i style={{ color: PD.plum, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              {counts.pending}
            </i>{' '}
            {copy.verbQuiet}.
          </span>
        ) : (
          <span>
            No guests{' '}
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              yet.
            </i>
          </span>
        )
      }
      subtitle={
        <>
          {copy.topSubtitle}
          {siteName ? ` · ${siteName}.` : '.'}
          {site?.occasion === 'memorial' || site?.occasion === 'funeral'
            ? ' Pear checks in quietly — no follow-ups unless you ask.'
            : ' Pear is following up on the quiet ones once a week.'}
        </>
      }
      actions={
        <>
          <Link href="/dashboard/guest-review" className="pl8-btnfx" style={{ ...btnGhost, textDecoration: 'none' }}>
            Pear&rsquo;s review
          </Link>
          {phoneCount > 0 && (
            <button
              className="pl8-btnfx" style={btnGhost}
              disabled={smsState === 'sending'}
              onClick={() => {
                if (smsState === 'armed') { setSmsState('idle'); void sendTextInvites(); }
                else { setSmsState('armed'); setSmsNote(null); window.setTimeout(() => setSmsState((cur) => (cur === 'armed' ? 'idle' : cur)), 4000); }
              }}
            >
              {smsState === 'sending' ? 'Texting…'
                : smsState === 'armed' ? `Text ${phoneCount} ${phoneCount === 1 ? 'guest' : 'guests'}?`
                : 'Text invites'}
            </button>
          )}
          {(sites?.length ?? 0) >= 2 && (
            <button className="pl8-btnfx" style={btnGhost} onClick={() => setCopyOpen(true)} disabled={!site?.id}>
              Copy from another event
            </button>
          )}
          {hasGuests && (
            <button className="pl8-btnfx" style={btnGhost} onClick={copyAllLinks}>Copy links</button>
          )}
          <button className="pl8-btnfx" style={btnGhost} onClick={() => setImportOpen(true)}>Import CSV</button>
          <button className="pl8-btnfx" style={btnInk} onClick={() => setAddOpen(true)} disabled={!site?.id}>
            ✦ Add a guest
          </button>
        </>
      }
    >
      <PLAtmosphere />
      {/* Roster / Submissions / Registry tabs come from the shell's
          DashSubNav — no in-page duplicate strip. */}
      <main
        className="pd-guests-main"
        style={{
          padding: '0 clamp(20px, 4vw, 40px) 32px',
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 300px',
          gap: 22,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* STATS */}
          <div
            className="pd-guests-stats pl8-dash-stagger"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${solemn ? 5 : 6},1fr)`, gap: 10 }}
          >
            {[
              { l: 'Invited', v: counts.all, c: PD.stone },
              { l: 'Yes', v: counts.yes, c: PD.olive },
              { l: 'Maybe', v: counts.maybe, c: PD.gold },
              { l: 'Pending', v: counts.pending, c: PD.plum },
              // Solemn events never surface the stale/no-reply framing —
              // "Pear checks in quietly — no follow-ups unless you ask."
              ...(solemn ? [] : [{ l: 'Stale', v: counts.stale, c: PD.terra, hint: '> 7 days, no reply' }]),
              { l: 'Declined', v: counts.no, c: PD.stone },
            ].map((s) => (
              <Panel key={s.l} bg={PD.paperCard} style={{ padding: '14px 16px' }}>
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 6 }}>
                  {s.l.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 34,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      background: PD.paper3,
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (s.v / capacity) * 100)}%`,
                        height: '100%',
                        background: s.c,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          {/* PER-EVENT HEADCOUNT — only when there are 2+ events.
              Each card shows the event name + "X yes · Y maybe"
              so caterers + venues see the real numbers per moment. */}
          {showPerEvent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6, padding: '0 4px' }}>
                BY EVENT
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(4, events.length)}, 1fr)`,
                  gap: 10,
                }}
              >
                {events.map((ev) => {
                  const c = perEventCounts[ev.id] ?? { yes: 0, maybe: 0 };
                  return (
                    <Panel key={ev.id} bg={PD.paperCard} style={{ padding: '12px 14px' }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: PD.ink,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ev.name ?? 'Event'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                        <span
                          style={{
                            ...DISPLAY_STYLE,
                            fontSize: 26,
                            lineHeight: 1,
                            color: PD.olive,
                            fontWeight: 400,
                          }}
                        >
                          {c.yes}
                        </span>
                        <span style={{ fontSize: 11, color: '#6A6A56' }}>yes</span>
                        {c.maybe > 0 && (
                          <>
                            <span style={{ fontSize: 11, color: PD.gold, marginLeft: 8 }}>· {c.maybe} maybe</span>
                          </>
                        )}
                      </div>
                      {ev.time && (
                        <div style={{ fontSize: 10.5, color: '#9A9488', marginTop: 4 }}>
                          {ev.time}
                        </div>
                      )}
                    </Panel>
                  );
                })}
              </div>
            </div>
          )}

          {/* FOR THE CATERER — meal choices + dietary/allergy notes
              tallied across everyone coming (the v2 "The count"
              sidebar). Real data only; hidden until guests have
              actually picked meals or flagged dietary needs. */}
          {(cater.meals.length > 0 || cater.diets.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6, padding: '0 4px' }}>
                {solemn ? 'FOR THE MEAL COUNT' : 'FOR THE CATERER'}
              </div>
              <Panel bg={PD.paperCard} style={{ padding: '14px 16px' }}>
                {cater.meals.length > 0 && (
                  <div>
                    <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.7, marginBottom: 9 }}>MEALS CHOSEN</div>
                    {cater.meals.map(([m, n]) => (
                      <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ flex: 1, fontSize: 12.5, color: PD.ink }}>{m}</span>
                        <span style={{ ...MONO_STYLE, fontSize: 12, opacity: 1, color: PD.ink }}>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
                {cater.diets.length > 0 && (
                  <div style={{ marginTop: cater.meals.length > 0 ? 13 : 0 }}>
                    <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.7, marginBottom: 9 }}>DIETARY &amp; ALLERGIES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cater.diets.map(([d, n]) => (
                        <span key={d} style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 999, background: 'var(--pl-plum-mist, #EFE2E6)', color: 'var(--pl-plum, #7A2D40)' }}>
                          {d}{n > 1 ? ` · ${n}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* NUDGE — when N guests opened the invite but haven't
              replied, surface a one-line peach pill. Tapping
              "Send a nudge" opens the composer with Pear's draft
              pre-loaded and the recipient list set to those guests.
              "See pending" still filters the table for hosts who
              prefer to handle each one manually. */}
          {smsNote && (
            <div
              style={{
                padding: '9px 14px',
                borderRadius: 12,
                background: 'var(--sage-tint, rgba(122,138,79,0.12))',
                border: '1px solid rgba(92,107,63,0.25)',
                fontSize: 12.5,
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              {smsNote}
            </div>
          )}
          {copyAllNote && (
            <div
              style={{
                padding: '9px 14px',
                borderRadius: 12,
                background: 'var(--sage-tint, rgba(122,138,79,0.12))',
                border: '1px solid rgba(92,107,63,0.25)',
                fontSize: 12.5,
                color: 'var(--ink, #0E0D0B)',
              }}
            >
              {copyAllNote}
            </div>
          )}
          {!solemn && rows && (() => {
            const deadlineSoon = rsvpDeadline != null && rsvpDeadline.daysLeft >= 0 && rsvpDeadline.daysLeft <= 14;
            if (deadlineSoon && counts.pending > 0) {
              const pendingWithEmail = rows.filter((g) => g.rsvp === 'pending' && g.em);
              if (pendingWithEmail.length > 0) {
                return (
                  <NudgeStrip
                    count={pendingWithEmail.length}
                    recipients={pendingWithEmail}
                    deadline={rsvpDeadline}
                    siteId={site?.id ?? site?.domain ?? ''}
                    onSeePending={() => setFilter('pending')}
                  />
                );
              }
            }
            if (counts.opened > 0) {
              return (
                <NudgeStrip
                  count={counts.opened}
                  recipients={rows.filter((g) => g.opened)}
                  siteId={site?.id ?? site?.domain ?? ''}
                  onSeePending={() => setFilter('pending')}
                />
              );
            }
            return null;
          })()}

          {/* POSSIBLE DUPLICATES — a quiet lavender strip when the
              list has near-matches. Tapping filters the table to
              just those rows so the host can compare + clean up. */}
          {duplicateIds.size > 0 && filter !== 'dupes' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                background: 'var(--lavender-bg, rgba(232,224,240,0.6))',
                border: '1px solid var(--lavender-ink, rgba(124,108,150,0.3))',
                borderRadius: 12,
              }}
            >
              <span aria-hidden style={{ fontSize: 15, fontWeight: 700, color: 'var(--lavender-ink, #6E5E86)' }}>≈</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink, #0E0D0B)', flex: 1 }}>
                <strong style={{ fontWeight: 700 }}>{duplicateIds.size}</strong>{' '}
                {duplicateIds.size === 1 ? 'guest looks' : 'guests look'} like possible duplicates — same email or a near-identical name.
              </span>
              <button
                type="button"
                onClick={() => setFilter('dupes')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'var(--lavender-ink, #6E5E86)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Review them →
              </button>
            </div>
          )}

          {/* TABLE */}
          <Panel bg={PD.paper} padding={0} style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '12px 14px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {([
                { k: 'all', l: `All · ${counts.all}` },
                { k: 'yes', l: `Yes · ${counts.yes}` },
                { k: 'pending', l: `Pending · ${counts.pending}` },
                ...(solemn ? [] : [{ k: 'stale' as const, l: `Stale · ${counts.stale}` }]),
                { k: 'maybe', l: `Maybe · ${counts.maybe}` },
                { k: 'no', l: `No · ${counts.no}` },
                ...(duplicateIds.size > 0 ? [{ k: 'dupes' as const, l: `Duplicates · ${duplicateIds.size}` }] : []),
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setFilter(t.k)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 999,
                    background: filter === t.k ? PD.ink : 'transparent',
                    color: filter === t.k ? PD.paper : PD.ink,
                    border: `1px solid ${filter === t.k ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {t.l}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: PD.paper3,
                  borderRadius: 999,
                  padding: '5px 12px',
                  border: '1px solid rgba(31,36,24,0.1)',
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.5, fontFamily: '"Fraunces", Georgia, serif' }}>
                  ✦
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, tag, or note"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    width: 200,
                    color: PD.ink,
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '28px 24px' }}>
                <DashSkeleton kind="list" count={6} label="Threading your guest list" />
              </div>
            ) : error ? (
              <div style={{ padding: 40, color: PD.terra, fontSize: 13 }}>
                Couldn&rsquo;t load guests: {error}
              </div>
            ) : !hasGuests ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 22,
                    fontStyle: 'italic',
                    color: PD.olive,
                    marginBottom: 10,
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  No guests yet.
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: PD.inkSoft,
                    maxWidth: 420,
                    margin: '0 auto',
                    lineHeight: 1.5,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {copy.emptyHint}
                </div>
              </div>
            ) : (
              <div className="pl8-content-fade-in">
                <div
                  className="pd-guests-head"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: rosterColumns,
                    padding: '10px 18px',
                    background: PD.paper3,
                    borderBottom: '1px solid rgba(31,36,24,0.08)',
                  }}
                >
                  {['Guest', 'Party', 'RSVP', 'Note', ...(showFifth ? [copy.fifthColumn] : [])].map((h) => (
                    <div key={h} style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
                      {h.toUpperCase()}
                    </div>
                  ))}
                </div>
                {filtered.map((g, i) => {
                  const r = rsvpMap[g.rsvp];
                  return (
                    <div
                      key={g.id}
                      className="pd-guests-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: rosterColumns,
                        padding: '14px 18px',
                        borderBottom:
                          i < filtered.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 99,
                            background: `hsl(${(i * 47) % 360} 30% 72%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: PD.ink,
                            fontFamily: '"Fraunces", Georgia, serif',
                            fontStyle: 'italic',
                          }}
                        >
                          {g.n.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13.5,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {g.token ? (
                              <a
                                href={`/g/${g.token}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'inherit', textDecoration: 'none' }}
                                title="Open this guest's personal page"
                              >
                                {g.n}
                              </a>
                            ) : g.n}
                            {duplicateIds.has(g.id) && (
                              <span
                                title="A near-identical name or email is also on your list"
                                style={{
                                  flexShrink: 0,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  color: 'var(--lavender-ink, #6E5E86)',
                                  background: 'var(--lavender-bg, rgba(232,224,240,0.7))',
                                  border: '1px solid var(--lavender-ink, rgba(124,108,150,0.3))',
                                  borderRadius: 999,
                                  padding: '1px 7px',
                                }}
                              >
                                ≈ dup?
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#6A6A56',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              // Wrap the action pills (Invite/Resend/Remove)
                              // to a second line instead of clipping
                              // "Remove" when the cell is narrow.
                              flexWrap: 'wrap',
                              rowGap: 4,
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{g.em}</span>
                            {guestLink(g) && (
                              <button
                                type="button"
                                onClick={() => setShareGuest(g)}
                                title="Share this guest's personal invite link"
                                style={{
                                  flexShrink: 0,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: 'var(--sage-deep, #5C6B3F)',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                  border: '1px solid rgba(92,107,63,0.35)',
                                  borderRadius: 999,
                                  padding: '1px 8px',
                                }}
                              >
                                Invite ↗
                              </button>
                            )}
                            <GuestRowActions
                              siteId={site.id}
                              guest={g}
                              onChanged={() => setRefreshKey((k) => k + 1)}
                            />
                          </div>
                          {(g.invitedAt || g.respondedAt) && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: g.stale ? PD.terra : '#9A9488',
                                marginTop: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {g.invitedAt && (
                                <span title={`Invited ${new Date(g.invitedAt).toLocaleString()}`}>
                                  Invited {relativeTime(g.invitedAt)}
                                </span>
                              )}
                              {g.invitedAt && g.respondedAt && <span aria-hidden>·</span>}
                              {g.respondedAt && (
                                <span title={`Replied ${new Date(g.respondedAt).toLocaleString()}`}>
                                  Replied {relativeTime(g.respondedAt)}
                                </span>
                              )}
                              {g.stale && !g.respondedAt && (
                                <span
                                  style={{
                                    color: PD.terra,
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  · stale
                                </span>
                              )}
                            </div>
                          )}
                          {/* Email tracking pips — sent → delivered →
                              opened → clicked. Each pip lights up
                              when the timestamp lands. Bounced shows
                              a single peach pip + "bounced" label
                              instead of the chain (the message
                              never made it). */}
                          {(g.emailSentAt || g.emailDeliveredAt || g.emailOpenedAt || g.emailBouncedAt) && (
                            <EmailTrackingStrip
                              sentAt={g.emailSentAt}
                              deliveredAt={g.emailDeliveredAt}
                              openedAt={g.emailOpenedAt}
                              bouncedAt={g.emailBouncedAt}
                            />
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 13 }}>{g.party}</div>
                      <div>
                        <span
                          style={{
                            ...MONO_STYLE,
                            fontSize: 10,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: r.bg,
                            color: r.fg,
                            // r.fg is a var(--pd-*) string now — alpha
                            // suffixes can't be concatenated onto it.
                            border: `1px solid color-mix(in oklab, ${r.fg} 15%, transparent)`,
                          }}
                        >
                          {r.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: PD.inkSoft,
                          lineHeight: 1.4,
                          fontFamily: 'var(--pl-font-body)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {g.note ? <span>{g.note}</span> : !showPerEvent || g.eventIds.length === 0 || g.eventIds.length === events.length ? (
                          <span style={{ opacity: 0.3 }}>—</span>
                        ) : null}
                        {/* Event chips — only when the guest opted INTO a
                            specific subset (skipped at least one event).
                            Default-all selections render as the dash
                            instead of a noisy full-row of chips. */}
                        {showPerEvent && g.eventIds.length > 0 && g.eventIds.length < events.length && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {events.filter((ev) => g.eventIds.includes(ev.id)).slice(0, 4).map((ev) => (
                              <span
                                key={ev.id}
                                style={{
                                  ...MONO_STYLE,
                                  fontSize: 9,
                                  padding: '2px 7px',
                                  borderRadius: 999,
                                  background: 'rgba(139,156,90,0.18)',
                                  color: PD.oliveDeep,
                                }}
                              >
                                {ev.name ?? 'Event'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 5th column — the field guestCopy names via
                          fifthKey. Rendered only when it's a real,
                          distinct row field (see showFifth above). */}
                      {showFifth && (
                        <div
                          style={{
                            fontSize: 12,
                            textTransform: 'capitalize',
                            color: '#6A6A56',
                          }}
                        >
                          {g[copy.fifthKey]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT insights */}
        <div
          className="pd-guests-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'sticky',
            top: 72,
          }}
        >
          {/* Who can reply — surfaces the guest-list-only gate and,
              when a list exists but replies are still open,
              recommends locking it down. Keyed by site so it resets
              when the host switches celebrations. */}
          {site?.id && (
            <WhoCanReplyPanel
              key={site.id}
              siteId={site.id}
              initial={guestListOnly}
              guestCount={counts.all}
            />
          )}

          <Panel
            bg={PD.ink}
            style={{
              color: PD.paper,
              padding: 18,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 16,
            }}
          >
            <div
              style={{ position: 'absolute', top: -14, right: -10, opacity: 0.18, pointerEvents: 'none' }}
              aria-hidden
            >
              <Sprig size={120} color="var(--cream)" accent="var(--gold)" />
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  marginBottom: 8,
                }}
              >
                Pear noticed
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 18,
                  lineHeight: 1.35,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  marginBottom: 12,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {counts.pending > 0
                  ? solemn
                    ? `${counts.pending} ${counts.pending === 1 ? 'guest hasn’t' : 'guests haven’t'} replied. Pear is leaving them be — no follow-ups unless you ask.`
                    : `${counts.pending} ${counts.pending === 1 ? 'guest hasn’t' : 'guests haven’t'} replied. Want me to send a gentle nudge?`
                  : counts.yes === 0
                  ? 'No RSVPs yet. Want me to send the invitation?'
                  : 'Everyone accounted for. Nice.'}
              </div>
              {!solemn && counts.pending > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('pending')}
                  style={{
                    background: PD.paperCard,
                    color: PD.ink,
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Draft the reminder
                </button>
              )}
            </div>
          </Panel>

          <Panel
            bg="var(--peach-bg)"
            style={{ padding: 18, border: 'none', borderRadius: 16 }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--peach-ink)',
                marginBottom: 8,
              }}
            >
              Soft insights
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 12,
                color: PD.ink,
              }}
            >
              Small things{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                matter
              </span>
              .
            </div>
            <Insight label="Dietary notes" n={rows?.filter((r) => r.tags.includes('dietary')).length ?? 0} total="guests" />
            <Insight label="Plus-ones confirmed" n={rows?.filter((r) => r.tags.includes('plus-one') && r.rsvp === 'yes').length ?? 0} total="guests" />
            <Insight label="Messages left" n={rows?.filter((r) => r.note.length > 0).length ?? 0} total="notes" />
          </Panel>

          {/* Lavender "try the guest RSVP" preview link — mirrors the
              prototype's bottom-right paper card. Opens the actual
              published site so the host can experience what guests see. */}
          {site?.domain && (
            <Link
              href={`/sites/${site.domain}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                borderRadius: 14,
                background: 'var(--card, var(--cream-2))',
                border: '1px solid var(--line-soft)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--lavender-bg)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
                aria-hidden
              >
                <Icon name="eye" size={16} color="var(--lavender-ink)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>Try the guest RSVP</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                  See what guests fill in
                </div>
              </div>
              <Icon name="arrow-right" size={14} color="var(--ink-soft)" />
            </Link>
          )}
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-guests-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-guests-right) {
            position: relative !important;
            top: auto !important;
          }
        }
        @media (max-width: 760px) {
          :global(.pd-guests-stats) {
            grid-template-columns: 1fr 1fr !important;
          }
          /* Phones keep Guest (name + email + Text-invite) and the
             RSVP STATUS — the two columns that answer "who's coming".
             Previously this kept Guest + Party and hid RSVP (col 3),
             so the status — the whole point — was invisible on a
             phone. Now hide Party (2), Note (4) and the 5th column;
             RSVP (3) sits at auto width beside the name. */
          :global(.pd-guests-head),
          :global(.pd-guests-row) {
            grid-template-columns: 1fr auto !important;
          }
          :global(.pd-guests-head) > *:nth-child(2),
          :global(.pd-guests-row) > *:nth-child(2),
          :global(.pd-guests-head) > *:nth-child(4),
          :global(.pd-guests-row) > *:nth-child(4),
          :global(.pd-guests-head) > *:nth-child(5),
          :global(.pd-guests-row) > *:nth-child(5) {
            display: none;
          }
        }
      `}</style>

      {/* CSV import — opens modal, refreshes guest list on close. */}
      <GuestImportDialog
        siteId={site.id}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
      {addOpen && (
        <AddGuestDialog
          siteId={site.id}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      {shareGuest && guestLink(shareGuest) && (
        <InviteShareDialog
          name={shareGuest.n}
          link={guestLink(shareGuest)!}
          email={shareGuest.em && shareGuest.em !== '—' ? shareGuest.em : null}
          phone={shareGuest.phone || null}
          siteName={siteName}
          onClose={() => setShareGuest(null)}
        />
      )}
      {copyOpen && site?.id && (
        <CopyGuestsDialog
          destId={site.id}
          destCelebrationId={
            (site.manifest as { celebration?: { id?: string } } | null)?.celebration?.id ?? null
          }
          sites={(sites ?? []).map((s) => ({
            id: s.id,
            domain: s.domain,
            names: s.names ?? null,
            occasion: s.occasion,
            manifest: s.manifest,
          }))}
          onClose={() => setCopyOpen(false)}
          onCopied={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </DashLayout>
  );
}

// ── GuestRowActions ───────────────────────────────────────────
// Per-row "Resend invite" (re-emails the personal link) + "Remove"
// (arm-then-confirm delete). Small, quiet, lives next to the
// per-guest Invite button.
function GuestRowActions({
  siteId,
  guest,
  onChanged,
}: {
  siteId: string;
  guest: Guest;
  onChanged: () => void;
}) {
  const hasEmail = !!guest.em && guest.em !== '—';
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [removeArmed, setRemoveArmed] = useState(false);
  const [removing, setRemoving] = useState(false);
  // Optimistic local mirror of the host's plus-one grant.
  const [plusAllowed, setPlusAllowed] = useState(guest.plusOneAllowed);
  const [plusBusy, setPlusBusy] = useState(false);

  async function togglePlus() {
    if (plusBusy) return;
    const next = !plusAllowed;
    setPlusBusy(true);
    setPlusAllowed(next); // optimistic
    try {
      const res = await fetch('/api/guests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: guest.id, plusOneAllowed: next }),
      });
      if (!res.ok) setPlusAllowed(!next); // revert on failure
      else onChanged();
    } catch {
      setPlusAllowed(!next);
    } finally {
      setPlusBusy(false);
    }
  }

  async function doResend() {
    if (resend === 'sending' || !hasEmail) return;
    setResend('sending');
    try {
      const res = await fetch('/api/guests/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, guestId: guest.id }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; sent?: boolean; error?: string };
      setResend(res.ok && d.ok !== false ? 'sent' : 'error');
      window.setTimeout(() => setResend('idle'), 2600);
    } catch {
      setResend('error');
      window.setTimeout(() => setResend('idle'), 2600);
    }
  }

  async function doRemove() {
    if (removing) return;
    if (!removeArmed) {
      setRemoveArmed(true);
      window.setTimeout(() => setRemoveArmed((a) => (a ? false : a)), 4000);
      return;
    }
    setRemoving(true);
    try {
      await fetch(`/api/guests?id=${encodeURIComponent(guest.id)}`, { method: 'DELETE' });
      onChanged();
    } catch {
      setRemoving(false);
      setRemoveArmed(false);
    }
  }

  const pill: CSSProperties = {
    flexShrink: 0, fontSize: 10, fontWeight: 700, background: 'transparent',
    cursor: 'pointer', fontFamily: 'inherit', borderRadius: 999, padding: '1px 8px',
  };

  return (
    <>
      <button
        type="button"
        onClick={togglePlus}
        disabled={plusBusy}
        aria-pressed={plusAllowed}
        title={plusAllowed ? 'This guest may bring a plus-one — tap to revoke' : 'Allow this guest to bring a plus-one'}
        style={{
          ...pill,
          color: plusAllowed ? '#fff' : 'var(--ink-soft, #3A332C)',
          background: plusAllowed ? 'var(--sage-deep, #5C6B3F)' : 'transparent',
          border: `1px solid ${plusAllowed ? 'var(--sage-deep, #5C6B3F)' : 'var(--line, rgba(14,13,11,0.18))'}`,
          opacity: plusBusy ? 0.6 : 1,
        }}
      >
        {plusAllowed ? '+1 ✓' : '+1'}
      </button>
      {hasEmail && (
        <button
          type="button"
          onClick={doResend}
          disabled={resend === 'sending'}
          title="Email this guest their personal invite again"
          style={{ ...pill, color: 'var(--ink-soft, #3A332C)', border: '1px solid var(--line, rgba(14,13,11,0.18))' }}
        >
          {resend === 'sending' ? 'Sending…' : resend === 'sent' ? 'Sent ✓' : resend === 'error' ? 'Failed' : 'Resend'}
        </button>
      )}
      <button
        type="button"
        onClick={doRemove}
        disabled={removing}
        title="Remove this guest"
        style={{
          ...pill,
          color: removeArmed ? '#fff' : 'var(--ink-muted, #6F6557)',
          background: removeArmed ? '#7A2D2D' : 'transparent',
          border: `1px solid ${removeArmed ? '#7A2D2D' : 'var(--line, rgba(14,13,11,0.18))'}`,
        }}
      >
        {removing ? 'Removing…' : removeArmed ? 'Confirm?' : 'Remove'}
      </button>
    </>
  );
}

// ── AddGuestDialog ────────────────────────────────────────────
// Lightweight modal that posts to POST /api/guests with the host's
// inputs and asks DashGuests to refresh on success. Kept local to
// the page since the only consumer is this one button — no need
// for a shared primitive yet.
function AddGuestDialog({
  siteId,
  onClose,
  onAdded,
}: {
  siteId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  // One guest or a couple — a couple becomes TWO guest rows added
  // together, each with their own reply link (and optional email),
  // so each half of the pair can RSVP for themselves.
  const [mode, setMode] = useState<'single' | 'couple'>('single');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [name2, setName2] = useState('');
  const [email2, setEmail2] = useState('');
  // The host's plus-one GRANT (guests.plus_one_allowed) — opens the
  // "Bringing a guest?" field on their RSVP. Distinct from plus_one,
  // the guest's own answer.
  const [plusOneAllowed, setPlusOneAllowed] = useState(false);
  // Auto-invite by default — adding a guest with an email sends them
  // their personal invite link right away. Uncheck to just add them
  // to the list and invite later.
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Returning-guest recognition — once the email looks complete,
     ask /api/guests/person-history whether this person has
     celebrated with the host before (own-sites-only privacy
     boundary lives server-side). Debounced; purely a hint. */
  const [known, setKnown] = useState<{
    history: Array<{ domain: string; names: string[]; occasion: string | null; status: string | null }>;
    dietary: string | null;
  } | null>(null);

  useEffect(() => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setKnown(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/guests/person-history?siteId=${encodeURIComponent(siteId)}&email=${encodeURIComponent(e)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: null | { known?: boolean; history?: Array<{ domain: string; names: string[]; occasion: string | null; status: string | null }>; dietary?: string | null }) => {
          if (data?.known) setKnown({ history: data.history ?? [], dietary: data.dietary ?? null });
          else setKnown(null);
        })
        .catch(() => { /* recognition is a nicety */ });
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [email, siteId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function postGuest(guestName: string, guestEmail: string) {
    const res = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        name: guestName,
        email: guestEmail || undefined,
        plusOneAllowed,
        sendInvite: sendInvite && !!guestEmail,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Failed (${res.status})`);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (mode === 'couple' && !name2.trim()) {
      setError('Both names are needed for a couple.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postGuest(name.trim(), email.trim());
      if (mode === 'couple') {
        try {
          await postGuest(name2.trim(), email2.trim());
        } catch (err) {
          // The first row landed; don't retry it. Tell the host
          // exactly who still needs adding.
          throw new Error(
            `${name.trim()} was added, but ${name2.trim()} wasn't (${err instanceof Error ? err.message : 'error'}). Add them again on their own.`,
          );
        }
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add guest.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add a guest"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.46)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 600,
        padding: 16,
        animation: 'pl-enter-fade-in 200ms ease both',
      }}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: PD.paperCard,
          borderRadius: 18,
          padding: '24px 24px 20px',
          boxShadow: '0 28px 60px rgba(14,13,11,0.32)',
          fontFamily: 'var(--pl-font-body)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10,
              letterSpacing: '0.22em',
              color: PD.terra,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Add {mode === 'couple' ? 'a couple' : 'a guest'}
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 24,
              margin: 0,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {mode === 'couple' ? 'Two names, side by side.' : 'One name at a time.'}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: PD.inkSoft, lineHeight: 1.5 }}>
            {mode === 'couple'
              ? 'Each gets their own reply link, so they can each answer for themselves.'
              : 'We’ll mark them as pending — Pear can email when you’re ready, or they can RSVP through the link.'}
          </p>
        </div>

        {/* One guest / a couple — two rows added together. */}
        <div role="radiogroup" aria-label="Guest or couple" style={{ display: 'flex', gap: 6 }}>
          {([['single', 'One guest'], ['couple', 'A couple']] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className="pl8-btnfx"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: mode === m ? `1px solid ${PD.olive}` : '1px solid rgba(31,36,24,0.14)',
                background: mode === m ? 'rgba(92,107,63,0.10)' : 'transparent',
                color: mode === m ? PD.olive : PD.inkSoft,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: PD.ink }}>{mode === 'couple' ? 'First name' : 'Name'}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Alex"
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: PD.ink }}>{mode === 'couple' ? 'Their email' : 'Email'} <span style={{ color: PD.inkSoft, fontWeight: 400, opacity: 0.7 }}>(optional)</span></span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@example.com"
            style={inputStyle}
          />
        </label>

        {mode === 'couple' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: PD.ink }}>Second name</span>
              <input
                value={name2}
                onChange={(e) => setName2(e.target.value)}
                placeholder="Sam Rivera"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: PD.ink }}>Their email <span style={{ color: PD.inkSoft, fontWeight: 400, opacity: 0.7 }}>(optional — can share one)</span></span>
              <input
                type="email"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                placeholder="sam@example.com"
                style={inputStyle}
              />
            </label>
          </>
        )}

        {known && (
          <div
            style={{
              fontSize: 12.5,
              color: PD.ink,
              background: 'rgba(92,107,63,0.10)',
              border: '1px solid rgba(92,107,63,0.25)',
              padding: '9px 12px',
              borderRadius: 10,
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontWeight: 700, color: PD.olive }}>✓ A familiar face.</span>{' '}
            {known.history.length > 0
              ? `They've celebrated with you before — ${known.history
                  .slice(0, 2)
                  .map((h) => h.names.filter(Boolean).join(' & ') || h.domain)
                  .join(', ')}${known.history.length > 2 ? ` +${known.history.length - 2} more` : ''}.`
              : 'Pearloom already knows this guest.'}
            {known.dietary && (
              <span style={{ display: 'block', color: PD.inkSoft, marginTop: 2 }}>
                Known dietary note: {known.dietary}
              </span>
            )}
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(31,36,24,0.04)',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={plusOneAllowed}
            onChange={(e) => setPlusOneAllowed(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: PD.olive }}
          />
          <span style={{ fontSize: 13, color: PD.ink }}>
            Allow a plus-one
            <span style={{ display: 'block', fontSize: 11, color: PD.inkSoft }}>
              {mode === 'couple' ? 'Each of them gets a "bringing a guest?" field when they RSVP.' : 'They get a "bringing a guest?" field when they RSVP.'}
            </span>
          </span>
        </label>

        {(() => {
          const anyEmail = !!email.trim() || (mode === 'couple' && !!email2.trim());
          return (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: anyEmail ? 'rgba(92,107,63,0.08)' : 'rgba(31,36,24,0.04)',
                borderRadius: 10,
                cursor: anyEmail ? 'pointer' : 'default',
                opacity: anyEmail ? 1 : 0.55,
              }}
            >
              <input
                type="checkbox"
                checked={sendInvite && anyEmail}
                disabled={!anyEmail}
                onChange={(e) => setSendInvite(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: PD.olive }}
              />
              <span style={{ fontSize: 13, color: PD.ink }}>
                Email them their invite now
                <span style={{ display: 'block', fontSize: 11, color: PD.inkSoft }}>
                  {anyEmail ? 'Sends each personal RSVP link right away.' : 'Add an email to enable.'}
                </span>
              </span>
            </label>
          );
        })()}

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 12,
              color: '#7A2D2D',
              background: 'rgba(122,45,45,0.08)',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} className="pl8-btnfx" style={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="pl8-btnfx" style={{ ...btnInk, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Adding…' : mode === 'couple' ? 'Add couple' : 'Add guest'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── InviteShareDialog ─────────────────────────────────────────
// One guest, four ways to get them their personal link: copy,
// email (mailto), text (sms), and a scannable/printable QR. The
// link is site URL + ?g=<token>; opening it shows the addressed
// envelope, auto-recognizes them in the RSVP modal, and passes
// the invitation-only gate. mailto:/sms: open the host's own
// mail/messages app — no provider config needed, works anywhere.
function InviteShareDialog({
  name,
  link,
  email,
  phone,
  siteName,
  onClose,
}: {
  name: string;
  link: string;
  email: string | null;
  phone: string | null;
  siteName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const celebration = siteName || 'our celebration';
  const subject = `You're invited — ${celebration}`;
  const body = `You're invited to ${celebration}! Everything's here, and you can RSVP from your personal link:\n\n${link}`;
  const mailto = `mailto:${email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const sms = `sms:${(phone ?? '').replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the field is still selectable */ }
  }

  // Serialize the on-screen QR <svg> to a PNG download. Colors are
  // passed to BrandedQR as literal hex below so the export needs no
  // CSS-var resolution.
  function downloadQr() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg || typeof document === 'undefined') return;
    const cloned = svg.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const xml = new XMLSerializer().serializeToString(cloned);
    const src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
    const img = new Image();
    img.onload = () => {
      const scale = 4;
      const vb = svg.viewBox.baseVal;
      const w = (vb && vb.width) || 240;
      const h = (vb && vb.height) || 240;
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FBF7EE';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'guest'}-invite-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = src;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Invite ${name}`}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(14,13,11,0.46)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        display: 'grid', placeItems: 'center', zIndex: 600, padding: 16,
        animation: 'pl-enter-fade-in 200ms ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: PD.paperCard,
          borderRadius: 18,
          padding: '24px 24px 20px',
          boxShadow: '0 28px 60px rgba(14,13,11,0.32)',
          fontFamily: 'var(--pl-font-body)',
          display: 'flex', flexDirection: 'column', gap: 14,
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        <div>
          <div style={{ ...MONO_STYLE, fontSize: 10, letterSpacing: '0.22em', color: PD.terra, textTransform: 'uppercase', marginBottom: 6 }}>
            Personal invite
          </div>
          <h2 style={{ ...DISPLAY_STYLE, fontSize: 23, margin: 0, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Invite {name.split(' ')[0]}.
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: PD.inkSoft, lineHeight: 1.5 }}>
            Their link opens the addressed envelope and lets them RSVP without searching — they&rsquo;re recognized instantly.
          </p>
        </div>

        {/* The link + copy */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            style={{ ...inputStyle, flex: 1, fontSize: 12 }}
          />
          <button type="button" onClick={copy} className="pl8-btnfx" style={{ ...btnInk, whiteSpace: 'nowrap' }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Channels */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={mailto} className="pl8-btnfx" style={{ ...btnGhost, textDecoration: 'none', flex: 1, textAlign: 'center', minWidth: 120 }}>
            ✉ Email{email ? '' : ' (add address)'}
          </a>
          <a href={sms} className="pl8-btnfx" style={{ ...btnGhost, textDecoration: 'none', flex: 1, textAlign: 'center', minWidth: 120 }}>
            ✆ Text
          </a>
        </div>

        {/* QR — scannable on screen + download for print / paper invites */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            padding: 16, borderRadius: 14,
            background: 'var(--paper, #FBF7EE)',
            border: '1px solid var(--line, rgba(14,13,11,0.12))',
          }}
        >
          <div ref={qrRef} style={{ lineHeight: 0 }}>
            <BrandedQR value={link} size={168} initials={initials} dark="#0E0D0B" light="#FBF7EE" accent="#C6703D" />
          </div>
          <button type="button" onClick={downloadQr} className="pl8-btnfx" style={{ ...btnGhost, fontSize: 12 }}>
            Download QR for print
          </button>
        </div>

        <button type="button" onClick={onClose} className="pl8-btnfx" style={{ ...btnGhost, alignSelf: 'flex-end' }}>
          Done
        </button>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: PD.paper,
  border: `1.5px solid ${PD.line}`,
  borderRadius: 10,
  fontSize: 13.5,
  color: PD.ink,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

// ── WhoCanReplyPanel ──────────────────────────────────────────
// Surfaces (and lets the host change) manifest.rsvpConfig.
// guestListOnly right from the guests dashboard — the same gate
// the editor's RSVP panel sets. Two states:
//   open           — anyone with the link can RSVP (default)
//   guest-list only — /api/rsvp only accepts invited emails /
//                     personal links
// When a guest list exists but replies are still open, the panel
// goes peach and recommends locking it down so strangers can't
// reply. Persists via PATCH /api/sites/rsvp-access (owner-gated,
// patches that one field — never races the editor autosave).
function WhoCanReplyPanel({
  siteId,
  initial,
  guestCount,
}: {
  siteId: string;
  initial: boolean;
  guestCount: number;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommend = guestCount > 0 && !value;

  async function change(next: boolean) {
    if (busy || next === value) return;
    const prev = value;
    setValue(next); // optimistic
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/sites/rsvp-access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, guestListOnly: next }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || data.ok === false) throw new Error(data.error ?? `Failed (${r.status})`);
    } catch (err) {
      setValue(prev); // roll back
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      bg={recommend ? 'var(--peach-bg)' : PD.paperCard}
      style={{ padding: 18, border: 'none', borderRadius: 16 }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: recommend ? 'var(--peach-ink)' : 'var(--ink-muted)',
          marginBottom: 8,
        }}
      >
        Who can reply
      </div>

      {/* Segmented control — the two access modes. */}
      <div
        role="group"
        aria-label="Who can reply to the RSVP"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          padding: 4,
          background: 'var(--card, var(--cream-2))',
          borderRadius: 999,
          border: '1px solid var(--line, rgba(14,13,11,0.12))',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {([
          { v: false, label: 'Anyone' },
          { v: true, label: 'Invited only' },
        ] as const).map((opt) => {
          const active = value === opt.v;
          return (
            <button
              key={String(opt.v)}
              type="button"
              aria-pressed={active}
              disabled={busy}
              onClick={() => change(opt.v)}
              style={{
                padding: '7px 10px',
                borderRadius: 999,
                border: 'none',
                background: active ? PD.ink : 'transparent',
                color: active ? PD.paper : PD.ink,
                fontSize: 12,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: PD.inkSoft, lineHeight: 1.5, margin: '10px 0 0' }}>
        {recommend ? (
          <>
            <strong style={{ fontWeight: 700, color: PD.ink }}>
              {guestCount} {guestCount === 1 ? 'person is' : 'people are'} on your list.
            </strong>{' '}
            Switch to <em>Invited only</em> so strangers with the link can&rsquo;t RSVP — only
            guests who find their name on your list get through.
          </>
        ) : value && guestCount === 0 ? (
          <>
            <strong style={{ fontWeight: 700, color: PD.terra }}>Your guest list is empty.</strong>{' '}
            With <em>Invited only</em> on and no guests, <strong>no one can reply yet</strong>. Add
            guests (or import a list) so they can find their name — or switch back to <em>Anyone</em>.
          </>
        ) : value ? (
          <>Only guests on your list can RSVP — they find and pick their name. Others see a gentle &ldquo;we couldn&rsquo;t find you&rdquo; note.</>
        ) : (
          <>Anyone with the link can RSVP. Good for casual or public events.</>
        )}
      </p>

      {error && (
        <div role="alert" style={{ fontSize: 11.5, color: PD.terra, marginTop: 8 }}>
          {error}
        </div>
      )}
    </Panel>
  );
}

function Insight({ label, n, total }: { label: string; n: number; total: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--card, var(--cream-2))',
        marginBottom: 7,
        fontSize: 12.5,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <span style={{ fontWeight: 700, color: PD.ink }}>
        {n} {n === 1 ? total.slice(0, -1) : total}
      </span>
      <span style={{ color: 'var(--ink-muted)' }}>{label}</span>
    </div>
  );
}
