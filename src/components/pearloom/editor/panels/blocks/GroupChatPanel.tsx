'use client';

/* eslint-disable no-restricted-syntax */
/* GroupChatPanel — Content tab for the Group chat section. THIN
   editor over manifest.bachelor.groupChatUrl — the SAME field the
   Weekend planner tool (BachelorPanel "Group chat" field) owns.
   Edits here show up there and vice versa. The section is a
   link-out card (never an embed); the note rides the copy
   override (manifest.copy.groupChatNote). */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from '../_section-atoms';
import { isBachelorOccasion, readOccasion, ToolPointerCard, type BlockPanelProps } from './_shared';
import { chatPlatformFor } from '../../../redesign/section-variants/blocks/group-chat';

export function GroupChatPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'groupChat');
  const loose = manifest as unknown as { bachelor?: { groupChatUrl?: string } & Record<string, unknown> };
  const url = loose.bachelor?.groupChatUrl ?? '';
  const [note, setNote] = useCopyOverride(manifest, onChange, 'groupChatNote');

  const setUrl = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    bachelor: { ...(loose.bachelor ?? {}), groupChatUrl: v },
  } as unknown as StoryManifest);

  const platform = url.trim() ? chatPlatformFor(url) : null;

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label="Invite link"
          hint="The group's invite URL, WhatsApp, Signal, GroupMe, Discord, Telegram. Guests tap through; nothing embeds on the site."
        >
          <FInput
            value={url}
            onChange={setUrl}
            type="url"
            icon="link"
            placeholder="https://chat.whatsapp.com/…"
          />
          {platform && platform !== 'the group thread' && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-muted)' }}>
              Reads as a {platform} thread on the site.
            </div>
          )}
        </FGroup>

        <FGroup label="A line under the thread" hint="Optional, what happens in there.">
          <FInput
            value={note}
            onChange={setNote}
            placeholder="Plans, rides, and the running joke."
          />
        </FGroup>

        {isBachelorOccasion(readOccasion(manifest)) && (
          <ToolPointerCard
            toolId="bachelor"
            label="Also in the Weekend planner"
            body="Costs, polls, packing, and rooms live there, same group-chat link, one store."
          />
        )}

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Group chat" />
      </div>
    </SectionPanelShell>
  );
}

export default GroupChatPanel;
