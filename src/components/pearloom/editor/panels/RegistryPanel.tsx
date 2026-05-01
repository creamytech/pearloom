'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelGroup, PanelSection, PhotoSlot, SelectInput, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { BadgesEditor } from './BadgesEditor';
import { focusPanelRow } from './focus-row';
import { RegistryClaimsFeed, useRegistryClaims } from '@/components/registry/RegistryClaimsFeed';

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
//
// Implementation lives in @/components/registry/RegistryClaimsFeed
// so the same feed renders on /dashboard/registry — this is just
// the editor wrapper that adds PanelSection chrome around it.
function RecentClaimsSection({ manifest, items }: { manifest: StoryManifest; items: RegistryItem[] }) {
  const subdomain = (manifest as unknown as { subdomain?: string }).subdomain;
  const { rows } = useRegistryClaims(subdomain);
  if (!rows || rows.length === 0) return null;
  return (
    <PanelSection
      label="Recent claims"
      hint="Guests who clicked 'I got this' on your registry. Tap Draft to have Pear write a thank-you."
      defaultOpen={true}
    >
      <RegistryClaimsFeed
        subdomain={subdomain}
        items={items}
        manifest={manifest}
      />
    </PanelSection>
  );
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
  const items = useMemo(() => env.entries ?? [], [env.entries]);
  useRegistryRowFocus();

  const set = useCallback((next: RegistryItem[]) => {
    onChange(writeRegistry(manifest, { ...env, entries: next }));
  }, [manifest, env, onChange]);

  function setFund(patch: Partial<RegistryEnvelope>) {
    onChange(writeRegistry(manifest, { ...env, ...patch }));
  }

  function update(idx: number, patch: Partial<RegistryItem>) {
    set(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  // useCallback so the impure Date.now() reference is in a
  // stable callback body, not a render-time function literal.
  const add = useCallback((kind: RegistryItem['kind'] = 'fund') => {
    const label = kind === 'fund' ? 'Honeymoon fund' : kind === 'registry' ? 'Our registry' : 'A link';
    set([...items, { id: `reg-${Date.now().toString(36)}`, label, url: '', description: '', kind }]);
  }, [items, set]);

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
                deleteLabel={`Delete registry entry ${i + 1}${it.label ? `: ${it.label}` : ''}`}
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
