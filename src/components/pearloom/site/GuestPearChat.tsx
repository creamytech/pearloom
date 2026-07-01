'use client';

// ─────────────────────────────────────────────────────────────
// GuestPearChat — the floating "Ask Pear" pill at the bottom-
// right of every published Pearloom site. A visitor taps it,
// types a question ("where do I park?", "what's the dress code?"),
// and Pear replies in two sentences using only the manifest.
//
// Calls /api/pear-chat with mode='guest' so the server selects
// the concierge system prompt (no patches, no editing — just
// hospitable answers). Streams the response token-by-token so
// the chat feels live.
//
// Hides on the editor canvas (editMode prop) since the host has
// the floating advisor up top. Hides on /g/[token] too — the
// personal page is its own conversation surface.
//
// Bottom-right corner stacking policy (shared with
// site/StickyRsvpPill.tsx + pearloom/site/DayOfBroadcastDock.tsx):
//   GuestPearChat      z 160  (this file — topmost)
//   StickyRsvpPill     z 150
//   DayOfBroadcastDock z 140
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { PearThinking } from '../pear-thinking';

interface Props {
  manifest: StoryManifest;
  coupleNames: [string, string];
  /** When the visitor is on /g/[token] we know exactly who they
   *  are. Pear gets their RSVP status + seat + dietary so it can
   *  answer "what time should I get there?" with their context
   *  baked in instead of generic copy. */
  guest?: {
    name: string;
    status?: 'attending' | 'declined' | 'maybe' | 'pending';
    seat?: string | null;
    dietary?: string[] | null;
    selectedEventNames?: string[] | null;
  };
  /** When set on the public site, GuestPearChat self-resolves
   *  the visitor's identity from a `?g=<passport>` (or `?guest=`)
   *  URL param via /api/sites/guest-passport — same path
   *  PersonalGuestGreeting uses. Lets a guest who clicks "view
   *  the full site" from /g/[token] get the same personalized
   *  concierge there too, without anything mounted twice. */
  domain?: string;
}

interface Message {
  id: string;
  role: 'user' | 'pear';
  content: string;
}

const BASE_STARTER_PROMPTS = [
  'Where do I park?',
  "What's the dress code?",
  'How do I RSVP?',
];

/* The fourth chip routes by occasion — "What time's the ceremony?"
   only fits events whose schedule genuinely centers a ceremony or
   service (ceremonial + solemn voices: weddings, memorials, baptisms,
   bar/bat mitzvahs, …). A birthday or bachelor party just starts. */
function scheduleStarterPrompt(occasion: string | undefined): string {
  const voice = getEventType(occasion ?? 'wedding')?.voice;
  return voice === 'ceremonial' || voice === 'solemn'
    ? "What time's the ceremony?"
    : 'What time does it start?';
}

export function GuestPearChat({ manifest, coupleNames, guest, domain }: Props) {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedGuest, setResolvedGuest] = useState<Props['guest'] | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // When mounted on /sites/[domain] without an explicit guest prop,
  // try to self-resolve from `?g=<token>` so guests who arrived via
  // their personal link get the same concierge they had on /g/[token].
  useEffect(() => {
    if (guest || !domain || typeof window === 'undefined') return;
    const params = new URL(window.location.href).searchParams;
    const token = params.get('g') || params.get('guest');
    if (!token) return;
    const ctrl = new AbortController();
    fetch(`/api/sites/guest-passport?siteSlug=${encodeURIComponent(domain)}&token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: null | { guest?: { name?: string; table?: string; meal?: string; dietary?: string; attending?: boolean | null } }) => {
        // Shape validation: require at least a non-empty `name` on the guest
        // payload. Malformed tokens or partial responses should be treated as
        // "no resolved guest" rather than silently producing generic answers.
        const name = data?.guest?.name;
        if (!data || !data.guest || typeof name !== 'string' || !name.trim()) {
          setResolvedGuest(null);
          return;
        }
        const g = data.guest;
        const status: 'attending' | 'declined' | 'pending' =
          g.attending === true ? 'attending' : g.attending === false ? 'declined' : 'pending';
        setResolvedGuest({
          name,
          status,
          seat: g.table ?? null,
          dietary: g.dietary ? [g.dietary] : null,
          selectedEventNames: null,
        });
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.warn('[GuestPearChat] passport resolution failed', err);
        setResolvedGuest(null);
      });
    return () => ctrl.abort();
  }, [guest, domain]);

  const effectiveGuest = guest ?? resolvedGuest ?? undefined;

  const starterPrompts = [...BASE_STARTER_PROMPTS, scheduleStarterPrompt(manifest.occasion)];

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, streaming]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const pearId = `p-${Date.now()}`;
    const pearStub: Message = { id: pearId, role: 'pear', content: '' };
    setChat((c) => [...c, userMsg, pearStub]);
    setDraft('');
    setStreaming(true);
    setError(null);
    try {
      // Bake the guest's context into the prompt as a preface so
      // Pear can answer "what time should I get there?" with their
      // RSVP'd events instead of guessing.
      let scopedPrompt = trimmed;
      if (effectiveGuest) {
        const lines: string[] = [`(About me: I'm ${effectiveGuest.name}.`];
        if (effectiveGuest.status === 'attending') lines.push("I've RSVP'd yes.");
        else if (effectiveGuest.status === 'declined') lines.push("I've RSVP'd no.");
        else if (effectiveGuest.status === 'maybe') lines.push("I've RSVP'd maybe.");
        else lines.push("I haven't RSVP'd yet.");
        if (effectiveGuest.seat) lines.push(`My seat: ${effectiveGuest.seat}.`);
        if (effectiveGuest.dietary && effectiveGuest.dietary.length > 0) lines.push(`My dietary notes: ${effectiveGuest.dietary.join(', ')}.`);
        if (effectiveGuest.selectedEventNames && effectiveGuest.selectedEventNames.length > 0) {
          lines.push(`I'm coming to: ${effectiveGuest.selectedEventNames.join(', ')}.`);
        }
        const last = lines.pop() ?? '';
        lines.push(last.replace(/\.$/, ')'));
        scopedPrompt = `${lines.join(' ')} ${trimmed}`;
      }
      const r = await fetch('/api/pear-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          coupleNames,
          prompt: scopedPrompt,
          history: chat.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          mode: 'guest',
        }),
      });
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.error ?? `Pear couldn't reply (${r.status})`);
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean; error?: string };
            if (ev.error) throw new Error(ev.error);
            if (ev.delta) {
              acc += ev.delta;
              setChat((c) => c.map((m) => (m.id === pearId ? { ...m, content: acc } : m)));
            }
          } catch {
            // ignore frame errors
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pear is asleep right now.');
      setChat((c) => c.filter((m) => m.id !== pearId));
    } finally {
      setStreaming(false);
    }
  }

  // Floating button when closed
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask Pear"
        style={{
          position: 'fixed',
          bottom: 18,
          right: 18,
          /* Corner stacking policy: chat 160 > pill 150 > dock 140. */
          zIndex: 160,
          padding: '10px 16px 10px 12px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, var(--peach-bg, #FBE8D6) 0%, rgba(232,224,240,0.96) 100%)',
          border: '1px solid rgba(198,112,61,0.32)',
          boxShadow: '0 12px 30px rgba(14,13,11,0.22)',
          color: 'var(--ink, #0E0D0B)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <PearGlyph size={18} />
        Ask Pear
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Pear"
      style={{
        position: 'fixed',
        bottom: 18,
        right: 18,
        /* Corner stacking policy: chat 160 > pill 150 > dock 140. */
        zIndex: 160,
        /* Subtract the right notch inset (landscape phones) so the
           panel's left edge doesn't get pushed past the viewport. */
        width: 'min(360px, calc(100vw - 36px - env(safe-area-inset-right, 0px)))',
        maxHeight: '70vh',
        background: 'var(--card, #FBF7EE)',
        borderRadius: 18,
        boxShadow: '0 24px 56px rgba(14,13,11,0.28)',
        border: '1px solid rgba(14,13,11,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        animation: 'pl-pear-chat-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          background: 'linear-gradient(135deg, var(--peach-bg, #FBE8D6) 0%, rgba(232,224,240,0.96) 100%)',
          borderBottom: '1px solid rgba(14,13,11,0.08)',
        }}
      >
        <PearGlyph size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
            }}
          >
            Pear
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink, #0E0D0B)',
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              lineHeight: 1.2,
            }}
          >
            Ask anything about the day.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            width: 26, height: 26, padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-muted, #8a8671)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            display: 'grid', placeItems: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Body — chat or starter chips */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 200,
          maxHeight: '50vh',
          overflowY: 'auto',
          padding: '14px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {chat.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--ink-soft, #3A332C)',
                lineHeight: 1.5,
              }}
            >
              I&apos;ve read the whole site. Ask me anything — directions, dress code, who&apos;s
              speaking when. I&apos;ll keep it short.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {starterPrompts.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'rgba(198,112,61,0.12)',
                    color: 'var(--peach-ink, #C6703D)',
                    border: '1px solid rgba(198,112,61,0.24)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((m, idx) => {
            /* Last assistant message while streaming gets a
               blinking caret at the end so the host has a clear
               "Pear is still writing" affordance. */
            const isLast = idx === chat.length - 1;
            const showCaret = streaming && isLast && m.role !== 'user' && Boolean(m.content);
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: m.role === 'user'
                    ? 'rgba(198,112,61,0.12)'
                    : 'var(--paper, #FFFFFF)',
                  border: m.role === 'user'
                    ? '1px solid rgba(198,112,61,0.22)'
                    : '1px solid rgba(14,13,11,0.08)',
                  color: 'var(--ink, #0E0D0B)',
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontFamily: m.role === 'user' ? 'var(--font-ui)' : 'var(--font-display, "Fraunces", Georgia, serif)',
                  fontStyle: m.role === 'user' ? 'normal' : 'italic',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.content || (
                  <PearThinking active label="drafting" size="sm" hideAvatar />
                )}
                {showCaret && (
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 14,
                      marginLeft: 2,
                      background: 'var(--peach-ink, #C6703D)',
                      verticalAlign: '-2px',
                      animation: 'pl-pear-caret 1s steps(2, end) infinite',
                    }}
                  />
                )}
              </div>
            );
          })
        )}
        {error && (
          <div
            role="alert"
            style={{
              alignSelf: 'flex-start',
              padding: '6px 12px',
              borderRadius: 10,
              background: 'rgba(122,45,45,0.08)',
              border: '1px solid rgba(122,45,45,0.2)',
              fontSize: 12,
              color: '#7A2D2D',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: 'var(--cream-2, #F5EFE2)',
          borderTop: '1px solid rgba(14,13,11,0.08)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Pear…"
          disabled={streaming}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 12px',
            background: 'var(--paper, #FBF7EE)',
            border: '1px solid rgba(14,13,11,0.12)',
            borderRadius: 999,
            fontSize: 13,
            color: 'var(--ink, #0E0D0B)',
            outline: 'none',
            fontFamily: 'var(--font-ui)',
          }}
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          aria-label="Send"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            borderRadius: 999,
            background: 'var(--peach-ink, #C6703D)',
            color: '#FFFFFF',
            border: 'none',
            cursor: streaming ? 'wait' : 'pointer',
            opacity: streaming || !draft.trim() ? 0.5 : 1,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </form>
      <style jsx global>{`
        @keyframes pl-pear-chat-rise {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Blinking caret at the end of a streaming Pear message.
           Steps(2) gives a hard on/off blink so it reads as type-
           writer-style, not a fade. */
        @keyframes pl-pear-caret {
          0%, 50%   { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pl-pear-caret"] {
            animation: none !important;
            opacity: 0.5 !important;
          }
        }
      `}</style>
    </div>
  );
}

function PearGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="var(--peach-ink, #C6703D)"
      aria-hidden
    >
      <path d="M12 3.4c.6 0 1 .5 1 1.1v.4c2.6.4 4.5 2 4.5 4.4v.5c1.6.7 2.5 2 2.5 4 0 4-2.5 7.4-7 7.7H11c-4.5-.3-7-3.7-7-7.7 0-2 .9-3.3 2.5-4v-.5c0-2.4 1.9-4 4.5-4.4v-.4c0-.6.4-1.1 1-1.1z" />
    </svg>
  );
}
