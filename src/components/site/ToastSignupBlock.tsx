'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/ToastSignupBlock.tsx
//
// Ordered list of toast slots for rehearsal dinners, milestone
// birthdays, retirements. Host creates the slots; guests see who
// has what. Local-only claim for MVP (sets the viewer's name on
// an empty slot); backend table `toast_signups` lands later.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from 'react';

export interface ToastSlot {
  /** "Father of the bride", "Best man", "A word from grandma". */
  label: string;
  /** Pre-assigned name from the host; if empty, the slot is open. */
  assigned?: string;
  /** Host-side note — "keep it under 90 seconds." */
  note?: string;
}

interface ToastSignupBlockProps {
  title?: string;
  subtitle?: string;
  slots: ToastSlot[];
  storageKey?: string;
  /** Site + block ids for server sync — when both set, claims
   * persist across guests. */
  siteId?: string;
  blockId?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

const LOCAL_PREFIX = 'pearloom:toasts:';

export function ToastSignupBlock({
  title = 'Toasts & words',
  subtitle,
  slots,
  storageKey = 'default',
  siteId,
  blockId,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: ToastSignupBlockProps) {
  const storeKey = `${LOCAL_PREFIX}${storageKey}`;
  const canSync = Boolean(siteId && blockId);
  const [claimed, setClaimed] = useState<Record<number, string>>({});
  const [claimerName, setClaimerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storeKey);
      if (raw) setClaimed(JSON.parse(raw) as Record<number, string>);
      const nameRaw = window.localStorage.getItem('pearloom:guest-name');
      if (nameRaw) setClaimerName(nameRaw);
    } catch { /* ignore */ }
  }, [storeKey]);

  // Server sync — authoritative claims once published.
  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    const params = new URLSearchParams({ siteId: siteId!, blockId: blockId! });
    fetch(`/api/event-os/toasts?${params}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.ok) return;
        // Server claims override any local (in case a different
        // browser claimed ahead of us).
        setClaimed(data.claims ?? {});
      })
      .catch(() => { /* offline — local only */ });
    return () => { cancelled = true; };
  }, [canSync, siteId, blockId]);

  const claim = async (index: number) => {
    const name = claimerName.trim();
    if (!name) return;
    setError(null);

    // Optimistic local update.
    const next = { ...claimed, [index]: name };
    setClaimed(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storeKey, JSON.stringify(next));
        window.localStorage.setItem('pearloom:guest-name', name);
      } catch { /* ignore */ }
    }

    if (canSync) {
      try {
        const res = await fetch('/api/event-os/toasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, blockId, slotIndex: index, claimedBy: name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
          // Slot taken by someone else — rollback the optimistic update.
          if (res.status === 409) {
            // Refresh from server to show who got it.
            const params = new URLSearchParams({ siteId: siteId!, blockId: blockId! });
            const refreshed = await fetch(`/api/event-os/toasts?${params}`, { cache: 'no-store' });
            if (refreshed.ok) {
              const payload = await refreshed.json();
              if (payload?.ok) setClaimed(payload.claims ?? {});
            }
            setError('Someone else grabbed that slot first.');
          } else {
            setError(data?.error ?? 'Could not save the claim. Try again.');
          }
        }
      } catch {
        setError('Offline — claim saved locally, will sync when you\u2019re back.');
      }
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
      data-pe-section="toastSignup"
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 28 }}>
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

        {/* Claimer name field — one input, reused across all slots */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 'var(--pl-radius-lg)',
            background: `color-mix(in oklab, ${accent} 6%, transparent)`,
            border: `1px solid color-mix(in oklab, ${accent} 18%, transparent)`,
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace)',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: muted,
              flexShrink: 0,
            }}
          >
            Your name
          </span>
          <input
            value={claimerName}
            onChange={(e) => setClaimerName(e.target.value)}
            placeholder="So we know who\u2019s up"
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 'var(--pl-radius-sm)',
              border: '1px solid var(--pl-divider)',
              background: 'var(--pl-cream-card)',
              color: foreground,
              fontSize: 'max(16px, 0.88rem)',
              fontFamily: bodyFont,
              outline: 'none',
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              margin: '0 0 14px',
              padding: '10px 14px',
              borderRadius: 'var(--pl-radius-sm)',
              background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
              border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
              color: 'var(--pl-plum)',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {slots.map((slot, i) => {
            const locallyClaimed = claimed[i];
            const takenBy = slot.assigned?.trim() || locallyClaimed;
            return (
              <li
                key={`${slot.label}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 14,
                  alignItems: 'baseline',
                  padding: '14px 18px',
                  border: '1px solid var(--pl-divider)',
                  borderRadius: 'var(--pl-radius-lg)',
                  background: 'var(--pl-cream-card)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--pl-font-mono, ui-monospace)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: accent,
                  }}
                >
                  #{String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: headingFont,
                      fontStyle: 'italic',
                      fontSize: '1.05rem',
                      color: foreground,
                    }}
                  >
                    {slot.label}
                  </div>
                  {slot.note && (
                    <div style={{ marginTop: 2, fontSize: '0.82rem', color: muted, lineHeight: 1.5 }}>
                      {slot.note}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {takenBy ? (
                    <span
                      style={{
                        fontFamily: 'var(--pl-font-mono, ui-monospace)',
                        fontSize: '0.62rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: muted,
                      }}
                    >
                      {takenBy}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => claim(i)}
                      disabled={!claimerName.trim()}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 'var(--pl-radius-full)',
                        border: `1px solid ${accent}`,
                        background: 'transparent',
                        color: accent,
                        fontFamily: 'var(--pl-font-mono, ui-monospace)',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        cursor: !claimerName.trim() ? 'default' : 'pointer',
                        opacity: !claimerName.trim() ? 0.5 : 1,
                      }}
                    >
                      I\u2019ll take it
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
