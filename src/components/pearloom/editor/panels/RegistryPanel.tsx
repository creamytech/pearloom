'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RegistryEditor
   — intro line + LINK-AWARE store list. Each row writes
   { name, url } into manifest.registryStores so the renderer can
   wrap the pill in <a href>. Legacy string[] manifests are
   normalized in ThemedSite's buildCopy. */

import { useCallback, useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { WeaveLoader } from '@/components/brand/WeaveLoader';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { FSelect } from './_form-atoms';
import { PhotoUploadSlot } from './_photo-upload';
import { REGISTRY_STORE_TARGETS, REGISTRY_STORE_URLS } from './_link-targets';
import { PearInlineRewrite } from '../../redesign/PearAssist';
import { cleanCashtag, cleanVenmo, type RegistryFunds } from '@/lib/registry-funds';
import { useVoicePack } from './_voice-pack';
import { readVariant } from '../../redesign/layouts';
import { occasionCopyFor } from '../../redesign/occasion-copy';

/** Registry MODE — re-skins the entire section for non-wedding
 *  events. Drives the section label, intro placeholder, AddCard
 *  text, and the curated store dropdown's relevance. */
type RegistryMode = 'gifts' | 'fund' | 'donation' | 'wishlist' | 'tip-jar';

const MODE_LABELS: Record<RegistryMode, { section: string; intro: string; add: string; placeholder: string }> = {
  gifts:    { section: 'Registry',          intro: 'Your presence is the gift — but if you insist…',           add: 'Link a registry',     placeholder: 'Pick a store' },
  fund:     { section: 'Honeymoon fund',    intro: 'Pitching in toward the trip means the world.',             add: 'Add a fund link',     placeholder: 'Link to Honeyfund / Venmo / Zelle' },
  donation: { section: 'In lieu of flowers', intro: 'In lieu of flowers, donations may be made to the causes below.', add: 'Add a charity',       placeholder: 'Pick a cause' },
  wishlist: { section: 'Wishlist',          intro: 'No gifts needed, but if you want to spoil us…',            add: 'Add a wish',          placeholder: 'Link to your wishlist' },
  'tip-jar':{ section: 'Tip the host',      intro: 'A coffee, a cocktail, a bag of chips — whatever you fancy.', add: 'Add a tip link',     placeholder: 'Venmo, Zelle, Cash App…' },
};

const TONES: Array<'peach' | 'sage' | 'lavender'> = ['peach', 'sage', 'lavender'];

interface StoreEntry { name: string; url?: string; note?: string }

/** Demo rows mirror the canvas — both sides read
 *  occasionCopyFor(occasion).registryDemoStores (Zola on a wedding,
 *  Babylist on a baby shower, 'In lieu of flowers' on a memorial).
 *  Known catalog stores get their URL back-filled so the pill
 *  stays clickable. */
function defaultStoresFor(occasion?: string): StoreEntry[] {
  return occasionCopyFor(occasion).registryDemoStores.map((name) => ({
    name,
    url: REGISTRY_STORE_URLS[presetIdForName(name)],
  }));
}

/** Resolve which curated catalog entry (if any) matches this store's
 *  name — used to back-derive the dropdown's selected value when
 *  loading a saved manifest. */
function presetIdForName(name: string): string {
  const lc = name.trim().toLowerCase();
  const m = REGISTRY_STORE_TARGETS.find((t) => t.label.toLowerCase() === lc);
  return m ? m.value : 'custom';
}

export function RegistryPanel({ manifest, onChange, siteSlug }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; siteSlug?: string }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'registry');
  /* Voice pack — currently consumed only for future re-skins;
     mode picker above is the primary driver. */
  void useVoicePack(manifest);
  /* Mode lives at manifest.registryMode. Default: 'gifts' for
     weddings + showers (preserves legacy behaviour), 'donation'
     for memorials, 'fund' otherwise. */
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const defaultMode: RegistryMode = occasion === 'memorial' || occasion === 'funeral'
    ? 'donation'
    : (occasion === 'wedding' || occasion === 'engagement' || occasion === 'bridal-shower' || occasion === 'baby-shower' || occasion === 'housewarming')
      ? 'gifts'
      : 'fund';
  const mode: RegistryMode = ((manifest as unknown as { registryMode?: RegistryMode }).registryMode) ?? defaultMode;
  const setMode = (next: RegistryMode) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    registryMode: next,
  } as unknown as StoryManifest);
  const modeCopy = MODE_LABELS[mode];
  /* Custom-name + note placeholders follow the mode — 'Our
     honeymoon fund' only reads right on a wedding-arc couple
     registry or fund; a memorial gets charity wording, a wishlist
     gets wishlist wording. */
  const weddingArcCouple = occasion == null || occasion === 'wedding' || occasion === 'engagement' || occasion === 'vow-renewal';
  const namePlaceholder = weddingArcCouple && (mode === 'gifts' || mode === 'fund')
    ? 'Registry name (e.g. Our honeymoon fund)'
    : mode === 'donation' ? 'e.g. The family’s chosen charity'
      : mode === 'wishlist' ? 'e.g. A wishlist'
        : 'Registry name';
  const notePlaceholder = weddingArcCouple && (mode === 'gifts' || mode === 'fund')
    ? "A note under it — 'for the honeymoon' (optional)"
    : 'A note under it (optional)';

  /* Layout-aware extras — only the Progress variant uses fundPct
     and fundSub. When the host's on Progress, expose the slider
     and the subtitle field; otherwise hide them. */
  const activeVariant = readVariant(manifest, 'registry');
  const isProgress = activeVariant === 'progress';
  const fundPct = ((manifest as unknown as { fundPct?: number }).fundPct) ?? 0;
  const fundSub = ((manifest as unknown as { fundSub?: string }).fundSub) ?? '';
  const setFundPct = (n: number) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    fundPct: Math.max(0, Math.min(100, Math.round(n))),
  } as unknown as StoryManifest);
  const setFundSub = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    fundSub: v,
  } as unknown as StoryManifest);
  const intro = ((manifest as unknown as { registryIntro?: string }).registryIntro) ?? modeCopy.intro;
  /* Normalize legacy string[] manifests into { name, url } on read
     so the panel only ever deals with the rich shape. */
  const storesRaw = ((manifest as unknown as { registryStores?: Array<string | StoreEntry> }).registryStores);
  const stores: StoreEntry[] = Array.isArray(storesRaw) && storesRaw.length > 0
    ? storesRaw.map((s): StoreEntry => typeof s === 'string' ? { name: s } : { name: s.name ?? '', url: s.url })
    : defaultStoresFor(occasion);
  const [registryEyebrow, setRegistryEyebrow] = useCopyOverride(manifest, onChange, 'registryEyebrow');

  const setIntro = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    registryIntro: v,
  } as unknown as StoryManifest);
  const writeStores = (next: StoreEntry[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    registryStores: next,
  } as unknown as StoryManifest);
  const patchStore = (i: number, patch: Partial<StoreEntry>) =>
    writeStores(stores.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  const removeStore = (i: number) => writeStores(stores.filter((_, idx) => idx !== i));
  const addStore = () => writeStores([...stores, { name: '' }]);

  /** When the host picks a preset from the dropdown, set BOTH the
   *  name AND the default URL. Custom clears the URL so the input
   *  shows up empty, ready for them to paste. */
  const handlePresetPick = (i: number, presetId: string) => {
    if (presetId === 'custom') {
      patchStore(i, { url: '' });
      return;
    }
    const preset = REGISTRY_STORE_TARGETS.find((t) => t.value === presetId);
    if (!preset) return;
    patchStore(i, { name: preset.label, url: REGISTRY_STORE_URLS[presetId] });
  };

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── Zip RegistryEditor layout (section-fields.jsx L252-271):
              Intro line · Linked registries · N (store rows + AddCard).
              The production-only extras (registry mode, eyebrow, and
              the layout-driven progress controls) live tucked under
              "More" below so the default view is 1:1. */}
        <FGroup label="Intro line">
          <FInput value={intro} onChange={setIntro} />
          {intro.trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                value={intro}
                onCommit={setIntro}
                context="registry intro line"
              />
            </div>
          )}
        </FGroup>
        {/* ── R2-lite cash funds — the host's OWN P2P handles.
              Pearloom never processes gift money; these render as
              "Give directly" links on the site with an honor-system
              pledge thread. Fund + donation modes only. */}
        {(mode === 'fund' || mode === 'donation') && (
          <FundHandlesGroup manifest={manifest} onChange={onChange} donation={mode === 'donation'} />
        )}

        {/* ── Native items — the reserve-and-link registry. Hidden in
              donation mode (charity links have nothing to reserve). */}
        {mode !== 'donation' && siteSlug && <RegistryItemsGroup siteSlug={siteSlug} />}

        <FGroup label={`${modeCopy.section} · ${stores.length}`} hint="Each link below becomes a clickable pill on the canvas.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stores.map((s, i) => {
              const presetId = presetIdForName(s.name);
              const isCustom = presetId === 'custom';
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                    padding: 10, borderRadius: 11,
                    background: 'var(--card)', border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 8, background: `var(--${TONES[i % TONES.length]}-2)`, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
                      <Icon name="gift" size={14} color="#3D4A1F" />
                    </span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <FSelect
                        value={presetId}
                        onChange={(v) => handlePresetPick(i, v)}
                        options={[
                          ...REGISTRY_STORE_TARGETS,
                          { value: 'custom', label: 'Custom registry…', hint: 'Type your own name + URL' },
                        ]}
                      />
                      {isCustom && (
                        <FInput
                          value={s.name}
                          onChange={(v) => patchStore(i, { name: v })}
                          placeholder={namePlaceholder}
                        />
                      )}
                      <FInput
                        value={s.url ?? ''}
                        onChange={(v) => patchStore(i, { url: v })}
                        type="url"
                        icon="link"
                        placeholder={isCustom ? 'https://your-registry.com' : 'Add your registry link'}
                      />
                      <FInput
                        value={(s as { note?: string }).note ?? ''}
                        onChange={(v) => patchStore(i, { note: v || undefined } as Partial<StoreEntry>)}
                        placeholder={notePlaceholder}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStore(i)}
                      aria-label={`Remove ${s.name || 'this registry'}`}
                      style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', marginTop: 2 }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            <AddCard label={modeCopy.add} onClick={addStore} />
          </div>
        </FGroup>

        <details className="pl-panel-more">
          <summary
            style={{
              cursor: 'pointer', listStyle: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}
          >
            <Icon name="chev-down" size={12} /> More — registry kind, eyebrow, progress
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <FGroup label="What kind of registry" hint="Re-skins the whole section for your event's tone.">
              <FSelect
                value={mode}
                onChange={(v) => setMode(v as RegistryMode)}
                options={[
                  { value: 'gifts',    label: 'Gift registry',     hint: 'Store-linked physical gifts' },
                  { value: 'fund',     label: 'Honeymoon / event fund', hint: 'Pool money toward something' },
                  { value: 'donation', label: 'In lieu of flowers / donations', hint: 'Charitable causes' },
                  { value: 'wishlist', label: 'Wishlist',          hint: 'Personal-wishlist links' },
                  { value: 'tip-jar',  label: 'Tip jar',           hint: 'Venmo / Zelle / Cash App' },
                ]}
                icon="gift"
              />
            </FGroup>
            <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
              <FInput value={registryEyebrow} onChange={setRegistryEyebrow} placeholder={modeCopy.section} />
            </FGroup>

            {/* Layout-aware: the Progress variant renders a fund
                progress bar. Surface its inputs ONLY when that
                variant is active — keeps the panel uncluttered for
                the other 3 layouts. */}
            {isProgress && (
              <FGroup label="Progress bar" hint="Shown on the Progress layout only.">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26, fontWeight: 700,
                    color: 'var(--peach-ink)',
                    lineHeight: 1, minWidth: 50,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fundPct}%
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={fundPct}
                    onChange={(e) => setFundPct(Number(e.target.value))}
                    style={{
                      flex: 1,
                      accentColor: 'var(--peach-ink)',
                      height: 4,
                    }}
                  />
                </div>
                <div style={{ height: 6 }} />
                <FInput
                  value={fundSub}
                  onChange={setFundSub}
                  placeholder={`${fundPct}% funded`}
                />
                <div style={{ marginTop: 5, fontSize: 10.5, color: 'var(--ink-muted)' }}>
                  Subtitle below the fund name. Defaults to “{fundPct}% funded” if blank.
                </div>
              </FGroup>
            )}

            {!isProgress && (mode === 'fund' || mode === 'tip-jar') && (
              /* Discoverability hint for the Progress layout. Hosts on
                 cards/chips/logo-wall layouts don't realize the fund
                 modes have a dedicated visual with a real progress bar.
                 Only surfaced for fund/tip-jar modes since the bar
                 makes no sense for gifts/wishlist. */
              <div
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: 10, borderRadius: 10,
                  background: 'var(--peach-bg)',
                  border: '1px solid rgba(198,112,61,0.18)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--peach-ink)', marginBottom: 2 }}>
                    Show a progress bar?
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                    The <strong>Progress</strong> layout adds a fund-funded percentage and a peach bar to this section. Switch in the Layout tab to enable it.
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Registry" />
      </div>
    </SectionPanelShell>
  );
}

/* ─── "Where guests can give" — R2-lite fund handles ────────────
   Writes manifest.registryFunds. Light validation only: @ / $
   prefixes are stripped as the host types; the PayPal link is
   upgraded to https; the goal is dollars in → cents stored.
   Launch constraint: these are the host's OWN handles — Pearloom
   never processes the money. */

function FundHandlesGroup({ manifest, onChange, donation }: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  donation: boolean;
}) {
  const funds: RegistryFunds = ((manifest as unknown as { registryFunds?: RegistryFunds }).registryFunds) ?? {};

  const write = (patch: Partial<RegistryFunds>) => {
    const next: RegistryFunds = { ...funds, ...patch };
    // Drop empty fields so the manifest stays clean.
    (Object.keys(next) as Array<keyof RegistryFunds>).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === '' || (k === 'goalCents' && !(typeof v === 'number' && v > 0))) {
        delete next[k];
      }
    });
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      registryFunds: Object.keys(next).length > 0 ? next : undefined,
    } as unknown as StoryManifest);
  };

  return (
    <FGroup
      label={donation ? 'Where donations go' : 'Where guests can give'}
      hint={donation
        ? 'The receiving handles — donations go straight where you point them. Pearloom never touches the money.'
        : 'Your own Venmo / PayPal / Cash App / Zelle — gifts go straight to you. Pearloom never touches the money.'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <FInput
          value={funds.venmo ?? ''}
          onChange={(v) => write({ venmo: cleanVenmo(v) || undefined })}
          placeholder="Venmo username (no @)"
        />
        <FInput
          value={funds.paypal ?? ''}
          onChange={(v) => write({ paypal: v.trim().replace(/^http:\/\//i, 'https://') || undefined })}
          type="url"
          placeholder="PayPal.Me link (paypal.me/yourname)"
        />
        <FInput
          value={funds.cashapp ?? ''}
          onChange={(v) => write({ cashapp: cleanCashtag(v) || undefined })}
          placeholder="Cash App cashtag (no $)"
        />
        <FInput
          value={funds.zelle ?? ''}
          onChange={(v) => write({ zelle: v.trim() || undefined })}
          placeholder="Zelle — email or phone"
        />
        <FInput
          value={funds.goalCents != null ? String(funds.goalCents / 100) : ''}
          onChange={(v) => {
            const n = parseFloat(v);
            write({ goalCents: Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined });
          }}
          type="number"
          placeholder={donation ? 'Goal in dollars (optional)' : 'Goal in dollars (optional) — e.g. 3000'}
        />
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          With a goal set, the site shows a progress thread from what guests
          share after giving — &ldquo;as shared by guests&rdquo;, never invented.
        </div>
      </div>
    </FGroup>
  );
}

/* ─── Native items manager ──────────────────────────────────────
   Real registry_items rows (the reserve-and-link flow on the
   published site) — NOT manifest state. Fetches the owner view on
   panel open, writes through /api/registry-items with optimistic
   updates, and shows claim counts so the host can see what's been
   spoken for. */

interface OwnerItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  itemUrl: string | null;
  quantity: number;
  quantityClaimed: number;
  claimedByName?: string | null;
}

interface ItemDraft {
  name: string;
  price: string;
  quantity: string;
  imageUrl: string;
  itemUrl: string;
  description: string;
}

const EMPTY_DRAFT: ItemDraft = { name: '', price: '', quantity: '1', imageUrl: '', itemUrl: '', description: '' };

function draftFrom(item: OwnerItem): ItemDraft {
  return {
    name: item.name,
    price: item.price != null ? String(item.price) : '',
    quantity: String(item.quantity || 1),
    imageUrl: item.imageUrl ?? '',
    itemUrl: item.itemUrl ?? '',
    description: item.description ?? '',
  };
}

function RegistryItemsGroup({ siteSlug }: { siteSlug: string }) {
  const [items, setItems] = useState<OwnerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** null = closed · 'new' = add form · item id = editing that row. */
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  /* Add-by-URL — paste a product link, Pear reads the page and
     prefills the add-item form. The host edits, then saves through
     the normal items POST. */
  const [pasteUrl, setPasteUrl] = useState('');
  const [reading, setReading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const r = await fetch(`/api/registry-items?siteId=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('fetch failed');
      const d = (await r.json()) as { items?: OwnerItem[] };
      setItems(d.items ?? []);
    } catch {
      setItems((prev) => prev ?? []);
      setError('Couldn’t load your items — reopen the panel to retry.');
    }
  }, [siteSlug]);

  useEffect(() => {
    const t = setTimeout(() => { void refetch(); }, 0);
    return () => clearTimeout(t);
  }, [refetch]);

  function startAdd() {
    setDraft(EMPTY_DRAFT);
    setOpen('new');
    setError(null);
  }

  async function readProductUrl() {
    const url = pasteUrl.trim();
    if (!url || reading) return;
    setReading(true);
    setPasteError(null);
    try {
      const r = await fetch('/api/registry-items/from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const d = (await r.json().catch(() => ({}))) as {
        ok?: boolean; title?: string | null; imageUrl?: string | null;
        price?: number | null; store?: string | null; error?: string;
      };
      if (!r.ok || !d.ok) throw new Error(d.error ?? 'Couldn’t read that page — add it by hand.');
      // Prefill the add form — the host edits, then "Set it" saves
      // through the normal items API.
      setDraft({
        name: d.title ?? '',
        price: typeof d.price === 'number' ? String(d.price) : '',
        quantity: '1',
        imageUrl: d.imageUrl ?? '',
        itemUrl: url,
        description: '',
      });
      setOpen('new');
      setError(null);
      setPasteUrl('');
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : 'Couldn’t read that page — add it by hand.');
    } finally {
      setReading(false);
    }
  }
  function startEdit(item: OwnerItem) {
    setDraft(draftFrom(item));
    setOpen(item.id);
    setError(null);
  }

  async function save() {
    if (saving) return;
    const price = parseFloat(draft.price);
    const qty = parseInt(draft.quantity, 10);
    if (!draft.name.trim()) { setError('Give it a name first.'); return; }
    if (!Number.isFinite(price) || price <= 0) { setError('Price needs to be a number above 0.'); return; }
    if (!Number.isFinite(qty) || qty < 1) { setError('Quantity is at least 1.'); return; }
    setSaving(true);
    setError(null);
    const body = {
      siteId: siteSlug,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price,
      quantity: qty,
      imageUrl: draft.imageUrl.trim() || null,
      itemUrl: draft.itemUrl.trim() || null,
    };
    try {
      if (open === 'new') {
        const r = await fetch('/api/registry-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = (await r.json().catch(() => ({}))) as { item?: OwnerItem; error?: string };
        if (!r.ok || !d.item) throw new Error(d.error ?? 'Couldn’t add the item.');
        setItems((prev) => [...(prev ?? []), d.item as OwnerItem]);
      } else if (open) {
        // Optimistic — patch locally, then hit the network.
        const id = open;
        setItems((prev) => (prev ?? []).map((it) => it.id === id
          ? {
            ...it,
            name: body.name, description: body.description, price,
            quantity: qty, imageUrl: body.imageUrl, itemUrl: body.itemUrl,
          }
          : it));
        const r = await fetch('/api/registry-items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...body }),
        });
        if (!r.ok) {
          const d = (await r.json().catch(() => ({}))) as { error?: string };
          void refetch();
          throw new Error(d.error ?? 'Couldn’t save — restored the last version.');
        }
      }
      setOpen(null);
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save.');
    } finally {
      setSaving(false);
    }
  }

  function remove(id: string) {
    // Optimistic remove; restore from the server on failure.
    setItems((prev) => (prev ?? []).filter((it) => it.id !== id));
    if (open === id) setOpen(null);
    void fetch(`/api/registry-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((r) => { if (!r.ok) void refetch(); })
      .catch(() => { void refetch(); });
  }

  const count = items?.length ?? 0;

  return (
    <FGroup
      label={count > 0 ? `Items · ${count}` : 'Items'}
      hint="Real gifts guests reserve right on the site — they render above your linked stores."
    >
      {/* Paste a product link — Pear reads the page + prefills. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FInput
              value={pasteUrl}
              onChange={(v) => { setPasteUrl(v); if (pasteError) setPasteError(null); }}
              type="url"
              icon="link"
              placeholder="Paste a product link — Pear reads the page"
            />
          </div>
          <button
            type="button"
            onClick={() => { void readProductUrl(); }}
            disabled={reading || !pasteUrl.trim()}
            style={{
              padding: '0 14px', borderRadius: 10, flexShrink: 0,
              background: 'var(--ink)', color: 'var(--cream)', border: 'none',
              fontSize: 11.5, fontWeight: 700,
              cursor: reading || !pasteUrl.trim() ? 'default' : 'pointer',
              opacity: reading || !pasteUrl.trim() ? 0.55 : 1,
            }}
          >
            {reading ? 'Threading…' : 'Read it'}
          </button>
        </div>
        {pasteError && (
          <div style={{ fontSize: 11, color: 'var(--plum, #7A2D2D)' }}>{pasteError}</div>
        )}
      </div>
      {items === null ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: '14px 0' }}>
          <WeaveLoader size="sm" ariaLabel="Threading" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                padding: 10, borderRadius: 11,
                background: 'var(--card)', border: '1px solid var(--line)',
              }}
            >
              {open === item.id ? (
                <ItemFields draft={draft} setDraft={setDraft} saving={saving} error={error}
                  onSave={save} onCancel={() => { setOpen(null); setError(null); }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--sage-2)', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Icon name="gift" size={14} color="#3D4A1F" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                      {typeof item.price === 'number' ? `$${item.price}` : '—'}
                      {' · '}{item.quantityClaimed} of {item.quantity} spoken for
                      {item.itemUrl ? <> · <Icon name="link" size={9} color="var(--ink-muted)" /> linked</> : null}
                    </div>
                    {item.claimedByName && item.quantityClaimed > 0 && (
                      <div style={{ fontSize: 10.5, color: 'var(--peach-ink, #C6703D)', marginTop: 2 }}>
                        Last basted in by {item.claimedByName}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.name}`}
                    style={{ padding: '3px 9px', borderRadius: 7, background: 'transparent', border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 10.5, fontWeight: 700, marginTop: 2 }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', marginTop: 2 }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {open === 'new' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
              <ItemFields draft={draft} setDraft={setDraft} saving={saving} error={error}
                onSave={save} onCancel={() => { setOpen(null); setError(null); }} />
            </div>
          ) : (
            <AddCard label="Add an item" onClick={startAdd} />
          )}

          {error && open === null && (
            <div style={{ fontSize: 11, color: 'var(--plum, #7A2D2D)' }}>{error}</div>
          )}
        </div>
      )}
    </FGroup>
  );
}

function ItemFields({
  draft, setDraft, saving, error, onSave, onCancel,
}: {
  draft: ItemDraft;
  setDraft: (next: ItemDraft) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Item name (e.g. The dutch oven)" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <FInput value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} type="number" placeholder="Price (USD)" />
        <FInput value={draft.quantity} onChange={(v) => setDraft({ ...draft, quantity: v })} type="number" placeholder="Quantity" />
      </div>
      <FInput value={draft.itemUrl} onChange={(v) => setDraft({ ...draft, itemUrl: v })} type="url" icon="link" placeholder="Product link (optional — the 'buy it' handoff)" />
      <FInput value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} placeholder="A quiet line under it (optional)" />
      <PhotoUploadSlot
        url={draft.imageUrl}
        onChange={(next) => setDraft({ ...draft, imageUrl: next })}
        aspectRatio="4/3"
        size="sm"
        hint="A photo of the item (optional)"
      />
      {error && <div style={{ fontSize: 11, color: 'var(--plum, #7A2D2D)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{ padding: '7px 14px', borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', border: 'none', fontSize: 11.5, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Threading…' : 'Set it'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{ padding: '7px 12px', borderRadius: 999, background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--line)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default RegistryPanel;
