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
import { LAYOUTS, readVariant, recommendedVariantFor } from '../../redesign/layouts';
import { VariantThumb } from '../../redesign/variant-thumb';
import { FGroup, SectionPanelShell } from './_section-atoms';

const NAV_DESKTOP = LAYOUTS.nav ?? [];
const NAV_PHONE = LAYOUTS.navMobile ?? [];

function VariantThumbRow({
  section,
  options,
  value,
  recommended,
  onPick,
}: {
  section: string;
  options: ReadonlyArray<{ id: string; label: string; sub?: string }>;
  value: string;
  recommended?: string;
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {options.map((o) => {
        const on = value === o.id;
        const rec = o.id === recommended;
        return (
          <button
            key={o.id}
            type="button"
            title={rec ? `${o.label} · Recommended for this occasion` : (o.sub ? `${o.label}, ${o.sub}` : o.label)}
            onClick={() => onPick(o.id)}
            className="lift"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '8px 4px', borderRadius: 9, cursor: 'pointer',
              border: on ? '1.5px solid var(--pl-olive, #5C6B3F)' : '1px solid var(--line)',
              background: on ? 'var(--sage-tint)' : 'var(--card)',
            }}
          >
            <VariantThumb section={section} variant={o.id} size="chip" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, lineHeight: 1.15, color: 'var(--ink-soft)', textAlign: 'center' }}>
              {o.label}
              {rec && <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)', flexShrink: 0 }} />}
            </span>
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
  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Menu, desktop" hint="How the menu sits across the top on larger screens.">
          <VariantThumbRow section="nav" options={NAV_DESKTOP} value={desktop} recommended={recommendedVariantFor('nav', occasion)} onPick={set('nav')} />
        </FGroup>
        <FGroup label="Menu, phone" hint="How the menu opens on phones.">
          <VariantThumbRow section="navMobile" options={NAV_PHONE} value={phone} recommended={recommendedVariantFor('navMobile', occasion)} onPick={set('navMobile')} />
        </FGroup>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          The menu&rsquo;s name comes from your names in the Opening section, and its links follow
          the sections on your site. Colors and type ride the site&rsquo;s look in the Design tab.
        </div>
      </div>
    </SectionPanelShell>
  );
}
