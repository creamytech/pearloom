'use client';

/* eslint-disable no-restricted-syntax -- panel BODY, not chrome: like every
   sibling panel it renders inside the .pl8 scope on the handoff tokens. */
/* =========================================================================
   PEARLOOM — GUESTBOOK PANEL (SEL.3: no dead presses)
   Mounted by PropertyRail's renderSectionEditor for `guestbook`. The
   guestbook strip on the canvas used to render outside any TSection —
   pressing it did nothing at all. Now it selects like any section and
   this panel offers the one control it has (the feature toggle) plus
   the doors to where its content lives.
   ========================================================================= */

import Link from 'next/link';
import type { StoryManifest } from '@/types';
import { FToggleStandalone, SectionPanelShell } from './_section-atoms';
import { Icon } from '../../motifs';

export function GuestbookPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const loose = manifest as unknown as { features?: { guestbook?: boolean } };
  const on = loose.features?.guestbook ?? false;
  const setOn = (next: boolean) => {
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      features: { ...(loose.features ?? {}), guestbook: next },
    } as unknown as StoryManifest);
  };
  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FToggleStandalone
          label="Guestbook on the site"
          sub={on ? 'Guests can sign between the last section and the footer' : 'Off — the wall stays hidden'}
          def={on}
          onChange={setOn}
        />
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Signatures your guests leave gather here and in the memory book. You can hide any
          entry from the moderation page.
        </div>
        <Link
          href="/dashboard/submissions"
          className="btn btn-outline btn-sm"
          style={{ justifyContent: 'center', textDecoration: 'none' }}
        >
          <Icon name="eye" size={12} /> Review what guests wrote
        </Link>
      </div>
    </SectionPanelShell>
  );
}
