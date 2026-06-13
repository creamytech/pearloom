'use client';

/* =========================================================================
   GuestRsvpModal — full-screen guest-facing RSVP modal.

   Direct port of ClaudeDesign/pages/rsvp-flow.jsx — a 3-step flow:
     Step 1 (find)     — guest types their name; we search the
                         manifest's guest passport list (when present)
                         OR a token-based pre-fill from URL ?g=<token>.
     Step 2 (respond)  — per-guest attending toggle + meal + dietary +
                         optional song + note.
     Step 3 (done)     — the themed confirmation ceremony (RsvpCeremony:
                         motif + monogram + preset-aware copy + themed
                         add-to-calendar). Honors prefers-reduced-motion.

   Triggered by `window.dispatchEvent(new CustomEvent('pl-open-rsvp'))`.
   Broadcasts `window.dispatchEvent(new CustomEvent('pl-rsvp-saved'))`
   on successful save so any on-site counters refresh.

   POSTs to the existing /api/rsvp endpoint with the same shape as
   PresetRsvpForm (siteId, guestName, email, status, mealPreference,
   dietaryRestrictions, songRequest, message, answers) — backend is
   untouched.

   This is PROGRESSIVE ENHANCEMENT: every RSVP CTA on the site that
   dispatches `pl-open-rsvp` ALSO keeps its `href="#rsvp"` anchor, so
   guests on browsers where the modal failed to mount (or JS off) get
   the inline form. Hosts who don't have a passport list still get a
   working "look up by name" flow because we accept any name + email.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { getEventType, type RsvpPreset } from '@/lib/event-os/event-types';
import { RsvpCeremony } from './RsvpCeremony';
import { getTheme, themeRootStyle } from './themes';

const DEFAULT_MEAL_OPTIONS = ['Chicken', 'Fish', 'Vegetarian', 'Kids meal'];

interface ManifestGuest {
  /** Stable id (passport token or generated). */
  id: string;
  /** Display label for the row (e.g. "Linda Chen"). */
  name: string;
  /** Party label (e.g. "The Patel Family"). When omitted falls back to name. */
  party?: string;
}

interface GuestRsvpModalProps {
  siteSlug: string;
  manifest: StoryManifest;
}

type Step = 'find' | 'respond' | 'notfound' | 'done';

interface GuestReply {
  attending: 'yes' | 'no';
  meal: string;
  dietary: string;
}

/* Reads a coarse guest list off the manifest. The prototype hard-codes
   three sample parties; production reads optional `manifest.passport.guests`
   (when the host has uploaded a guest list) and otherwise falls back to
   "type your name → we'll trust you" mode. */
function readManifestGuests(manifest: StoryManifest): ManifestGuest[] {
  const passport = (manifest as unknown as {
    passport?: { guests?: Array<{ id?: string; name?: string; party?: string; token?: string }> };
  }).passport;
  const list = passport?.guests;
  if (!Array.isArray(list)) return [];
  return list
    .map((g, i) => ({
      id: String(g?.id ?? g?.token ?? `g${i}`),
      name: String(g?.name ?? '').trim(),
      party: typeof g?.party === 'string' ? g.party.trim() : undefined,
    }))
    .filter((g) => g.name.length > 0);
}

/* Groups guests by party label so a party of multiple guests shares one
   modal pass (the prototype's "The Patel Family" → ['Marcus Patel',
   'Priya Patel']). Solo guests just become their own party. */
interface Party {
  id: string;
  label: string;
  guests: string[];
}
function groupIntoParties(guests: ManifestGuest[]): Party[] {
  const byParty = new Map<string, Party>();
  for (const g of guests) {
    const partyLabel = g.party || g.name;
    const partyId = `p:${partyLabel.toLowerCase()}`;
    const existing = byParty.get(partyId);
    if (existing) {
      if (!existing.guests.includes(g.name)) existing.guests.push(g.name);
    } else {
      byParty.set(partyId, { id: partyId, label: partyLabel, guests: [g.name] });
    }
  }
  return Array.from(byParty.values());
}

function findPartyByQuery(parties: Party[], query: string): Party | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Exact label match wins
  const exact = parties.find((p) => p.label.toLowerCase() === q);
  if (exact) return exact;
  // Substring on party label
  const labelMatch = parties.find((p) => p.label.toLowerCase().includes(q));
  if (labelMatch) return labelMatch;
  // Match by any guest name in the party
  return parties.find((p) => p.guests.some((g) => g.toLowerCase().includes(q))) ?? null;
}

function makeAdHocParty(name: string): Party {
  const trimmed = name.trim();
  return { id: `p:${trimmed.toLowerCase()}`, label: trimmed, guests: [trimmed] };
}

function fieldStyle(): React.CSSProperties {
  return { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 13 };
}

function labelStyle(): React.CSSProperties {
  return {
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ink-muted, var(--pl-muted, #6F6557))',
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 10,
    border: '1px solid var(--line, rgba(14,13,11,0.14))',
    background: 'var(--cream-2, var(--pl-cream, #F5EFE2))',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    color: 'var(--ink, var(--pl-ink, #0E0D0B))',
  };
}

export function GuestRsvpModal({ siteSlug, manifest }: GuestRsvpModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('find');
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [party, setParty] = useState<Party | null>(null);
  /* "Find your invitation" typeahead — live name matches from the
     host's REAL guest list (/api/rsvp/lookup, names only). Picking
     yourself pins your row id so the reply UPDATES it instead of
     minting a duplicate — and passes the invitation-only gate. */
  const [nameMatches, setNameMatches] = useState<Array<{ id: string; name: string; party?: string | null }>>([]);
  const [matchedGuestId, setMatchedGuestId] = useState<string | null>(null);
  const [resp, setResp] = useState<Record<string, GuestReply>>({});
  const [song, setSong] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parties = useMemo(() => groupIntoParties(readManifestGuests(manifest)), [manifest]);
  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const rsvpPreset: RsvpPreset = (eventType?.rsvpPreset as RsvpPreset) ?? 'wedding';

  // Custom meal options surface from the host's catered-menu config when
  // present. We re-use the same field name that ThemedSiteRenderer's
  // PresetRsvpForm reads so a host who has named their menu sees those
  // names here.
  const mealOptions = useMemo<string[]>(() => {
    const opts = (manifest as unknown as {
      rsvpConfig?: { mealOptions?: Array<{ name?: string }> };
    }).rsvpConfig?.mealOptions;
    if (Array.isArray(opts) && opts.length > 0) {
      const names = opts.map((o) => String(o?.name ?? '').trim()).filter(Boolean);
      if (names.length > 0) return names;
    }
    return DEFAULT_MEAL_OPTIONS;
  }, [manifest]);

  /* Question toggles from RsvpPanel — manifest.rsvpConfig.{mealChoice,
     dietary, songRequest, plusOne}. When the host turns one off in the
     editor, the guest modal hides that field. Each defaults to true
     when the rsvpConfig object is absent (legacy sites) so we don't
     regress already-published flows. plusOne is the only field that
     defaults to false — matching the editor panel's default. */
  const questionGates = useMemo(() => {
    const cfg = (manifest as unknown as {
      rsvpConfig?: { mealChoice?: boolean; dietary?: boolean; songRequest?: boolean; plusOne?: boolean };
    }).rsvpConfig;
    return {
      mealChoice: cfg?.mealChoice ?? true,
      dietary: cfg?.dietary ?? true,
      songRequest: cfg?.songRequest ?? true,
      plusOne: cfg?.plusOne ?? false,
    };
  }, [manifest]);
  void questionGates.plusOne; /* plusOne handled via existing guest-list passport flow upstream. */

  /* Theme stamp — on the published path (PublishedSiteShell) this
     modal mounts as a SIBLING of the themed site root, so the
     --t-* vars are NOT inherited from `.pl8-guest`. Re-derive the
     same theme-var bag the renderer uses (themeId catalog pick +
     Theme-Store pack vars) and stamp it on the modal root so the
     form chrome + confirmation ceremony wear the couple's look in
     both mount contexts. Identical derivation to ThemedSiteRenderer
     → idempotent when the modal happens to mount inside the themed
     root. Presentation only. */
  const modalThemeStyle = useMemo(() => {
    const loose = manifest as unknown as {
      themeId?: string;
      theme?: { id?: string };
      themeVars?: Record<string, string>;
    };
    const theme = getTheme(loose.themeId ?? loose.theme?.id);
    return themeRootStyle(theme, 'comfortable', loose.themeVars ?? null);
  }, [manifest]);

  const resetState = useCallback(() => {
    setStep('find');
    setQuery('');
    setEmail('');
    setParty(null);
    setResp({});
    setSong('');
    setNote('');
    setSubmitError(null);
    setSubmitting(false);
    setNameMatches([]);
    setMatchedGuestId(null);
  }, []);

  /* Debounced guest-list lookup while the guest types their name.
     Old results stay in state below the 2-char floor — the render
     condition hides them, so no synchronous setState-in-effect. */
  useEffect(() => {
    if (!open || step !== 'find') return;
    const q = query.trim();
    if (q.length < 2) return;
    const ctl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`/api/rsvp/lookup?siteId=${encodeURIComponent(siteSlug)}&q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { matches?: Array<{ id: string; name: string; party?: string | null }> } | null) => {
          if (d && Array.isArray(d.matches)) setNameMatches(d.matches);
        })
        .catch(() => { /* lookup is best-effort — typing still works */ });
    }, 220);
    return () => { window.clearTimeout(t); ctl.abort(); };
  }, [open, step, query, siteSlug]);

  // Listen for the open event globally.
  useEffect(() => {
    const handler = () => {
      resetState();
      setOpen(true);
    };
    window.addEventListener('pl-open-rsvp', handler);
    return () => window.removeEventListener('pl-open-rsvp', handler);
  }, [resetState]);

  // Escape to close, focus management.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // Lock body scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  /* anyYes derives from the per-guest response map. Declared BEFORE
     the early-return guard so the hook order stays stable on every
     render (the modal mounts hidden until the open event fires, so
     `open=false` is the common case — useMemo must still be called). */
  const anyYes = useMemo(
    () =>
      party
        ? party.guests.some((g) => resp[g]?.attending === 'yes')
        : false,
    [party, resp],
  );

  if (!open) return null;

  /* A tapped suggestion proceeds immediately as that guest. */
  const pickMatch = (m: { id: string; name: string }) => {
    setQuery(m.name);
    setMatchedGuestId(m.id);
    setNameMatches([]);
    findInvite(m.name);
  };

  const findInvite = (explicitName?: string) => {
    const q = (explicitName ?? query).trim();
    if (q.length < 2) return;
    if (parties.length > 0) {
      const found = findPartyByQuery(parties, q);
      if (found) {
        setParty(found);
        const initial: Record<string, GuestReply> = {};
        for (const g of found.guests) {
          initial[g] = { attending: 'yes', meal: mealOptions[0] ?? 'Chicken', dietary: '' };
        }
        setResp(initial);
        setStep('respond');
        return;
      }
      // Production host has a passport list but no match — show notfound,
      // with a "continue anyway" affordance so we don't lock a real guest
      // out due to a name-spelling mismatch.
      setStep('notfound');
      return;
    }
    // No passport configured — accept the name as-is.
    const ad = makeAdHocParty(q);
    setParty(ad);
    setResp({
      [ad.guests[0]]: { attending: 'yes', meal: mealOptions[0] ?? 'Chicken', dietary: '' },
    });
    setStep('respond');
  };

  const continueAnyway = () => {
    const ad = makeAdHocParty(query);
    setParty(ad);
    setResp({
      [ad.guests[0]]: { attending: 'yes', meal: mealOptions[0] ?? 'Chicken', dietary: '' },
    });
    setStep('respond');
  };

  const setGuest = (name: string, patch: Partial<GuestReply>) =>
    setResp((r) => ({ ...r, [name]: { ...r[name], ...patch } }));

  const close = () => setOpen(false);

  const save = async () => {
    if (!party || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      // POST one row per guest in the party. Backend upserts by
      // (site_id, email) so re-runs are safe; we synthesize a
      // per-guest email when only the party owner gave one.
      const overallStatus = anyYes ? 'attending' : 'declined';
      const replies = party.guests.map((g) => ({
        guestName: g,
        reply: resp[g] ?? { attending: 'no', meal: '', dietary: '' },
      }));
      const errs: string[] = [];
      for (let i = 0; i < replies.length; i++) {
        const { guestName, reply } = replies[i];
        const guestEmail = i === 0 ? email.trim() : (email.trim() ? `${email.trim().split('@')[0]}+${i}@${email.trim().split('@')[1] ?? 'guests.pearloom.com'}` : '');
        /* Personal guest-link token (?g= / ?guest=) rides along so
           invitation-only sites recognize the guest even before
           their email matches the list. */
        const urlToken = (() => {
          try {
            const sp = new URLSearchParams(window.location.search);
            return sp.get('g') || sp.get('guest') || undefined;
          } catch { return undefined; }
        })();
        const body = {
          siteId: siteSlug,
          guestName,
          guestToken: urlToken,
          /* "Found you" — the first reply lands on the picked
             guest-list row instead of upserting a duplicate. */
          guestId: i === 0 && matchedGuestId ? matchedGuestId : undefined,
          email: guestEmail || undefined,
          status: reply.attending === 'yes' ? 'attending' : 'declined',
          mealPreference: reply.attending === 'yes' ? reply.meal || null : null,
          dietaryRestrictions: reply.attending === 'yes' ? reply.dietary || null : null,
          songRequest: i === 0 && anyYes ? song.trim() || null : null,
          message: i === 0 ? note.trim() || null : null,
          preset: rsvpPreset,
          answers: {
            meal: reply.attending === 'yes' ? reply.meal : undefined,
            dietary: reply.attending === 'yes' ? reply.dietary : undefined,
            ...(i === 0 ? { 'song-request': song.trim() || undefined, comments: note.trim() || undefined } : {}),
          },
        };
        const res = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          errs.push(data?.error || `Couldn't save reply for ${guestName}`);
        }
      }
      if (errs.length > 0) {
        setSubmitError(errs[0]);
        setSubmitting(false);
        return;
      }
      // Broadcast for live counters / dashboards
      try {
        window.dispatchEvent(new CustomEvent('pl-rsvp-saved', { detail: { siteSlug, status: overallStatus } }));
      } catch {
        /* noop */
      }
      setStep('done');
      setSubmitting(false);
    } catch {
      setSubmitError('Couldn’t reach the server. Try again.');
      setSubmitting(false);
    }
  };

  const overlayBg = 'rgba(40,40,30,0.5)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="RSVP"
      onClick={close}
      style={{
        /* Theme-var bag first — the fixed-overlay chrome below wins
           where they collide (background). */
        ...modalThemeStyle,
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: overlayBg,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        /* Centering contract: the card's width below is
           `min(460px, calc(100vw - 24px))` — i.e. it can NEVER exceed
           this 12px-per-side padded box. If the card were allowed to
           outgrow the padded area (the old `96vw` + `padding: 20`
           combo), the auto-sized grid track overflows the container
           and start-aligns (place-content, not place-items, governs
           track placement) — which pinned the card to the left
           padding edge and clipped its right side off 390px screens. */
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, calc(100vw - 24px))',
          /* dvh so iOS Safari's collapsing URL bar can't push the
             card's bottom edge off-screen. 24px = overlay padding. */
          maxHeight: 'calc(100dvh - 24px)',
          /* The CARD never scrolls — the step content below does.
             This keeps the absolutely-positioned close button pinned
             on-screen even when meal options make a step tall. */
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
          borderRadius: 22,
          position: 'relative',
          boxShadow: 'var(--shadow-lg, 0 24px 64px rgba(0,0,0,0.25))',
          animation: 'pl-rsvp-in 240ms cubic-bezier(0.16,1,0.3,1)',
          color: 'var(--ink, var(--pl-ink, #0E0D0B))',
        }}
      >
        <style>{`@keyframes pl-rsvp-in{from{transform:scale(0.97);opacity:0}to{transform:none;opacity:1}}`}</style>
        <button
          onClick={close}
          aria-label="Close RSVP"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--cream-2, var(--pl-cream-deep, #EBE3D2))',
            zIndex: 3,
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Internal scroll region — every step renders inside this so
            long content (meal options open for a large party) scrolls
            here while the card frame + close button stay put. */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0 }}>

        {step === 'find' && (
          <div style={{ padding: '30px 28px' }}>
            <h2
              style={{
                fontFamily: 'var(--pl-font-display, var(--font-display, Fraunces, Georgia, serif))',
                fontStyle: 'italic',
                fontSize: 28,
                fontWeight: 600,
                margin: '4px 0 6px',
                color: 'var(--ink, var(--pl-ink, #0E0D0B))',
                letterSpacing: '-0.01em',
              }}
            >
              Will you join us?
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              Find your invitation to reply. Type the name on your invite.
            </p>
            <div style={fieldStyle()}>
              <label style={labelStyle()}>Your name or party</label>
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setMatchedGuestId(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') findInvite();
                }}
                placeholder="Start typing your name…"
                autoFocus
                autoComplete="off"
                style={inputStyle()}
              />
              {/* Live matches from the host's guest list — tap
                  yourself and your reply lands on YOUR row. */}
              {query.trim().length >= 2 && !matchedGuestId && nameMatches.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Guests matching your name"
                  style={{
                    marginTop: 6,
                    border: '1px solid var(--line, rgba(14,13,11,0.14))',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
                  }}
                >
                  {nameMatches.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => pickMatch(m)}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 13px',
                        border: 'none',
                        borderTop: i > 0 ? '1px solid var(--line-soft, rgba(14,13,11,0.08))' : 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink, var(--pl-ink, #0E0D0B))' }}>
                        {m.name}
                      </span>
                      {m.party && (
                        <span style={{ fontSize: 11, color: 'var(--ink-muted, var(--pl-muted, #6F6557))' }}>
                          {m.party}
                        </span>
                      )}
                      <span aria-hidden style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--pl-olive, #5C6B3F)', fontWeight: 600 }}>
                        That’s me →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={fieldStyle()}>
              <label style={labelStyle()}>Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle()}
              />
            </div>
            <button
              onClick={() => findInvite()}
              disabled={query.trim().length < 2}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '12px 18px',
                borderRadius: 999,
                background: 'var(--ink, var(--pl-ink, #0E0D0B))',
                color: 'var(--cream, var(--pl-cream, #F5EFE2))',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: query.trim().length < 2 ? 'default' : 'pointer',
                opacity: query.trim().length < 2 ? 0.5 : 1,
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              Find my invite →
            </button>
          </div>
        )}

        {step === 'notfound' && (
          <div style={{ padding: '34px 28px', textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--peach-bg, color-mix(in oklab, var(--peach-ink, #C6703D) 16%, transparent))',
                display: 'grid',
                placeItems: 'center',
                marginInline: 'auto',
                color: 'var(--peach-ink, #C6703D)',
                fontSize: 22,
              }}
            >
              ?
            </div>
            <h2
              style={{
                fontFamily: 'var(--pl-font-display, var(--font-display, Fraunces, Georgia, serif))',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 600,
                margin: '14px 0 4px',
              }}
            >
              We couldn&rsquo;t find that name
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              Check the spelling, or continue with the name you entered.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep('find')}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: '1px solid var(--line, rgba(14,13,11,0.16))',
                  color: 'var(--ink, var(--pl-ink, #0E0D0B))',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                onClick={continueAnyway}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 999,
                  background: 'var(--ink, var(--pl-ink, #0E0D0B))',
                  color: 'var(--cream, var(--pl-cream, #F5EFE2))',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Continue with &ldquo;{query.trim()}&rdquo;
              </button>
            </div>
          </div>
        )}

        {step === 'respond' && party && (
          <div style={{ padding: '28px 26px' }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--lavender-ink, var(--pl-olive, #5C6B3F))',
              }}
            >
              {party.label}
            </div>
            <h2
              style={{
                fontFamily: 'var(--pl-font-display, var(--font-display, Fraunces, Georgia, serif))',
                fontStyle: 'italic',
                fontSize: 24,
                fontWeight: 600,
                margin: '4px 0 16px',
              }}
            >
              Your reply
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {party.guests.map((g) => {
                const r = resp[g] ?? { attending: 'yes', meal: mealOptions[0] ?? 'Chicken', dietary: '' };
                return (
                  <div
                    key={g}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: 'var(--cream-2, var(--pl-cream-deep, #EBE3D2))',
                      border: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginBottom: r.attending === 'yes' ? 12 : 0,
                      }}
                    >
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{g}</span>
                      <div
                        style={{
                          display: 'flex',
                          gap: 4,
                          padding: 3,
                          background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
                          borderRadius: 999,
                          border: '1px solid var(--line, rgba(14,13,11,0.14))',
                        }}
                      >
                        {(['yes', 'no'] as const).map((v) => {
                          const active = r.attending === v;
                          const label = v === 'yes' ? 'Joyfully' : 'Regretfully';
                          return (
                            <button
                              key={v}
                              onClick={() => setGuest(g, { attending: v })}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                background: active
                                  ? v === 'yes'
                                    ? 'var(--sage-deep, var(--pl-olive-deep, #363F22))'
                                    : 'var(--ink-muted, var(--pl-muted, #6F6557))'
                                  : 'transparent',
                                color: active ? 'var(--cream, var(--pl-cream, #F5EFE2))' : 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {r.attending === 'yes' && (questionGates.mealChoice || questionGates.dietary) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {questionGates.mealChoice && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {mealOptions.map((m) => {
                            const active = r.meal === m;
                            return (
                              <button
                                key={m}
                                onClick={() => setGuest(g, { meal: m })}
                                style={{
                                  padding: '6px 11px',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  border: '1px solid',
                                  borderColor: active
                                    ? 'var(--sage-deep, var(--pl-olive-deep, #363F22))'
                                    : 'var(--line, rgba(14,13,11,0.14))',
                                  background: active
                                    ? 'var(--sage-tint, color-mix(in oklab, var(--pl-olive, #5C6B3F) 14%, transparent))'
                                    : 'var(--card, var(--pl-cream-card, #FBF7EE))',
                                  color: active
                                    ? 'var(--sage-deep, var(--pl-olive-deep, #363F22))'
                                    : 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>
                        )}
                        {questionGates.dietary && (
                        <input
                          type="text"
                          value={r.dietary}
                          onChange={(e) => setGuest(g, { dietary: e.target.value })}
                          placeholder="Allergies or dietary notes (optional)"
                          style={{ ...inputStyle(), padding: '9px 11px', fontSize: 13 }}
                        />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {anyYes && (
              <div style={{ marginTop: 14 }}>
                {questionGates.songRequest && (
                <div style={fieldStyle()}>
                  <label style={labelStyle()}>A song to get you dancing</label>
                  <input
                    type="text"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                    placeholder="e.g. At Last — Etta James"
                    style={inputStyle()}
                  />
                </div>
                )}
                <div style={fieldStyle()}>
                  <label style={labelStyle()}>A note to the {anyYes ? 'hosts' : 'couple'}</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder={anyYes ? 'Optional — say hello' : 'We\u2019ll miss you — send your love along (optional)'}
                    style={{
                      ...inputStyle(),
                      padding: '11px 13px',
                      fontSize: 13.5,
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            )}

            {submitError && (
              <div
                role="alert"
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'color-mix(in oklab, var(--pl-plum, #7A2D2D) 10%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--pl-plum, #7A2D2D) 30%, transparent)',
                  color: 'var(--pl-plum, #7A2D2D)',
                  fontSize: 13,
                }}
              >
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setStep('find')}
                disabled={submitting}
                style={{
                  flex: '0 0 auto',
                  padding: '11px 14px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: '1px solid var(--line, rgba(14,13,11,0.16))',
                  color: 'var(--ink, var(--pl-ink, #0E0D0B))',
                  fontSize: 13,
                  cursor: submitting ? 'default' : 'pointer',
                }}
                aria-label="Back"
              >
                ←
              </button>
              <button
                onClick={save}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'var(--ink, var(--pl-ink, #0E0D0B))',
                  color: 'var(--cream, var(--pl-cream, #F5EFE2))',
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting ? 0.65 : 1,
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {submitting ? 'Sending…' : 'Send our reply'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div
            style={{
              padding: '36px 28px 32px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* The confirmation ceremony — motif threads in, monogram
                settles, preset-aware copy + themed add-to-calendar.
                Replaces the old check-disc + confetti success state. */}
            <RsvpCeremony
              manifest={manifest}
              attending={anyYes}
              preset={rsvpPreset}
              onClose={close}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/** Imperative helper for any RSVP CTA to open the modal. Safe to call
 *  from event handlers; falls through silently if the modal isn't
 *  mounted (the inline #rsvp anchor still scrolls the guest). */
export function openGuestRsvpModal(): void {
  try {
    window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
  } catch {
    /* noop — SSR or sandboxed env */
  }
}

export default GuestRsvpModal;
