'use client';

// ─────────────────────────────────────────────────────────────
// DraftedSummaryBanner — top-of-canvas pill on first editor
// visit signalling that N sections were pre-drafted by Pear.
// Per-section banners (DraftedByPearBanner) handle the
// accept/redraft/clear actions inline; this banner is the
// at-a-glance summary so hosts don't miss any.
//
// Dismisses for the session — sessionStorage keyed by site
// slug. Reappears the next time the host opens the editor
// IF any drafted sections still carry the flag.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';

interface Props {
  siteSlug?: string;
  manifest: StoryManifest;
}

const SECTION_LABELS: Record<string, string> = {
  schedule: 'Schedule',
  faq: 'FAQ',
  registry: 'Registry',
  travel: 'Travel',
  details: 'Details',
};

export function DraftedSummaryBanner({ siteSlug, manifest }: Props) {
  const drafted = manifest.draftedByPear ?? {};
  const draftedSections = Object.entries(drafted)
    .filter(([, flag]) => flag === true)
    .map(([key]) => key);

  const dismissKey = siteSlug ? `pl-drafted-summary-dismissed:${siteSlug}` : null;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !dismissKey) return false;
    try {
      return window.sessionStorage.getItem(dismissKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!dismissed || !dismissKey) return;
    try {
      window.sessionStorage.setItem(dismissKey, '1');
    } catch {}
  }, [dismissed, dismissKey]);

  if (draftedSections.length === 0 || dismissed) return null;

  const labels = draftedSections.map((s) => SECTION_LABELS[s] ?? s);
  const labelStr = labels.length === 1
    ? labels[0]
    : labels.length === 2
      ? `${labels[0]} and ${labels[1]}`
      : `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: '12px auto 0',
        maxWidth: 'min(720px, calc(100% - 32px))',
        padding: '12px 18px',
        borderRadius: 12,
        background: 'rgba(184,146,68,0.08)',
        border: '1px dashed rgba(184,146,68,0.45)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'var(--font-ui, Geist, system-ui, sans-serif)',
        animation: 'pl-enter-fade-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--peach-ink, #C6703D)',
          color: 'var(--cream, #FBF7EE)',
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        ✦
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #0E0D0B)' }}>
          Pear drafted {draftedSections.length} section{draftedSections.length === 1 ? '' : 's'} for you
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft, #3A332C)', marginTop: 2 }}>
          {labelStr} — scroll down to review. Each section has a banner with
          options to keep, redraft, or start blank.
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss this summary"
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: 'transparent',
          color: 'var(--ink-muted, #6F6557)',
          border: '1px solid var(--line, rgba(14,13,11,0.14))',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  );
}
