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

import { useCallback, useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';

export interface ClaimRow {
  id: string;
  entry_url: string;
  claimer_name: string | null;
  claimer_email: string;
  message: string | null;
  quantity: number;
  created_at: string;
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

export function RegistryClaimsFeed({ subdomain, items, manifest, maxRows = 10 }: Props) {
  const { rows, revoke } = useRegistryClaims(subdomain);

  function labelFor(url: string): string {
    const match = items.find((it) => it.url === url);
    if (match) return match.label ?? match.name ?? '';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  if (!rows || rows.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.slice(0, maxRows).map((c) => (
        <ClaimCard
          key={c.id}
          claim={c}
          manifest={manifest}
          entryLabel={labelFor(c.entry_url) || new URL(c.entry_url).hostname.replace(/^www\./, '')}
          onRevoke={() => revoke(c.id)}
        />
      ))}
      {rows.length > maxRows && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'center', padding: 4 }}>
          + {rows.length - maxRows} more
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
  onRevoke: () => void;
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
          guestName: claim.claimer_name || claim.claimer_email.split('@')[0],
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {claim.claimer_name ?? claim.claimer_email.split('@')[0]}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            {relativeTime(claim.created_at)}
          </span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && !window.confirm('Revoke this claim? It stops showing on the public registry but stays in your records.')) return;
              onRevoke();
            }}
            aria-label="Revoke claim"
            title="Revoke claim — useful if a guest claimed by mistake"
            style={{
              width: 22,
              height: 22,
              padding: 0,
              borderRadius: 999,
              border: '1px solid var(--line-soft)',
              background: 'transparent',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              fontSize: 13,
              lineHeight: 1,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
        got <strong style={{ fontWeight: 600 }}>{entryLabel}</strong>
      </div>
      <a
        href={`mailto:${claim.claimer_email}`}
        style={{ fontSize: 11, color: 'var(--peach-ink, #C6703D)', fontWeight: 600, textDecoration: 'none' }}
      >
        {claim.claimer_email} →
      </a>
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
