'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx RegistryEditor
   — intro line + LINK-AWARE store list. Each row writes
   { name, url } into manifest.registryStores so the renderer can
   wrap the pill in <a href>. Legacy string[] manifests are
   normalized in ThemedSite's buildCopy. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { FSelect } from './_form-atoms';
import { REGISTRY_STORE_TARGETS, REGISTRY_STORE_URLS } from './_link-targets';
import { PearInlineRewrite } from '../../redesign/PearAssist';
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

export function RegistryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
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

export default RegistryPanel;
