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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (which: 'party' | 'dm', signal?: AbortSignal) => {
    try {
      const r = await fetch(`/api/messages?token=${encodeURIComponent(token)}&thread=${which}`, { cache: 'no-store', signal });
      if (!r.ok) return;
      const data = (await r.json()) as { messages?: ThreadMessage[]; canDm?: boolean };
      setMessages(data.messages ?? []);
      setCanDm(Boolean(data.canDm));
    } catch { /* polling — next tick retries */ }
  }, [token]);

  useEffect(() => {
    const ctrl = new AbortController();
    setMessages(null);
    void load(tab, ctrl.signal);
    const id = setInterval(() => void load(tab, ctrl.signal), POLL_MS);
    return () => { ctrl.abort(); clearInterval(id); };
  }, [tab, load]);

  // Pin to the latest message whenever the list grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

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
          <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--ink-muted, #6F6557)' }}>Threading…</div>
        ) : messages.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft, #3A332C)', padding: '14px 0' }}>
            {tab === 'dm'
              ? 'A private line to your hosts — ask anything, only they see it.'
              : 'Nothing yet. Begin a thread.'}
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
                  {m.body}
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

      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
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
          {sending ? 'Threading…' : 'Send'}
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
            {busy ? 'Threading…' : 'Count me in'}
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
