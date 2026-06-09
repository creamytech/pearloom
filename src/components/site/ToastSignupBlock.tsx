'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/ToastSignupBlock.tsx
//
// Ordered list of toast slots for rehearsal dinners, milestone
// birthdays, retirements. Host creates the slots; guests see who
// has what.
//
// When `siteId` + `blockId` are set (the renderer always passes
// them), claims sync to `toast_signups` via /api/event-os/toasts:
// GET on mount pulls everyone's claims, POST claims a slot, and a
// 409 means someone else got there first — we roll back the
// optimistic claim and show who has it. localStorage holds only
// *this guest's* claims as the optimistic / offline layer; on
// keyless deploys (`{ stored: false }`, empty GET) the block
// behaves exactly as the original local-only MVP.
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
  // Lazy useState init for both stored values — render-pure
  // and no setState-in-effect cascade. localClaims is *this
  // guest's* claims (persisted); serverClaims is everyone's
  // (fetched). Display merges the two, server winning per slot.
  const [localClaims, setLocalClaims] = useState<Record<number, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(`${LOCAL_PREFIX}${storageKey}`);
      return raw ? (JSON.parse(raw) as Record<number, string>) : {};
    } catch { return {}; }
  });
  const [serverClaims, setServerClaims] = useState<Record<number, string>>({});
  const [claimerName, setClaimerName] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try { return window.localStorage.getItem('pearloom:guest-name') ?? ''; }
    catch { return ''; }
  });
  const [error, setError] = useState<string | null>(null);

  // Server sync — authoritative claims once published.
  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    const params = new URLSearchParams({ siteId: siteId!, blockId: blockId! });
    fetch(`/api/event-os/toasts?${params}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.ok) return;
        // Server claims win per slot at display time; we keep
        // localClaims intact as the offline layer. On keyless
        // deploys this is always {} so local-only behavior is
        // untouched.
        setServerClaims((data.claims as Record<number, string>) ?? {});
      })
      .catch(() => { /* offline — local only */ });
    return () => { cancelled = true; };
  }, [canSync, siteId, blockId]);

  // Merged view — server is authoritative where it knows a slot.
  const claimed: Record<number, string> = { ...localClaims, ...serverClaims };

  // Functional updates so two in-flight claims can't clobber
  // each other's optimistic state. The storage write inside the
  // updater is idempotent (strict-mode double-invoke safe).
  const writeLocal = (update: (prev: Record<number, string>) => Record<number, string>) => {
    setLocalClaims((prev) => {
      const next = update(prev);
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  };

  const claim = async (index: number) => {
    const name = claimerName.trim();
    if (!name) return;
    setError(null);

    // Optimistic local update — only this guest's own claims
    // are persisted; other guests' claims live on the server.
    writeLocal((prev) => ({ ...prev, [index]: name }));
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem('pearloom:guest-name', name); } catch { /* ignore */ }
    }

    if (canSync) {
      try {
        const res = await fetch('/api/event-os/toasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, blockId, slotIndex: index, claimedBy: name }),
        });
        // `{ stored: false }` (Supabase unconfigured) comes back
        // 200 — the optimistic local claim simply stands, same
        // as the original localStorage-only behavior. No banner.
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
          if (res.status === 404) {
            // Older deploy without the event-os routes — keep
            // the local-only behavior, no banner.
          } else if (res.status === 409) {
            // Slot taken by someone else — roll back our
            // optimistic claim (state + storage), then refresh
            // so the guest sees whose toast it is now.
            writeLocal((prev) => {
              const next = { ...prev };
              delete next[index];
              return next;
            });
            try {
              const params = new URLSearchParams({ siteId: siteId!, blockId: blockId! });
              const refreshed = await fetch(`/api/event-os/toasts?${params}`, { cache: 'no-store' });
              if (refreshed.ok) {
                const payload = await refreshed.json();
                if (payload?.ok) setServerClaims((payload.claims as Record<number, string>) ?? {});
              }
            } catch { /* the rollback above already freed the slot */ }
            setError('Someone else grabbed that slot first — pick another and it’s yours.');
          } else {
            setError(data?.error ?? 'Could not save the claim. Try again.');
          }
        }
      } catch {
        setError('You look offline — your claim is held in this browser. Claim it again once you\u2019re back.');
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
