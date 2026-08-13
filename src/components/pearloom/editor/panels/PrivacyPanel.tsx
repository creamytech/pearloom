'use client';

/* PrivacyPanel — who can see the published site.

   The visibility spine's editor control (V.1): writes
   `manifest.visibility` (+ `privacyGate.password` for the password
   state); every reader resolves through lib/site-visibility.ts.
   Pre-armed by occasion (V.2/L32): a bachelorette with no explicit
   choice shows "Just people with the link" because that is what the
   resolver will do at press. Reached from the editor rail,
   ?jump=privacy deep links (DashSettings → Privacy), and the Share
   panel. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { isPrivateByDefaultOccasion } from '@/lib/site-visibility';
import { FGroup, SectionPanelShell } from './_section-atoms';

type Choice = 'public' | 'link-only' | 'password';

const CHOICES: Array<{ id: Choice; label: string; hint: string }> = [
  { id: 'public', label: 'Public', hint: 'Anyone can open it, and search engines can find it.' },
  { id: 'link-only', label: 'Just people with the link', hint: 'Live for anyone you send it to, hidden from search.' },
  { id: 'password', label: 'Password protected', hint: 'Guests enter a shared password to come in.' },
];

export function PrivacyPanel({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const loose = manifest as unknown as {
    visibility?: string;
    privacyGate?: { password?: string };
    occasion?: string;
  };
  const password = loose.privacyGate?.password ?? '';
  const current: Choice =
    loose.visibility === 'public' || loose.visibility === 'link-only' || loose.visibility === 'password'
      ? loose.visibility
      : password.trim()
        ? 'password'
        : isPrivateByDefaultOccasion(loose.occasion)
          ? 'link-only'
          : 'public';
  const [show, setShow] = useState(false);

  const write = (choice: Choice, pw: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    visibility: choice,
    privacyGate: choice === 'password' && pw ? { password: pw } : undefined,
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <FGroup
        label="Who can see it"
        hint={CHOICES.find((c) => c.id === current)?.hint}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => write(c.id, password)}
              aria-pressed={current === c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                border: current === c.id
                  ? '2px solid var(--pl-chrome-text)'
                  : '1px solid var(--pl-chrome-border)',
                background: current === c.id
                  ? 'var(--pl-chrome-surface-2)'
                  : 'transparent',
                color: 'var(--pl-chrome-text)',
                fontSize: 13, fontWeight: current === c.id ? 700 : 500,
                fontFamily: 'inherit',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {current === 'password' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => write('password', e.target.value)}
              placeholder="The password guests will enter"
              autoComplete="off"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--pl-chrome-border)', background: 'var(--pl-chrome-surface-2)',
                fontSize: 13, color: 'var(--pl-chrome-text)', fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              style={{
                padding: '0 12px', borderRadius: 10, border: '1px solid var(--pl-chrome-border)',
                background: 'transparent', color: 'var(--pl-chrome-text-soft)', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        )}
        {current === 'password' && !password.trim() && (
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--pl-chrome-text-muted)' }}>
            Until a password is set, the site stays open — an empty gate protects no one.
          </p>
        )}
      </FGroup>
    </SectionPanelShell>
  );
}
