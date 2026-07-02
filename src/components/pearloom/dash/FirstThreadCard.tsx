'use client';

// ─────────────────────────────────────────────────────────────
// FirstThreadCard — the first thread, woven step by step.
//
// A self-checking guided path for brand-new hosts on the
// dashboard home. NOT a tooltip tour: five steps on a vertical
// thread spine that check themselves off from real data and
// deep-link into the product.
//
// Purely presentational (the cockpit rule): WelcomeHome derives
// every `done` boolean from data it already has in scope —
// useSelectedSite's manifest + the /api/guests counts — and this
// card renders them. No fetches here.
//
// Visibility (owned by WelcomeHome): mounts only while the host
// is genuinely new (≤ 1 site, 'pl-first-thread-done' unset).
// When all five steps are woven the card renders once more in a
// quiet "Woven" state with a Dismiss that persists.
//
// Steps:
//   1. Press your first site       → /wizard/new
//   2. Make it yours               → /editor/{slug}?jump=hero
//   3. Invite your guests          → /dashboard/rsvp
//   4. Send the word (publish)     → /editor/{slug}?jump=share
//   5. The day-of room             → /dashboard/day-of (quiet)
//
// Solemn occasions (memorial / funeral voice) re-key the copy:
// "Gather your people", "Share the site", "The day itself".
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { Icon } from '../motifs';

export interface FirstThreadDone {
  /** A site exists at all. */
  site: boolean;
  /** The site carries a cover photo or an authored story body. */
  madeYours: boolean;
  /** At least one guest is on the list. */
  invited: boolean;
  /** The site has been pressed live. */
  published: boolean;
  /** The event date is today or past. */
  dayArrived: boolean;
}

interface Step {
  key: string;
  label: string;
  /** Muted supporting line, shown while the step is open. */
  sub?: string;
  done: boolean;
  /** CTA for the current step. Quiet steps render a text link. */
  cta?: { label: string; href: string; quiet?: boolean };
}

const monoEyebrow: React.CSSProperties = {
  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--pl-olive, #5C6B3F)',
  whiteSpace: 'nowrap',
};

export function FirstThreadCard({
  done,
  siteSlug,
  solemn = false,
  onDismiss,
}: {
  done: FirstThreadDone;
  /** Active site's slug for the editor deep links (null pre-site). */
  siteSlug: string | null;
  /** Memorial / funeral voice — softer verbs, no "invite". */
  solemn?: boolean;
  /** Persists 'pl-first-thread-done' and hides the card. */
  onDismiss: () => void;
}) {
  const editorBase = siteSlug ? `/editor/${encodeURIComponent(siteSlug)}` : '/dashboard/event';
  const steps: Step[] = [
    {
      key: 'press',
      label: 'Press your first site',
      done: done.site,
      cta: { label: 'Begin', href: '/wizard/new' },
    },
    {
      key: 'yours',
      label: 'Make it yours',
      sub: 'A cover photo or a first chapter — either counts.',
      done: done.madeYours,
      cta: { label: 'Open the editor', href: `${editorBase}?jump=hero` },
    },
    {
      key: 'guests',
      label: solemn ? 'Gather your people' : 'Invite your guests',
      done: done.invited,
      cta: { label: 'Add guests', href: '/dashboard/rsvp' },
    },
    {
      key: 'publish',
      label: solemn ? 'Share the site' : 'Send the word',
      done: done.published,
      cta: { label: 'Publish', href: `${editorBase}?jump=share` },
    },
    {
      key: 'day-of',
      label: solemn ? 'The day itself' : 'The day-of room',
      sub: done.dayArrived ? undefined : 'Opens closer to the day.',
      done: done.dayArrived,
      cta: { label: 'Open the day-of room', href: '/dashboard/day-of', quiet: true },
    },
  ];
  const wovenCount = steps.filter((s) => s.done).length;
  const allDone = wovenCount === steps.length;
  const currentIdx = steps.findIndex((s) => !s.done);

  // ── Woven — all five done. One quiet closing state + Dismiss. ─
  if (allDone) {
    return (
      <section className="card" style={{ padding: 20, borderRadius: 20 }}>
        <Header wovenLine="5 of 5 woven" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <span aria-hidden style={{ ...pearlDot, width: 14, height: 14, display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={8} color="var(--card, #FBF7EE)" strokeWidth={3} />
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            Woven
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            — every step of the first thread, done.
          </span>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--ink-soft)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Dismiss
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: 20, borderRadius: 20 }}>
      <Header wovenLine={`${wovenCount} of 5 woven`} />
      <h2
        className="display"
        style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.1, color: 'var(--ink)', margin: '8px 0 14px' }}
      >
        Five steps, <span className="display-italic">one site</span>.
      </h2>

      {/* pl-stagger: gentle staggered rise on mount, CSS only —
          the global reduced-motion rule collapses it to static. */}
      <div className="pl-stagger" style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((step, i) => {
          const isCurrent = i === currentIdx;
          const isLast = i === steps.length - 1;
          // Sub-copy stays quiet on future steps — except the day-of
          // room, whose "opens closer to the day" note always shows.
          const showSub = !step.done && step.sub && (isCurrent || step.key === 'day-of');
          return (
            <div key={step.key} style={{ display: 'flex', gap: 12 }}>
              {/* thread spine — dot + 1px connecting strand */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                <span
                  aria-hidden
                  style={
                    step.done
                      ? { ...pearlDot, marginTop: 4 }
                      : isCurrent
                        ? { width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: 'var(--card)', border: '2px solid var(--pl-gold, #C19A4B)' }
                        : { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: 'var(--card)', border: '1.5px solid var(--line)' }
                  }
                />
                {!isLast && (
                  <span aria-hidden style={{ width: 1, flex: 1, background: 'var(--line)', margin: '3px 0' }} />
                )}
              </div>

              <div style={{ paddingBottom: isLast ? 0 : 14, minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      fontSize: isCurrent ? 14.5 : 13.5,
                      fontWeight: isCurrent ? 700 : 500,
                      color: step.done ? 'var(--ink-soft)' : isCurrent ? 'var(--ink)' : 'var(--ink-muted)',
                      lineHeight: 1.35,
                    }}
                  >
                    {step.label}
                  </span>
                  {step.done && (
                    <Icon name="check" size={11} color="var(--sage-deep, #5C6B3F)" strokeWidth={2.5} />
                  )}
                </div>
                {showSub && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.45 }}>
                    {step.sub}
                  </div>
                )}
                {isCurrent && step.cta && (
                  step.cta.quiet ? (
                    <Link
                      href={step.cta.href}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--pl-olive, #5C6B3F)',
                        textDecoration: 'none',
                      }}
                    >
                      {step.cta.label} <span aria-hidden>→</span>
                    </Link>
                  ) : (
                    <Link
                      href={step.cta.href}
                      className="pl-pearl-accent"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        marginTop: 8,
                        padding: '7px 15px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      {step.cta.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Gold pearl dot — the done marker on the spine. */
const pearlDot: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  flexShrink: 0,
  background: 'radial-gradient(circle at 35% 30%, #E9D6AC, var(--pl-gold, #C19A4B) 72%)',
  boxShadow: '0 0 0 1px color-mix(in oklab, var(--pl-gold, #C19A4B) 45%, transparent)',
};

/** Mono eyebrow + 1px gold rule + quiet progress line. */
function Header({ wovenLine }: { wovenLine: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={monoEyebrow}>The first thread</span>
      <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--gold-line, #D0B070)' }} />
      <span style={{ ...monoEyebrow, color: 'var(--ink-muted)', letterSpacing: '0.14em' }}>{wovenLine}</span>
    </div>
  );
}
