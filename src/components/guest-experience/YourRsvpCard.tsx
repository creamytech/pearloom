'use client';

// ─────────────────────────────────────────────────────────────
// YourRsvpCard — the "what did I say again?" card on a guest's
// /g/[token] page. Surfaces the guest's current RSVP status as a
// big pill, with a one-tap toggle to switch yes / no / maybe and
// an expandable details drawer for plus-one, meal, dietary, etc.
//
// Persists through /api/rsvp's existing upsert path (matches by
// site_id + email). Optimistic update on click — the pill flips
// immediately, then the network call confirms in the background.
// On failure, the pill rolls back and a small error chip surfaces.
//
// "Pending" guests see a calmer copy ("We haven't heard from you
// yet — pick one →") so the card doesn't read as a confused
// state. Guests who've already replied see "You're going" /
// "You said no" / "You said maybe" with the last-updated time so
// they know the record is theirs.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

type Status = 'attending' | 'declined' | 'maybe' | 'pending';

interface RsvpEvent {
  id: string;
  name?: string;
  time?: string;
}

interface Props {
  /** Site UUID for /api/rsvp's onConflict match. */
  siteId: string;
  guestName: string;
  guestEmail: string | null;
  initialStatus: Status;
  /** Existing RSVP details — pre-fill the expand. */
  initial: {
    plusOne: boolean;
    plusOneName: string | null;
    mealPreference: string | null;
    dietaryRestrictions: string | null;
    message: string | null;
    /** Events the guest already opted into. Defaults to all events
     *  when the host hasn't sent a per-event RSVP yet. */
    selectedEventIds: string[];
  };
  /** ISO timestamp of last RSVP. Surfaced as "Updated 3h ago". */
  respondedAt: string | null;
  /** Multi-event roster from the manifest. When length > 1, the
   *  card shows a per-event checklist so the guest can opt in to
   *  the reception but skip the brunch. */
  events?: RsvpEvent[];
  /** Site theme accent for the active pill. */
  accent?: string;
  /** Heading font for the eyebrow + greeting (matches /g page). */
  headingFont?: string;
}

const STATUS_LABELS: Record<Status, string> = {
  attending: "You're going",
  declined:  "You said no",
  maybe:     "You said maybe",
  pending:   'Pick one to RSVP',
};

const STATUS_TONES: Record<Status, { fg: string; bg: string }> = {
  attending: { fg: 'var(--sage-deep, #6d7d3f)',   bg: 'rgba(139,156,90,0.18)' },
  declined:  { fg: 'var(--ink-muted, #8a8671)',   bg: 'rgba(14,13,11,0.06)' },
  maybe:     { fg: 'var(--lavender-ink, #6B5A8C)',bg: 'rgba(196,181,217,0.22)' },
  pending:   { fg: 'var(--peach-ink, #C6703D)',   bg: 'rgba(198,112,61,0.12)' },
};

export function YourRsvpCard({
  siteId,
  guestName,
  guestEmail,
  initialStatus,
  initial,
  respondedAt,
  events = [],
  accent = '#5C6B3F',
  headingFont = 'Playfair Display',
}: Props) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [expanded, setExpanded] = useState(false);
  const [plusOne, setPlusOne] = useState(initial.plusOne);
  const [plusOneName, setPlusOneName] = useState(initial.plusOneName ?? '');
  const [meal, setMeal] = useState(initial.mealPreference ?? '');
  const [dietary, setDietary] = useState(initial.dietaryRestrictions ?? '');
  const [message, setMessage] = useState(initial.message ?? '');
  // Default a guest who hasn't selected events to "all events"
  // so a one-tap "Going" reads as "going to everything" — they
  // narrow the selection only if they want to skip something.
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(
    initial.selectedEventIds.length > 0
      ? initial.selectedEventIds
      : events.map((e) => e.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(respondedAt);
  const showEventChecklist = events.length > 1;

  async function submit(nextStatus: Status, includeDetails = false) {
    if (busy) return;
    if (!guestEmail) {
      setError('Your invite is missing an email — ask the host to send a fresh link.');
      return;
    }
    const previous = status;
    setStatus(nextStatus);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName,
          email: guestEmail,
          status: nextStatus,
          plusOne: includeDetails ? plusOne : initial.plusOne,
          plusOneName: includeDetails ? plusOneName : initial.plusOneName,
          mealPreference: includeDetails ? meal : initial.mealPreference,
          dietaryRestrictions: includeDetails ? dietary : initial.dietaryRestrictions,
          message: includeDetails ? message : initial.message,
          // Always send the event list when the site has multiple
          // events — even on the first quick toggle — so the host's
          // per-event headcount stays accurate. Declined guests
          // send an empty array (they're not coming to anything).
          selectedEvents: showEventChecklist
            ? (nextStatus === 'declined' ? [] : selectedEventIds)
            : undefined,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Failed (${r.status})`);
      }
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setStatus(previous);
      setError(err instanceof Error ? err.message : 'Could not save your answer.');
    } finally {
      setBusy(false);
    }
  }

  const tone = STATUS_TONES[status];
  const firstName = guestName.split(' ')[0];

  return (
    <div
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--card, #ffffff)',
        borderRadius: '0.75rem',
        border: `1px solid ${accent}33`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontWeight: 700,
            color: accent,
          }}
        >
          Your RSVP
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontFamily: headingFont,
            fontWeight: 500,
            letterSpacing: '-0.005em',
            color: 'var(--ink, #2B2B2B)',
          }}
        >
          {STATUS_LABELS[status]}{firstName ? `, ${firstName}` : ''}.
        </h3>
        {savedAt && status !== 'pending' && (
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted, #9A9488)' }}>
            Updated {relativeTime(savedAt)}
          </span>
        )}
      </div>

      {/* Quick toggle — yes / maybe / no */}
      <div
        role="radiogroup"
        aria-label="Your answer"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}
      >
        {([
          { id: 'attending' as const, label: 'Going' },
          { id: 'maybe' as const,     label: 'Maybe' },
          { id: 'declined' as const,  label: "Can't make it" },
        ]).map((opt) => {
          const on = status === opt.id;
          const optTone = STATUS_TONES[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => void submit(opt.id, expanded)}
              disabled={busy}
              style={{
                padding: '0.7rem 0.5rem',
                borderRadius: '999px',
                border: on ? `1.5px solid ${optTone.fg}` : '1px solid rgba(14,13,11,0.12)',
                background: on ? optTone.bg : 'transparent',
                color: on ? optTone.fg : 'var(--ink, #2B2B2B)',
                fontSize: '0.85rem',
                fontWeight: on ? 700 : 500,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'background 160ms ease, border-color 160ms ease',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(122,45,45,0.08)',
            border: '1px solid rgba(122,45,45,0.22)',
            borderRadius: 8,
            fontSize: '0.8rem',
            color: '#7A2D2D',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          padding: '0.4rem 0.85rem',
          background: 'transparent',
          border: 'none',
          color: accent,
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {expanded ? 'Hide details' : 'Add details'} →
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Per-event checklist — multi-day events only. Default
              "all events" is shown as all-checked; toggling one off
              reads as "I'll skip the brunch" without forcing the
              guest to think about every event. */}
          {showEventChecklist && (
            <Field label="Which events?">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.map((ev) => {
                  const on = selectedEventIds.includes(ev.id);
                  return (
                    <button
                      type="button"
                      key={ev.id}
                      onClick={() => setSelectedEventIds((prev) =>
                        prev.includes(ev.id) ? prev.filter((id) => id !== ev.id) : [...prev, ev.id]
                      )}
                      aria-pressed={on}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: on ? `1.5px solid ${accent}` : '1px solid rgba(14,13,11,0.12)',
                        background: on ? `${accent}1f` : 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                        textAlign: 'left',
                        transition: 'background 160ms ease, border-color 160ms ease',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          flexShrink: 0,
                          border: on ? `1.5px solid ${accent}` : '1.5px solid rgba(14,13,11,0.2)',
                          background: on ? accent : 'transparent',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#FFFFFF',
                          fontSize: 11,
                          lineHeight: 1,
                        }}
                      >
                        {on && '✓'}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--ink, #2B2B2B)' }}>
                        {ev.name ?? 'Event'}
                      </span>
                      {ev.time && (
                        <span style={{ fontSize: 11, color: 'var(--ink-muted, #9A9488)', flexShrink: 0 }}>
                          {ev.time}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <Toggle
            label="Bringing a +1?"
            on={plusOne}
            onChange={(v) => setPlusOne(v)}
          />
          {plusOne && (
            <Field label="Plus-one name">
              <input
                type="text"
                value={plusOneName}
                onChange={(e) => setPlusOneName(e.target.value)}
                placeholder="Marco"
                style={inputStyle}
              />
            </Field>
          )}
          <Field label="Meal preference">
            <input
              type="text"
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              placeholder="Short rib · Halibut · Garden plate"
              style={inputStyle}
            />
          </Field>
          <Field label="Dietary notes">
            <input
              type="text"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Vegetarian. No nuts, please."
              style={inputStyle}
            />
          </Field>
          <Field label="Note to the hosts (optional)">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Can't wait. Tell Shauna the dress sounds perfect."
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
          </Field>
          <button
            type="button"
            onClick={() => void submit(status === 'pending' ? 'attending' : status, true)}
            disabled={busy}
            style={{
              alignSelf: 'flex-start',
              padding: '0.7rem 1.4rem',
              background: accent,
              color: 'var(--card, #ffffff)',
              border: 'none',
              borderRadius: 999,
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'var(--font-ui)',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Saving…' : 'Save details'}
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  background: 'var(--paper, #FBF7EE)',
  border: '1px solid rgba(14,13,11,0.14)',
  borderRadius: 8,
  fontSize: '0.9rem',
  color: 'var(--ink, #2B2B2B)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted, #9A9488)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.55rem 0.85rem',
        background: on ? 'rgba(139,156,90,0.15)' : 'rgba(14,13,11,0.04)',
        border: `1px solid ${on ? 'rgba(139,156,90,0.45)' : 'rgba(14,13,11,0.12)'}`,
        borderRadius: 8,
        fontSize: '0.85rem',
        cursor: 'pointer',
        color: 'var(--ink, #2B2B2B)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span>{label}</span>
      <span
        aria-hidden
        style={{
          width: 28,
          height: 16,
          borderRadius: 999,
          background: on ? 'var(--sage-deep, #6d7d3f)' : 'rgba(14,13,11,0.2)',
          position: 'relative',
          transition: 'background 160ms ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 14 : 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#FFFFFF',
            transition: 'left 160ms ease',
          }}
        />
      </span>
    </button>
  );
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
