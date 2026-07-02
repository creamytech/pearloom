'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/invite/InvitePage.tsx
//
// Router between the first-visit InviteReveal (shows the big
// display + RSVP form) and the returning GuestPassport (shows
// the unified 'wedding pass' page once they've replied).
//
// Used by /i/[token] via the server component — SSR sends in
// the guest's row so we know up-front which view to render.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { InviteReveal } from './InviteReveal';
import { GuestPassport } from './GuestPassport';

interface PriorRsvp {
  status: 'attending' | 'declined' | 'pending';
  email?: string;
  plusOne: boolean;
  plusOneName?: string;
  mealPreference?: string;
  dietaryRestrictions?: string;
  songRequest?: string;
  mailingAddress?: string;
  message?: string;
  selectedEvents: string[];
  respondedAt?: string;
}

interface Props {
  manifest: StoryManifest | null;
  guestName: string;
  guestId?: string;
  token: string;
  coupleNames: [string, string];
  hasReplied: boolean;
  priorRsvp: PriorRsvp | null;
}

export function InvitePage({
  manifest,
  guestName,
  guestId,
  token,
  coupleNames,
  hasReplied,
  priorRsvp,
}: Props) {
  // If the guest has already replied, land them on the Passport.
  // A "Edit my response" button flips back to InviteReveal.
  const [mode, setMode] = useState<'passport' | 'reveal'>(
    hasReplied && priorRsvp ? 'passport' : 'reveal',
  );

  if (mode === 'passport' && priorRsvp) {
    return (
      <GuestPassport
        manifest={manifest}
        token={token}
        guestName={guestName}
        guestId={guestId}
        coupleNames={coupleNames}
        rsvp={priorRsvp}
        onEditRsvp={() => setMode('reveal')}
      />
    );
  }

  return (
    <InviteReveal
      manifest={manifest}
      guestName={guestName}
      token={token}
      coupleNames={coupleNames}
    />
  );
}
