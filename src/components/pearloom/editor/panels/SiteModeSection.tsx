'use client';

// ─────────────────────────────────────────────────────────────
// SiteModeSection — scroll vs multi-page picker + home-block
// checklist. Extracted from the legacy ThemePanel.tsx (deleted
// in the 2026-06-10 editor cleanup) because the redesign editor's
// SectionRail still mounts this one section.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import { DEFAULT_HOME_BLOCKS, type SiteMode } from '@/lib/site-mode';
import { Field, PanelSection, SegmentedToggle } from '../atoms';

// ── SiteModeSection ────────────────────────────────────────
// Toggles between scroll mode (every section on the home page,
// the default) and multi-page mode (home page renders only
// homePageBlocks plus details; every other section gets its own
// route at /{occasion}/{slug}/{block}).
//
// In multi-page mode, the host picks which sections live on the
// home page from a checklist. Hero is always on home; details is
// always implicitly on home. Everything else is opt-in.
const HOME_BLOCK_OPTIONS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'story', label: 'Story', hint: 'How you got here' },
  { key: 'schedule', label: 'Schedule', hint: 'The flow of the day' },
  { key: 'travel', label: 'Travel', hint: 'Map + hotels' },
  { key: 'registry', label: 'Registry', hint: 'Gift links' },
  { key: 'gallery', label: 'Gallery', hint: 'Bento mosaic' },
  { key: 'faq', label: 'FAQ', hint: 'Q&A' },
  { key: 'rsvp', label: 'RSVP', hint: 'Reply form' },
];

export function SiteModeSection({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const m = manifest as unknown as {
    siteMode?: SiteMode;
    homePageBlocks?: string[];
  };
  const mode: SiteMode = m.siteMode === 'multi-page' ? 'multi-page' : 'scroll';
  const homeBlocks: string[] = Array.isArray(m.homePageBlocks) && m.homePageBlocks.length
    ? m.homePageBlocks
    : DEFAULT_HOME_BLOCKS;

  function setMode(next: SiteMode) {
    onChange({ ...manifest, siteMode: next } as unknown as StoryManifest);
  }
  function toggleHomeBlock(key: string) {
    const set = new Set(homeBlocks);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    const next = HOME_BLOCK_OPTIONS.map((o) => o.key).filter((k) => set.has(k));
    onChange({ ...manifest, homePageBlocks: next } as unknown as StoryManifest);
  }

  return (
    <PanelSection
      label="Layout mode"
      hint="One page keeps every section on the home page. Separate pages gives each section its own page with a menu."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Mode">
          <SegmentedToggle<string>
            value={mode}
            onChange={(v) => setMode(v === 'multi-page' ? 'multi-page' : 'scroll')}
            options={[
              { value: 'scroll', label: 'Single scroll' },
              { value: 'multi-page', label: 'Separate pages' },
            ]}
          />
        </Field>
        <div style={{ fontSize: 11.5, color: 'var(--pl-chrome-text-muted)', lineHeight: 1.5 }}>
          {mode === 'scroll' ? (
            <>Every block lives on one long, scrollable home page. Nav links scroll to anchors.</>
          ) : (
            <>Home page renders only the selected blocks below. Every other section becomes its own route, guests click <em>Travel</em> in the nav and land on a focused page.</>
          )}
        </div>

        {mode === 'multi-page' && (
          <Field label="Keep on home">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {HOME_BLOCK_OPTIONS.map((o) => {
                const on = homeBlocks.includes(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleHomeBlock(o.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: on ? '1.5px solid var(--pl-chrome-text)' : '1.5px solid var(--pl-chrome-border)',
                      background: on ? 'var(--cream-2)' : 'var(--pl-chrome-surface)',
                      color: 'var(--pl-chrome-text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-ui)',
                      transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: on ? 'var(--peach-ink, #C6703D)' : 'transparent',
                          border: on ? 'none' : '1.5px solid var(--pl-chrome-border)',
                        }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-chrome-text)' }}>{o.label}</span>
                    </span>
                    <div style={{ fontSize: 10.5, color: 'var(--pl-chrome-text-muted)', marginTop: 2, marginLeft: 18 }}>
                      {o.hint}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        {mode === 'multi-page' && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--cream-2)',
              border: '1px dashed var(--pl-chrome-border)',
              fontSize: 11,
              color: 'var(--pl-chrome-text-muted)',
              lineHeight: 1.5,
            }}
          >
            Tip, leave Story or Gallery on home so the page still feels editorial. <em>Details</em> is always on home (it&rsquo;s a thin summary strip, not a destination).
          </div>
        )}
      </div>
    </PanelSection>
  );
}
