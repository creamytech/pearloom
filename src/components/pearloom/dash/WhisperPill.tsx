'use client';

// ─────────────────────────────────────────────────────────────
// WhisperPill — the in-product feedback affordance (PERSONA-PLAN
// S8, the glass box). A quiet pill on HOST surfaces only (guests
// owe us nothing): "Tell Pear what felt off" → one textarea →
// the note lands on the product_events spine ('whisper' + route)
// where we read it during testing. No new table, no email, no
// ticket system — a whisper, not a form.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics/beacon';

export function WhisperPill() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    const body = text.trim().slice(0, 800);
    if (!body) return;
    trackEvent('whisper', { text: body, route: window.location.pathname });
    setSent(true);
    setText('');
    window.setTimeout(() => { setSent(false); setOpen(false); }, 1800);
  };

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', zIndex: 55 }}>
      {open && (
        <div
          role="dialog"
          aria-label="Tell Pear what felt off"
          style={{
            width: 'min(88vw, 300px)',
            marginBottom: 10,
            padding: 14,
            borderRadius: 14,
            background: 'var(--card, #FBF7EE)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md, 0 12px 32px rgba(61,74,31,0.10))',
          }}
        >
          {sent ? (
            <div style={{ fontSize: 13, color: 'var(--sage-deep, #5C6B3F)', fontWeight: 600, padding: '6px 2px' }}>
              Woven in, thank you.
            </div>
          ) : (
            <>
              <label htmlFor="pl-whisper" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
                Tell Pear what felt off
              </label>
              <textarea
                id="pl-whisper"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={800}
                placeholder="Confusing, broken, or just not right, say it plainly."
                style={{
                  width: '100%', resize: 'vertical', padding: '9px 11px', borderRadius: 10,
                  border: '1px solid var(--line)', background: 'var(--cream, #FDFAF0)',
                  fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={!text.trim()}
                  className="pl8-btnfx"
                  style={{
                    border: 'none', borderRadius: 999, padding: '7px 16px',
                    background: 'var(--ink)', color: 'var(--cream, #FDFAF0)',
                    fontSize: 12.5, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
                    opacity: text.trim() ? 1 : 0.5, fontFamily: 'inherit',
                  }}
                >
                  Send to Pear
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Tell Pear what felt off"
        title="Tell Pear what felt off"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 999, float: 'right',
          border: '1px solid var(--line)', background: 'var(--card, #FBF7EE)',
          fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(61,74,31,0.05))',
        }}
      >
        ✎ Tell Pear
      </button>
    </div>
  );
}
