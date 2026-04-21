'use client';

// The Director — Pear's AI planner with timeline thread + chat.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Bloom } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';

interface Message {
  from: 'pear' | 'me';
  t: string;
  time: string;
  options?: string[];
}

const INIT_MESSAGES: Message[] = [
  { from: 'pear', t: "Hi Scott. I've been looking at the Santos–Kim wedding. Three things bubbled up this morning. Want them in order of urgency, or in order of 'how much it'll hurt if we wait'?", time: '9:04 am' },
  { from: 'me', t: 'Hurt order, please.', time: '9:05 am' },
  { from: 'pear', t: "Good choice. First: the tent company hasn't confirmed the 40×60 for Sep 6. They're slow this week. I can nudge them with a friendly voicemail script, or you can. Want me to?", time: '9:05 am', options: ['Yes, you call', "I'll call", 'Draft a note first'] },
];

interface Milestone {
  t: string; date: string; title: string;
  state: 'done' | 'warn' | 'next' | 'queued' | 'target';
  color: string; note: string;
}

const TIMELINE: Milestone[] = [
  { t: 'T-120d', date: 'May 9',  title: 'Venue locked',       state: 'done',   color: PD.olive,  note: 'Hollow Barn · deposit paid' },
  { t: 'T-90d',  date: 'Jun 8',  title: 'Save-the-date sent', state: 'done',   color: PD.olive,  note: '138 delivered · 112 opened' },
  { t: 'T-70d',  date: 'Jun 28', title: 'Tent + tables',      state: 'warn',   color: PD.gold,   note: 'Awaiting confirmation' },
  { t: 'T-56d',  date: 'Jul 12', title: 'Florals walk-through', state: 'next', color: PD.plum,   note: 'Bring palette sample' },
  { t: 'T-42d',  date: 'Jul 26', title: 'Menu tasting',       state: 'queued', color: PD.stone,  note: '3 guests + couple' },
  { t: 'T-21d',  date: 'Aug 16', title: 'Final guest count',  state: 'queued', color: PD.stone,  note: 'Lock seating chart' },
  { t: 'T-7d',   date: 'Aug 30', title: 'Rehearsal dinner',   state: 'queued', color: PD.stone,  note: 'At the inn' },
  { t: 'Day of', date: 'Sep 6',  title: 'The wedding',        state: 'target', color: PD.ink,    note: '138 guests · 4:30pm ceremony' },
];

const WEEK = [
  { d: 'Tue', title: 'Confirm tent (Linwood)',              who: 'Pear · voicemail',     status: 'waiting' as const },
  { d: 'Wed', title: 'Tasting menu v3 to Anja',             who: 'You',                  status: 'todo' as const },
  { d: 'Thu', title: 'Ceremony music shortlist',            who: 'Pear drafted, you pick', status: 'review' as const },
  { d: 'Thu', title: 'Reconcile guest 47 + 48 (accessibility)', who: 'You',              status: 'todo' as const },
  { d: 'Fri', title: 'Alterations, fitting two',            who: 'You · 2pm',            status: 'todo' as const },
  { d: 'Sat', title: 'Site refresh with Hollow Barn photos', who: 'Pear (auto)',         status: 'queued' as const },
];

export function DashDirector() {
  const [msgs, setMsgs] = useState<Message[]>(INIT_MESSAGES);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${((now.getHours() + 11) % 12 + 1)}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'pm' : 'am'}`;
    setMsgs((m) => [...m, { from: 'me', t: text, time }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [
        ...m,
        {
          from: 'pear',
          t: "On it. I'll leave the voicemail at 11:15, which is their quiet hour. If they don't call back by 3, I'll nudge Hailey from the co-op — she used them last September and they owe her a callback.",
          time,
        },
      ]);
    }, 1600);
  };

  return (
    <DashShell>
      <Topbar
        subtitle="THE DIRECTOR · SANTOS–KIM WEDDING"
        title={
          <span>
            Good morning. Three things{' '}
            <span style={{ fontStyle: 'italic', color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              need a look
            </span>
            .
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Switch event ⌄</button>
            <button style={btnInk}>✦ Ask Pear anything</button>
          </div>
        }
      >
        Pear has been weaving in the background since 7:14 this morning. Here&rsquo;s what surfaced.
      </Topbar>

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
          {/* URGENCY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { c: PD.paper2, accent: PD.terra, eyebrow: 'NEEDS YOU TODAY', title: 'Tent not confirmed', body: "Linwood Rentals hasn't returned the 40×60 hold. The other couple looking at Sep 6 may get impatient." },
              { c: PD.paperDeep, accent: PD.gold, eyebrow: 'THIS WEEK', title: 'Dress alterations', body: "Second fitting slot at Maribel's opens Friday 2pm. Seven minutes to book it." },
              { c: PD.paper3, accent: PD.olive, eyebrow: 'GENTLE NUDGE', title: "Grandma's chair", body: 'Accessibility note from RSVP 47. A ramp for the ceremony lawn would matter.' },
            ].map((c, i) => (
              <Panel key={i} bg={c.c} style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 190, cursor: 'pointer' }}>
                <div style={{ ...MONO_STYLE, fontSize: 9, color: c.accent, marginBottom: 10 }}>{c.eyebrow}</div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 20,
                    lineHeight: 1.15,
                    fontWeight: 400,
                    letterSpacing: '-0.015em',
                    marginBottom: 8,
                  }}
                >
                  {c.title}
                </div>
                <div style={{ fontSize: 13, color: PD.inkSoft, lineHeight: 1.5, flex: 1, fontFamily: 'var(--pl-font-body)' }}>
                  {c.body}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                  <button style={{ ...btnMini, background: c.accent, color: PD.paper }}>Handle</button>
                  <button style={btnMiniGhost}>Ask Pear</button>
                </div>
              </Panel>
            ))}
          </div>

          {/* TIMELINE */}
          <Panel bg={PD.paperCard} style={{ padding: '28px 32px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
              <SectionTitle
                eyebrow="THE LOOM · 120 DAYS"
                title="The thread"
                italic="to Sep 6."
                style={{ margin: 0 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btnMiniGhost}>Zoom out</button>
                <button style={btnMiniGhost}>Filter</button>
              </div>
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
                  gridTemplateColumns: `repeat(${TIMELINE.length}, 1fr)`,
                  gap: 0,
                }}
              >
                {TIMELINE.map((m, i) => {
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
                      {above && <TimelineLabel m={m} above />}
                      <div
                        style={{
                          width: m.state === 'target' ? 18 : 14,
                          height: m.state === 'target' ? 18 : 14,
                          borderRadius: 999,
                          background: m.color,
                          border: m.state === 'next' ? `3px solid ${PD.paper}` : 'none',
                          outline: m.state === 'next' ? `2px solid ${m.color}` : 'none',
                          boxShadow: m.state === 'target' ? '0 0 0 4px rgba(31,36,24,0.15)' : 'none',
                          zIndex: 2,
                        }}
                      />
                      {!above && <TimelineLabel m={m} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* WEEK WEAVE */}
          <div
            className="pd-week-weave"
            style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}
          >
            <Panel bg={PD.paper3} style={{ padding: 26 }}>
              <SectionTitle
                eyebrow="THIS WEEK'S WEAVE"
                title="Seven threads,"
                italic="your call on three."
                accent={PD.terra}
              />
              {WEEK.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '38px 1fr auto',
                    alignItems: 'center',
                    padding: '12px 4px',
                    borderBottom: i < WEEK.length - 1 ? '1px solid rgba(31,36,24,0.08)' : 'none',
                    gap: 12,
                  }}
                >
                  <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55 }}>{r.d}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#6A6A56', marginTop: 2 }}>{r.who}</div>
                  </div>
                  <StatusChip s={r.status} />
                </div>
              ))}
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
              <div style={{ position: 'absolute', bottom: -40, right: -30, opacity: 0.5 }} aria-hidden>
                <Bloom size={140} color={PD.butter} centerColor={PD.terra} speed={8} />
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 8 }}>MOOD READING</div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 24,
                  lineHeight: 1.2,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  marginBottom: 16,
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                &ldquo;Green across the loom. The only yellow thread is the tent, and I&rsquo;m on it.&rdquo;
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['Budget: 68%', 'RSVP: 78%', 'Vendor confirms: 9/11'].map((s) => (
                  <span
                    key={s}
                    style={{
                      ...MONO_STYLE,
                      fontSize: 9,
                      padding: '5px 10px',
                      background: 'rgba(244,236,216,0.12)',
                      borderRadius: 999,
                    }}
                  >
                    {s}
                  </span>
                ))}
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
                <div style={{ fontSize: 12 }}>Pear · updated 14 min ago</div>
              </div>
            </Panel>
          </div>
        </div>

        {/* RIGHT: Chat with Pear */}
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
              <div style={{ fontSize: 11, color: '#6A6A56' }}>woven from 412 messages · 38 docs</div>
            </div>
            <button style={{ ...btnMiniGhost, padding: '6px 10px' }}>⋯</button>
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
            {msgs.map((m, i) => (
              <Msg key={i} m={m} onOption={(o) => send(o)} />
            ))}
            {typing && (
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
          </div>

          <div
            style={{
              padding: '12px 14px 14px',
              borderTop: '1px solid rgba(31,36,24,0.08)',
              background: PD.paperCard,
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {['Call vendors', 'Draft email', 'Check budget', 'What changed?'].map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(31,36,24,0.06)',
                    border: '1px solid rgba(31,36,24,0.1)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: PD.ink,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
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
                style={{
                  background: PD.ink,
                  color: PD.paper,
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                }}
              >
                →
              </button>
            </form>
          </div>
        </div>
      </main>

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
    </DashShell>
  );
}

function TimelineLabel({ m, above }: { m: Milestone; above?: boolean }) {
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
      <div style={{ ...MONO_STYLE, fontSize: 9, color: m.color, marginBottom: 3 }}>
        {m.t} · {m.date}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{m.title}</div>
      <div style={{ fontSize: 10.5, color: '#6A6A56', marginTop: 3, lineHeight: 1.3 }}>{m.note}</div>
    </div>
  );
}

function Msg({ m, onOption }: { m: Message; onOption: (o: string) => void }) {
  const mine = m.from === 'me';
  return (
    <div
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
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
        }}
      >
        {m.t}
      </div>
      {m.options && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {m.options.map((o) => (
            <button
              key={o}
              onClick={() => onOption(o)}
              style={{
                fontSize: 11.5,
                padding: '5px 12px',
                borderRadius: 999,
                background: PD.paper,
                border: '1px solid rgba(31,36,24,0.15)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: PD.ink,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
      <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.45, padding: '0 4px' }}>{m.time}</div>
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

function StatusChip({ s }: { s: 'waiting' | 'todo' | 'review' | 'queued' }) {
  const map = {
    waiting: { bg: PD.paper2, fg: PD.terra, label: 'Waiting' },
    todo: { bg: PD.paper, fg: PD.ink, label: 'To do' },
    review: { bg: PD.paperDeep, fg: PD.gold, label: 'Review' },
    queued: { bg: PD.paper3, fg: '#6A6A56', label: 'Queued' },
  };
  const m = map[s];
  const border: CSSProperties = { border: `1px solid ${m.fg}33` };
  return (
    <span
      style={{
        ...MONO_STYLE,
        fontSize: 9,
        padding: '4px 9px',
        borderRadius: 999,
        background: m.bg,
        color: m.fg,
        ...border,
      }}
    >
      {m.label}
    </span>
  );
}
