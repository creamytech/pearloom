'use client';

/* Group chat section — the link-out to where the group already
   talks (2026-07-02; the last promised-but-missing block from the
   EVENT_TYPES registry).

   Data: manifest.bachelor.groupChatUrl — the SAME field the
   Weekend planner tool (BachelorPanel) writes; GroupChatPanel
   (editor/panels/blocks/GroupChatPanel.tsx) is the thin editor
   over it. A copy override (manifest.copy.groupChatNote) carries
   the host's one-line invitation.

   LINK OUT, NEVER EMBED (livestream is the template for the
   rationale): group threads live in WhatsApp / Signal / GroupMe —
   embedding one would mean an auth surface we don't own and a
   privacy contract we can't keep. The card names the platform
   typographically (no third-party logos) and opens the app.

   Variants (layouts.ts): card — the only layout. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

/** Platform name from the invite URL — typographic presence only,
 *  never a logo. Exported for the unit test. */
export function chatPlatformFor(url: string): string {
  const u = (url ?? '').toLowerCase();
  if (u.includes('chat.whatsapp.com') || u.includes('wa.me')) return 'WhatsApp';
  if (u.includes('signal.group') || u.includes('signal.me')) return 'Signal';
  if (u.includes('groupme.com')) return 'GroupMe';
  if (u.includes('discord.gg') || u.includes('discord.com')) return 'Discord';
  if (u.includes('t.me') || u.includes('telegram.')) return 'Telegram';
  if (u.includes('m.me') || u.includes('messenger.com')) return 'Messenger';
  if (u.includes('imessage') || u.startsWith('sms:')) return 'Messages';
  return 'the group thread';
}

export function readGroupChatUrl(manifest: BlockSectionProps['manifest']): string {
  const loose = manifest as unknown as { bachelor?: { groupChatUrl?: string } };
  return (loose.bachelor?.groupChatUrl ?? '').trim();
}

export function GroupChatSection({ manifest, pad, editable, onEditCopy }: BlockSectionProps) {
  const url = readGroupChatUrl(manifest);
  const empty = !url;
  if (empty && !editable) return null;

  const platform = chatPlatformFor(url);
  const named = platform !== 'the group thread';
  const note = blockCopy(
    manifest,
    'groupChatNote',
    'Plans, rides, and the running joke — it all happens in the thread.',
  );

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'groupChatEyebrow', 'The group thread')}
        title={blockCopy(manifest, 'groupChatTitle', 'One thread for the whole crew')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('groupChatEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('groupChatTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Paste the invite link in the Group chat panel — WhatsApp, Signal, GroupMe, wherever the crew already talks." />
      ) : (
        <div
          style={{
            maxWidth: 440,
            margin: '0 auto',
            padding: 'clamp(24px, 4vw, 34px) clamp(18px, 4vw, 30px)',
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 14px)',
            textAlign: 'center',
          }}
        >
          {named && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--t-ink-muted)',
                marginBottom: 6,
              }}
            >
              Lives on
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--t-display)',
              fontStyle: 'italic',
              fontWeight: 'var(--t-display-wght)' as never,
              fontSize: 26,
              lineHeight: 1.15,
              color: 'var(--t-ink)',
            }}
          >
            {platform}
          </div>
          <p style={{ margin: '10px auto 0', maxWidth: 320, fontSize: 13, lineHeight: 1.6, color: 'var(--t-ink-soft)' }}>
            {note}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="pl-hit44"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
              padding: '11px 22px',
              borderRadius: 999,
              background: 'var(--t-accent)',
              color: 'var(--t-accent-ink, var(--t-paper))',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Join the thread
          </a>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t-ink-muted)' }}>
            Opens in the app — the thread stays private to the invite link.
          </div>
        </div>
      )}
    </BlockFrame>
  );
}
