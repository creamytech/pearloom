'use client';

// ─────────────────────────────────────────────────────────────
// MakeoverPage (`/makeover`) — "paste your site, see it reimagined."
//
// The acquisition surface all three external reviews named the
// strongest content engine available: most couples have already
// started somewhere else before they find Pearloom, so switching
// has to feel easier than staying — and the product manufactures
// its own proof rather than arguing for itself in prose.
//
// The preview is the REAL renderer on a REAL manifest, pressed
// through the same look pipeline the wizard uses. Three looks to
// flip between, then a door into /start with the details already
// carried across.
//
// HONESTY, enforced upstream in lib/doorway/makeover:
//   • Only facts we actually read are placed — no invented venue,
//     no fabricated run of show.
//   • `tooThin` means we ask for a detail instead of rendering a
//     flattering shell.
//   • The manifest is marked preview/unpublished and never saved.
// The page says out loud what it carried over, so nobody mistakes
// a blank section for something we lost.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { useSoftRouter } from '@/components/shell/soft-navigation';
import type { StoryManifest } from '@/types';
import type { DoorwayPrefill } from '@/lib/doorway/extract';
import { MAKEOVER_LOOKS } from '@/lib/doorway/makeover';
import { PublishedSiteShell } from '@/components/pearloom/site/PublishedSiteShell';

const WIZARD_STORAGE_KEY = 'pl-wizard-state-v1';

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

interface MakeoverResponse {
  ok?: boolean;
  tooThin?: boolean;
  carried?: string[];
  carriedSentence?: string;
  prefill?: DoorwayPrefill;
  manifest?: StoryManifest;
  error?: string;
}

export function MakeoverPage() {
  const softRouter = useSoftRouter();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MakeoverResponse | null>(null);
  const [lookId, setLookId] = useState(MAKEOVER_LOOKS[0].id);

  const looksLikeUrl = /^https?:\/\/\S+$/i.test(input.trim());

  async function run(nextLookId = lookId) {
    const value = input.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/doorway/makeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(looksLikeUrl ? { url: value } : { text: value }),
          lookId: nextLookId,
        }),
      });
      const data = (await res.json().catch(() => null)) as MakeoverResponse | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'We couldn’t read that. Try pasting your details instead.');
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError('Something went wrong. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  function pickLook(id: string) {
    setLookId(id);
    if (result) void run(id);
  }

  /** Carry the details into the real creation flow. */
  function makeItMine() {
    try {
      const p = result?.prefill ?? {};
      const draft: Record<string, unknown> = {};
      if (p.names) draft.names = p.names;
      if (p.eventDate) draft.eventDate = p.eventDate;
      if (p.occasion) draft.occasion = p.occasion;
      const place = p.venueName || p.location;
      if (place) draft.location = place;
      if (Object.keys(draft).length > 0) {
        const existing = window.localStorage.getItem(WIZARD_STORAGE_KEY);
        const base = existing ? (JSON.parse(existing) as Record<string, unknown>) : {};
        window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ ...base, ...draft }));
      }
    } catch { /* storage disabled — the wizard just starts empty */ }
    softRouter.push('/wizard/new');
  }

  return (
    <main style={{ minHeight: '100dvh', background: PAPER, color: INK }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(24px, 5vw, 56px) clamp(20px, 5vw, 32px)' }}>
        <div style={{ ...MONO, color: OLIVE, marginBottom: 10 }}>The makeover</div>
        <h1
          style={{
            ...DISPLAY,
            fontSize: 'clamp(2rem, 6vw, 3.1rem)',
            fontWeight: 500,
            lineHeight: 1.08,
            margin: '0 0 12px',
          }}
        >
          Already started somewhere else?
        </h1>
        <p style={{ margin: '0 0 22px', opacity: 0.78, lineHeight: 1.6, maxWidth: 620 }}>
          Paste the link to your current wedding site and we&rsquo;ll show you
          the same day, woven our way. Nothing is saved and nothing is
          published — it&rsquo;s just a look.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://ourwedding.example.com"
            aria-label="Your current wedding site link"
            style={{
              flex: '1 1 320px',
              padding: '12px 14px',
              borderRadius: 10,
              border: `1px solid ${LINE}`,
              background: 'var(--pl-cream-card, #fff)',
              color: INK,
              font: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={() => void run()}
            disabled={!input.trim() || busy}
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              border: 'none',
              background: input.trim() ? INK : 'rgba(31,36,24,0.25)',
              color: PAPER,
              fontWeight: 600,
              fontSize: 14,
              cursor: input.trim() && !busy ? 'pointer' : 'default',
            }}
          >
            {busy ? 'Reading…' : 'Show me'}
          </button>
        </div>

        {error && (
          <p style={{ color: 'var(--pl-plum, #7A2D2D)', fontSize: 13.5, margin: '12px 0 0' }}>{error}</p>
        )}

        {result?.tooThin && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              border: `1px solid ${LINE}`,
              borderRadius: 12,
              background: 'var(--pl-cream-card, #fff)',
            }}
          >
            <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
              We couldn&rsquo;t read enough from that page to show you anything
              worth looking at. Rather than invent your wedding, we&rsquo;d
              rather ask.
            </p>
            <Link
              href="/start"
              style={{ color: OLIVE, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
            >
              Tell us the details instead →
            </Link>
          </div>
        )}

        {result && !result.tooThin && result.manifest && (
          <>
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                margin: '26px 0 14px',
              }}
            >
              <span style={{ ...MONO, opacity: 0.6 }}>Try a look</span>
              {MAKEOVER_LOOKS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pickLook(l.id)}
                  title={l.blurb}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: `1px solid ${lookId === l.id ? INK : LINE}`,
                    background: lookId === l.id ? INK : 'transparent',
                    color: lookId === l.id ? PAPER : INK,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {result.carriedSentence && (
              <p style={{ fontSize: 13.5, opacity: 0.72, margin: '0 0 14px' }}>
                {result.carriedSentence} Anything blank below is something we
                couldn&rsquo;t read — you&rsquo;d fill it in yourself.
              </p>
            )}

            {/* The real renderer on a real manifest — not a mockup. */}
            <div
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 16,
                overflow: 'hidden',
                background: '#fff',
                maxHeight: '70vh',
                overflowY: 'auto',
              }}
            >
              <PublishedSiteShell
                manifest={result.manifest}
                names={(result.prefill?.names as [string, string]) ?? ['', '']}
                siteSlug="makeover-preview"
                prettyUrl=""
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={makeItMine}
                style={{
                  padding: '12px 22px',
                  borderRadius: 999,
                  border: 'none',
                  background: INK,
                  color: PAPER,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Make this mine
              </button>
              <span style={{ fontSize: 13, opacity: 0.65 }}>
                Free to start — no account needed until you save.
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
