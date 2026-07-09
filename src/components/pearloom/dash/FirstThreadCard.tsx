'use client';

// ─────────────────────────────────────────────────────────────
// FirstThreadCard — the first thread, woven step by step.
//
// A self-checking guided path for brand-new hosts on the
// dashboard home. NOT a tooltip tour: five steps on a HORIZONTAL
// thread (2026-07-09 — the vertical spine with 3D gold spheres
// read heavy; owner asked for a flat process bar) that check
// themselves off from real data and deep-link into the product.
// Only the CURRENT step speaks below the bar — one line, one CTA.
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
  /** Short name under the bar node — plain words, fits a column. */
  short: string;
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
      short: 'Your site',
      done: done.site,
      cta: { label: 'Begin', href: '/wizard/new' },
    },
    {
      key: 'yours',
      label: 'Make it yours',
      short: 'Make it yours',
      sub: 'A cover photo or a first chapter, either counts.',
      done: done.madeYours,
      cta: { label: 'Open the editor', href: `${editorBase}?jump=hero` },
    },
    {
      key: 'guests',
      label: solemn ? 'Gather your people' : 'Invite your guests',
      short: solemn ? 'Your people' : 'Guests',
      done: done.invited,
      cta: { label: 'Add guests', href: '/dashboard/rsvp' },
    },
    {
      key: 'publish',
      label: solemn ? 'Share the site' : 'Send the word',
      short: 'Publish',
      done: done.published,
      cta: { label: 'Publish', href: `${editorBase}?jump=share` },
    },
    {
      key: 'day-of',
      label: solemn ? 'The day itself' : 'The day-of room',
      short: 'The day',
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
            , every step of the first thread, done.
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

  const current = currentIdx >= 0 ? steps[currentIdx] : null;
  /* The track spans node centers: 10% → 90% of the row (five equal
     columns). The woven overlay reaches the CURRENT node's center. */
  const trackPct = currentIdx <= 0 ? 0 : (currentIdx / (steps.length - 1)) * 80;

  return (
    <section className="card" style={{ padding: 20, borderRadius: 20 }}>
      <Header wovenLine={`${wovenCount} of 5 woven`} />
      <h2
        className="display"
        style={{ fontSize: 21, fontWeight: 600, lineHeight: 1.1, color: 'var(--ink)', margin: '8px 0 16px' }}
      >
        Five steps, <span className="display-italic">one site</span>.
      </h2>

      {/* ── The process bar — five flat marks on one thread. ────── */}
      <div style={{ position: 'relative' }}>
        {/* the thread — hairline track + the woven stretch in olive */}
        <span aria-hidden style={{ position: 'absolute', top: 9, left: '10%', right: '10%', height: 1.5, background: 'var(--line)', borderRadius: 2 }} />
        {trackPct > 0 && (
          <span aria-hidden style={{ position: 'absolute', top: 9, left: '10%', width: `${trackPct}%`, height: 1.5, background: 'var(--pl-olive, #5C6B3F)', borderRadius: 2 }} />
        )}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {steps.map((step, i) => {
            const isCurrent = i === currentIdx;
            return (
              <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {/* Flat marks — solid gold pearl (done), gold ring
                    with a seated pearl (current), hairline ring
                    (ahead). No gradients, no shadows. */}
                {step.done ? (
                  <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name="check" size={9} color="var(--card, #FBF7EE)" strokeWidth={3} />
                  </span>
                ) : isCurrent ? (
                  <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--card)', border: '1.5px solid var(--pl-gold, #C19A4B)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-gold, #C19A4B)' }} />
                  </span>
                ) : (
                  <span aria-hidden style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--card)', border: '1.5px solid var(--line)', flexShrink: 0 }} />
                )}
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: isCurrent ? 700 : 600,
                    lineHeight: 1.25,
                    textAlign: 'center',
                    color: step.done ? 'var(--ink-soft)' : isCurrent ? 'var(--ink)' : 'var(--ink-muted)',
                    padding: '0 3px',
                  }}
                >
                  {step.short}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── The current step speaks — one line, one CTA. ────────── */}
      {current && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            marginTop: 16, padding: '10px 12px', borderRadius: 12,
            background: 'var(--cream-2, #F5EFE2)',
            border: '1px solid var(--line-soft)',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 180px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35 }}>
              {current.label}
            </div>
            {current.sub && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1, lineHeight: 1.45 }}>
                {current.sub}
              </div>
            )}
          </div>
          {current.cta && (
            current.cta.quiet ? (
              <Link
                href={current.cta.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--pl-olive, #5C6B3F)', textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {current.cta.label} <span aria-hidden>→</span>
              </Link>
            ) : (
              <Link
                href={current.cta.href}
                className="pl-pearl-accent"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '7px 15px', borderRadius: 999,
                  fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {current.cta.label}
              </Link>
            )
          )}
        </div>
      )}
    </section>
  );
}

/** Flat gold pearl — the woven marker (kept for the Woven state). */
const pearlDot: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  flexShrink: 0,
  background: 'var(--pl-gold, #C19A4B)',
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
