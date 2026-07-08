'use client';

// ─────────────────────────────────────────────────────────────
// WelcomeFlowClient — "The First Pressing of You"
// (ONBOARDING-PLAN O2 — the flow re-pressed, 2026-07-08).
//
// Onboarding is the first thing Pearloom presses, and the thing
// it presses is you. Six movements on one sheet of paper:
//   00 · Arrival        — the craft-house welcome, threads draw
//   01 · The name       — typed AS letterpress; the input is the
//                         artifact, pressing into the sheet live
//   02 · The mark       — three ways to fill one frame: a
//                         photograph (circular drag-to-seat), an
//                         orchard mark, or the monogram seal
//                         already pressed from your name — nobody
//                         leaves blank
//   03 · The first thread — occasion chips + a live miniature
//                         pressing that re-presses per pick
//   04 · The agreement  — signed by PRESSING YOUR
//                         SEAL (the one required stop)
//   then: "The loom is yours." → ThreadingDoor ("Warping your
//   loom.") → dashboard / demo / wizard.
//
// Choreography: two-strand progress thread, Enter advances,
// weave-eased movements, reduced motion swaps to fades. One
// PATCH to /api/user/preferences saves name/mark/intent/
// agreement at the colophon; a photograph saves immediately via
// /api/user/avatar (it is already the user's own deliberate act).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { PL_AVATARS, PlAvatar, AccountMark, MonogramSeal, monogramFrom, useUserAvatar } from '@/components/pearloom/avatars';
import { AvatarCropModal } from '@/components/pearloom/dash/AvatarCropModal';
import { ThreadingDoor } from '@/components/brand/ThreadingDoor';
import { Icon } from '@/components/pearloom/motifs';
import { trackEvent } from '@/lib/analytics/beacon';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PAPER = 'var(--pl-cream, #F5EFE2)';
const CARD = 'var(--pl-cream-card, #FBF7EE)';
const INK = 'var(--pl-ink, #0E0D0B)';
const INK_SOFT = 'var(--pl-ink-soft, #3A332C)';
const MUTED = 'var(--pl-muted, #6F6557)';
const OLIVE = 'var(--pl-olive, #5C6B3F)';
const GOLD = 'var(--pl-gold, #B8935A)';
const LINE = 'var(--pl-divider, #D8CFB8)';
const DISPLAY = 'var(--pl-font-display, "Fraunces", Georgia, serif)';
const BODY = 'var(--pl-font-body, system-ui, sans-serif)';
const MONO = 'var(--pl-font-mono, ui-monospace, "Geist Mono", monospace)';
/* Letterpress — type sits INTO the paper (the landing recipe). */
const PRESSED = '0 1px 1px rgba(255,255,255,0.85), 0 -1px 1px rgba(38,35,28,0.16)';

type StepId = 'arrival' | 'name' | 'mark' | 'people' | 'occasion' | 'agreement' | 'done';

/* Folio names — numbered positionally at render time, since the
   "Your people" movement only appears when someone is waiting. */
const STEP_LABELS: Record<StepId, string> = {
  arrival: 'Welcome',
  name: 'The name',
  mark: 'The mark',
  people: 'Your people',
  occasion: 'The first thread',
  agreement: 'The agreement',
  done: 'Begin',
};

const INTENTS: Array<{ id: string; label: string; sub: string }> = [
  { id: 'wedding',    label: 'A wedding',        sub: 'Or the whole weekend around one' },
  { id: 'engagement', label: 'An engagement',    sub: 'The announcement, the party' },
  { id: 'baby',       label: 'A baby on the way', sub: 'Showers, reveals, sip & sees' },
  { id: 'birthday',   label: 'A birthday',       sub: 'Milestones, sweet sixteens' },
  { id: 'reunion',    label: 'A reunion',        sub: 'Family, class, old friends' },
  { id: 'memorial',   label: 'A life to honor',  sub: 'Memorials, celebrations of life' },
  { id: 'exploring',  label: 'Just looking',     sub: 'Wander the loom first' },
];

/* The miniature pressing per intent — eyebrow / italic pre-line /
   ghost name-line / accent wax. Picking a chip re-presses the card
   so "Pear sets the table differently" is SHOWN, not claimed. */
const PRESSINGS: Record<string, { eyebrow: string; pre: string; ghost: string; acc: string }> = {
  wedding:    { eyebrow: 'Save the date',     pre: 'together, at last',        ghost: 'Your two names',  acc: '#B8754A' },
  engagement: { eyebrow: 'We’re engaged',     pre: 'the beginning of always',  ghost: 'Your two names',  acc: '#C0543B' },
  baby:       { eyebrow: 'Someone small',     pre: 'is on the way',            ghost: 'The little one',  acc: '#8B7FA8' },
  birthday:   { eyebrow: 'A milestone',       pre: 'another year, well worn',  ghost: 'The guest of honor', acc: '#9A7838' },
  reunion:    { eyebrow: 'The reunion',       pre: 'long time, no toast',      ghost: 'The whole crew',  acc: '#586A3C' },
  memorial:   { eyebrow: 'In loving memory',  pre: 'a life, gathered',         ghost: 'A beloved name',  acc: '#5A5044' },
  exploring:  { eyebrow: 'The demo',          pre: 'wander first, decide later', ghost: 'Any day at all', acc: '#6F6557' },
};

/* The promises — each one is product-verifiable, not marketing. */
const PROMISES = [
  'Everything Pear drafts, you can edit. Your words win.',
  'Your site stays online on every plan — guests are never cut off.',
  'Delete your account and your data goes with it.',
];

export function WelcomeFlowClient({
  sessionFirstName, nextHref, previewIncoming,
}: {
  sessionFirstName: string;
  nextHref: string | null;
  /** Dev-harness only — seeds the "Your people" movement without a
   *  session so the envelopes can be screenshot-verified. */
  previewIncoming?: Array<{ firstName: string; otherId: string }>;
}) {
  const router = useRouter();
  const reduced = !!useReducedMotion();

  const [stepIndex, setStepIndex] = useState(0);
  /* O3 — THE AWAITED ARRIVAL. If someone wove this person in before
     they ever signed up (SOCIAL-PLAN S1's email-keyed invite), their
     pending requests are waiting on first sign-in. The arrival sheet
     is addressed, and a "Your people" movement of sealed envelopes
     appears after the mark. Frozen once the walker passes the mark
     so a slow fetch never shifts the ground underfoot. */
  const [incoming, setIncoming] = useState<Array<{ firstName: string; otherId: string }>>(previewIncoming ?? []);
  const stepIndexRef = useRef(0);
  stepIndexRef.current = stepIndex;
  useEffect(() => {
    if (previewIncoming) return;
    const ctrl = new AbortController();
    fetch('/api/friends', { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { incoming?: Array<{ firstName: string; otherId: string }> } | null) => {
        // Only seat the movement if the walker hasn't passed the mark.
        if (d?.incoming?.length && stepIndexRef.current <= 2) setIncoming(d.incoming);
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const STEPS = useMemo<StepId[]>(
    () => (incoming.length > 0
      ? ['arrival', 'name', 'mark', 'people', 'occasion', 'agreement', 'done']
      : ['arrival', 'name', 'mark', 'occasion', 'agreement', 'done']),
    [incoming.length],
  );
  const step = STEPS[stepIndex];
  const stepsRef = useRef(STEPS);
  stepsRef.current = STEPS;
  const [name, setName] = useState(sessionFirstName);
  const [mark, setMark] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef(false);
  /* M7 — the threshold out. */
  const [leaving, setLeaving] = useState(false);
  /* M3 — the photograph path (immediate save; the mark/name ride
     the single PATCH at the colophon). setAvatarUrl syncs the
     shared chrome cache so the dashboard face is right on arrival. */
  const { setAvatarUrl } = useUserAvatar();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  const goldThread = useMemo(
    () => (STEPS.indexOf(step) / (STEPS.length - 1)) * 100,
    [step, STEPS],
  );

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);
  const advance = useCallback(() => {
    setStepIndex((i) => Math.min(stepsRef.current.length - 1, i + 1));
  }, []);
  /* Accept a waiting request — the envelope's "Keep them". "Not
     now" simply dismisses locally: the request stays pending in
     their Circle, undecided rather than declined (calm law 7 —
     onboarding is a welcome, not a judgment). */
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<Set<string>>(new Set());
  function keepPerson(otherId: string) {
    setKept((prev) => new Set(prev).add(otherId));
    void fetch('/api/friends', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', otherPersonId: otherId }),
    }).catch(() => {});
  }

  // Activation instrumentation (Pillar 20) — welcome-flow funnel
  // beacons: one on entry, one per movement, so drop-off between
  // steps is finally measurable. Non-blocking + SSR-guarded.
  useEffect(() => { trackEvent('welcome_started'); }, []);
  useEffect(() => { trackEvent('welcome_step', { step }); }, [step]);

  // The arrival movement breathes for a beat, then walks forward
  // on its own — it's an overture, not a gate.
  useEffect(() => {
    if (step !== 'arrival') return;
    const t = setTimeout(advance, reduced ? 900 : incoming.length > 0 ? 3400 : 2600);
    return () => clearTimeout(t);
  }, [step, reduced, incoming.length, advance]);

  async function uploadCropped(blob: Blob) {
    setUploading(true);
    setPhotoErr(null);
    try {
      const fd = new FormData();
      fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      const r = await fetch('/api/user/avatar', { method: 'POST', credentials: 'include', body: fd });
      const d = (await r.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (r.ok && d?.ok && d.url) {
        setPhotoUrl(d.url);
        setAvatarUrl(d.url);
        setMark(null); // the photograph leads the chain
        setCropFile(null);
      } else {
        setPhotoErr(d?.error ?? 'Could not save your photo.');
      }
    } catch {
      setPhotoErr('Could not save — check your connection.');
    } finally {
      setUploading(false);
    }
  }
  function pickMark(id: string | null) {
    setMark(id);
    if (id && photoUrl) {
      /* An explicit mark pick retires the photograph — same rule as
         Settings; the chain would otherwise hide the pick. */
      setPhotoUrl(null);
      setAvatarUrl(null);
      void fetch('/api/user/avatar', { method: 'DELETE', credentials: 'include' }).catch(() => {});
    }
  }

  async function confirmAgreement() {
    if (!agreed || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: name.trim() || null,
          avatar: mark,
          intent,
          terms_accepted: true,
          onboarded: true,
        }),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);
      savedRef.current = true;
      advance();
    } catch {
      setSaveError('The thread slipped — try once more?');
    } finally {
      setSaving(false);
    }
  }

  const firstName = name.trim().split(/\s+/)[0] || 'friend';
  /* Sign-in lands on the DASHBOARD — home base with the kickoff
     cards, never a forced march into the wizard. Explorers get the
     fully-rendered /demo. An explicit ?next= deep link wins. */
  const beginHref = nextHref ?? (intent === 'exploring' ? '/demo' : '/dashboard');

  /* M7 — leave through the threshold, not a route flash. */
  function depart(href: string) {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.replace(href), reduced ? 300 : 1000);
  }

  // Enter advances wherever a primary action is live.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      if (step === 'name' || step === 'mark' || step === 'occasion') advance();
      else if (step === 'agreement') void confirmAgreement();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, agreed, saving, name, mark, intent]);

  const enter = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -14 },
      };

  const h2Style: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontWeight: 460,
    fontSize: 'clamp(1.9rem, 5vw, 2.7rem)',
    letterSpacing: '-0.02em',
    lineHeight: 1.06,
    margin: '0 0 10px',
    textShadow: PRESSED,
    fontVariationSettings: "'opsz' 96, 'SOFT' 50, 'WONK' 0",
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: PAPER,
        color: INK,
        fontFamily: BODY,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* The grain — fixed, warm, never animated. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'radial-gradient(rgba(14,13,11,0.028) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          pointerEvents: 'none',
          mixBlendMode: 'multiply',
        }}
      />

      {/* The progress thread — two strands growing across the top. */}
      <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 5, display: 'grid', gap: 2 }}>
        <div style={{ height: 1.5, background: OLIVE, width: `${goldThread}%`, transition: reduced ? 'none' : `width 700ms ${'cubic-bezier(0.22, 1, 0.36, 1)'}` }} />
        <div style={{ height: 1, background: GOLD, opacity: 0.7, width: `${Math.max(0, goldThread - 4)}%`, transition: reduced ? 'none' : 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </div>

      {/* Header — wordmark + step folio. */}
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(18px, 3vw, 28px) clamp(20px, 5vw, 48px) 0',
          position: 'relative', zIndex: 1,
        }}
      >
        <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
          Pearloom
        </span>
        <span style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: MUTED }}>
          {stepIndex > 0 && stepIndex < STEPS.length - 1
            ? `0${stepIndex} · ${STEP_LABELS[step]}`
            : STEP_LABELS[step]}
        </span>
      </header>

      {/* The movements. */}
      <main
        style={{
          flex: 1, display: 'grid', placeItems: 'center',
          padding: 'clamp(20px, 4vw, 40px)', position: 'relative', zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            {...enter}
            transition={{ duration: reduced ? 0.2 : 0.5, ease: EASE }}
            style={{ width: 'min(640px, 100%)', textAlign: 'center' }}
          >
            {step === 'arrival' && (
              <>
                <p style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: OLIVE, margin: '0 0 18px' }}>
                  A craft house for memory
                </p>
                <h1 className="pl-type-press" style={{ fontFamily: DISPLAY, fontWeight: 460, fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', lineHeight: 1.04, margin: 0, textShadow: PRESSED }}>
                  Welcome to the loom{sessionFirstName ? `, ${sessionFirstName}` : ''}.
                </h1>
                <ThreadRule reduced={reduced} />
                <p style={{ fontSize: '0.95rem', color: INK_SOFT, lineHeight: 1.65, maxWidth: 460, margin: '0 auto' }}>
                  Before the first thread, a few small things — a name,
                  a mark, and what brings you here. Half a minute, no more.
                </p>
                {incoming.length > 0 && (
                  <motion.p
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: reduced ? 0 : 0.7, ease: EASE }}
                    style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: '1.02rem', color: OLIVE, marginTop: 16 }}
                  >
                    {incoming.length === 1
                      ? `${incoming[0].firstName} is keeping you a seat.`
                      : `${incoming[0].firstName} and ${incoming.length - 1} other${incoming.length > 2 ? 's' : ''} are keeping you a seat.`}
                  </motion.p>
                )}
              </>
            )}

            {step === 'name' && (
              <>
                <h2 style={h2Style}>What should Pear call you?</h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 30px' }}>
                  Pear is the studio hand who drafts alongside you. First names are friendlier.
                </p>
                {/* The input IS the artifact — the name letterpresses
                    into the sheet as it's typed, display scale, a gold
                    hairline underneath. No box; the paper is the field. */}
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={sessionFirstName || 'Your name'}
                  maxLength={60}
                  aria-label="Your name"
                  style={{
                    width: 'min(440px, 100%)',
                    padding: '4px 10px 12px',
                    fontSize: 'clamp(2rem, 6vw, 2.9rem)',
                    fontFamily: DISPLAY,
                    fontStyle: 'italic',
                    fontWeight: 460,
                    letterSpacing: '-0.02em',
                    textAlign: 'center',
                    color: INK,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${GOLD}`,
                    borderRadius: 0,
                    outline: 'none',
                    caretColor: OLIVE,
                    textShadow: PRESSED,
                    fontVariationSettings: "'opsz' 144, 'SOFT' 70, 'WONK' 1",
                  }}
                />
                <div style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: MUTED, marginTop: 10 }}>
                  Set in letterpress, like everything here
                </div>
                <Nav onBack={back} onNext={advance} nextLabel="That's me" />
              </>
            )}

            {step === 'mark' && (
              <>
                <h2 style={h2Style}>Your mark.</h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 22px', maxWidth: 460, marginInline: 'auto' }}>
                  Three ways to fill one frame — a photograph, a hand-drawn
                  mark, or the seal already pressed from your name. Nobody
                  goes blank.
                </p>

                {/* The frame — whatever currently leads the chain,
                    large. Skipping keeps the monogram seal. */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <AccountMark photoUrl={photoUrl} markId={mark} name={name || sessionFirstName} size={84} />
                  <div style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: MUTED }}>
                    {photoUrl ? 'Your photograph' : mark ? 'Your mark' : `Your seal — pressed from “${monogramFrom(name || sessionFirstName)}”`}
                  </div>
                </div>

                {/* Way one — a photograph, circularly seated. */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '10px 18px', borderRadius: 999, cursor: 'pointer',
                      border: `1px solid ${LINE}`, background: CARD,
                      fontSize: '0.85rem', fontWeight: 600, color: INK,
                    }}
                  >
                    <Icon name="camera" size={14} color={INK_SOFT} />
                    {photoUrl ? 'Change the photograph' : 'Use a photograph'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setPhotoErr(null); setCropFile(f); }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {photoErr && <div style={{ fontSize: '0.78rem', color: 'var(--pl-plum, #7A2D2D)', marginBottom: 12 }}>{photoErr}</div>}

                {/* Way two — the orchard marks. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 460, margin: '0 auto' }}>
                  {PL_AVATARS.map((a, i) => {
                    const on = mark === a.id;
                    return (
                      <motion.button
                        key={a.id}
                        type="button"
                        onClick={() => pickMark(on ? null : a.id)}
                        aria-pressed={on}
                        title={a.label}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: reduced ? 0 : 0.03 * i, ease: EASE }}
                        whileTap={{ scale: 0.94 }}
                        style={{
                          width: 54, height: 54, padding: 0,
                          borderRadius: 16,
                          border: on ? `2px solid ${OLIVE}` : '2px solid transparent',
                          background: 'transparent',
                          cursor: 'pointer',
                          boxShadow: on ? `0 0 0 2px ${PAPER}, 0 6px 14px rgba(40,28,12,0.18)` : 'none',
                          transform: on ? 'translateY(-2px)' : 'none',
                          transition: 'transform var(--pl-dur-fast, 180ms) var(--pl-ease-spring, ease)',
                        }}
                      >
                        <PlAvatar id={a.id} size={50} round={false} />
                      </motion.button>
                    );
                  })}
                </div>
                <Nav
                  onBack={back}
                  onNext={advance}
                  nextLabel={photoUrl || mark ? 'Wear it' : 'Keep my seal'}
                />
              </>
            )}

            {step === 'people' && (
              <>
                <h2 style={h2Style}>Your people.</h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 26px', maxWidth: 440, marginInline: 'auto' }}>
                  {incoming.length === 1
                    ? 'Someone was waiting for you to arrive — a sealed note, first names only.'
                    : 'Some people were waiting for you to arrive — sealed notes, first names only.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400, margin: '0 auto' }}>
                  {incoming.map((r, i) => {
                    const isOpen = opened.has(r.otherId);
                    const isKept = kept.has(r.otherId);
                    return (
                      <motion.div
                        key={r.otherId}
                        initial={reduced ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: reduced ? 0 : 0.08 * i, ease: EASE }}
                      >
                        {!isOpen ? (
                          /* Sealed — an envelope with a wax seal; tap
                             to break it. */
                          <button
                            type="button"
                            onClick={() => setOpened((prev) => new Set(prev).add(r.otherId))}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                              padding: '16px 18px', borderRadius: 10, cursor: 'pointer',
                              backgroundImage: 'repeating-linear-gradient(0deg, rgba(38,35,28,0.028) 0 1px, transparent 1px 3px), linear-gradient(150deg, #fdfaf0, #f5ecda)',
                              border: `1px solid ${LINE}`,
                              boxShadow: '0 10px 26px -14px rgba(40,28,12,0.35), 0 1px 0 rgba(255,255,255,0.7) inset',
                              fontFamily: 'inherit', textAlign: 'left',
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                display: 'grid', placeItems: 'center',
                                /* Flat olive seal — no sphere gloss. */
                                background: OLIVE,
                                color: 'var(--pl-cream, #F5EFE2)',
                                fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16,
                              }}
                            >
                              {r.firstName[0]?.toUpperCase() ?? '·'}
                            </span>
                            <span style={{ flex: 1 }}>
                              <span style={{ display: 'block', fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED }}>
                                A sealed note
                              </span>
                              <span style={{ display: 'block', fontFamily: DISPLAY, fontStyle: 'italic', fontSize: '1.05rem', color: INK, marginTop: 2 }}>
                                From {r.firstName}
                              </span>
                            </span>
                            <span style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD }}>
                              Break the seal
                            </span>
                          </button>
                        ) : (
                          /* Open — the note + keep/not-now. */
                          <div
                            style={{
                              padding: '16px 18px', borderRadius: 10,
                              background: CARD, border: `1px solid ${isKept ? OLIVE : LINE}`,
                              textAlign: 'left',
                            }}
                          >
                            <div style={{ fontFamily: DISPLAY, fontSize: '1rem', color: INK, marginBottom: 4 }}>
                              <em style={{ color: OLIVE }}>{r.firstName}</em> would keep you in their circle.
                            </div>
                            <div style={{ fontSize: '0.78rem', color: MUTED, marginBottom: 12 }}>
                              First names only, and only what you both choose to share.
                            </div>
                            {isKept ? (
                              <div style={{ fontFamily: MONO, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: OLIVE }}>
                                ✓ Woven in
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => keepPerson(r.otherId)}
                                  style={{
                                    padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                                    background: OLIVE, color: 'var(--pl-cream, #F5EFE2)',
                                    fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
                                  }}
                                >
                                  Keep them
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOpened((prev) => { const n = new Set(prev); n.delete(r.otherId); return n; })}
                                  style={{
                                    padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                                    border: `1px solid ${LINE}`, background: 'transparent',
                                    color: MUTED, fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
                                  }}
                                >
                                  Not now
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                <Nav onBack={back} onNext={advance} nextLabel={kept.size > 0 ? 'Continue' : 'Decide later'} />
              </>
            )}

            {step === 'occasion' && (
              <>
                <h2 style={h2Style}>What brings you to the loom?</h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 26px' }}>
                  Pear sets the table differently for each — watch the pressing.
                </p>
                <div className="pl-wf-occasion" style={{ display: 'flex', gap: 22, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, maxWidth: 360, flex: '1 1 300px', textAlign: 'left' }}>
                    {INTENTS.map((o, i) => {
                      const on = intent === o.id;
                      return (
                        <motion.button
                          key={o.id}
                          type="button"
                          onClick={() => setIntent(on ? null : o.id)}
                          aria-pressed={on}
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: reduced ? 0 : 0.05 * i, ease: EASE }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            padding: '11px 13px',
                            borderRadius: 'var(--pl-radius-lg, 0.75rem)',
                            border: on ? `1.5px solid ${OLIVE}` : `1px solid ${LINE}`,
                            background: on ? 'var(--pl-olive-mist, #E0DDC9)' : CARD,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            color: INK,
                          }}
                        >
                          <span style={{ display: 'block', fontFamily: DISPLAY, fontSize: '0.95rem', fontWeight: 600 }}>{o.label}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: MUTED, marginTop: 2 }}>{o.sub}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  {/* The live miniature — a pressed card in the picked
                      key. Re-presses (fade) when the intent changes. */}
                  <MiniPressing intent={intent} reduced={reduced} />
                </div>
                <Nav onBack={back} onNext={advance} nextLabel={intent ? 'Continue' : 'Skip for now'} />
              </>
            )}

            {step === 'agreement' && (
              <>
                <h2 style={h2Style}>The agreement.</h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 24px' }}>
                  The fine print lives in the{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" style={{ color: OLIVE, fontWeight: 600 }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: OLIVE, fontWeight: 600 }}>Privacy Policy</a>.
                  The spirit of it is set below, printer&rsquo;s style:
                </p>
                {/* The colophon card — gold-ruled top and bottom, the
                    promises set as the edition notes. */}
                <div
                  style={{
                    background: CARD,
                    borderTop: `1px solid ${GOLD}`,
                    borderBottom: `1px solid ${GOLD}`,
                    padding: 'clamp(18px, 4vw, 26px) clamp(14px, 3vw, 24px)',
                    maxWidth: 460,
                    margin: '0 auto 22px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: MUTED, textAlign: 'center', marginBottom: 12 }}>
                    Set &amp; pressed by Pearloom · Edition of one
                  </div>
                  {PROMISES.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < PROMISES.length - 1 ? `1px solid var(--pl-divider-soft, #E5DCC4)` : 'none' }}>
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.88rem', lineHeight: 1.55, color: INK_SOFT }}>{p}</span>
                    </div>
                  ))}
                </div>

                {/* The seal — agreement is PRESSED, not checkbox'd. A
                    real toggle underneath (role=checkbox, Space/Enter,
                    aria-checked) — the ceremony is visual only. */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={agreed}
                    aria-label="Press your seal to agree to the Terms of Service and Privacy Policy"
                    onClick={() => setAgreed((v) => !v)}
                    style={{
                      width: 66, height: 66, borderRadius: '50%',
                      cursor: 'pointer', padding: 0,
                      fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 500,
                      fontSize: 22, lineHeight: 1,
                      display: 'grid', placeItems: 'center',
                      transition: 'transform 160ms var(--pl-ease-spring, ease), box-shadow 200ms ease',
                      ...(agreed
                        ? {
                            border: 'none',
                            /* Flat olive seal with a stamped inner rim —
                               a pressed mark, not a glossy sphere. */
                            background: OLIVE,
                            color: 'var(--pl-cream, #F5EFE2)',
                            boxShadow: 'inset 0 0 0 3px rgba(245,239,226,0.25), 0 6px 16px -6px rgba(40,28,12,0.45)',
                            transform: 'scale(1)',
                          }
                        : {
                            border: `1.5px dashed ${GOLD}`,
                            background: 'transparent',
                            color: MUTED,
                          }),
                    }}
                  >
                    {agreed ? monogramFrom(name || sessionFirstName) : ''}
                  </button>
                  <div style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: agreed ? OLIVE : MUTED }}>
                    {agreed ? 'Sealed' : 'Press your seal to agree'}
                  </div>
                </div>
                {saveError && (
                  <div role="alert" style={{ fontSize: '0.78rem', color: 'var(--pl-plum, #7A2D2D)', marginTop: 8 }}>{saveError}</div>
                )}
                <Nav
                  onBack={back}
                  onNext={() => void confirmAgreement()}
                  nextLabel={saving ? 'Threading…' : 'Agree & continue'}
                  nextDisabled={!agreed || saving}
                />
              </>
            )}

            {step === 'done' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <AccountMark photoUrl={photoUrl} markId={mark} name={name || sessionFirstName} size={68} />
                </div>
                <h1 className="pl-type-press" style={{ fontFamily: DISPLAY, fontWeight: 460, fontStyle: 'italic', fontSize: 'clamp(2rem, 5.5vw, 3.2rem)', lineHeight: 1.05, margin: 0, textShadow: PRESSED }}>
                  The loom is yours, {firstName}.
                </h1>
                <ThreadRule reduced={reduced} />
                <p style={{ fontSize: '0.92rem', color: INK_SOFT, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 28px' }}>
                  {intent === 'memorial'
                    ? 'We’ll move gently. Begin whenever it feels right.'
                    : 'Your loom is set up and waiting — and whenever you’re ready, Pear drafts a first site in about twenty seconds, every word of it yours to change.'}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => depart(beginHref)}
                    disabled={leaving}
                    className="pl-pearl-accent"
                    style={{
                      padding: '13px 26px',
                      borderRadius: 'var(--pl-radius-full, 100px)',
                      fontWeight: 600, fontSize: '0.92rem',
                      border: 'none', cursor: leaving ? 'wait' : 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {intent === 'exploring' ? 'Wander a finished site' : 'Step into your loom'}
                  </button>
                  <button
                    type="button"
                    onClick={() => depart('/wizard/new')}
                    disabled={leaving}
                    style={{
                      padding: '13px 22px',
                      borderRadius: 'var(--pl-radius-full, 100px)',
                      fontWeight: 600, fontSize: '0.88rem',
                      background: 'transparent', color: INK_SOFT,
                      border: `1px solid ${LINE}`, cursor: leaving ? 'wait' : 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Begin a site right away
                  </button>
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* Footer folio. */}
      <footer style={{ textAlign: 'center', padding: '0 24px clamp(18px, 3vw, 28px)', position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: MONO, fontSize: '0.55rem', letterSpacing: '0.26em', textTransform: 'uppercase', color: MUTED, opacity: 0.7 }}>
          Woven, not built
        </span>
      </footer>

      {/* M3 — seat the photograph. */}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          busy={uploading}
          onCancel={() => { if (!uploading) setCropFile(null); }}
          onSave={(blob) => void uploadCropped(blob)}
        />
      )}

      {/* M7 — the threshold out. */}
      {leaving && <ThreadingDoor label="Warping your loom." />}
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────── */

function ThreadRule({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 3, width: 'min(180px, 40vw)', margin: '22px auto' }}>
      {[{ c: OLIVE, d: 0.25, o: 0.9 }, { c: GOLD, d: 0.4, o: 0.7 }].map((s, i) => (
        <motion.span
          key={i}
          initial={reduced ? false : { scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: s.o }}
          transition={{ duration: 0.9, delay: reduced ? 0 : s.d, ease: EASE }}
          style={{ display: 'block', height: 1, background: s.c, transformOrigin: '50% 50%' }}
        />
      ))}
    </div>
  );
}

/* The live miniature pressing — a small save-the-date in the picked
   intent's key. Not a claim ("Pear adapts") but a demonstration:
   pick a chip, the card re-presses. Static schematic, real type. */
function MiniPressing({ intent, reduced }: { intent: string | null; reduced: boolean }) {
  const p = PRESSINGS[intent ?? 'wedding'] ?? PRESSINGS.wedding;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={intent ?? 'default'}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE }}
        aria-hidden
        style={{
          width: 210,
          flexShrink: 0,
          aspectRatio: '4 / 5',
          borderRadius: 8,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(38,35,28,0.028) 0 1px, transparent 1px 3px), linear-gradient(150deg, #fdfaf0, #f5ecda)',
          boxShadow: '0 18px 44px -18px rgba(40,28,12,0.4), 0 1px 0 rgba(255,255,255,0.7) inset, 0 0 0 1px rgba(120,90,50,0.14)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          padding: '20px 16px',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        {/* Foil hairline, inset. */}
        <span style={{ position: 'absolute', inset: 9, border: '1px solid rgba(193,154,75,0.45)', pointerEvents: 'none' }} />
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: '0.26em', textTransform: 'uppercase', color: p.acc }}>
          {p.eyebrow}
        </span>
        <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 11, color: '#6F6557' }}>
          {p.pre}
        </span>
        <span
          style={{
            fontFamily: DISPLAY, fontWeight: 460, fontSize: 17, lineHeight: 1.1,
            letterSpacing: '-0.02em', color: '#C8BFA5',
            textShadow: '0 1px 1px rgba(255,255,255,0.85)',
            fontVariationSettings: "'opsz' 144, 'SOFT' 70, 'WONK' 0",
          }}
        >
          {p.ghost}
        </span>
        {/* The sprig divider. */}
        <svg width="84" height="12" viewBox="0 0 84 12" aria-hidden>
          <line x1="2" y1="6" x2="82" y2="6" stroke={p.acc} strokeWidth="0.8" opacity="0.7" />
          <circle cx="42" cy="6" r="2.2" fill="#C19A4B" />
        </svg>
        <span style={{ fontFamily: MONO, fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6F6557' }}>
          A day worth keeping
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

function Nav({
  onBack, onNext, nextLabel, nextDisabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', marginTop: 30 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '11px 18px',
          borderRadius: 'var(--pl-radius-full, 100px)',
          background: 'transparent', color: MUTED,
          border: 'none', cursor: 'pointer',
          fontSize: '0.85rem', fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          padding: '12px 26px',
          borderRadius: 'var(--pl-radius-full, 100px)',
          background: INK, color: PAPER,
          border: 'none',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          opacity: nextDisabled ? 0.45 : 1,
          fontSize: '0.9rem', fontWeight: 600, fontFamily: 'inherit',
          transition: 'opacity var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease)',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
