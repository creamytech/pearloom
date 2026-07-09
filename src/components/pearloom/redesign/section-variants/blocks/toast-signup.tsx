'use client';

/* Toast signup section — claim a toast slot.

   Data: manifest.toastSlots[]  (written by ToastSignupPanel)
     { id, label, assigned?, note? }
   Mirrors the legacy ToastSlot shape from
   src/components/site/ToastSignupBlock.tsx. NOT related to the
   Toasts & speeches tool (ToastsPanel) — that drafts speech TEXT
   with Pear; this is the day-of slot list.

   GUEST INTERACTIVITY (published only) — ported from the legacy
   ToastSignupBlock logic:
     - GET  /api/event-os/toasts?siteId&blockId → { claims } keyed
       by slot_index. Server claims win per slot at display time;
       localStorage holds only THIS guest's claims as the
       optimistic / offline layer (functional updates so two
       in-flight claims can't clobber each other).
     - POST /api/event-os/toasts { siteId, blockId, slotIndex,
       claimedBy }. 409 = someone else got there first → roll back
       the optimistic claim, refresh, and show the warm copy.
       404 (older deploy) + { stored: false } (keyless) keep the
       local-only MVP behavior silently.
     - Guest name persisted under 'pearloom:guest-name' (same store
       as legacy) so repeat claims pre-fill.
   siteId = manifest.subdomain. blockId = 'toastSignup' (one slot
   list per site in the redesign manifest). slotIndex is the slot's
   index in the RAW manifest array — NOT the filtered display index
   — so an unlabeled draft row in the panel can't shift claims.

   Claim flow is an inline composer (small input + confirm), never
   window.prompt. Variants (layouts.ts): slots | list. */

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ToastSlotData { id?: string; label?: string; assigned?: string; note?: string }

export function readToastSlots(manifest: BlockSectionProps['manifest']): ToastSlotData[] {
  const loose = manifest as unknown as { toastSlots?: ToastSlotData[] };
  return Array.isArray(loose.toastSlots) ? loose.toastSlots : [];
}

function readSiteId(manifest: BlockSectionProps['manifest']): string {
  return (manifest.subdomain ?? '').trim();
}

/* ─── Interaction plumbing (legacy port) ─────────────────────── */

const LOCAL_PREFIX = 'pearloom:toasts:';
const GUEST_NAME_STORE = 'pearloom:guest-name';
const BLOCK_ID = 'toastSignup';

function readStoredGuestName(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(GUEST_NAME_STORE) ?? ''; } catch { return ''; }
}

function useToastClaims(siteId: string, enabled: boolean) {
  const canSync = enabled && Boolean(siteId);
  const storeKey = `${LOCAL_PREFIX}${siteId || 'draft'}:${BLOCK_ID}`;
  // Lazy useState init — localClaims is *this guest's* claims
  // (persisted); serverClaims is everyone's (fetched). Display
  // merges the two, server winning per slot.
  const [localClaims, setLocalClaims] = useState<Record<number, string>>(() => {
    if (!enabled || typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(storeKey);
      return raw ? (JSON.parse(raw) as Record<number, string>) : {};
    } catch { return {}; }
  });
  const [serverClaims, setServerClaims] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    const params = new URLSearchParams({ siteId, blockId: BLOCK_ID });
    const res = await fetch(`/api/event-os/toasts?${params}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok) return null;
    return (data.claims as Record<number, string>) ?? {};
  }, [siteId]);

  // Server sync — authoritative claims once published. On keyless
  // deploys this is always {} so local-only behavior is untouched.
  useEffect(() => {
    if (!canSync) return;
    let cancelled = false;
    fetchClaims()
      .then((claims) => { if (!cancelled && claims) setServerClaims(claims); })
      .catch(() => { /* offline, local only */ });
    return () => { cancelled = true; };
  }, [canSync, fetchClaims]);

  // Functional updates so two in-flight claims can't clobber each
  // other's optimistic state; the storage write is idempotent.
  const writeLocal = useCallback((update: (prev: Record<number, string>) => Record<number, string>) => {
    setLocalClaims((prev) => {
      const next = update(prev);
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, [storeKey]);

  const claim = async (index: number, rawName: string) => {
    const name = rawName.trim();
    if (!name || !enabled) return;
    setError(null);

    // Optimistic local update — only this guest's own claims are
    // persisted; other guests' claims live on the server.
    writeLocal((prev) => ({ ...prev, [index]: name }));
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(GUEST_NAME_STORE, name); } catch { /* ignore */ }
    }

    if (canSync) {
      try {
        const res = await fetch('/api/event-os/toasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, blockId: BLOCK_ID, slotIndex: index, claimedBy: name }),
        });
        // { stored: false } (Supabase unconfigured) comes back 200 —
        // the optimistic local claim simply stands. No banner.
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as { error?: string; code?: string }));
          if (res.status === 404) {
            // Older deploy without the event-os routes — keep the
            // local-only behavior, no banner.
          } else if (res.status === 409) {
            // Slot taken by someone else — roll back our optimistic
            // claim (state + storage), then refresh so the guest
            // sees whose toast it is now.
            writeLocal((prev) => {
              const next = { ...prev };
              delete next[index];
              return next;
            });
            try {
              const refreshed = await fetchClaims();
              if (refreshed) setServerClaims(refreshed);
            } catch { /* the rollback above already freed the slot */ }
            setError('Someone else grabbed that slot first, pick another and it’s yours.');
          } else {
            setError(data?.error ?? 'Could not save the claim. Try again.');
          }
        }
      } catch {
        setError('You look offline, your claim is held in this browser. Claim it again once you’re back.');
      }
    }
  };

  // Merged view — server is authoritative where it knows a slot.
  const claimed: Record<number, string> = { ...localClaims, ...serverClaims };
  return { claimed, claim, error };
}

/* ─── Shared bits ────────────────────────────────────────────── */

function GuestHint({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '4px 12px', borderRadius: 999,
          border: '1px dashed var(--t-line)', background: 'var(--t-card)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--t-ink-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-accent)', flexShrink: 0 }} />
        {children}
      </span>
    </div>
  );
}

const claimButtonStyle = (editable: boolean): CSSProperties => ({
  padding: '6px 14px', borderRadius: 999,
  border: '1px solid var(--t-accent)', background: 'transparent',
  color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
  fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase',
  cursor: editable ? 'default' : 'pointer',
  opacity: editable ? 0.55 : 1,
  whiteSpace: 'nowrap',
});

/** Inline name composer — the small input + confirm that replaces
 *  the legacy single shared name field (and never window.prompt). */
function ClaimComposer({
  onConfirm, onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(() => readStoredGuestName());
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onConfirm(name); }}
      style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        placeholder="Your name"
        aria-label="Your name"
        style={{
          flex: 1, minWidth: 0, padding: '7px 11px',
          borderRadius: 999, border: '1px solid var(--t-line)',
          background: 'var(--t-paper)', color: 'var(--t-ink)',
          fontSize: 'max(16px, 13px)', fontFamily: 'inherit', outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        style={{
          padding: '7px 13px', borderRadius: 999, border: '1px solid var(--t-accent)',
          background: 'var(--t-accent)', color: 'var(--t-accent-ink)',
          fontFamily: 'var(--t-mono)', fontSize: 9.5, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          cursor: name.trim() ? 'pointer' : 'default',
          opacity: name.trim() ? 1 : 0.55, whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        It&rsquo;s yours
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel claim"
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          display: 'grid', placeItems: 'center',
          border: '1px solid var(--t-line)', background: 'transparent',
          color: 'var(--t-ink-muted)', fontSize: 14, cursor: 'pointer', lineHeight: 1,
        }}
      >
        ×
      </button>
    </form>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        margin: '0 0 14px', padding: '10px 14px',
        borderRadius: 'var(--t-radius, 10px)',
        border: '1px solid color-mix(in oklab, var(--t-accent) 45%, transparent)',
        background: 'var(--t-accent-bg, var(--t-section))',
        color: 'var(--t-ink)', fontSize: 12.5, lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function ToastSignupSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const v: 'slots' | 'list' = variant === 'list' ? 'list' : 'slots';
  const siteId = readSiteId(manifest);
  // Keep the RAW manifest index alongside each slot — claims are
  // keyed by it on the server, so a filtered-out draft row in the
  // panel must not shift everyone's claims.
  const slotViews = readToastSlots(manifest)
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => (slot.label ?? '').trim());

  const { claimed, claim, error } = useToastClaims(siteId, !editable);
  const [openComposer, setOpenComposer] = useState<number | null>(null);

  const empty = slotViews.length === 0;
  if (empty && !editable) return null;

  const confirmClaim = (index: number, name: string) => {
    setOpenComposer(null);
    void claim(index, name);
  };

  const renderClaimSlot = (index: number): ReactNode => {
    if (openComposer === index && !editable) {
      return <ClaimComposer onConfirm={(name) => confirmClaim(index, name)} onCancel={() => setOpenComposer(null)} />;
    }
    return (
      <button
        type="button"
        onClick={editable ? undefined : () => setOpenComposer(index)}
        disabled={editable}
        style={claimButtonStyle(editable)}
      >
        Claim this toast
      </button>
    );
  };

  const claimedName = ({ slot, index }: { slot: ToastSlotData; index: number }): string | undefined =>
    slot.assigned?.trim() || claimed[index];

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'toastSignupEyebrow', 'Raise a glass')}
        title={blockCopy(manifest, 'toastSignupTitle', 'Toasts & words')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (val) => onEditCopy('toastSignupEyebrow', val) : undefined}
        onEditTitle={onEditCopy ? (val) => onEditCopy('toastSignupTitle', val) : undefined}
      />
      {editable && !empty && <GuestHint>Guests can claim a slot here</GuestHint>}
      {empty ? (
        <BlockEmpty hint="Add toast slots in the Toast signup panel." />
      ) : (
        <div style={{ maxWidth: v === 'slots' ? 760 : 560, margin: '0 auto' }}>
          {error && <ErrorNote>{error}</ErrorNote>}

          {v === 'slots' ? (
            /* ── Slots — numbered claimable cards. ─────────────── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
              {slotViews.map(({ slot, index }, displayIdx) => {
                const taken = claimedName({ slot, index });
                return (
                  <div
                    key={slot.id ?? index}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 8,
                      padding: '16px 18px',
                      background: 'var(--t-card)',
                      border: '1px solid var(--t-line)',
                      borderRadius: 'var(--t-radius-lg, 14px)',
                      boxShadow: 'var(--t-shadow-sm, none)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: 'var(--t-mono)', fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.2em', textTransform: 'uppercase',
                          color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Toast №{displayIdx + 1}
                      </span>
                      <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--t-line-soft)' }} />
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--t-ink)', lineHeight: 1.3 }}>
                      {slot.label}
                    </div>
                    {slot.note?.trim() && (
                      <div style={{ fontSize: 12, color: 'var(--t-ink-muted)', lineHeight: 1.45 }}>{slot.note}</div>
                    )}
                    <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                      {taken ? (
                        <div
                          style={{
                            fontFamily: 'var(--t-display)', fontStyle: 'italic',
                            fontSize: 17, color: 'var(--t-ink)', lineHeight: 1.2,
                          }}
                        >
                          {taken}
                        </div>
                      ) : (
                        renderClaimSlot(index)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── List — compact column with a gold leader line. ── */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {slotViews.map(({ slot, index }, displayIdx) => {
                const taken = claimedName({ slot, index });
                const composing = openComposer === index && !editable && !taken;
                return (
                  <div
                    key={slot.id ?? index}
                    style={{
                      padding: '13px 2px',
                      borderBottom: displayIdx < slotViews.length - 1 ? '1px solid var(--t-line-soft)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span
                        style={{
                          fontFamily: 'var(--t-mono)', fontSize: 10.5, fontWeight: 700,
                          letterSpacing: '0.14em', color: 'var(--t-ink-muted)',
                          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                        }}
                      >
                        №{displayIdx + 1}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-ink)', flexShrink: 0 }}>
                        {slot.label}
                      </span>
                      <span
                        aria-hidden
                        style={{
                          flex: 1, minWidth: 24, alignSelf: 'center',
                          borderBottom: '1px dotted var(--t-gold)',
                          transform: 'translateY(-3px)',
                        }}
                      />
                      {taken ? (
                        <span
                          style={{
                            fontFamily: 'var(--t-display)', fontStyle: 'italic',
                            fontSize: 15.5, color: 'var(--t-ink)', flexShrink: 0,
                          }}
                        >
                          {taken}
                        </span>
                      ) : (
                        !composing && renderClaimSlot(index)
                      )}
                    </div>
                    {slot.note?.trim() && (
                      <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', marginTop: 3, lineHeight: 1.45, paddingLeft: 30 }}>
                        {slot.note}
                      </div>
                    )}
                    {composing && (
                      <div style={{ marginTop: 8, paddingLeft: 30 }}>
                        <ClaimComposer onConfirm={(name) => confirmClaim(index, name)} onCancel={() => setOpenComposer(null)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </BlockFrame>
  );
}
