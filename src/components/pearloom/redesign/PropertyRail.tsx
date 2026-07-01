'use client';

 
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L668-793 PropertyRail.

   Single dedicated section-edit surface — no top-level tab strip.
   Eyebrow + title + hide/more icons + Content/Layout/Style sub-tabs +
   body (SectionEditor + Pear assist card). */

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import type { SectionId } from './EditorRedesign';
import { pearErrorMessage } from './PearAssist';
import { fireUndoable } from './UndoToast';
import { pearWorking } from './PearLoomFx';
import { showPressings, type Pressing } from './ThreePressings';
import { useMobileViewport } from './use-mobile-viewport';
import { ThemePickerBody } from './ThemePickerBody';
import { occasionCopyFor } from './occasion-copy';

/* useSectionHidden — read/write manifest.hiddenSections from
   inside the rail. Mirrors the same hook in _section-atoms.tsx
   so the canvas + rail + panel footer all agree on a single
   source of truth. */
function useSectionHidden(
  manifest: StoryManifest,
  onChange: (m: StoryManifest) => void,
  section: string,
): [boolean, (next: boolean) => void] {
  const loose = manifest as unknown as Record<string, unknown>;
  const hidden = (Array.isArray(loose.hiddenSections) ? loose.hiddenSections : []) as string[];
  const isHidden = hidden.includes(section);
  const setHidden = (next: boolean) => {
    const list = next
      ? Array.from(new Set([...hidden, section]))
      : hidden.filter((s) => s !== section);
    onChange({ ...loose, hiddenSections: list } as unknown as StoryManifest);
  };
  return [isHidden, setHidden];
}

/* Maps a Pear suggestion + active section to the manifest field
   that should get rewritten + the context tag the inline-rewrite
   endpoint uses to colour the prompt. */
interface RewriteTarget {
  fieldPath: string[];
  context: string;
  tone: string;
}
function rewriteTarget(section: Exclude<SectionId, null>, label: string): RewriteTarget | null {
  const tone = /shorter|30%/i.test(label) ? 'shorter'
    : /warmer|punch up/i.test(label) ? 'warmer'
    : /funnier/i.test(label) ? 'funnier'
    : /poetic/i.test(label) ? 'poetic'
    : 'rewrite';
  if (section === 'hero') return { fieldPath: ['tagline'], context: 'hero tagline', tone };
  if (section === 'story') return { fieldPath: ['storySection', 'body'], context: 'story body', tone };
  if (section === 'registry') return { fieldPath: ['registryIntro'], context: 'registry intro line', tone };
  /* Sections without a single canonical text target (rsvp, details,
     schedule, travel, gallery, faq, nav). The rewrite chip is hidden
     by pearSuggestions() returning the generic fallback list, but if
     a host clicks one we want a graceful no-op rather than a write
     to a phantom field nothing reads. Previously this returned
     {detailsIntro} / {rsvpIntro} — both fields no panel or canvas
     ever touched, so the rewrite silently dropped on save. */
  return null;
}
function readPath(obj: unknown, path: string[]): string {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return '';
    }
  }
  return typeof cur === 'string' ? cur : '';
}
function writePath(obj: Record<string, unknown>, path: string[], value: string): Record<string, unknown> {
  if (path.length === 0) return obj;
  const next = { ...obj };
  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < path.length - 1; i += 1) {
    const k = path[i];
    const child = cursor[k];
    cursor[k] = typeof child === 'object' && child !== null ? { ...(child as Record<string, unknown>) } : {};
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]] = value;
  return next;
}
import { HeroPanel } from '../editor/panels/HeroPanel';
import { PrivacyPanel } from '../editor/panels/PrivacyPanel';
import { StoryPanel } from '../editor/panels/StoryPanel';
import { DetailsPanel } from '../editor/panels/DetailsPanel';
import { SchedulePanel } from '../editor/panels/SchedulePanel';
import { TravelPanel } from '../editor/panels/TravelPanel';
import { RegistryPanel } from '../editor/panels/RegistryPanel';
import { GalleryPanel } from '../editor/panels/GalleryPanel';
import { RsvpPanel } from '../editor/panels/RsvpPanel';
import { FaqPanel } from '../editor/panels/FaqPanel';
import { GuestsPanel } from '../editor/panels/GuestsPanel';
import { SaveTheDatePanel } from '../editor/panels/SaveTheDatePanel';
import { SharePanel } from '../editor/panels/SharePanel';
import { DayOfPanel } from '../editor/panels/DayOfPanel';
import { MemorialPanel } from '../editor/panels/MemorialPanel';
import { ToastsPanel } from '../editor/panels/ToastsPanel';
import { BachelorPanel } from '../editor/panels/BachelorPanel';
import { CountdownPanel } from '../editor/panels/CountdownPanel';
import { MapPanel } from '../editor/panels/MapPanel';
import { MusicPanel } from '../editor/panels/MusicPanel';
/* Event-OS block panels — one per occasion-gated canvas section.
   Where the Memorial / Weekend-planner tools already own the data
   (manifest.memorial.* / manifest.bachelor.*), these are thin
   editors over the SAME fields. */
import { ItineraryPanel } from '../editor/panels/blocks/ItineraryPanel';
import { CostSplitterPanel } from '../editor/panels/blocks/CostSplitterPanel';
import { ActivityVotePanel } from '../editor/panels/blocks/ActivityVotePanel';
import { ToastSignupPanel } from '../editor/panels/blocks/ToastSignupPanel';
import { AdviceWallPanel } from '../editor/panels/blocks/AdviceWallPanel';
import { ProgramPanel } from '../editor/panels/blocks/ProgramPanel';
import { LivestreamPanel } from '../editor/panels/blocks/LivestreamPanel';
import { ObituaryPanel } from '../editor/panels/blocks/ObituaryPanel';
import { PackingListPanel } from '../editor/panels/blocks/PackingListPanel';
import { HonorListPanel } from '../editor/panels/blocks/HonorListPanel';

/* Live header sub-lines — the prototype shipped hardcoded counts
   ('47 yes · 63 pending', '38 photos') that read as real data.
   Counts now come from the manifest; the RSVP panel's own meal
   counter already fetches the real guest list. */
function liveSectionDesc(id: Exclude<SectionId, null>, manifest: StoryManifest): string | null {
  const loose = manifest as unknown as { galleryImages?: unknown[]; faqs?: unknown[]; faq?: unknown[] };
  if (id === 'gallery') {
    const n = Array.isArray(loose.galleryImages) ? loose.galleryImages.filter(Boolean).length : 0;
    return n > 0 ? `${n} photo${n === 1 ? '' : 's'}` : 'No photos yet';
  }
  if (id === 'faq') {
    const list = Array.isArray(loose.faqs) ? loose.faqs : Array.isArray(loose.faq) ? loose.faq : [];
    return list.length > 0 ? `${list.length} question${list.length === 1 ? '' : 's'}` : 'No questions yet';
  }
  return null;
}

interface SectionInfo {
  id: Exclude<SectionId, null>;
  label: string;
  desc: string;
}

/* The story row is the only occasion-voiced entry — 'Our story /
   How you met' is wrong on a birthday or a memorial. Resolved at
   lookup (sectionInfoFor below) so the static map stays static. */
const COUPLE_STORY_OCCASIONS = new Set(['wedding', 'engagement', 'anniversary', 'vow-renewal']);

function sectionInfoFor(id: Exclude<SectionId, null>, occasion?: string): SectionInfo {
  const base = SECTIONS[id];
  if (id !== 'story' || occasion == null || COUPLE_STORY_OCCASIONS.has(occasion)) return base;
  return { ...base, label: occasionCopyFor(occasion).navStory, desc: 'The story behind the day' };
}

const SECTIONS: Record<Exclude<SectionId, null>, SectionInfo> = {
  hero:     { id: 'hero',     label: 'Opening',   desc: 'Names, date, cover photo' },
  story:    { id: 'story',    label: 'Our story', desc: 'How you met' },
  details:  { id: 'details',  label: 'Details',   desc: 'Dress code, kids, FAQ-lite' },
  schedule: { id: 'schedule', label: 'Schedule',  desc: 'Day-of timeline' },
  travel:   { id: 'travel',   label: 'Travel',    desc: 'Hotels, transit, tips' },
  registry: { id: 'registry', label: 'Registry',  desc: 'Linked stores' },
  gallery:  { id: 'gallery',  label: 'Gallery',   desc: 'Your photo wall' },
  rsvp:     { id: 'rsvp',     label: 'RSVP',      desc: 'Reply form & deadline' },
  faq:      { id: 'faq',      label: 'FAQ',       desc: 'Guest questions' },
  nav:      { id: 'nav',      label: 'Site nav',  desc: 'Brand + links' },
  navMobile:{ id: 'navMobile',label: 'Mobile nav',desc: 'Drawer for phones' },
  /* Optional sections — added via the Add Section picker.
     Once present, render through the same dispatch as core
     sections. */
  countdown: { id: 'countdown', label: 'Countdown', desc: 'Cards · stripe · minimal · hero' },
  map:       { id: 'map',       label: 'Map',       desc: 'Live Google Maps embed' },
  music:     { id: 'music',     label: 'Music',     desc: 'Spotify · Apple · YouTube playlist' },
  /* Event-OS blocks — occasion-gated sections added via the Add
     Section picker (isBlockApplicable). */
  itinerary:    { id: 'itinerary',    label: 'Itinerary',     desc: 'Multi-day plan, hour by hour' },
  costSplitter: { id: 'costSplitter', label: 'Cost splitter', desc: 'Who owes what — settled gently' },
  activityVote: { id: 'activityVote', label: 'Group vote',    desc: 'Let the group pick' },
  toastSignup:  { id: 'toastSignup',  label: 'Toast signup',  desc: 'Claim a toast slot' },
  adviceWall:   { id: 'adviceWall',   label: 'Advice wall',   desc: 'Words for the honoree' },
  program:      { id: 'program',      label: 'Program',       desc: 'The order of the ceremony' },
  livestream:   { id: 'livestream',   label: 'Livestream',    desc: 'For the ones far away' },
  obituary:     { id: 'obituary',     label: 'Obituary',      desc: 'A life, remembered' },
  packingList:  { id: 'packingList',  label: 'Packing list',  desc: 'What to bring' },
  honorList:    { id: 'honorList',    label: 'Honor list',    desc: 'The people beside them' },
  /* Tool panels — same lookup so the rail header shows the
     right label + tagline when the host picks a tool. */
  guests:      { id: 'guests',      label: 'Guests',          desc: 'Your guest list' },
  savetheDate: { id: 'savetheDate', label: 'Save the date',   desc: 'Pre-invite teaser' },
  share:       { id: 'share',       label: 'Share',           desc: 'Link, QR, preview' },
  cohost:      { id: 'cohost',      label: 'Co-hosts',        desc: 'Invite a partner to edit' },
  privacy:     { id: 'privacy',     label: 'Privacy',         desc: 'Password / public' },
  dayof:       { id: 'dayof',       label: 'Day-of',          desc: 'Live broadcasts' },
  toasts:      { id: 'toasts',      label: 'Toasts & speeches', desc: 'Vows, toasts, eulogies — drafted with Pear' },
  memorial:    { id: 'memorial',    label: 'Memorial',        desc: 'Obituary + program' },
  bachelor:    { id: 'bachelor',    label: 'Weekend planner', desc: 'Costs + polls + rooms' },
};

interface Props {
  /** The selected canvas section / tool panel, or null when nothing
   *  is selected — in which case the Content tab shows a "Pick a
   *  section" empty state while Design + Motion stay available. */
  active: SectionId;
  setActive: (id: SectionId) => void;
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  /** Threaded through for tool panels (Guests, Save-the-date,
   *  Share, Day-of) that fetch live data via the public API. */
  siteSlug?: string;
  /** Opens the global Theme Shop / Decor drawers — the Design tab's
   *  CTAs (the v2 rail folds the whole site look in here). */
  onOpenShop?: () => void;
  onOpenDecor?: () => void;
}

export function PropertyRail({ active, setActive, manifest, onChange, siteSlug, onOpenShop, onOpenDecor }: Props) {
  /* True when mounted inside the phone bottom sheet (the desktop
     grid only renders this rail above the breakpoint). */
  const isMobileViewport = useMobileViewport();
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const section = active ? sectionInfoFor(active, occasion) : null;
  const [tab, setTab] = useState<'content' | 'design' | 'motion'>('content');
  /* Tool panels (Guests / Share / Day-of / etc.) are host-only
     workspaces — they don't render a canvas section, so the global
     Design + Motion tabs would be confusing there. Force content-
     mode on tools (the tab strip still shows, but tool panels stay
     on their own workspace). */
  const TOOL_PANEL_KEYS = ['guests', 'savetheDate', 'share', 'cohost', 'dayof', 'memorial', 'bachelor', 'toasts', 'privacy'] as const;
  const isToolPanel = active != null && (TOOL_PANEL_KEYS as readonly string[]).includes(active);
  const effectiveTab = isToolPanel ? 'content' : tab;
  const [pearBusy, setPearBusy] = useState<string | null>(null);
  const [pearErr, setPearErr] = useState<string | null>(null);

  /* Selecting a section jumps the rail to Content (v2 editor.jsx
     onSelect → setTab('content')); deselecting leaves the tab where
     it is so Design / Motion stay put. Render-time adjustment (React
     docs "store info from prior renders") — not an effect, converges
     in one extra render. */
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active != null) setTab('content');
    // Pear feedback belongs to the section it was triggered on —
    // "Add a hero tagline first…" must not linger under Story.
    setPearErr(null);
    setPearBusy(null);
  }

  /* The topbar Theme button + any "open the look" deep link flips
     the rail to its Design tab (the v2 rail folds the whole site
     look in here, so there's no separate theme rail to open). */
  useEffect(() => {
    const toDesign = () => setTab('design');
    window.addEventListener('pearloom:open-theme-rail', toDesign);
    return () => window.removeEventListener('pearloom:open-theme-rail', toDesign);
  }, []);
  /* Hero is the one section that can never be hidden — a site
     without a hero is broken. Disable the eye-off button there. */
  const canHide = active != null && active !== 'hero';
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, active ?? '');

  /* TRY-ANYTHING-SAFELY — hiding a section is destructive enough to
     deserve a way back, but never an "are you sure?" gate. Hide
     immediately, then fire `pearloom:undoable`. The undo closure is
     SURGICAL: it removes just this section from hiddenSections on
     the manifest as it stands at undo time (read via refs), so
     edits the host made during the 6s toast window survive. Showing
     a hidden section back is additive — no toast for that. */
  const manifestRef = useRef(manifest);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    manifestRef.current = manifest;
    onChangeRef.current = onChange;
  }, [manifest, onChange]);
  const toggleHidden = () => {
    if (!canHide || active == null || !section) return;
    if (isHidden) { setHidden(false); return; }
    const sectionId = active;
    const label = section.label;
    setHidden(true);
    fireUndoable(`${label} hidden from the live site`, () => {
      const loose = manifestRef.current as unknown as Record<string, unknown>;
      const hidden = (Array.isArray(loose.hiddenSections) ? loose.hiddenSections : []) as string[];
      onChangeRef.current({ ...loose, hiddenSections: hidden.filter((s) => s !== sectionId) } as unknown as StoryManifest);
    });
  };
  /* Options popover state — opens from the three-dot button. */
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!optionsWrapRef.current?.contains(e.target as Node)) setOptionsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOptionsOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [optionsOpen]);

  /* Section reorder helpers — operate on manifest.blockOrder which
     the editor + canvas both read. The options popover surfaces
     "Move up" / "Move down" using these. */
  function moveSection(direction: -1 | 1) {
    if (active == null) return;
    const loose = manifest as unknown as Record<string, unknown>;
    const coreReorderable = ['story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq'];
    const optionalReorderable = [
      'countdown', 'map', 'music',
      'itinerary', 'costSplitter', 'activityVote', 'toastSignup', 'adviceWall',
      'program', 'livestream', 'obituary', 'packingList', 'honorList',
    ];
    const allReorderable = [...coreReorderable, ...optionalReorderable];
    const current = (loose.blockOrder as string[] | undefined) ?? coreReorderable;
    const filtered = current.filter((k) => allReorderable.includes(k));
    const idx = filtered.indexOf(active);
    if (idx < 0) return;
    const next = [...filtered];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...loose, blockOrder: next } as unknown as StoryManifest);
    setOptionsOpen(false);
  }

  /* Alt+↑ / Alt+↓ reorder the selected section without reaching for
     the options popover or the drag handle. Alt (not Cmd) so it
     can't collide with browser/OS shortcuts or the bridge's Cmd
     layer; skipped while typing so option-key character entry on
     macOS keyboards isn't swallowed. */
  const moveRef = useRef(moveSection);
  moveRef.current = moveSection;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      e.preventDefault();
      moveRef.current(e.key === 'ArrowUp' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* runSuggestion — POST /api/inline-rewrite with the source field
     value + tone context, then patch the manifest with the rewrite. */
  async function runSuggestion(label: string) {
    setPearErr(null);
    if (active == null) return;
    if (/3 styles/i.test(label)) { void runPressings(label); return; }
    const target = rewriteTarget(active, label);
    /* Defensive: pearSuggestions() only ever offers chips that map to
       a real inline rewrite target (or the 3-styles contact sheet
       handled above), so this branch shouldn't fire — but if a chip
       ever lands here without a target, no-op rather than write to a
       phantom field. */
    if (!target) return;
    const current = readPath(manifest, target.fieldPath);
    if (!current.trim()) {
      setPearErr(`Add some ${target.context} first, then Pear can rewrite it.`);
      return;
    }
    setPearBusy(label);
    pearWorking('start', active);
    try {
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: current, context: target.context, instruction: `make it ${target.tone}` }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[property-rail] rewrite failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t rewrite that one — try again?');
      }
      const { rewritten } = await res.json() as { rewritten: string };
      if (rewritten && rewritten !== current) {
        onChange(writePath(manifest as unknown as Record<string, unknown>, target.fieldPath, rewritten) as unknown as StoryManifest);
      }
      pearWorking('done', active);
    } catch (e) {
      console.error('[property-rail] rewrite error:', e);
      pearWorking('error', active);
      setPearErr(pearErrorMessage(e, 'Pear couldn’t rewrite that one — try again?'));
    } finally {
      setPearBusy(null);
    }
  }

  /* "…in 3 styles" — THE CONTACT SHEET. Three parallel rewrites in
     three directions, each pressed into a full manifest variant and
     laid out as live miniatures (ThreePressings). The pick drapes
     in the Fitting Room; nothing applies until Keep. */
  async function runPressings(label: string) {
    if (active == null) return;
    const target = rewriteTarget(active, label);
    if (!target) return;
    const current = readPath(manifest, target.fieldPath);
    if (!current.trim()) {
      setPearErr(`Add some ${target.context} first, then Pear can press variations.`);
      return;
    }
    setPearBusy(label);
    pearWorking('start', active);
    const DIRECTIONS: Array<[string, string]> = [
      ['Tighter', 'make it shorter and punchier'],
      ['Warmer', 'make it warmer and more romantic'],
      ['Poetic', 'make it more poetic and editorial'],
    ];
    try {
      const results = await Promise.all(DIRECTIONS.map(async ([name, instruction]) => {
        const res = await fetch('/api/inline-rewrite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: current, context: target.context, instruction }),
        });
        if (!res.ok) throw new Error('Pear couldn’t press the variations — try again?');
        const { rewritten } = await res.json() as { rewritten: string };
        return [name, rewritten] as const;
      }));
      const variants: Pressing[] = results
        .filter(([, text]) => !!text)
        .map(([name, text]) => ({
          label: name,
          manifest: writePath(manifest as unknown as Record<string, unknown>, target.fieldPath, text) as unknown as StoryManifest,
        }));
      pearWorking('done', active);
      if (variants.length === 0 || variants.every((v) => readPath(v.manifest, target.fieldPath) === current)) {
        setPearErr('Pear pressed the same line three times — try a whisper instead.');
        return;
      }
      showPressings(active ?? 'hero', variants);
    } catch (e) {
      pearWorking('error', active);
      setPearErr(pearErrorMessage(e, 'Pear couldn’t press the variations — try again?'));
    } finally {
      setPearBusy(null);
    }
  }

  /* Contextual header — the v2 inspector keeps Content · Design ·
     Motion tabs always present; only Content is per-section, so the
     eyebrow / title / blurb adapt to the active tab. */
  const headEyebrow = effectiveTab === 'content'
    ? (section ? 'Editing section' : 'Your site')
    : effectiveTab === 'design' ? 'Site look' : '✦ Atelier';
  const headTitle = effectiveTab === 'content'
    ? (section ? section.label : 'Pick a section')
    : effectiveTab === 'design' ? 'Design' : 'Motion';
  const headDesc = effectiveTab === 'content'
    ? (section ? (liveSectionDesc(section.id, manifest) ?? section.desc) : 'Click any section on the canvas — or in the list on the left — to edit it.')
    : effectiveTab === 'design' ? 'Theme, type, texture & navigation — for the whole site.'
    : 'Living finishes that bring your site to life.';

  return (
    <aside
      className="pl-rd-rail-right"
      style={{
        /* Desktop grid placement only — inside the phone bottom
           sheet's single-cell grid, the named-area lookup creates an
           implicit empty track that shoves the rail off-center (same
           fix as PearAside / SectionRail). */
        ...(isMobileViewport
          ? {}
          : { gridArea: 'right', borderLeft: '1px solid var(--line-soft)' }),
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header — prototype L684-694. */}
      <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {headEyebrow}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, margin: 0, fontWeight: 600, color: 'var(--lavender-ink)' }}>
            {headTitle}
          </h3>
          {/* Hide / move act on canvas sections; tool panels (Guests,
              Share, Privacy…) aren't on the canvas, so the controls
              would write meaningless keys into hiddenSections. */}
          {effectiveTab === 'content' && section && !isToolPanel && (
          <div style={{ display: 'flex', gap: 6, position: 'relative' }} ref={optionsWrapRef}>
            <button
              type="button"
              title={
                !canHide ? 'Hero can’t be hidden'
                  : isHidden ? `Show ${section.label} on the live site`
                  : `Hide ${section.label} from the live site`
              }
              onClick={toggleHidden}
              disabled={!canHide}
              aria-pressed={isHidden}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: isHidden ? 'var(--peach-bg)' : 'var(--cream-2)',
                border: isHidden ? '1px solid var(--peach-ink)' : 'none',
                display: 'grid', placeItems: 'center',
                cursor: canHide ? 'pointer' : 'not-allowed',
                opacity: canHide ? 1 : 0.4,
                transition: 'background var(--pl-dur-quick), border-color var(--pl-dur-quick)',
              }}
            >
              <Icon
                name={isHidden ? 'eye-off' : 'eye'}
                size={13}
                color={isHidden ? 'var(--peach-ink)' : 'var(--ink-soft)'}
              />
            </button>
            <button
              type="button"
              title="Section options"
              onClick={() => setOptionsOpen(!optionsOpen)}
              aria-haspopup="menu"
              aria-expanded={optionsOpen}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: optionsOpen ? 'var(--cream-3)' : 'var(--cream-2)',
                display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
                transition: 'background var(--pl-dur-quick)',
              }}
            >
              <Icon name="more" size={13} color="var(--ink-soft)" />
            </button>
            {optionsOpen && (
              <div
                role="menu"
                className="pl8-pop-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 'var(--z-dropdown)',
                  minWidth: 180,
                  padding: 4,
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <OptionRow
                  icon="arrow-up"
                  label="Move up"
                  onClick={() => moveSection(-1)}
                  disabled={!canHide}
                />
                <OptionRow
                  icon="arrow-down"
                  label="Move down"
                  onClick={() => moveSection(+1)}
                  disabled={!canHide}
                />
                <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
                {/* No "Duplicate section" row — deliberately. Every
                    redesign section reads ONE manifest store
                    (chapters / events / faqs / galleryImages /
                    memorial.* / bachelor.*), and blockOrder is a
                    set of unique section ids ThemedSite renders by
                    kind (key={kind}). A duplicated id would paint
                    the SAME data twice and collide React keys —
                    a data-fork footgun, not a feature. */}
                <OptionRow
                  icon={isHidden ? 'eye' : 'eye-off'}
                  label={isHidden ? `Show on the live site` : `Hide from the live site`}
                  onClick={() => { toggleHidden(); setOptionsOpen(false); }}
                  disabled={!canHide}
                />
              </div>
            )}
          </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{headDesc}</div>

        {/* Tabs — Content · Design · ✦ Motion (the v2 inspector).
            Hidden on tool panels (Guests / Share / Day-of / etc.)
            which own the whole rail with their own workspace. */}
        {!isToolPanel && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 3,
            background: 'var(--cream-2)',
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {([
            { id: 'content', label: 'Content', icon: 'text' },
            { id: 'design', label: 'Design', icon: 'palette' },
            { id: 'motion', label: '✦ Motion', icon: 'sparkles' },
          ] as const).map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="pl-rd-tab"
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  justifyContent: 'center',
                  border: 0,
                  cursor: 'pointer',
                }}
              >
                <Icon name={t.icon} size={11} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
                {t.label}
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Body — prototype L718-790. minHeight: 0 is critical for the
          flex:1 + overflow:auto pattern to actually scroll inside a
          fixed-height grid cell; without it the flex item refuses to
          shrink below its content's intrinsic size and the rail
          pushes past the viewport. */}
      <div
        /* Keyed by tab AND (on the content tab) the active section, so
           switching sections replays the fade-up like tab flips do —
           panel switches were the one hard swap left in the rail.
           Design/Motion keep the plain tab key: keying those by
           section would remount ThemePickerBody and drop its state. */
        key={effectiveTab === 'content' ? `content:${active ?? 'none'}` : tab}
        className="pl-rd-tab-body"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          /* Content owns its padding + scroll; Design / Motion render
             ThemePickerBody, which brings its own flex:1 overflow:auto
             padded container — so the wrapper gets out of its way. */
          overflow: effectiveTab === 'content' ? 'auto' : 'hidden',
          padding: effectiveTab === 'content' ? 20 : 0,
          gap: effectiveTab === 'content' ? 18 : 0,
        }}
      >
        {/* RSVP "Preview as a guest" — fires the same `pl-open-rsvp`
            window event every published-site RSVP CTA dispatches.
            EditorRedesign mounts the real GuestRsvpModal on the
            canvas (EditorCanvasRsvpModal), so this opens the exact
            form + ceremony a guest experiences — no mock. */}
        {effectiveTab === 'content' && active === 'rsvp' && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ justifyContent: 'center' }}
            onClick={() => {
              if (typeof window === 'undefined') return;
              window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
            }}
          >
            <Icon name="eye" size={13} /> Preview as a guest
          </button>
        )}

        {effectiveTab === 'content' && active && renderSectionEditor(active, manifest, onChange, siteSlug)}

        {/* Layout is NOT a rail control — it lives inline on the
            canvas (the floating "Layout" bar over the selected
            section, ThemedSite's InlineLayoutBar). */}

        {/* Pear can populate this — rich AI suggestion cards (the v2
            "✦ Show me" card). Opens the CanvasPearBlocks modal, which
            calls real AI grounded in this site (FAQ + Travel) or
            offers curated occasion starting points (Details). */}
        {effectiveTab === 'content' && active != null && POPULATE_KINDS.has(active) && (
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gold, #C8B98C)' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(193,154,75,0.16), rgba(193,154,75,0.06))', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Pear size={20} tone="sage" sparkle shadow={false} />
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink, #8C6E3D)' }}>
                  Pear can populate this
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
                {POPULATE_TITLE[active]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5, marginBottom: 11 }}>
                {POPULATE_BLURB[active] ?? 'Pear returns rich, ready-to-place cards — review and Add what fits.'}
              </div>
              <button
                type="button"
                onClick={() => { try { window.dispatchEvent(new CustomEvent('pearloom:open-picks', { detail: { kind: active } })); } catch { /* */ } }}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--olive, #5C6B3F)', color: 'var(--cream)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                ✦ Show me
              </button>
            </div>
          </div>
        )}

        {/* Empty Content state — nothing selected. Design + Motion
            stay available in their own tabs. */}
        {effectiveTab === 'content' && !active && (
          <div style={{ textAlign: 'center', padding: '34px 12px', color: 'var(--ink-muted)' }}>
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
              <Pear size={30} tone="sage" shadow={false} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>Pick a section</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>Click any section on the canvas, or in the list on the left, to edit its content.</div>
          </div>
        )}

        {/* DESIGN TAB — the whole site look: theme · type · texture ·
            kit · navigation · footer · decor. The v2 inspector folds
            the former standalone theme rail in here. */}
        {effectiveTab === 'design' && (
          <ThemePickerBody
            manifest={manifest}
            onChange={onChange}
            onOpenShop={onOpenShop ?? (() => {})}
            onOpenDecor={onOpenDecor ?? (() => {})}
            motion="hidden"
          />
        )}

        {/* MOTION TAB — Atelier living finishes (the 8 animated kits). */}
        {effectiveTab === 'motion' && (
          <ThemePickerBody
            manifest={manifest}
            onChange={onChange}
            onOpenShop={onOpenShop ?? (() => {})}
            onOpenDecor={onOpenDecor ?? (() => {})}
            motion="only"
          />
        )}

        {/* Pear assist — prototype L758-789. Only shown where Pear
            has a real inline action (see pearSuggestions). */}
        {effectiveTab === 'content' && active && !isToolPanel && pearSuggestions(active).length > 0 && (
          <div style={{ padding: 14, background: 'var(--peach-bg)', borderRadius: 12, marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Pear size={22} tone="sage" sparkle shadow={false} />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)' }}>
                Pear can help
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pearSuggestions(active).map((s, i) => {
                const busy = pearBusy === s;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => runSuggestion(s)}
                    disabled={!!pearBusy}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      background: 'var(--card)',
                      border: '1px solid rgba(198,112,61,0.2)',
                      fontSize: 12,
                      color: 'var(--ink)',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: pearBusy ? 'wait' : 'pointer',
                      opacity: pearBusy && !busy ? 0.5 : 1,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {busy && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--peach-ink)', animation: 'pl-dot-pulse 1.4s ease-in-out infinite' }} />
                      )}
                      {s}
                    </span>
                    <Icon name={busy ? 'sparkles' : 'arrow-right'} size={11} color="var(--peach-ink)" />
                  </button>
                );
              })}
              {pearErr && (
                <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--pl-chrome-danger-soft, rgba(122,45,45,0.08))', fontSize: 11.5, color: 'var(--pl-chrome-danger, #7A2D2D)' }}>
                  {pearErr}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* Titles for the "Pear can populate this" card (the CanvasPearBlocks
   trigger). Keyed by the sections that have a rich-card populator. */
const POPULATE_TITLE: Record<string, string> = {
  faq: 'The questions guests ask',
  travel: 'Stays near your venue',
  details: 'The details guests need',
  schedule: 'Your day, in moments',
  registry: 'A few registry ideas',
  gallery: 'Captions for your photos',
  story: 'A first draft of your story',
};
/* Per-section blurb for the "Pear can populate this" card — tailored
   so the copy fits what each section actually returns (Story is prose,
   not cards). */
const POPULATE_BLURB: Record<string, string> = {
  faq: 'Real answers drawn from your venue, date, dress code & registry — keep the ones that fit.',
  travel: 'Real stays near your venue — distance, price & amenities. Add the ones you like.',
  details: 'Common starting points for your celebration — Add what fits, then edit.',
  schedule: 'A timeline shaped for your occasion — Add the moments that fit.',
  registry: 'Funds & shops that suit your celebration — Add what fits, then drop in your links.',
  gallery: 'A quiet caption for each of your photos — Add the ones you like.',
  story: 'A first draft in your voice, from your details — use it as a start, then edit anything.',
};
/* Sections that can summon the Pear Picks rich-card modal. */
const POPULATE_KINDS = new Set(['faq', 'travel', 'details', 'schedule', 'registry', 'gallery', 'story']);

/* Every chip maps to a REAL inline action: a single-field rewrite
   (Warmer / Shorter intro) or the 3-styles contact sheet — both run
   on the canvas without leaving the rail. Sections without a single
   canonical text target (details, schedule, travel, gallery, rsvp,
   faq) return no chips, so the "Pear can help" card only appears
   where it can actually do something inline. */
function pearSuggestions(active: Exclude<SectionId, null>): string[] {
  switch (active) {
    case 'hero':
      return ['Rewrite tagline in 3 styles', 'Warmer tagline', 'Shorter tagline'];
    case 'story':
      return ['Rewrite story in 3 styles', 'Make it 30% shorter'];
    case 'registry':
      return ['Rewrite intro in 3 styles', 'Warmer intro'];
    default:
      return [];
  }
}

function renderSectionEditor(
  active: Exclude<SectionId, null>,
  manifest: StoryManifest,
  onChange: (m: StoryManifest) => void,
  siteSlug?: string,
) {
  const props = { manifest, onChange };
  switch (active) {
    case 'hero':     return <HeroPanel {...props} />;
    case 'story':    return <StoryPanel {...props} />;
    case 'details':  return <DetailsPanel {...props} />;
    case 'schedule': return <SchedulePanel {...props} />;
    case 'travel':   return <TravelPanel {...props} />;
    case 'registry': return <RegistryPanel {...props} />;
    case 'gallery':  return <GalleryPanel {...props} />;
    case 'rsvp':     return <RsvpPanel {...props} siteSlug={siteSlug} />;
    case 'faq':      return <FaqPanel {...props} />;
    /* Optional sections (Add Section picker). */
    case 'countdown':return <CountdownPanel {...props} />;
    case 'map':      return <MapPanel {...props} />;
    case 'music':    return <MusicPanel {...props} />;
    /* Event-OS blocks — occasion-gated canvas sections. */
    case 'itinerary':    return <ItineraryPanel {...props} />;
    case 'costSplitter': return <CostSplitterPanel {...props} />;
    case 'activityVote': return <ActivityVotePanel {...props} />;
    case 'toastSignup':  return <ToastSignupPanel {...props} />;
    case 'adviceWall':   return <AdviceWallPanel {...props} />;
    case 'program':      return <ProgramPanel {...props} />;
    case 'livestream':   return <LivestreamPanel {...props} />;
    case 'obituary':     return <ObituaryPanel {...props} />;
    case 'packingList':  return <PackingListPanel {...props} />;
    case 'honorList':    return <HonorListPanel {...props} />;
    /* Tool panels — host-only workspaces. Most need siteSlug to
       fetch live data (guest counts, broadcasts, OG card). */
    case 'guests':      return siteSlug ? <GuestsPanel siteSlug={siteSlug} /> : null;
    case 'savetheDate': return siteSlug ? <SaveTheDatePanel manifest={manifest} onChange={onChange} siteSlug={siteSlug} /> : null;
    case 'share':       return siteSlug ? <SharePanel manifest={manifest} siteSlug={siteSlug} /> : null;
    case 'cohost':      return siteSlug ? <SharePanel manifest={manifest} siteSlug={siteSlug} focus="cohost" /> : null;
    case 'privacy':     return <PrivacyPanel manifest={manifest} onChange={onChange} />;
    case 'dayof':       return siteSlug ? <DayOfPanel siteSlug={siteSlug} /> : null;
    case 'toasts':      return <ToastsPanel manifest={manifest} names={((manifest as unknown as { names?: [string, string] }).names ?? ['', '']) as [string, string]} onChange={onChange} />;
    case 'memorial':    return <MemorialPanel {...props} />;
    case 'bachelor':    return <BachelorPanel {...props} />;
    /* nav / navMobile fall through — handled by PropertyRail's
       own dispatch via Pear quick actions; no panel mounts. */
    default:         return null;
  }
}

/* OptionRow — one row in the section-options popover. Mirrors the
   shape of dropdown items elsewhere in the editor. */
function OptionRow({
  icon, label, onClick, disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 10px',
        background: 'transparent', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12.5,
        color: disabled ? 'var(--ink-muted)' : 'var(--ink)',
        opacity: disabled ? 0.55 : 1,
        textAlign: 'left',
        borderRadius: 6,
        transition: 'background var(--pl-dur-instant)',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--cream-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={icon} size={12} color={disabled ? 'var(--ink-muted)' : 'var(--ink-soft)'} />
      <span>{label}</span>
    </button>
  );
}
