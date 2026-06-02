'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L668-793 PropertyRail.

   Single dedicated section-edit surface — no top-level tab strip.
   Eyebrow + title + hide/more icons + Content/Layout/Style sub-tabs +
   body (SectionEditor + Pear assist card). */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '../motifs';
import type { SectionId } from './EditorRedesign';
import { HeroPanel } from '../editor/panels/HeroPanel';
import { StoryPanel } from '../editor/panels/StoryPanel';
import { DetailsPanel } from '../editor/panels/DetailsPanel';
import { SchedulePanel } from '../editor/panels/SchedulePanel';
import { TravelPanel } from '../editor/panels/TravelPanel';
import { RegistryPanel } from '../editor/panels/RegistryPanel';
import { GalleryPanel } from '../editor/panels/GalleryPanel';
import { RsvpPanel } from '../editor/panels/RsvpPanel';
import { FaqPanel } from '../editor/panels/FaqPanel';

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
};

interface Props {
  active: Exclude<SectionId, null>;
  setActive: (id: SectionId) => void;
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
}

export function PropertyRail({ active, setActive, manifest, onChange }: Props) {
  const section = SECTIONS[active];
  const [tab, setTab] = useState<'content' | 'layout' | 'style'>('content');

  return (
    <aside
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
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              title="Hide section"
              style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' }}
            >
              <Icon name="eye-off" size={13} color="var(--ink-soft)" />
            </button>
            <button
              type="button"
              title="Section options"
              style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--cream-2)', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer' }}
            >
              <Icon name="more" size={13} color="var(--ink-soft)" />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{section.desc}</div>

        {/* Tabs — Content / Layout / Style. Prototype L696-715. */}
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
      </div>

      {/* Body — prototype L718-790. */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {tab === 'content' && renderSectionEditor(active, manifest, onChange)}

        {tab === 'layout' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              {section.label} layout
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              This section has one refined layout in every theme. Try a different theme pack
              for a fresh treatment.
            </div>
          </div>
        )}

        {tab === 'style' && (
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
        {tab === 'content' && (
          <div style={{ padding: 14, background: 'var(--peach-bg)', borderRadius: 12, marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Pear size={22} tone="sage" sparkle shadow={false} />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)' }}>
                Pear can help
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pearSuggestions(active).map((s, i) => (
                <button
                  key={i}
                  type="button"
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
                    cursor: 'pointer',
                  }}
                >
                  <span>{s}</span>
                  <Icon name="arrow-right" size={11} color="var(--peach-ink)" />
                </button>
              ))}
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

function renderSectionEditor(
  active: Exclude<SectionId, null>,
  manifest: StoryManifest,
  onChange: (m: StoryManifest) => void,
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
    case 'rsvp':     return <RsvpPanel {...props} />;
    case 'faq':      return <FaqPanel {...props} />;
    default:         return null;
  }
}
