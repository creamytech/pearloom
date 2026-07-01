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

import { useState } from 'react';
import Link from 'next/link';
import { Icon, PearloomGlyph, Sprig } from '../motifs';
import { Pearl } from '@/components/brand/Pearl';
import { useCountUp } from '../motion';

/** Eased count-up number, reduced-motion aware (renders the target
 *  directly when motion is reduced). */
export function CountUpNum({ value, suffix }: { value: number; suffix?: string }) {
  const n = useCountUp(value, { duration: 1100 });
  return <>{n}{suffix ?? ''}</>;
}

// ── CockpitHeader ────────────────────────────────────────────
// The letterpress page title — "Your loom, at a glance." Greeting
// eyebrow + display title (one lavender-italic word + gold pearl) +
// a one-line subtitle.

export function CockpitHeader({
  greeting,
  title = 'Your loom,',
  titleItalic = 'at a glance',
  subtitle,
}: {
  greeting?: string;
  title?: string;
  titleItalic?: string;
  subtitle?: string;
}) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {greeting ? (
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--peach-ink)', margin: 0 }}>
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)' }} />
          {greeting}
        </span>
      ) : null}
      <h1
        className="display pl-letterpress"
        style={{ fontSize: 'clamp(28px,3.6vw,40px)', margin: '4px 0 0', fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.02em', color: 'var(--ink)' }}
      >
        {title} <span className="display-italic" style={{ color: 'var(--lavender-ink)' }}>{titleItalic}</span>.{' '}
        <Pearl size={9} />
      </h1>
      {subtitle ? (
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: 640, margin: '6px 0 0' }}>{subtitle}</p>
      ) : null}
    </header>
  );
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

// ── card helper ──────────────────────────────────────────────
const cockpitCard: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--card-ring, var(--line))',
  borderRadius: 16,
  padding: 24,
};

// ── NeedsYouNow ──────────────────────────────────────────────
// The phase-aware decision queue (was PearRecommendations). Each
// row is a real Pear todo; the icon is derived from the title.

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
  if (/(budget|gift|registry)/.test(t)) return 'heart';
  return 'sparkles';
}

export function NeedsYouNow({
  rows,
  phaseLabel,
  phaseNote,
}: {
  rows: NeedRow[];
  phaseLabel?: string;
  phaseNote?: string;
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
              background: 'var(--cream-3)', border: '1px solid var(--line)', fontFamily: 'var(--pl-font-mono, monospace)',
              fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--ink-soft)', textTransform: 'uppercase',
            }}
          >
            {phaseLabel}{phaseNote ? ` · ${phaseNote}` : ''}
          </span>
        ) : null}
      </div>
      <div className="display" style={{ fontSize: 22, margin: '4px 0 14px', lineHeight: 1.15, color: 'var(--ink)' }}>
        {rows.length} {rows.length === 1 ? 'thing only' : 'things only'}{' '}
        <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>you can decide.</span>
      </div>
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
    </div>
  );
}

// ── Lately ───────────────────────────────────────────────────
// Compact recent-activity feed (was ActivityFeed).

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
                <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 10, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>{f.when}</span>
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
        <button
          type="button"
          onClick={() => { setDraft([{ cat: '', used: 0, cap: 0 }]); setEditing(true); }}
          className="btn btn-outline btn-sm"
          style={{ marginTop: 14 }}
        >
          <Icon name="plus" size={12} /> Set a budget
        </button>
      </div>
    );
  }

  // ── Editing ──
  if (editing) {
    return (
      <div style={cockpitCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="eyebrow" style={{ margin: 0 }}>Budget</span>
          <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 11, color: 'var(--ink-muted)' }}>edit</span>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 72px 24px', gap: 8, fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
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
          <div role="alert" style={{ marginTop: 10, fontSize: 12, color: 'var(--plum, #C6563D)', lineHeight: 1.45 }}>
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
                <span style={{ fontFamily: 'var(--pl-font-mono, monospace)', fontSize: 11, color: over ? 'var(--plum, #C6563D)' : 'var(--ink-muted)' }}>{fmtMoney(b.used)} / {fmtMoney(b.cap)}{over ? ' ⚠' : ''}</span>
              </div>
              <div style={{ height: 7, background: 'var(--cream-3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: over ? 'var(--plum, #C6563D)' : 'var(--sage)', borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => setEditing(true)} className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>
        <Icon name="brush" size={12} /> Edit budget
      </button>
    </div>
  );
}

// ── TheLongView ──────────────────────────────────────────────
// The forward-looking keepsake timeline. Occasion-aware (a solemn
// variant for memorials); dates derive from the event date, copy is
// branded.

export function TheLongView({ dateShort, solemn = false }: { dateShort: string | null; solemn?: boolean }) {
  const steps: { icon: string; when: string; what: string; color: string; now?: boolean }[] = solemn
    ? [
        { icon: 'heart', when: dateShort ?? 'The day', what: 'The gathering', color: 'var(--lavender-ink)', now: true },
        { icon: 'image', when: 'That week', what: 'Tributes gather on the wall', color: 'var(--sage-deep)' },
        { icon: 'gift', when: 'One year on', what: 'Pear sends a remembrance note', color: 'var(--gold)' },
        { icon: 'sparkles', when: 'Always', what: 'The page stays — a place to return', color: 'var(--peach-ink)' },
      ]
    : [
        { icon: 'heart', when: dateShort ?? 'The day', what: 'The day', color: 'var(--peach-ink)', now: true },
        { icon: 'image', when: 'That week', what: 'The Reel fills with guest photos', color: 'var(--sage-deep)' },
        { icon: 'gift', when: 'One year on', what: 'Pear sends a first-anniversary note', color: 'var(--gold)' },
        { icon: 'sparkles', when: 'Forever', what: 'The site becomes a keepsake page', color: 'var(--lavender-ink)' },
      ];
  return (
    <div style={{ ...cockpitCard, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 26px 0' }}>
        <span className="eyebrow" style={{ margin: 0 }}>The long view</span>
        <div className="display" style={{ fontSize: 20, margin: '6px 0 2px', color: 'var(--ink)' }}>
          {solemn
            ? <>A thread that <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>stays woven.</span></>
            : <>This day is the <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>first knot.</span></>}
        </div>
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

// ── HomeSitePreview ──────────────────────────────────────────
// A live, textured mini-render of the celebration's themed site —
// ties the dashboard back to the generated-site vibe (the design's
// "Your site" card). Prop-driven: the caller resolves the theme's
// --t-* bag (rootStyle) + the display facts, so this stays pure.

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

// ── QuickJumps ───────────────────────────────────────────────
// Contextual jump tiles (the design's "Quick jumps"). Stage-aware
// — the caller decides which four, glows the one that matters now,
// and dims any that aren't open yet. Auto-fit grid so phones reflow
// without a media query.

export interface QuickJump {
  label: string;
  sub: string;
  icon: string;
  href: string;
  /** Highlight as the moment's primary jump (dark, pulse dot). */
  glow?: boolean;
  /** Not open yet — shown muted + non-interactive. */
  dim?: boolean;
}

export function QuickJumps({ jumps }: { jumps: QuickJump[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {jumps.map((j, i) => {
        const style: React.CSSProperties = {
          padding: '14px 16px',
          borderRadius: 14,
          background: j.glow ? 'var(--ink)' : 'var(--card)',
          color: j.glow ? 'var(--cream)' : 'var(--ink)',
          border: j.glow ? 'none' : '1px solid var(--card-ring, var(--line))',
          opacity: j.dim ? 0.55 : 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minHeight: 78,
          textDecoration: 'none',
        };
        const inner = (
          <>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Icon name={j.icon} size={18} color={j.glow ? 'var(--cream)' : 'var(--gold)'} />
              {j.glow ? <span aria-hidden style={{ width: 6, height: 6, background: 'var(--peach)', borderRadius: 999 }} /> : null}
            </span>
            <span style={{ marginTop: 'auto' }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{j.label}</span>
              <span style={{ display: 'block', fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{j.sub}</span>
            </span>
          </>
        );
        if (j.dim) return <div key={i} style={style}>{inner}</div>;
        // External (published-site) links open in a new tab; internal
        // dashboard/editor routes use the client router.
        return j.href.startsWith('http') ? (
          <a key={i} href={j.href} target="_blank" rel="noreferrer" className="lift" style={style}>{inner}</a>
        ) : (
          <Link key={i} href={j.href} className="lift" style={style}>{inner}</Link>
        );
      })}
    </div>
  );
}
