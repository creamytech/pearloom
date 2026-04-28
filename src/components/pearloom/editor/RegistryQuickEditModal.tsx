'use client';

// ─────────────────────────────────────────────────────────────
// RegistryQuickEditModal — listens for `pearloom:registry-quick-edit`
// and opens the paper modal with the focused registry entry. The
// canvas event sends `{ url }` because that's the stable key for
// registry rows on the page (`data-pl-registry-id={url}`).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, SelectInput, TextArea, TextInput } from './atoms';
import { BadgesEditor } from './panels/BadgesEditor';
import { Icon } from '../motifs';
import { QuickEditModalShell } from './QuickEditModalShell';
import { SinglePhotoField } from './SinglePhotoField';

interface RegistryRow {
  id: string;
  label: string;
  url: string;
  description?: string;
  kind?: 'fund' | 'registry' | 'link';
  photoUrl?: string;
  badges?: {
    hideAuto?: Array<'mostLoved'>;
    custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }>;
  };
}

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

const REGISTRY_AUTO_LABELS: Record<'mostLoved', string> = {
  mostLoved: 'Most loved',
};

const KINDS = [
  { value: 'fund', label: 'Cash fund' },
  { value: 'registry', label: 'Registry' },
  { value: 'link', label: 'Link' },
];

export function RegistryQuickEditModal({ manifest, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ url?: string; id?: string }>).detail;
      // Canvas sends url; the panel-shape stores id. Resolve the
      // url back to the row id when needed.
      const lookup = detail?.id ?? detail?.url;
      if (!lookup) return;
      setOpenId(lookup);
    }
    window.addEventListener('pearloom:registry-quick-edit', onOpen);
    return () => window.removeEventListener('pearloom:registry-quick-edit', onOpen);
  }, []);

  const items = useMemo<RegistryRow[]>(() => {
    const arr = (manifest as unknown as { registry?: RegistryRow[] }).registry;
    return Array.isArray(arr) ? arr : [];
  }, [manifest]);

  const focused =
    items.find((it) => it.id === openId) ??
    items.find((it) => it.url === openId) ??
    items[0] ??
    null;

  const setItems = useCallback((next: RegistryRow[]) => {
    onChange({ ...manifest, registry: next } as unknown as StoryManifest);
  }, [manifest, onChange]);

  const updateItem = useCallback((id: string, patch: Partial<RegistryRow>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, [items, setItems]);

  const removeItem = useCallback((id: string) => {
    const idx = items.findIndex((it) => it.id === id);
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    if (next.length === 0) {
      setOpenId(null);
      return;
    }
    const fallback = next[Math.min(idx, next.length - 1)];
    setOpenId(fallback.id);
  }, [items, setItems]);

  const addItem = useCallback((kind: RegistryRow['kind'] = 'link') => {
    const id = `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const next: RegistryRow = {
      id,
      label: kind === 'fund' ? 'Honeymoon fund' : kind === 'registry' ? 'Our registry' : 'A link',
      url: '',
      description: '',
      kind,
    };
    setItems([...items, next]);
    setOpenId(id);
  }, [items, setItems]);

  return (
    <QuickEditModalShell
      open={!!openId && !!focused}
      title="Registry"
      focusedTitle={focused?.label || 'New entry'}
      items={items.map((it) => ({
        id: it.id,
        label: it.label || 'Untitled',
        sublabel: it.kind === 'fund' ? 'Cash fund' : it.kind === 'registry' ? 'Registry' : (it.url || ''),
        icon: it.kind === 'fund' ? 'gift' : it.kind === 'registry' ? 'home' : 'link',
        photoUrl: it.photoUrl,
      }))}
      focusedId={focused?.id ?? null}
      onFocusChange={(id) => setOpenId(id)}
      onReorder={(orderedIds) => {
        const byId = new Map(items.map((it) => [it.id, it]));
        const next = orderedIds.map((id) => byId.get(id)).filter((it): it is RegistryRow => Boolean(it));
        const seen = new Set(orderedIds);
        const tail = items.filter((it) => !seen.has(it.id));
        setItems([...next, ...tail]);
      }}
      onBulkDelete={(ids) => {
        const idSet = new Set(ids);
        const next = items.filter((it) => !idSet.has(it.id));
        const snapshot = items;
        setItems(next);
        if (next.length === 0) setOpenId(null);
        else if (focused && idSet.has(focused.id)) setOpenId(next[0].id);
        return () => setItems(snapshot);
      }}
      onBulkTag={(ids, badge) => {
        const idSet = new Set(ids);
        setItems(items.map((it) => {
          if (!idSet.has(it.id)) return it;
          const cur = it.badges?.custom ?? [];
          return {
            ...it,
            badges: {
              ...(it.badges ?? {}),
              custom: [
                ...cur,
                {
                  id: `bdg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
                  label: badge.label,
                  tone: badge.tone,
                },
              ],
            },
          };
        }));
      }}
      onClose={() => setOpenId(null)}
      emptyHint="No registry entries yet."
      searchSlot={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => addItem('fund')} style={addBtn}>
            <Icon name="plus" size={11} /> Cash fund
          </button>
          <button type="button" onClick={() => addItem('registry')} style={addBtn}>
            <Icon name="plus" size={11} /> Registry link
          </button>
          <button type="button" onClick={() => addItem('link')} style={addBtn}>
            <Icon name="plus" size={11} /> Other link
          </button>
        </div>
      }
      editorSlot={
        focused ? (
          <RegistryEditor
            row={focused}
            onChange={(patch) => updateItem(focused.id, patch)}
            onRemove={() => removeItem(focused.id)}
          />
        ) : null
      }
    />
  );
}

const addBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px dashed var(--peach-ink, #C6703D)',
  background: 'transparent',
  color: 'var(--peach-ink, #C6703D)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

function RegistryEditor({
  row,
  onChange,
  onRemove,
}: {
  row: RegistryRow;
  onChange: (patch: Partial<RegistryRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 140px', gap: 12 }}>
        <Field label="Label">
          <TextInput
            value={row.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Honeymoon fund"
          />
        </Field>
        <Field label="Type">
          <SelectInput
            value={row.kind ?? 'fund'}
            onChange={(v) => onChange({ kind: v as RegistryRow['kind'] })}
            options={KINDS}
          />
        </Field>
      </div>
      <Field label="Link" help="Paste a URL — Pear treats it as the click target on the card.">
        <TextInput
          type="url"
          value={row.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://honeyfund.com/…"
        />
      </Field>
      <Field label="Description" help="Two-line blurb under the label on the card.">
        <TextArea
          value={row.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder="Kyoto in October. Thank you, truly."
        />
      </Field>
      <Field label="Thumbnail" help="Optional. Renders on the registry card + sidebar tile.">
        <SinglePhotoField
          value={row.photoUrl}
          onChange={(url) => onChange({ photoUrl: url })}
        />
      </Field>
      <BadgesEditor<'mostLoved'>
        badges={row.badges ?? {}}
        onChange={(next) => onChange({ badges: next })}
        autoLabels={REGISTRY_AUTO_LABELS}
        placeholder="Couple's pick, Group gift, Already bought…"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--line-soft)', marginTop: 6 }}>
        <button
          type="button"
          onClick={onRemove}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid rgba(122,45,45,0.25)',
            background: 'transparent',
            color: '#7A2D2D',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="close" size={11} />
          Remove this entry
        </button>
      </div>
    </div>
  );
}
