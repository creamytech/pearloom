'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L137-234 SectionRail. */

import { useState } from 'react';
import { Icon } from '../motifs';
import type { StoryManifest } from '@/types';
import { type SectionId, isToolPanelApplicable } from './EditorRedesign';
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

/* Tool panels — surface in the rail below the canvas sections.
   These aren't sections on the published site; they're host-only
   tools that mount via PropertyRail's dispatch. Each one is
   gated by isToolPanelApplicable(occasion). */
const TOOLS: SectionDef[] = [
  { id: 'guests',      label: 'Guests',           icon: 'user',       desc: 'Your guest list' },
  { id: 'savetheDate', label: 'Save the date',    icon: 'calendar',   desc: 'Pre-invite teaser' },
  { id: 'share',       label: 'Share',            icon: 'link',       desc: 'Link, QR, preview' },
  { id: 'dayof',       label: 'Day-of',           icon: 'sparkles',   desc: 'Live broadcasts' },
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
  const [reorderingIdx, setReorderingIdx] = useState<number | null>(null);
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const applicableTools = TOOLS.filter((t) => isToolPanelApplicable(t.id, occasion));

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

      {/* Section list — prototype L190-222. */}
      {tab === 'sections' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SECTIONS.map((s, i) => {
          const on = s.id === active;
          return (
            <div
              key={s.id}
              draggable
              onDragStart={() => setReorderingIdx(i)}
              onDragEnd={() => setReorderingIdx(null)}
              onClick={() => setActive(s.id)}
              className="pl-rd-section-row"
              data-active={on}
              data-dragging={reorderingIdx === i}
              style={{
                display: 'grid',
                gridTemplateColumns: '12px 22px 1fr 14px',
                gap: 8,
                alignItems: 'center',
                padding: '8px 10px',
                borderRadius: 8,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                cursor: 'pointer',
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
          );
        })}

        {/* "Add section" — prototype L223-230. */}
        <button
          type="button"
          className="pl-rd-add-section"
          style={{
            marginTop: 4,
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 11.5,
            color: 'var(--ink-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px dashed var(--line)',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="plus" size={11} color="var(--ink-muted)" /> Add section
        </button>
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
