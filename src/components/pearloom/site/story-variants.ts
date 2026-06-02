// ──────────────────────────────────────────────────────────────
// Story-layout variants — registers the 6 layouts that already
// exist in src/components/blocks/StoryLayouts.tsx with the
// BlockStyle registry, plus 5 prototype-ported variants
// (sidebyside, stacked, quote, zigzag, letter) as real
// renderers built from ClaudeDesign/pages/themed-site.jsx →
// StoryBlock(). Each variant is visually distinct: a different
// layout geometry, different accent emphasis, different photo
// usage. They consume the active Edition / Kit CSS vars
// (var(--t-accent), var(--t-paper), var(--peach-ink), etc) that
// .pl8-guest scope already provides.
//
// ThemedSiteRenderer's StoryVariantSection reads
// `manifest.blockVariants.story.style` first (this file's
// registry IDs), falling back to the legacy `manifest.storyLayout`
// / `manifest.layoutFormat` fields. Existing sites stay
// rendering exactly the same.
// ──────────────────────────────────────────────────────────────

import { registerBlockStyle } from '@/lib/block-engine/block-styles';
import { LAYOUT_OPTIONS, MiniDiagram, type StoryLayoutType } from '@/components/blocks/StoryLayouts';
import { createElement, Fragment, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { EditableText } from '../editor/canvas/EditableText';
import { EditableField } from '../editor/canvas/EditableField';
import type { Chapter, StoryManifest } from '@/types';

type FieldEditor = (patch: (m: StoryManifest) => StoryManifest) => void;

// Replicates the makePatchChapter helper from ThemedSiteRenderer so
// the editable wrappers in these variants ship their patches back
// through the same channel used by the kit renderers.
function makePatchChapter(onEditField: FieldEditor | undefined, chapterId: string | undefined, chapterIndex: number) {
  return (field: 'title' | 'description' | 'date') => (value: string) => {
    if (!onEditField) return;
    onEditField((m) => {
      const chapters = [...(m.chapters ?? [])];
      let idx = chapterId ? chapters.findIndex((c) => c.id === chapterId) : -1;
      if (idx < 0) idx = chapterIndex;
      if (idx < 0 || idx >= chapters.length) return m;
      chapters[idx] = { ...chapters[idx], [field]: value };
      return { ...m, chapters } as StoryManifest;
    });
  };
}

// Shared props for every variant. Consumes the same shape kit
// renderers in ThemedSiteRenderer (StoryClassic / StoryTicket /
// etc.) receive — onEditField is optional, chapters drive
// rendering, manifest is read for any cross-section context.
interface StoryVariantProps {
  chapters?: Chapter[];
  manifest?: StoryManifest;
  editMode?: boolean;
  onEditField?: FieldEditor;
}

// The original 6 production kits keep their existing dispatcher
// in StoryLayouts.tsx; this NoopStoryComponent is the marker for
// those variants. The 5 new prototype variants below replace
// the placeholder with real renderers.
function NoopStoryComponent(): null {
  return null;
}

const STORY_DESCRIPTIONS: Record<StoryLayoutType, string> = {
  parallax: 'Full-bleed photos with scroll depth — cinematic.',
  filmstrip: 'Cinematic horizontal-scroll photo strip per chapter.',
  magazine: 'Editorial photo + text pairing, like a spread.',
  timeline: 'Chronological vine — photos beaded down a centre line.',
  kenburns: 'Slow-zoom photo crops with text overlays.',
  bento: 'Mosaic grid of photos and text per chapter.',
};

for (const opt of LAYOUT_OPTIONS) {
  registerBlockStyle({
    blockType: 'story',
    id: opt.type,
    label: opt.label,
    description: STORY_DESCRIPTIONS[opt.type] ?? opt.desc,
    preview: createElement(MiniDiagram, { type: opt.type }),
    Component: NoopStoryComponent,
  });
}

// ── Prototype variants — extend the 6 production layouts with the
// 5 the prototype's LAYOUTS.story declares (sidebyside, stacked,
// quote, zigzag, letter). Source of visual truth:
// ClaudeDesign/pages/themed-site.jsx → StoryBlock().

// ─────────── Preview SVGs ───────────

function SideBySidePreview(): ReactNode {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: 'ph', x: 4, y: 6, width: 26, height: 28, rx: 0.5, fill: '#C49A6F', opacity: 0.6 }),
      createElement('rect', { key: 't1', x: 33, y: 10, width: 25, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 33, y: 14, width: 27, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't3', x: 33, y: 16.5, width: 24, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't4', x: 33, y: 19, width: 26, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 'cp1', x: 33, y: 26, width: 8, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
      createElement('rect', { key: 'cp2', x: 43, y: 26, width: 10, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
    ],
  );
}

function StackedPreview(): ReactNode {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: 'ph', x: 16, y: 4, width: 32, height: 14, rx: 0.5, fill: '#C49A6F', opacity: 0.6 }),
      createElement('rect', { key: 't1', x: 20, y: 22, width: 24, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 16, y: 26, width: 32, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't3', x: 16, y: 28.5, width: 30, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 'cp1', x: 22, y: 33, width: 8, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
      createElement('rect', { key: 'cp2', x: 32, y: 33, width: 10, height: 3, rx: 1.5, fill: '#E5DCEF', opacity: 0.7 }),
    ],
  );
}

function QuotePreview(): ReactNode {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('text', {
        key: 'q1', x: 8, y: 12, fontFamily: 'serif', fontSize: 9, fill: '#C6703D', opacity: 0.5,
      }, '"'),
      createElement('rect', { key: 't1', x: 8, y: 14, width: 48, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 12, y: 17.5, width: 40, height: 1.4, fill: '#0E0D0B' }),
      createElement('rect', { key: 't3', x: 16, y: 21, width: 32, height: 1.4, fill: '#0E0D0B' }),
      createElement('line', { key: 'r', x1: 24, y1: 27, x2: 40, y2: 27, stroke: '#B8935A', strokeWidth: 0.4 }),
      createElement('text', {
        key: 'a', x: 32, y: 33, textAnchor: 'middle', fontFamily: 'serif', fontSize: 3,
        fontStyle: 'italic', fill: '#6F6557',
      }, '— anna, summer 2025'),
    ],
  );
}

function ZigzagPreview(): ReactNode {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', { key: 'p1', x: 4, y: 4, width: 20, height: 14, rx: 0.5, fill: '#C49A6F', opacity: 0.6 }),
      createElement('rect', { key: 't1a', x: 28, y: 8, width: 30, height: 1.3, fill: '#0E0D0B' }),
      createElement('rect', { key: 't1b', x: 28, y: 11.5, width: 26, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't1c', x: 28, y: 14, width: 28, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 'p2', x: 40, y: 22, width: 20, height: 14, rx: 0.5, fill: '#8B6F8E', opacity: 0.6 }),
      createElement('rect', { key: 't2a', x: 6, y: 26, width: 30, height: 1.3, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2b', x: 6, y: 29.5, width: 26, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
      createElement('rect', { key: 't2c', x: 6, y: 32, width: 28, height: 0.8, fill: '#6F6557', opacity: 0.6 }),
    ],
  );
}

function LetterPreview(): ReactNode {
  return createElement(
    'svg',
    { viewBox: '0 0 64 40', width: '100%', height: '100%' },
    [
      createElement('rect', {
        key: 'l', x: 10, y: 4, width: 44, height: 32, rx: 1.5,
        fill: '#FBF7EE', stroke: '#D8CFB8', strokeWidth: 0.5,
      }),
      createElement('rect', { key: 't1', x: 14, y: 10, width: 36, height: 1, fill: '#0E0D0B' }),
      createElement('rect', { key: 't2', x: 14, y: 13, width: 32, height: 0.8, fill: '#0E0D0B' }),
      createElement('rect', { key: 't3', x: 14, y: 16, width: 34, height: 0.8, fill: '#0E0D0B' }),
      createElement('rect', { key: 't4', x: 14, y: 19, width: 30, height: 0.8, fill: '#0E0D0B' }),
      createElement('rect', { key: 't5', x: 14, y: 22, width: 33, height: 0.8, fill: '#0E0D0B' }),
      createElement('text', {
        key: 'sig', x: 48, y: 32, textAnchor: 'end', fontFamily: 'cursive', fontSize: 6,
        fontStyle: 'italic', fill: '#C6703D',
      }, 'anna & ben'),
    ],
  );
}

// ─────────── Render helpers ───────────

/** Editorial eyebrow + serif title + accent ink. Shared head used
 *  by sidebyside / stacked / zigzag (zigzag uses a row-scoped
 *  variant with per-row title). */
function variantHead(c: Chapter, i: number, onEditField: FieldEditor | undefined): ReactNode {
  const patch = makePatchChapter(onEditField, c.id, i);
  return createElement(
    Fragment,
    null,
    c.date
      ? createElement(EditableText, {
          key: 'date',
          as: 'div',
          value: c.date,
          onSave: patch('date'),
          ariaLabel: `Chapter ${i + 1} date`,
          maxLength: 60,
          placeholder: 'Date',
          style: {
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--t-eyebrow-ls, 0.18em)',
            textTransform: 'uppercase',
            color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
            marginBottom: 10,
          } satisfies CSSProperties,
        })
      : null,
    createElement(EditableText, {
      key: 'title',
      as: 'h3',
      value: c.title ?? '',
      onSave: patch('title'),
      ariaLabel: `Chapter ${i + 1} title`,
      maxLength: 120,
      placeholder: 'Chapter title',
      style: {
        fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
        fontSize: 38,
        fontWeight: 'var(--t-display-wght, 600)',
        margin: 0,
        lineHeight: 1.02,
        letterSpacing: '-0.01em',
        color: 'var(--t-ink, var(--ink, #0E0D0B))',
      } satisfies CSSProperties,
    }),
  );
}

function variantBody(c: Chapter, i: number, onEditField: FieldEditor | undefined): ReactNode {
  const patch = makePatchChapter(onEditField, c.id, i);
  return createElement(EditableField, {
    as: 'p',
    context: `chapter ${i + 1} description`,
    value: c.description ?? '',
    onSave: patch('description'),
    multiline: true,
    maxLength: 800,
    placeholder: 'Tell the story of this moment…',
    ariaLabel: `Chapter ${i + 1} description`,
    style: {
      marginTop: 16,
      fontSize: 15,
      color: 'var(--t-ink-soft, var(--ink-soft, #3A332C))',
      lineHeight: 1.65,
    } satisfies CSSProperties,
  });
}

function variantChips(c: Chapter): ReactNode {
  const chips: string[] = [];
  if (c.mood) chips.push(c.mood);
  if (c.subtitle) chips.push(c.subtitle);
  if (c.location?.label) chips.push(c.location.label);
  if (chips.length === 0) return null;
  return createElement(
    'div',
    {
      style: {
        marginTop: 22,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
      } satisfies CSSProperties,
    },
    chips.map((label, idx) =>
      createElement(
        'span',
        {
          key: idx,
          style: {
            padding: '6px 13px',
            borderRadius: 'var(--t-radius-pill, 999px)',
            background: 'var(--t-accent-bg, rgba(198,112,61,0.10))',
            color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
            fontSize: 12,
            fontWeight: 600,
          } satisfies CSSProperties,
        },
        label,
      ),
    ),
  );
}

function chapterPhoto(c: Chapter, aspect: string, tone: 'warm' | 'lavender' = 'warm'): ReactNode {
  const url = c.images?.[0]?.url;
  if (url) {
    return createElement('div', {
      style: {
        width: '100%',
        aspectRatio: aspect,
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 'var(--t-radius, var(--pl-card-radius, 12px))',
        boxShadow: 'var(--t-shadow, var(--pl-card-shadow, 0 14px 36px rgba(61,74,31,0.16)))',
      } satisfies CSSProperties,
    });
  }
  // Empty-photo placeholder — quiet, tone-tinted so the picker
  // preview reads the photo's intended position even when chapters
  // haven't uploaded one yet.
  const bg = tone === 'lavender'
    ? 'linear-gradient(135deg, rgba(143,111,142,0.18), rgba(143,111,142,0.08))'
    : 'linear-gradient(135deg, rgba(196,154,111,0.20), rgba(196,154,111,0.08))';
  return createElement('div', {
    style: {
      width: '100%',
      aspectRatio: aspect,
      background: `var(--t-card, var(--cream, #FBF7EE)) ${bg}`,
      backgroundBlendMode: 'multiply',
      borderRadius: 'var(--t-radius, var(--pl-card-radius, 12px))',
      border: '1px solid var(--t-line, var(--line, #D8CFB8))',
    } satisfies CSSProperties,
  });
}

// ─────────── Variant components ───────────

/** Side-by-side — photo left (0.85fr), narrative right (1fr).
 *  The editorial default; matches the prototype's StoryBlock
 *  fall-through render. Photo carries a 4:5 portrait crop so
 *  the page reads like a book spread. */
function StorySideBySide({ chapters, editMode, onEditField }: StoryVariantProps): ReactNode {
  const list = chapters ?? [];
  if (list.length === 0) return null;
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 64,
        maxWidth: 1080,
        margin: '0 auto',
        padding: '0 32px',
      } satisfies CSSProperties,
    },
    list.map((c, i) =>
      createElement(
        'div',
        {
          key: c.id ?? i,
          className: 'pl8-chapter-row',
          style: {
            display: 'grid',
            gridTemplateColumns: '0.85fr 1fr',
            gap: 44,
            alignItems: 'center',
          } satisfies CSSProperties,
        },
        [
          createElement('div', { key: 'p' }, chapterPhoto(c, '4/5', 'warm')),
          createElement(
            'div',
            { key: 't' },
            [
              variantHead(c, i, onEditField),
              variantBody(c, i, onEditField),
              variantChips(c),
            ],
          ),
        ],
      ),
    ),
  );
  // (editMode is consumed implicitly by EditableText / EditableField
  // via the editor context; no branch needed here.)
}

/** Stacked — photo on top (16:9), narrative centered below in a
 *  520px column. Each chapter is a tall slab; rhythm is generous. */
function StoryStacked({ chapters, onEditField }: StoryVariantProps): ReactNode {
  const list = chapters ?? [];
  if (list.length === 0) return null;
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 80,
        maxWidth: 760,
        margin: '0 auto',
        padding: '0 32px',
        textAlign: 'center',
      } satisfies CSSProperties,
    },
    list.map((c, i) =>
      createElement(
        'div',
        { key: c.id ?? i, className: 'pl8-chapter-row' },
        [
          createElement(
            'div',
            { key: 'p', style: { maxWidth: 520, margin: '0 auto 26px' } satisfies CSSProperties },
            chapterPhoto(c, '16/9', 'warm'),
          ),
          variantHead(c, i, onEditField),
          variantBody(c, i, onEditField),
          createElement(
            'div',
            {
              key: 'cwrap',
              style: { display: 'flex', justifyContent: 'center' } satisfies CSSProperties,
            },
            variantChips(c),
          ),
        ],
      ),
    ),
  );
}

/** Quote-led — the body becomes a large pull-quote in display
 *  type, centered, with a thin hairline rule between quote and
 *  chips. Visually the inverse of side-by-side: title small,
 *  body huge. Skips the photo so the words breathe. */
function StoryQuote({ chapters, onEditField }: StoryVariantProps): ReactNode {
  const list = chapters ?? [];
  if (list.length === 0) return null;
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 72,
        maxWidth: 880,
        margin: '0 auto',
        padding: '0 32px',
        textAlign: 'center',
      } satisfies CSSProperties,
    },
    list.map((c, i) => {
      const patch = makePatchChapter(onEditField, c.id, i);
      return createElement(
        'div',
        { key: c.id ?? i, className: 'pl8-chapter-row', style: { position: 'relative' } satisfies CSSProperties },
        [
          c.date
            ? createElement(EditableText, {
                key: 'eyebrow',
                as: 'div',
                value: c.date,
                onSave: patch('date'),
                ariaLabel: `Chapter ${i + 1} date`,
                maxLength: 60,
                placeholder: 'Date',
                style: {
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 'var(--t-eyebrow-ls, 0.18em)',
                  textTransform: 'uppercase',
                  color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
                  marginBottom: 16,
                } satisfies CSSProperties,
              })
            : null,
          createElement(EditableField, {
            key: 'quote',
            as: 'p',
            context: `chapter ${i + 1} quote`,
            value: c.description ?? '',
            onSave: patch('description'),
            multiline: true,
            maxLength: 800,
            placeholder: 'A line that captures this chapter…',
            ariaLabel: `Chapter ${i + 1} body quote`,
            style: {
              fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
              fontStyle: 'italic',
              fontWeight: 'var(--t-display-wght, 500)',
              fontSize: 28,
              lineHeight: 1.32,
              margin: 0,
              color: 'var(--t-ink, var(--ink, #0E0D0B))',
              letterSpacing: '-0.01em',
              // Leading hairline glyph hints at the quote framing
              // without depending on <blockquote> markup.
              quotes: '"“" "”"',
            } satisfies CSSProperties,
          }),
          createElement('div', {
            key: 'rule',
            style: {
              width: 160,
              height: 1,
              background: 'var(--t-gold, var(--peach-ink, #B8935A))',
              opacity: 0.55,
              margin: '20px auto 0',
            } satisfies CSSProperties,
          }),
          createElement(EditableText, {
            key: 'attr',
            as: 'div',
            value: c.title ?? '',
            onSave: patch('title'),
            ariaLabel: `Chapter ${i + 1} attribution`,
            maxLength: 120,
            placeholder: 'Attribution',
            style: {
              marginTop: 12,
              fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--t-ink-soft, var(--ink-soft, #3A332C))',
              letterSpacing: '0.04em',
            } satisfies CSSProperties,
          }),
          createElement(
            'div',
            {
              key: 'cwrap',
              style: { display: 'flex', justifyContent: 'center', marginTop: 8 } satisfies CSSProperties,
            },
            variantChips(c),
          ),
        ],
      );
    }),
  );
}

/** Zigzag — alternating left/right rows. Row 1 photo-left,
 *  row 2 photo-right, repeat. Each row is a 1:1 grid (4:3 photo)
 *  with a tighter rhythm than side-by-side. */
function StoryZigzag({ chapters, onEditField }: StoryVariantProps): ReactNode {
  const list = chapters ?? [];
  if (list.length === 0) return null;
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
        maxWidth: 880,
        margin: '0 auto',
        padding: '0 32px',
      } satisfies CSSProperties,
    },
    list.map((c, i) => {
      const photoOnLeft = i % 2 === 0;
      const tone: 'warm' | 'lavender' = i % 2 === 0 ? 'warm' : 'lavender';
      return createElement(
        'div',
        {
          key: c.id ?? i,
          className: 'pl8-chapter-row',
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 36,
            alignItems: 'center',
          } satisfies CSSProperties,
        },
        [
          createElement(
            'div',
            { key: 'p', style: { order: photoOnLeft ? 0 : 2 } satisfies CSSProperties },
            chapterPhoto(c, '4/3', tone),
          ),
          createElement(
            'div',
            { key: 't', style: { order: 1 } satisfies CSSProperties },
            [
              variantHead(c, i, onEditField),
              variantBody(c, i, onEditField),
              variantChips(c),
            ],
          ),
        ],
      );
    }),
  );
}

/** Letter — handwritten note on cream paper. Each chapter is a
 *  framed card with a hairline border, a small uppercase eyebrow,
 *  the body in serif italic, and the title rendered in script as
 *  a signature at the bottom-right. Drops the photo entirely so
 *  the page feels like a stack of love letters. */
function StoryLetter({ chapters, onEditField }: StoryVariantProps): ReactNode {
  const list = chapters ?? [];
  if (list.length === 0) return null;
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        maxWidth: 700,
        margin: '0 auto',
        padding: '0 32px',
      } satisfies CSSProperties,
    },
    list.map((c, i) => {
      const patch = makePatchChapter(onEditField, c.id, i);
      return createElement(
        'div',
        {
          key: c.id ?? i,
          className: 'pl8-chapter-row',
          style: {
            background: 'var(--t-paper, var(--paper, #FBF7EE))',
            borderRadius: 'var(--t-radius-lg, var(--pl-card-radius, 12px))',
            boxShadow: 'var(--t-shadow, 0 14px 36px rgba(61,74,31,0.12))',
            border: '1px solid var(--t-line, var(--line, #D8CFB8))',
            padding: '40px 46px',
            textAlign: 'left',
            position: 'relative',
          } satisfies CSSProperties,
        },
        [
          c.date
            ? createElement(EditableText, {
                key: 'eyebrow',
                as: 'div',
                value: c.date,
                onSave: patch('date'),
                ariaLabel: `Chapter ${i + 1} date`,
                maxLength: 60,
                placeholder: 'Date',
                style: {
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 'var(--t-eyebrow-ls, 0.22em)',
                  textTransform: 'uppercase',
                  color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
                  marginBottom: 14,
                  textAlign: 'center',
                } satisfies CSSProperties,
              })
            : null,
          createElement(EditableField, {
            key: 'body',
            as: 'p',
            context: `chapter ${i + 1} letter`,
            value: c.description ?? '',
            onSave: patch('description'),
            multiline: true,
            maxLength: 1200,
            placeholder: 'Dear…',
            ariaLabel: `Chapter ${i + 1} letter body`,
            style: {
              fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
              fontStyle: 'italic',
              fontSize: 19,
              color: 'var(--t-ink, var(--ink, #0E0D0B))',
              lineHeight: 1.6,
              textAlign: 'left',
              margin: 0,
            } satisfies CSSProperties,
          }),
          createElement(EditableText, {
            key: 'sig',
            as: 'div',
            value: c.title ?? '',
            onSave: patch('title'),
            ariaLabel: `Chapter ${i + 1} signature`,
            maxLength: 120,
            placeholder: 'Sign off…',
            style: {
              fontFamily: 'var(--t-script, "Caveat", "Dancing Script", cursive)',
              fontSize: 30,
              color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
              marginTop: 18,
              textAlign: 'right',
              lineHeight: 1,
            } satisfies CSSProperties,
          }),
        ],
      );
    }),
  );
}

// ─────────── Registry ───────────

interface PrototypeVariant {
  id: string;
  label: string;
  description: string;
  preview: () => ReactNode;
  Component: (props: StoryVariantProps) => ReactNode;
}

const PROTOTYPE_STORY_VARIANTS: PrototypeVariant[] = [
  {
    id: 'sidebyside',
    label: 'Side by side',
    description: 'Photo left, narrative right — the editorial default.',
    preview: SideBySidePreview,
    Component: StorySideBySide,
  },
  {
    id: 'stacked',
    label: 'Stacked',
    description: 'Photo on top, narrative below, centered column.',
    preview: StackedPreview,
    Component: StoryStacked,
  },
  {
    id: 'quote',
    label: 'Quote-led',
    description: 'Pull-quote first, with the title as attribution underneath.',
    preview: QuotePreview,
    Component: StoryQuote,
  },
  {
    id: 'zigzag',
    label: 'Zigzag',
    description: 'Alternating left-right photo / text rows.',
    preview: ZigzagPreview,
    Component: StoryZigzag,
  },
  {
    id: 'letter',
    label: 'Letter',
    description: 'A handwritten note on cream paper, signed at the bottom.',
    preview: LetterPreview,
    Component: StoryLetter,
  },
];

for (const v of PROTOTYPE_STORY_VARIANTS) {
  registerBlockStyle<StoryVariantProps>({
    blockType: 'story',
    id: v.id,
    label: v.label,
    description: v.description,
    preview: createElement(v.preview),
    Component: v.Component as unknown as ComponentType<StoryVariantProps>,
  });
}

// Named exports so ThemedSiteRenderer (or any future dispatcher)
// can call into the variants directly — same shape as the
// existing StoryClassic / StoryTicket / etc. exports.
export {
  StorySideBySide,
  StoryStacked,
  StoryQuote,
  StoryZigzag,
  StoryLetter,
};
export type { StoryVariantProps };

export const STORY_VARIANTS_REGISTERED = true;
