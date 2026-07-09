'use client';

/* eslint-disable no-restricted-syntax -- panel BODY, not chrome: like every
   sibling panel it renders inside the .pl8 scope on the handoff tokens. */
/* =========================================================================
   PEARLOOM — NAV PANEL (SEL.1: pressing the menu gets the menu)
   Mounted by PropertyRail's renderSectionEditor for `nav`. Before this
   panel, selecting the nav bar on the canvas routed to `default → null`:
   a gold frame, a bare header, and nothing to change — while the menu's
   layout options hid in the Design tab's "Menu & footer" group.

   Both variant rows write manifest.layouts.nav / .navMobile — the exact
   fields NavPick (ThemePickerBody) writes, so the two homes can't fork.
   Options come from the LAYOUTS registry, never a local copy.
   ========================================================================= */

import type { StoryManifest } from '@/types';
import { LAYOUTS, readVariant } from '../../redesign/layouts';
import { FGroup, SectionPanelShell } from './_section-atoms';

const NAV_DESKTOP = LAYOUTS.nav ?? [];
const NAV_PHONE = LAYOUTS.navMobile ?? [];

function VariantChipRow({
  options,
  value,
  onPick,
}: {
  options: ReadonlyArray<{ id: string; label: string; sub?: string }>;
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            title={o.sub ? `${o.label}, ${o.sub}` : o.label}
            onClick={() => onPick(o.id)}
            className="lift"
            style={{
              padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
              border: on ? '1px solid var(--ink)' : '1px solid var(--line)',
              background: on ? 'var(--ink)' : 'var(--card)', color: on ? 'var(--cream)' : 'var(--ink-soft)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function NavPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const layouts = ((manifest as unknown as { layouts?: Record<string, string> }).layouts) ?? {};
  const desktop = readVariant(manifest, 'nav');
  const phone = readVariant(manifest, 'navMobile');
  const set = (key: 'nav' | 'navMobile') => (id: string) => {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      layouts: { ...layouts, [key]: id },
    } as unknown as StoryManifest);
  };
  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Menu, desktop" hint="How the menu sits across the top on larger screens.">
          <VariantChipRow options={NAV_DESKTOP} value={desktop} onPick={set('nav')} />
        </FGroup>
        <FGroup label="Menu, phone" hint="How the menu opens on phones.">
          <VariantChipRow options={NAV_PHONE} value={phone} onPick={set('navMobile')} />
        </FGroup>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          The menu&rsquo;s name comes from your names in the Opening section, and its links follow
          the sections on your site. Colors and type ride the site&rsquo;s look in the Design tab.
        </div>
      </div>
    </SectionPanelShell>
  );
}
