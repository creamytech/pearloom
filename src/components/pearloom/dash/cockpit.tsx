'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom dashboard — Home cockpit (design-system v2)
//
// Prop-driven presentational pieces for the dashboard home. They
// carry NO data fetching: WelcomeHome composes them with the real
// guest / cadence / countdown data it already loads, and the
// /dev/dashboard harness renders them with sample props for visual
// sign-off. Keep them pure + prop-driven.
//
// Tokens: the dashboard product-chrome aliases (--ink / --cream /
// --card / --line + the sage / peach / lavender / gold accents),
// NOT the editor-only --pl-chrome-* family. The countdown hero is
// a fixed ink surface in both light + editorial-midnight, so its
// interior cream/peach text is intentionally literal.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { Icon, PearloomGlyph } from '../motifs';
import { Pearl } from '@/components/brand/Pearl';
import { useCountUp } from '../motion';

/** Eased count-up number, reduced-motion aware (renders the target
 *  directly when motion is reduced). */
export function CountUpNum({ value, suffix }: { value: number; suffix?: string }) {
  const n = useCountUp(value, { duration: 1100 });
  return <>{n}{suffix ?? ''}</>;
}

// ── CountdownHero ────────────────────────────────────────────
// The dark "84 days" cockpit hero. Left: eyebrow · countdown ·
// status · honoree marks · actions. Right: warm wash + laid
// texture + the pear watermark.

export interface CountdownHeroProps {
  /** Slim personal greeting eyebrow above the card, e.g. "Good evening, Scott". */
  greeting?: string;
  /** Honoree / event names (the celebration's people). */
  names: string[];
  /** Mono gold eyebrow inside the card — venue / occasion line. */
  eyebrow: string;
  /** Days until the event; 0 = today; null = no date set. */
  daysUntil: number | null;
  /** Long date label, shown when there's no countdown number. */
  dateLabel: string | null;
  /** Count of decisions waiting (Pear todos). */
  decisions: number;
  /** Count of open tasks this week. */
  tasksLeft: number;
  liveHref: string;
  editorHref: string;
  /** Optional "Ask Pear" destination (the planning advisor). */
  askHref?: string;
}

const MARK_COLORS = ['var(--sage-deep)', 'var(--lavender-ink)', 'var(--peach-ink)'];

export function CountdownHero({
  greeting,
  names,
  eyebrow,
  daysUntil,
  dateLabel,
  decisions,
  tasksLeft,
  liveHref,
  editorHref,
  askHref,
}: CountdownHeroProps) {
  // The hero is a fixed deep-ink surface in BOTH themes (a warm
  // near-black, not the --ink token, which flips to a light value in
  // editorial-midnight). Cream interior text reads on it either way.
  const heroBg = '#18181B';
  const cream = 'rgba(245,239,226,0.96)';
  const creamSoft = 'rgba(245,239,226,0.70)';
  const hairline = 'rgba(245,239,226,0.16)';

  const status =
    decisions > 0 || tasksLeft > 0
      ? [
          decisions > 0 ? `${decisions} ${decisions === 1 ? 'thing wants' : 'things want'} a decision` : null,
          tasksLeft > 0 ? `${tasksLeft} ${tasksLeft === 1 ? 'task' : 'tasks'} left this week` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : 'Everything is in good order.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {greeting ? (
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--ink-soft)' }}>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} />
          {greeting}
        </span>
      ) : null}

      <div
        className="pl8-cockpit-hero"
        style={{
          background: heroBg,
          color: cream,
          border: '1px solid var(--line)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: 'var(--pl-shadow-md, 0 18px 48px -24px rgba(40,28,12,0.5))',
        }}
      >
        {/* LEFT — the countdown + status + actions */}
        <div style={{ padding: 'clamp(24px,3vw,38px)', minWidth: 0 }}>
          <div className="eyebrow" style={{ color: 'var(--pl-gold, #C19A4B)', marginBottom: 12 }}>{eyebrow}</div>

          {daysUntil != null ? (
            <div
              className="display"
              style={{ fontSize: 'clamp(40px,5.2vw,64px)', lineHeight: 0.98, fontWeight: 400, letterSpacing: '-0.03em', color: cream }}
            >
              {daysUntil === 0 ? (
                <span style={{ fontStyle: 'italic', color: 'var(--peach)' }}>Today</span>
              ) : (
                <>
                  <CountUpNum value={daysUntil} />{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--peach)' }}>{daysUntil === 1 ? 'day' : 'days'}</span>
                </>
              )}
            </div>
          ) : (
            <div
              className="display"
              style={{ fontSize: 'clamp(32px,4.4vw,52px)', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em', color: cream }}
            >
              {names.length >= 2 ? (
                <>{names[0]} <span style={{ fontStyle: 'italic', color: 'var(--peach)' }}>&amp;</span> {names[1]}</>
              ) : (
                names[0] ?? 'Your celebration'
              )}
            </div>
          )}

          <div style={{ fontSize: 14.5, color: creamSoft, marginTop: 12, lineHeight: 1.5, maxWidth: 440 }}>
            {daysUntil != null
              ? <>{daysUntil === 0 ? 'The day is here. ' : 'until the day. '}{status}</>
              : (dateLabel ? `On ${dateLabel}. ${status}` : 'Set a date in the editor to start the countdown.')}
          </div>

          {names.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
              <div style={{ display: 'flex' }}>
                {names.slice(0, 3).map((nm, i) => (
                  <span
                    key={nm + i}
                    style={{
                      width: 28, height: 28, borderRadius: 999, background: MARK_COLORS[i % MARK_COLORS.length],
                      border: `2px solid ${heroBg}`, marginLeft: i ? -8 : 0, display: 'grid', placeItems: 'center',
                      color: cream, fontFamily: 'var(--pl-font-display, serif)', fontStyle: 'italic', fontSize: 13,
                    }}
                  >
                    {nm.trim().charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: creamSoft }}>{names.filter(Boolean).join(' & ')}</span>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <a href={liveHref} target="_blank" rel="noreferrer" className="btn btn-pearl btn-sm" style={{ textDecoration: 'none' }}>
              Open the site <Pearl size={8} />
            </a>
            <Link
              href={editorHref}
              className="btn btn-sm"
              style={{ textDecoration: 'none', color: cream, background: 'transparent', border: `1px solid ${hairline}` }}
            >
              <Icon name="brush" size={13} color={cream} /> Open editor
            </Link>
            {askHref ? (
              <Link
                href={askHref}
                className="btn btn-sm"
                style={{ textDecoration: 'none', color: cream, background: 'transparent', border: `1px solid ${hairline}` }}
              >
                <Icon name="sparkles" size={13} color={cream} /> Ask Pear to plan
              </Link>
            ) : null}
          </div>
        </div>

        {/* RIGHT — warm wash + laid texture + pear watermark */}
        <div
          aria-hidden
          style={{
            position: 'relative',
            minHeight: 200,
            background: 'linear-gradient(140deg, rgba(240,201,168,0.22), rgba(196,181,217,0.16))',
            borderLeft: `1px solid ${hairline}`,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div className="pl-tx-laid" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
          <PearloomGlyph size={92} color="rgba(245,239,226,0.5)" />
        </div>
      </div>
    </div>
  );
}

// ── StatTiles ────────────────────────────────────────────────
// Quick-glance count tiles with eased count-ups. Honest: each
// tile is fed a real number by the caller.

export interface StatTileData {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  sub: string;
  color: string;
  icon: string;
  /** 0–100 progress bar, optional. */
  bar?: number;
  href?: string;
}

export function StatTiles({ tiles }: { tiles: StatTileData[] }) {
  return (
    <div className="pl8-cockpit-stats">
      {tiles.map((t) => {
        const inner = (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="eyebrow" style={{ margin: 0, color: 'var(--ink-muted)' }}>{t.label}</span>
              <span style={{ display: 'inline-flex', color: t.color }}><Icon name={t.icon} size={15} /></span>
            </div>
            <div
              className="display"
              style={{ fontSize: 36, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.025em', color: 'var(--ink)' }}
            >
              <CountUpNum value={t.value} suffix={t.suffix} />
            </div>
            {t.bar != null ? (
              <div style={{ height: 4, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden', margin: '8px 0 6px' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, t.bar))}%`, height: '100%', background: t.color, borderRadius: 99 }} />
              </div>
            ) : null}
            <div style={{ fontSize: 11.5, color: t.color, marginTop: t.bar != null ? 0 : 8, fontWeight: 500 }}>{t.sub}</div>
          </>
        );
        const cardStyle: React.CSSProperties = {
          background: 'var(--card)',
          border: '1px solid var(--card-ring, var(--line))',
          borderRadius: 14,
          padding: '16px 18px',
          textDecoration: 'none',
          display: 'block',
        };
        return t.href ? (
          <Link key={t.key} href={t.href} className="lift" style={cardStyle}>{inner}</Link>
        ) : (
          <div key={t.key} style={cardStyle}>{inner}</div>
        );
      })}
    </div>
  );
}
