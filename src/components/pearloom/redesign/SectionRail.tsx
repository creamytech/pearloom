'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L137-234 SectionRail. */

import { useRef, useState } from 'react';
import { Icon } from '../motifs';
import type { StoryManifest } from '@/types';
import { type SectionId, isToolPanelApplicable, isOptionalSectionApplicable } from './EditorRedesign';
import { SiteModeSection } from '../editor/panels/ThemePanel';

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
  { id: 'gallery',  label: 'Gallery',   icon: 'image',      desc: '38 photos' },
  { id: 'rsvp',     label: 'RSVP',      icon: 'mail',       required: true, desc: '47 yes · 63 pending' },
  { id: 'faq',      label: 'FAQ',       icon: 'sparkles',   desc: '6 questions answered' },
];

/* Optional sections — not in the default site, added via the
   Add section button. Each is occasion-gated by
   isOptionalSectionApplicable. Once a host adds one, the section
   id lives in manifest.blockOrder and the rail renders it
   alongside the core sections. */
const OPTIONAL_SECTIONS: SectionDef[] = [
  { id: 'countdown', label: 'Countdown', icon: 'clock',    desc: 'Stat tiles · stripe · minimal · hero' },
  { id: 'map',       label: 'Map',       icon: 'map',      desc: 'Live embed · pin · static' },
  { id: 'music',     label: 'Music',     icon: 'music',    desc: 'Spotify · Apple · YouTube' },
];

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
  const applicableTools = TOOLS.filter((t) => isToolPanelApplicable(t.id, occasion));

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
    return valid;
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
    .filter((s) => isOptionalSectionApplicable(s.id as 'countdown' | 'map' | 'music', occasion))
    .filter((s) => !restOrder.includes(s.id as string));

  /* Add an optional section to the manifest order + flip active
     to it so the host immediately lands in its config panel. */
  function addOptionalSection(id: Exclude<SectionId, null>) {
    if (!onChange) return;
    const next = [...restOrder.filter((k) => k !== id), id as string];
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      blockOrder: next,
    } as unknown as StoryManifest);
    setActive(id);
    setPickerOpen(false);
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
        gridArea: 'left',
        background: 'var(--cream-2)',
        borderRight: '1px solid var(--line-soft)',
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
          return (
            <div key={s.id} style={{ position: 'relative' }}>
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
                transition: 'background 100ms, opacity 140ms, transform 140ms',
                userSelect: 'none',
              }}
            >
              <span aria-hidden style={{ opacity: on ? 0.5 : 0.3, display: 'inline-flex' }}>
                <GripDots color={on ? 'var(--cream)' : 'var(--ink-muted)'} />
              </span>
              <Icon name={s.icon} size={13} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div>
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
                  {s.desc}
                </div>
              </div>
              {s.required && (
                <Icon name="lock" size={10} color={on ? 'var(--cream)' : 'var(--ink-muted)'} />
              )}
            </div>
            </div>
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
            onClick={() => setPickerOpen((v) => !v)}
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

        {pickerOpen && availableOptional.length > 0 && (
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
                onClick={() => addOptionalSection(s.id)}
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
        )}
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
        boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
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
