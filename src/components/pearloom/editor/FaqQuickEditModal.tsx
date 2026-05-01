'use client';

// ─────────────────────────────────────────────────────────────
// FaqQuickEditModal — listens for `pearloom:faq-quick-edit` and
// opens the same paper-styled shell as the hotel modal so hosts
// edit FAQ rows in real estate the side panel can't offer.
//
// Sidebar lists every question. Editor pane shows the focused
// row's question + answer + badge picker. Top "Add a question"
// button mints a fresh row at the top so flows like "I want to
// add a parking note real quick" don't require closing the modal.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Field, TextArea, TextInput } from './atoms';
import { BadgesEditor } from './panels/BadgesEditor';
import { Icon } from '../motifs';
import { QuickEditModalShell } from './QuickEditModalShell';

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  badges?: {
    hideAuto?: string[];
    custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }>;
  };
}

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

const FAQ_AUTO_LABELS: Record<'mostAsked', string> = {
  mostAsked: 'Most asked',
};

export function FaqQuickEditModal({ manifest, onChange }: Props) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ faqId?: string }>).detail;
      if (!detail?.faqId) return;
      setOpenFaqId(detail.faqId);
    }
    window.addEventListener('pearloom:faq-quick-edit', onOpen);
    return () => window.removeEventListener('pearloom:faq-quick-edit', onOpen);
  }, []);

  const items = useMemo<FaqRow[]>(() => {
    const arr = (manifest as unknown as { faq?: FaqRow[] }).faq;
    return Array.isArray(arr) ? arr : [];
  }, [manifest]);

  const focused = items.find((it) => it.id === openFaqId) ?? items[0] ?? null;

  const setItems = useCallback((next: FaqRow[]) => {
    onChange({ ...manifest, faq: next } as unknown as StoryManifest);
  }, [manifest, onChange]);

  const updateItem = useCallback((id: string, patch: Partial<FaqRow>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, [items, setItems]);

  const removeItem = useCallback((id: string) => {
    const idx = items.findIndex((it) => it.id === id);
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    if (next.length === 0) {
      setOpenFaqId(null);
      return;
    }
    const fallback = next[Math.min(idx, next.length - 1)];
    setOpenFaqId(fallback.id);
  }, [items, setItems]);

  const addItem = useCallback(() => {
    const id = `faq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const next: FaqRow = { id, question: 'New question', answer: '' };
    setItems([...items, next]);
    setOpenFaqId(id);
  }, [items, setItems]);

  return (
    <QuickEditModalShell
      open={!!openFaqId && !!focused}
      title="FAQ"
      focusedTitle={focused?.question || 'New question'}
      items={items.map((it) => ({
        id: it.id,
        label: it.question || 'Untitled question',
        sublabel: (it.answer || '').slice(0, 64),
        icon: 'heart-icon',
      }))}
      focusedId={focused?.id ?? null}
      onFocusChange={(id) => setOpenFaqId(id)}
      onReorder={(orderedIds) => {
        const byId = new Map(items.map((it) => [it.id, it]));
        const next = orderedIds.map((id) => byId.get(id)).filter((it): it is FaqRow => Boolean(it));
        const seen = new Set(orderedIds);
        const tail = items.filter((it) => !seen.has(it.id));
        setItems([...next, ...tail]);
      }}
      onBulkDelete={(ids) => {
        const idSet = new Set(ids);
        const next = items.filter((it) => !idSet.has(it.id));
        const snapshot = items;
        setItems(next);
        if (next.length === 0) setOpenFaqId(null);
        else if (focused && idSet.has(focused.id)) setOpenFaqId(next[0].id);
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
      onClose={() => setOpenFaqId(null)}
      emptyHint="Nothing yet. Add the first question to begin."
      searchSlot={
        <button
          type="button"
          onClick={addItem}
          style={{
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
          }}
        >
          <Icon name="plus" size={11} /> Add a question
        </button>
      }
      editorSlot={
        focused ? (
          <FaqEditor
            row={focused}
            onChange={(patch) => updateItem(focused.id, patch)}
            onRemove={() => removeItem(focused.id)}
          />
        ) : null
      }
    />
  );
}

function FaqEditor({
  row,
  onChange,
  onRemove,
}: {
  row: FaqRow;
  onChange: (patch: Partial<FaqRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Question">
        <TextInput
          value={row.question}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="What should I wear?"
        />
      </Field>
      <Field label="Answer" help="Two or three sentences usually does it. The shorter, the better.">
        <TextArea
          value={row.answer}
          onChange={(e) => onChange({ answer: e.target.value })}
          rows={6}
          placeholder="Cocktail attire — elevated but comfortable. Think elegant dinner party."
        />
      </Field>
      <BadgesEditor<'mostAsked'>
        badges={(row.badges ?? {}) as { hideAuto?: 'mostAsked'[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> }}
        onChange={(next) => onChange({ badges: next })}
        autoLabels={FAQ_AUTO_LABELS}
        placeholder="Most asked, Important, Update…"
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
          Remove this question
        </button>
      </div>
    </div>
  );
}
