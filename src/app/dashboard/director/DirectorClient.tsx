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
import { ArrowLeft, Sparkles, ChevronRight } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { PageCard, EmptyState, ThemeToggle, SkeletonCard } from '@/components/shell';

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
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream)',
      }}
    >
      <DirectorHeader />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: 'clamp(24px, 4vh, 48px) clamp(16px, 4vw, 40px)',
            }}
          >
            {siteId ? <DirectorBody siteId={siteId} /> : <SitePicker />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Editorial page header (shared between picker + chat) ──────

function DirectorHeader() {
  return (
    <header
      style={{
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 32px)',
        borderBottom: '1px solid var(--pl-divider)',
        background: 'color-mix(in oklab, var(--pl-cream) 88%, transparent)',
        backdropFilter: 'saturate(140%) blur(14px)',
        WebkitBackdropFilter: 'saturate(140%) blur(14px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link
          href="/dashboard"
          style={{
            fontFamily: 'var(--pl-font-display)',
            fontSize: '1.05rem',
            color: 'var(--pl-ink)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Pearloom
        </Link>
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.62rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted)',
          }}
        >
          AI · Director
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ThemeToggle />
        <Link
          href="/dashboard"
          style={{
            fontSize: '0.78rem',
            color: 'var(--pl-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={12} /> Back
        </Link>
      </div>
    </header>
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
          {sites.map((s) => {
            const label = s.names?.filter(Boolean).join(' & ') || s.domain;
            return (
              <button
                key={s.id}
                onClick={() => router.push(`/dashboard/director?site=${s.id}`)}
                style={{
                  display: 'block',
                  textAlign: 'left',
                  width: '100%',
                  padding: 20,
                  background: 'var(--pl-cream-card)',
                  border: '1px solid var(--pl-divider)',
                  borderRadius: 'var(--pl-radius-lg)',
                  cursor: 'pointer',
                  transition:
                    'transform var(--pl-dur-fast) var(--pl-ease-spring), border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
                  boxShadow: 'var(--pl-shadow-sm)',
                  color: 'var(--pl-ink)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--pl-olive)';
                  e.currentTarget.style.boxShadow = 'var(--pl-shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--pl-divider)';
                  e.currentTarget.style.boxShadow = 'var(--pl-shadow-sm)';
                }}
              >
                <div
                  className="pl-overline"
                  style={{ marginBottom: 8, fontSize: '0.58rem' }}
                >
                  {s.domain}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: '1.2rem',
                    color: 'var(--pl-ink)',
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 1',
                    marginBottom: 12,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.78rem',
                    color: 'var(--pl-olive)',
                    fontWeight: 600,
                  }}
                >
                  Open director <ChevronRight size={13} />
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
      {/* Editorial header */}
      <div
        style={{
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: '1px solid var(--pl-divider)',
        }}
      >
        <div className="pl-overline" style={{ marginBottom: 12 }}>
          AI · Director
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
          Your AI planner.
        </h1>
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 10,
            fontSize: '0.82rem',
            color: 'var(--pl-muted)',
          }}
        >
          {state.targetCity && <span>{state.targetCity}</span>}
          {state.targetDate && (
            <span>· {new Date(state.targetDate).toLocaleDateString()}</span>
          )}
          {typeof state.budgetCents === 'number' && (
            <span>· ${(state.budgetCents / 100).toLocaleString()} budget</span>
          )}
          {typeof state.guestCountEstimate === 'number' && (
            <span>· {state.guestCountEstimate} guests</span>
          )}
        </div>
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
            {state.conversation.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: m.role === 'user' ? '80%' : '88%',
                  background:
                    m.role === 'user' ? 'var(--pl-ink)' : 'var(--pl-olive-mist)',
                  color:
                    m.role === 'user' ? 'var(--pl-cream)' : 'var(--pl-ink)',
                  padding: '12px 14px',
                  borderRadius:
                    m.role === 'user'
                      ? '14px 14px 4px 14px'
                      : '14px 14px 14px 4px',
                  fontSize: '0.94rem',
                  lineHeight: 1.55,
                }}
              >
                <div
                  className="pl-overline"
                  style={{
                    marginBottom: 6,
                    fontSize: '0.58rem',
                    opacity: 0.6,
                    color: m.role === 'user' ? 'var(--pl-cream)' : undefined,
                  }}
                >
                  {m.role === 'user' ? 'You' : 'Director'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {sending && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  background: 'var(--pl-olive-mist)',
                  borderRadius: '14px 14px 14px 4px',
                  fontSize: '0.9rem',
                  color: 'var(--pl-muted)',
                  fontStyle: 'italic',
                  fontFamily: 'var(--pl-font-display)',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                Thinking…
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              borderTop: '1px solid var(--pl-divider-soft)',
              background: 'var(--pl-cream-deep)',
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about venues, budget splits, vendors, timelines…"
              rows={2}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--pl-divider)',
                borderRadius: 'var(--pl-radius-md)',
                padding: '10px 14px',
                fontFamily: 'var(--pl-font-body)',
                fontSize: '0.92rem',
                outline: 'none',
                background: 'var(--pl-cream-card)',
                color: 'var(--pl-ink)',
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
                background: input.trim() ? 'var(--pl-ink)' : 'var(--pl-divider)',
                color: input.trim() ? 'var(--pl-cream)' : 'var(--pl-muted)',
                border: 'none',
                borderRadius: 'var(--pl-radius-md)',
                padding: '0 18px',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {sending ? '…' : 'Send'}
            </button>
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
                {state.checklist.map((c) => (
                  <li
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.88rem',
                      lineHeight: 1.45,
                      color: 'var(--pl-ink)',
                    }}
                  >
                    <input
                      type="checkbox"
                      defaultChecked={c.done}
                      readOnly
                      style={{ marginRight: 8, accentColor: 'var(--pl-olive)' }}
                    />
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {c.due && (
                      <span
                        style={{
                          color: 'var(--pl-muted)',
                          fontSize: '0.76rem',
                        }}
                      >
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
                      fontSize: '0.88rem',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--pl-ink)' }}>
                      {v.category}
                    </div>
                    {v.note && (
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--pl-ink-soft)',
                        }}
                      >
                        {v.note}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--pl-muted)',
                      }}
                    >
                      {v.vendorId}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PageCard>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          :global(.pl-director-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
