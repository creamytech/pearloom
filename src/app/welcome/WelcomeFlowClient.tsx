'use client';

// ─────────────────────────────────────────────────────────────
// WelcomeFlowClient — the first-run experience.
//
// Five movements on one sheet of paper:
//   00 · Arrival       — the craft-house welcome, threads draw
//   01 · The name      — what Pear should call you
//   02 · The mark      — pick an orchard avatar
//   03 · The occasion  — what brings you to the loom
//   04 · The agreement — Terms + Privacy, plainly stated
//   then: "The loom is yours." → begin a thread / open the dash
//
// Choreography: a two-strand progress thread grows across the
// top as steps complete; each movement slides in on the brand
// ease; Enter advances; reduced motion swaps all of it for
// simple fades. Name/mark/occasion are skippable — the
// agreement is the only required stop. One PATCH to
// /api/user/preferences saves everything (display_name, avatar,
// intent, terms_accepted, onboarded) at the agreement step.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { PL_AVATARS, PlAvatar } from '@/components/pearloom/avatars';
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

type StepId = 'arrival' | 'name' | 'mark' | 'occasion' | 'agreement' | 'done';
const STEPS: StepId[] = ['arrival', 'name', 'mark', 'occasion', 'agreement', 'done'];

const STEP_LABELS: Record<StepId, string> = {
  arrival: 'Welcome',
  name: '01 · The name',
  mark: '02 · The mark',
  occasion: '03 · The occasion',
  agreement: '04 · The agreement',
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

/* The promises — each one is product-verifiable, not marketing.
   (Sites stay online on every plan per the published FAQ; account
   deletion sweeps every table; everything Pear writes is editable
   in the editor.) */
const PROMISES = [
  'Everything Pear drafts, you can edit. Your words win.',
  'Your site stays online on every plan — guests are never cut off.',
  'Delete your account and your data goes with it.',
];

export function WelcomeFlowClient({
  sessionFirstName, nextHref,
}: {
  sessionFirstName: string;
  nextHref: string | null;
}) {
  const router = useRouter();
  const reduced = !!useReducedMotion();

  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const [name, setName] = useState(sessionFirstName);
  const [mark, setMark] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedRef = useRef(false);

  const goldThread = useMemo(
    () => (STEPS.indexOf(step) / (STEPS.length - 1)) * 100,
    [step],
  );

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }
  function advance() {
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
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
    const t = setTimeout(advance, reduced ? 900 : 2600);
    return () => clearTimeout(t);
  }, [step, reduced]);

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
  /* Sign-in always lands on the DASHBOARD — home base with the
     kickoff cards, never a forced march into the wizard. Starting
     a site is the explicit secondary choice below. An explicit
     ?next= deep link still wins. */
  const beginHref = nextHref ?? '/dashboard';

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
          {STEP_LABELS[step]}
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
            style={{ width: 'min(620px, 100%)', textAlign: 'center' }}
          >
            {step === 'arrival' && (
              <>
                <p style={{ fontFamily: MONO, fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: OLIVE, margin: '0 0 18px' }}>
                  A craft house for memory
                </p>
                <h1 className="pl-letterpress" style={{ fontFamily: DISPLAY, fontWeight: 500, fontStyle: 'italic', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', lineHeight: 1.04, letterSpacing: '-0.02em', margin: 0 }}>
                  Welcome to the loom{sessionFirstName ? `, ${sessionFirstName}` : ''}.
                </h1>
                <ThreadRule reduced={reduced} />
                <p style={{ fontSize: '0.95rem', color: INK_SOFT, lineHeight: 1.65, maxWidth: 460, margin: '0 auto' }}>
                  Before the first thread, a few small things — a name,
                  a mark, and what brings you here. Half a minute, no more.
                </p>
              </>
            )}

            {step === 'name' && (
              <>
                <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
                  What should Pear call you?
                </h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 26px' }}>
                  Pear is the studio hand who drafts alongside you. First names are friendlier.
                </p>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={sessionFirstName || 'Your name'}
                  maxLength={60}
                  style={{
                    width: 'min(340px, 100%)',
                    padding: '14px 18px',
                    fontSize: '1.15rem',
                    fontFamily: DISPLAY,
                    textAlign: 'center',
                    color: INK,
                    background: CARD,
                    border: `1px solid ${LINE}`,
                    borderBottom: `2px solid ${OLIVE}`,
                    borderRadius: 'var(--pl-radius-md, 0.5rem)',
                    outline: 'none',
                  }}
                />
                <Nav onBack={back} onNext={advance} nextLabel="That's me" skippable />
              </>
            )}

            {step === 'mark' && (
              <>
                <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
                  Pick your mark.
                </h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 26px' }}>
                  Hand-drawn in the house style — it stands in for you across the loom.
                  You can change it anytime, or stay with your photo.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
                  {PL_AVATARS.map((a, i) => {
                    const on = mark === a.id;
                    return (
                      <motion.button
                        key={a.id}
                        type="button"
                        onClick={() => setMark(on ? null : a.id)}
                        aria-pressed={on}
                        title={a.label}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: reduced ? 0 : 0.04 * i, ease: EASE }}
                        whileTap={{ scale: 0.94 }}
                        style={{
                          width: 58, height: 58, padding: 0,
                          borderRadius: 16,
                          border: on ? `2px solid ${OLIVE}` : '2px solid transparent',
                          background: 'transparent',
                          cursor: 'pointer',
                          boxShadow: on ? `0 0 0 2px ${PAPER}, 0 6px 14px rgba(40,28,12,0.18)` : 'none',
                          transform: on ? 'translateY(-2px)' : 'none',
                          transition: 'transform var(--pl-dur-fast, 180ms) var(--pl-ease-spring, ease)',
                        }}
                      >
                        <PlAvatar id={a.id} size={54} round={false} />
                      </motion.button>
                    );
                  })}
                </div>
                <Nav onBack={back} onNext={advance} nextLabel={mark ? 'Wear it' : 'Maybe later'} />
              </>
            )}

            {step === 'occasion' && (
              <>
                <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
                  What brings you to the loom?
                </h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 26px' }}>
                  Pear sets the table differently for each — voice, paper, the lot.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, maxWidth: 560, margin: '0 auto', textAlign: 'left' }}>
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
                          padding: '13px 15px',
                          borderRadius: 'var(--pl-radius-lg, 0.75rem)',
                          border: on ? `1.5px solid ${OLIVE}` : `1px solid ${LINE}`,
                          background: on ? 'var(--pl-olive-mist, #E0DDC9)' : CARD,
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          color: INK,
                        }}
                      >
                        <span style={{ display: 'block', fontFamily: DISPLAY, fontSize: '1rem', fontWeight: 600 }}>{o.label}</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: MUTED, marginTop: 2 }}>{o.sub}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <Nav onBack={back} onNext={advance} nextLabel={intent ? 'Continue' : 'Skip for now'} />
              </>
            )}

            {step === 'agreement' && (
              <>
                <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 'clamp(1.7rem, 4.5vw, 2.5rem)', letterSpacing: '-0.015em', margin: '0 0 10px' }}>
                  The agreement, plainly.
                </h2>
                <p style={{ fontSize: '0.88rem', color: INK_SOFT, margin: '0 0 24px' }}>
                  The fine print lives in the{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" style={{ color: OLIVE, fontWeight: 600 }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: OLIVE, fontWeight: 600 }}>Privacy Policy</a>.
                  The spirit of it fits on a card:
                </p>
                <div
                  style={{
                    background: CARD,
                    border: `1px solid ${LINE}`,
                    borderRadius: 'var(--pl-radius-lg, 0.75rem)',
                    padding: 'clamp(18px, 4vw, 28px)',
                    maxWidth: 460,
                    margin: '0 auto 18px',
                    textAlign: 'left',
                  }}
                >
                  {PROMISES.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < PROMISES.length - 1 ? `1px solid var(--pl-divider-soft, #E5DCC4)` : 'none' }}>
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.88rem', lineHeight: 1.55, color: INK_SOFT }}>{p}</span>
                    </div>
                  ))}
                </div>
                <label
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    fontSize: '0.86rem', color: INK, cursor: 'pointer', userSelect: 'none',
                    padding: '8px 4px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    style={{ width: 17, height: 17, accentColor: OLIVE }}
                  />
                  I agree to the Terms of Service and Privacy Policy.
                </label>
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
                  {mark ? <PlAvatar id={mark} size={64} /> : (
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--pl-olive-mist, #E0DDC9)', display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 26, fontWeight: 600, color: OLIVE }}>
                      {firstName[0]?.toUpperCase() ?? 'P'}
                    </div>
                  )}
                </div>
                <h1 className="pl-letterpress" style={{ fontFamily: DISPLAY, fontWeight: 500, fontStyle: 'italic', fontSize: 'clamp(2rem, 5.5vw, 3.2rem)', lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}>
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
                    onClick={() => router.replace(beginHref)}
                    className="pl-pearl-accent"
                    style={{
                      padding: '13px 26px',
                      borderRadius: 'var(--pl-radius-full, 100px)',
                      fontWeight: 600, fontSize: '0.92rem',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Step into your loom
                  </button>
                  <button
                    type="button"
                    onClick={() => router.replace('/wizard/new')}
                    style={{
                      padding: '13px 22px',
                      borderRadius: 'var(--pl-radius-full, 100px)',
                      fontWeight: 600, fontSize: '0.88rem',
                      background: 'transparent', color: INK_SOFT,
                      border: `1px solid ${LINE}`, cursor: 'pointer', fontFamily: 'inherit',
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

function Nav({
  onBack, onNext, nextLabel, nextDisabled = false, skippable = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  skippable?: boolean;
}) {
  void skippable;
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
