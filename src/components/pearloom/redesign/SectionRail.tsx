'use client';

 
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L137-234 SectionRail. */

import { Fragment, useRef, useState } from 'react';
import { Icon } from '../motifs';
import { PlAvatar } from '../avatars';
import type { StoryManifest } from '@/types';
import { getEventType } from '@/lib/event-os/event-types';
import { type SectionId, type BlockSectionId, BLOCK_SECTION_IDS, isToolPanelApplicable, isOptionalSectionApplicable, isBlockApplicable } from './EditorRedesign';
import { isCoreSectionApplicable, sectionHasContent } from './section-applicability';
import { SiteModeSection } from '../editor/panels/SiteModeSection';
import { useMobileViewport } from './use-mobile-viewport';
import { readSiteMode, readHomePageBlocks, MULTI_PAGE_BLOCKS, BLOCK_PAGE_SLUG, type SiteBlockKey } from '@/lib/site-mode';
import { occasionCopyFor } from './occasion-copy';

interface SectionDef {
  id: Exclude<SectionId, null>;
  label: string;
  icon: string;
  required?: boolean;
  desc: string;
}

/* The story row is the only occasion-voiced entry — 'Our story /
   How you met' stays for the couple arc; every other occasion
   reads its copy pack ('Their story' on a memorial, 'The plan'
   on a bachelor weekend). Resolved where the ordered list is
   built so the static map stays static. */
const COUPLE_STORY_OCCASIONS = new Set(['wedding', 'engagement', 'anniversary', 'vow-renewal']);

function resolveSectionDef(s: SectionDef, occasion?: string): SectionDef {
  if (s.id !== 'story' || occasion == null || COUPLE_STORY_OCCASIONS.has(occasion)) return s;
  return { ...s, label: occasionCopyFor(occasion).navStory, desc: 'The story behind the day' };
}

const SECTIONS: SectionDef[] = [
  { id: 'hero',     label: 'Opening',   icon: 'home',       required: true, desc: 'Names, date, cover photo' },
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
  { id: 'countdown', label: 'Countdown', icon: 'clock',    desc: 'Stat tiles · stripe · minimal · statement' },
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
  /* Gentle on purpose — this row also reads on memorial sites. */
  { id: 'tributeWall',  label: 'Tribute wall', icon: 'heart-icon',     desc: 'Memories, gathered from your guests' },
  { id: 'menu',         label: 'Menu',         icon: 'fleuron',        desc: 'Dinner, course by course' },
  { id: 'dressCode',    label: 'Dress code',   icon: 'palette',        desc: 'What to wear' },
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

/* ─── Shared section-order derivation ─────────────────────────
   ONE computation for "which sections, in which order, does this
   site show" — used by the rail's list below AND by EditorRedesign
   (the mobile props sheet's prev/next section stepper must walk
   the exact list the rail shows). Hero is always pinned first;
   restOrder is the reorderable tail in manifest.blockOrder terms. */
export interface SectionOrder {
  /** Hero + the ordered reorderable sections, occasion-resolved
   *  labels included — the list the rail renders top to bottom. */
  orderedSections: SectionDef[];
  /** The reorderable tail (everything but hero) as blockOrder keys. */
  restOrder: string[];
  /** Optional sections still addable via the picker. */
  availableOptional: SectionDef[];
}

const REORDERABLE_CORE_KEYS = SECTIONS.filter((s) => !s.required).map((s) => s.id as string);
const OPTIONAL_KEYS = OPTIONAL_SECTIONS.map((s) => s.id as string);
const ALL_REORDERABLE_KEYS = [...REORDERABLE_CORE_KEYS, ...OPTIONAL_KEYS];
const HERO_SECTION = SECTIONS.find((s) => s.required);
const SECTION_LOOKUP = new Map<string, SectionDef>([
  ...SECTIONS.map((s) => [s.id as string, s] as const),
  ...OPTIONAL_SECTIONS.map((s) => [s.id as string, s] as const),
]);

export function sectionOrderFor(manifest: StoryManifest): SectionOrder {
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const savedOrder = ((manifest as unknown as { blockOrder?: string[] }).blockOrder) ?? [];
  const valid = savedOrder.filter((k) => ALL_REORDERABLE_KEYS.includes(k));
  /* Auto-append missing CORE sections only — optional sections
     stay opt-in via the Add Section picker. */
  for (const k of REORDERABLE_CORE_KEYS) if (!valid.includes(k)) valid.push(k);
  /* Occasion gate — core sections that don't fit this occasion
     (per the EVENT_TYPES registry) drop out of the rail, UNLESS
     they already carry real host content. Content always wins:
     those rows stay, marked "unusual for this occasion". */
  const restOrder = valid.filter((k) =>
    !REORDERABLE_CORE_KEYS.includes(k)
    || isCoreSectionApplicable(k, occasion)
    || sectionHasContent(k, manifest));
  const orderedSections: SectionDef[] = [
    ...(HERO_SECTION ? [HERO_SECTION] : []),
    ...restOrder.map((k) => SECTION_LOOKUP.get(k)!).filter(Boolean),
  ].map((s) => resolveSectionDef(s, occasion));
  const availableOptional = OPTIONAL_SECTIONS
    .filter((s) => isAddableSectionApplicable(s.id, occasion))
    .filter((s) => !restOrder.includes(s.id as string));
  return { orderedSections, restOrder, availableOptional };
}

/** Display label for any rail entry — canvas sections, optional
 *  sections, or tool panels — with the story row's occasion voice
 *  applied. Null for ids the rail doesn't list (nav / navMobile). */
export function sectionDisplayLabel(id: string, occasion?: string): string | null {
  const def = SECTION_LOOKUP.get(id) ?? TOOLS.find((t) => t.id === id);
  if (!def) return null;
  return resolveSectionDef(def, occasion).label;
}

/* Tool panels — surface in the rail below the canvas sections.
   These aren't sections on the published site; they're host-only
   tools that mount via PropertyRail's dispatch. Each one is
   gated by isToolPanelApplicable(occasion). */
const TOOLS: SectionDef[] = [
  { id: 'guests',      label: 'Guests',           icon: 'user',       desc: 'Your guest list' },
  { id: 'savetheDate', label: 'Save the date',    icon: 'calendar',   desc: 'Pre-invite teaser' },
  { id: 'share',       label: 'Share',            icon: 'link',       desc: 'Link, QR, preview' },
  { id: 'cohost',      label: 'Co-hosts',         icon: 'users',      desc: 'Invite a partner to edit' },
  { id: 'privacy',     label: 'Privacy',          icon: 'lock',       desc: 'Password / public' },
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
  /** Magazine mode — which page the canvas is focused on. null =
   *  all sections on one canvas. Owned by EditorRedesign. */
  canvasPage?: 'home' | SiteBlockKey | null;
  setCanvasPage?: (page: 'home' | SiteBlockKey | null) => void;
  /** Live co-editors, for per-section presence ("Maya is editing
   *  this section"). Each carries the section id they're focused on. */
  peers?: Array<{ key: string; name: string; email: string; color: string; avatar?: string | null; section?: string | null }>;
}

export function EditorRailLeft({ active, setActive, completion, title, slug, manifest, onChange, canvasPage = null, setCanvasPage, peers = [] }: Props) {
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

  /* Build the ORDERED list — shared derivation (sectionOrderFor)
     so the mobile props sheet's prev/next stepper walks the exact
     list this rail shows. Hero is always pinned first (required,
     never reorderable). Optional sections are honored only when
     present in blockOrder — they're never auto-appended. */
  const reorderableCoreKeys = REORDERABLE_CORE_KEYS;
  const heroSection = HERO_SECTION;
  const { orderedSections, restOrder, availableOptional } = sectionOrderFor(manifest);

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

  /* Touch reorder — HTML5 drag-and-drop is inert on touch, so on
     phone viewports every row grows Move up / Move down arrows.
     Same write path as handleDrop and PropertyRail's "Move up" /
     "Move down" options: swap adjacent keys in manifest.blockOrder. */
  function moveRow(restIdx: number, direction: -1 | 1) {
    if (!onChange) return;
    const target = restIdx + direction;
    if (restIdx < 0 || target < 0 || target >= restOrder.length) return;
    const next = restOrder.slice();
    [next[restIdx], next[target]] = [next[target], next[restIdx]];
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      blockOrder: next,
    } as unknown as StoryManifest);
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
                transition: 'background var(--pl-dur-quick) var(--pl-ease-out), color var(--pl-dur-quick) var(--pl-ease-out)',
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
        <div className="pl8-tab-enter" style={{ padding: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SiteModeSection manifest={manifest} onChange={onChange} />

          {/* The pages themselves — flipping to magazine mode used
              to change NOTHING visible in the editor. Each row
              focuses the canvas on that page exactly as guests get
              it; "All pages" returns the whole site to one canvas. */}
          {siteMode === 'multi-page' && setCanvasPage && (() => {
            const ownPages = orderedSections.filter(
              (sec) => multiPageSet.has(sec.id) && !homeBlockSet.has(sec.id),
            );
            const homeCount = orderedSections.length - ownPages.length;
            const row = (
              key: string,
              label: string,
              sub: string,
              onPick: () => void,
              on: boolean,
            ) => (
              <button
                key={key}
                type="button"
                onClick={onPick}
                aria-pressed={on}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                  padding: '9px 11px', borderRadius: 10, textAlign: 'left',
                  background: on ? 'var(--pl-olive-mist, #E0DDC9)' : 'var(--card)',
                  border: on ? '1.5px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line-soft)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Icon name="page" size={13} color={on ? 'var(--pl-olive, #5C6B3F)' : 'var(--ink-muted)'} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
                  <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
                </span>
                {on && <Icon name="eye" size={12} color="var(--pl-olive, #5C6B3F)" />}
              </button>
            );
            return (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '2px 0 8px' }}>
                  Your pages
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {row('all', 'All pages', 'The whole site on one canvas — everything editable', () => setCanvasPage(null), canvasPage === null)}
                  {row('home', 'Home', `/ · ${homeCount} section${homeCount === 1 ? '' : 's'}`, () => setCanvasPage('home'), canvasPage === 'home')}
                  {ownPages.map((sec) =>
                    row(
                      sec.id,
                      sec.label,
                      `/${BLOCK_PAGE_SLUG[sec.id as SiteBlockKey] ?? sec.id}`,
                      () => {
                        setCanvasPage(sec.id as SiteBlockKey);
                        setActive(sec.id);
                      },
                      canvasPage === sec.id,
                    ),
                  )}
                </div>
                {canvasPage !== null && (
                  <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                    The canvas shows this page as guests will see it.
                    Pick <strong>All pages</strong> to edit everything at once.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Theme tab body — selecting the tab already swaps the right
          rail to the Theme panel (setActive(null) above); this note
          says so instead of leaving the left rail blank, which read
          as a broken tab. */}
      {tab === 'theme' && (
        <div
          className="pl8-tab-enter"
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
          {isMobileViewport ? 'tap arrows to reorder' : 'drag to reorder'}
        </span>
      </div>
      )}

      {/* Section list — drag-to-reorder writes manifest.blockOrder.
          Hero stays pinned first; every other section is draggable. */}
      {tab === 'sections' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {orderedSections.map((s, i) => {
          const on = s.id === active;
          const sectionPeers = peers.filter((p) => p.section === s.id);
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
                gridTemplateColumns: isMobileViewport ? '12px 22px 1fr auto' : '12px 22px 1fr 14px',
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
                transition: 'background var(--pl-dur-quick), opacity var(--pl-dur-quick), transform var(--pl-dur-quick)',
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
                  {/* Co-editor presence — a small colored avatar when a
                      peer currently has THIS section open. */}
                  {sectionPeers.slice(0, 2).map((p, pi) => (
                    <span
                      key={p.key}
                      title={`${p.name} is editing this section`}
                      aria-label={`${p.name} is editing this section`}
                      style={{
                        width: 17, height: 17, borderRadius: '50%',
                        background: p.avatar ? 'var(--cream-2)' : p.color,
                        color: '#fff',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        fontSize: 8.5, fontWeight: 700, flexShrink: 0,
                        border: `1.5px solid ${on ? 'var(--ink)' : 'var(--cream)'}`,
                        marginLeft: pi === 0 ? 0 : -5,
                      }}
                    >
                      {p.avatar
                        ? <PlAvatar id={p.avatar} size={14} />
                        : (p.name || p.email).charAt(0).toUpperCase()}
                    </span>
                  ))}
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
              {/* Touch reorder — hover doesn't exist on phones and
                  HTML5 drag is inert there, so the arrows are the
                  reorder affordance. Always visible on mobile. */}
              {isMobileViewport && !isHero && onChange && (
                <span
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowMoveButton
                    dir={-1}
                    disabled={i - (heroSection ? 1 : 0) <= 0}
                    onRow={on}
                    onClick={() => moveRow(i - (heroSection ? 1 : 0), -1)}
                  />
                  <RowMoveButton
                    dir={1}
                    disabled={i - (heroSection ? 1 : 0) >= restOrder.length - 1}
                    onRow={on}
                    onClick={() => moveRow(i - (heroSection ? 1 : 0), 1)}
                  />
                </span>
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

/* RowMoveButton — one Move up / Move down chevron on a section row
   (mobile only). Visual stays small; the .pl-hit44 expander in
   pearloom.css grows the tap target to ≥44px on coarse pointers. */
function RowMoveButton({ dir, disabled, onRow, onClick }: {
  dir: -1 | 1;
  disabled: boolean;
  /** Row is the active (dark) row — flips the chevron to cream. */
  onRow: boolean;
  onClick: () => void;
}) {
  const color = disabled
    ? (onRow ? 'rgba(245,239,226,0.35)' : 'var(--ink-muted)')
    : (onRow ? 'var(--cream)' : 'var(--ink-soft)');
  return (
    <button
      type="button"
      className="pl-hit44"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? 'Move section up' : 'Move section down'}
      title={dir === -1 ? 'Move up' : 'Move down'}
      style={{
        width: 28,
        height: 34,
        padding: 0,
        border: 'none',
        borderRadius: 7,
        background: 'transparent',
        display: 'grid',
        placeItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
      }}
    >
      <Icon name={dir === -1 ? 'chev-up' : 'chev-down'} size={13} color={color} />
    </button>
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
