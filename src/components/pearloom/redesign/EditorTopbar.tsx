'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L56-135 EditorTopbar. */

import Link from 'next/link';
import { Icon, Pear } from '../motifs';
import type { EditorMode } from './EditorRedesign';

interface Props {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  savedAt: string;
  onPublish: () => void;
  pearOpen: boolean;
  setPearOpen: (next: boolean) => void;
  onOpenSettings: () => void;
  displayNames: string;
}

export function EditorTopbar({ mode, setMode, savedAt, onPublish, pearOpen, setPearOpen, onOpenSettings, displayNames }: Props) {
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ink-muted)' }}>
          <span style={{ width: 6, height: 6, background: 'var(--sage)', borderRadius: '50%' }} />
          Saved {savedAt}
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
        <button type="button" className="btn btn-outline btn-sm">
          <Icon name="share" size={12} /> Share
        </button>
        <button type="button" className="btn btn-primary btn-sm pl-pearl-accent" onClick={onPublish}>
          Publish
          <Icon name="arrow-up" size={12} color="var(--cream)" />
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title={displayNames}
          style={{
            width: 30, height: 30, borderRadius: 999,
            background: 'linear-gradient(135deg, var(--lavender-2), var(--peach-2))',
            border: 'none', cursor: 'pointer',
            color: 'var(--ink)', fontSize: 11, fontWeight: 700,
            display: 'grid', placeItems: 'center',
          }}
        >
          {initials(displayNames)}
        </button>
      </div>
    </header>
  );
}

function initials(s: string): string {
  const parts = s.replace('&', ' ').split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}
