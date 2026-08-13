'use client';

/* eslint-disable no-restricted-syntax */
/* MemorialPanel — the memorial LAUNCHPAD. Mounts as the 'memorial'
   tool in the editor rail, visible only when manifest.occasion is
   'memorial' or 'funeral'.

   EDITOR-CALM-PLAN E.2 (one home per decision): this panel no
   longer edits anything. Its three editing groups (obituary, order
   of service, tribute wall) duplicated the block panels that own
   those sections' data — blocks/ObituaryPanel + ProgramPanel
   (manifest.memorial.*) and blocks/TributeWallPanel
   (manifest.tributeWall, with a legacy read-time fallback to
   manifest.memorial.tributePrompt / tributeWallOpen). Sections own
   their data; this workspace is a launchpad: a glance at each
   area's state + one door per area that SELECTS the section in the
   editor (the same pearloom:design-jump event the deleted
   pointer-card apology used, in the other direction). */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { SectionPanelShell } from './_section-atoms';

interface MemorialData {
  obituary?: { dates?: string; body?: string };
  program?: unknown[];
  tributePrompt?: string;
  tributeWallOpen?: boolean;
}

/* One door row — selects the target section in the editor via the
   same design-jump event PublishChecklist and the topbar use, so
   the PropertyRail flips to that section's ONE panel home. */
function SectionDoorRow({ sectionId, label, state }: { sectionId: string; label: string; state: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: sectionId } }));
      }}
      className="lift"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 13px', borderRadius: 11, width: '100%',
        background: 'var(--card)', border: '1px solid var(--line)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)', marginTop: 1, lineHeight: 1.4 }}>{state}</span>
      </span>
      <Icon name="arrow-right" size={13} color="var(--ink-soft)" />
    </button>
  );
}

export function MemorialPanel({ manifest }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const loose = manifest as unknown as {
    memorial?: MemorialData;
    tributeWall?: { composerOpen?: boolean };
  };
  const data: MemorialData = loose.memorial ?? {};
  const obituaryWritten = !!(data.obituary?.body ?? '').trim();
  const program = data.program ?? [];
  /* Same fallback chain the canvas + TributeWallPanel read. */
  const tributeOpen = loose.tributeWall?.composerOpen ?? data.tributeWallOpen ?? true;

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header explanation */}
        <div style={{ padding: 12, borderRadius: 10, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Memorial workspace
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            The memorial at a glance. The obituary, the order of service, and the tribute wall are each edited in their own section — open one below.
          </div>
        </div>

        <SectionDoorRow
          sectionId="obituary"
          label="Obituary"
          state={obituaryWritten ? 'Written · open to read or edit' : 'Not written yet'}
        />
        <SectionDoorRow
          sectionId="program"
          label="Order of service"
          state={program.length > 0 ? `${program.length} moment${program.length === 1 ? '' : 's'}` : 'No moments yet'}
        />
        <SectionDoorRow
          sectionId="tributeWall"
          label="Tribute wall"
          state={tributeOpen ? 'Open — guests can write, you approve' : 'Closed to new tributes'}
        />
      </div>
    </SectionPanelShell>
  );
}

export default MemorialPanel;
