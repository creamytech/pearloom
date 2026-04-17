'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/director/DirectorClient.tsx
//
// Editorial chat UI for the Event Director agent. Three-column
// layout: conversation · live plan · shortlist. When no site is
// selected, renders a proper picker (not a dead-end error).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ChevronRight } from 'lucide-react';
import { PageCard, EmptyState, SkeletonCard } from '@/components/shell';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
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
  conversation: Msg[];
  plan: Record<string, unknown>;
  checklist: ChecklistItem[];
  shortlist: ShortlistItem[];
  targetCity?: string | null;
  targetDate?: string | null;
  budgetCents?: number | null;
  guestCountEstimate?: number | null;
}

interface SiteSummary {
  id: string;
  domain: string;
  names?: [string, string];
}

export function DirectorClient({ siteId }: { siteId: string }) {
  return (
    <DashboardShell eyebrow="AI · Director" contentMaxWidth={1280}>
      {siteId ? <DirectorBody siteId={siteId} /> : <SitePicker />}
    </DashboardShell>
  );
}

// ── Site picker (shown when URL is missing ?site=) ────────────

function SitePicker() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => {
        setSites(
          (data.sites ?? []).map((s: SiteSummary) => ({
            id: s.id,
            domain: s.domain,
            names: s.names,
          })),
        );
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div>
      <div
        style={{
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: '1px solid var(--pl-divider)',
        }}
      >
        <div className="pl-overline" style={{ marginBottom: 14 }}>
          Your AI planner · Director
        </div>
        <h1
          className="pl-display"
          style={{
            margin: 0,
            fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
            color: 'var(--pl-ink)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          Which celebration are we planning?
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            color: 'var(--pl-muted)',
            fontSize: '0.95rem',
            lineHeight: 1.55,
            maxWidth: '56ch',
          }}
        >
          Pick a site and I&apos;ll pick up where you left off — budget, venues,
          vendors, timeline, the quiet little checklist.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--pl-radius-md)',
            background: 'color-mix(in oklab, var(--pl-plum) 8%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-plum) 25%, transparent)',
            color: 'var(--pl-plum)',
            fontSize: '0.86rem',
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {sites === null ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : sites.length === 0 ? (
        <EmptyState
          size="hero"
          eyebrow="No sites yet"
          title="Start a site, then we&apos;ll plan it."
          description="The Director is most useful once it knows who this celebration is for, where, and when."
          actions={
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                background: 'var(--pl-ink)',
                color: 'var(--pl-cream)',
                borderRadius: 'var(--pl-radius-full)',
                textDecoration: 'none',
                fontSize: '0.86rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={14} />
              Create a site
            </Link>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {sites.map((s, i) => {
            const label = s.names?.filter(Boolean).join(' & ') || s.domain;
            return (
              <button
                key={s.id}
                onClick={() => router.push(`/dashboard/director?site=${s.id}`)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 14,
                  textAlign: 'left',
                  width: '100%',
                  padding: '22px 22px 20px',
                  background: 'var(--pl-cream-card)',
                  border: '1px solid rgba(14,13,11,0.09)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'transform 0.18s cubic-bezier(0.22,1,0.36,1), border-color 0.18s, box-shadow 0.24s',
                  color: 'var(--pl-ink)',
                  fontFamily: 'inherit',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(184,147,90,0.55)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(14,13,11,0.04), 0 14px 36px rgba(14,13,11,0.10), 0 0 0 3px rgba(184,147,90,0.10)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(14,13,11,0.09)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{
                  position: 'absolute', top: 0, left: 16, right: 16,
                  height: 1, background: 'rgba(184,147,90,0.45)',
                }} />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline', width: '100%',
                }}>
                  <span style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.56rem', fontWeight: 700,
                    letterSpacing: '0.26em', textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                  }}>
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.5rem', fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: 'rgba(14,13,11,0.45)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: '60%',
                  }}>
                    {s.domain}
                  </span>
                </div>
                <div style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: '1.7rem',
                  lineHeight: 1.05,
                  letterSpacing: '-0.005em',
                  color: 'var(--pl-ink)',
                }}>
                  {label}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px',
                  borderRadius: 4,
                  background: 'rgba(184,147,90,0.10)',
                  border: '1px solid rgba(184,147,90,0.35)',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.48rem',
                  fontWeight: 700,
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-gold)',
                }}>
                  Open director <ChevronRight size={10} strokeWidth={2.4} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Director chat body (existing functionality, restyled) ─────

function DirectorBody({ siteId }: { siteId: string }) {
  const [state, setState] = useState<DirectorState>({
    conversation: [],
    plan: {},
    checklist: [],
    shortlist: [],
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/director?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setState({
          sessionId: data.sessionId,
          conversation: data.conversation ?? [],
          plan: data.plan ?? {},
          checklist: data.checklist ?? [],
          shortlist: data.shortlist ?? [],
          targetCity: data.targetCity,
          targetDate: data.targetDate,
          budgetCents: data.budgetCents,
          guestCountEstimate: data.guestCountEstimate,
        });
      })
      .catch((e) => setError(String(e)));
  }, [siteId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.conversation.length]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);

    setState((s) => ({
      ...s,
      conversation: [...s.conversation, { role: 'user', content: text }],
    }));
    setInput('');

    try {
      const res = await fetch('/api/director', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Director failed');
        setSending(false);
        return;
      }
      setState((s) => ({
        ...s,
        conversation: [...s.conversation, { role: 'assistant', content: data.reply }],
        plan: data.plan ?? s.plan,
        checklist: data.checklist ?? s.checklist,
        shortlist: data.shortlist ?? s.shortlist,
      }));
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }, [input, sending, siteId]);

  return (
    <div>
      {/* Editorial masthead */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.52rem', fontWeight: 700,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: 'var(--pl-olive)',
          }}>
            The Script · AI Director
          </span>
          <span style={{ flex: 1, height: 1, background: 'rgba(184,147,90,0.45)' }} />
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(2.2rem, 4.8vw, 3.2rem)',
          lineHeight: 1.02,
          letterSpacing: '-0.01em',
          color: 'var(--pl-ink)',
        }}>
          Your planner
        </h1>
        {(state.targetCity || state.targetDate || typeof state.budgetCents === 'number' || typeof state.guestCountEstimate === 'number') && (
          <div style={{
            marginTop: 14,
            padding: '10px 16px',
            background: 'var(--pl-cream-card)',
            border: '1px solid rgba(184,147,90,0.30)',
            borderRadius: 8,
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.54rem',
            fontWeight: 700,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'rgba(14,13,11,0.60)',
          }}>
            {state.targetCity && (
              <span><span style={{ color: 'rgba(14,13,11,0.40)' }}>City · </span>{state.targetCity}</span>
            )}
            {state.targetDate && (
              <span><span style={{ color: 'rgba(14,13,11,0.40)' }}>Date · </span>{new Date(state.targetDate).toLocaleDateString()}</span>
            )}
            {typeof state.budgetCents === 'number' && (
              <span><span style={{ color: 'rgba(14,13,11,0.40)' }}>Budget · </span>${(state.budgetCents / 100).toLocaleString()}</span>
            )}
            {typeof state.guestCountEstimate === 'number' && (
              <span><span style={{ color: 'rgba(14,13,11,0.40)' }}>Guests · </span>{state.guestCountEstimate}</span>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 20,
          alignItems: 'start',
        }}
        className="pl-director-grid"
      >
        <PageCard padding="none" accent="olive">
          <div
            ref={scrollRef}
            style={{
              height: 'calc(100dvh - 340px)',
              minHeight: 480,
              overflowY: 'auto',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {state.conversation.length === 0 && (
              <div
                style={{
                  padding: '32px 8px',
                  color: 'var(--pl-muted)',
                  fontSize: '0.98rem',
                  lineHeight: 1.6,
                  maxWidth: '50ch',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic',
                    fontSize: '1.3rem',
                    color: 'var(--pl-ink)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    marginBottom: 10,
                  }}
                >
                  Tell me what you&apos;re planning.
                </div>
                City, approximate date, budget, and guest count are a perfect
                start. I&apos;ll take it from there.
              </div>
            )}
            {state.conversation.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: isUser ? '82%' : '90%',
                    width: 'auto',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.46rem',
                    fontWeight: 700,
                    letterSpacing: '0.30em',
                    textTransform: 'uppercase',
                    color: isUser ? 'var(--pl-ink-soft)' : 'var(--pl-gold)',
                    marginBottom: 6,
                    paddingLeft: isUser ? 0 : 14,
                    paddingRight: isUser ? 14 : 0,
                    textAlign: isUser ? 'right' : 'left',
                  }}>
                    {isUser ? 'You · reply' : 'Director · scripted'}
                  </div>
                  <div style={{
                    position: 'relative',
                    padding: isUser ? '13px 16px' : '14px 16px 14px 18px',
                    background: isUser ? 'var(--pl-ink)' : 'var(--pl-cream-card)',
                    color: isUser ? 'var(--pl-cream)' : 'var(--pl-ink)',
                    border: isUser ? 'none' : '1px solid rgba(184,147,90,0.35)',
                    borderRadius: isUser
                      ? '10px 10px 2px 10px'
                      : '2px 10px 10px 10px',
                    fontFamily: 'var(--pl-font-body)',
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    boxShadow: isUser
                      ? '0 2px 6px rgba(14,13,11,0.12)'
                      : '0 1px 3px rgba(14,13,11,0.04), 0 0 0 3px rgba(184,147,90,0.06)',
                  }}>
                    {!isUser && (
                      <span style={{
                        position: 'absolute', left: 0, top: 10, bottom: 10,
                        width: 2, background: 'var(--pl-gold)',
                      }} />
                    )}
                    {m.content}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                <div style={{
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.46rem',
                  fontWeight: 700,
                  letterSpacing: '0.30em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-gold)',
                  marginBottom: 6,
                  paddingLeft: 14,
                }}>
                  Director · composing
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px',
                  background: 'var(--pl-cream-card)',
                  border: '1px solid rgba(184,147,90,0.35)',
                  borderRadius: '2px 10px 10px 10px',
                  fontFamily: 'var(--pl-font-display)',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  color: 'var(--pl-ink-soft)',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute', left: 0, top: 10, bottom: 10,
                    width: 2, background: 'var(--pl-gold)',
                  }} />
                  <span style={{ display: 'inline-flex', gap: 3 }}>
                    <span className="pl-ty-dot" style={{ animationDelay: '0s' }}>·</span>
                    <span className="pl-ty-dot" style={{ animationDelay: '0.15s' }}>·</span>
                    <span className="pl-ty-dot" style={{ animationDelay: '0.30s' }}>·</span>
                  </span>
                  thinking
                </div>
              </div>
            )}
          </div>
          {/* Editorial composer */}
          <div style={{
            position: 'relative',
            padding: 14,
            borderTop: '1px solid rgba(184,147,90,0.35)',
            background: 'var(--pl-cream-deep)',
          }}>
            {/* Mono compose kicker */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.46rem', fontWeight: 700,
                letterSpacing: '0.28em', textTransform: 'uppercase',
                color: 'var(--pl-olive)',
              }}>
                Compose · your reply
              </span>
              <span style={{ flex: 1, height: 1, background: 'rgba(14,13,11,0.10)' }} />
              <span style={{
                fontFamily: 'var(--pl-font-mono)',
                fontSize: '0.46rem', fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: 'rgba(14,13,11,0.40)',
              }}>
                ⌘↵ to send
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about venues, budget splits, vendors, timelines…"
                rows={2}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: '1px solid rgba(14,13,11,0.15)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  outline: 'none',
                  background: 'var(--pl-cream-card)',
                  color: 'var(--pl-ink)',
                  transition: 'border-color 0.18s, box-shadow 0.18s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(184,147,90,0.55)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(184,147,90,0.10)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(14,13,11,0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: input.trim() ? 'var(--pl-ink)' : 'rgba(14,13,11,0.10)',
                  color: input.trim() ? 'var(--pl-cream)' : 'rgba(14,13,11,0.40)',
                  border: '1px solid',
                  borderColor: input.trim() ? 'var(--pl-ink)' : 'rgba(14,13,11,0.10)',
                  borderRadius: 8,
                  padding: '11px 18px',
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.56rem',
                  fontWeight: 700,
                  letterSpacing: '0.26em',
                  textTransform: 'uppercase',
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: input.trim() ? '0 0 0 3px rgba(184,147,90,0.18)' : 'none',
                  transition: 'background 0.18s, box-shadow 0.18s',
                  alignSelf: 'stretch',
                }}
              >
                {sending ? 'Sending' : 'Send →'}
              </button>
            </div>
            <style>{`
              @keyframes pl-ty {
                0%, 80%, 100% { opacity: 0.25; }
                40% { opacity: 1; }
              }
              .pl-ty-dot {
                display: inline-block;
                animation: pl-ty 1.2s infinite ease-in-out;
                font-weight: 700;
                transform: scale(1.8);
                line-height: 1;
              }
            `}</style>
          </div>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--pl-divider-soft)',
                color: 'var(--pl-plum)',
                fontSize: '0.82rem',
                background: 'color-mix(in oklab, var(--pl-plum) 6%, transparent)',
              }}
            >
              {error}
            </div>
          )}
        </PageCard>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PageCard title="Plan" eyebrow="Drafted" padding="md">
            {Object.keys(state.plan).length === 0 ? (
              <div
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--pl-muted)',
                  lineHeight: 1.5,
                }}
              >
                No plan yet — the director will fill this in.
              </div>
            ) : (
              <pre
                style={{
                  fontSize: '0.78rem',
                  background: 'var(--pl-cream-deep)',
                  padding: 12,
                  borderRadius: 'var(--pl-radius-md)',
                  margin: 0,
                  overflowX: 'auto',
                  lineHeight: 1.4,
                  color: 'var(--pl-ink-soft)',
                }}
              >
                {JSON.stringify(state.plan, null, 2)}
              </pre>
            )}
          </PageCard>

          <PageCard
            title={`Checklist (${state.checklist.length})`}
            eyebrow="To do"
            padding="md"
            accent="gold"
          >
            {state.checklist.length === 0 ? (
              <div
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--pl-muted)',
                  lineHeight: 1.5,
                }}
              >
                Empty. Ask the director for a timeline.
              </div>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {state.checklist.map((c, i) => (
                  <li
                    key={c.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '22px 16px 1fr auto',
                      alignItems: 'baseline',
                      columnGap: 8,
                      paddingBottom: 8,
                      borderBottom: i < state.checklist.length - 1 ? '1px dotted rgba(14,13,11,0.10)' : 'none',
                      fontSize: '0.86rem',
                      lineHeight: 1.45,
                      color: 'var(--pl-ink)',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      color: 'rgba(14,13,11,0.40)',
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        position: 'relative',
                        width: 12,
                        height: 12,
                        border: '1.5px solid',
                        borderColor: c.done ? 'var(--pl-olive)' : 'rgba(14,13,11,0.30)',
                        borderRadius: 2,
                        background: c.done ? 'var(--pl-olive)' : 'var(--pl-cream-card)',
                        display: 'inline-block',
                        alignSelf: 'center',
                      }}
                    >
                      {c.done && (
                        <span style={{
                          position: 'absolute',
                          top: '50%', left: '50%',
                          transform: 'translate(-50%, -55%)',
                          color: 'var(--pl-cream)',
                          fontSize: '0.62rem',
                          lineHeight: 1,
                          fontWeight: 800,
                        }}>✓</span>
                      )}
                    </span>
                    <span style={{
                      fontFamily: 'var(--pl-font-body)',
                      color: c.done ? 'rgba(14,13,11,0.45)' : 'var(--pl-ink)',
                      textDecoration: c.done ? 'line-through' : 'none',
                    }}>
                      {c.label}
                    </span>
                    {c.due && (
                      <span style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-gold)',
                      }}>
                        {c.due}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PageCard>

          <PageCard
            title={`Shortlist (${state.shortlist.length})`}
            eyebrow="Vendors"
            padding="md"
            accent="plum"
          >
            {state.shortlist.length === 0 ? (
              <div
                style={{
                  fontSize: '0.86rem',
                  color: 'var(--pl-muted)',
                  lineHeight: 1.5,
                }}
              >
                No vendors yet. Ask for photographers, florists, caterers…
              </div>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {state.shortlist.map((v, i) => (
                  <li
                    key={i}
                    style={{
                      paddingBottom: 10,
                      borderBottom: i < state.shortlist.length - 1 ? '1px dotted rgba(14,13,11,0.10)' : 'none',
                      fontSize: '0.88rem',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 2,
                    }}>
                      <span style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-olive)',
                      }}>
                        № {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.20em',
                        textTransform: 'uppercase',
                        color: 'rgba(14,13,11,0.55)',
                      }}>
                        {v.category}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: '1rem',
                      lineHeight: 1.15,
                      color: 'var(--pl-ink)',
                      marginBottom: v.note ? 4 : 2,
                    }}>
                      {v.vendorId}
                    </div>
                    {v.note && (
                      <div style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: '0.78rem',
                        color: 'var(--pl-ink-soft)',
                        lineHeight: 1.5,
                      }}>
                        {v.note}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </PageCard>
        </aside>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .pl-director-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
