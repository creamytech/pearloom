'use client';

// ─────────────────────────────────────────────────────────────
// DayOfBroadcastDock — host-only floating composer that ships
// real-time pings to every guest with the site bookmarked. Posts
// to /api/broadcast/push which fans out to:
//   • announcements (every guest sees on the site)
//   • Web Push subscribers (system notification on lock screens)
//
// Visible only when:
//   • Day-Of Mode is active (state.active = true)
//   • The viewer is the site owner (creatorEmail match)
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

interface Props {
  siteSlug: string;
  /** Quick-fire templates surfaced as one-tap chips. */
  templates?: Array<{ title: string; body: string }>;
}

const DEFAULT_TEMPLATES = [
  { title: 'Ceremony in 10', body: 'The ceremony begins in 10 minutes — please find your seats.' },
  { title: 'Cocktails open', body: 'Cocktail hour has begun. Photos welcome!' },
  { title: 'Dinner is served', body: 'Time to be seated for dinner.' },
  { title: 'First dance', body: 'Gather around — the first dance is starting.' },
  { title: 'Cake cutting', body: 'Cake is being cut now. Don\'t miss it.' },
  { title: 'Last call', body: 'Last call for drinks at the bar.' },
];

export function DayOfBroadcastDock({ siteSlug, templates = DEFAULT_TEMPLATES }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend(t: string, b: string) {
    if (!t.trim() || !b.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/broadcast/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, title: t.trim(), body: b.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed.');
      const note = data.pushSent
        ? `Sent · ${data.pushSent} push, announcement live`
        : 'Sent · announcement live';
      setResult(note);
      setTitle('');
      setBody('');
      setTimeout(() => setResult(null), 4500);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'clamp(16px, 3vw, 32px)',
        right: 'clamp(16px, 3vw, 32px)',
        zIndex: 80,
        fontFamily: 'Inter, system-ui, sans-serif',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {open ? (
        <div
          style={{
            width: 360,
            maxWidth: '100%',
            background: 'rgba(14,13,11,0.96)',
            color: '#F1EBDC',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 24px 60px rgba(14,13,11,0.5)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(184,147,90,0.22)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(212,179,115,0.95)' }}>
              Broadcast
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                width: 24, height: 24, borderRadius: 999,
                background: 'transparent', border: '1px solid rgba(243,233,212,0.2)',
                color: 'rgba(243,233,212,0.7)',
                cursor: 'pointer', fontSize: 12, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
            {templates.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => void handleSend(t.title, t.body)}
                disabled={sending}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: 'rgba(243,233,212,0.05)',
                  color: 'rgba(243,233,212,0.92)',
                  border: '1px solid rgba(243,233,212,0.12)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: sending ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                {t.title}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Ceremony starting)"
            style={inputStyle}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="One-line message to every guest"
            rows={3}
            style={{ ...inputStyle, marginTop: 6, resize: 'vertical', lineHeight: 1.5 }}
          />
          <button
            type="button"
            onClick={() => void handleSend(title, body)}
            disabled={sending || !title.trim() || !body.trim()}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(184,147,90,0.95)',
              color: '#0E0D0B',
              borderRadius: 999,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: sending ? 'wait' : 'pointer',
              opacity: !title.trim() || !body.trim() ? 0.5 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Send to every guest'}
          </button>
          {result && (
            <div style={{ marginTop: 8, fontSize: 11.5, color: 'rgba(243,233,212,0.85)' }}>{result}</div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 999,
            background: 'rgba(14,13,11,0.92)',
            color: '#F1EBDC',
            border: '1px solid rgba(184,147,90,0.42)',
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: '0 16px 40px rgba(14,13,11,0.32)',
            fontFamily: 'inherit',
          }}
        >
          <span aria-hidden style={{
            width: 8, height: 8, borderRadius: 999, background: '#7A2D2D',
            animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
          }} />
          Broadcast
        </button>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'rgba(243,233,212,0.05)',
  color: 'rgba(243,233,212,0.95)',
  border: '1px solid rgba(243,233,212,0.18)',
  borderRadius: 8,
  fontSize: 12.5,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
