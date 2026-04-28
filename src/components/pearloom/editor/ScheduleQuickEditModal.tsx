'use client';

// ─────────────────────────────────────────────────────────────
// ScheduleQuickEditModal — listens for `pearloom:schedule-quick-edit`
// and opens the shared paper modal with the focused event in
// edit mode. Schedule rows live in `manifest.events` and carry
// time / name / type / venue / address / description / badges.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest, WeddingEvent } from '@/types';
import { Field, SelectInput, TextArea, TextInput } from './atoms';
import { TimePicker } from './v8-forms';
import { BadgesEditor } from './panels/BadgesEditor';
import { Icon } from '../motifs';
import { QuickEditModalShell } from './QuickEditModalShell';

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

const SCHEDULE_AUTO_LABELS: Record<'main', string> = {
  main: 'Main moment',
};

const TYPE_OPTIONS: Array<{ value: WeddingEvent['type']; label: string }> = [
  { value: 'welcome-party', label: 'Welcome' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'reception', label: 'Reception' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'other', label: 'Other' },
];

export function ScheduleQuickEditModal({ manifest, onChange }: Props) {
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ eventId?: string }>).detail;
      if (!detail?.eventId) return;
      setOpenEventId(detail.eventId);
    }
    window.addEventListener('pearloom:schedule-quick-edit', onOpen);
    return () => window.removeEventListener('pearloom:schedule-quick-edit', onOpen);
  }, []);

  const items = useMemo<WeddingEvent[]>(() => {
    const arr = manifest.events;
    return Array.isArray(arr) ? arr : [];
  }, [manifest.events]);

  const focused = items.find((e) => e.id === openEventId) ?? items[0] ?? null;

  const setItems = useCallback((next: WeddingEvent[]) => {
    onChange({ ...manifest, events: next.map((e, i) => ({ ...e, order: i })) });
  }, [manifest, onChange]);

  const updateItem = useCallback((id: string, patch: Partial<WeddingEvent>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, [items, setItems]);

  const removeItem = useCallback((id: string) => {
    const idx = items.findIndex((it) => it.id === id);
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    if (next.length === 0) {
      setOpenEventId(null);
      return;
    }
    const fallback = next[Math.min(idx, next.length - 1)];
    setOpenEventId(fallback.id);
  }, [items, setItems]);

  const addItem = useCallback(() => {
    const id = `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const next: WeddingEvent = {
      id,
      name: 'New event',
      type: 'other',
      date: manifest.logistics?.date ?? '',
      time: '',
      venue: '',
      address: '',
      description: '',
    };
    setItems([...items, next]);
    setOpenEventId(id);
  }, [items, setItems, manifest.logistics?.date]);

  return (
    <QuickEditModalShell
      open={!!openEventId && !!focused}
      title="Schedule"
      focusedTitle={focused?.name || 'New event'}
      items={items.map((it) => ({
        id: it.id,
        label: it.name || 'Untitled',
        sublabel: it.time ? `${it.time} · ${it.venue || ''}` : (it.venue || ''),
        icon: it.type === 'ceremony' ? 'sparkles' : it.type === 'reception' ? 'sparkles' : 'calendar',
      }))}
      focusedId={focused?.id ?? null}
      onFocusChange={(id) => setOpenEventId(id)}
      onReorder={(orderedIds) => {
        const byId = new Map(items.map((it) => [it.id, it]));
        const next = orderedIds.map((id) => byId.get(id)).filter((it): it is WeddingEvent => Boolean(it));
        const seen = new Set(orderedIds);
        const tail = items.filter((it) => !seen.has(it.id));
        setItems([...next, ...tail]);
      }}
      onBulkDelete={(ids) => {
        const idSet = new Set(ids);
        const next = items.filter((it) => !idSet.has(it.id));
        setItems(next);
        if (next.length === 0) setOpenEventId(null);
        else if (focused && idSet.has(focused.id)) setOpenEventId(next[0].id);
      }}
      onClose={() => setOpenEventId(null)}
      emptyHint="No events yet. Add one to start."
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
          <Icon name="plus" size={11} /> Add an event
        </button>
      }
      editorSlot={
        focused ? (
          <ScheduleEditor
            event={focused}
            onChange={(patch) => updateItem(focused.id, patch)}
            onRemove={() => removeItem(focused.id)}
          />
        ) : null
      }
    />
  );
}

function ScheduleEditor({
  event,
  onChange,
  onRemove,
}: {
  event: WeddingEvent;
  onChange: (patch: Partial<WeddingEvent>) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Title">
        <TextInput
          value={event.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ceremony"
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Time">
          <TimePicker
            value={event.time ?? ''}
            onChange={(v) => onChange({ time: v })}
            ariaLabel="Event time"
          />
        </Field>
        <Field label="Type">
          <SelectInput
            value={event.type ?? 'other'}
            onChange={(v) => onChange({ type: v as WeddingEvent['type'] })}
            options={TYPE_OPTIONS.map((o) => ({ value: o.value as string, label: o.label }))}
          />
        </Field>
      </div>
      <Field label="Venue">
        <TextInput
          value={event.venue ?? ''}
          onChange={(e) => onChange({ venue: e.target.value })}
          placeholder="The Garden Room"
        />
      </Field>
      <Field label="Address">
        <TextInput
          value={event.address ?? ''}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="If different from main venue"
        />
      </Field>
      <Field label="Description">
        <TextArea
          value={event.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          placeholder="Forty minutes, give or take a few happy tears."
        />
      </Field>
      <Field label="Notes for guests" help="Optional. Lands in the schedule strip when present.">
        <TextArea
          value={event.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Extra context only the schedule needs."
        />
      </Field>
      <BadgesEditor<'main'>
        badges={(event.badges ?? {}) as { hideAuto?: 'main'[]; custom?: Array<{ id: string; label: string; tone?: 'peach' | 'sage' | 'lavender' | 'ink' }> }}
        onChange={(next) => onChange({ badges: next as WeddingEvent['badges'] })}
        autoLabels={SCHEDULE_AUTO_LABELS}
        placeholder="Optional, After-party, Photographer…"
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
          Remove this event
        </button>
      </div>
    </div>
  );
}
