'use client';

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelGroup, PanelSection, PhotoSlot, SelectInput, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { BadgesEditor } from './BadgesEditor';
import { focusPanelRow } from './focus-row';

// Registry auto-tags one badge: 'mostLoved' on the first card so
// the host's preferred order surfaces visually. Hosts can hide it
// per-row via the BadgesEditor.
type RegistryAutoBadge = 'mostLoved';
const REGISTRY_AUTO_LABELS: Record<RegistryAutoBadge, string> = {
  mostLoved: 'Most loved',
};

// Listen for canvas → panel focus jumps. Renderer emits
// `pearloom:focus-registry-row` with { url } since registry
// entries are keyed by URL on the canvas tile.
function useRegistryRowFocus() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onFocus(e: Event) {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (!url) return;
      focusPanelRow(`[data-pl-registry-row-url="${CSS.escape(url)}"]`);
    }
    window.addEventListener('pearloom:focus-registry-row', onFocus);
    return () => window.removeEventListener('pearloom:focus-registry-row', onFocus);
  }, []);
}

type RegistryItem = {
  id: string;
  label: string;
  url: string;
  description?: string;
  kind?: 'fund' | 'registry' | 'link';
  /** Optional product / retailer thumbnail. Replaces the abstract
   *  icon block on the public card when set. */
  photoUrl?: string;
  /** Optional free-form price label ("$120", "Group gift", "From $40"). */
  priceLabel?: string;
  badges?: {
    hideAuto?: RegistryAutoBadge[];
    custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }>;
  };
};

function RegistryImportAI({ onResult }: { onResult: (items: RegistryItem[]) => void }) {
  const [url, setUrl] = useState('');
  const { state, error, run } = useAICall(async () => {
    if (!url.trim()) throw new Error('Paste a URL first');
    const res = await fetch('/api/ai-registry-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't read that URL (${res.status})`);
    }
    const data = (await res.json()) as {
      items?: Array<{
        label: string;
        url: string;
        description?: string;
        kind?: 'fund' | 'registry' | 'link';
        photoUrl?: string;
        priceLabel?: string;
      }>;
      // Backwards-compat — older response shape with a single label/entry.
      label?: string;
      entry?: { name?: string; url?: string; note?: string };
    };
    const now = Date.now();
    const imported: RegistryItem[] = (data.items ?? []).map((it, i) => ({
      id: `reg-ai-${now.toString(36)}-${i}`,
      label: it.label,
      url: it.url,
      description: it.description,
      kind: it.kind ?? 'registry',
      photoUrl: it.photoUrl,
      priceLabel: it.priceLabel,
    }));
    if (!imported.length && data.entry?.name) {
      imported.push({
        id: `reg-ai-${now.toString(36)}`,
        label: data.entry.name,
        url: data.entry.url ?? url.trim(),
        description: data.entry.note,
        kind: 'registry',
      });
    }
    if (!imported.length && data.label) {
      imported.push({ id: `reg-ai-${now.toString(36)}`, label: data.label, url: url.trim(), kind: 'registry' });
    }
    if (!imported.length) throw new Error("Pear couldn't find items at that URL.");
    onResult(imported);
    setUrl('');
    return imported;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <TextInput
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.zola.com/registry/…"
      />
      <AISuggestButton
        label="Import this registry"
        runningLabel="Reading your registry…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />
    </div>
  );
}

const KINDS = [
  { value: 'fund', label: 'Cash fund' },
  { value: 'registry', label: 'Registry' },
  { value: 'link', label: 'Link' },
];

// Host-only feed of recent registry claims. Hits the GET endpoint
// in host mode so we get full PII (claimer email + message) for
// thank-you note prep. Returns null silently when the site has
// no claims so empty registries don't surface a chrome'd empty
// section.
interface ClaimRow {
  id: string;
  entry_url: string;
  claimer_name: string | null;
  claimer_email: string;
  message: string | null;
  quantity: number;
  created_at: string;
}
function RecentClaimsSection({ manifest, items }: { manifest: StoryManifest; items: RegistryItem[] }) {
  const subdomain = (manifest as unknown as { subdomain?: string }).subdomain;
  const [rows, setRows] = useState<ClaimRow[] | null>(null);
  useEffect(() => {
    if (!subdomain) return;
    let cancelled = false;
    fetch(`/api/registry-link-claims?siteId=${encodeURIComponent(subdomain)}&host=1`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { claims?: ClaimRow[] } | null) => {
        if (cancelled || !data?.claims) return;
        setRows(data.claims);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [subdomain]);

  // Resolve entry URL → human label using the host's manifest
  // entries. Falls back to the URL hostname when no match.
  function labelFor(url: string): string {
    const match = items.find((it) => it.url === url);
    if (match?.label) return match.label;
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  // Optimistic revoke — drop locally first, hit the network, restore
  // on failure. Host gets the snappy feel even on a slow link.
  function onRevoke(id: string) {
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    void fetch(`/api/registry-link-claims?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((r) => {
        if (r.ok) return;
        // Network rolled back — refetch to recover the row.
        if (subdomain) {
          fetch(`/api/registry-link-claims?siteId=${encodeURIComponent(subdomain)}&host=1`, { cache: 'no-store' })
            .then((res) => res.ok ? res.json() : null)
            .then((data: { claims?: ClaimRow[] } | null) => { if (data?.claims) setRows(data.claims); })
            .catch(() => { /* silent */ });
        }
      })
      .catch(() => { /* silent */ });
  }

  if (!rows || rows.length === 0) return null;
  return (
    <PanelSection
      label="Recent claims"
      hint="Guests who clicked 'I got this' on your registry. Tap Draft to have Pear write a thank-you."
      defaultOpen={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.slice(0, 10).map((c) => (
          <ClaimCard key={c.id} claim={c} manifest={manifest} entryLabel={labelFor(c.entry_url)} onRevoke={() => onRevoke(c.id)} />
        ))}
        {rows.length > 10 && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', textAlign: 'center', padding: 4 }}>
            + {rows.length - 10} more
          </div>
        )}
      </div>
    </PanelSection>
  );
}

// One claim row with an optional "Draft thank-you" affordance.
// Click → calls /api/ai-thankyou with the claim's gift + guest +
// couple context. Result expands inline with a Copy button.
function ClaimCard({
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

// "Pear, draft my registry" — calls /api/draft-registry which
// reads occasion + venue + vibes and returns 8 starter items in
// the editor's canonical shape, ready to insert without further
// mapping. Used for fresh sites where the host hasn't picked any
// items yet (or wants more ideas).
function DraftRegistryAI({
  manifest,
  existingNames,
  onResult,
}: {
  manifest: StoryManifest;
  existingNames: string[];
  onResult: (items: RegistryItem[]) => void;
}) {
  const { state, error, run } = useAICall(async () => {
    const occasion = (manifest as unknown as { occasion?: string }).occasion;
    const vibes = (manifest as unknown as { vibes?: string[] }).vibes;
    const names = (manifest as unknown as { names?: [string, string] }).names;
    const venue = manifest.logistics?.venue;
    const res = await fetch('/api/draft-registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasion, vibes, venue, names, existingNames }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't draft (${res.status})`);
    }
    const data = (await res.json()) as {
      items?: Array<{ label: string; description?: string; kind?: 'fund' | 'registry' | 'link'; priceLabel?: string; url?: string }>;
    };
    const now = Date.now();
    const drafted: RegistryItem[] = (data.items ?? []).map((it, i) => ({
      id: `reg-pear-${now.toString(36)}-${i}`,
      label: it.label,
      url: it.url ?? '',
      description: it.description,
      kind: it.kind ?? 'link',
      priceLabel: it.priceLabel,
    }));
    if (drafted.length === 0) throw new Error('Pear didn\'t come up with anything — try setting your vibe in Theme first.');
    onResult(drafted);
    return drafted;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AIHint>
        Pear reads your occasion, venue, and vibes — drafts 8 starter items across cash funds, kitchen, home, and experiences. Edit or remove anything you don&apos;t want.
      </AIHint>
      <AISuggestButton
        label="Draft a starter registry"
        runningLabel="Pear is drafting…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />
    </div>
  );
}

const CURRENCIES = [
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'GBP', label: '£ GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' },
  { value: 'NZD', label: 'NZD' },
  { value: 'JPY', label: '¥ JPY' },
];

// The renderer reads `manifest.registry` as either a legacy flat
// array OR the canonical object shape `{ entries, cashFundUrl, ... }`.
// New writes always use the object shape so cash-fund + entries
// can coexist on the same key. Reads are forgiving — sites stuck
// on the old array shape keep working until the host saves once.
type RegistryEnvelope = {
  entries?: RegistryItem[];
  cashFundUrl?: string;
  cashFundMessage?: string;
  cashFundTarget?: number;
  cashFundRaised?: number;
  cashFundCurrency?: string;
};
function readRegistry(m: StoryManifest): RegistryEnvelope {
  const reg = (m as unknown as { registry?: unknown }).registry;
  if (Array.isArray(reg)) return { entries: reg as RegistryItem[] };
  if (reg && typeof reg === 'object') {
    const r = reg as RegistryEnvelope;
    return {
      entries: Array.isArray(r.entries) ? r.entries : [],
      cashFundUrl: r.cashFundUrl,
      cashFundMessage: r.cashFundMessage,
      cashFundTarget: r.cashFundTarget,
      cashFundRaised: r.cashFundRaised,
      cashFundCurrency: r.cashFundCurrency,
    };
  }
  return {};
}
function writeRegistry(m: StoryManifest, env: RegistryEnvelope): StoryManifest {
  const cleaned: RegistryEnvelope = {};
  if (env.entries && env.entries.length > 0) cleaned.entries = env.entries;
  if (env.cashFundUrl) cleaned.cashFundUrl = env.cashFundUrl;
  if (env.cashFundMessage) cleaned.cashFundMessage = env.cashFundMessage;
  if (env.cashFundTarget && env.cashFundTarget > 0) cleaned.cashFundTarget = env.cashFundTarget;
  if (env.cashFundRaised && env.cashFundRaised > 0) cleaned.cashFundRaised = env.cashFundRaised;
  if (env.cashFundCurrency) cleaned.cashFundCurrency = env.cashFundCurrency;
  return {
    ...m,
    registry: Object.keys(cleaned).length ? cleaned : undefined,
  } as unknown as StoryManifest;
}

export function RegistryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const env = readRegistry(manifest);
  const items = env.entries ?? [];
  useRegistryRowFocus();

  function set(next: RegistryItem[]) {
    onChange(writeRegistry(manifest, { ...env, entries: next }));
  }

  function setFund(patch: Partial<RegistryEnvelope>) {
    onChange(writeRegistry(manifest, { ...env, ...patch }));
  }

  function update(idx: number, patch: Partial<RegistryItem>) {
    set(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function add(kind: RegistryItem['kind'] = 'fund') {
    const label = kind === 'fund' ? 'Honeymoon fund' : kind === 'registry' ? 'Our registry' : 'A link';
    set([...items, { id: `reg-${Date.now().toString(36)}`, label, url: '', description: '', kind }]);
  }

  return (
    <PanelGroup>
      {/* Cash fund — surfaces at the top of the public registry as
          a peach progress strip when a target is set. Honeyfund /
          Venmo / Zelle URLs all work here; we just present the
          progress, the host updates `raised` as gifts arrive (or
          a Stripe webhook can in a future ship). */}
      <PanelSection
        label="Cash fund"
        hint="When you set a target, the public registry shows a progress thread above the cards."
        defaultOpen={false}
      >
        <Field label="Cash fund link" help="Honeyfund, Venmo, Zelle — wherever guests should send a contribution.">
          <TextInput
            type="url"
            value={env.cashFundUrl ?? ''}
            onChange={(e) => setFund({ cashFundUrl: e.target.value || undefined })}
            placeholder="https://honeyfund.com/…"
          />
        </Field>
        <Field label="Headline" help="One short line guests read first. 'Kyoto in October.'">
          <TextInput
            value={env.cashFundMessage ?? ''}
            onChange={(e) => setFund({ cashFundMessage: e.target.value || undefined })}
            placeholder="Kyoto in October. Thank you, truly."
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
          <Field label="Target">
            <TextInput
              type="number"
              min={0}
              value={env.cashFundTarget ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value);
                setFund({ cashFundTarget: Number.isFinite(n) && n > 0 ? n : undefined });
              }}
              placeholder="5000"
            />
          </Field>
          <Field label="Raised so far">
            <TextInput
              type="number"
              min={0}
              value={env.cashFundRaised ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value);
                setFund({ cashFundRaised: Number.isFinite(n) && n >= 0 ? n : undefined });
              }}
              placeholder="0"
            />
          </Field>
          <Field label="Currency">
            <SelectInput
              value={env.cashFundCurrency ?? 'USD'}
              onChange={(v) => setFund({ cashFundCurrency: v })}
              options={CURRENCIES}
            />
          </Field>
        </div>
      </PanelSection>
      <PanelSection
        label="Start with Pear"
        hint="No registry yet? Pear drafts a starter set you can refine."
        defaultOpen={items.length === 0}
      >
        <DraftRegistryAI
          manifest={manifest}
          existingNames={items.map((it) => it.label).filter(Boolean)}
          onResult={(drafted) => set([...items, ...drafted])}
        />
      </PanelSection>
      <RecentClaimsSection manifest={manifest} items={items} />
      <PanelSection label="Import from a URL" hint="Paste a Zola, Amazon, or Target registry link — Pear reads it and imports.">
        <RegistryImportAI onResult={(items2) => set([...items, ...items2])} />
      </PanelSection>
      <PanelSection
        label="Registry & gifts"
        hint="Drag to reorder. Anywhere from 1 to 6 items works — your presence really is the gift."
        action={items.length > 0 ? <AddRowButton label="Add item" onClick={() => add('link')} /> : null}
      >
        <SortableList
          items={items}
          onReorder={set}
          emptyState={
            <EmptyBlockState
              icon="gift"
              title="No registry items yet"
              body="Start with a honeymoon fund, add a classic registry, or paste a Honeyfund link."
              action={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => add('fund')}>
                    Add honeymoon fund
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => add('registry')}>
                    Add registry link
                  </button>
                </div>
              }
            />
          }
          renderItem={(it, { handle }) => {
            const i = items.findIndex((x) => x.id === it.id);
            return (
              <SortableRowCard
                handle={handle}
                onDelete={() => set(items.filter((_, idx) => idx !== i))}
                rootProps={{ 'data-pl-registry-row-url': it.url }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12, alignItems: 'flex-start' }}>
                  <Field label="Photo">
                    <PhotoSlot
                      src={it.photoUrl}
                      onChange={(url) => update(i, { photoUrl: url })}
                      aspect="1/1"
                      label=""
                    />
                  </Field>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 140px', gap: 10 }}>
                      <Field label="Label">
                        <TextInput
                          value={it.label}
                          onChange={(e) => update(i, { label: e.target.value })}
                          placeholder="Honeymoon fund"
                        />
                      </Field>
                      <Field label="Type">
                        <SelectInput
                          value={it.kind ?? 'fund'}
                          onChange={(v) => update(i, { kind: v as RegistryItem['kind'] })}
                          options={KINDS}
                        />
                      </Field>
                    </div>
                    <Field
                      label="Price"
                      help="Free-form: $120, From $40, Group gift, etc."
                    >
                      <TextInput
                        value={it.priceLabel ?? ''}
                        onChange={(e) => update(i, { priceLabel: e.target.value })}
                        placeholder="$120"
                      />
                    </Field>
                  </div>
                </div>
                <Field label="Link">
                  <TextInput
                    type="url"
                    value={it.url}
                    onChange={(e) => update(i, { url: e.target.value })}
                    placeholder="https://honeyfund.com/…"
                  />
                </Field>
                <Field
                  label="Short description"
                  pearAction={{ block: 'registry', pass: 'draft-registry-blurb', label: 'Draft a short blurb with Pear' }}
                >
                  <TextArea
                    rows={2}
                    value={it.description ?? ''}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Kyoto in October. Thank you, truly."
                  />
                </Field>
                <BadgesEditor<RegistryAutoBadge>
                  badges={it.badges ?? {}}
                  onChange={(next) => update(i, { badges: next })}
                  autoLabels={REGISTRY_AUTO_LABELS}
                  placeholder="Couple's pick, Group gift, Already bought…"
                />
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>
    </PanelGroup>
  );
}
