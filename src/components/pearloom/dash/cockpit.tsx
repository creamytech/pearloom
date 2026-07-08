'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom dashboard — Home cockpit (editorial "cockpit" redesign)
//
// Prop-driven presentational pieces for the dashboard home. They
// carry NO data fetching: WelcomeHome composes them with the real
// guest / cadence / countdown / gallery data it already loads, and
// the /dev/dashboard harness renders them with sample props for
// visual sign-off. Keep them pure + prop-driven.
//
// Tokens: the dashboard product-chrome aliases (--ink / --cream /
// --card / --line + the sage / peach / lavender / gold accents),
// NOT the editor-only --pl-chrome-* family. The photographic hero
// is a FIXED deep-olive surface in both light + editorial-midnight,
// so its interior cream/gold text is intentionally literal.
//
// NO stock photography: the hero uses the site's real coverPhoto or
// a warm gradient placeholder; every other "image" slot is a warm
// gradient tile. Honesty: empty inputs render a graceful state, the
// caller never fabricates counts on the real Home.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon, Sprig, PearloomGlyph } from '../motifs';
import { Pearl } from '@/components/brand/Pearl';
import { useCountUp } from '../motion';
import { daysBetweenCalendarDates, formatDaysAgo } from '@/lib/date-utils';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

/** Eased count-up number, reduced-motion aware (renders the target
 *  directly when motion is reduced). */
export function CountUpNum({ value, suffix }: { value: number; suffix?: string }) {
  const n = useCountUp(value, { duration: 1100 });
  return <>{n}{suffix ?? ''}</>;
}

// ── shared card + copy helpers ───────────────────────────────
const cockpitCard: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--card-ring, var(--line))',
  borderRadius: 'var(--r-md, 20px)',
  padding: 24,
};

/** The letterpress card headline — Fraunces, one italic-accent word.
 *  A plain `<div>` (not `.display`) so the ≤640px `.display` clamp
 *  never inflates it on phones. */
function CardHeadline({ children, size = 22, margin = '8px 0 16px' }: { children: React.ReactNode; size?: number; margin?: string }) {
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: size, fontWeight: 600, lineHeight: 1.16, color: 'var(--ink)', margin }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow" style={{ margin: 0, display: 'block' }}>{children}</span>;
}

// The gold-outline heart doodle — the design's signature flourish,
// rendered as a real heart (the Icon set has no plain "heart").
function HeartDoodle({ size = 20, color = 'var(--lavender-ink)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 30" fill="none" aria-hidden style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <path
        d="M16 27C6 20 3 15 3 10a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-3 10-9 17Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── useCockpitCountdown ──────────────────────────────────────
// Live d/h/m/s ticking every second off a `now` STATE (never
// Date.now() in render — React-Compiler safe). The countdown is
// DATA, not decoration, so it keeps ticking under
// prefers-reduced-motion (BRAND §6 honours reduced-motion for
// everything else). `has` is false when there's no event date.

/** `past` is calendar-day-accurate, not a raw-ms sign check — an
 *  event dated "today" must read as upcoming for the WHOLE day
 *  (see daysBetweenCalendarDates). `d` is the whole-day magnitude
 *  either way: days-to-go while upcoming, days-since once past. */
interface Countdown { d: number; h: number; m: number; s: number; has: boolean; past: boolean }

function useCockpitCountdown(eventDate: Date | null): Countdown {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const key = eventDate ? eventDate.getTime() : 0;
  useEffect(() => {
    if (!key) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [key]);
  if (!eventDate) return { d: 0, h: 0, m: 0, s: 0, has: false, past: false };
  const daysDiff = daysBetweenCalendarDates(eventDate, new Date(nowMs));
  const past = daysDiff < 0;
  const ms = Math.max(0, eventDate.getTime() - nowMs);
  return {
    d: past ? -daysDiff : Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
    has: true,
    past,
  };
}

// ── CockpitGreeting ──────────────────────────────────────────
// The letterpress page header: mono greeting eyebrow + a two-part
// display headline (one italic lavender clause) + a one-line
// subtitle. Occasion-aware copy comes from the caller.

export function CockpitGreeting({
  eyebrow,
  title = "You're building",
  titleItalic = 'something beautiful.',
  subtitle,
}: {
  eyebrow?: string;
  title?: string;
  titleItalic?: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {eyebrow ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
          <span aria-hidden style={{ width: 14, height: 1, background: 'var(--gold, #C19A4B)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eyebrow}</span>
        </div>
      ) : null}
      <h1
        className="pl-letterpress"
        style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px,4vw,46px)', margin: '6px 0 0', fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.02em', color: 'var(--ink)' }}
      >
        {title} <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>{titleItalic}</span>
      </h1>
      {subtitle ? (
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: 680, margin: '10px 0 0' }}>{subtitle}</p>
      ) : null}
    </header>
  );
}

// ── HeroBanner ───────────────────────────────────────────────
// The signature photographic countdown banner. A fixed deep-olive
// surface (stays dark in both themes), linen texture underlay, a
// 1.32fr / 1fr grid: LEFT = gold eyebrow · big names + heart ·
// date/venue · a live 4-cell countdown · actions. RIGHT = the
// site's real coverPhoto (sepia + left-fade), or a warm gradient
// placeholder (NO stock photography).

const HERO_BG = 'linear-gradient(150deg, #37421F 0%, #2A331A 46%, #1E2513 100%)';
const HERO_GOLD = '#DDB768';
const HERO_CREAM = '#F7F2E6';
const HERO_SOFT = 'rgba(247,242,230,0.72)';
const HERO_LINEN =
  'repeating-linear-gradient(0deg, rgba(247,242,230,0.05) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(247,242,230,0.05) 0 1px, transparent 1px 5px)';

export interface HeroBannerProps {
  names: string[];
  occasion: string;
  /** Drives the live countdown; null = no date set. */
  eventDate: Date | null;
  /** Long date label (e.g. "Saturday, September 6, 2026"). */
  dateLabel: string | null;
  venueLabel: string | null;
  /** The site's real cover photo — else a warm gradient placeholder. */
  coverPhoto?: string | null;
  liveHref: string;
  editorHref: string;
  /** Where "Change photo" lands (defaults to the editor). */
  changePhotoHref?: string;
  /** Collapse to a single column (parent-measured, no CSS edit). */
  narrow?: boolean;
}

export function HeroBanner({
  names,
  occasion,
  eventDate,
  dateLabel,
  venueLabel,
  coverPhoto,
  liveHref,
  editorHref,
  changePhotoHref,
  narrow = false,
}: HeroBannerProps) {
  const c = useCockpitCountdown(eventDate);
  const a = names[0];
  const b = names[1];
  const occLabel = occasion.replace(/-/g, ' ').toUpperCase();
  const eyebrow = !c.has
    ? `YOUR ${occLabel}`
    : c.past
      ? `YOUR ${occLabel} · ${formatDaysAgo(c.d).toUpperCase()}`
      : `YOUR ${occLabel} · ${c.d === 0 ? 'TODAY' : `${c.d} ${c.d === 1 ? 'DAY' : 'DAYS'} TO GO`}`;
  const cells: [string, number][] = [['DAYS', c.d], ['HRS', c.h], ['MIN', c.m], ['SEC', c.s]];
  const dateLines = [dateLabel, venueLabel].filter(Boolean) as string[];

  return (
    <div style={{ borderRadius: 'var(--r-md, 20px)', overflow: 'hidden', background: HERO_BG, color: HERO_CREAM, position: 'relative', boxShadow: 'var(--shadow-md, 0 18px 48px -24px rgba(20,24,12,0.55))' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', backgroundImage: HERO_LINEN, backgroundSize: '5px 5px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1.32fr 1fr', position: 'relative' }}>
        {/* LEFT — names, countdown, actions */}
        <div style={{ padding: 'clamp(26px,3vw,40px)', minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.2em', color: HERO_GOLD, marginBottom: 16 }}>{eyebrow}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(38px,5vw,60px)', lineHeight: 0.98, fontWeight: 400, letterSpacing: '-0.025em', color: HERO_CREAM }}>
              {b ? (<>{a} <span style={{ fontStyle: 'italic', color: HERO_GOLD }}>&amp;</span> {b}</>) : (a ?? 'Your celebration')}
            </div>
            <HeartDoodle size={26} color="#B9A6E0" />
          </div>
          {dateLines.length > 0 ? (
            <div style={{ fontSize: 14.5, color: HERO_SOFT, marginTop: 14, lineHeight: 1.5 }}>
              {dateLines.map((l, i) => (<div key={i}>{l}</div>))}
            </div>
          ) : (
            <div style={{ fontSize: 14.5, color: HERO_SOFT, marginTop: 14, lineHeight: 1.5 }}>Add a date in the editor to start the countdown.</div>
          )}
          {c.has && !c.past ? (
            <div style={{ display: 'flex', gap: 8, margin: '22px 0 4px' }}>
              {cells.map(([l, v]) => (
                <div key={l} style={{ flex: 1, maxWidth: 76, textAlign: 'center', background: 'rgba(247,242,230,0.08)', border: '1px solid rgba(247,242,230,0.14)', borderRadius: 12, padding: '10px 4px' }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1, color: HERO_CREAM }}>{String(v).padStart(2, '0')}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.16em', color: HERO_SOFT, marginTop: 5 }}>{l}</div>
                </div>
              ))}
            </div>
          ) : c.has && c.past ? (
            /* A frozen 00:00:00:00 flip-clock reads as broken for an
               event that's over — the eyebrow above already carries
               "3 weeks ago"; this line just marks the day as closed. */
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '22px 0 4px', padding: '9px 14px', borderRadius: 999, background: 'rgba(247,242,230,0.08)', border: '1px solid rgba(247,242,230,0.14)' }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: HERO_GOLD, flexShrink: 0 }} />
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: HERO_SOFT }}>
                The day has come and gone
              </span>
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <a href={liveHref} target="_blank" rel="noreferrer" className="btn btn-pearl btn-sm" style={{ textDecoration: 'none' }}>
              Open the site <Pearl size={8} />
            </a>
            <Link href={editorHref} className="btn btn-sm" style={{ textDecoration: 'none', color: HERO_CREAM, background: 'transparent', border: '1px solid rgba(247,242,230,0.28)' }}>
              <Icon name="layout" size={14} color={HERO_CREAM} /> Open editor
            </Link>
          </div>
        </div>
        {/* RIGHT — the real cover photo, or a warm gradient placeholder */}
        <HeroPhotoSlot coverPhoto={coverPhoto} names={names} editorHref={changePhotoHref ?? editorHref} narrow={narrow} />
      </div>
    </div>
  );
}

function HeroPhotoSlot({
  coverPhoto,
  names,
  editorHref,
  narrow,
}: {
  coverPhoto?: string | null;
  names: string[];
  editorHref: string;
  narrow: boolean;
}) {
  const slotStyle: React.CSSProperties = {
    position: 'relative',
    minHeight: narrow ? 150 : 280,
    borderLeft: narrow ? 'none' : '1px solid rgba(247,242,230,0.12)',
    borderTop: narrow ? '1px solid rgba(247,242,230,0.12)' : 'none',
    overflow: 'hidden',
  };
  const pill: React.CSSProperties = {
    position: 'absolute', right: 14, bottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(247,242,230,0.3)',
    background: 'rgba(20,24,12,0.5)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)',
    color: HERO_CREAM, fontSize: 11.5, fontWeight: 600, textDecoration: 'none',
  };
  if (coverPhoto) {
    return (
      <div style={slotStyle}>
        { }
        <img src={coverPhoto} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.05) sepia(0.05)' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: narrow ? 'linear-gradient(0deg, rgba(30,37,19,0.92) 0%, rgba(30,37,19,0.2) 60%, transparent 100%)' : 'linear-gradient(100deg, rgba(30,37,19,0.9) 0%, rgba(30,37,19,0.28) 34%, transparent 60%)' }} />
        <Link href={editorHref} className="lift" style={pill}>
          <Icon name="image" size={13} color={HERO_CREAM} /> Change photo
        </Link>
      </div>
    );
  }
  const letter = (names[0] ?? 'P').trim().charAt(0).toUpperCase() || 'P';
  return (
    <div style={{ ...slotStyle, background: 'linear-gradient(150deg, #5A4A2E 0%, #453A24 55%, #322C1C 100%)', display: 'grid', placeItems: 'center' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: HERO_LINEN, backgroundSize: '5px 5px' }} />
      <span style={{ position: 'relative', fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(44px,6vw,76px)', lineHeight: 1, color: 'rgba(247,242,230,0.92)' }}>{letter}</span>
      <span aria-hidden style={{ position: 'absolute', right: 18, bottom: 18, width: 10, height: 10, borderRadius: 999, background: HERO_GOLD }} />
      <Link href={editorHref} className="lift" style={pill}>
        <Icon name="image" size={13} color={HERO_CREAM} /> Add a photo
      </Link>
    </div>
  );
}

// ── ProgressCard ─────────────────────────────────────────────
// Planning progress: a filled track + count-up % + a done / in
// progress / to do legend. Every figure is derived from the real
// milestone ladder by the caller.

export function ProgressCard({ pct, done, prog, todo }: { pct: number; done: number; prog: number; todo: number }) {
  const bits: [string, number, string, string][] = [
    ['done', done, 'done', 'var(--sage)'],
    ['prog', prog, 'in progress', 'var(--pl-gold)'],
    ['todo', todo, 'to do', 'var(--ink-muted)'],
  ];
  return (
    <div style={{ ...cockpitCard, padding: 26 }}>
      <Eyebrow>Planning progress</Eyebrow>
      <CardHeadline size={23} margin="8px 0 18px">On track and <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>looking good.</span></CardHeadline>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 12, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: Math.min(100, Math.max(0, pct)) + '%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--sage), var(--sage-deep))', transition: 'width var(--pl-dur-base, .4s) var(--pl-ease-out, ease)' }} />
        </div>
        <div style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: 'var(--ink)' }}><CountUpNum value={pct} suffix="%" /></div>
      </div>
      <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
        {bits.map(([k, n, l, col]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', border: `1.5px solid ${col}`, background: k === 'done' ? col : 'transparent' }}>
              {k === 'done' ? <Icon name="check" size={11} strokeWidth={3} color="var(--cream)" /> : null}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}><strong style={{ fontWeight: 700 }}>{n}</strong> <span style={{ color: 'var(--ink-muted)' }}>{l}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── QuickActions ─────────────────────────────────────────────
// A grid of icon-tile jumps. The caller supplies real routes;
// external (published-site) links open in a new tab.

export interface QuickActionItem { icon: string; label: string; color: string; href: string }

export function QuickActions({ actions }: { actions: QuickActionItem[] }) {
  return (
    <div style={{ ...cockpitCard, padding: 26 }}>
      <Eyebrow>Quick actions</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginTop: 16 }}>
        {actions.map((q) => {
          const inner = (
            <>
              <span style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--card)', border: '1px solid var(--line-soft)', color: q.color }}>
                <Icon name={q.icon} size={19} color={q.color} />
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 550, color: 'var(--ink)', textAlign: 'center' }}>{q.label}</span>
            </>
          );
          const style: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 8px',
            borderRadius: 14, border: '1px solid var(--line-soft)', background: 'var(--cream-2)', textDecoration: 'none',
          };
          return q.href.startsWith('http') ? (
            <a key={q.label} href={q.href} target="_blank" rel="noreferrer" className="lift" style={style}>{inner}</a>
          ) : (
            <Link key={q.label} href={q.href} className="lift" style={style}>{inner}</Link>
          );
        })}
      </div>
    </div>
  );
}

// ── RoadCard ─────────────────────────────────────────────────
// The vertical milestone timeline. States: done · now (lavender
// highlight) · next · end. The caller maps its real milestone
// ladder onto this shape.

export interface RoadMilestone {
  date: string;
  label: string;
  sub: string;
  state: 'done' | 'now' | 'next' | 'end';
  tag?: string;
}

export function RoadCard({ milestones, dateShort, href }: { milestones: RoadMilestone[]; dateShort: string | null; href?: string }) {
  return (
    <div style={{ ...cockpitCard, padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Eyebrow>{dateShort ? `The road to ${dateShort}` : 'Your timeline'}</Eyebrow>
        {href ? (
          <Link href={href} style={{ fontSize: 12, color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            View full timeline <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
          </Link>
        ) : null}
      </div>
      <CardHeadline margin="8px 0 18px">What&rsquo;s next on <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>your timeline.</span></CardHeadline>
      <div>
        {milestones.map((r, i) => {
          const done = r.state === 'done';
          const now = r.state === 'now';
          const end = r.state === 'end';
          const last = i === milestones.length - 1;
          return (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22 }}>
                <span
                  className={now ? 'pulse-dot' : ''}
                  style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', background: done ? 'var(--sage)' : now ? 'var(--card)' : 'transparent', border: `2px solid ${done ? 'var(--sage)' : now ? 'var(--lavender-ink)' : end ? 'var(--pl-gold)' : 'var(--line)'}` }}
                >
                  {done ? <Icon name="check" size={12} strokeWidth={3} color="var(--cream)" /> : now ? <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--lavender-ink)' }} /> : end ? <HeartDoodle size={11} color="var(--pl-gold)" /> : null}
                </span>
                {!last ? <span style={{ flex: 1, width: 2, minHeight: 20, background: done ? 'var(--sage)' : 'var(--line)', margin: '2px 0', borderRadius: 2 }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 14, ...(now ? { background: 'var(--lavender-bg)', borderRadius: 12, padding: '10px 14px', margin: '-2px 0 12px' } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: done ? 'var(--ink-soft)' : 'var(--ink)' }}>{r.label}</span>
                  {r.tag ? (
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lavender-ink)', background: 'var(--card)', border: '1px solid var(--lavender-ink)', borderRadius: 999, padding: '2px 8px' }}>{r.tag}</span>
                  ) : null}
                  {now ? <span style={{ marginLeft: 'auto', color: 'var(--lavender-ink)', display: 'inline-flex' }}><Icon name="arrow-right" size={15} color="var(--lavender-ink)" /></span> : null}
                </div>
                {r.sub ? <div style={{ fontSize: 12, color: now ? 'var(--ink-soft)' : 'var(--ink-muted)', marginTop: 3 }}>{r.sub}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ChecklistCard ────────────────────────────────────────────
// A tappable day-of checklist with priority tags. Local check
// state only (a light prep aid, like the milestone ladder). The
// caller supplies the items; empty → the card renders nothing.

export interface ChecklistItem { t: string; p: 'High' | 'Medium' | 'Low' }
// Medium wears --gold-ink, the READABLE text gold (raw --pl-gold is a
// hairline token — 2.45:1 as text; PERSONA-PLAN S7).
const PRI: Record<ChecklistItem['p'], string> = { High: 'var(--peach-ink)', Medium: 'var(--gold-ink, #836018)', Low: 'var(--ink-muted)' };

export function ChecklistCard({ items, href }: { items: ChecklistItem[]; href?: string }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  // Resync the local state when the item set changes (site switch).
  // Render-time adjustment, not a setState-in-effect.
  const [prevLen, setPrevLen] = useState(items.length);
  if (prevLen !== items.length) {
    setPrevLen(items.length);
    setDone(items.map(() => false));
  }
  if (items.length === 0) return null;
  return (
    <div style={{ ...cockpitCard, padding: 26 }}>
      <Eyebrow>Day-of checklist</Eyebrow>
      <CardHeadline size={21} margin="8px 0 14px">You can <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>do this.</span></CardHeadline>
      <div>
        {items.map((c, i) => (
          <button
            key={c.t}
            type="button"
            onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 0', borderBottom: i < items.length - 1 ? '1px solid var(--line-soft)' : 'none', background: 'transparent', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ width: 19, height: 19, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', border: `1.5px solid ${done[i] ? 'var(--sage)' : 'var(--line)'}`, background: done[i] ? 'var(--sage)' : 'transparent' }}>
              {done[i] ? <Icon name="check" size={11} strokeWidth={3} color="var(--cream)" /> : null}
            </span>
            <span style={{ flex: 1, fontSize: 13.5, color: done[i] ? 'var(--ink-muted)' : 'var(--ink)', textDecoration: done[i] ? 'line-through' : 'none' }}>{c.t}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: PRI[c.p] }}>{c.p}</span>
          </button>
        ))}
      </div>
      {href ? (
        <Link href={href} style={{ marginTop: 14, fontSize: 12.5, color: 'var(--peach-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          Open the full day-of timeline <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
        </Link>
      ) : null}
    </div>
  );
}

// ── GuestSummaryCard ─────────────────────────────────────────
// Four big count-ups + a conic-gradient RSVP donut. Honest: when
// there are no guests it shows the "begin a thread" empty state
// instead of a 0% donut.

export interface GuestCounts { invited: number; yes: number; no: number; maybe: number; pending: number }

export function GuestSummaryCard({ counts, href }: { counts: GuestCounts | null; href: string }) {
  if (!counts || counts.invited === 0) {
    return (
      <div style={{ ...cockpitCard, padding: 26 }}>
        <Eyebrow>Guest summary</Eyebrow>
        <CardHeadline margin="8px 0 14px">Your people, <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>in one place.</span></CardHeadline>
        <div style={{ padding: '22px 16px', background: 'var(--cream-2)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 18, marginBottom: 6, color: 'var(--ink)' }}>Nothing yet. Begin a thread.</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14, maxWidth: 260, marginInline: 'auto', lineHeight: 1.5 }}>
            Pear can draft a guest list from your story, or import from your contacts.
          </div>
          <Link href={href} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
            Start with Pear <Icon name="sparkles" size={11} color="var(--cream)" />
          </Link>
        </div>
      </div>
    );
  }
  const { invited, yes, no } = counts;
  // "maybe" folds into the awaiting bucket for the donut + Pending
  // stat (a maybe is not a firm yes); no + yes + pendingLike = invited.
  const pendingLike = counts.pending + counts.maybe;
  const total = invited || 1;
  const ay = (yes / total) * 360;
  const ap = (pendingLike / total) * 360;
  const grad = `conic-gradient(var(--sage) 0deg ${ay}deg, var(--pl-gold) ${ay}deg ${ay + ap}deg, var(--stone, #C8BFA5) ${ay + ap}deg 360deg)`;
  const comingPct = Math.round((yes / total) * 100);
  const stats: [string, number, string][] = [
    ['Total invited', invited, 'var(--ink)'],
    ['Yes', yes, 'var(--sage-deep)'],
    ['Pending', pendingLike, 'var(--pl-gold)'],
    ['No / Declined', no, 'var(--peach-ink)'],
  ];
  const rows: [string, number, string][] = [
    ['Yes', yes, 'var(--sage)'],
    ['Pending', pendingLike, 'var(--pl-gold)'],
    ['No / Declined', no, 'var(--stone, #C8BFA5)'],
  ];
  return (
    <div style={{ ...cockpitCard, padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Eyebrow>Guest summary</Eyebrow>
        <Link href={href} style={{ fontSize: 12, color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          View all guests <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
        </Link>
      </div>
      <CardHeadline margin="8px 0 18px">Your people, <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>in one place.</span></CardHeadline>
      <div style={{ display: 'flex', gap: 26, marginBottom: 22, flexWrap: 'wrap' }}>
        {stats.map(([l, n, col]) => (
          <div key={l}>
            <div style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1, color: col }}><CountUpNum value={n} /></div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 116, height: 116, flexShrink: 0 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: grad }} />
          <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'var(--card)', display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1, color: 'var(--ink)' }}>{comingPct}%</div>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.1em', color: 'var(--ink-muted)', marginTop: 2 }}>COMING</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-muted)', marginBottom: 8, textTransform: 'uppercase' }}>RSVP status</div>
          {rows.map(([l, n, col]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: col }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{l}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--ink-muted)' }}>{n} ({Math.round((n / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MemoryCard ───────────────────────────────────────────────
// A three-tile keepsake teaser. Real gallery images fill the
// tiles; missing slots are warm gradient tiles (never stock).

const MEMORY_GRADIENTS = [
  'linear-gradient(150deg,#E9DFC8,#D8C6A0)',
  'linear-gradient(150deg,#E3D6E8,#CBB8D6)',
  'linear-gradient(150deg,#DDE6CE,#C2CFA6)',
];

export function MemoryCard({ images, href, blurb }: { images: string[]; href: string; blurb?: string }) {
  return (
    <div style={{ ...cockpitCard, padding: 26, position: 'relative', overflow: 'hidden' }}>
      <Eyebrow>The memory book</Eyebrow>
      <CardHeadline margin="8px 0 16px">A keepsake <span style={{ fontStyle: 'italic', color: 'var(--gold-ink, var(--pl-gold))' }}>in the making.</span></CardHeadline>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[0, 1, 2].map((i) => {
          const src = images[i];
          return (
            <div key={i} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1 / 1', boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(40,28,12,0.08))', transform: `rotate(${(i - 1) * 1.4}deg)`, background: src ? 'var(--cream-3)' : MEMORY_GRADIENTS[i] }}>
              {src ? (
                 
                <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(1.05) sepia(0.05)' }} />
              ) : null}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '18px 0 16px' }}>
        {blurb ?? 'The book weaves itself from your guests’ photos, signatures, and notes. It grows as more arrives.'}
      </p>
      <Link href={href} className="btn btn-pearl btn-sm" style={{ textDecoration: 'none' }}>
        Open the memory book <Pearl size={8} />
      </Link>
    </div>
  );
}

// ── WeekendCard ──────────────────────────────────────────────
// The rest of the weekend: the host's real sibling events as
// cards, occasion suggestions to weave as dashed tiles, and an
// "Add an event" tile. Empty inputs → copy + the add tile.

export interface WeekendEventItem { day: string; title: string; meta?: string; rsvp?: string; color: string; href: string }
export interface WeekendAdd { label: string; blurb?: string; href: string }

export function WeekendCard({
  events,
  adds,
  addHref,
  manageHref,
}: {
  events: WeekendEventItem[];
  adds: WeekendAdd[];
  addHref: string;
  manageHref?: string;
}) {
  const dashedTile: React.CSSProperties = {
    borderRadius: 14, border: '1.5px dashed var(--line)', background: 'transparent',
    display: 'flex', flexDirection: 'column', gap: 6, minHeight: 120, padding: '16px', textDecoration: 'none',
  };
  return (
    <div style={{ ...cockpitCard, padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Eyebrow>The weekend</Eyebrow>
          <CardHeadline margin="8px 0 0">More to <span style={{ fontStyle: 'italic', color: 'var(--sage-deep)' }}>look forward to.</span></CardHeadline>
        </div>
        {manageHref ? (
          <Link href={manageHref} style={{ fontSize: 12, color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Manage events <Icon name="arrow-right" size={12} color="var(--peach-ink)" />
          </Link>
        ) : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 18 }}>
        {events.map((w) => (
          <Link key={w.href + w.title} href={w.href} className="lift" style={{ borderRadius: 14, border: '1px solid var(--line-soft)', background: 'var(--cream-2)', padding: '16px 16px 14px', textDecoration: 'none', display: 'block' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: `color-mix(in oklab, ${w.color} 52%, var(--ink))`, textTransform: 'uppercase' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: w.color }} />{w.day}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 18, color: 'var(--ink)', margin: '10px 0 6px' }}>{w.title}</div>
            {w.meta ? <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{w.meta}</div> : null}
            {w.rsvp ? (
              <div style={{ marginTop: 12, display: 'inline-flex', padding: '3px 10px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', color: `color-mix(in oklab, ${w.color} 52%, var(--ink))`, textTransform: 'uppercase' }}>{w.rsvp}</div>
            ) : null}
          </Link>
        ))}
        {adds.map((s) => (
          <Link key={s.href} href={s.href} className="lift" style={dashedTile}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: 'var(--pl-olive, #5C6B3F)', textTransform: 'uppercase' }}>
              <Icon name="plus" size={12} color="var(--pl-olive, #5C6B3F)" /> Weave in
            </span>
            <span style={{ fontFamily: DISPLAY, fontSize: 17, color: 'var(--ink)', marginTop: 4 }}>{s.label}</span>
            {s.blurb ? <span style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{s.blurb}</span> : null}
          </Link>
        ))}
        <Link href={addHref} className="lift" style={{ ...dashedTile, alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
          <span style={{ width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', border: '1.5px solid currentColor' }}><Icon name="plus" size={16} /></span>
          <span style={{ fontSize: 12.5, fontWeight: 550 }}>Add an event</span>
        </Link>
      </div>
    </div>
  );
}

// ── NeedsYouNow ──────────────────────────────────────────────
// The phase-aware decision queue (Pear's todos). Each row is a
// real Pear todo; the icon is derived from the title.

export interface NeedRow {
  title: string;
  sub: string;
  cta: string;
  href: string;
  urgency: 'now' | 'soon' | 'later';
}

function iconForNeed(title: string): string {
  const t = title.toLowerCase();
  if (/(rsvp|reply|guest|head\s?count|nudge|remind|chase)/.test(t)) return 'users';
  if (/(photo|gallery|reel|image)/.test(t)) return 'image';
  if (/(save.the.date|invite|stationery|studio)/.test(t)) return 'mail';
  if (/(schedule|timeline|day-of|day of|run.of)/.test(t)) return 'clock';
  if (/(song|music|playlist|dance)/.test(t)) return 'music';
  if (/(budget|gift|registry)/.test(t)) return 'gift';
  return 'sparkles';
}

export function NeedsYouNow({
  rows,
  phaseLabel,
  phaseNote,
  lately,
}: {
  rows: NeedRow[];
  phaseLabel?: string;
  phaseNote?: string;
  /** Sparse recent-activity items (<3) fold in as a quiet footer
   *  list instead of a full-width one-line Lately card. */
  lately?: LatelyItem[];
}) {
  if (rows.length === 0) return null;
  return (
    <div style={cockpitCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--peach-ink)' }} />
        <span className="eyebrow" style={{ margin: 0 }}>Needs you now</span>
        <span style={{ flex: 1 }} />
        {phaseLabel ? (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999,
              background: 'var(--cream-3)', border: '1px solid var(--line)', fontFamily: MONO,
              fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--ink-soft)', textTransform: 'uppercase',
            }}
          >
            {phaseLabel}{phaseNote ? ` · ${phaseNote}` : ''}
          </span>
        ) : null}
      </div>
      <CardHeadline margin="4px 0 14px">
        {rows.length} {rows.length === 1 ? 'thing only' : 'things only'}{' '}
        <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>you can decide.</span>
      </CardHeadline>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => {
          const urgent = r.urgency === 'now';
          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0',
                borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <span
                style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: urgent ? 'var(--peach-bg)' : 'var(--cream-3)',
                  color: urgent ? 'var(--peach-ink)' : 'var(--ink-soft)',
                }}
              >
                <Icon name={iconForNeed(r.title)} size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35 }}>{r.title}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{r.sub}</span>
              </span>
              <Link href={r.href} className={`btn ${urgent ? 'btn-primary' : 'btn-outline'} btn-sm`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                {r.cta}
              </Link>
            </div>
          );
        })}
      </div>
      {lately && lately.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          <span className="eyebrow" style={{ margin: 0, color: 'var(--ink-muted)' }}>Lately</span>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lately.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--ink)' }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ fontWeight: 600 }}>{f.name}</strong> {f.action}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{f.when}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lately ───────────────────────────────────────────────────
// Compact recent-activity feed.

export interface LatelyItem {
  name: string;
  action: string;
  when: string;
  tone?: 'yes' | 'no' | 'maybe';
}

export function Lately({ items }: { items: LatelyItem[] }) {
  return (
    <div style={cockpitCard}>
      <span className="eyebrow" style={{ margin: 0 }}>Lately</span>
      {items.length === 0 ? (
        <div style={{ padding: '20px 4px 4px', fontSize: 13, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          Nothing yet. As guests reply, it&rsquo;ll show up here.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
          {items.map((f, i) => {
            const color = f.tone === 'no' ? 'var(--ink-muted)' : f.tone === 'maybe' ? 'var(--lavender-ink)' : 'var(--sage-deep)';
            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
                  borderBottom: i < items.length - 1 ? '1px solid var(--line-soft)' : 'none',
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--cream-3)', color }}>
                  <Icon name="check" size={13} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink)' }}>
                  <strong style={{ fontWeight: 600 }}>{f.name}</strong> {f.action}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{f.when}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── BudgetBreakdown ──────────────────────────────────────────
// The host-entered budget, ported from the v2 cockpit. Every figure
// is something the host typed (a real plan they keep) — never an
// invented number. Display mode shows per-category bars (over-budget
// in plum) + committed/left totals; the inline editor adds/edits/
// removes lines and persists via onSave (→ /api/sites/budget).
export interface BudgetLine { cat: string; used: number; cap: number }

const fmtMoney = (n: number) => '$' + (n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(Math.round(n)));

export function BudgetBreakdown({ lines, onSave }: { lines: BudgetLine[]; onSave: (next: BudgetLine[]) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BudgetLine[]>(lines);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Keep the draft in sync when the saved budget changes underneath
  // us (e.g. switching the active site) — but not while editing.
  // Render-time adjustment, not a setState-in-effect.
  const [prevLines, setPrevLines] = useState(lines);
  if (prevLines !== lines) {
    setPrevLines(lines);
    if (!editing) setDraft(lines);
  }

  const totalUsed = lines.reduce((a, b) => a + b.used, 0);
  const totalCap = lines.reduce((a, b) => a + b.cap, 0);

  const setLine = (i: number, patch: Partial<BudgetLine>) =>
    setDraft((d) => d.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => setDraft((d) => [...d, { cat: '', used: 0, cap: 0 }]);
  const removeLine = (i: number) => setDraft((d) => d.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      const cleaned = draft
        .map((l) => ({ cat: l.cat.trim(), used: Math.max(0, Number(l.used) || 0), cap: Math.max(0, Number(l.cap) || 0) }))
        .filter((l) => l.cat);
      await onSave(cleaned);
      setEditing(false);
    } catch {
      // Stay in edit mode with the host's draft intact — closing
      // here would present a failed save as saved.
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const field: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--cream)', borderRadius: 8, padding: '6px 9px', fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui, inherit)', outline: 'none', width: '100%', boxSizing: 'border-box' };

  // ── Empty state ──
  if (!editing && lines.length === 0) {
    return (
      <div style={cockpitCard}>
        <span className="eyebrow" style={{ margin: 0 }}>Budget</span>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          Track what you&rsquo;re spending against what you&rsquo;ve set aside — Pear keeps the running total.
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setDraft([{ cat: '', used: 0, cap: 0 }]); setEditing(true); }}
            className="btn btn-outline btn-sm"
          >
            <Icon name="plus" size={12} /> Set a budget
          </button>
          <Link href="/dashboard/budget" style={budgetDoorLink}>The full budget →</Link>
        </div>
      </div>
    );
  }

  // ── Editing ──
  if (editing) {
    return (
      <div style={cockpitCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="eyebrow" style={{ margin: 0 }}>Budget</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--ink-muted)' }}>edit</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 24px', gap: 8, fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            <span>Category</span><span>Spent</span><span>Budget</span><span />
          </div>
          {draft.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 24px', gap: 8, alignItems: 'center' }}>
              <input value={l.cat} placeholder="Venue" onChange={(e) => setLine(i, { cat: e.target.value })} style={field} />
              <input value={l.used || ''} type="number" min={0} placeholder="0" onChange={(e) => setLine(i, { used: Number(e.target.value) })} style={field} />
              <input value={l.cap || ''} type="number" min={0} placeholder="0" onChange={(e) => setLine(i, { cap: Number(e.target.value) })} style={field} />
              <button type="button" onClick={() => removeLine(i)} aria-label="Remove" style={{ border: 'none', background: 'transparent', color: 'var(--plum, #C6563D)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} style={{ marginTop: 10, width: '100%', padding: 9, borderRadius: 9, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Add category</button>
        {saveError && (
          <div role="alert" style={{ marginTop: 10, fontSize: 12, color: 'var(--pl-warning, #A14A2C)', lineHeight: 1.45 }}>
            That didn&rsquo;t save — check your connection and try again. Your lines are still here.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" disabled={saving} onClick={save} className="btn btn-primary btn-sm" style={{ flex: 1 }}>{saving ? 'Saving…' : 'Save budget'}</button>
          <button type="button" disabled={saving} onClick={() => { setDraft(lines); setSaveError(false); setEditing(false); }} className="btn btn-outline btn-sm">Cancel</button>
        </div>
      </div>
    );
  }

  // ── Display ──
  return (
    <div style={cockpitCard}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span className="eyebrow" style={{ margin: 0 }}>Budget</span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          <strong style={{ color: 'var(--ink)' }}>{fmtMoney(totalUsed)}</strong> of {fmtMoney(totalCap)}
          {totalCap > 0 && <span style={{ color: 'var(--sage-deep)' }}> · {fmtMoney(Math.max(0, totalCap - totalUsed))} left</span>}
        </span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {/* Keyed by index — the editor allows duplicate category
            names ("Venue" twice saves fine) and the list isn't
            reorderable, so cat-keys would collide. */}
        {lines.map((b, i) => {
          const over = b.used > b.cap && b.cap > 0;
          const pct = b.cap > 0 ? Math.min(100, (b.used / b.cap) * 100) : 0;
          return (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{b.cat}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: over ? 'var(--pl-warning, #A14A2C)' : 'var(--ink-muted)' }}>{fmtMoney(b.used)} / {fmtMoney(b.cap)}{over ? ' ⚠' : ''}</span>
              </div>
              <div style={{ height: 7, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: over ? 'var(--plum, #C6563D)' : 'var(--sage)', borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-sm">
          <Icon name="brush" size={12} /> Edit budget
        </button>
        {/* The door to the rich, cents-precise ledger (vendors woven
            in, planned/committed/paid) — this card is the quick
            back-of-napkin view, never a dead end. */}
        <Link href="/dashboard/budget" style={budgetDoorLink}>The full budget →</Link>
      </div>
    </div>
  );
}

const budgetDoorLink: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: 'var(--peach-ink, #C6703D)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

// ── TheLongView (LongViewCard) ───────────────────────────────
// The forward-looking keepsake timeline. Occasion-aware (a solemn
// variant for memorials); dates derive from the event date, copy is
// branded.

export function TheLongView({ dateShort, solemn = false }: { dateShort: string | null; solemn?: boolean }) {
  const steps: { icon: string; when: string; what: string; color: string; now?: boolean }[] = solemn
    ? [
        { icon: 'heart-icon', when: dateShort ?? 'The day', what: 'The gathering', color: 'var(--lavender-ink)', now: true },
        { icon: 'image', when: 'That week', what: 'Tributes gather on the wall', color: 'var(--sage-deep)' },
        { icon: 'gift', when: 'One year on', what: 'Pear sends a remembrance note', color: 'var(--gold)' },
        { icon: 'sparkles', when: 'Always', what: 'The page stays — a place to return', color: 'var(--peach-ink)' },
      ]
    : [
        { icon: 'heart-icon', when: dateShort ?? 'The day', what: 'The day', color: 'var(--peach-ink)', now: true },
        { icon: 'image', when: 'That week', what: 'The Reel fills with guest photos', color: 'var(--sage-deep)' },
        { icon: 'gift', when: 'One year on', what: 'Pear sends a first-anniversary note', color: 'var(--gold)' },
        { icon: 'sparkles', when: 'Forever', what: 'The site becomes a keepsake page', color: 'var(--lavender-ink)' },
      ];
  return (
    <div style={{ ...cockpitCard, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 26px 0' }}>
        <span className="eyebrow" style={{ margin: 0 }}>The long view</span>
        <CardHeadline size={20} margin="6px 0 2px">
          {solemn
            ? <>A thread that <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>stays woven.</span></>
            : <>This day is the <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>first knot.</span></>}
        </CardHeadline>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: 560, margin: '6px 0 0' }}>
          {solemn
            ? 'Pear keeps the weave going — the page becomes a place to return to, long after the day.'
            : 'A day today is a keepsake in forty years. Pear keeps the weave going long after the last dance.'}
        </p>
      </div>
      <div className="pl8-cockpit-timeline" style={{ padding: '20px 26px 24px' }}>
        {steps.map((s, i) => (
          <div key={s.when} style={{ position: 'relative', paddingRight: 16 }}>
            {i < steps.length - 1 ? (
              <div aria-hidden style={{ position: 'absolute', left: 16, right: 0, top: 16, height: 2, backgroundImage: 'linear-gradient(90deg, var(--line) 50%, transparent 50%)', backgroundSize: '8px 2px' }} />
            ) : null}
            <span style={{ position: 'relative', zIndex: 1, width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', background: s.now ? s.color : 'var(--card)', color: s.now ? 'var(--cream)' : s.color, border: `2px solid ${s.color}` }}>
              <Icon name={s.icon} size={15} color={s.now ? 'var(--cream)' : s.color} />
            </span>
            <div className="eyebrow" style={{ margin: '12px 0 0', color: 'var(--ink-muted)' }}>{s.when}</div>
            <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 3, lineHeight: 1.4 }}>{s.what}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HomeSitePreview (SitePreviewCard) ────────────────────────
// A live, textured mini-render of the celebration's themed site —
// ties the dashboard back to the generated-site vibe. Prop-driven:
// the caller resolves the theme's --t-* bag (rootStyle) + the
// display facts, so this stays pure.

export interface HomeSitePreviewProps {
  names: string[];
  dateLabel: string | null;
  locationLabel: string | null;
  themeName: string;
  /** The resolved `--t-*` bag, spread onto the preview surface so
   *  every `var(--t-*)` inside paints in the site's own theme. */
  rootStyle: React.CSSProperties;
  eyebrow?: string;
  /** External site URL (opens in a new tab). */
  liveHref: string;
  editorHref: string;
  themeHref: string;
}

export function HomeSitePreview({
  names,
  dateLabel,
  locationLabel,
  themeName,
  rootStyle,
  eyebrow = 'Save the date',
  liveHref,
  editorHref,
  themeHref,
}: HomeSitePreviewProps) {
  const a = names[0];
  const b = names[1];
  const meta = [dateLabel, locationLabel].filter(Boolean).join(' · ');
  return (
    <div style={cockpitCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Icon name="eye" size={15} color="var(--gold)" />
          <span style={{ fontFamily: 'var(--pl-font-display, serif)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>Your site</span>
          <span
            style={{
              fontSize: 10, fontWeight: 700, color: 'var(--sage-deep)', background: 'var(--sage-tint)',
              padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {themeName}
          </span>
        </span>
        <a href={liveHref} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          View live
        </a>
      </div>

      {/* the themed surface — emits the site's own --t-* bag */}
      <div
        style={{
          ...rootStyle,
          position: 'relative',
          height: 188,
          borderRadius: 14,
          overflow: 'hidden',
          background: 'var(--t-section, var(--cream-2))',
          border: '1px solid var(--t-line, var(--line-soft))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '22px 18px',
        }}
      >
        <span className="pl-tx-laid" aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.32, pointerEvents: 'none' }} />
        <span aria-hidden style={{ position: 'absolute', top: 10, left: 12, opacity: 0.5, transform: 'scaleX(-1)' }}>
          <Sprig size={44} color="var(--t-accent, var(--sage-deep))" />
        </span>
        <span aria-hidden style={{ position: 'absolute', top: 10, right: 12, opacity: 0.5 }}>
          <Sprig size={44} color="var(--t-accent, var(--sage-deep))" />
        </span>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 'var(--t-eyebrow-ls, 0.18em)',
              textTransform: 'uppercase',
              color: 'var(--t-accent-ink, var(--t-accent))',
              marginBottom: 7,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: 'var(--t-display, serif)',
              fontWeight: 'var(--t-display-wght)' as React.CSSProperties['fontWeight'],
              fontSize: 30,
              lineHeight: 0.98,
              color: 'var(--t-ink)',
            }}
          >
            {b ? (
              <>
                {a}
                <span style={{ fontStyle: 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.16em', fontWeight: 400 }}>&amp;</span>
                {b}
              </>
            ) : (
              a ?? 'Your celebration'
            )}
          </div>
          <div aria-hidden style={{ width: 110, height: 1, background: 'var(--t-gold, var(--gold))', opacity: 0.75, margin: '11px auto' }} />
          <div style={{ fontSize: 11, color: 'var(--t-ink-soft)' }}>{meta || 'Add a date in the editor'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Link href={editorHref} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
          <Icon name="brush" size={12} /> Edit
        </Link>
        <Link href={themeHref} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
          <Icon name="sparkles" size={12} /> Themes
        </Link>
      </div>
    </div>
  );
}

// ── CockpitBlessing ──────────────────────────────────────────
// The centered footer note — a Pear glyph, an italic blessing, a
// heart doodle. Occasion-aware copy comes from the caller.

export function CockpitBlessing({ text = "You're doing something wonderful." }: { text?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: 'var(--ink-muted)', fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16 }}>
      <PearloomGlyph size={16} color="var(--sage)" /> {text} <HeartDoodle size={16} color="var(--lavender-ink)" />
    </div>
  );
}
