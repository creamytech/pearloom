'use client';

/* eslint-disable no-restricted-syntax */
/* BachelorPanel — the Weekend planner LAUNCHPAD for bachelor/ette
   weekends (and reunions, friend trips, anything multi-day-
   friends-only).

   EDITOR-CALM-PLAN E.2 (one home per decision): this panel no
   longer edits anything. Its five editing groups (costs, polls,
   packing, rooms, group chat) duplicated the block panels that own
   those sections' data — blocks/CostSplitterPanel,
   ActivityVotePanel, PackingListPanel, RoomsPanel, GroupChatPanel,
   all writing manifest.bachelor.*. Sections own their data; this
   workspace is a launchpad: a glance at each area's state + one
   door per area that SELECTS the section in the editor (the same
   pearloom:design-jump event the deleted pointer-card apology
   used, in the other direction). */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { SectionPanelShell } from './_section-atoms';

interface BachelorData {
  costs?: Array<{ amount?: string }>;
  votes?: unknown[];
  packing?: unknown[];
  rooms?: unknown[];
  groupChatUrl?: string;
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

export function BachelorPanel({ manifest }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const data: BachelorData = ((manifest as unknown as { bachelor?: BachelorData }).bachelor) ?? {};
  const costs = data.costs ?? [];
  const votes = data.votes ?? [];
  const packing = data.packing ?? [];
  const rooms = data.rooms ?? [];
  const totalCost = costs.reduce((sum, c) => sum + (parseFloat((c.amount ?? '').replace(/[^\d.]/g, '')) || 0), 0);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ padding: 12, borderRadius: 10, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.18)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--peach-ink)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Weekend planner
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            The weekend at a glance. Each part is edited in its own section — open one below.
          </div>
        </div>

        <SectionDoorRow
          sectionId="costSplitter"
          label="Cost splitter"
          state={costs.length > 0 ? `${costs.length} cost${costs.length === 1 ? '' : 's'} · $${totalCost.toFixed(0)} total` : 'No costs yet'}
        />
        <SectionDoorRow
          sectionId="activityVote"
          label="Group votes"
          state={votes.length > 0 ? `${votes.length} poll${votes.length === 1 ? '' : 's'}` : 'No polls yet'}
        />
        <SectionDoorRow
          sectionId="packingList"
          label="Packing list"
          state={packing.length > 0 ? `${packing.length} item${packing.length === 1 ? '' : 's'}` : 'Nothing listed yet'}
        />
        <SectionDoorRow
          sectionId="rooms"
          label="Rooms"
          state={rooms.length > 0 ? `${rooms.length} room${rooms.length === 1 ? '' : 's'}` : 'No rooms yet'}
        />
        <SectionDoorRow
          sectionId="groupChat"
          label="Group chat"
          state={(data.groupChatUrl ?? '').trim() ? 'Link set' : 'No link yet'}
        />
      </div>
    </SectionPanelShell>
  );
}

export default BachelorPanel;
