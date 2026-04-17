'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/co-host/CoHostAccept.tsx
// Client-side accept flow for co-host invites. Shows the
// inviter, site, role, and a one-tap accept button.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Invite {
  role: 'editor' | 'guest-manager' | 'viewer';
  invitedBy: string;
  note?: string;
  expiresAt: string;
  acceptedAt: string | null;
}

interface Props {
  token: string;
  invite: Invite | null;
  siteName: string;
  coupleNames: [string, string];
  currentUserEmail: string | null;
}

const ROLE_COPY: Record<
  Invite['role'],
  { label: string; canDo: string[]; cant: string[] }
> = {
  editor: {
    label: 'Co-editor',
    canDo: [
      'Edit every section',
      'Upload photos',
      'Write chapters and poetry',
      'Manage the guest list',
    ],
    cant: ['Publish the live site', 'Delete the site', 'Change billing'],
  },
  'guest-manager': {
    label: 'Guest manager',
    canDo: [
      'Add and edit guests',
      'Send invitations and reminders',
      'Export the RSVP list',
      'Manage seating',
    ],
    cant: ['Edit site content', 'Publish the live site', 'Change billing'],
  },
  viewer: {
    label: 'Viewer',
    canDo: ['See the draft site', 'Read the guest list', 'Comment on sections'],
    cant: ['Edit anything', 'Publish', 'Invite others'],
  },
};

const CREAM = '#FAF7F2';
const INK = '#18181B';
const INK_SOFT = '#3A332C';
const MUTED = '#6F6557';
const GOLD = '#B8935A';
const GOLD_RULE = 'rgba(184,147,90,0.28)';
const OLIVE = '#5C6B3F';
const CRIMSON = '#8B2D2D';

const FONT_DISPLAY = 'var(--pl-font-heading, "Fraunces", Georgia, serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';

export function CoHostAccept({
  token,
  invite,
  siteName,
  coupleNames,
  currentUserEmail,
}: Props) {
  const [state, setState] = useState<'idle' | 'accepting' | 'done' | 'error'>(
    invite?.acceptedAt ? 'done' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setState('accepting');
    setError(null);
    try {
      const res = await fetch('/api/sites/co-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptToken: token }),
      });
      if (!res.ok) throw new Error('accept_failed');
      setState('done');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
      setState('error');
    }
  }

  if (!invite) {
    return (
      <Shell>
        <Heading>This invite link is invalid.</Heading>
        <p style={{ color: INK_SOFT, fontSize: '0.95rem' }}>
          Ask whoever sent it to you for a fresh link.
        </p>
      </Shell>
    );
  }

  const displayCouple = coupleNames.filter(Boolean).join(' & ') || siteName || 'their site';
  const roleCopy = ROLE_COPY[invite.role];

  if (state === 'done') {
    return (
      <Shell>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 999,
            background: `color-mix(in oklab, ${OLIVE} 14%, transparent)`,
            border: `1px solid ${OLIVE}`,
            color: OLIVE,
            fontFamily: FONT_MONO,
            fontSize: '0.66rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          ✓ You&rsquo;re in
        </div>
        <Heading>Welcome to {displayCouple}&rsquo;s site.</Heading>
        <p style={{ color: INK_SOFT, fontSize: '0.95rem', marginBottom: 28 }}>
          You&rsquo;re set up as a <strong>{roleCopy.label}</strong>. Head to the
          dashboard to start contributing.
        </p>
        <a
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: INK,
            color: CREAM,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: '0.66rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Open the dashboard →
        </a>
      </Shell>
    );
  }

  const expired = new Date(invite.expiresAt) < new Date();

  return (
    <Shell>
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.62rem',
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: GOLD,
          margin: '0 0 14px',
        }}
      >
        You&rsquo;re invited to help plan
      </p>
      <Heading>{displayCouple}</Heading>

      <p
        style={{
          fontFamily: FONT_DISPLAY,
          fontStyle: 'italic',
          fontSize: '1.1rem',
          color: INK_SOFT,
          margin: '18px 0 24px',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: INK }}>{invite.invitedBy}</strong> wants you to
        join as a <strong style={{ color: INK }}>{roleCopy.label}</strong>.
      </p>

      {invite.note && (
        <blockquote
          style={{
            padding: '14px 18px',
            margin: '0 0 28px',
            borderLeft: `2px solid ${GOLD}`,
            background: 'color-mix(in oklab, #B8935A 8%, transparent)',
            fontFamily: FONT_DISPLAY,
            fontStyle: 'italic',
            fontSize: '1rem',
            color: INK_SOFT,
          }}
        >
          &ldquo;{invite.note}&rdquo;
        </blockquote>
      )}

      <section style={{ margin: '0 0 28px' }}>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.6rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: MUTED,
            margin: '0 0 10px',
          }}
        >
          You&rsquo;ll be able to
        </p>
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: 8,
          }}
        >
          {roleCopy.canDo.map((item) => (
            <li
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.92rem',
                color: INK_SOFT,
              }}
            >
              <span style={{ color: OLIVE, fontWeight: 700 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.58rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: MUTED,
            margin: '16px 0 6px',
          }}
        >
          You won&rsquo;t be able to
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {roleCopy.cant.map((item) => (
            <li
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.86rem',
                color: MUTED,
              }}
            >
              <span style={{ color: CRIMSON, opacity: 0.6 }}>×</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {expired ? (
        <p style={{ color: CRIMSON, fontSize: '0.9rem' }}>
          This invite expired on{' '}
          {new Date(invite.expiresAt).toLocaleDateString()}.
          Ask for a fresh link.
        </p>
      ) : !currentUserEmail ? (
        <motion.a
          href={`/login?next=${encodeURIComponent(`/co-host/${token}`)}`}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: INK,
            color: CREAM,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: '0.66rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Sign in to accept →
        </motion.a>
      ) : (
        <motion.button
          type="button"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={accept}
          disabled={state === 'accepting'}
          style={{
            padding: '14px 28px',
            background: INK,
            color: CREAM,
            border: `1px solid ${INK}`,
            borderRadius: 2,
            fontFamily: FONT_MONO,
            fontSize: '0.66rem',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {state === 'accepting' ? 'Accepting…' : `Accept as ${currentUserEmail}`}
        </motion.button>
      )}

      {error && <p style={{ color: CRIMSON, fontSize: '0.88rem', marginTop: 16 }}>{error}</p>}

      <p
        style={{
          marginTop: 36,
          fontFamily: FONT_MONO,
          fontSize: '0.56rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: MUTED,
        }}
      >
        Valid until {new Date(invite.expiresAt).toLocaleDateString()}
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 56px)',
      }}
    >
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: 560,
          padding: 'clamp(28px, 5vw, 48px)',
          background: 'var(--pl-cream-card, #FBF7EE)',
          border: `1px solid ${GOLD_RULE}`,
          borderRadius: 2,
          boxShadow: '0 18px 48px rgba(40,28,12,0.08)',
        }}
      >
        {children}
      </motion.main>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: FONT_DISPLAY,
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
        color: INK,
        margin: 0,
        lineHeight: 1.15,
        letterSpacing: '-0.014em',
      }}
    >
      {children}
    </h1>
  );
}
