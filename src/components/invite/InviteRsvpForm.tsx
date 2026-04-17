'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/InviteRsvpForm.tsx
// Rich, editorial-voice RSVP for the guest invitation page.
// Posts to /api/rsvp with full field set: email, plusOne,
// plusOneName, mealPreference, dietaryRestrictions,
// songRequest, selectedEvents[], mailingAddress.
// Success state echoes back the guest's choices.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryManifest, WeddingEvent } from '@/types';

interface Props {
  manifest: StoryManifest | null;
  guestName: string;
  token: string;
  coupleNames: [string, string];
  events: WeddingEvent[];
}

const CREAM = '#FAF7F2';
const CREAM_DEEP = '#F0ECE3';
const INK = '#18181B';
const INK_SOFT = '#3A332C';
const MUTED = '#6F6557';
const GOLD = '#B8935A';
const GOLD_RULE = 'rgba(184,147,90,0.28)';
const GOLD_MIST = 'rgba(184,147,90,0.10)';
const CRIMSON = '#8B2D2D';
const OLIVE = '#5C6B3F';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

const LABEL_STYLE = {
  fontFamily: FONT_MONO,
  fontSize: '0.6rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  color: MUTED,
  display: 'block',
  marginBottom: 8,
};

const INPUT_STYLE = {
  width: '100%',
  padding: '12px 14px',
  background: CREAM,
  border: `1px solid ${GOLD_RULE}`,
  borderRadius: 2,
  color: INK,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const MEAL_OPTIONS = ['Chicken', 'Fish', 'Beef', 'Vegetarian', 'Vegan'];

export function InviteRsvpForm({
  manifest,
  guestName,
  token,
  coupleNames,
  events,
}: Props) {
  const siteId = manifest?.coupleId || manifest?.subdomain || '';
  const allEventIds = useMemo(() => events.map((e) => e.id), [events]);

  const [name, setName] = useState(guestName === 'Guest' ? '' : guestName);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'attending' | 'declined' | null>(null);
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(allEventIds);
  const [meal, setMeal] = useState('');
  const [dietary, setDietary] = useState('');
  const [song, setSong] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  // Prior-response hydration: when we find an existing RSVP for this
  // token, we land in "already responded" mode — a banner with a
  // single "Edit response" action instead of the form.
  const [priorRsvp, setPriorRsvp] = useState<null | {
    status: 'attending' | 'declined' | 'pending';
    respondedAt?: string;
  }>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/invite/rsvp?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.rsvp) return;
        const r = data.rsvp;
        setPriorRsvp({ status: r.status, respondedAt: r.respondedAt });
        setStatus(r.status === 'declined' ? 'declined' : 'attending');
        if (r.email) setEmail(r.email);
        setPlusOne(!!r.plusOne);
        if (r.plusOneName) setPlusOneName(r.plusOneName);
        if (r.mealPreference) setMeal(r.mealPreference);
        if (r.dietaryRestrictions) setDietary(r.dietaryRestrictions);
        if (r.songRequest) setSong(r.songRequest);
        if (r.message) setMessage(r.message);
        if (r.mailingAddress) setMailingAddress(r.mailingAddress);
        if (Array.isArray(r.selectedEvents) && r.selectedEvents.length > 0) {
          setSelectedEvents(r.selectedEvents);
        }
        if (data.guest?.name) setName(data.guest.name);
      })
      .catch(() => {
        /* non-fatal — fall back to blank form */
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const attending = status === 'attending';
  const showAttendingFields = attending;

  function toggleEvent(id: string) {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || status === null) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName: name.trim(),
          email: email.trim() || undefined,
          status,
          plusOne,
          plusOneName: plusOne ? plusOneName.trim() : undefined,
          mealPreference: attending ? meal || undefined : undefined,
          dietaryRestrictions: attending ? dietary.trim() || undefined : undefined,
          songRequest: attending ? song.trim() || undefined : undefined,
          selectedEvents: attending ? selectedEvents : [],
          mailingAddress: mailingAddress.trim() || undefined,
          message: message.trim() || undefined,
          inviteToken: token,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <SuccessCard
        attending={attending}
        name={name}
        coupleNames={coupleNames}
        plusOne={plusOne}
        plusOneName={plusOneName}
        meal={meal}
        selectedEventNames={events
          .filter((e) => selectedEvents.includes(e.id))
          .map((e) => e.name)}
      />
    );
  }

  const deadline = manifest?.logistics?.rsvpDeadline;

  if (priorRsvp && !editing) {
    return (
      <PriorResponseCard
        status={priorRsvp.status}
        respondedAt={priorRsvp.respondedAt}
        onEdit={() => setEditing(true)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.62rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: GOLD,
            margin: 0,
          }}
        >
          {deadline ? `Kindly respond by ${deadline}` : 'Kindly respond'}
        </p>
      </div>

      {/* Accept / Decline */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {([
          ['attending', 'Joyfully accept', OLIVE],
          ['declined', 'Regretfully decline', CRIMSON],
        ] as const).map(([v, label, color]) => {
          const on = status === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setStatus(v)}
              style={{
                padding: '14px 10px',
                background: on ? `${color}12` : CREAM,
                border: `1px solid ${on ? color : GOLD_RULE}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1rem',
                color: on ? color : INK_SOFT,
                transition: 'all 0.18s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Name + email */}
      <div style={{ marginBottom: 16 }}>
        <label style={LABEL_STYLE}>Your name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={LABEL_STYLE}>Email (for confirmation)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      {/* Attending-only fields */}
      <AnimatePresence initial={false}>
        {showAttendingFields && (
          <motion.div
            key="attending-fields"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {/* Plus-one */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '12px 14px',
                  background: plusOne ? GOLD_MIST : CREAM,
                  border: `1px solid ${GOLD_RULE}`,
                  borderRadius: 2,
                }}
              >
                <input
                  type="checkbox"
                  checked={plusOne}
                  onChange={(e) => setPlusOne(e.target.checked)}
                  style={{ accentColor: GOLD }}
                />
                <span style={{ fontSize: '0.9rem', color: INK_SOFT }}>
                  Bringing a plus-one
                </span>
              </label>
            </div>

            {plusOne && (
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL_STYLE}>Plus-one name</label>
                <input
                  type="text"
                  value={plusOneName}
                  onChange={(e) => setPlusOneName(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>
            )}

            {/* Events */}
            {events.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <span style={LABEL_STYLE}>Events you&rsquo;ll attend</span>
                <div style={{ display: 'grid', gap: 8 }}>
                  {events.map((e) => {
                    const on = selectedEvents.includes(e.id);
                    return (
                      <label
                        key={e.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          background: on ? GOLD_MIST : CREAM,
                          border: `1px solid ${GOLD_RULE}`,
                          borderRadius: 2,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleEvent(e.id)}
                          style={{ accentColor: GOLD }}
                        />
                        <span
                          style={{
                            fontSize: '0.88rem',
                            color: INK_SOFT,
                            fontFamily: FONT_DISPLAY,
                            fontStyle: 'italic',
                          }}
                        >
                          {e.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meal */}
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_STYLE}>Meal preference</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {MEAL_OPTIONS.map((m) => {
                  const on = meal === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMeal(on ? '' : m)}
                      style={{
                        padding: '8px 14px',
                        fontSize: '0.8rem',
                        fontFamily: FONT_MONO,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        background: on ? GOLD : CREAM,
                        color: on ? CREAM : INK_SOFT,
                        border: `1px solid ${GOLD_RULE}`,
                        borderRadius: 2,
                        cursor: 'pointer',
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dietary restrictions */}
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_STYLE}>Dietary restrictions</label>
              <input
                type="text"
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Allergies, aversions, etc."
                style={INPUT_STYLE}
              />
            </div>

            {/* Song request */}
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_STYLE}>Song request</label>
              <input
                type="text"
                value={song}
                onChange={(e) => setSong(e.target.value)}
                placeholder="A track that'll get you on the floor"
                style={INPUT_STYLE}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mailing address (for save-the-dates / thank-you cards) */}
      <div style={{ marginBottom: 16 }}>
        <label style={LABEL_STYLE}>Mailing address (optional)</label>
        <input
          type="text"
          value={mailingAddress}
          onChange={(e) => setMailingAddress(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 20 }}>
        <label style={LABEL_STYLE}>A note for the couple</label>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
      </div>

      {error && (
        <p
          style={{
            color: CRIMSON,
            fontSize: '0.85rem',
            margin: '0 0 14px',
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || status === null || !name.trim()}
        style={{
          width: '100%',
          padding: '16px',
          background: status && name.trim() ? INK : CREAM_DEEP,
          color: status && name.trim() ? CREAM : MUTED,
          border: `1px solid ${status && name.trim() ? INK : GOLD_RULE}`,
          borderRadius: 2,
          fontFamily: FONT_MONO,
          fontSize: '0.72rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          cursor: status && name.trim() && !loading ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? 'Sending…' : 'Send RSVP'}
      </button>
    </form>
  );
}

// ── Prior-response card (shown when an RSVP already exists) ──
function PriorResponseCard({
  status,
  respondedAt,
  onEdit,
}: {
  status: 'attending' | 'declined' | 'pending';
  respondedAt?: string;
  onEdit: () => void;
}) {
  const attending = status === 'attending';
  const label = attending
    ? 'You\u2019re on the list.'
    : status === 'declined'
      ? 'We\u2019ve noted you won\u2019t be able to make it.'
      : 'Your response is pending.';
  const respondedLabel = respondedAt
    ? new Date(respondedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        textAlign: 'center',
        padding: '28px 24px',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 2,
        background: CREAM,
      }}
    >
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.6rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: GOLD,
          margin: '0 0 16px',
        }}
      >
        Previously received
      </p>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
          color: INK,
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}
      >
        {label}
      </h3>
      {respondedLabel && (
        <p style={{ fontSize: '0.82rem', color: MUTED, margin: '0 0 24px' }}>
          Received {respondedLabel}
        </p>
      )}
      <button
        type="button"
        onClick={onEdit}
        style={{
          padding: '12px 24px',
          background: CREAM,
          border: `1px solid ${INK}`,
          borderRadius: 2,
          color: INK,
          fontFamily: FONT_MONO,
          fontSize: '0.7rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Edit my response
      </button>
    </motion.div>
  );
}

// ── Success card ────────────────────────────────────────────
interface SuccessProps {
  attending: boolean;
  name: string;
  coupleNames: [string, string];
  plusOne: boolean;
  plusOneName: string;
  meal: string;
  selectedEventNames: string[];
}

function SuccessCard({
  attending,
  name,
  coupleNames,
  plusOne,
  plusOneName,
  meal,
  selectedEventNames,
}: SuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        textAlign: 'center',
        padding: '32px 24px',
        border: `1px solid ${GOLD_RULE}`,
        borderRadius: 2,
        background: CREAM,
      }}
    >
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.6rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: GOLD,
          margin: '0 0 16px',
        }}
      >
        Your reply, confirmed
      </p>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
          color: INK,
          margin: '0 0 16px',
          lineHeight: 1.15,
        }}
      >
        {attending
          ? `We can\u2019t wait to celebrate with you, ${name.split(' ')[0]}.`
          : 'Thank you for letting us know.'}
      </h3>

      {attending && (
        <div
          style={{
            margin: '20px auto 0',
            maxWidth: 380,
            textAlign: 'left',
          }}
        >
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px 16px',
              fontSize: '0.85rem',
            }}
          >
            <dt style={{ ...LABEL_STYLE, margin: 0 }}>Guest</dt>
            <dd style={{ margin: 0, color: INK_SOFT }}>{name}</dd>
            {plusOne && (
              <>
                <dt style={{ ...LABEL_STYLE, margin: 0 }}>Plus-one</dt>
                <dd style={{ margin: 0, color: INK_SOFT }}>
                  {plusOneName || 'Confirmed'}
                </dd>
              </>
            )}
            {meal && (
              <>
                <dt style={{ ...LABEL_STYLE, margin: 0 }}>Meal</dt>
                <dd style={{ margin: 0, color: INK_SOFT }}>{meal}</dd>
              </>
            )}
            {selectedEventNames.length > 0 && (
              <>
                <dt style={{ ...LABEL_STYLE, margin: 0 }}>Events</dt>
                <dd style={{ margin: 0, color: INK_SOFT }}>
                  {selectedEventNames.join(', ')}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      <div
        style={{
          width: 32,
          height: 1,
          background: GOLD,
          margin: '24px auto 16px',
        }}
      />
      <p
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: '0.95rem',
          color: MUTED,
          margin: 0,
        }}
      >
        With love,
        <br />
        {coupleNames.filter(Boolean).join(' & ')}
      </p>
    </motion.div>
  );
}
