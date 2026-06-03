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

const TONES: Array<'peach' | 'sage' | 'lavender'> = ['peach', 'sage', 'lavender'];

interface StoreEntry { name: string; url?: string }

const DEFAULT_STORES: StoreEntry[] = [
  { name: 'Honeymoon fund' },
  { name: 'Crate & Barrel', url: REGISTRY_STORE_URLS['crate-and-barrel'] },
  { name: 'Zola',           url: REGISTRY_STORE_URLS['zola'] },
];

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
  const intro = ((manifest as unknown as { registryIntro?: string }).registryIntro) ?? 'Your presence is the gift — but if you insist…';
  /* Normalize legacy string[] manifests into { name, url } on read
     so the panel only ever deals with the rich shape. */
  const storesRaw = ((manifest as unknown as { registryStores?: Array<string | StoreEntry> }).registryStores);
  const stores: StoreEntry[] = Array.isArray(storesRaw) && storesRaw.length > 0
    ? storesRaw.map((s): StoreEntry => typeof s === 'string' ? { name: s } : { name: s.name ?? '', url: s.url })
    : DEFAULT_STORES;
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
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={registryEyebrow} onChange={setRegistryEyebrow} placeholder="Registry" />
        </FGroup>
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
        <FGroup label={`Linked registries · ${stores.length}`} hint="Each registry below becomes a clickable pill on the canvas. Pick a store to autofill its link.">
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
                          placeholder="Registry name (e.g. Our honeymoon fund)"
                        />
                      )}
                      <FInput
                        value={s.url ?? ''}
                        onChange={(v) => patchStore(i, { url: v })}
                        type="url"
                        icon="link"
                        placeholder={isCustom ? 'https://your-registry.com' : 'Add your registry link'}
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
            <AddCard label="Link a registry" onClick={addStore} />
          </div>
        </FGroup>
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Registry" />
      </div>
    </SectionPanelShell>
  );
}

export default RegistryPanel;
