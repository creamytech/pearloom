'use client';

/* eslint-disable no-restricted-syntax -- panel BODY, not chrome: like every
   sibling panel it renders inside the .pl8 scope on the handoff tokens. */
/* =========================================================================
   PEARLOOM — FOOTER PANEL (SEL.2: the footer exists)
   Mounted by PropertyRail's renderSectionEditor for `footer`. Before
   this, the footer wasn't selectable at all — its three treatments
   lived only in the Design tab's FooterPick.

   Writes manifest.layouts.footer; the renderer (and the canvas chip)
   read layouts.footer with a legacy manifest.footerVariant fallback
   (readVariant), so pre-SEL.2 picks keep rendering unchanged.
   ========================================================================= */

import type { StoryManifest } from '@/types';
import { LAYOUTS, readVariant } from '../../redesign/layouts';
import { FGroup, SectionPanelShell } from './_section-atoms';

const FOOTER_OPTIONS = LAYOUTS.footer ?? [];

export function FooterPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const layouts = ((manifest as unknown as { layouts?: Record<string, string> }).layouts) ?? {};
  const value = readVariant(manifest, 'footer');
  const set = (id: string) => {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      layouts: { ...layouts, footer: id },
    } as unknown as StoryManifest);
  };
  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Footer style" hint="How your site signs off at the bottom of every page.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 7 }}>
            {FOOTER_OPTIONS.map((f) => {
              const on = value === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set(f.id)}
                  className="lift"
                  style={{
                    textAlign: 'left', padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                    background: on ? 'var(--ink)' : 'var(--card)',
                    border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: on ? 'var(--cream)' : 'var(--ink)' }}>{f.label}</div>
                  {f.sub && (
                    <div style={{ fontSize: 9.5, lineHeight: 1.3, color: on ? 'rgba(248,241,228,0.72)' : 'var(--ink-muted)', marginTop: 1 }}>{f.sub}</div>
                  )}
                </button>
              );
            })}
          </div>
        </FGroup>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          The footer carries your names, date, and place from the Opening section — edit those
          there and the sign-off follows.
        </div>
      </div>
    </SectionPanelShell>
  );
}
