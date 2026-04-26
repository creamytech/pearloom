'use client';

// The Director — real /api/director wiring.
// GET loads the session (conversation, plan, checklist, shortlist,
// budget, targetDate, targetCity, guestCount). POST sends a new
// user message; server returns a new reply + updated state.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Bloom } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, EmptyShell, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useSelectedSite, useUserSites } from './hooks';
import { getDirectorTimeline, type TimelineStage } from '@/lib/event-os/dashboard-presets';

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

function fmtTime(iso?: string) {
  try {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  } catch {
    return '';
  }
}

function diffDays(iso: string): number {
  try {
    const target = new Date(iso).getTime();
    const now = Date.now();
    return Math.round((target - now) / 86400000);
  } catch {
    return 0;
  }
}

// Derive a set of T-minus milestones from targetDate + checklist.
// If the user has no targetDate set we still show the timeline
// labels but skip the dates.
function accentColor(a: TimelineStage['accent']): string {
  switch (a) {
    case 'olive': return PD.olive;
    case 'gold':  return PD.gold;
    case 'terra': return PD.terra;
    case 'plum':  return PD.plum;
    case 'stone': return PD.stone;
    case 'ink':
    default:      return PD.ink;
  }
}

function deriveTimeline(
  targetDate: string | null | undefined,
  checklist: ChecklistItem[],
  occasion: string | null | undefined,
): Array<{ p: number; label: string; t: string; done: boolean; now: boolean; color: string; note: string }> {
  const stops = getDirectorTimeline(occasion);
  const daysOut = targetDate ? Math.max(0, diffDays(targetDate)) : null;
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

  if (!sitesLoading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="studio" title="The Director" subtitle="Create a site first — Pear needs something to plan.">
        <EmptyShell message="Create a site first — Pear needs something to plan." />
      </DashLayout>
    );
  }
  if (!site) {
    return (
      <DashLayout active="studio" title="The Director" subtitle="Pick a site from the top-right menu to start planning.">
        <EmptyShell message="Pick a site from the top-right menu to start planning." />
      </DashLayout>
    );
  }

  const siteName = siteDisplayName(site);
  const timeline = deriveTimeline(state?.targetDate, state?.checklist ?? [], site?.occasion);
  const daysToGo = state?.targetDate ? Math.max(0, diffDays(state.targetDate)) : null;
  const thisWeek = useMemo(
    () =>
      (state?.checklist ?? [])
        .filter((c) => !c.done)
        .slice(0, 6),
    [state?.checklist],
  );
  const openTopics = useMemo(() => {
    if (!state) return [];
    return [
      state.targetCity ? `City · ${state.targetCity}` : 'Set a city',
      state.targetDate ? `Date · ${new Date(state.targetDate).toLocaleDateString()}` : 'Pick a date',
      typeof state.budgetCents === 'number'
        ? `Budget · $${Math.round((state.budgetCents ?? 0) / 100).toLocaleString()}`
        : 'Set a budget',
      typeof state.guestCountEstimate === 'number'
        ? `Guests · ${state.guestCountEstimate}`
        : 'Guest count',
    ];
  }, [state]);

  const conversation: DirectorMsg[] = (state?.conversation ?? []).map((m) => ({
    role: m.role === 'user' ? 'me' : 'pear',
    content: m.content,
    ts: m.ts ?? new Date().toISOString(),
  }));

  return (
    <DashLayout
      active="studio"
      title={
        <span>
          {daysToGo !== null ? (
            <>
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {daysToGo}
              </span>{' '}
              days to the day.
            </>
          ) : (
            <>
              Tell Pear what you&rsquo;re{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                planning
              </span>
              .
            </>
          )}
        </span>
      }
      subtitle="Pear holds your budget, city, guest count, timeline, and every conversation so far. Ask, plan, or just think out loud."
      actions={
        <>
          <Link href={`/editor/${site.domain}`} style={{ ...btnGhost, textDecoration: 'none' }}>
            Open site →
          </Link>
          <button style={btnInk} onClick={() => send('Give me this week at a glance.')}>
            ✦ Ask Pear
          </button>
        </>
      }
    >

      <main
        className="pd-director-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Open topics */}
          <Panel bg={PD.paperCard} style={{ padding: 22 }}>
            <SectionTitle
              eyebrow="WHAT PEAR KNOWS"
              title="The"
              italic="givens."
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {openTopics.map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    background: PD.paper,
                    borderRadius: 12,
                    border: '1px solid rgba(31,36,24,0.08)',
                    fontSize: 13.5,
                    color: PD.ink,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </Panel>

          {/* TIMELINE */}
          <Panel bg={PD.paperCard} style={{ padding: '28px 32px 32px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginBottom: 20,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <SectionTitle
                eyebrow={state?.targetDate ? `THE LOOM · ${daysToGo} DAYS` : 'THE LOOM'}
                title="The thread"
                italic={state?.targetDate ? `to the day.` : 'so far.'}
                style={{ margin: 0 }}
              />
            </div>

            <div style={{ position: 'relative', padding: '40px 0 20px' }}>
              <svg
                width="100%"
                height="120"
                viewBox="0 0 1000 120"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  transform: 'translateY(-50%)',
                  overflow: 'visible',
                }}
              >
                <path
                  d="M 30 60 Q 180 20, 300 60 T 600 60 T 970 60"
                  stroke={PD.gold}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 6"
                  style={{ animation: 'pl-thread-dash 40s linear infinite' }}
                />
              </svg>
              <div
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${timeline.length}, 1fr)`,
                }}
              >
                {timeline.map((m, i) => {
                  const above = i % 2 === 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                      }}
                    >
                      {above && (
                        <TimelineLabel
                          t={m.t}
                          label={m.label}
                          note={m.note}
                          color={m.color}
                          above
                        />
                      )}
                      <div
                        style={{
                          width: m.now ? 18 : 14,
                          height: m.now ? 18 : 14,
                          borderRadius: 999,
                          background: m.done ? m.color : PD.paper,
                          border: m.now ? `3px solid ${PD.paper}` : 'none',
                          outline: m.now ? `2px solid ${m.color}` : 'none',
                          boxShadow: m.p === 96 ? '0 0 0 4px rgba(31,36,24,0.15)' : 'none',
                          zIndex: 2,
                        }}
                      />
                      {!above && <TimelineLabel t={m.t} label={m.label} note={m.note} color={m.color} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* This week + mood reading */}
          <div
            className="pd-week-weave"
            style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}
          >
            <Panel bg={PD.paper3} style={{ padding: 26 }}>
              <SectionTitle
                eyebrow="THIS WEEK’S WEAVE"
                title={thisWeek.length === 0 ? 'Nothing' : `${thisWeek.length} threads,`}
                italic={thisWeek.length === 0 ? 'yet.' : 'your call on each.'}
                accent={PD.terra}
              />
              {thisWeek.length === 0 ? (
                <div
                  style={{
                    fontSize: 13,
                    color: PD.inkSoft,
                    lineHeight: 1.5,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  Ask Pear about your budget, menus, vendors, or anything on your mind. She&rsquo;ll
                  start building your checklist as you go.
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
                      borderBottom:
                        i < thisWeek.length - 1 ? '1px solid rgba(31,36,24,0.08)' : 'none',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                      {r.due && (
                        <div style={{ fontSize: 12, color: '#6A6A56', marginTop: 2 }}>
                          Due {new Date(r.due).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        ...MONO_STYLE,
                        fontSize: 9,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: PD.paper,
                        color: PD.ink,
                        border: '1px solid rgba(31,36,24,0.12)',
                      }}
                    >
                      TO DO
                    </span>
                  </div>
                ))
              )}
            </Panel>

            <Panel
              bg={PD.ink}
              style={{
                padding: 24,
                color: PD.paper,
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{ position: 'absolute', bottom: -40, right: -30, opacity: 0.5 }}
                aria-hidden
              >
                <Bloom size={140} color={PD.butter} centerColor={PD.terra} speed={8} />
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 8 }}>
                MOOD READING
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 22,
                  lineHeight: 1.25,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  marginBottom: 16,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                {state && state.checklist.length > 0
                  ? `${state.checklist.filter((c) => c.done).length} of ${state.checklist.length} items settled.`
                  : 'Fresh loom. Let’s begin.'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {state?.shortlist && state.shortlist.length > 0 && (
                  <span
                    style={{
                      ...MONO_STYLE,
                      fontSize: 9,
                      padding: '5px 10px',
                      background: 'rgba(244,236,216,0.12)',
                      borderRadius: 999,
                    }}
                  >
                    Shortlist · {state.shortlist.length}
                  </span>
                )}
                {daysToGo !== null && (
                  <span
                    style={{
                      ...MONO_STYLE,
                      fontSize: 9,
                      padding: '5px 10px',
                      background: 'rgba(244,236,216,0.12)',
                      borderRadius: 999,
                    }}
                  >
                    {daysToGo}d to go
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(244,236,216,0.12)',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <Pear size={26} color={PD.pear} stem={PD.paper} leaf={PD.butter} />
                <div style={{ fontSize: 12 }}>Pear · updated just now</div>
              </div>
            </Panel>
          </div>

          {/* Shortlist */}
          {state?.shortlist && state.shortlist.length > 0 && (
            <Panel bg={PD.paper} style={{ padding: 24 }}>
              <SectionTitle
                eyebrow="VENDORS · SHORTLISTED"
                title="Ready for a"
                italic="second look."
                accent={PD.plum}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 10,
                }}
              >
                {state.shortlist.map((v) => (
                  <div
                    key={v.vendorId}
                    style={{
                      padding: '12px 14px',
                      background: PD.paperCard,
                      borderRadius: 12,
                      border: '1px solid rgba(31,36,24,0.08)',
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    <div
                      style={{
                        ...MONO_STYLE,
                        fontSize: 9,
                        opacity: 0.55,
                        marginBottom: 4,
                      }}
                    >
                      {v.category.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.vendorId}</div>
                    {v.note && (
                      <div style={{ fontSize: 12, color: '#6A6A56', marginTop: 4 }}>{v.note}</div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* RIGHT: Chat */}
        <div
          className="pd-director-chat"
          style={{
            position: 'sticky',
            top: 72,
            height: 'calc(100vh - 96px)',
            background: PD.paper3,
            borderRadius: 20,
            border: '1px solid rgba(31,36,24,0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid rgba(31,36,24,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: PD.paper,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Pear size={34} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
              <span
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: 0,
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: PD.olive,
                  border: `2px solid ${PD.paper3}`,
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Pear</div>
              <div style={{ fontSize: 11, color: '#6A6A56' }}>
                {conversation.length > 0
                  ? `woven from ${conversation.length} messages`
                  : 'ready when you are'}
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 16px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {loading && (
              <div
                style={{
                  color: PD.inkSoft,
                  fontSize: 13,
                  padding: 24,
                  textAlign: 'center',
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                Threading your plan…
              </div>
            )}
            {!loading && conversation.length === 0 && (
              <div
                style={{
                  padding: '20px 4px',
                  color: PD.inkSoft,
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontFamily: 'var(--pl-font-body)',
                  textAlign: 'center',
                }}
              >
                Start with anything — your budget, your dream florist, your guest list stress. Pear
                will pick up the thread.
              </div>
            )}
            {conversation.map((m, i) => (
              <Msg key={i} m={m} />
            ))}
            {sending && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: PD.paperCard,
                  borderRadius: 16,
                  border: '1px solid rgba(31,36,24,0.08)',
                }}
              >
                <TypingDots />
                <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.5 }}>PEAR IS WEAVING</span>
              </div>
            )}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#F1D7CE',
                  borderRadius: 12,
                  fontSize: 12.5,
                  color: PD.terra,
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div
            style={{
              padding: '12px 14px 14px',
              borderTop: '1px solid rgba(31,36,24,0.08)',
              background: PD.paperCard,
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {['Check the budget', 'Find a photographer', 'Draft the Save-the-Date', 'What should I do this week?'].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={sending}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(31,36,24,0.06)',
                    border: '1px solid rgba(31,36,24,0.1)',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    color: PD.ink,
                    opacity: sending ? 0.5 : 1,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: PD.paper,
                border: '1px solid rgba(31,36,24,0.14)',
                borderRadius: 14,
                padding: '8px 10px 8px 14px',
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask, plan, or just think out loud..."
                disabled={sending}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: PD.ink,
                  padding: '4px 0',
                }}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                style={{
                  background: PD.ink,
                  color: PD.paper,
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 12px',
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  opacity: sending || !input.trim() ? 0.5 : 1,
                }}
              >
                →
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Silence btn import */}
      <div aria-hidden style={{ display: 'none' }}>
        <span style={{ ...btnMini, ...btnMiniGhost }}>x</span>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-director-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-director-chat) {
            position: relative !important;
            top: auto !important;
            height: 600px !important;
          }
          :global(.pd-week-weave) {
            grid-template-columns: 1fr !important;
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
      <div style={{ ...MONO_STYLE, fontSize: 9, color, marginBottom: 3 }}>{t}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: '#6A6A56', marginTop: 3, lineHeight: 1.3 }}>{note}</div>
    </div>
  );
}

function Msg({ m }: { m: DirectorMsg }) {
  const mine = m.role === 'me';
  const style: CSSProperties = {
    alignSelf: mine ? 'flex-end' : 'flex-start',
    maxWidth: '88%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };
  return (
    <div style={style}>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 16,
          background: mine ? PD.ink : PD.paperCard,
          color: mine ? PD.paper : PD.ink,
          border: mine ? 'none' : '1px solid rgba(31,36,24,0.08)',
          fontSize: 13.5,
          lineHeight: 1.5,
          fontFamily: 'var(--pl-font-body)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {m.content}
      </div>
      <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.45, padding: '0 4px' }}>{fmtTime(m.ts)}</div>
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
            background: PD.olive,
            animation: `pl-float-y 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
