'use client';

// The Director — real /api/director wiring, restyled to the
// design-handoff "Director" screen (ScreensMore.jsx): Pear's chat is
// the hero on the LEFT; a sticky rail on the RIGHT carries "What Pear
// is holding" (the givens) + a dark "Recent decisions" ledger + the
// vendor book. The signature production features Pear grew beyond the
// zip — the loom timeline, this-week weave, mood reading, shortlist —
// live as full-width sections below, re-skinned into the same card
// idiom. All styling rides the .pl8 chrome tokens (no PD palette), so
// light + editorial-midnight both hold.
//
// GET loads the session (conversation, plan, checklist, shortlist,
// budget, targetDate, targetCity, guestCount). POST sends a new
// user message; server returns a new reply + updated state.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon, PearloomGlyph } from '@/components/pearloom/motifs';
import { EmptyShell } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { useSelectedSite, useUserSites } from './hooks';
import { TeamTasksPanel } from './TeamTasksPanel';
import { getDirectorTimeline, type TimelineStage } from '@/lib/event-os/dashboard-presets';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';
import { parseLocalDate, todayLocal, daysBetweenCalendarDates, formatDaysAgo } from '@/lib/date-utils';
import {
  summarizeVendorBook,
  fmtCentsPlain,
  type VendorBookEntry,
} from '@/lib/vendor-book-summary';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

interface DirectorMsg {
  role: 'pear' | 'me';
  content: string;
  ts: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  due?: string;
}

interface ShortlistItem {
  vendorId: string;
  category: string;
  note?: string;
}

interface DirectorState {
  sessionId?: string;
  conversation: Array<{ role: string; content: string; ts?: string }>;
  plan: Record<string, unknown>;
  checklist: ChecklistItem[];
  shortlist: ShortlistItem[];
  budgetCents?: number | null;
  targetDate?: string | null;
  targetCity?: string | null;
  guestCountEstimate?: number | null;
}

/** Signed whole-day distance to `iso` — negative once the date has
 *  passed. Callers that only want "days to go" clamp explicitly;
 *  don't clamp inside here, or a past date can never be told apart
 *  from "happening right now" (the fixed "always says 0 days to go"
 *  bug on an ended event). */
function diffDays(iso: string): number {
  try {
    // Bare YYYY-MM-DD parses as UTC midnight, which is the day
    // BEFORE in negative-UTC timezones — making the dashboard
    // read "0 days to go" when the wedding is actually tomorrow.
    // Treat date-only inputs as local midnight via parseLocalDate.
    const target = parseLocalDate(iso);
    if (!target) return 0;
    // Calendar-day math (not raw ms) — exact all day regardless of
    // the hour, so "today" can't drift to -1 by evening.
    return daysBetweenCalendarDates(target, new Date());
  } catch {
    return 0;
  }
}

// Derive a set of T-minus milestones from targetDate + checklist.
// If the user has no targetDate set we still show the timeline
// labels but skip the dates.
// Quick replies follow the occasion — a birthday host never needs
// a Save-the-Date, a bachelor trip needs the itinerary + the split.
// (Solemn occasions never reach the Director; it's gated upstream.)
function quickRepliesFor(occasion: string | null | undefined): string[] {
  const trip =
    occasion === 'bachelor-party' || occasion === 'bachelorette-party' || occasion === 'reunion';
  if (trip) {
    return ['Check the budget', 'Plan the itinerary', 'Split the costs', 'What should I do this week?'];
  }
  if (!occasion || occasion === 'wedding' || occasion === 'engagement' || occasion === 'vow-renewal') {
    return ['Check the budget', 'Find a photographer', 'Draft the Save-the-Date', 'What should I do this week?'];
  }
  return ['Check the budget', 'Draft the invitation', 'Plan the timeline', 'What should I do this week?'];
}

function accentColor(a: TimelineStage['accent']): string {
  switch (a) {
    case 'olive': return 'var(--sage-deep, #5C6B3F)';
    case 'gold':  return 'var(--pl-gold, #C19A4B)';
    case 'terra': return 'var(--peach-ink, #C6703D)';
    case 'plum':  return 'var(--pl-plum, #7A2D40)';
    case 'stone': return 'var(--stone, #C8BFA5)';
    case 'ink':
    default:      return 'var(--ink)';
  }
}

function deriveTimeline(
  targetDate: string | null | undefined,
  checklist: ChecklistItem[],
  occasion: string | null | undefined,
): Array<{ p: number; label: string; t: string; done: boolean; now: boolean; color: string; note: string }> {
  const stops = getDirectorTimeline(occasion);
  // Unclamped — once the event has passed, every stop with a
  // positive offset is correctly "done" (a clamp-to-0 previously
  // froze `done` at the last handful of stops forever).
  const daysOut = targetDate ? diffDays(targetDate) : null;
  const now = daysOut ?? 0;

  // Pick a "now" window proportional to the longest offset, so short
  // timelines (memorials — ~10 days) don't collapse everything into "now".
  const maxOff = stops.reduce((m, s) => Math.max(m, s.off), 0);
  const nowWindow = Math.max(1, Math.round(maxOff * 0.06));

  return stops.map((s) => {
    const d = targetDate
      ? new Date(new Date(targetDate).getTime() - s.off * 86400000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : '—';
    const isNow = daysOut !== null && Math.abs(now - s.off) < nowWindow;
    const done = daysOut !== null && s.off > daysOut;
    const match = checklist.find((c) => c.label.toLowerCase().includes(s.label.toLowerCase().split(' ')[0]));
    return {
      p: s.p,
      label: match?.label ?? s.label,
      t: `T−${s.off}d`,
      done,
      now: isNow,
      color: accentColor(s.accent),
      note: d,
    };
  });
}

// ── card + editorial-heading atoms (the zip's Card / Eyebrow) ──
const card: CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--card-ring, var(--line))',
  borderRadius: 'var(--r-md, 20px)',
};

function SecHead({
  eyebrow,
  title,
  italic,
  accent = 'var(--lavender-ink)',
  right,
  style,
}: {
  eyebrow: string;
  title: string;
  italic: string;
  accent?: string;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', ...style }}>
      <div>
        <span className="eyebrow" style={{ margin: 0, display: 'block' }}>{eyebrow}</span>
        <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.16, color: 'var(--ink)', marginTop: 8 }}>
          {title} <span style={{ fontStyle: 'italic', color: accent }}>{italic}</span>
        </div>
      </div>
      {right ?? null}
    </div>
  );
}

export function DashDirector() {
  const { site, loading: sitesLoading } = useSelectedSite();
  const { sites } = useUserSites();
  const [state, setState] = useState<DirectorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const siteId = site?.id ?? null;

  // Today as a local YYYY-MM-DD, computed once at mount (React
  // Compiler: no Date.now() in render — lazy init only).
  const [today] = useState(() => todayLocal());

  // The Vendor Book — real committed money, shown beside the
  // Director's budget so both read from the same truth. Tagged
  // with the siteId it was fetched for (the VendorBookClient
  // pattern) so a site switch never shows a stale ledger.
  const [book, setBook] = useState<{ siteId: string; vendors: VendorBookEntry[] } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch(`/api/vendors/book?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('book load failed'))))
      .then((data: { vendors?: VendorBookEntry[] }) => {
        if (!cancelled) setBook({ siteId, vendors: data.vendors ?? [] });
      })
      .catch(() => {
        // The panel simply doesn't render — the Director works without it.
        if (!cancelled) setBook({ siteId, vendors: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const bookSummary = useMemo(() => {
    if (!book || book.siteId !== siteId || book.vendors.length === 0) return null;
    const s = summarizeVendorBook(book.vendors, today);
    return s.perCategory.length > 0 ? s : null;
  }, [book, siteId, today]);

  useEffect(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/director?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`director ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state?.conversation, sending]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || !siteId || sending) return;
      const now = new Date().toISOString();
      setInput('');
      setSending(true);
      setError(null);
      setState((prev) =>
        prev
          ? {
              ...prev,
              conversation: [...prev.conversation, { role: 'user', content: text, ts: now }],
            }
          : prev,
      );
      try {
        const res = await fetch('/api/director', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, message: text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `director POST ${res.status}`);
        }
        const data = await res.json();
        setState((prev) =>
          prev
            ? {
                ...prev,
                conversation: [
                  ...prev.conversation,
                  { role: 'assistant', content: data.reply, ts: new Date().toISOString() },
                ],
                plan: data.plan ?? prev.plan,
                checklist: data.checklist ?? prev.checklist,
                shortlist: data.shortlist ?? prev.shortlist,
              }
            : prev,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSending(false);
      }
    },
    [siteId, sending],
  );

  const thisWeek = useMemo(
    () =>
      (state?.checklist ?? [])
        .filter((c) => !c.done)
        .slice(0, 6),
    [state?.checklist],
  );

  if (!sitesLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="studio" hideTopbar>
        <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1080, margin: '0 auto' }}>
          <PageIntro
            eyebrow="The Director"
            title={
              <>
                Pear is <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>waiting.</span>
              </>
            }
            style={{ marginBottom: 20 }}
          />
          <EmptyShell message="Create a site first — Pear needs something to plan." cta={{ label: 'Create a site →', href: '/wizard/new' }} />
        </div>
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="studio" hideTopbar>
        <div style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1080, margin: '0 auto' }}>
          <PageIntro
            eyebrow="The Director"
            title={
              <>
                Pick a <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>celebration.</span>
              </>
            }
            style={{ marginBottom: 20 }}
          />
          <EmptyShell message="Pick a celebration from the sidebar to start planning." />
        </div>
      </DashLayout>
    );
  }

  const timeline = deriveTimeline(state?.targetDate, state?.checklist ?? [], site?.occasion);
  // Unclamped — negative once the day has passed. Every render site
  // below branches on the sign instead of assuming ≥ 0.
  const daysToGo = state?.targetDate ? diffDays(state.targetDate) : null;
  const eventPast = daysToGo !== null && daysToGo < 0;

  const conversation: DirectorMsg[] = (state?.conversation ?? []).map((m) => ({
    role: m.role === 'user' ? 'me' : 'pear',
    content: m.content,
    ts: m.ts ?? new Date().toISOString(),
  }));

  // "What Pear is holding" — the givens, straight from the session
  // (the zip's holding card). Honest: unset facts read "Not set yet",
  // never a fabricated value.
  const dateVal = state?.targetDate
    ? new Date(state.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      (daysToGo !== null ? ` · ${daysToGo >= 0 ? `${daysToGo}d` : formatDaysAgo(-daysToGo)}` : '')
    : null;
  const holding: Array<{ label: string; value: string; set: boolean }> = state
    ? [
        { label: 'The date', value: dateVal ?? 'Not set yet', set: !!dateVal },
        { label: 'City', value: state.targetCity ?? 'Not set yet', set: !!state.targetCity },
        {
          label: 'Budget',
          value: typeof state.budgetCents === 'number'
            ? `$${Math.round((state.budgetCents ?? 0) / 100).toLocaleString()}`
            : 'Not set yet',
          set: typeof state.budgetCents === 'number',
        },
        {
          label: 'Guests',
          value: typeof state.guestCountEstimate === 'number' ? String(state.guestCountEstimate) : 'Not set yet',
          set: typeof state.guestCountEstimate === 'number',
        },
        { label: 'Threads open', value: String(state.checklist.filter((c) => !c.done).length), set: true },
      ]
    : [];

  // "Recent decisions" — the settled checklist items (the zip's dark
  // ledger). Real data; the card hides entirely when nothing's done.
  const decisions = (state?.checklist ?? []).filter((c) => c.done).slice(-6).reverse();

  return (
    <DashLayout active="studio" hideTopbar>
      <div style={{ padding: 'clamp(20px, 3vw, 32px) var(--pl-dash-pad) 0', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
        <PageIntro
          eyebrow="The Director"
          title={
            daysToGo !== null ? (
              eventPast ? (
                <>
                  It happened <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>{formatDaysAgo(-daysToGo)}.</span>
                </>
              ) : (
                <>
                  {daysToGo} days to the <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>day.</span>
                </>
              )
            ) : (
              <>
                Tell Pear what you&rsquo;re <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink)' }}>planning.</span>
              </>
            )
          }
          actions={
            <>
              <Link href={`/editor/${site.domain}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                Open site →
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => send('Give me this week at a glance.')}>
                Ask Pear <PearloomGlyph size={12} color="var(--cream)" />
              </button>
            </>
          }
          style={{ marginBottom: 20 }}
        />
      </div>

      <main
        style={{
          padding: '0 var(--pl-dash-pad) 32px',
          maxWidth: 'var(--pl-dash-maxw)',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          className="pd-director-main"
          style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'flex-start' }}
        >
          {/* LEFT — the chat, Pear holding your whole plan (the hero) */}
          <div
            className="pd-director-chat"
            style={{
              ...card,
              height: 'clamp(520px, calc(100vh - 210px), 780px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header — gradient glyph + "Pear · Holding your whole plan" */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(135deg, var(--lavender-ink), var(--sage-deep))', display: 'grid', placeItems: 'center' }}>
                <PearloomGlyph size={18} color="var(--cream)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16, color: 'var(--ink)' }}>Pear</div>
                <div style={{ fontSize: 11, color: 'var(--sage-deep)' }}>
                  {conversation.length > 0 ? `Woven from ${conversation.length} messages` : 'Holding your whole plan'}
                </div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--ink-muted)' }}>THE DIRECTOR</span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading && (
                <DashSkeleton kind="list" count={3} label="Threading your plan…" style={{ padding: 24 }} />
              )}
              {!loading && conversation.length === 0 && (
                <div style={{ padding: '20px 4px', color: 'var(--ink-soft)', fontSize: 13.5, lineHeight: 1.55, textAlign: 'center' }}>
                  Start with anything — your budget, your dream florist, your guest-list stress. Pear will pick up the thread.
                </div>
              )}
              {conversation.map((m, i) => (
                <Msg key={i} m={m} />
              ))}
              {sending && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center' }}>
                    <PearloomGlyph size={13} color="var(--lavender-ink)" />
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 15px', background: 'var(--cream-2)', borderRadius: 16, border: '1px solid var(--line-soft)' }}>
                    <TypingDots />
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>PEAR IS WEAVING</span>
                  </div>
                </div>
              )}
              {error && (
                <div style={{ padding: '10px 14px', background: 'var(--peach-bg)', borderRadius: 12, fontSize: 12.5, color: 'var(--peach-ink)' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Footer — occasion-aware chips + input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', background: 'var(--cream-2)' }}>
              <div className="pl-hscroll" style={{ display: 'flex', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
                {quickRepliesFor(site?.occasion).map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={sending}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      borderRadius: 999,
                      background: 'var(--cream-3)',
                      border: '1px solid var(--line)',
                      color: 'var(--ink-soft)',
                      cursor: sending ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                      opacity: sending ? 0.5 : 1,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); void send(input); }} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask, plan, or just think out loud…"
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: 999,
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
                <button type="submit" disabled={sending || !input.trim()} className="btn btn-primary btn-sm" style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}>
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT — the sticky rail: givens + recent decisions + book */}
          <div className="pd-director-rail" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
            {holding.length > 0 && (
              <div style={{ ...card, padding: 22 }}>
                <span className="eyebrow" style={{ margin: 0, display: 'block' }}>What Pear is holding</span>
                <div style={{ marginTop: 12 }}>
                  {holding.map((h, i) => (
                    <div key={h.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{h.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: h.set ? 'var(--ink)' : 'var(--ink-muted)', fontStyle: h.set ? 'normal' : 'italic', textAlign: 'right' }}>{h.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {decisions.length > 0 && (
              <div style={{ ...card, padding: 22, background: 'var(--ink)', border: 'none', color: 'var(--cream)' }}>
                <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--pl-gold)', marginBottom: 10 }}>RECENT DECISIONS</div>
                {decisions.map((d, i) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: i ? '1px solid rgba(245,239,226,0.12)' : 'none' }}>
                    <span style={{ color: 'var(--pl-gold)', display: 'inline-flex', flexShrink: 0 }}><Icon name="check" size={13} strokeWidth={2.5} /></span>
                    <span style={{ fontSize: 13, color: 'rgba(245,239,226,0.88)', lineHeight: 1.4 }}>{d.label}</span>
                  </div>
                ))}
              </div>
            )}

            {bookSummary && (
              <div style={{ ...card, padding: 22 }}>
                <span className="eyebrow" style={{ margin: 0, display: 'block' }}>From your vendor book</span>
                <div style={{ marginTop: 12 }}>
                  {bookSummary.perCategory.slice(0, 6).map((l, i) => (
                    <div
                      key={l.category}
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '8px 0',
                        borderTop: i ? '1px solid var(--line-soft)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{l.category}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.02em', color: 'var(--ink-muted)' }}>
                        {fmtCentsPlain(l.costCents)}
                        <span> · {l.paidCents >= l.costCents && l.costCents > 0 ? 'paid' : `${fmtCentsPlain(l.paidCents)} paid`}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>
                    Booked {fmtCentsPlain(bookSummary.totalBookedCents)}
                    {bookSummary.unpaidCents > 0 ? ` · ${fmtCentsPlain(bookSummary.unpaidCents)} still to pay` : ' · all paid'}
                  </span>
                  <Link href="/dashboard/vendors" style={{ color: 'var(--peach-ink)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    The book →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* THE LOOM — the signature production timeline, full width. */}
        <div style={{ ...card, padding: '28px 32px 32px' }}>
          <SecHead
            eyebrow={
              state?.targetDate
                ? `THE LOOM · ${eventPast ? formatDaysAgo(-daysToGo!).toUpperCase() : `${daysToGo} DAYS`}`
                : 'THE LOOM'
            }
            title="The thread"
            italic={state?.targetDate && !eventPast ? 'to the day.' : 'so far.'}
            accent="var(--lavender-ink)"
            style={{ marginBottom: 20 }}
          />
          {/* ≤720px the equal-column grid squeezed labels to
              illegibility — the loom becomes a horizontal strip
              with fixed ~140px segments. Desktop is unchanged. */}
          <div className="pd-loom-scroll">
            <div
              className="pd-loom-track"
              style={{ position: 'relative', padding: '40px 0 20px', '--loom-n': String(timeline.length) } as CSSProperties}
            >
              <svg
                width="100%"
                height="120"
                viewBox="0 0 1000 120"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', overflow: 'visible' }}
              >
                <path
                  d="M 30 60 Q 180 20, 300 60 T 600 60 T 970 60"
                  stroke="var(--pl-gold, #C19A4B)"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 6"
                  style={{ animation: 'pl-thread-dash 40s linear infinite' }}
                />
              </svg>
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${timeline.length}, 1fr)` }}>
                {timeline.map((m, i) => {
                  const above = i % 2 === 0;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {above && <TimelineLabel t={m.t} label={m.label} note={m.note} color={m.color} above />}
                      <div
                        style={{
                          width: m.now ? 18 : 14,
                          height: m.now ? 18 : 14,
                          borderRadius: 999,
                          background: m.done ? m.color : 'var(--card)',
                          border: m.now ? '3px solid var(--card)' : `1.5px solid ${m.done ? m.color : 'var(--line)'}`,
                          outline: m.now ? `2px solid ${m.color}` : 'none',
                          boxShadow: m.p === 96 ? '0 0 0 4px rgba(31,36,24,0.12)' : 'none',
                          zIndex: 2,
                        }}
                      />
                      {!above && <TimelineLabel t={m.t} label={m.label} note={m.note} color={m.color} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* THE TEAM — co-host roles + assignable tasks (GRAND-PLAN
            Phase 3, Pillar 3 — the collaboration home). */}
        <TeamTasksPanel siteId={site.id} />

        {/* This week's weave + mood reading */}
        <div className="pd-week-weave" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
          <div style={{ ...card, padding: 26 }}>
            <SecHead
              eyebrow="This week's weave"
              title={thisWeek.length === 0 ? 'Nothing' : `${thisWeek.length} threads,`}
              italic={thisWeek.length === 0 ? 'yet.' : 'your call on each.'}
              accent="var(--peach-ink)"
              style={{ marginBottom: 14 }}
            />
            {thisWeek.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                Ask Pear about your budget, menus, vendors, or anything on your mind. She&rsquo;ll start building your checklist as you go.
              </div>
            ) : (
              thisWeek.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    padding: '12px 4px',
                    borderBottom: i < thisWeek.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{r.label}</div>
                    {r.due && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>Due {new Date(r.due).toLocaleDateString()}</div>}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 999, background: 'var(--cream-3)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
                    TO DO
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={{ ...card, padding: 24, background: 'var(--ink)', border: 'none', color: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', bottom: -30, right: -22, opacity: 0.16 }}>
              <PearloomGlyph size={150} color="var(--pl-gold)" />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: 'var(--pl-gold)', marginBottom: 8, position: 'relative' }}>MOOD READING</div>
            <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 22, lineHeight: 1.25, marginBottom: 16, position: 'relative' }}>
              {state && state.checklist.length > 0
                ? `${state.checklist.filter((c) => c.done).length} of ${state.checklist.length} items settled.`
                : 'Fresh loom. Let’s begin.'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', position: 'relative' }}>
              {state?.shortlist && state.shortlist.length > 0 && (
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', padding: '5px 10px', background: 'rgba(244,236,216,0.12)', borderRadius: 999 }}>
                  SHORTLIST · {state.shortlist.length}
                </span>
              )}
              {daysToGo !== null && (
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', padding: '5px 10px', background: 'rgba(244,236,216,0.12)', borderRadius: 999 }}>
                  {eventPast ? formatDaysAgo(-daysToGo).toUpperCase() : `${daysToGo}D TO GO`}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14, borderTop: '1px solid rgba(244,236,216,0.12)', position: 'relative' }}>
              <PearloomGlyph size={22} color="var(--pl-gold)" />
              <div style={{ fontSize: 12, color: 'rgba(245,239,226,0.82)' }}>Pear · updated just now</div>
            </div>
          </div>
        </div>

        {/* Shortlist */}
        {state?.shortlist && state.shortlist.length > 0 && (
          <div style={{ ...card, padding: 24 }}>
            <SecHead eyebrow="Vendors · shortlisted" title="Ready for a" italic="second look." accent="var(--pl-plum, #7A2D40)" style={{ marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {state.shortlist.map((v) => (
                <div key={v.vendorId} style={{ padding: '12px 14px', background: 'var(--cream-2)', borderRadius: 12, border: '1px solid var(--line-soft)' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: 'var(--ink-muted)', marginBottom: 4 }}>{v.category.toUpperCase()}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{v.vendorId}</div>
                  {v.note && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>{v.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-director-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-director-chat) {
            height: 620px !important;
          }
          :global(.pd-director-rail) {
            position: relative !important;
            top: auto !important;
          }
          :global(.pd-week-weave) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 720px) {
          /* The loom: equal 1fr columns squeeze the 110px labels
             into vertical slivers on phones. Swipeable strip with
             fixed ~140px segments instead; the track carries its
             own vertical padding so the overflow container doesn't
             clip the above/below labels. */
          :global(.pd-loom-scroll) {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -webkit-mask-image: linear-gradient(to left, transparent 0, black 28px);
            mask-image: linear-gradient(to left, transparent 0, black 28px);
          }
          :global(.pd-loom-scroll::-webkit-scrollbar) {
            display: none;
          }
          :global(.pd-loom-track) {
            min-width: calc(var(--loom-n, 6) * 140px);
            padding: 96px 10px 100px !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}

function TimelineLabel({
  t,
  label,
  note,
  color,
  above,
}: {
  t: string;
  label: string;
  note: string;
  color: string;
  above?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: above ? 'auto' : 'calc(50% + 18px)',
        bottom: above ? 'calc(50% + 18px)' : 'auto',
        textAlign: 'center',
        width: 110,
        left: '50%',
        marginLeft: -55,
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color, marginBottom: 3 }}>{t}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, color: 'var(--ink)' }}>{label}</div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 3, lineHeight: 1.3 }}>{note}</div>
    </div>
  );
}

function Msg({ m }: { m: DirectorMsg }) {
  const mine = m.role === 'me';
  return (
    <div
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '84%',
        display: 'flex',
        gap: 9,
        flexDirection: mine ? 'row-reverse' : 'row',
      }}
    >
      {!mine && (
        <span style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, background: 'var(--lavender-bg)', display: 'grid', placeItems: 'center', marginTop: 2 }}>
          <PearloomGlyph size={13} color="var(--lavender-ink)" />
        </span>
      )}
      <div
        style={{
          padding: '11px 15px',
          borderRadius: 16,
          fontSize: 13.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          fontFamily: mine ? 'var(--font-ui, inherit)' : DISPLAY,
          fontStyle: mine ? 'normal' : 'italic',
          background: mine ? 'var(--ink)' : 'var(--cream-2)',
          color: mine ? 'var(--cream)' : 'var(--ink)',
          border: mine ? 'none' : '1px solid var(--line-soft)',
        }}
      >
        {m.content}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: 'var(--lavender-ink)',
            animation: `pl-float-y 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
