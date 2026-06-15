'use client';

 
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L668-793 PropertyRail.

   Single dedicated section-edit surface — no top-level tab strip.
   Eyebrow + title + hide/more icons + Content/Layout/Style sub-tabs +
   body (SectionEditor + Pear assist card). */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import type { SectionId } from './EditorRedesign';
import { LAYOUTS, readVariant, type LayoutVariant } from './layouts';
import { VariantGlyph } from './variant-glyphs';
import { getTheme } from '../site/themes';
import { pearErrorMessage } from './PearAssist';
import { fireUndoable } from './UndoToast';
import { pearWorking } from './PearLoomFx';
import { showPressings, type Pressing } from './ThreePressings';
import { useMobileViewport } from './use-mobile-viewport';

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
  privacy:     { id: 'privacy',     label: 'Privacy',         desc: 'Password / public' },
  dayof:       { id: 'dayof',       label: 'Day-of',          desc: 'Live broadcasts' },
  toasts:      { id: 'toasts',      label: 'Toasts & speeches', desc: 'Vows, toasts, eulogies — drafted with Pear' },
  memorial:    { id: 'memorial',    label: 'Memorial',        desc: 'Obituary + program' },
  bachelor:    { id: 'bachelor',    label: 'Weekend planner', desc: 'Costs + polls + rooms' },
};

interface Props {
  active: Exclude<SectionId, null>;
  setActive: (id: SectionId) => void;
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  /** Threaded through for tool panels (Guests, Save-the-date,
   *  Share, Day-of) that fetch live data via the public API. */
  siteSlug?: string;
}

export function PropertyRail({ active, setActive, manifest, onChange, siteSlug }: Props) {
  /* True when mounted inside the phone bottom sheet (the desktop
     grid only renders this rail above the breakpoint). */
  const isMobileViewport = useMobileViewport();
  const section = SECTIONS[active];
  const [tab, setTab] = useState<'content' | 'layout' | 'style'>('content');
  /* Tool panels (Guests / Share / Day-of / etc.) are host-only
     workspaces — they don't render a canvas section, so Layout +
     Style tabs would be meaningless there. Hide the tab strip
     and force content-mode on tools. */
  const TOOL_PANEL_KEYS = ['guests', 'savetheDate', 'share', 'dayof', 'memorial', 'bachelor', 'toasts'] as const;
  const isToolPanel = (TOOL_PANEL_KEYS as readonly string[]).includes(active);
  const effectiveTab = isToolPanel ? 'content' : tab;
  const [pearBusy, setPearBusy] = useState<string | null>(null);
  const [pearErr, setPearErr] = useState<string | null>(null);
  /* Hero is the one section that can never be hidden — a site
     without a hero is broken. Disable the eye-off button there. */
  const canHide = active !== 'hero';
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, active);

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
    if (!canHide) return;
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
    if (/3 styles/i.test(label)) { void runPressings(label); return; }
    const target = rewriteTarget(active, label);
    if (label === ASK_PEAR_CHIP || !target) {
      /* No single-field rewrite target — open Pear with the section
         already on the table instead of silently doing nothing. */
      try {
        window.dispatchEvent(new CustomEvent('pearloom:open-pear', {
          detail: { prefill: `Help me improve the ${section.label} section — what would you change?` },
        }));
      } catch { /* never break the rail */ }
      return;
    }
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

  return (
    <aside
      key={active}
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
        <div className="eyebrow" style={{ color: 'var(--lavender-ink)', marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          EDITING SECTION
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0, fontWeight: 600 }}>
            {section.label}
          </h3>
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
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{liveSectionDesc(section.id, manifest) ?? section.desc}</div>

        {/* Tabs — Content / Layout / Style. Hidden on tool panels
            (Guests / Share / Day-of / etc.) since they aren't
            canvas sections with layout + style overrides. */}
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
            { id: 'layout', label: 'Layout', icon: 'layout' },
            { id: 'style', label: 'Style', icon: 'palette' },
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
        key={tab}
        className="pl-rd-tab-body"
        style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}
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

        {effectiveTab === 'content' && renderSectionEditor(active, manifest, onChange, siteSlug)}

        {effectiveTab === 'layout' && (() => {
          /* Site nav has two independent variant axes — the desktop
             bar (manifest.layouts.nav) and the mobile drawer
             (manifest.layouts.navMobile). Render both pickers stacked
             so a host can pick one of each in one place. */
          if (active === 'nav') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <LayoutPickerGroup
                  manifest={manifest}
                  onChange={onChange}
                  section="nav"
                  heading="Desktop menu"
                  sub="Shown at tablet width and up."
                />
                <LayoutPickerGroup
                  manifest={manifest}
                  onChange={onChange}
                  section="navMobile"
                  heading="Phone menu"
                  sub="Shown on phones — pick the open/close motion."
                />
              </div>
            );
          }
          const variants = LAYOUTS[active];
          if (!variants) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  {section.label} layout
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                  This section has one refined layout in every theme. Try a different theme
                  pack for a fresh treatment.
                </div>
              </div>
            );
          }
          return (
            <LayoutPickerGroup
              manifest={manifest}
              onChange={onChange}
              section={active}
              heading={`${section.label} layout`}
            />
          );
        })()}

        {/* STYLE TAB — deliberately ships NO per-section override
            controls. Audited 2026-06-10 against redesign/ThemedSite:
            the renderer has zero per-section style read-paths —
            backgrounds are hardcoded per variant (var(--t-section) /
            var(--t-paper) inline), vertical padding is one GLOBAL
            density multiplier (manifest.density → ctx.pad), and
            section-head dividers are per-call-site constants
            (TSectionHead divider='sprig' + global dividerLook).
            The legacy manifest.blockStyles[*] shape (13 fields) is
            only consumed by site/ThemedSiteRenderer's
            BlockStyleWrapper — never by redesign/ThemedSite, which
            is what BOTH the canvas and PublishedSiteShell mount.
            Shipping paper-tint / padding-scale / divider toggles
            here would be write-only orphans the guest never sees.
            When ThemedSite grows a per-section style read (e.g.
            manifest.sectionStyles[id]), add the controls then. */}
        {effectiveTab === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Styling is theme-wide</div>
            <p style={{ margin: 0 }}>
              Colors, type, texture and component looks come from your <b>theme pack</b> so
              every section stays consistent.
            </p>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="btn btn-outline btn-sm"
              style={{ justifyContent: 'center' }}
            >
              <Icon name="palette" size={13} /> Open theme packs
            </button>
          </div>
        )}

        {/* Pear assist — prototype L758-789. */}
        {effectiveTab === 'content' && !isToolPanel && (
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

/* Every chip here maps to an IMPLEMENTED action. The previous list
   was prototype copy — 'Suggest a cover photo from gallery' secretly
   rewrote the tagline, and the RSVP chips ('Draft the reminder
   cadence', 'Add allergy field'…) mapped to nothing and died
   silently on click. Sections with a rewrite target get rewrite +
   pressings chips; everything else gets a real conversation with
   Pear, prefilled with the section context. */
export const ASK_PEAR_CHIP = 'Ask Pear about this section';
function pearSuggestions(active: Exclude<SectionId, null>): string[] {
  switch (active) {
    case 'hero':
      return ['Rewrite tagline in 3 styles', 'Warmer tagline', 'Shorter tagline'];
    case 'story':
      return ['Rewrite story in 3 styles', 'Make it 30% shorter', 'Warmer telling'];
    case 'registry':
      return ['Rewrite intro in 3 styles', 'Warmer intro', 'Shorter intro'];
    default:
      return [ASK_PEAR_CHIP];
  }
}

/* ─── LayoutPickerGroup — one labelled stack of VariantTiles.
   Renders the section's heading + (optional) sub copy + a column of
   tiles. Click on a tile writes manifest.layouts[section] = tile.id
   via onChange. Used twice on the nav section (desktop + mobile);
   once everywhere else. */
function LayoutPickerGroup({
  manifest,
  onChange,
  section,
  heading,
  sub,
}: {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
  section: Exclude<SectionId, null>;
  heading: string;
  sub?: string;
}) {
  const variants = LAYOUTS[section];
  const current = readVariant(manifest, section);
  const pick = (id: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    layouts: {
      ...((manifest as unknown as { layouts?: Record<string, string> }).layouts ?? {}),
      [section]: id,
    },
  } as unknown as StoryManifest);
  /* LIVE-THEME variant previews — resolve the same theme-var bag
     ThemedSite paints on the canvas root (base theme by id, then
     the Theme Store pack's manifest.themeVars override) and scope
     it onto the tile column. Every <VariantGlyph /> sketch inside
     reads var(--t-accent) / var(--t-gold) / var(--t-line) /
     var(--t-paper) / currentColor(--t-ink), so the previews
     re-color the moment the host switches theme or applies a
     pack — no static editor-chrome greys. */
  const themeId = ((manifest as unknown as { themeId?: string }).themeId)
    ?? ((manifest as unknown as { theme?: { id?: string } }).theme?.id);
  const themeVarsOverride = (manifest as unknown as { themeVars?: Record<string, string> }).themeVars;
  const liveThemeVars = {
    ...getTheme(themeId).vars,
    ...(themeVarsOverride ?? {}),
  } as unknown as CSSProperties;
  if (!variants) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{heading}</div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.5 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...liveThemeVars }}>
        {variants.map((v) => (
          <VariantTile
            key={v.id}
            variant={v}
            section={section}
            on={v.id === current}
            onPick={() => pick(v.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── VariantTile — handoff editor-redesign.jsx L725-739, upgraded.
   A row-per-variant with a THEME-AWARE mini-preview (VariantGlyph,
   see variant-glyphs.tsx) + label + check indicator when active.
   The tile chrome (background / border / labels) stays editor
   tokens; only the glyph inside previews in the live site theme. */

function VariantTile({ variant, section, on, onPick }: { variant: LayoutVariant; section: Exclude<SectionId, null>; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="lift"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        textAlign: 'left',
        background: on ? 'var(--cream-2)' : 'var(--card)',
        border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
        cursor: 'pointer',
        width: '100%',
        fontFamily: 'inherit',
      }}
    >
      <VariantGlyph section={section} variant={variant.id} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{variant.label}</div>
        {variant.sub && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{variant.sub}</div>}
      </div>
      {on && <Icon name="check" size={14} color="var(--ink)" />}
    </button>
  );
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
