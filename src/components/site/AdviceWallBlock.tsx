'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/AdviceWallBlock.tsx
//
// Prompted guest submissions — "Advice for the new parents",
// "Advice for the bride", "A memory of Nana". Host sees a
// moderated wall of quotes. MVP: local-only submissions stored
// per-browser so guests see their own posts; backend wiring
// (tribute_submissions table in CLAUDE-DESIGN.md §14) lands with
// a dedicated session.
//
// Intentional scope call: this block is presentational +
// local-state submit until the submission schema lands.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';

export interface AdviceEntry {
  from: string;
  body: string;
  /** ISO timestamp — renderer formats to "Apr 21". */
  at?: string;
}

interface AdviceWallBlockProps {
  title?: string;
  subtitle?: string;
  /** Prompt shown above the input — tone-sets the submissions. */
  prompt?: string;
  /** Seeded / host-entered entries, always shown first. */
  seeds?: AdviceEntry[];
  /** localStorage namespace — usually the site slug. */
  storageKey?: string;
  /** Site id (slug) + block id — when both are set, the wall
   * syncs submissions to the server (multi-guest visibility). */
  siteId?: string;
  blockId?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

const LOCAL_PREFIX = 'pearloom:advice:';

export function AdviceWallBlock({
  title = 'Advice wall',
  subtitle,
  prompt = 'A piece of advice for the road ahead.',
  seeds = [],
  storageKey = 'default',
  siteId,
  blockId,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: AdviceWallBlockProps) {
  const storeKey = `${LOCAL_PREFIX}${storageKey}`;
  const canSync = Boolean(siteId && blockId);
  const [localEntries, setLocalEntries] = useState<AdviceEntry[]>([]);
  const [serverEntries, setServerEntries] = useState<AdviceEntry[]>([]);
  const [from, setFrom] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Hydrate local submissions (guests always see their own).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storeKey);
      if (raw) setLocalEntries(JSON.parse(raw) as AdviceEntry[]);
    } catch { /* ignore */ }
  }, [storeKey]);

  // Pull the authoritative list from the server when available.
  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    const params = new URLSearchParams({ siteId: siteId!, blockId: blockId! });
    fetch(`/api/event-os/submissions?${params}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setServerEntries((data.entries as AdviceEntry[]) ?? []);
      })
      .catch(() => { /* offline-safe — seeds + local still render */ });
    return () => { cancelled = true; };
  }, [canSync, siteId, blockId]);

  // Server entries take precedence over local (dedup by body+from+at).
  const entries: AdviceEntry[] = (() => {
    if (serverEntries.length === 0) return [...seeds, ...localEntries];
    const seen = new Set(serverEntries.map((e) => `${e.from}|${e.body}`));
    const localUnseen = localEntries.filter((e) => !seen.has(`${e.from}|${e.body}`));
    return [...seeds, ...serverEntries, ...localUnseen];
  })();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = from.trim();
    const b = body.trim();
    if (!f || !b) return;
    const next: AdviceEntry = { from: f, body: b, at: new Date().toISOString() };

    // Always write local so the guest sees their own entry
    // immediately, even if the server is slow / offline.
    const merged = [...localEntries, next];
    setLocalEntries(merged);
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(storeKey, JSON.stringify(merged)); } catch { /* ignore */ }
    }
    setFrom('');
    setBody('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2400);

    // Fire-and-forget server write; on success, re-fetch so
    // other-guest entries appear + ours gets its authoritative
    // created_at.
    if (canSync) {
      try {
        const res = await fetch('/api/event-os/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, blockId, from: f, body: b }),
        });
        if (res.ok) {
          const params = new URLSearchParams({ siteId: siteId!, blockId: blockId! });
          const refreshed = await fetch(`/api/event-os/submissions?${params}`, { cache: 'no-store' });
          if (refreshed.ok) {
            const data = await refreshed.json();
            if (data?.ok) setServerEntries((data.entries as AdviceEntry[]) ?? []);
          }
        }
      } catch { /* offline — entry stays local */ }
    }
  };

  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="adviceWall"
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: foreground,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '10px auto 0', maxWidth: '52ch', color: muted, fontSize: '0.96rem', lineHeight: 1.55 }}>
              {subtitle}
            </p>
          )}
        </header>

        {/* Submission form */}
        <form
          onSubmit={submit}
          style={{
            padding: '22px 22px',
            border: `1px dashed ${accent}`,
            borderRadius: 'var(--pl-radius-lg)',
            background: `color-mix(in oklab, ${accent} 5%, transparent)`,
            marginBottom: 32,
          }}
        >
          <p
            style={{
              margin: '0 0 14px',
              fontFamily: headingFont,
              fontStyle: 'italic',
              fontSize: '1.05rem',
              color: foreground,
            }}
          >
            {prompt}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Your name"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--pl-radius-sm)',
                border: '1px solid var(--pl-divider)',
                background: 'var(--pl-cream-card)',
                color: foreground,
                fontSize: 'max(16px, 0.9rem)',
                fontFamily: bodyFont,
                outline: 'none',
              }}
            />
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave something worth re-reading."
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--pl-radius-sm)',
                border: '1px solid var(--pl-divider)',
                background: 'var(--pl-cream-card)',
                color: foreground,
                fontSize: 'max(16px, 0.9rem)',
                fontFamily: bodyFont,
                resize: 'vertical',
                minHeight: 80,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!from.trim() || !body.trim()}
              className="pl-pearl-accent"
              style={{
                alignSelf: 'flex-end',
                padding: '10px 18px',
                borderRadius: 'var(--pl-radius-full)',
                fontFamily: 'var(--pl-font-mono, ui-monospace)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: !from.trim() || !body.trim() ? 'default' : 'pointer',
                opacity: !from.trim() || !body.trim() ? 0.5 : 1,
              }}
            >
              {submitted ? 'Thanks — added below' : 'Add it'}
            </button>
          </div>
        </form>

        {/* Wall */}
        {entries.length === 0 ? (
          <p style={{ textAlign: 'center', color: muted, fontStyle: 'italic' }}>
            Nothing yet. Begin a thread.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {entries.map((entry, i) => (
              <article
                key={`${entry.from}-${i}`}
                style={{
                  padding: '20px 22px',
                  border: '1px solid var(--pl-divider)',
                  borderRadius: 'var(--pl-radius-lg)',
                  background: 'var(--pl-cream-card)',
                  position: 'relative',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: 16,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: `color-mix(in oklab, ${accent} 22%, var(--pl-cream-card))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    color: accent,
                    fontSize: '0.9rem',
                  }}
                >
                  &ldquo;
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    fontSize: '1rem',
                    lineHeight: 1.5,
                    color: foreground,
                  }}
                >
                  {entry.body}
                </p>
                <footer
                  style={{
                    marginTop: 12,
                    fontFamily: 'var(--pl-font-mono, ui-monospace)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: muted,
                  }}
                >
                  — {entry.from}
                  {entry.at && (
                    <span style={{ marginLeft: 8, color: 'var(--pl-muted)' }}>
                      · {new Date(entry.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
