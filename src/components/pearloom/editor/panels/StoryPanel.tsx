'use client';

import { useRef, type ChangeEvent } from 'react';
import type { StoryManifest, Chapter } from '@/types';
import { AddRowButton, EmptyBlockState, Field, PanelSection, PhotoSlot, TextArea, TextInput } from '../atoms';
import { SortableList, SortableRowCard } from '../sortable';
import { AIHint, AISuggestButton, useAICall } from '../ai';
import { Icon } from '../../motifs';

function PhotoChaptersAI({
  manifest,
  onResult,
}: {
  manifest: StoryManifest;
  onResult: (chapters: Chapter[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { state, error, run } = useAICall(async () => {
    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) throw new Error('Pick at least 3 photos first');
    // Convert to data URLs so /api/generate can see them (the real Google
    // Photos flow sends access tokens; here we send inline previews).
    const clusters = await Promise.all(
      files.map(
        (f, i) =>
          new Promise<{ id: string; photos: { mediaId: string; dataUrl: string; creationTime?: string }[] }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `cl-${i}`,
                photos: [{ mediaId: `m-${i}`, dataUrl: typeof reader.result === 'string' ? reader.result : '' }],
              });
            reader.readAsDataURL(f);
          })
      )
    );
    const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
    const vibes = (manifest as unknown as { vibes?: string[] }).vibes?.join(' ') ?? 'warm';
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clusters,
        vibeString: vibes,
        coupleNames: manifest.names ?? ['You', ''],
        occasion,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't write chapters (${res.status})`);
    }
    const data = (await res.json()) as { manifest?: { chapters?: Chapter[] } };
    const next = data.manifest?.chapters ?? [];
    if (!next.length) throw new Error('No chapters returned');
    onResult(next);
    if (inputRef.current) inputRef.current.value = '';
    return next;
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AIHint>
        Pick 6–20 photos. Pear clusters them by location + time, writes a chapter per cluster, and adds warm captions. Fully editable after.
      </AIHint>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="upload" size={12} /> Pick photos
        </button>
        <AISuggestButton
          label="Write chapters from these"
          runningLabel="Clustering + drafting…"
          state={state}
          onClick={() => void run()}
          error={error ?? undefined}
        />
      </div>
    </div>
  );
}

function ChapterRewriteAI({ chapter, onResult }: { chapter: Chapter; onResult: (text: string) => void }) {
  const { state, error, run } = useAICall(async () => {
    const res = await fetch('/api/rewrite-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapter, tone: 'polish' }),
    });
    if (!res.ok) throw new Error(`Pear couldn't rewrite (${res.status})`);
    const data = (await res.json()) as { description?: string; chapter?: Chapter };
    const text = (data.description ?? data.chapter?.description ?? '').trim();
    if (!text) throw new Error('Empty rewrite');
    onResult(text);
    return text;
  });
  return (
    <AISuggestButton
      label="Polish with Pear"
      runningLabel="Polishing…"
      state={state}
      onClick={() => void run()}
      error={error ?? undefined}
      size="sm"
    />
  );
}

export function StoryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const chapters: Chapter[] = manifest.chapters ?? [];

  function updateChapter(idx: number, patch: Partial<Chapter>) {
    const next = chapters.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ ...manifest, chapters: next });
  }

  function addChapter() {
    const order = chapters.length;
    const next: Chapter = {
      id: `ch-${Date.now().toString(36)}`,
      date: new Date().toISOString().slice(0, 10),
      title: 'New chapter',
      subtitle: '',
      description: 'The story of this moment…',
      images: [],
      location: null,
      mood: 'warm',
      order,
    };
    onChange({ ...manifest, chapters: [...chapters, next] });
  }

  return (
    <div>
      <PanelSection label="Photos → chapters" hint="Upload a batch and Pear drafts your story from them.">
        <PhotoChaptersAI manifest={manifest} onResult={(next) => onChange({ ...manifest, chapters: [...chapters, ...next] })} />
      </PanelSection>

      <PanelSection
        label="Chapters"
        hint="Drag to reorder. Each chapter is a moment — a photo, a date, a few words."
        action={<AddRowButton label="Add chapter" onClick={addChapter} />}
      >
        <SortableList
          items={chapters.map((c) => ({ id: c.id ?? `ch-${c.order}`, ref: c }))}
          onReorder={(next) =>
            onChange({ ...manifest, chapters: next.map((it, i) => ({ ...it.ref, order: i })) })
          }
          emptyState={
            <EmptyBlockState
              title="No chapters yet"
              body="Tell the story of how you got here — first date, big move, the proposal. 3–6 chapters is a sweet spot."
              action={<AddRowButton label="Add your first chapter" onClick={addChapter} />}
            />
          }
          renderItem={({ ref: c }, { handle }) => {
            const i = chapters.findIndex((x) => (x.id ?? `ch-${x.order}`) === (c.id ?? `ch-${c.order}`));
            return (
              <SortableRowCard
                handle={handle}
                onDelete={() => {
                  const next = chapters.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, order: idx }));
                  onChange({ ...manifest, chapters: next });
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 12 }}>
                  <PhotoSlot
                    src={c.images?.[0]?.url}
                    aspect="1/1"
                    label="Photo"
                    onChange={(url) => {
                      const nextImages = url
                        ? [{ id: 'img-' + i, url, alt: c.title, width: 800, height: 800 }]
                        : [];
                      updateChapter(i, { images: nextImages });
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                      <Field label="Title">
                        <TextInput
                          value={c.title}
                          onChange={(e) => updateChapter(i, { title: e.target.value })}
                          placeholder="The spring we met"
                        />
                      </Field>
                      <Field label="Date">
                        <TextInput
                          type="date"
                          value={(c.date ?? '').slice(0, 10)}
                          onChange={(e) => updateChapter(i, { date: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Place">
                      <TextInput
                        value={c.location?.label ?? c.subtitle ?? ''}
                        onChange={(e) =>
                          updateChapter(i, {
                            subtitle: e.target.value,
                            location: c.location
                              ? { ...c.location, label: e.target.value }
                              : { lat: 0, lng: 0, label: e.target.value },
                          })
                        }
                        placeholder="Pearl District · Portland"
                      />
                    </Field>
                  </div>
                </div>
                <Field label="What happened">
                  <TextArea
                    value={c.description}
                    onChange={(e) => updateChapter(i, { description: e.target.value })}
                    rows={3}
                    placeholder="A friend's birthday, a crowded kitchen, and the worst dad joke that somehow worked."
                  />
                </Field>
                <ChapterRewriteAI chapter={c} onResult={(text) => updateChapter(i, { description: text })} />
              </SortableRowCard>
            );
          }}
        />
      </PanelSection>
    </div>
  );
}
