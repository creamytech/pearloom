'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L56-135 EditorTopbar. */

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Icon, Pear } from '../motifs';
import type { EditorMode } from './EditorRedesign';
import type { SaveState } from './bridge';
import type { StoryManifest } from '@/types';
import { PublishChecklist } from './PublishChecklist';

interface Props {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  savedAt: string;
  saveState?: SaveState;
  onPublish: () => void;
  pearOpen: boolean;
  setPearOpen: (next: boolean) => void;
  onOpenSettings: () => void;
  displayNames: string;
  /** Manifest passed through to PublishChecklist so the pill can
   *  audit missing fields. Optional — if omitted the checklist
   *  pill is hidden. */
  manifest?: StoryManifest;
}

export function EditorTopbar({ mode, setMode, savedAt, saveState = 'saved', onPublish, pearOpen, setPearOpen, onOpenSettings, displayNames, manifest }: Props) {
  const { data: session } = useSession();
  /* Profile pic was rendering initials from `displayNames` (the
     COUPLE'S names), so the avatar text changed on every keystroke
     while editing names. Switched to the authenticated USER's
     image / name / email — the modal already shows the correct
     user info, so the pill should match. Falls back to the
     prototype gradient pill with email-derived initials when
     user.image isn't set. */
  const sessionUser = session?.user;
  const userImage = sessionUser?.image ?? null;
  const userLabel = sessionUser?.name || sessionUser?.email || 'Account';
  const userInitials = avatarInitials(sessionUser?.name, sessionUser?.email);
  const saveLabel = saveState === 'saving' ? 'Saving…'
    : saveState === 'unsaved' ? 'Saving…'
    : saveState === 'error' ? 'Save failed'
    : `Saved ${savedAt}`;
  const saveDot = saveState === 'error' ? 'var(--peach-ink)'
    : saveState === 'saved' ? 'var(--sage)'
    : 'var(--peach-ink)';
  const saveActive = saveState === 'saving' || saveState === 'unsaved';
  return (
    <header
      style={{
        gridArea: 'top',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--line-soft)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 56,
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* Left zone — back to dashboard. Prototype L70-76. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 232 }}>
        <Link
          href="/dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)', textDecoration: 'none' }}
        >
          <Icon name="chev-left" size={14} />
          <Pear size={20} tone="sage" shadow={false} />
          Dashboard
        </Link>
      </div>

      {/* Center zone — Edit / Preview / Mobile pill. Prototype L79-106. */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex', gap: 2, padding: 3,
            background: 'var(--card)', borderRadius: 999,
            border: '1px solid var(--line-soft)',
          }}
        >
          {([
            { id: 'edit', label: 'Edit', icon: 'brush' },
            { id: 'preview', label: 'Preview', icon: 'eye' },
            { id: 'mobile', label: 'Mobile', icon: 'phone' },
          ] as const).map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="pl-rd-mode-pill"
                style={{
                  padding: '6px 14px', borderRadius: 999,
                  fontSize: 12.5, fontWeight: 600,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 0, cursor: 'pointer',
                }}
              >
                <Icon name={m.icon} size={12} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right zone — save state · | · Ask Pear · Share · Publish · | · avatar.
          Prototype L108-132. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          aria-live="polite"
          title={saveState === 'error' ? 'Last save attempt failed — next edit will retry.' : `Last saved at ${savedAt}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: saveActive ? '3px 9px' : '3px 0',
            borderRadius: 999,
            background: saveActive ? 'var(--peach-bg)' : 'transparent',
            border: saveActive ? '1px solid rgba(198,112,61,0.18)' : '1px solid transparent',
            fontSize: 11.5,
            color: saveActive ? 'var(--peach-ink)' : 'var(--ink-muted)',
            fontWeight: saveActive ? 600 : 500,
            transition: 'background 240ms cubic-bezier(0.16,1,0.3,1), padding 240ms, color 240ms',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: saveDot,
              animation: saveActive ? 'pl-dot-pulse 1.4s ease-in-out infinite' : 'none',
              boxShadow: saveActive ? '0 0 0 3px rgba(198,112,61,0.16)' : 'none',
            }}
          />
          {saveLabel}
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
        <button
          type="button"
          onClick={() => setPearOpen(!pearOpen)}
          className="btn btn-outline btn-sm"
          style={{
            background: pearOpen ? 'var(--peach-bg)' : 'var(--card)',
            borderColor: pearOpen ? 'transparent' : 'var(--line)',
            color: pearOpen ? 'var(--peach-ink)' : 'var(--ink)',
          }}
        >
          <Pear size={14} tone="sage" shadow={false} />
          Ask Pear
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={async () => {
            if (typeof window === 'undefined') return;
            const url = window.location.href;
            try {
              if (navigator.share) {
                await navigator.share({ title: displayNames, url });
              } else {
                await navigator.clipboard.writeText(url);
                window.dispatchEvent(new CustomEvent('pearloom:toast', { detail: { message: 'Link copied' } }));
              }
            } catch {
              /* user dismissed share sheet — no-op */
            }
          }}
          aria-label="Share this site"
        >
          <Icon name="share" size={12} /> Share
        </button>
        {manifest && <PublishChecklist manifest={manifest} />}
        <button type="button" className="btn btn-primary btn-sm pl-pearl-accent" onClick={onPublish}>
          Publish
          <Icon name="arrow-up" size={12} color="var(--cream)" />
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Account settings"
          title={userLabel}
          style={{
            width: 30, height: 30, borderRadius: 999,
            background: userImage
              ? `var(--cream-2) center / cover no-repeat url("${userImage.replace(/"/g, '%22')}")`
              : 'linear-gradient(135deg, var(--lavender-2), var(--peach-2))',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            color: 'var(--ink)', fontSize: 11, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Only show initials when there's no image. Image renders
              via background. */}
          {!userImage && <span>{userInitials}</span>}
        </button>
      </div>
    </header>
  );
}

/* Pull initials from name (preferred) or email. Email-based initial
   is single-letter, name-based is up to two. */
function avatarInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  if (email) return (email.trim()[0] ?? '?').toUpperCase();
  return '?';
}
