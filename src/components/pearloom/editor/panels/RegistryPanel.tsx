'use client';

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelGroup, PanelSection, SelectInput, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';

type RegistryItem = { id: string; label: string; url: string; description?: string; kind?: 'fund' | 'registry' | 'link' };

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
      items?: Array<{ label: string; url: string; description?: string; kind?: 'fund' | 'registry' | 'link' }>;
      label?: string;
    };
    const now = Date.now();
    const imported: RegistryItem[] = (data.items ?? []).map((it, i) => ({
      id: `reg-ai-${now.toString(36)}-${i}`,
      label: it.label,
      url: it.url,
      description: it.description,
      kind: it.kind ?? 'registry',
    }));
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

function get(m: StoryManifest): RegistryItem[] {
  const arr = (m as unknown as { registry?: RegistryItem[] }).registry;
  return Array.isArray(arr) ? arr : [];
}

export function RegistryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const items = get(manifest);

  function set(next: RegistryItem[]) {
    onChange({ ...manifest, registry: next } as unknown as StoryManifest);
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
              <SortableRowCard handle={handle} onDelete={() => set(items.filter((_, idx) => idx !== i))}>
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
                <Field label="Link">
                  <TextInput
                    type="url"
                    value={it.url}
                    onChange={(e) => update(i, { url: e.target.value })}
                    placeholder="https://honeyfund.com/…"
                  />
                </Field>
                <Field label="Short description">
                  <TextArea
                    rows={2}
                    value={it.description ?? ''}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Kyoto in October. Thank you, truly."
                  />
                </Field>
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>
    </PanelGroup>
  );
}
