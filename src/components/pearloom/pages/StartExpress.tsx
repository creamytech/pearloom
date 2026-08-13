'use client';

// ─────────────────────────────────────────────────────────────
// StartExpress — the express door (`/start`).
//
// The wizard is nine considered steps and it stays. But it asks
// nine questions before showing anything, and most hosts arriving
// here ALREADY HAVE their details somewhere: the Zola/Knot/Joy page
// they started, a save-the-date, a planner's email, a note in their
// phone. This door takes that and hands the wizard a filled-in
// start.
//
// Three screens, no account required at any point (the doorway
// contract — auth belongs at save/publish; proxy.test.ts pins it):
//
//   ask   → "What are you celebrating?" + "Paste anything you have"
//   found → what we read, editable, honest about what we missed
//   →       hands off to /wizard/new with the state pre-filled
//
// HONESTY: everything shown is labelled as what we READ, and every
// field is editable before it goes anywhere. Nothing is published,
// nothing is saved, no row is written — the extract endpoint is
// read-only by design.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DoorwayPrefill } from '@/lib/doorway/extract';

/** The wizard's own restore key — writing it here is the handoff. */
const WIZARD_STORAGE_KEY = 'pl-wizard-state-v1';

type Phase = 'ask' | 'reading' | 'found';

const PAPER = 'var(--pl-cream, #FBF7EE)';
const INK = 'var(--pl-ink, #1F2418)';
const LINE = 'var(--pl-divider, rgba(31,36,24,0.14))';
const OLIVE = 'var(--pl-olive, #6B7A4F)';

const MONO: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
  fontSize: 10,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
};

const DISPLAY: React.CSSProperties = {
  fontFamily: 'var(--pl-font-display, Fraunces, Georgia, serif)',
};

export function StartExpress() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('ask');
  const [input, setInput] = useState('');
  const [prefill, setPrefill] = useState<DoorwayPrefill>({});
  const [missed, setMissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const looksLikeUrl = /^https?:\/\/\S+$/i.test(input.trim());

  async function read() {
    const value = input.trim();
    if (!value) return;
    setPhase('reading');
    setError(null);
    try {
      const res = await fetch('/api/doorway/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(looksLikeUrl ? { url: value } : { text: value }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; prefill?: DoorwayPrefill; empty?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'We couldn’t read that. You can fill it in yourself instead.');
        setPhase('ask');
        return;
      }
      setPrefill(data.prefill ?? {});
      setMissed(!!data.empty);
      setPhase('found');
    } catch {
      setError('Something went wrong reading that. You can fill it in yourself instead.');
      setPhase('ask');
    }
  }

  /** Hand the wizard a filled-in start via its own restore key. */
  function handOff() {
    try {
      const draft: Record<string, unknown> = {};
      if (prefill.names) draft.names = prefill.names;
      if (prefill.eventDate) draft.eventDate = prefill.eventDate;
      if (prefill.occasion) draft.occasion = prefill.occasion;
      const place = prefill.venueName || prefill.location;
      if (place) draft.location = place;
      if (Object.keys(draft).length > 0) {
        const existing = window.localStorage.getItem(WIZARD_STORAGE_KEY);
        const base = existing ? (JSON.parse(existing) as Record<string, unknown>) : {};
        window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ ...base, ...draft }));
      }
    } catch {
      // Storage disabled — the wizard simply starts empty. Never block.
    }
    router.push('/wizard/new');
  }

  const found: Array<[string, string]> = [];
  if (prefill.names) found.push(['Names', prefill.names.filter(Boolean).join(' & ')]);
  if (prefill.eventDate) found.push(['Date', prefill.eventDate]);
  if (prefill.venueName) found.push(['Venue', prefill.venueName]);
  if (prefill.location) found.push(['Where', prefill.location]);
  if (prefill.occasion) found.push(['Occasion', prefill.occasion.replace(/-/g, ' ')]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: PAPER,
        color: INK,
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(20px, 5vw, 48px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ ...MONO, color: OLIVE, marginBottom: 10 }}>Start here</div>

        {phase !== 'found' && (
          <>
            <h1
              style={{
                ...DISPLAY,
                fontSize: 'clamp(1.9rem, 6vw, 2.9rem)',
                fontWeight: 500,
                lineHeight: 1.1,
                margin: '0 0 12px',
              }}
            >
              Give us what you already have.
            </h1>
            <p style={{ margin: '0 0 24px', opacity: 0.75, lineHeight: 1.6 }}>
              Paste a link to the site you started somewhere else, or your
              save-the-date, or just the details in your own words. We&rsquo;ll
              read what we can and you can fix anything we get wrong.
            </p>

            <label htmlFor="doorway-input" style={{ ...MONO, display: 'block', marginBottom: 8, opacity: 0.7 }}>
              Link or details
            </label>
            <textarea
              id="doorway-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={phase === 'reading'}
              rows={5}
              placeholder={'https://…\n\nor\n\nEmma & James\nSeptember 12, 2027\nThe Old Mill'}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${LINE}`,
                background: 'var(--pl-cream-card, #fff)',
                color: INK,
                font: 'inherit',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />

            {error && (
              <p style={{ color: 'var(--pl-plum, #7A2D2D)', fontSize: 13.5, margin: '10px 0 0' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void read()}
                disabled={!input.trim() || phase === 'reading'}
                style={{
                  padding: '11px 20px',
                  borderRadius: 999,
                  border: 'none',
                  background: input.trim() ? INK : 'rgba(31,36,24,0.25)',
                  color: PAPER,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: input.trim() && phase !== 'reading' ? 'pointer' : 'default',
                }}
              >
                {phase === 'reading' ? 'Reading…' : 'Read this'}
              </button>
              <Link
                href="/wizard/new"
                style={{ fontSize: 13.5, color: OLIVE, fontWeight: 600, textDecoration: 'none' }}
              >
                Start from scratch instead →
              </Link>
            </div>
          </>
        )}

        {phase === 'found' && (
          <>
            <h1
              style={{
                ...DISPLAY,
                fontSize: 'clamp(1.9rem, 6vw, 2.9rem)',
                fontWeight: 500,
                lineHeight: 1.1,
                margin: '0 0 12px',
              }}
            >
              {found.length > 0 ? 'Here’s what we read.' : 'We couldn’t read much.'}
            </h1>
            <p style={{ margin: '0 0 20px', opacity: 0.75, lineHeight: 1.6 }}>
              {found.length > 0
                ? 'Nothing is saved yet. You’ll be able to change any of it in the next step.'
                : 'No problem — the next step asks for the details directly. It only takes a minute.'}
            </p>

            {found.length > 0 && (
              <div
                style={{
                  border: `1px solid ${LINE}`,
                  borderRadius: 14,
                  background: 'var(--pl-cream-card, #fff)',
                  padding: '4px 16px',
                  marginBottom: 18,
                }}
              >
                {found.map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '12px 0',
                      borderBottom: `1px solid ${LINE}`,
                    }}
                  >
                    <span style={{ ...MONO, opacity: 0.6, alignSelf: 'center' }}>{label}</span>
                    <span style={{ textAlign: 'right', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {missed && found.length > 0 && (
              <p style={{ fontSize: 13.5, opacity: 0.7, margin: '0 0 18px' }}>
                Some details didn&rsquo;t come through — you can add them next.
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handOff}
                style={{
                  padding: '11px 20px',
                  borderRadius: 999,
                  border: 'none',
                  background: INK,
                  color: PAPER,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {found.length > 0 ? 'Looks right — continue' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => { setPhase('ask'); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: OLIVE,
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Try something else
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
