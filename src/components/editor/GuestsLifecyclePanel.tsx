'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/GuestsLifecyclePanel.tsx
//
// One panel, four stages. Collapses the old separate rail tabs
// (Guests / Invite / Save the Date / Seating) into a single
// lifecycle flow so the user sees their progress through the
// guest arc instead of four disconnected inspectors.
//
//   List → Invite → Seat → Save the date
//
// FullscreenEditor still accepts the legacy activeTab values
// (guests / invite / savethedate / seating) as deep-link
// synonyms — each maps to the matching stage here.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Users, Mail, LayoutGrid, Heart } from 'lucide-react';
import { GuestSearchPanel } from './GuestSearchPanel';
import { BulkInvitePanel } from './BulkInvitePanel';
import { SaveTheDatePanel } from './SaveTheDatePanel';
import { SeatingEditorPanel } from './SeatingEditorPanel';
import { InviteDesignerPanel } from './InviteDesignerPanel';
import type { StoryManifest } from '@/types';
import { useEditor, type EditorTab } from '@/lib/editor-state';
import { panelText, panelTracking, panelWeight, panelLineHeight } from './panel';

export type GuestsStage = 'list' | 'invite' | 'seat' | 'std';

const STAGE_FOR_TAB: Partial<Record<EditorTab, GuestsStage>> = {
  guests: 'list',
  invite: 'invite',
  seating: 'seat',
  savethedate: 'std',
};

const TAB_FOR_STAGE: Record<GuestsStage, EditorTab> = {
  list: 'guests',
  invite: 'invite',
  seat: 'seating',
  std: 'savethedate',
};

interface Stage {
  id: GuestsStage;
  label: string;
  eyebrow: string;
  Icon: React.ElementType;
}

const STAGES: Stage[] = [
  { id: 'list',   label: 'Guest list',    eyebrow: 'Stage 1', Icon: Users },
  { id: 'invite', label: 'Send invites',  eyebrow: 'Stage 2', Icon: Mail },
  { id: 'seat',   label: 'Seating',       eyebrow: 'Stage 3', Icon: LayoutGrid },
  { id: 'std',    label: 'Save the date', eyebrow: 'Bonus',   Icon: Heart },
];

interface Props {
  manifest: StoryManifest;
  subdomain: string;
}

export function GuestsLifecyclePanel({ manifest, subdomain }: Props) {
  const { state, actions } = useEditor();
  const stage: GuestsStage = useMemo(
    () => STAGE_FOR_TAB[state.activeTab] ?? 'list',
    [state.activeTab],
  );

  const pickStage = (next: GuestsStage) => {
    // Drive the underlying tab state so deep-links stay honest
    // and keyboard shortcuts / browser-back still target the
    // correct rail entry.
    actions.handleTabChange(TAB_FOR_STAGE[next]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      {/* Stage stepper */}
      <div
        role="tablist"
        aria-label="Guest lifecycle"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          padding: '0 8px 10px',
          borderBottom: '1px solid var(--pl-divider, #E4E4E7)',
        }}
      >
        {STAGES.map((s) => {
          const on = s.id === stage;
          const Icon = s.Icon;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={on}
              onClick={() => pickStage(s.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 6px',
                borderRadius: 'var(--pl-radius-md)',
                border: on ? '1px solid var(--pl-ink, #18181B)' : '1px solid var(--pl-divider, #E4E4E7)',
                background: on ? 'var(--pl-ink, #18181B)' : '#FFFFFF',
                color: on ? 'var(--pl-cream, #FAF7F2)' : '#71717A',
                cursor: 'pointer',
                transition: 'all var(--pl-dur-instant)',
              }}
            >
              <Icon size={14} strokeWidth={on ? 2.2 : 1.7} />
              <span
                style={{
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                  fontSize: '0.52rem',
                  letterSpacing: panelTracking.wider,
                  textTransform: 'uppercase',
                  opacity: 0.8,
                  lineHeight: 1,
                }}
              >
                {s.eyebrow}
              </span>
              <span
                style={{
                  fontSize: panelText.hint,
                  fontWeight: panelWeight.semibold,
                  lineHeight: panelLineHeight.tight,
                  textAlign: 'center',
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active stage content */}
      <div>
        {stage === 'list' && <GuestSearchPanel siteId={subdomain} />}
        {stage === 'invite' && (
          <>
            <InviteDesignerPanel manifest={manifest} subdomain={subdomain} />
            <BulkInvitePanel manifest={manifest} siteId={subdomain} subdomain={subdomain} />
          </>
        )}
        {stage === 'seat' && <SeatingEditorPanel siteId={subdomain} />}
        {stage === 'std' && (
          <>
            <InviteDesignerPanel manifest={manifest} subdomain={subdomain} />
            <SaveTheDatePanel manifest={manifest} subdomain={subdomain} />
          </>
        )}
      </div>
    </div>
  );
}
