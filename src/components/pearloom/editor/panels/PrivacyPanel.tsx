'use client';

/* PrivacyPanel — who can see the published site.
   Writes manifest.privacyGate.password; PublishedSiteShell mounts
   the password gate whenever it's set. Reached from the editor
   rail, ?jump=privacy deep links (DashSettings → Privacy), and
   the Share panel. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { FGroup, SectionPanelShell } from './_section-atoms';

export function PrivacyPanel({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const loose = manifest as unknown as { privacyGate?: { password?: string } };
  const password = loose.privacyGate?.password ?? '';
  const enabled = password.trim().length > 0;
  const [show, setShow] = useState(false);

  const write = (pw: string | null) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    privacyGate: pw ? { ...(loose.privacyGate ?? {}), password: pw } : undefined,
  } as unknown as StoryManifest);

  return (
    <SectionPanelShell>
      <FGroup
        label="Password protection"
        hint={enabled
          ? 'Guests see a locked page until they enter the password. Share it alongside the link, it isn’t in the invite automatically.'
          : 'The site is public, anyone with the link can open it. Set a password to keep it between invited guests.'}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => write(e.target.value || null)}
            placeholder="No password, site is public"
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
        {enabled && (
          <button
            type="button"
            onClick={() => write(null)}
            style={{
              marginTop: 10, padding: 0, border: 'none', background: 'transparent',
              fontSize: 11.5, color: 'var(--pl-chrome-text-muted)', textDecoration: 'underline',
              cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start',
            }}
          >
            Remove the password, make the site public
          </button>
        )}
      </FGroup>
    </SectionPanelShell>
  );
}
