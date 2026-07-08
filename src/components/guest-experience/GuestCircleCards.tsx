'use client';

// ─────────────────────────────────────────────────────────────
// GuestCircleCards — the social layer of the guest passport.
//
//   <GuestThreadCard />        — event-scoped messaging. Two tabs:
//     "The thread" (every guest with a link, host-moderated) and
//     "Hosts" (the guest's private logistics line). Polls on the
//     BroadcastBar cadence; optimistic sends.
//
//   <CelebratedTogetherCard /> — opt-in connections. Default OFF;
//     turning it on shows first names of people you've celebrated
//     with before who are woven into this event too — and shows
//     YOU to them. Mutual opt-in enforced server-side.
//
// Both authenticate with the guest's own token (passport or /g/),
// themed via the same accent/headingFont props as sibling cards.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessagePings } from '@/lib/messages-realtime';

const POLL_MS = 25_000;
const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

interface ThreadMessage {
  id: string;
  sender: 'host' | 'guest';
  authorName: string;
  body: string;
  createdAt: string;
}

function timeLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const cardShell: React.CSSProperties = {
  background: 'var(--card, #FBF7EE)',
  border: '1px solid var(--line, rgba(14,13,11,0.10))',
  borderRadius: 18,
  padding: 'clamp(20px, 4vw, 28px)',
};

function Eyebrow({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>
      {children}
    </div>
  );
}

/* ── GuestThreadCard ─────────────────────────────────────────── */

export function GuestThreadCard({
  token, accent, headingFont, guestName, solemn = false,
}: {
  token: string;
  accent: string;
  headingFont: string;
  guestName: string;
  /** Memorial / funeral — softer copy, same machinery. */
  solemn?: boolean;
}) {
  const [tab, setTab] = useState<'party' | 'dm'>('party');
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [canDm, setCanDm] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rtChannel, setRtChannel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const load = useCallback(async (which: 'party' | 'dm', signal?: AbortSignal) => {
    try {
      const r = await fetch(`/api/messages?token=${encodeURIComponent(token)}&thread=${which}`, { cache: 'no-store', signal });
      if (!r.ok) return;
      const data = (await r.json()) as { messages?: ThreadMessage[]; canDm?: boolean; channel?: string };
      setMessages(data.messages ?? []);
      setCanDm(Boolean(data.canDm));
      if (data.channel) setRtChannel(data.channel);
    } catch { /* polling — next tick retries */ }
  }, [token]);

  useEffect(() => {
    const ctrl = new AbortController();
    setMessages(null);
    void load(tab, ctrl.signal);
    const id = setInterval(() => void load(tab, ctrl.signal), POLL_MS);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [tab, load]);

  /* Realtime — content-free pings flip a refetch; the 25s poll
     stays as the fallback for keyless deploys. */
  const ping = useMessagePings(rtChannel, () => void load(tabRef.current));

  // Pin to the latest message whenever the list grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  const [gifOpen, setGifOpen] = useState(false);

  /* A picked GIF sends as a message whose body IS the media URL —
     the renderer above swaps URL bodies for <img>. Same endpoint,
     same moderation, same realtime ping as text. */
  async function sendGif(url: string) {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, thread: 'party', body: url }),
      });
      const data = (await r.json()) as { ok?: boolean; message?: ThreadMessage; error?: string };
      if (!r.ok || !data.ok || !data.message) {
        setError(data.error ?? 'Could not send — try again?');
        return;
      }
      setMessages((prev) => [...(prev ?? []), data.message!]);
      setGifOpen(false);
      ping();
    } catch {
      setError('Could not send — try again?');
    } finally {
      setSending(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, thread: tab, body }),
      });
      const data = (await r.json()) as { ok?: boolean; message?: ThreadMessage; error?: string };
      if (!r.ok || !data.ok || !data.message) {
        setError(data.error ?? 'Could not send — try again?');
        return;
      }
      setMessages((prev) => [...(prev ?? []), data.message!]);
      setDraft('');
      ping();
    } catch {
      setError('Could not send — try again?');
    } finally {
      setSending(false);
    }
  }

  const tabs: Array<{ id: 'party' | 'dm'; label: string }> = [
    { id: 'party', label: solemn ? 'Among guests' : 'The thread' },
    ...(canDm ? [{ id: 'dm' as const, label: 'Hosts' }] : []),
  ];

  return (
    <div style={cardShell}>
      <Eyebrow accent={accent}>{solemn ? 'Words among guests' : 'The guest thread'}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink, #0E0D0B)' }}>
          {solemn ? 'Hold each other close.' : 'Everyone woven in, one thread.'}
        </div>
        {tabs.length > 1 && (
          <div style={{ display: 'inline-flex', gap: 4, padding: 3, background: 'var(--cream-2, rgba(14,13,11,0.04))', borderRadius: 999 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                style={{
                  padding: '5px 12px', borderRadius: 999, border: 0, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                  background: tab === t.id ? 'var(--ink, #0E0D0B)' : 'transparent',
                  color: tab === t.id ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          maxHeight: 320, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '4px 2px', marginBottom: 12,
        }}
      >
        {messages === null ? (
          <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--ink-muted, #6F6557)' }}>One moment…</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', padding: '14px 0' }}>
            {tab === 'dm'
              ? 'A private line to your hosts — ask anything, only they see it.'
              : 'No one here yet.'}
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender === 'guest' && m.authorName === guestName;
            const host = m.sender === 'host';
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '9px 13px',
                    borderRadius: 14,
                    background: mine
                      ? 'var(--ink, #0E0D0B)'
                      : host
                        ? 'color-mix(in oklab, ' + accent + ' 14%, var(--card, #FBF7EE))'
                        : 'var(--cream-2, rgba(14,13,11,0.04))',
                    color: mine ? 'var(--cream, #FBF7EE)' : 'var(--ink, #0E0D0B)',
                    border: host ? `1px solid color-mix(in oklab, ${accent} 30%, transparent)` : '1px solid var(--line-soft, rgba(14,13,11,0.06))',
                    fontSize: '0.86rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                >
                  {isGifBody(m.body) ? (
                     
                    <img
                      src={m.body}
                      alt={`GIF from ${m.authorName}`}
                      loading="lazy"
                      style={{ display: 'block', maxWidth: 220, width: '100%', borderRadius: 10 }}
                    />
                  ) : (
                    m.body
                  )}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--ink-muted, #6F6557)', marginTop: 3, display: 'flex', gap: 6 }}>
                  <span style={{ fontWeight: 600 }}>{host ? `${m.authorName} · hosts` : m.authorName}</span>
                  <span>{timeLabel(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {gifOpen && tab === 'party' && !solemn && (
        <GifPicker token={token} onPick={(url) => { void sendGif(url); }} onClose={() => setGifOpen(false)} />
      )}
      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        {tab === 'party' && !solemn && (
          <button
            type="button"
            aria-label="Add a GIF"
            aria-expanded={gifOpen}
            onClick={() => setGifOpen((o) => !o)}
            style={{
              flexShrink: 0, padding: '0 12px', borderRadius: 999,
              border: '1px solid var(--line, rgba(14,13,11,0.12))',
              background: gifOpen ? 'var(--ink, #0E0D0B)' : 'var(--cream-2, rgba(14,13,11,0.03))',
              color: gifOpen ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            GIF
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={tab === 'dm' ? 'Message your hosts…' : solemn ? 'Share a few words…' : 'Add to the thread…'}
          maxLength={2000}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 999,
            border: '1px solid var(--line, rgba(14,13,11,0.12))',
            background: 'var(--cream-2, rgba(14,13,11,0.03))',
            fontSize: '0.86rem', fontFamily: 'inherit', color: 'var(--ink, #0E0D0B)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          style={{
            padding: '10px 18px', borderRadius: 999, border: 'none',
            background: accent, color: 'var(--cream, #FBF7EE)',
            fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit',
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            opacity: draft.trim() && !sending ? 1 : 0.55,
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
      {error && (
        <div role="alert" style={{ fontSize: '0.74rem', color: 'var(--pl-plum, #7A2D2D)', marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}

/* ── CelebratedTogetherCard ──────────────────────────────────── */

export function CelebratedTogetherCard({
  token, accent, headingFont,
}: {
  token: string;
  accent: string;
  headingFont: string;
}) {
  const [state, setState] = useState<null | { available: boolean; optedIn: boolean; faces: Array<{ firstName: string }> }>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/guest/connections?token=${encodeURIComponent(token)}`, { cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: null | { available?: boolean; optedIn?: boolean; faces?: Array<{ firstName: string }> }) => {
        if (data) setState({ available: Boolean(data.available), optedIn: Boolean(data.optedIn), faces: data.faces ?? [] });
      })
      .catch(() => { /* the card simply doesn't render */ });
    return () => ctrl.abort();
  }, [token]);

  async function toggle(optIn: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/guest/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, optIn }),
      });
      if (!r.ok) return;
      // Re-read so faces compute server-side with the new flag.
      const refreshed = await fetch(`/api/guest/connections?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as { available?: boolean; optedIn?: boolean; faces?: Array<{ firstName: string }> };
        setState({ available: Boolean(data.available), optedIn: Boolean(data.optedIn), faces: data.faces ?? [] });
      }
    } finally {
      setBusy(false);
    }
  }

  // No render until we know — and never when the graph can't see
  // this guest (no email on the invite).
  if (!state || !state.available) return null;

  return (
    <div style={cardShell}>
      <Eyebrow accent={accent}>Celebrated together</Eyebrow>
      {!state.optedIn ? (
        <>
          <div style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink, #0E0D0B)', marginBottom: 4 }}>
            Familiar faces, if you&apos;d like.
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55, margin: '0 0 14px' }}>
            Turn this on and you&apos;ll see the first names of people you&apos;ve celebrated with
            before who are part of this one too — and they&apos;ll see yours. Only first names,
            only people who also opted in, off whenever you like.
          </p>
          <button
            type="button"
            onClick={() => void toggle(true)}
            disabled={busy}
            style={{
              padding: '10px 18px', borderRadius: 999, border: 'none',
              background: accent, color: 'var(--cream, #FBF7EE)',
              fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit',
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'One moment…' : 'Count me in'}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink, #0E0D0B)', marginBottom: 4 }}>
            {state.faces.length === 0
              ? 'You&#39;re visible to familiar faces.'
              : state.faces.length === 1
                ? 'One familiar face is here.'
                : `${state.faces.length} familiar faces are here.`}
          </div>
          {state.faces.length > 0 ? (
            <p style={{ fontSize: '0.86rem', color: 'var(--ink, #0E0D0B)', lineHeight: 1.6, margin: '0 0 10px' }}>
              You&apos;ve celebrated with{' '}
              <strong>{state.faces.slice(0, 5).map((f) => f.firstName).join(', ')}</strong>
              {state.faces.length > 5 ? ` and ${state.faces.length - 5} more` : ''} before — they&apos;re woven into this one too.
            </p>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55, margin: '0 0 10px' }}>
              No one you&apos;ve celebrated with has opted in here yet — when they do,
              their first names will appear.
            </p>
          )}
          <button
            type="button"
            onClick={() => void toggle(false)}
            disabled={busy}
            style={{
              padding: 0, border: 'none', background: 'transparent',
              fontSize: '0.74rem', color: 'var(--ink-muted, #6F6557)',
              textDecoration: 'underline', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Turn this off
          </button>
        </>
      )}
    </div>
  );
}

/* ── YourCircleCard ──────────────────────────────────────────
   The light friend layer (GRAND-PLAN Phase 4) on top of the
   opt-in connections base. Default-quiet: renders ONLY once the
   guest has opted in (via the Celebrated card above) AND there's
   someone to connect with — a friend, a pending request, or a
   familiar face they can add. First names only, consent-first
   (request → accept), off whenever they like. */

interface CircleState {
  available: boolean;
  optedIn: boolean;
  friends: Array<{ firstName: string }>;
  incoming: Array<{ firstName: string; otherId: string }>;
  candidates: Array<{ firstName: string; personId: string }>;
}

export function YourCircleCard({
  token, accent, headingFont, eventDateIso = null,
}: {
  token: string;
  accent: string;
  headingFont: string;
  /** SOCIAL-PLAN S5 — the post-event add-to-circle moment. After
   *  the day, the same consent-first card reframes as the keepsake:
   *  "keep the people from this day." Every guest is a latent
   *  circle member, seeded by a real shared day. */
  eventDateIso?: string | null;
}) {
  /* Clock sampled once per mount (lazy init) — the React Compiler
     contract; a stale midnight boundary is fine for a day-passed
     framing. */
  const [nowMs] = useState(() => Date.now());
  const eventPassed = (() => {
    const d = eventDateIso?.trim();
    if (!d) return false;
    const ms = Date.parse(d);
    return Number.isFinite(ms) && ms < nowMs - 86_400_000;
  })();
  const [state, setState] = useState<CircleState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch(`/api/guest/friends?token=${encodeURIComponent(token)}`, { cache: 'no-store', signal });
      if (!r.ok) return;
      const data = (await r.json()) as Partial<CircleState>;
      setState({
        available: Boolean(data.available),
        optedIn: Boolean(data.optedIn),
        friends: data.friends ?? [],
        incoming: data.incoming ?? [],
        candidates: data.candidates ?? [],
      });
    } catch { /* the card simply doesn't render */ }
  }, [token]);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function act(action: 'request' | 'accept' | 'decline', otherPersonId: string) {
    if (busyId) return;
    setBusyId(otherPersonId);
    try {
      const r = await fetch('/api/guest/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, otherPersonId }),
      });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
    }
  }

  // Quiet until we know — and never before the guest opts in, or when
  // there's simply no one woven in to show.
  if (!state || !state.available || !state.optedIn) return null;
  const { friends, incoming, candidates } = state;
  if (friends.length === 0 && incoming.length === 0 && candidates.length === 0) return null;

  const chip: React.CSSProperties = {
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 999,
    background: 'color-mix(in oklab, ' + accent + ' 12%, var(--card, #FBF7EE))',
    border: `1px solid color-mix(in oklab, ${accent} 26%, transparent)`,
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--ink, #0E0D0B)',
  };
  const smallBtn = (primary: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 999,
    border: primary ? 'none' : '1px solid var(--line, rgba(14,13,11,0.14))',
    background: primary ? accent : 'transparent',
    color: primary ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)',
    fontSize: '0.76rem',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: disabled ? 'wait' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div style={cardShell}>
      <Eyebrow accent={accent}>Your circle</Eyebrow>
      <div style={{ fontFamily: `"${headingFont}", Georgia, serif`, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink, #0E0D0B)', marginBottom: 4 }}>
        {eventPassed ? 'Keep the people from this day.' : 'People you\u2019ve woven in.'}
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', lineHeight: 1.55, margin: '0 0 16px' }}>
        {eventPassed
          ? 'The day is woven; the people don\u2019t have to unravel. First names only, both sides always choose.'
          : 'First names only, both sides always choose, off whenever you like.'}
      </p>

      {/* Requests addressed to you — accept or set aside. */}
      {incoming.length > 0 && (
        <div style={{ marginBottom: friends.length || candidates.length ? 18 : 0 }}>
          <div style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 8 }}>
            Would like to connect
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incoming.map((i) => (
              <li key={i.otherId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>{i.firstName}</span>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <button type="button" onClick={() => void act('accept', i.otherId)} disabled={busyId === i.otherId} style={smallBtn(true, busyId === i.otherId)}>
                    {busyId === i.otherId ? 'One moment…' : 'Accept'}
                  </button>
                  <button type="button" onClick={() => void act('decline', i.otherId)} disabled={busyId === i.otherId} style={smallBtn(false, busyId === i.otherId)}>
                    Not now
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Accepted friends — first-name chips. */}
      {friends.length > 0 && (
        <div style={{ marginBottom: candidates.length ? 18 : 0 }}>
          <div style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 8 }}>
            {friends.length === 1 ? 'One friend here' : `${friends.length} friends here`}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {friends.map((f, idx) => (
              <span key={`${f.firstName}-${idx}`} style={chip}>{f.firstName}</span>
            ))}
          </div>
        </div>
      )}

      {/* Familiar faces you can add — mutual-opt-in candidates only. */}
      {candidates.length > 0 && (
        <div>
          <div style={{ fontFamily: MONO, fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted, #6F6557)', marginBottom: 8 }}>
            Celebrated with before
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidates.map((c) => (
              <li key={c.personId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>{c.firstName}</span>
                <button type="button" onClick={() => void act('request', c.personId)} disabled={busyId === c.personId} style={smallBtn(true, busyId === c.personId)}>
                  {busyId === c.personId ? 'Adding…' : 'Add as a friend'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── GIFs in the thread ───────────────────────────────────────
   A message body that IS a GIPHY media URL renders as the GIF.
   Strict host allowlist — only giphy media subdomains pass, so
   pasted arbitrary URLs stay plain text. */
export function isGifBody(body: string): boolean {
  return /^https:\/\/media\d*\.giphy\.com\/\S+$/i.test(body.trim());
}

function GifPicker({ token, onPick, onClose }: { token: string; onPick: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [gifs, setGifs] = useState<Array<{ id: string; url: string; preview: string }>>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      setState('loading');
      void (async () => {
        try {
          const r = await fetch(`/api/giphy/search?token=${encodeURIComponent(token)}&q=${encodeURIComponent(q)}`);
          const data = (await r.json()) as { ok?: boolean; gifs?: Array<{ id: string; url: string; preview: string }> };
          if (cancelled) return;
          if (!data.ok) { setState('unavailable'); return; }
          setGifs(data.gifs ?? []);
          setState('idle');
        } catch {
          if (!cancelled) setState('unavailable');
        }
      })();
    }, q ? 350 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, token]);

  if (state === 'unavailable') return null; // keyless deploy — quietly absent

  return (
    <div
      style={{
        marginBottom: 8, padding: 10, borderRadius: 14,
        border: '1px solid var(--line, rgba(14,13,11,0.12))',
        background: 'var(--cream-2, rgba(14,13,11,0.03))',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIPHY…"
          autoFocus
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 999,
            border: '1px solid var(--line, rgba(14,13,11,0.12))',
            background: 'var(--card, #FBF7EE)', fontSize: '0.82rem',
            fontFamily: 'inherit', color: 'var(--ink, #0E0D0B)', outline: 'none',
          }}
        />
        <button
          type="button"
          aria-label="Close GIF picker"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-muted, #6F6557)', fontSize: 15, padding: '0 4px' }}
        >
          ×
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {state === 'loading' && gifs.length === 0 && (
          <div style={{ gridColumn: '1 / -1', fontSize: '0.72rem', color: 'var(--ink-muted, #6F6557)', textAlign: 'center', padding: 14 }}>
            One moment…
          </div>
        )}
        {gifs.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g.url)}
            style={{ padding: 0, border: 'none', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'var(--card, #FBF7EE)', aspectRatio: '4 / 3' }}
          >
            { }
            <img src={g.preview} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
      <div style={{ fontSize: '0.6rem', color: 'var(--ink-muted, #6F6557)', marginTop: 6, textAlign: 'right' }}>
        Powered by GIPHY
      </div>
    </div>
  );
}
