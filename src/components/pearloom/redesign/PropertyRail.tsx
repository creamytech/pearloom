'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L668-793 PropertyRail.

   Single dedicated section-edit surface — no top-level tab strip.
   Eyebrow + title + hide/more icons + Content/Layout/Style sub-tabs +
   body (SectionEditor + Pear assist card). */

import { useEffect, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import type { SectionId } from './EditorRedesign';
import { LAYOUTS, readVariant, type LayoutVariant } from './layouts';
import { pearErrorMessage } from './PearAssist';

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
import { BachelorPanel } from '../editor/panels/BachelorPanel';
import { CountdownPanel } from '../editor/panels/CountdownPanel';
import { MapPanel } from '../editor/panels/MapPanel';
import { MusicPanel } from '../editor/panels/MusicPanel';

interface SectionInfo {
  id: Exclude<SectionId, null>;
  label: string;
  desc: string;
}

const SECTIONS: Record<Exclude<SectionId, null>, SectionInfo> = {
  hero:     { id: 'hero',     label: 'Hero',      desc: 'Names, date, cover photo' },
  story:    { id: 'story',    label: 'Our story', desc: 'How you met' },
  details:  { id: 'details',  label: 'Details',   desc: 'Dress code, kids, FAQ-lite' },
  schedule: { id: 'schedule', label: 'Schedule',  desc: 'Day-of timeline' },
  travel:   { id: 'travel',   label: 'Travel',    desc: 'Hotels, transit, tips' },
  registry: { id: 'registry', label: 'Registry',  desc: 'Linked stores' },
  gallery:  { id: 'gallery',  label: 'Gallery',   desc: '38 photos' },
  rsvp:     { id: 'rsvp',     label: 'RSVP',      desc: '47 yes · 63 pending' },
  faq:      { id: 'faq',      label: 'FAQ',       desc: '6 questions answered' },
  nav:      { id: 'nav',      label: 'Site nav',  desc: 'Brand + links' },
  navMobile:{ id: 'navMobile',label: 'Mobile nav',desc: 'Drawer for phones' },
  /* Optional sections — added via the Add Section picker.
     Once present, render through the same dispatch as core
     sections. */
  countdown: { id: 'countdown', label: 'Countdown', desc: 'Cards · stripe · minimal · hero' },
  map:       { id: 'map',       label: 'Map',       desc: 'Live Google Maps embed' },
  music:     { id: 'music',     label: 'Music',     desc: 'Spotify · Apple · YouTube playlist' },
  /* Tool panels — same lookup so the rail header shows the
     right label + tagline when the host picks a tool. */
  guests:      { id: 'guests',      label: 'Guests',          desc: 'Your guest list' },
  savetheDate: { id: 'savetheDate', label: 'Save the date',   desc: 'Pre-invite teaser' },
  share:       { id: 'share',       label: 'Share',           desc: 'Link, QR, preview' },
  dayof:       { id: 'dayof',       label: 'Day-of',          desc: 'Live broadcasts' },
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
  const section = SECTIONS[active];
  const [tab, setTab] = useState<'content' | 'layout' | 'style'>('content');
  /* Tool panels (Guests / Share / Day-of / etc.) are host-only
     workspaces — they don't render a canvas section, so Layout +
     Style tabs would be meaningless there. Hide the tab strip
     and force content-mode on tools. */
  const TOOL_PANEL_KEYS = ['guests', 'savetheDate', 'share', 'dayof', 'memorial', 'bachelor'] as const;
  const isToolPanel = (TOOL_PANEL_KEYS as readonly string[]).includes(active);
  const effectiveTab = isToolPanel ? 'content' : tab;
  const [pearBusy, setPearBusy] = useState<string | null>(null);
  const [pearErr, setPearErr] = useState<string | null>(null);
  /* Hero is the one section that can never be hidden — a site
     without a hero is broken. Disable the eye-off button there. */
  const canHide = active !== 'hero';
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, active);
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
    const optionalReorderable = ['countdown', 'map', 'music'];
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

  /* runSuggestion — POST /api/inline-rewrite with the source field
     value + tone context, then patch the manifest with the rewrite. */
  async function runSuggestion(label: string) {
    setPearErr(null);
    const target = rewriteTarget(active, label);
    if (!target) return; /* Section doesn't map to a single text field. */
    const current = readPath(manifest, target.fieldPath);
    if (!current.trim()) {
      setPearErr(`Add some ${target.context} first, then Pear can rewrite it.`);
      return;
    }
    setPearBusy(label);
    try {
      const res = await fetch('/api/inline-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: current, context: `${target.context} — make it ${target.tone}` }),
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
    } catch (e) {
      console.error('[property-rail] rewrite error:', e);
      setPearErr(pearErrorMessage(e, 'Pear couldn’t rewrite that one — try again?'));
    } finally {
      setPearBusy(null);
    }
  }

  return (
    <aside
      key={active}
      className="pl-rd-rail-right"
      style={{
        gridArea: 'right',
        background: 'var(--card)',
        borderLeft: '1px solid var(--line-soft)',
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
              onClick={() => canHide && setHidden(!isHidden)}
              disabled={!canHide}
              aria-pressed={isHidden}
              style={{
                width: 26, height: 26, borderRadius: 6,
                background: isHidden ? 'var(--peach-bg)' : 'var(--cream-2)',
                border: isHidden ? '1px solid var(--peach-ink)' : 'none',
                display: 'grid', placeItems: 'center',
                cursor: canHide ? 'pointer' : 'not-allowed',
                opacity: canHide ? 1 : 0.4,
                transition: 'background 140ms, border-color 140ms',
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
                width: 26, height: 26, borderRadius: 6,
                background: optionsOpen ? 'var(--cream-3)' : 'var(--cream-2)',
                display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer',
                transition: 'background 140ms',
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
                  zIndex: 50,
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
                <OptionRow
                  icon={isHidden ? 'eye' : 'eye-off'}
                  label={isHidden ? `Show on the live site` : `Hide from the live site`}
                  onClick={() => { setHidden(!isHidden); setOptionsOpen(false); }}
                  disabled={!canHide}
                />
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{section.desc}</div>

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
                  heading="Desktop nav"
                  sub="Shown at tablet width and up."
                />
                <LayoutPickerGroup
                  manifest={manifest}
                  onChange={onChange}
                  section="navMobile"
                  heading="Mobile drawer"
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
                <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', fontSize: 11.5, color: '#7A2D2D' }}>
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

function pearSuggestions(active: Exclude<SectionId, null>): string[] {
  switch (active) {
    case 'hero':
      return ['Rewrite tagline in 3 styles', 'Suggest a cover photo from gallery', 'Translate to Greek'];
    case 'story':
      return ['Write a draft from your story', 'Make it 30% shorter', 'Punch up the ending'];
    case 'rsvp':
      return ['Draft the reminder cadence', 'Add allergy field', 'Smart follow-up wording'];
    default:
      return ['Rewrite this section', 'Suggest a layout variant', 'Pick a complementary photo'];
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

/* ─── VariantTile + LayoutGlyph — handoff editor-redesign.jsx L725-739.
   A row-per-variant with a mini-diagram preview + label + check
   indicator when active. */

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
      <LayoutGlyph section={section} variant={variant.id} on={on} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{variant.label}</div>
        {variant.sub && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{variant.sub}</div>}
      </div>
      {on && <Icon name="check" size={14} color="var(--ink)" />}
    </button>
  );
}

function LayoutGlyph({ section, variant, on }: { section: Exclude<SectionId, null>; variant: string; on: boolean }) {
  const c = on ? 'var(--ink)' : 'var(--ink-muted)';
  const bg = on ? 'rgba(14,13,11,0.04)' : 'var(--cream-2)';
  const W = 44, H = 32;
  const wrap = { width: W, height: H, borderRadius: 4, background: bg, display: 'grid', placeItems: 'center', flexShrink: 0, padding: 3 } as const;
  /* Each section + variant gets a tiny SVG glyph that hints at the
     layout's structure. Falls through to a 3-bar block for any
     variant not specifically diagrammed. */
  if (section === 'hero') {
    if (variant === 'split') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <rect x="1" y="6" width="18" height="2" fill={c} />
            <rect x="1" y="10" width="14" height="2" fill={c} opacity={0.6} />
            <rect x="1" y="14" width="16" height="2" fill={c} opacity={0.6} />
            <rect x={W - 6 - 14} y="2" width="13" height={H - 10} rx="1" fill={c} opacity={0.4} />
          </svg>
        </div>
      );
    }
    if (variant === 'fullbleed') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <rect x="0" y="0" width={W - 6} height={H - 6} fill={c} opacity={0.4} />
            <rect x={(W - 6) / 2 - 8} y={(H - 6) / 2 - 1} width="16" height="2" fill="white" />
          </svg>
        </div>
      );
    }
    if (variant === 'typographic') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <rect x="2" y="4" width={W - 10} height="6" fill={c} />
            <rect x={(W - 6) / 2 - 1} y="12" width="2" height="2" fill={c} opacity={0.6} />
            <rect x="2" y="16" width={W - 10} height="6" fill={c} />
          </svg>
        </div>
      );
    }
    if (variant === 'minimal') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <rect x="2" y="6" width={(W - 10) * 0.65} height="4" fill={c} />
            <rect x="2" y="13" width={(W - 10) * 0.45} height="2" fill={c} opacity={0.6} />
            <rect x="2" y="17" width={(W - 10) * 0.5} height="2" fill={c} opacity={0.6} />
          </svg>
        </div>
      );
    }
    if (variant === 'postcard') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <rect x="3" y="3" width={W - 12} height={H - 12} rx="1.5" fill={c} opacity={0.3} stroke={c} strokeWidth="0.5" />
          </svg>
        </div>
      );
    }
    /* centered (default) */
    return (
      <div style={wrap}>
        <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
          <rect x="6" y="6" width={W - 18} height="3" fill={c} />
          <rect x="9" y="12" width={W - 24} height="2" fill={c} opacity={0.6} />
          <rect x="11" y="17" width={W - 28} height="2" fill={c} opacity={0.4} />
        </svg>
      </div>
    );
  }
  if (section === 'story') {
    if (variant === 'stacked') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <rect x="2" y="2" width={W - 10} height="10" fill={c} opacity={0.4} />
            <rect x="2" y="15" width={W - 10} height="2" fill={c} />
            <rect x="2" y="19" width={(W - 10) * 0.7} height="2" fill={c} opacity={0.6} />
          </svg>
        </div>
      );
    }
    if (variant === 'timeline') {
      return (
        <div style={wrap}>
          <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
            <line x1="5" y1="3" x2="5" y2={H - 9} stroke={c} strokeWidth="0.8" />
            <circle cx="5" cy="6" r="2" fill={c} />
            <circle cx="5" cy="14" r="2" fill={c} />
            <circle cx="5" cy="22" r="2" fill={c} opacity={0.5} />
          </svg>
        </div>
      );
    }
    /* sidebyside (default) */
    return (
      <div style={wrap}>
        <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
          <rect x="2" y="2" width="14" height={H - 10} fill={c} opacity={0.4} />
          <rect x="20" y="6" width={W - 28} height="2" fill={c} />
          <rect x="20" y="11" width={W - 28} height="2" fill={c} opacity={0.6} />
          <rect x="20" y="15" width={(W - 28) * 0.7} height="2" fill={c} opacity={0.6} />
        </svg>
      </div>
    );
  }
  /* Generic fallback — 3 stacked rows. */
  return (
    <div style={wrap}>
      <svg width={W - 6} height={H - 6} viewBox={`0 0 ${W - 6} ${H - 6}`}>
        <rect x="2" y="3" width={W - 10} height="4" fill={c} />
        <rect x="2" y="10" width={W - 10} height="4" fill={c} opacity={0.6} />
        <rect x="2" y="17" width={(W - 10) * 0.7} height="4" fill={c} opacity={0.6} />
      </svg>
    </div>
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
    /* Tool panels — host-only workspaces. Most need siteSlug to
       fetch live data (guest counts, broadcasts, OG card). */
    case 'guests':      return siteSlug ? <GuestsPanel siteSlug={siteSlug} /> : null;
    case 'savetheDate': return siteSlug ? <SaveTheDatePanel manifest={manifest} onChange={onChange} siteSlug={siteSlug} /> : null;
    case 'share':       return siteSlug ? <SharePanel manifest={manifest} siteSlug={siteSlug} /> : null;
    case 'dayof':       return siteSlug ? <DayOfPanel siteSlug={siteSlug} /> : null;
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
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--cream-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={icon} size={12} color={disabled ? 'var(--ink-muted)' : 'var(--ink-soft)'} />
      <span>{label}</span>
    </button>
  );
}
