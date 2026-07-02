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
   *  no-payment item reservation, or a paid Stripe purchase. */
  kind?: 'link' | 'reserved' | 'paid';
  /** Native-item claims resolve their label server-side (the item
   *  name) — takes precedence over entry_url matching. */
  itemLabel?: string;
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
}

export function useRegistryClaims(subdomain: string | undefined) {
  const [rows, setRows] = useState<ClaimRow[] | null>(null);

  const refetch = useCallback(() => {
    if (!subdomain) return Promise.resolve();
    return fetch(`/api/registry-link-claims?siteId=${encodeURIComponent(subdomain)}&host=1`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { claims?: ClaimRow[] } | null) => {
        if (data?.claims) setRows(data.claims);
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
        setRows(data.claims);
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

export function RegistryClaimsFeed({ subdomain, items, manifest, maxRows = 10, extraClaims }: Props) {
  const { rows, revoke } = useRegistryClaims(subdomain);

  function labelFor(claim: ClaimRow): string {
    if (claim.itemLabel) return claim.itemLabel;
    const url = claim.entry_url;
    const match = items.find((it) => it.url === url);
    if (match) return match.label ?? match.name ?? '';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  /* One ledger — link claims + native-item reservations/purchases,
     newest first. */
  const merged = [...(rows ?? []), ...(extraClaims ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (merged.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {merged.slice(0, maxRows).map((c) => (
        <ClaimCard
          key={`${c.kind ?? 'link'}-${c.id}`}
          claim={c}
          manifest={manifest}
          entryLabel={labelFor(c) || 'a gift'}
          /* Revoke applies to link claims only — item reservations
             are edited from the registry panel. */
          onRevoke={c.kind === 'reserved' || c.kind === 'paid' ? undefined : () => revoke(c.id)}
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
export function ClaimCard({
  claim,
  manifest,
  entryLabel,
  onRevoke,
}: {
  claim: ClaimRow;
  manifest: StoryManifest;
  entryLabel: string;
  /** Omit to hide the revoke affordance (native-item rows). */
  onRevoke?: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
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
        {claim.kind === 'reserved' ? 'reserved' : 'got'} <strong style={{ fontWeight: 600 }}>{entryLabel}</strong>
        {claim.quantity > 1 ? ` × ${claim.quantity}` : ''}
      </div>
      {claim.claimer_email && (
        <a
          href={`mailto:${claim.claimer_email}`}
          style={{ fontSize: 11, color: 'var(--peach-ink, #C6703D)', fontWeight: 600, textDecoration: 'none' }}
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
        {!note && !busy && (
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
        {busy && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            Pear is writing…
          </span>
        )}
        {error && (
          <span style={{ fontSize: 11, color: '#7A2D2D' }}>{error}</span>
        )}
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

/* Tiny mono chip naming the row's kind — "reserved" (no-payment
   item reservation), "paid" (Stripe purchase), "claimed link"
   (link-out store claim). */
function KindChip({ kind }: { kind: 'link' | 'reserved' | 'paid' }) {
  const label = kind === 'reserved' ? 'reserved' : kind === 'paid' ? 'paid' : 'claimed link';
  const ink = kind === 'paid' ? 'var(--sage-deep, #3D4A1F)' : 'var(--peach-ink, #C6703D)';
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
