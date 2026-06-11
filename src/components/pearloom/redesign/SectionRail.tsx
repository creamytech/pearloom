'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L137-234 SectionRail. */

import { Fragment, useRef, useState } from 'react';
import { Icon } from '../motifs';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { type SectionId, type BlockSectionId, BLOCK_SECTION_IDS, isToolPanelApplicable, isOptionalSectionApplicable, isBlockApplicable } from './EditorRedesign';
import { isCoreSectionApplicable, sectionHasContent } from './section-applicability';
import { SiteModeSection } from '../editor/panels/SiteModeSection';
import { useMobileViewport } from './use-mobile-viewport';
import { readSiteMode, readHomePageBlocks, MULTI_PAGE_BLOCKS } from '@/lib/site-mode';

interface SectionDef {
  id: Exclude<SectionId, null>;
  label: string;
  icon: string;
  required?: boolean;
  desc: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'hero',     label: 'Hero',      icon: 'home',       required: true, desc: 'Names, date, cover photo' },
  { id: 'story',    label: 'Our story', icon: 'heart-icon', desc: 'How you met' },
  { id: 'details',  label: 'Details',   icon: 'sparkles',   desc: 'Dress code, kids, FAQ-lite' },
  { id: 'schedule', label: 'Schedule',  icon: 'calendar',   desc: 'Day-of timeline' },
  { id: 'travel',   label: 'Travel',    icon: 'map',        desc: 'Hotels, transit, tips' },
  { id: 'registry', label: 'Registry',  icon: 'gift',       desc: 'Linked stores' },
  { id: 'gallery',  label: 'Gallery',   icon: 'image',      desc: 'Your photo wall' },
  { id: 'rsvp',     label: 'RSVP',      icon: 'mail',       required: true, desc: 'Reply form + deadline' },
  { id: 'faq',      label: 'FAQ',       icon: 'sparkles',   desc: 'Guest questions' },
];

/* ─── Live row signals ─────────────────────────────────────────
   Derives each section row's one-line desc from the manifest so
   the rail reflects the host's real content instead of mock copy.
   Returns null when nothing meaningful is derivable — caller
   falls back to the static SECTIONS desc.

   Manifest paths mirror what each section panel reads:
     gallery  → manifest.galleryImages[]      (GalleryPanel)
     faq      → manifest.faqs[].answer        (FaqPanel)
     schedule → manifest.events[]             (SchedulePanel)
     story    → manifest.chapters[]           (StoryPanel)
     rsvp     → manifest.rsvpDeadline         (RsvpPanel "Reply by")
     hero     → manifest.coverPhoto           (HeroPanel) */
function liveDesc(sectionId: string, manifest: StoryManifest): string | null {
  const loose = manifest as unknown as { galleryImages?: string[]; rsvpDeadline?: string };
  switch (sectionId) {
    case 'gallery': {
      const n = (loose.galleryImages ?? []).filter(Boolean).length;
      return n > 0 ? `${n} photo${n === 1 ? '' : 's'}` : 'No photos yet';
    }
    case 'faq': {
      const faqs = manifest.faqs ?? [];
      if (faqs.length === 0) return null;
      const answered = faqs.filter((f) => (f.answer ?? '').trim().length > 0).length;
      const open = faqs.length - answered;
      return open > 0 ? `${answered} answered · ${open} open` : `${answered} answered`;
    }
    case 'schedule': {
      const events = manifest.events ?? [];
      if (events.length === 0) return null;
      return `${events.length} moment${events.length === 1 ? '' : 's'}`;
    }
    case 'story': {
      const chapters = Array.isArray(manifest.chapters) ? manifest.chapters : [];
      if (chapters.length === 0) return null;
      return `${chapters.length} chapter${chapters.length === 1 ? '' : 's'}`;
    }
    case 'rsvp': {
      const replyBy = loose.rsvpDeadline?.trim();
      return replyBy ? `Closes ${replyBy}` : null;
    }
    default:
      return null;
  }
}

/* Sections that are effectively empty get a quiet peach dot next
   to the label — a nudge, not an alarm. Same paths as liveDesc. */
function needsAttention(sectionId: string, manifest: StoryManifest): boolean {
  const loose = manifest as unknown as { galleryImages?: string[] };
  switch (sectionId) {
    case 'gallery':
      return (loose.galleryImages ?? []).filter(Boolean).length === 0;
    case 'faq': {
      const faqs = manifest.faqs ?? [];
      return faqs.filter((f) => (f.answer ?? '').trim().length > 0).length === 0;
    }
    case 'schedule':
      return (manifest.events ?? []).length === 0;
    case 'hero':
      return !(manifest.coverPhoto ?? '').trim();
    default:
      return false;
  }
}

/* Optional sections — not in the default site, added via the
   Add section button. Each is occasion-gated by
   isOptionalSectionApplicable. Once a host adds one, the section
   id lives in manifest.blockOrder and the rail renders it
   alongside the core sections. */
const OPTIONAL_SECTIONS: SectionDef[] = [
  { id: 'countdown', label: 'Countdown', icon: 'clock',    desc: 'Stat tiles · stripe · minimal · hero' },
  { id: 'map',       label: 'Map',       icon: 'map',      desc: 'Live embed · pin · static' },
  { id: 'music',     label: 'Music',     icon: 'music',    desc: 'Spotify · Apple · YouTube' },
  /* Event-OS blocks — gated against the EVENT_TYPES registry via
     isBlockApplicable (default + optional blocks per occasion), so
     a bachelorette host sees Itinerary/Cost/Vote/Packing while a
     memorial host sees Program/Livestream/Obituary. */
  { id: 'itinerary',    label: 'Itinerary',    icon: 'calendar-check', desc: 'Multi-day plan, hour by hour' },
  { id: 'costSplitter', label: 'Cost splitter', icon: 'ticket',        desc: 'Who owes what — settled gently' },
  { id: 'activityVote', label: 'Group vote',   icon: 'check',          desc: 'Let the group pick' },
  { id: 'toastSignup',  label: 'Toast signup', icon: 'mic',            desc: 'Claim a toast slot' },
  { id: 'adviceWall',   label: 'Advice wall',  icon: 'text',           desc: 'Words for the honoree' },
  { id: 'program',      label: 'Program',      icon: 'page',           desc: 'The order of the ceremony' },
  { id: 'livestream',   label: 'Livestream',   icon: 'play',           desc: 'For the ones far away' },
  { id: 'obituary',     label: 'Obituary',     icon: 'leaf',           desc: 'A life, remembered' },
  { id: 'packingList',  label: 'Packing list', icon: 'list',           desc: 'What to bring' },
  { id: 'honorList',    label: 'Honor list',   icon: 'users',          desc: 'The people beside them' },
];

/* One gate for everything the Add Section picker offers — the
   original optional trio keeps its bespoke rules; the Event-OS
   blocks go through the EVENT_TYPES registry. */
function isAddableSectionApplicable(id: Exclude<SectionId, null>, occasion?: string): boolean {
  if (id === 'countdown' || id === 'map' || id === 'music') {
    return isOptionalSectionApplicable(id, occasion);
  }
  if ((BLOCK_SECTION_IDS as readonly string[]).includes(id)) {
    return isBlockApplicable(id as BlockSectionId, occasion);
  }
  return true;
}

/* Tool panels — surface in the rail below the canvas sections.
   These aren't sections on the published site; they're host-only
   tools that mount via PropertyRail's dispatch. Each one is
   gated by isToolPanelApplicable(occasion). */
const TOOLS: SectionDef[] = [
  { id: 'guests',      label: 'Guests',           icon: 'user',       desc: 'Your guest list' },
  { id: 'savetheDate', label: 'Save the date',    icon: 'calendar',   desc: 'Pre-invite teaser' },
  { id: 'share',       label: 'Share',            icon: 'link',       desc: 'Link, QR, preview' },
  { id: 'dayof',       label: 'Day-of',           icon: 'sparkles',   desc: 'Live broadcasts' },
  { id: 'toasts',      label: 'Toasts & speeches', icon: 'mic',       desc: 'Drafted with Pear' },
  { id: 'memorial',    label: 'Memorial',         icon: 'heart-icon', desc: 'Obituary + program' },
  { id: 'bachelor',    label: 'Weekend planner',  icon: 'sparkles',   desc: 'Costs + polls + rooms' },
];

interface Props {
  active: SectionId;
  setActive: (id: SectionId) => void;
  completion: number;
  title: string;
  slug: string;
  manifest: StoryManifest;
  /** Optional onChange so the Pages tab can write manifest.siteMode
   *  + homePageBlocks. When omitted, the Pages tab still renders
   *  but its controls become read-only. */
  onChange?: (next: StoryManifest) => void;
}

export function EditorRailLeft({ active, setActive, completion, title, slug, manifest, onChange }: Props) {
  const [tab, setTab] = useState<'sections' | 'pages' | 'theme'>('sections');
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  /* Add Section picker open state — toggled by the dashed "+ Add
     section" button. Shows the OPTIONAL_SECTIONS that aren't yet in
     manifest.blockOrder + are applicable to this occasion. */
  const [pickerOpen, setPickerOpen] = useState(false);
  /* Insert-at-position — when the host clicks a between-rows gap
     affordance, this carries the restOrder index the picked
     section should land at. null = append (the bottom button's
     behaviour). Mutually exclusive with pickerOpen so only one
     picker menu is ever mounted. */
  const [insertAt, setInsertAt] = useState<number | null>(null);
  /* Phone-sized viewport (rail lives in the Sections bottom sheet
     there) — gap affordances can't rely on hover, so they render
     as always-visible subtle dots instead. */
  const isMobileViewport = useMobileViewport();
  /** Custom drag-image element ref. Created once and reused across
   *  drags to keep the GC quiet. Removed from the DOM at drag-end. */
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  /* Build (or reuse) a floating drag chip showing just the section
     label + icon. The native browser ghost is a washed-out copy of
     the full row — heavy, off-brand, and overlaps surrounding rows.
     Our custom chip is a small peach-bordered pill that reads as
     intentional. */
  function makeDragImage(label: string): HTMLElement {
    if (!dragImageRef.current) {
      dragImageRef.current = document.createElement('div');
    }
    const el = dragImageRef.current;
    el.style.cssText = [
      'position: absolute',
      'top: -1000px',
      'left: -1000px',
      'padding: 8px 14px',
      'border-radius: 999px',
      'background: var(--peach-bg, #F8E4D5)',
      'border: 1px solid var(--peach-ink, #C6703D)',
      'color: var(--peach-ink, #C6703D)',
      'font-size: 12px',
      'font-weight: 700',
      'font-family: var(--font-ui, system-ui, sans-serif)',
      'letter-spacing: 0.02em',
      'pointer-events: none',
      'box-shadow: 0 8px 20px rgba(40,28,12,0.18)',
      'white-space: nowrap',
      'z-index: 9999',
    ].join(';');
    el.textContent = `↕  ${label}`;
    document.body.appendChild(el);
    /* Schedule removal AFTER setDragImage has captured the snapshot.
       Chrome needs the element in the DOM at the moment setDragImage
       fires; cleanup happens on the next tick. */
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 0);
    return el;
  }
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  /* Occasion chip — quiet mono-caps label on the site card so the
     editor states what the event IS. Omitted entirely when the
     occasion is unknown (never show 'Wedding' wrongly). */
  const occasionLabel = getEventType(occasion)?.label;
  const applicableTools = TOOLS.filter((t) => isToolPanelApplicable(t.id, occasion));
  /* Magazine (multi-page) mode — sections that live on their own
     page get a quiet "· own page" tag on their row so the Pages
     tab's mode pick is legible from the section list. */
  const siteMode = readSiteMode(manifest);
  const homeBlockSet = new Set<string>([...readHomePageBlocks(manifest), 'details']);
  const multiPageSet = new Set<string>(MULTI_PAGE_BLOCKS);

  /* Build the ORDERED list: read manifest.blockOrder when present,
     otherwise fall through to the SECTIONS default order. Hero is
     always pinned first (required, never reorderable). Optional
     sections (countdown / map / music) are honored only when
     present in blockOrder — they're never auto-appended. */
  const optionalKeys = OPTIONAL_SECTIONS.map((s) => s.id as string);
  const allReorderableKeys = [...SECTIONS.filter((s) => !s.required).map((s) => s.id as string), ...optionalKeys];
  const reorderableCoreKeys = SECTIONS.filter((s) => !s.required).map((s) => s.id as string);
  const heroSection = SECTIONS.find((s) => s.required);
  const savedOrder = ((manifest as unknown as { blockOrder?: string[] }).blockOrder) ?? [];
  const restOrder: string[] = (() => {
    const valid = savedOrder.filter((k) => allReorderableKeys.includes(k));
    /* Auto-append missing CORE sections only — optional sections
       stay opt-in via the Add Section picker. */
    for (const k of reorderableCoreKeys) if (!valid.includes(k)) valid.push(k);
    /* Occasion gate — core sections that don't fit this occasion
       (per the EVENT_TYPES registry) drop out of the rail, UNLESS
       they already carry real host content. Content always wins:
       those rows stay, marked "unusual for this occasion". */
    return valid.filter((k) =>
      !reorderableCoreKeys.includes(k)
      || isCoreSectionApplicable(k, occasion)
      || sectionHasContent(k, manifest));
  })();
  const sectionLookup = new Map<string, SectionDef>([
    ...SECTIONS.map((s) => [s.id as string, s] as const),
    ...OPTIONAL_SECTIONS.map((s) => [s.id as string, s] as const),
  ]);
  const orderedSections: SectionDef[] = [
    ...(heroSection ? [heroSection] : []),
    ...restOrder.map((k) => sectionLookup.get(k)!).filter(Boolean),
  ];
  /* Available picker options — anything optional + applicable +
     not yet in the order. */
  const availableOptional = OPTIONAL_SECTIONS
    .filter((s) => isAddableSectionApplicable(s.id, occasion))
    .filter((s) => !restOrder.includes(s.id as string));

  /* Add an optional section to the manifest order + flip active
     to it so the host immediately lands in its config panel.
     `at` is a restOrder index (insert-at-position via a gap
     affordance); null appends — the bottom button's behaviour. */
  function addOptionalSection(id: Exclude<SectionId, null>, at: number | null = null) {
    if (!onChange) return;
    const without = restOrder.filter((k) => k !== id);
    const idx = at === null ? without.length : Math.max(0, Math.min(at, without.length));
    const next = [...without.slice(0, idx), id as string, ...without.slice(idx)];
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      blockOrder: next,
    } as unknown as StoryManifest);
    setActive(id);
    setPickerOpen(false);
    setInsertAt(null);
  }

  /* One picker menu, two openers — the bottom "Add section" button
     (append, at === null) and the between-rows gap affordances
     (insert at that restOrder index). Same options, same gating. */
  function renderPicker(at: number | null) {
    return (
      <div
        role="menu"
        style={{
          marginTop: 4,
          display: 'flex', flexDirection: 'column', gap: 2,
          padding: 4,
          background: 'var(--card)',
          border: '1px solid var(--line-soft)',
          borderRadius: 10,
          boxShadow: '0 8px 20px rgba(40,28,12,0.10)',
          animation: 'pl-drop-line-pop 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {availableOptional.map((s) => (
          <button
            key={s.id}
            type="button"
            role="menuitem"
            onClick={() => addOptionalSection(s.id, at)}
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '8px 10px',
              borderRadius: 6,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'var(--ink)',
              textAlign: 'left',
              fontFamily: 'var(--font-ui)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon name={s.icon} size={13} color="var(--ink-soft)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
              <div style={{
                fontSize: 10.5, opacity: 0.55, marginTop: 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {s.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  /* Drop handler — moves the dragged section to the target index
     in the reorderable list. Writes manifest.blockOrder. Hero
     stays pinned (drop-on-hero is rejected silently). */
  function handleDrop(targetIdx: number) {
    if (draggingIdx === null || !onChange) return;
    /* Convert visual indices to reorderable-list indices. Hero is
       at idx 0 visually but excluded from restOrder. */
    const heroOffset = heroSection ? 1 : 0;
    const from = draggingIdx - heroOffset;
    const to = targetIdx - heroOffset;
    if (from < 0 || to < 0 || from === to) {
      setDraggingIdx(null);
      setHoverIdx(null);
      return;
    }
    const next = restOrder.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      blockOrder: next,
    } as unknown as StoryManifest);
    setDraggingIdx(null);
    setHoverIdx(null);
  }

  return (
    <aside
      className="pl-rd-rail-left"
      style={{
        /* Desktop grid placement only. Inside the phone bottom sheet
           (a single-cell grid) the named-area lookup resolves against
           lines that don't exist, creating an implicit empty track
           that shoves the rail off-center — the PearAside mount
           drops its gridArea for the same reason. */
        ...(isMobileViewport
          ? {}
          : { gridArea: 'left', borderRight: '1px solid var(--line-soft)' }),
        background: 'var(--cream-2)',
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        /* The outer wrapper at EditorRedesign.tsx is height:100dvh +
           overflow:hidden, so this grid cell is a fixed-height
           viewport. overflow:auto on the rail itself lets its content
           scroll inside without the page ever scrolling. minHeight: 0
           defends against intrinsic-size flex defaults. */
        overflow: 'auto',
        minHeight: 0,
      }}
    >
      {/* Site card — prototype L152-169. */}
      <div
        style={{
          padding: 12,
          background: 'var(--card)',
          border: '1px solid var(--line-soft)',
          borderRadius: 12,
        }}
      >
        {/* Occasion chip — the editor says what the event is.
            Mono-caps in the rail's micro-label language, led by a
            gold dot. Rendered only when the EVENT_TYPES registry
            recognizes the occasion — an unknown occasion shows
            nothing rather than a wrong 'Wedding'. */}
        {occasionLabel && (
          <div
            style={{
              marginBottom: 5,
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              lineHeight: 1.6,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--gold, #C19A4B)',
                marginRight: 6,
                verticalAlign: 'middle',
                marginTop: -1,
              }}
            />
            {occasionLabel}
          </div>
        )}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--ink-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginBottom: 8,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <Icon name="globe" size={10} />
          {slug}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              background: 'var(--cream-3)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div style={{ width: `${completion}%`, height: '100%', background: 'var(--sage)' }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--ink-muted)', fontWeight: 600 }}>
            {completion}%
          </span>
        </div>
      </div>

      {/* Pages tabs — prototype L172-183. */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: 3,
          background: 'var(--card)',
          borderRadius: 8,
          border: '1px solid var(--line-soft)',
        }}
      >
        {(['sections', 'pages', 'theme'] as const).map((t) => {
          const on = tab === t;
          const label = t === 'sections' ? 'Sections' : t === 'pages' ? 'Pages' : 'Theme';
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                if (t === 'theme') setActive(null);
                else if (t === 'sections' && !active) setActive('hero');
              }}
              style={{
                flex: 1,
                padding: 6,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                border: 0,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Pages tab body — site mode (scroll / multi-page) + home-
          page block picker. Mounted from the section-panels module
          since the same control lives in ThemePanel's Pages section. */}
      {tab === 'pages' && onChange && (
        <div style={{ padding: 2 }}>
          <SiteModeSection manifest={manifest} onChange={onChange} />
        </div>
      )}

      {/* Theme tab body — selecting the tab already swaps the right
          rail to the Theme panel (setActive(null) above); this note
          says so instead of leaving the left rail blank, which read
          as a broken tab. */}
      {tab === 'theme' && (
        <div
          style={{
            padding: '12px 13px',
            borderRadius: 10,
            background: 'var(--card)',
            border: '1px solid var(--line-soft)',
            fontSize: 11.5,
            color: 'var(--ink-soft)',
            lineHeight: 1.55,
            display: 'flex',
            gap: 8,
          }}
        >
          <Icon name="sparkles" size={14} color="var(--peach-ink, #C6703D)" />
          <span>
            Theme controls are open in the <strong>panel on the right</strong> —
            palette, type, layout, texture, and the Theme Shop all live there.
            Pick a section under <strong>Sections</strong> to edit content instead.
          </span>
        </div>
      )}

      {/* "Page sections / drag to reorder" header — prototype L185-188. */}
      {tab === 'sections' && (
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <span>Page sections</span>
        <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: 10.5 }}>
          drag to reorder
        </span>
      </div>
      )}

      {/* Section list — drag-to-reorder writes manifest.blockOrder.
          Hero stays pinned first; every other section is draggable. */}
      {tab === 'sections' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {orderedSections.map((s, i) => {
          const on = s.id === active;
          const isHero = !!s.required;
          const isDragging = draggingIdx === i;
          const isHovered = hoverIdx === i && draggingIdx !== null && draggingIdx !== i;
          /* Direction of the drop indicator — if dragging FROM
             above, the chip lands AT this row's top edge; if
             dragging FROM below, the chip lands at this row's
             bottom edge. Drawing the indicator on the correct
             edge so the visual model matches "this is where it
             goes." */
          const dropBefore = isHovered && draggingIdx !== null && draggingIdx > i;
          const dropAfter  = isHovered && draggingIdx !== null && draggingIdx < i;
          /* A core section that survived the occasion gate only
             because it carries host content — flag it quietly in
             the desc instead of hiding the host's work. */
          const unusualForOccasion = !isHero
            && reorderableCoreKeys.includes(s.id)
            && !isCoreSectionApplicable(s.id, occasion);
          /* Magazine mode — this section renders on its own page,
             not the home page. */
          const ownPage = siteMode === 'multi-page'
            && multiPageSet.has(s.id)
            && !homeBlockSet.has(s.id);
          /* Gap affordances sit between rows (not after the last —
             the bottom "Add section" button owns append). Rendered
             whenever there's something left to add; visuals + clicks
             are suppressed mid-drag so the drop-line indicators own
             that gesture, but the element keeps its height so rows
             don't shift under the pointer at drag start. */
          const showGap = !!onChange && availableOptional.length > 0 && i < orderedSections.length - 1;
          /* The gap after visual row i inserts BEFORE the next row —
             in restOrder coordinates that's (i + 1) minus the pinned
             hero at visual index 0. */
          const gapInsertIndex = i + 1 - (heroSection ? 1 : 0);
          return (
            <Fragment key={s.id}>
            <div style={{ position: 'relative' }}>
              {/* Drop-line indicator — a peach bar above or below
                  the row. Sits OUTSIDE the row's flow so the row
                  doesn't jitter during drag. */}
              {dropBefore && <DropLine position="top" />}
              {dropAfter  && <DropLine position="bottom" />}
            <div
              draggable={!isHero}
              onDragStart={(e) => {
                if (isHero) { e.preventDefault(); return; }
                setDraggingIdx(i);
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', s.id); } catch { /* ignore */ }
                /* Custom drag image — small peach pill with the
                   section name instead of the default ghost. */
                try {
                  const img = makeDragImage(s.label);
                  e.dataTransfer.setDragImage(img, 24, 18);
                } catch { /* old browsers — fall through to default ghost */ }
              }}
              onDragEnd={() => { setDraggingIdx(null); setHoverIdx(null); }}
              onDragOver={(e) => {
                if (draggingIdx === null || isHero) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (hoverIdx !== i) setHoverIdx(i);
              }}
              onDragLeave={() => { if (hoverIdx === i) setHoverIdx(null); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
              onClick={() => setActive(s.id)}
              className="pl-rd-section-row"
              data-active={on}
              data-dragging={isDragging}
              style={{
                display: 'grid',
                gridTemplateColumns: '12px 22px 1fr 14px',
                gap: 8,
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                cursor: isHero ? 'pointer' : (isDragging ? 'grabbing' : 'grab'),
                /* Dragging row: dimmed and slightly shrunk so the
                   floating drag chip clearly reads as the "moving"
                   element. Other rows stay normal. */
                opacity: isDragging ? 0.32 : 1,
                transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'background var(--pl-dur-instant), opacity var(--pl-dur-quick), transform var(--pl-dur-quick)',
                userSelect: 'none',
              }}
            >
              <span aria-hidden style={{ opacity: on ? 0.5 : 0.3, display: 'inline-flex' }}>
                <GripDots color={on ? 'var(--cream)' : 'var(--ink-muted)'} />
              </span>
              <Icon name={s.icon} size={13} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.label}
                  {/* Quiet attention dot — this section is effectively
                      empty. Peach, 5px, no alarm. */}
                  {needsAttention(s.id, manifest) && (
                    <span
                      title="Nothing here yet"
                      aria-label="Nothing here yet"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--peach-ink, #C6703D)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    opacity: on ? 0.7 : 0.55,
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {liveDesc(s.id, manifest) ?? s.desc}
                  {unusualForOccasion && (
                    <span style={{ opacity: 0.6, fontStyle: 'italic' }}>
                      {' · unusual for this occasion'}
                    </span>
                  )}
                  {ownPage && (
                    <span style={{ opacity: 0.6, fontStyle: 'italic' }}>
                      {' · own page'}
                    </span>
                  )}
                </div>
              </div>
              {s.required && (
                <Icon name="lock" size={10} color={on ? 'var(--cream)' : 'var(--ink-muted)'} />
              )}
            </div>
            </div>
            {showGap && (
              <>
                <GapInsert
                  mobile={isMobileViewport}
                  open={insertAt === gapInsertIndex}
                  suppressed={draggingIdx !== null}
                  onToggle={() => {
                    setPickerOpen(false);
                    setInsertAt(insertAt === gapInsertIndex ? null : gapInsertIndex);
                  }}
                />
                {insertAt === gapInsertIndex && renderPicker(gapInsertIndex)}
              </>
            )}
            </Fragment>
          );
        })}

        {/* "Add section" — wired to a picker showing the
            occasion-applicable OPTIONAL_SECTIONS that aren't
            already in manifest.blockOrder. When all options are
            consumed, render a small "All sections added" note
            instead of a dead button. */}
        {availableOptional.length === 0 ? (
          <div
            style={{
              marginTop: 4, padding: '8px 10px', borderRadius: 8,
              fontSize: 11, color: 'var(--ink-muted)',
              border: '1px dashed var(--line)', background: 'transparent',
              textAlign: 'center', fontStyle: 'italic',
            }}
          >
            All sections added
          </div>
        ) : (
          <button
            type="button"
            className="pl-rd-add-section"
            onClick={() => { setInsertAt(null); setPickerOpen((v) => !v); }}
            aria-expanded={pickerOpen}
            style={{
              marginTop: 4,
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 11.5,
              color: pickerOpen ? 'var(--peach-ink)' : 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: pickerOpen ? '1px dashed var(--peach-ink)' : '1px dashed var(--line)',
              background: pickerOpen ? 'var(--peach-bg)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <Icon name="plus" size={11} color={pickerOpen ? 'var(--peach-ink)' : 'var(--ink-muted)'} />
            {pickerOpen ? 'Pick one…' : 'Add section'}
          </button>
        )}

        {pickerOpen && availableOptional.length > 0 && renderPicker(null)}
      </div>
      )}

      {/* Tools — only visible on the Sections tab so it lives
          alongside the canvas sections. Each row mounts a host-only
          panel (Guests / Save the date / Share / Day-of / etc.).
          Filtered by isToolPanelApplicable so memorial sites don't
          see Bachelor, etc. */}
      {tab === 'sections' && applicableTools.length > 0 && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink-muted)',
            marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--line-soft)',
          }}>
            Tools
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {applicableTools.map((s) => {
              const on = s.id === active;
              return (
                <div
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className="pl-rd-section-row"
                  data-active={on}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '22px 1fr',
                    gap: 8,
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={s.icon} size={13} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
                    <div style={{
                      fontSize: 10.5,
                      opacity: on ? 0.7 : 0.55,
                      marginTop: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
}

function GripDots({ color = 'var(--ink-muted)' }: { color?: string }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={(i % 2) * 6 + 2} cy={Math.floor(i / 2) * 5 + 3} r="1.2" fill={color} />
      ))}
    </svg>
  );
}

/* GapInsert — the quiet between-rows insertion affordance.

   Desktop: an 10px hover zone between section rows; hovering
   reveals a peach hairline + a small '+' chip ("a new section
   threads in here"). Mobile (no hover): three subtle always-
   visible dots mark the gap; tapping opens the picker. While a
   drag is in flight the affordance goes inert (the DropLine
   indicators own that gesture) but keeps its height so rows
   don't shift under the pointer. */
function GapInsert({ mobile, open, suppressed, onToggle }: {
  mobile: boolean;
  open: boolean;
  suppressed: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const showPlus = !suppressed && (open || (!mobile && hover));
  const showDots = !suppressed && mobile && !open;
  return (
    <div
      role="button"
      tabIndex={suppressed ? -1 : 0}
      aria-label="Insert a section here"
      aria-expanded={open}
      onClick={() => { if (!suppressed) onToggle(); }}
      onKeyDown={(e) => {
        if (suppressed) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: mobile ? 14 : 10,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: suppressed ? 'default' : 'pointer',
        pointerEvents: suppressed ? 'none' : 'auto',
        outline: 'none',
      }}
    >
      {showPlus && (
        <>
          <span
            aria-hidden
            style={{
              position: 'absolute', left: 10, right: 10, top: '50%',
              height: 1, marginTop: -0.5,
              background: open ? 'var(--peach-ink, #C6703D)' : 'var(--line)',
              pointerEvents: 'none',
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'relative',
              width: 16, height: 16, borderRadius: '50%',
              background: open ? 'var(--peach-ink, #C6703D)' : 'var(--peach-bg, #F8E4D5)',
              border: '1px solid var(--peach-ink, #C6703D)',
              display: 'grid', placeItems: 'center',
              animation: 'pl-drop-line-pop 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Icon name="plus" size={9} color={open ? 'var(--cream-2, #FBF7EE)' : 'var(--peach-ink, #C6703D)'} />
          </span>
        </>
      )}
      {showDots && (
        <span aria-hidden style={{ display: 'inline-flex', gap: 4 }}>
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              style={{
                width: 3, height: 3, borderRadius: '50%',
                background: 'var(--ink-muted)', opacity: 0.4,
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

/* DropLine — peach hairline + accent dot that paints across a
   section row's top or bottom edge during drag-over. Replaces
   the old background-tint hover treatment which read as "this
   row is selected" instead of "drop happens here." */
function DropLine({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        background: 'var(--peach-ink, #C6703D)',
        borderRadius: 1,
        zIndex: 2,
        pointerEvents: 'none',
        boxShadow: '0 0 0 1px var(--card, #FBF7EE)',
        ...(position === 'top'
          ? { top: -2 }
          : { bottom: -2 }
        ),
        animation: 'pl-drop-line-pop 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Leading dot — anchors the line so it reads as a clear
          "insertion point" rather than a divider. */}
      <span style={{
        position: 'absolute',
        left: -3,
        top: -3,
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--peach-ink, #C6703D)',
        border: '2px solid var(--cream-2, #FBF7EE)',
        boxSizing: 'border-box',
      }} />
    </div>
  );
}
