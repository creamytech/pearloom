'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/director/DirectorClient.tsx
//
// Chat UI for the Event Director agent. Three-column layout:
// conversation | live plan + checklist | shortlist.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

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

export function DirectorClient({ siteId }: { siteId: string }) {
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
    if (!siteId) return;
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
    if (!text || sending || !siteId) return;
    setSending(true);
    setError(null);

    // Optimistic push
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

  if (!siteId) {
    return (
      <div style={styles.empty}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Pick a site first</h2>
        <p style={{ opacity: 0.7 }}>
          Add <code>?site=&lt;siteId&gt;</code> to the URL, or open the director from your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Pearloom Event Director</div>
          <h1 style={styles.title}>Your AI planner</h1>
        </div>
        <div style={styles.headerMeta}>
          {state.targetCity && <span>{state.targetCity}</span>}
          {state.targetDate && <span>· {new Date(state.targetDate).toLocaleDateString()}</span>}
          {typeof state.budgetCents === 'number' && (
            <span>· ${(state.budgetCents / 100).toLocaleString()} budget</span>
          )}
          {typeof state.guestCountEstimate === 'number' && (
            <span>· {state.guestCountEstimate} guests</span>
          )}
        </div>
      </header>

      <div style={styles.grid}>
        <section style={styles.conversationCol}>
          <div ref={scrollRef} style={styles.scroller}>
            {state.conversation.length === 0 && (
              <div style={styles.empty}>
                <p style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
                  Tell me what you&apos;re planning — city, approximate date, budget, and guest count
                  are a perfect start. I&apos;ll take it from there.
                </p>
              </div>
            )}
            {state.conversation.map((m, i) => (
              <div
                key={i}
                style={m.role === 'user' ? styles.userBubble : styles.assistantBubble}
              >
                <div style={styles.bubbleRole}>
                  {m.role === 'user' ? 'You' : 'Director'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}
            {sending && (
              <div style={styles.assistantBubble}>
                <div style={styles.bubbleRole}>Director</div>
                <div style={{ opacity: 0.7 }}>Thinking…</div>
              </div>
            )}
          </div>
          <div style={styles.inputRow}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about venues, budget splits, vendors, timelines…"
              rows={2}
              style={styles.textarea}
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
              style={styles.sendBtn}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
        </section>

        <aside style={styles.sidebar}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Plan</div>
            {Object.keys(state.plan).length === 0 ? (
              <div style={styles.placeholder}>No plan yet — the director will fill this in.</div>
            ) : (
              <pre style={styles.pre}>{JSON.stringify(state.plan, null, 2)}</pre>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Checklist ({state.checklist.length})</div>
            {state.checklist.length === 0 ? (
              <div style={styles.placeholder}>Empty. Ask the director for a timeline.</div>
            ) : (
              <ul style={styles.list}>
                {state.checklist.map((c) => (
                  <li key={c.id} style={styles.listItem}>
                    <input type="checkbox" defaultChecked={c.done} readOnly style={{ marginRight: 8 }} />
                    <span>{c.label}</span>
                    {c.due && <span style={{ opacity: 0.6, marginLeft: 'auto', fontSize: '0.8rem' }}>{c.due}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>Shortlist ({state.shortlist.length})</div>
            {state.shortlist.length === 0 ? (
              <div style={styles.placeholder}>No vendors yet. Ask for photographers, florists, caterers…</div>
            ) : (
              <ul style={styles.list}>
                {state.shortlist.map((v, i) => (
                  <li key={i} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.category}</div>
                      {v.note && <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>{v.note}</div>}
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{v.vendorId}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Styles (inline so this page is self-contained) ───────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#F5F1E8',
    color: '#2B2B2B',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    padding: '2rem 2rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '1rem',
    borderBottom: '1px solid #EEE8DC',
  },
  eyebrow: {
    fontSize: '0.75rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    opacity: 0.65,
    marginBottom: '0.35rem',
  },
  title: {
    margin: 0,
    fontFamily: 'Playfair Display, serif',
    fontSize: '2rem',
    letterSpacing: '-0.01em',
  },
  headerMeta: {
    display: 'flex',
    gap: '0.5rem',
    fontSize: '0.9rem',
    opacity: 0.8,
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    gap: '1.5rem',
    padding: '1.5rem 2rem',
    maxWidth: 1280,
    margin: '0 auto',
  },
  conversationCol: {
    display: 'flex',
    flexDirection: 'column',
    background: '#FFFFFF',
    borderRadius: '1rem',
    border: '1px solid #EEE8DC',
    height: 'calc(100vh - 200px)',
    minHeight: 520,
  },
  scroller: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    background: '#2B2B2B',
    color: '#F5F1E8',
    padding: '0.85rem 1rem',
    borderRadius: '1rem 1rem 0.25rem 1rem',
    fontSize: '0.95rem',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    background: '#F7F2E6',
    padding: '0.85rem 1rem',
    borderRadius: '1rem 1rem 1rem 0.25rem',
    fontSize: '0.95rem',
    lineHeight: 1.55,
  },
  bubbleRole: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    opacity: 0.55,
    marginBottom: '0.35rem',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
    borderTop: '1px solid #EEE8DC',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    border: '1px solid #EEE8DC',
    borderRadius: '0.75rem',
    padding: '0.75rem 1rem',
    fontFamily: 'inherit',
    fontSize: '0.95rem',
    outline: 'none',
    background: '#FAFAF5',
  },
  sendBtn: {
    background: '#A3B18A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '0.75rem',
    padding: '0 1.5rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #EEE8DC',
    borderRadius: '1rem',
    padding: '1rem 1.25rem',
  },
  cardTitle: {
    fontFamily: 'Playfair Display, serif',
    fontSize: '1.1rem',
    marginBottom: '0.5rem',
    letterSpacing: '-0.01em',
  },
  placeholder: {
    fontSize: '0.85rem',
    opacity: 0.65,
    lineHeight: 1.5,
  },
  pre: {
    fontSize: '0.8rem',
    background: '#FAFAF5',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    margin: 0,
    overflowX: 'auto',
    lineHeight: 1.4,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9rem',
    lineHeight: 1.45,
  },
  empty: {
    padding: '3rem 1rem',
    textAlign: 'center',
    opacity: 0.85,
  },
  error: {
    padding: '0.75rem 1rem',
    color: '#B94A4A',
    fontSize: '0.85rem',
    borderTop: '1px solid #EEE8DC',
  },
};
