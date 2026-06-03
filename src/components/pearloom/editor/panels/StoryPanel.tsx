'use client';

/* eslint-disable no-restricted-syntax */
/* StoryPanel — story headline + body + highlight chips.

   Round R rewrote the chips UX:
     - Replaced window.prompt('Add a chip') with an inline FInput
       that adds on Enter.
     - Surfaces manifest-derived suggestions instantly (zero API
       call): year from logistics.date, place from logistics.venue
       + place, mood tag from chapters[0]?.mood.
     - "Suggest from Pear" button → /api/story-chips (Claude Haiku
       reading body + chapter info) returns 6-8 AI-derived chips
       the host can tap to add.
   Tone-rewrite chips (Shorten/Warmer/Funnier/More poetic) remain
   unchanged. */

import { useMemo, useState } from 'react';
import type { StoryManifest, Chapter, ChapterImage } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, SectionPanelShell, useCopyOverride, useSectionHidden, SectionVisibilityFooter } from './_section-atoms';
import { PhotoUploadSlot, collectPhotoPool } from './_photo-upload';

type Tone = 'Shorten' | 'Warmer' | 'Funnier' | 'More poetic';

/* Year extraction — accepts ISO dates, full English dates, or
   anything with a 4-digit year token. Returns the year or null. */
function pickYear(input?: string): number | null {
  if (!input) return null;
  const m = /\b(19|20)\d{2}\b/.exec(input);
  return m ? Number(m[0]) : null;
}

/* Derive immediate (no-API) chip suggestions from manifest fields
   already on disk. Returns deduped, only-non-empty chips. */
function deriveLocalChips(manifest: StoryManifest, existing: string[]): string[] {
  const lower = new Set(existing.map((c) => c.trim().toLowerCase()));
  const out: string[] = [];
  const push = (c?: string | null) => {
    if (!c) return;
    const trimmed = c.trim();
    if (!trimmed) return;
    const k = trimmed.toLowerCase();
    if (lower.has(k)) return;
    lower.add(k);
    out.push(trimmed);
  };

  const loose = manifest as unknown as Record<string, unknown>;
  const logistics = (loose.logistics as Record<string, unknown> | undefined) ?? {};
  const dateStr = (logistics.date as string | undefined) ?? '';
  const venue = (logistics.venue as string | undefined) ?? '';
  const place = (logistics.place as string | undefined) ?? '';
  const chapters = ((loose.chapters as Array<Record<string, unknown>> | undefined) ?? []);

  /* "Together since YYYY" — derived from the OLDEST chapter date
     when present, else from the event date. */
  const chapterDates = chapters
    .map((c) => pickYear(c.date as string | undefined))
    .filter((y): y is number => typeof y === 'number');
  const oldestChapterYear = chapterDates.length > 0 ? Math.min(...chapterDates) : null;
  const eventYear = pickYear(dateStr);
  if (oldestChapterYear) {
    push(`Together since ${oldestChapterYear}`);
    if (eventYear && eventYear > oldestChapterYear) {
      push(`${eventYear - oldestChapterYear} years strong`);
    }
  } else if (eventYear) {
    push(`Class of ${eventYear}`);
  }

  /* Place — venue + place when both, else either. */
  if (venue && place) push(`${venue}, ${place}`);
  else if (place) push(place);
  else if (venue) push(venue);

  /* Mood tags from chapters[0..2].mood — these are AI-generated
     ("golden hour", "cozy winter", "first frost"). */
  for (const c of chapters.slice(0, 3)) {
    push(c.mood as string | undefined);
  }

  /* Chapter titles — short ones. */
  for (const c of chapters.slice(0, 3)) {
    const t = c.title as string | undefined;
    if (t && t.split(/\s+/).length <= 4) push(t);
  }

  return out.slice(0, 6);
}

export function StoryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'story');
  const story = (manifest as unknown as { storySection?: { headline?: string; body?: string; chips?: string[] } }).storySection ?? {};
  const headline = story.headline ?? '';
  const body = story.body ?? '';
  const chips = story.chips ?? ['Together since 2017', 'Santorini, Greece', 'Aegean blue'];
  const [busy, setBusy] = useState<Tone | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [storyEyebrow, setStoryEyebrow] = useCopyOverride(manifest, onChange, 'storyEyebrow');

  /* Chapter photos — 3 slots that mirror the 3 chip slots. Each
     writes to manifest.chapters[i].images[0]. The canvas reads
     these in the story variants (timeline / sidebyside / etc) to
     render real photos instead of gradient placeholders. */
  const chapters: Chapter[] = Array.isArray(manifest.chapters) ? manifest.chapters : [];
  /* Pool of every photo uploaded across the site (cover + gallery
     + per-chapter). Feeds each chapter slot's "Swap from gallery"
     picker so the host can re-use shots without re-uploading. */
  const photoPool = collectPhotoPool(manifest);
  const chapterImage = (i: number): string => {
    const ch = chapters[i];
    if (!ch || !Array.isArray(ch.images) || ch.images.length === 0) return '';
    return ch.images[0]?.url ?? '';
  };
  /* Generic chapter patch — pads chapters to i+1 entries when
     writing a slot whose chapter doesn't exist yet, then applies
     the field update. Shared by image / title / body writers so
     each path doesn't redo the padding logic. */
  const patchChapter = (i: number, p: Partial<Chapter>) => {
    const next: Chapter[] = chapters.slice();
    while (next.length <= i) {
      next.push({
        id: `ch-${Date.now().toString(36)}-${next.length}`,
        date: '',
        title: '',
        subtitle: '',
        description: '',
        images: [],
        location: null,
        mood: '',
        order: next.length,
      });
    }
    next[i] = { ...next[i], ...p };
    onChange({ ...manifest, chapters: next });
  };
  const setChapterImage = (i: number, url: string) => {
    const ch = chapters[i];
    if (url) {
      const img: ChapterImage = {
        id: `img-${Date.now().toString(36)}`,
        url,
        alt: '',
        width: 0,
        height: 0,
      };
      patchChapter(i, { images: [img, ...((ch?.images ?? []).slice(1))] });
    } else {
      patchChapter(i, { images: (ch?.images ?? []).slice(1) });
    }
  };
  const chapterTitle = (i: number) => chapters[i]?.title ?? '';
  const chapterBody = (i: number) => chapters[i]?.description ?? '';
  const setChapterTitle = (i: number, v: string) => patchChapter(i, { title: v });
  const setChapterBody = (i: number, v: string) => patchChapter(i, { description: v });

  const patch = (next: Partial<{ headline: string; body: string; chips: string[] }>) =>
    onChange({ ...manifest, storySection: { ...story, ...next } } as StoryManifest);

  /* "Draft for me" — POST /api/story-draft with couple + chip
     context. Result lands in storySection.body. */
  async function draftForMe() {
    setDraftBusy(true); setErr(null);
    try {
      const loose = manifest as unknown as Record<string, unknown>;
      const logistics = (loose.logistics as Record<string, unknown> | undefined) ?? {};
      const res = await fetch('/api/story-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          names: (loose.names as [string, string] | undefined),
          occasion: loose.occasion,
          venue: logistics.venue,
          place: logistics.place,
          date: logistics.date,
          chips,
          existing: body,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { draft?: string };
      if (data.draft && data.draft.trim()) patch({ body: data.draft.trim() });
      else setErr('Pear didn’t return anything to draft from.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDraftBusy(false);
    }
  }

  /* Local suggestions derived from the manifest — recomputed when
     manifest changes. Skips chips the host has already added. */
  const localSuggestions = useMemo(
    () => deriveLocalChips(manifest, chips),
    [manifest, chips],
  );
  /* AI suggestions filtered against the current chip list so once
     a host adds one, it disappears from the picker. */
  const aiVisible = useMemo(
    () => {
      const lower = new Set(chips.map((c) => c.trim().toLowerCase()));
      return aiSuggestions.filter((c) => !lower.has(c.trim().toLowerCase()));
    },
    [aiSuggestions, chips],
  );

  const addChip = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (chips.some((c) => c.trim().toLowerCase() === trimmed.toLowerCase())) return;
    patch({ chips: [...chips, trimmed] });
  };

  async function rewrite(tone: Tone) {
    if (!body.trim()) {
      setErr('Write some story first, then Pear can rewrite it.');
      return;
    }
    setBusy(tone); setErr(null);
    try {
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, context: `story body — make it ${tone.toLowerCase()}` }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const { rewritten } = await res.json() as { rewritten: string };
      if (rewritten && rewritten !== body) patch({ body: rewritten });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /* Pear-suggested chips — POST /api/story-chips with the story
     body + chapter context. Replaces aiSuggestions[] with the
     fresh batch. */
  async function suggestFromPear() {
    setAiBusy(true); setErr(null);
    try {
      const loose = manifest as unknown as Record<string, unknown>;
      const logistics = (loose.logistics as Record<string, unknown> | undefined) ?? {};
      const chapters = ((loose.chapters as Array<Record<string, unknown>> | undefined) ?? []).slice(0, 6).map((c) => ({
        title: c.title as string | undefined,
        description: c.description as string | undefined,
        mood: c.mood as string | undefined,
        location: (() => {
          const l = c.location as Record<string, unknown> | undefined;
          if (!l) return undefined;
          if (typeof l.name === 'string') return l.name;
          if (typeof l.city === 'string') return l.city;
          return undefined;
        })(),
        date: c.date as string | undefined,
        imageCount: Array.isArray(c.images) ? (c.images as unknown[]).length : 0,
      }));
      const res = await fetch('/api/story-chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          names: ((loose.names as [string, string] | undefined) ?? [undefined, undefined]).filter(Boolean),
          occasion: loose.occasion,
          venue: logistics.venue,
          place: logistics.place,
          date: logistics.date,
          chapters,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { chips?: string[] };
      setAiSuggestions(Array.isArray(data.chips) ? data.chips : []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={storyEyebrow} onChange={setStoryEyebrow} placeholder="Two threads, one weave" />
        </FGroup>
        <FGroup label="Headline">
          <FInput value={headline} onChange={(v) => patch({ headline: v })} placeholder="How we got here" />
        </FGroup>
        <FGroup
          label="Your story"
          action={
            <button
              type="button"
              onClick={draftForMe}
              disabled={draftBusy}
              style={{
                fontSize: 11, fontWeight: 600,
                padding: '5px 10px', borderRadius: 999,
                background: draftBusy ? 'var(--peach-bg)' : 'var(--cream-2)',
                border: '1px solid var(--line)',
                color: draftBusy ? 'var(--peach-ink)' : 'var(--ink-soft)',
                cursor: draftBusy ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              {draftBusy && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)', animation: 'pl-dot-pulse 1.4s ease-in-out infinite' }} />}
              <Icon name="sparkles" size={10} color={draftBusy ? 'var(--peach-ink)' : 'var(--gold)'} />
              {draftBusy ? 'Pear is drafting…' : (body.trim() ? 'Refine for me' : 'Draft for me')}
            </button>
          }
        >
          <textarea
            value={body}
            onChange={(e) => patch({ body: e.target.value })}
            rows={6}
            placeholder="We met on an ordinary Tuesday…"
            disabled={!!busy}
            style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none', opacity: busy ? 0.7 : 1 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(['Shorten', 'Warmer', 'Funnier', 'More poetic'] as Tone[]).map((s) => {
              const on = busy === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => rewrite(s)}
                  disabled={!!busy}
                  style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: on ? 'var(--peach-bg)' : 'var(--cream-2)', border: '1px solid var(--line)', color: on ? 'var(--peach-ink)' : 'var(--ink-soft)', cursor: busy && !on ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {on && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)', animation: 'pl-dot-pulse 1.4s ease-in-out infinite' }} />}
                  {on ? `${s}…` : s}
                </button>
              );
            })}
          </div>
          {err && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(122,45,45,0.08)', fontSize: 11.5, color: '#7A2D2D' }}>
              {err}
            </div>
          )}
        </FGroup>

        <FGroup
          label="Chapter cards"
          hint="Each card on the canvas pulls its photo, headline, and body from one of these three slots. Empty fields fall back to the shared story above."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 11, border: '1px solid var(--line)',
                  background: 'var(--card)', padding: 10,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                {/* Left column — photo slot. */}
                <div style={{ flex: '0 0 88px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: 999,
                      background: (chapterImage(i) || chapterTitle(i) || chapterBody(i)) ? 'var(--lavender-bg)' : 'var(--cream-2)',
                      color: 'var(--lavender-ink)',
                      display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700,
                    }}>{i + 1}</span>
                    Card
                  </div>
                  <PhotoUploadSlot
                    url={chapterImage(i)}
                    onChange={(url) => setChapterImage(i, url)}
                    aspectRatio="4/5"
                    size="sm"
                    pool={photoPool}
                  />
                </div>
                {/* Right column — title + body. */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <FInput
                    value={chapterTitle(i)}
                    onChange={(v) => setChapterTitle(i, v)}
                    placeholder={`Chapter ${i + 1} title`}
                  />
                  <textarea
                    value={chapterBody(i)}
                    onChange={(e) => setChapterBody(i, e.target.value)}
                    rows={3}
                    placeholder={i === 0 ? 'How it began…' : i === 1 ? 'Then…' : 'And then…'}
                    style={{
                      width: '100%', padding: '9px 11px', borderRadius: 10,
                      border: '1px solid var(--line)', background: 'var(--cream-2)',
                      fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink)',
                      resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </FGroup>

        <FGroup
          label={`Highlight chips · ${chips.length}`}
          hint="Short labels above each chapter. The first 3 show as chapter eyebrows on the canvas; extras render as a pill row in some layouts."
          action={
            <button
              type="button"
              onClick={suggestFromPear}
              disabled={aiBusy}
              style={{
                fontSize: 11, fontWeight: 600,
                padding: '5px 10px', borderRadius: 999,
                background: aiBusy ? 'var(--peach-bg)' : 'var(--cream-2)',
                border: '1px solid var(--line)',
                color: aiBusy ? 'var(--peach-ink)' : 'var(--ink-soft)',
                cursor: aiBusy ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              {aiBusy && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)', animation: 'pl-dot-pulse 1.4s ease-in-out infinite' }} />}
              <Icon name="sparkles" size={10} color={aiBusy ? 'var(--peach-ink)' : 'var(--gold)'} />
              {aiBusy ? 'Pear is thinking…' : 'Suggest from Pear'}
            </button>
          }
        >
          {/* Unified chip list — one flat list of all chips, in
              order. Chips 1-3 get a small "Card N" tag because
              those show as chapter eyebrows on the canvas; 4+
              get a dashed "Extra" tag (visible on some variants
              as a pill row). One Add input below the list. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chips.map((c, i) => {
              const isCard = i < 3;
              return (
                <div
                  key={`${c}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 11px', borderRadius: 10,
                    background: 'var(--cream-2)',
                    border: isCard ? '1px solid var(--line)' : '1px dashed var(--line)',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 22, height: 22, borderRadius: 999,
                      background: isCard ? 'var(--lavender-bg)' : 'var(--cream-3)',
                      color: isCard ? 'var(--lavender-ink)' : 'var(--ink-muted)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 10.5, fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700,
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: isCard ? 'var(--ink-muted)' : 'var(--peach-ink)',
                    flexShrink: 0, minWidth: 44,
                  }}>
                    {isCard ? `Card ${i + 1}` : 'Extra'}
                  </span>
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c}
                  </span>
                  <button
                    type="button"
                    onClick={() => patch({ chips: chips.filter((_, idx) => idx !== i) })}
                    aria-label={`Remove ${c}`}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', color: 'var(--ink-muted)', flexShrink: 0 }}
                  >
                    <Icon name="close" size={11} color="var(--ink-muted)" />
                  </button>
                </div>
              );
            })}

            {/* Single Add input — always at the bottom of the list.
                No 3-slot gating, no overflow gymnastics, no
                disabled states. Type → Enter (or Add button) →
                appended. */}
            <div style={{ display: 'flex', gap: 6, marginTop: chips.length > 0 ? 2 : 0 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    e.preventDefault();
                    addChip(draft);
                    setDraft('');
                  }
                }}
                placeholder={chips.length === 0 ? 'Type a chip and press Enter…' : `Add another chip…`}
                style={{ flex: 1, padding: '8px 11px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 12.5, outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => { addChip(draft); setDraft(''); }}
                disabled={!draft.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  background: draft.trim() ? 'var(--peach-ink)' : 'var(--cream-2)',
                  color: draft.trim() ? '#fff' : 'var(--ink-muted)',
                  border: 'none', fontSize: 12, fontWeight: 700,
                  cursor: draft.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Suggested chips — local + Pear, merged into one row
              of tap-to-add pills. Local chips read in muted ink;
              Pear chips read in peach. */}
          {(localSuggestions.length > 0 || aiVisible.length > 0) && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {aiVisible.length > 0 && <Icon name="sparkles" size={10} color="var(--gold)" />}
                Suggested
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {localSuggestions.map((c) => (
                  <button
                    key={`local-${c}`}
                    type="button"
                    onClick={() => addChip(c)}
                    title="From your story"
                    style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'var(--cream-2)', color: 'var(--ink-soft)', border: '1px solid var(--line)', cursor: 'pointer' }}
                  >
                    + {c}
                  </button>
                ))}
                {aiVisible.map((c) => (
                  <button
                    key={`ai-${c}`}
                    type="button"
                    onClick={() => addChip(c)}
                    title="Suggested by Pear"
                    style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: 'var(--peach-bg)', color: 'var(--peach-ink)', border: '1px solid var(--peach-ink)', cursor: 'pointer' }}
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </FGroup>
        <SectionVisibilityFooter
          isHidden={isHidden}
          setHidden={setHidden}
          sectionLabel="Our story"
        />
      </div>
    </SectionPanelShell>
  );
}

export default StoryPanel;
