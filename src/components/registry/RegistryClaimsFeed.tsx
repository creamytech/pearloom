'use client';

// ─────────────────────────────────────────────────────────────
// RegistryClaimsFeed — shared host-side feed of "I got this"
// claims on link-out registry entries. Used in two places:
//
//   • The editor's RegistryPanel (wrapped in PanelSection chrome)
//   • The /dashboard/registry page (wrapped in card chrome)
//
// The component itself is chrome-less — consumers decide framing.
// Includes:
//   - Data hook that hits /api/registry-link-claims?host=1
//   - Optimistic revoke with rollback
//   - Per-claim "Draft thank-you" affordance via /api/ai-thankyou
//     + an "Open in Studio" deep link that pre-addresses the
//     Studio thank-you card (?thankTo=&gift=)
//   - The thank-you ledger: every kind of row gets a "Mark
//     thanked" toggle that stamps thanked_at through the row's
//     own owner-gated PATCH. Drafting ≠ thanked — only the
//     explicit toggle writes the stamp.
//
// Returns null when there are no claims so empty registries
// don't pollute the host's surface with empty chrome.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';

export interface ClaimRow {
  id: string;
  entry_url: string;
  claimer_name: string | null;
  /** Empty string for reserve-and-link item reservations left
   *  without an email. */
  claimer_email: string;
  message: string | null;
  quantity: number;
  created_at: string;
  /** What kind of gift this is — link-out claim (default), a
   *  no-payment item reservation, a paid Stripe purchase, or an
   *  honor-ledger "gave directly" pledge (R2-lite cash funds). */
  kind?: 'link' | 'reserved' | 'paid' | 'pledge';
  /** Native-item claims resolve their label server-side (the item
   *  name) — takes precedence over entry_url matching. */
  itemLabel?: string;
  /** Pledge rows only — the guest's OWN claimed amount, in cents.
   *  Host-visible here; the public site only ever sees aggregates. */
  amountCents?: number | null;
  /** The thank-you ledger stamp — when the host explicitly marked
   *  this gift thanked. null/undefined = still to thank. */
  thankedAt?: string | null;
}

export interface RegistryEntryLite {
  url?: string;
  /** Either field is fine — the editor uses `name`, the renderer
   *  uses `label`. Both end up as the row's display title. */
  label?: string;
  name?: string;
}

interface Props {
  /** Site subdomain (slug). Used both as the API parameter and
   *  the cache key. */
  subdomain: string | undefined;
  /** Registry entries from the manifest, used to resolve
   *  entry_url → human label. Falls back to the URL hostname
   *  when no match is found. */
  items: RegistryEntryLite[];
  /** Manifest passed through to ClaimCard so the "Draft thank-you"
   *  flow has access to couple names + occasion + vibes. */
  manifest: StoryManifest;
  /** Optional max rows to render (default: 10). Older claims
   *  collapse into a "+ N more" line. */
  maxRows?: number;
  /** Extra pre-shaped rows merged into the feed — native-item
   *  reservations / purchases from /api/registry-items/claims.
   *  Sorted together with the link claims by created_at. These
   *  rows have no revoke (hosts edit items in the panel instead). */
  extraClaims?: ClaimRow[];
  /** Fires when the host toggles a row's thanked stamp, keyed
   *  `${kind}-${id}` — lets a parent keep a "Still to thank"
   *  stat live without refetching three ledgers. */
  onThankedChange?: (key: string, thankedAt: string | null) => void;
}

/** The host GET returns raw DB rows — lift snake_case thanked_at
 *  onto the camelCase field the feed reads. */
function normalizeLinkClaims(claims: Array<ClaimRow & { thanked_at?: string | null }>): ClaimRow[] {
  return claims.map((c) => ({ ...c, thankedAt: c.thankedAt ?? c.thanked_at ?? null }));
}

export function useRegistryClaims(subdomain: string | undefined) {
  const [rows, setRows] = useState<ClaimRow[] | null>(null);

  const refetch = useCallback(() => {
    if (!subdomain) return Promise.resolve();
    return fetch(`/api/registry-link-claims?siteId=${encodeURIComponent(subdomain)}&host=1`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { claims?: ClaimRow[] } | null) => {
        if (data?.claims) setRows(normalizeLinkClaims(data.claims));
      })
      .catch(() => { /* silent */ });
  }, [subdomain]);

  useEffect(() => {
    if (!subdomain) return;
    let cancelled = false;
    fetch(`/api/registry-link-claims?siteId=${encodeURIComponent(subdomain)}&host=1`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { claims?: ClaimRow[] } | null) => {
        if (cancelled || !data?.claims) return;
        setRows(normalizeLinkClaims(data.claims));
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [subdomain]);

  // Optimistic revoke — drop locally first, hit the network,
  // restore from server on failure.
  const revoke = useCallback((id: string) => {
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    void fetch(`/api/registry-link-claims?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((r) => {
        if (r.ok) return;
        void refetch();
      })
      .catch(() => {});
  }, [refetch]);

  return { rows, refetch, revoke };
}

export function RegistryClaimsFeed({ subdomain, items, manifest, maxRows = 10, extraClaims, onThankedChange }: Props) {
  const { rows, revoke } = useRegistryClaims(subdomain);

  function labelFor(claim: ClaimRow): string {
    if (claim.itemLabel) return claim.itemLabel;
    const url = claim.entry_url;
    const match = items.find((it) => it.url === url);
    if (match) return match.label ?? match.name ?? '';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  /* One ledger — link claims + native-item reservations/purchases
     + pledges. Still-to-thank rows lead (newest first); thanked
     rows sink below them so the feed reads as a to-do list. */
  const merged = [...(rows ?? []), ...(extraClaims ?? [])]
    .sort((a, b) => {
      const at = a.thankedAt ? 1 : 0;
      const bt = b.thankedAt ? 1 : 0;
      if (at !== bt) return at - bt;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (merged.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {merged.slice(0, maxRows).map((c) => (
        <ClaimCard
          key={`${c.kind ?? 'link'}-${c.id}`}
          claim={c}
          manifest={manifest}
          entryLabel={labelFor(c) || 'a gift'}
          siteSlug={subdomain}
          onThankedChange={onThankedChange}
          /* Revoke applies to link claims only — item reservations
             are edited from the registry panel; pledges are the
             guest's own honor-ledger entries. */
          onRevoke={(c.kind ?? 'link') === 'link' ? () => revoke(c.id) : undefined}
        />
      ))}
      {merged.length > maxRows && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'center', padding: 4 }}>
          + {merged.length - maxRows} more
        </div>
      )}
    </div>
  );
}

// One claim row with an optional "Draft thank-you" affordance.
// Click → calls /api/ai-thankyou with the claim's gift + guest +
// couple context. Result expands inline with a Copy button.
/** Which owner-gated PATCH stamps thanked_at for this row's kind. */
function thankEndpointFor(kind: ClaimRow['kind']): string {
  if (kind === 'pledge') return '/api/gift-pledges';
  if (kind === 'reserved' || kind === 'paid') return '/api/registry-items/claims';
  return '/api/registry-link-claims';
}

export function ClaimCard({
  claim,
  manifest,
  entryLabel,
  onRevoke,
  siteSlug,
  onThankedChange,
}: {
  claim: ClaimRow;
  manifest: StoryManifest;
  entryLabel: string;
  /** Omit to hide the revoke affordance (native-item rows). */
  onRevoke?: () => void;
  /** Enables the "Open in Studio" deep link on the thank-you flow. */
  siteSlug?: string;
  /** See RegistryClaimsFeed Props. */
  onThankedChange?: (key: string, thankedAt: string | null) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rowKey = `${claim.kind ?? 'link'}-${claim.id}`;
  const nudgeKey = `pl-thank-nudge:${rowKey}`;
  /* The thank-you stamp — optimistic local copy of thanked_at. */
  const [thankedAt, setThankedAt] = useState<string | null>(claim.thankedAt ?? null);
  const [thankBusy, setThankBusy] = useState(false);
  /* Set when the host left for the Studio from this row — on
     return, the Mark-thanked toggle steps forward so drafting
     doesn't quietly pass for thanking. */
  const [studioNudge, setStudioNudge] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && sessionStorage.getItem(nudgeKey) === '1'; } catch { return false; }
  });

  async function toggleThanked() {
    if (thankBusy) return;
    const prev = thankedAt;
    const next = prev ? null : new Date().toISOString();
    // Optimistic — stamp locally, hit the network, roll back on failure.
    setThankedAt(next);
    onThankedChange?.(rowKey, next);
    if (next) {
      setStudioNudge(false);
      try { sessionStorage.removeItem(nudgeKey); } catch { /* private mode */ }
    }
    setThankBusy(true);
    try {
      const r = await fetch(thankEndpointFor(claim.kind ?? 'link'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: claim.id, thanked: !!next }),
      });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; thankedAt?: string | null };
      if (!r.ok || !d.ok) throw new Error('patch failed');
      if (d.thankedAt !== undefined) {
        setThankedAt(d.thankedAt);
        onThankedChange?.(rowKey, d.thankedAt);
      }
    } catch {
      setThankedAt(prev);
      onThankedChange?.(rowKey, prev);
    } finally {
      setThankBusy(false);
    }
  }

  const guestDisplayName = claim.claimer_name || claim.claimer_email.split('@')[0] || 'A guest';
  /* Deep link into the Studio's thank-you card, pre-addressed.
     Drafting there does NOT mark the row thanked — only the
     toggle does. */
  const studioHref = siteSlug
    ? `/dashboard/invite?site=${encodeURIComponent(siteSlug)}&thankTo=${encodeURIComponent(guestDisplayName)}&gift=${encodeURIComponent(entryLabel)}`
    : null;

  async function draft() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const names = (manifest as unknown as { names?: [string, string] }).names ?? ['', ''];
      const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
      const vibes = ((manifest as unknown as { vibes?: string[] }).vibes ?? []).join(' ');
      const r = await fetch('/api/ai-thankyou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: claim.claimer_name || claim.claimer_email.split('@')[0] || 'A guest',
          giftDescription: claim.message ? `${entryLabel} — they noted: "${claim.message}"` : entryLabel,
          coupleNames: names.filter(Boolean).join(' & '),
          occasion,
          vibe: vibes,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Pear couldn't draft (${r.status})`);
      }
      const data = (await r.json()) as { note?: string };
      if (!data.note) throw new Error('Pear returned an empty note.');
      setNote(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft.');
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!note) return;
    navigator.clipboard.writeText(note).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => { /* clipboard blocked — host can manual-copy */ });
  }

  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontFamily: 'var(--font-ui)',
        /* Thanked rows sink — done items read quieter than the
           still-to-thank ones above them. */
        opacity: thankedAt ? 0.62 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap', overflowWrap: 'anywhere' }}>
          {claim.claimer_name || claim.claimer_email.split('@')[0] || 'A guest'}
          <KindChip kind={claim.kind ?? 'link'} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            {relativeTime(claim.created_at)}
          </span>
          {onRevoke && <RevokeButton onConfirm={onRevoke} />}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
        {claim.kind === 'pledge' ? (
          /* Honor-ledger row — amount is the guest's own claim,
             visible to the HOST only (the site sees aggregates). */
          <>
            gave directly toward <strong style={{ fontWeight: 600 }}>{entryLabel}</strong>
            {typeof claim.amountCents === 'number' && claim.amountCents > 0
              ? <> — <strong style={{ fontWeight: 600 }}>{formatDollars(claim.amountCents)}</strong></>
              : null}
          </>
        ) : (
          <>
            {claim.kind === 'reserved' ? 'reserved' : 'got'} <strong style={{ fontWeight: 600 }}>{entryLabel}</strong>
            {claim.quantity > 1 ? ` × ${claim.quantity}` : ''}
          </>
        )}
      </div>
      {claim.claimer_email && (
        <a
          href={`mailto:${claim.claimer_email}`}
          style={{ fontSize: 11, color: 'var(--peach-ink, #C6703D)', fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere' }}
        >
          {claim.claimer_email} →
        </a>
      )}
      {claim.message && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink-soft)',
            fontStyle: 'italic',
            borderLeft: '2px solid var(--peach-ink, #C6703D)',
            paddingLeft: 8,
            marginTop: 2,
          }}
        >
          &ldquo;{claim.message}&rdquo;
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {!thankedAt && !note && !busy && (
          <button
            type="button"
            onClick={draft}
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              border: '1px dashed var(--peach-ink, #C6703D)',
              background: 'transparent',
              color: 'var(--peach-ink, #C6703D)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            ✦ Draft thank-you
          </button>
        )}
        {!thankedAt && !busy && studioHref && (
          /* Pre-addressed Studio card — leaves this page. Set the
             session flag so the row's thanked toggle steps
             forward when the host comes back. */
          <a
            href={studioHref}
            onClick={() => {
              try { sessionStorage.setItem(nudgeKey, '1'); } catch { /* private mode */ }
            }}
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink-soft)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Open in Studio →
          </a>
        )}
        {busy && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            Pear is writing…
          </span>
        )}
        {error && (
          <span style={{ fontSize: 11, color: '#7A2D2D' }}>{error}</span>
        )}
        {/* ── The thank-you ledger toggle. Drafting ≠ thanked —
            only this explicit stamp sets thanked_at. */}
        <span style={{ marginLeft: 'auto' }}>
          {thankedAt ? (
            <button
              type="button"
              onClick={toggleThanked}
              disabled={thankBusy}
              title="Tap to unmark"
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                border: 'none',
                background: 'transparent',
                color: 'var(--sage-deep, #3D4A1F)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.02em',
                cursor: thankBusy ? 'default' : 'pointer',
                fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap',
              }}
            >
              Thanked ✓ {formatThankedDate(thankedAt)}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleThanked}
              disabled={thankBusy}
              title="Stamp this gift as thanked — your note is out the door."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                border: studioNudge
                  ? '1px solid var(--sage-deep, #3D4A1F)'
                  : '1px solid var(--line-soft)',
                background: studioNudge ? 'var(--sage-2, rgba(61,74,31,0.08))' : 'transparent',
                color: studioNudge ? 'var(--sage-deep, #3D4A1F)' : 'var(--ink-muted)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: thankBusy ? 'default' : 'pointer',
                fontFamily: 'var(--font-ui)',
                whiteSpace: 'nowrap',
              }}
            >
              {/* The pearl-check — a gold pearl dot ahead of the verb. */}
              <span
                aria-hidden
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--gold, #D4A95D)', flexShrink: 0,
                }}
              />
              {studioNudge ? 'Sent it? Mark thanked' : 'Mark thanked'}
            </button>
          )}
        </span>
      </div>
      {note && (
        <div
          style={{
            marginTop: 6,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(198,112,61,0.22)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--ink)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
            lineHeight: 1.5,
          }}
        >
          {note}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={copy}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                background: 'var(--ink, #0E0D0B)',
                color: 'var(--cream, #FBF7EE)',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => { setNote(null); }}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--ink-muted)',
                border: '1px solid var(--line)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Try another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Jun 12" — the thanked stamp's short date. */
function formatThankedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Whole dollars stay whole ("$1,250"); fractional cents keep two
 *  places. Local copy — this component predates lib/registry-funds
 *  and stays dependency-light. */
function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/* Tiny mono chip naming the row's kind — "reserved" (no-payment
   item reservation), "paid" (Stripe purchase), "gave directly"
   (honor-ledger pledge), "claimed link" (link-out store claim). */
function KindChip({ kind }: { kind: 'link' | 'reserved' | 'paid' | 'pledge' }) {
  const label = kind === 'reserved' ? 'reserved'
    : kind === 'paid' ? 'paid'
      : kind === 'pledge' ? 'gave directly'
        : 'claimed link';
  const ink = kind === 'paid' || kind === 'pledge' ? 'var(--sage-deep, #3D4A1F)' : 'var(--peach-ink, #C6703D)';
  return (
    <span
      style={{
        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
        fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: ink,
        border: `1px solid color-mix(in oklab, ${ink} 35%, transparent)`,
        borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

/* Two-stage revoke button — first tap arms the action; second tap
 * within 4s confirms. Avoids window.confirm (the editorial dialog
 * provider isn't mounted in every parent of this component — it's
 * used both in the editor's RegistryPanel and the dashboard) while
 * still gating the destructive action behind a deliberate
 * second-tap. Subtle plum recolor on the armed state. */
function RevokeButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function handleClick() {
    if (armed) {
      setArmed(false);
      if (timer.current) clearTimeout(timer.current);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={armed ? 'Confirm revoke claim' : 'Revoke claim'}
      title={
        armed
          ? 'Tap again to confirm — stays in your records, hides from public.'
          : 'Revoke claim — useful if a guest claimed by mistake'
      }
      style={{
        height: 22,
        padding: armed ? '0 8px' : 0,
        minWidth: 22,
        borderRadius: 999,
        border: `1px solid ${armed ? 'var(--plum, #7A2D2D)' : 'var(--line-soft)'}`,
        background: armed ? 'rgba(122,45,45,0.08)' : 'transparent',
        color: armed ? 'var(--plum, #7A2D2D)' : 'var(--ink-muted)',
        cursor: 'pointer',
        fontSize: armed ? 10.5 : 13,
        fontWeight: armed ? 700 : 400,
        letterSpacing: armed ? '0.08em' : 'normal',
        textTransform: armed ? 'uppercase' : 'none',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 160ms ease, color 160ms ease, padding 160ms ease',
      }}
    >
      {armed ? 'Tap to confirm' : '×'}
    </button>
  );
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const delta = Date.now() - t;
  const min = Math.round(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
