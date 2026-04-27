'use client';

// ─────────────────────────────────────────────────────────────
// OwnerEditPill — a floating "Edit this site" affordance that
// only appears for the logged-in owner of the published site.
//
// Mounts on the public /sites/[domain] view. Reads the session
// via /api/auth/session client-side; if the user's email
// matches `creatorEmail` (case-insensitive, tolerant of
// surrounding whitespace) the pill renders bottom-right with a
// pearl-accent finish that links straight to /editor/{slug}.
// Anyone else — guests, anonymous visitors, the wrong account —
// gets nothing rendered.
//
// Deliberately kept tiny: pill, no shell, no server fetches.
// The session ping is the only cost and it short-circuits to
// "not the owner" on a missing creatorEmail.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '../motifs';

const POSTHOG_KEY = 'pl-owner-pill-dismissed';

export function OwnerEditPill({
  siteSlug,
  creatorEmail,
}: {
  siteSlug: string;
  /** site_config.creator_email from the database. */
  creatorEmail?: string | null;
}) {
  const [isOwner, setIsOwner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Read the dismissal flag client-side so SSR doesn't paint a
    // pill the user has already swiped away.
    try {
      if (sessionStorage.getItem(`${POSTHOG_KEY}:${siteSlug}`)) {
        setDismissed(true);
        return;
      }
    } catch {
      // sessionStorage blocked — keep going, no harm.
    }

    if (!creatorEmail) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { user?: { email?: string | null } };
        const email = body?.user?.email?.trim().toLowerCase();
        const owner = creatorEmail.trim().toLowerCase();
        if (!cancelled && email && owner && email === owner) {
          setIsOwner(true);
        }
      } catch {
        // network blip / not signed in — silently leave hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorEmail, siteSlug]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(`${POSTHOG_KEY}:${siteSlug}`, '1');
    } catch {
      // ignore
    }
  }

  if (!isOwner || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Site owner controls"
      style={{
        position: 'fixed',
        right: 'clamp(16px, 2vw, 28px)',
        bottom: 'clamp(16px, 2vw, 28px)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 8px 8px 14px',
        borderRadius: 999,
        background: 'rgba(14,13,11,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 12px 32px rgba(14,13,11,0.32), 0 0 0 1px rgba(184,147,90,0.35)',
        color: 'rgba(243,233,212,0.95)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          width: 6,
          height: 6,
          borderRadius: 999,
          background: 'var(--peach-ink, #C6703D)',
          boxShadow: '0 0 8px rgba(198,112,61,0.6)',
        }}
      />
      <span style={{ marginRight: 4 }}>You’re the host</span>
      <Link
        href={`/editor/${siteSlug}`}
        prefetch={false}
        className="pl-pearl-accent"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 999,
          fontSize: 12.5,
          fontWeight: 700,
          textDecoration: 'none',
          fontFamily: 'inherit',
        }}
      >
        Edit
        <Icon name="arrow-right" size={11} />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide owner controls for this session"
        title="Hide for this session"
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 26,
          height: 26,
          borderRadius: 999,
          background: 'transparent',
          border: 'none',
          color: 'rgba(243,233,212,0.62)',
          cursor: 'pointer',
          marginLeft: 2,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
