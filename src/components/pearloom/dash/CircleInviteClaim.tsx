'use client';

// ─────────────────────────────────────────────────────────────
// CircleInviteClaim — the one-tap add-back moment (GRAND-PLAN-2
// C.3). Someone who arrived via a personal circle-invite link
// (/signup?circle=<token> → localStorage stash) gets an immediate
// "‹Name› saved you a place in their circle — add them back?"
// pill on their first authed session, instead of finding the
// pending request buried in the /welcome sealed-envelope step.
//
// Consent is unchanged: claiming only FILES the inviter's pending
// request; the button here is the invitee's own accept. Declining
// ("Not now") leaves the pending request where it always was —
// answerable later from Circle — it never auto-declines.
//
// Mounted once in ShellPersistentLayout; renders nothing unless a
// fresh stash exists and the claim succeeds.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STASH_KEY = 'pl-circle-invite';
const STASH_MAX_AGE_MS = 7 * 24 * 3600_000;

interface ClaimInfo {
  inviterFirstName: string;
  inviterPersonId: string;
  /** Already accepted (mutual pending collapsed) — celebrate, no button. */
  alreadyAccepted: boolean;
}

export function CircleInviteClaim() {
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [state, setState] = useState<'idle' | 'accepting' | 'accepted' | 'dismissed'>('idle');

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      let token: string | null = null;
      try {
        const raw = window.localStorage.getItem(STASH_KEY);
        if (!raw) return;
        const stash = JSON.parse(raw) as { token?: string; ts?: number };
        if (!stash?.token) { window.localStorage.removeItem(STASH_KEY); return; }
        if (typeof stash.ts === 'number' && Date.now() - stash.ts > STASH_MAX_AGE_MS) {
          window.localStorage.removeItem(STASH_KEY);
          return;
        }
        token = stash.token;
      } catch { return; }
      if (!token) return;
      try {
        const r = await fetch('/api/circle-invites/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const d = (await r.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          inviterFirstName?: string;
          inviterPersonId?: string;
          status?: string;
        } | null;
        if (r.status === 401) return; // not signed in yet — keep the stash for the next session
        // Terminal either way (claimed, not-found, self, or success) —
        // the stash has done its job.
        try { window.localStorage.removeItem(STASH_KEY); } catch { /* best-effort */ }
        if (cancelled || !d?.ok || !d.inviterPersonId) return;
        setInfo({
          inviterFirstName: d.inviterFirstName || 'A friend',
          inviterPersonId: d.inviterPersonId,
          alreadyAccepted: d.status === 'accepted',
        });
      } catch { /* claim is a nicety, the request still waits in Circle */ }
    }, 400);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, []);

  if (!info || state === 'dismissed') return null;

  async function accept() {
    if (!info || state === 'accepting') return;
    setState('accepting');
    try {
      const r = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', otherPersonId: info.inviterPersonId }),
      });
      const d = (await r.json().catch(() => null)) as { ok?: boolean } | null;
      setState(r.ok && d?.ok ? 'accepted' : 'idle');
    } catch {
      setState('idle');
    }
  }

  const done = state === 'accepted' || info.alreadyAccepted;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        zIndex: 90,
        maxWidth: 'min(520px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 'var(--r-md, 20px)',
        background: 'var(--card, #FBF7EE)',
        border: '1px solid var(--pl-gold, #C19A4B)',
        boxShadow: 'var(--shadow-md, 0 18px 48px -24px rgba(20,24,12,0.35))',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--pl-gold-mist, #F4ECD6)',
          fontFamily: 'var(--font-display, Fraunces, serif)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--ink, #2A2A2A)',
        }}
      >
        {info.inviterFirstName.charAt(0).toUpperCase()}
      </span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink, #2A2A2A)', lineHeight: 1.45 }}>
        {done ? (
          <>You and <strong>{info.inviterFirstName}</strong> are in each other&rsquo;s circle now. <Link href="/dashboard/circle" style={{ color: 'var(--sage-deep, #5C6B3F)', fontWeight: 600 }}>Say hello →</Link></>
        ) : (
          <><strong>{info.inviterFirstName}</strong> saved you a place in their circle, add them back?</>
        )}
      </span>
      {!done && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={state === 'accepting'}
          onClick={() => void accept()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {state === 'accepting' ? 'Weaving…' : 'Add them back'}
        </button>
      )}
      <button
        type="button"
        aria-label={done ? 'Dismiss' : 'Not now'}
        onClick={() => setState('dismissed')}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-muted, #8A8377)',
          fontSize: done ? 16 : 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '4px 6px',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {done ? '×' : 'Not now'}
      </button>
    </div>
  );
}
