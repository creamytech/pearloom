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

   Variants (layouts.ts):
     card  — a centered pedestal: platform name in display type +
             a Join pill.
     panel — a chat-window frame: a header row (platform + a cluster
             of "who's here" avatar dots), the host's note pinned as
             a message bubble, and the Join CTA styled as the app's
             message bar. Still a LINK-OUT — the bubbles are ornament,
             never real (embedded) messages. */

import type { CSSProperties } from 'react';
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

/** Join CTA — shared pill; the panel restyles it as a message bar. */
function JoinPill({ url, style, children = 'Join the thread' }: { url: string; style?: CSSProperties; children?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="pl-hit44"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 22px',
        borderRadius: 999,
        background: 'var(--t-accent)',
        color: 'var(--t-accent-ink, var(--t-paper))',
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </a>
  );
}

const PRIVACY_NOTE = 'Opens in the app — the thread stays private to the invite link.';

/* ─── card — centered pedestal ───────────────────────────────── */

function GroupChatCard({ platform, named, note, url }: { platform: string; named: boolean; note: string; url: string }) {
  return (
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
        <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', marginBottom: 6 }}>
          Lives on
        </div>
      )}
      <div style={{ fontFamily: 'var(--t-display)', fontStyle: 'italic', fontWeight: 'var(--t-display-wght)' as never, fontSize: 26, lineHeight: 1.15, color: 'var(--t-ink)' }}>
        {platform}
      </div>
      <p style={{ margin: '10px auto 0', maxWidth: 320, fontSize: 13, lineHeight: 1.6, color: 'var(--t-ink-soft)' }}>
        {note}
      </p>
      <div style={{ marginTop: 18 }}>
        <JoinPill url={url} />
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t-ink-muted)' }}>
        {PRIVACY_NOTE}
      </div>
    </div>
  );
}

/* ─── panel — a chat-window frame (ornament bubbles, link-out) ── */

/** Overlapping "who's here" dots — abstract, never real avatars. */
function AvatarCluster() {
  const dot: CSSProperties = {
    width: 18, height: 18, borderRadius: '50%',
    border: '1.5px solid var(--t-card)',
    marginLeft: -6,
  };
  return (
    <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ ...dot, marginLeft: 0, background: 'var(--t-accent)' }} />
      <span style={{ ...dot, background: 'color-mix(in oklab, var(--t-accent) 55%, var(--t-paper))' }} />
      <span style={{ ...dot, background: 'var(--t-gold)' }} />
    </span>
  );
}

function GroupChatPanel({ platform, named, note, url }: { platform: string; named: boolean; note: string; url: string }) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        overflow: 'hidden',
        boxShadow: 'var(--t-shadow-sm, none)',
      }}
    >
      {/* header bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '13px 16px',
          background: 'var(--t-section)',
          borderBottom: '1px solid var(--t-line)',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--t-display)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.15, color: 'var(--t-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {named ? platform : 'The group thread'}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>
            Group thread
          </span>
        </span>
        <AvatarCluster />
      </div>
      {/* bubbles — the note is the pinned message; the rest is ornament */}
      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            alignSelf: 'flex-start', maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: '2px 14px 14px 14px',
            background: 'var(--t-section)',
            color: 'var(--t-ink-soft)',
            fontSize: 13, lineHeight: 1.55,
          }}
        >
          {note}
        </span>
        <span
          aria-hidden
          style={{
            alignSelf: 'flex-end', width: '52%', height: 30,
            borderRadius: '14px 2px 14px 14px',
            background: 'var(--t-accent-bg, var(--t-section))',
            opacity: 0.7,
          }}
        />
        <span
          aria-hidden
          style={{
            alignSelf: 'flex-start', width: '40%', height: 26,
            borderRadius: '2px 14px 14px 14px',
            background: 'var(--t-section)',
            opacity: 0.6,
          }}
        />
      </div>
      {/* message-bar footer — the Join CTA */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          borderTop: '1px solid var(--t-line)',
          background: 'var(--t-paper)',
        }}
      >
        <span style={{ flex: 1, fontSize: 12, fontStyle: 'italic', color: 'var(--t-ink-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {PRIVACY_NOTE}
        </span>
        <JoinPill url={url} style={{ padding: '9px 18px', flexShrink: 0 }}>Join</JoinPill>
      </div>
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

export function GroupChatSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
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
      ) : variant === 'panel' ? (
        <GroupChatPanel platform={platform} named={named} note={note} url={url} />
      ) : (
        <GroupChatCard platform={platform} named={named} note={note} url={url} />
      )}
    </BlockFrame>
  );
}
