'use client';

// Day-of room — live dashboard for the event day.

import { useEffect, useState, type CSSProperties } from 'react';
import { Bloom } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, btnInk, btnGhost } from './DashShell';

const PULSE = [
  { t: '3:58 pm', who: 'Mari (hair)', m: 'Just finished Anu. Moving to Lena. Ahead by 8 min.' },
  { t: '3:51 pm', who: 'Pear · auto', m: 'Rain held. 70% to 30% in the next hour. Lawn ceremony remains on.' },
  { t: '3:44 pm', who: 'Luis (bartender)', m: 'Ice is here. Ran short one bag, Benny grabbing from IGA.' },
  { t: '3:30 pm', who: 'Pear · auto', m: 'Shuttle two arrived at the inn. 14 guests boarded.' },
  { t: '3:12 pm', who: 'Scott', m: 'Grandma Lorraine is here. She made it.' },
];

const MILESTONES = [
  { t: '3:30', title: 'Shuttles depart inn', state: 'done' as const },
  { t: '4:00', title: 'Gates open, music begins', state: 'done' as const },
  { t: '4:30', title: 'Ceremony', state: 'soon' as const },
  { t: '5:15', title: 'Cocktail hour, lower lawn', state: 'upcoming' as const },
  { t: '6:30', title: 'Dinner called', state: 'upcoming' as const },
  { t: '8:00', title: 'First dance', state: 'upcoming' as const },
  { t: '10:30', title: 'Last dance + send-off', state: 'upcoming' as const },
];

const VENDORS = [
  { n: 'Linwood Tents', l: 'Setup', s: 'done' as const, c: PD.olive },
  { n: 'Mari Hair + Makeup', l: 'In suite', s: 'live' as const, c: PD.terra },
  { n: 'Floribunda', l: 'Arch set', s: 'done' as const, c: PD.olive },
  { n: 'Sumac Catering', l: 'In kitchen', s: 'live' as const, c: PD.terra },
  { n: 'Luis Bar Co.', l: 'Loading', s: 'live' as const, c: PD.terra },
  { n: 'DJ Harriet', l: 'Sound check', s: 'next' as const, c: PD.gold },
  { n: 'Halide Photo', l: 'Roaming', s: 'live' as const, c: PD.terra },
  { n: 'Inn Shuttle', l: '2 of 4 runs done', s: 'live' as const, c: PD.terra },
  { n: 'Harp Quartet', l: 'Tuning', s: 'next' as const, c: PD.gold },
];

export function DashDayOf() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 30, 0);

  return (
    <DashShell>
      <Topbar
        subtitle="DAY-OF ROOM · LIVE"
        title={
          <span>
            Saturday,{' '}
            <span style={{ fontStyle: 'italic', color: PD.terra, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              Sep 6
            </span>
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <LiveDot />
            <button style={btnGhost}>Share room link</button>
            <button style={btnInk}>✦ Ask Pear now</button>
          </div>
        }
      >
        One source of truth for everyone running today. The room auto-updates. Pear listens and nudges.
      </Topbar>

      <main
        className="pd-dayof-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Countdown + weather */}
          <div
            className="pd-dayof-top"
            style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}
          >
            <Panel
              bg={PD.ink}
              style={{
                padding: '28px 30px',
                color: PD.paper,
                border: 'none',
                overflow: 'hidden',
                position: 'relative',
                minHeight: 220,
              }}
            >
              <div style={{ position: 'absolute', top: -40, right: -40, opacity: 0.4 }} aria-hidden>
                <Bloom size={200} color={PD.butter} centerColor={PD.terra} speed={10} />
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 10, position: 'relative' }}>
                CEREMONY IN
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 84,
                  lineHeight: 0.9,
                  fontWeight: 300,
                  letterSpacing: '-0.03em',
                  position: 'relative',
                }}
              >
                <Countdown target={target} now={now} />
              </div>
              <div style={{ position: 'relative', marginTop: 18, fontSize: 14, color: PD.stone }}>
                4:30 pm · lower lawn · harp quartet cued at 4:27
              </div>
              <div
                style={{
                  position: 'relative',
                  marginTop: 14,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    ...MONO_STYLE,
                    fontSize: 9,
                    padding: '5px 10px',
                    background: 'rgba(244,236,216,0.12)',
                    borderRadius: 999,
                  }}
                >
                  138 / 141 CHECKED IN
                </span>
                <span
                  style={{
                    ...MONO_STYLE,
                    fontSize: 9,
                    padding: '5px 10px',
                    background: 'rgba(184,146,68,0.3)',
                    borderRadius: 999,
                    color: PD.butter,
                  }}
                >
                  2 EN ROUTE
                </span>
              </div>
            </Panel>

            <Panel
              bg={PD.paperDeep}
              style={{
                padding: 22,
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.gold, marginBottom: 10 }}>
                  WEATHER · HOLLOW BARN
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <Bloom size={58} color={PD.butter} centerColor={PD.gold} speed={16} />
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 56,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '-0.025em',
                    }}
                  >
                    72<span style={{ fontSize: 20 }}>°F</span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: PD.inkSoft,
                    marginTop: 8,
                    lineHeight: 1.5,
                    fontFamily: 'var(--pl-font-body)',
                  }}
                >
                  Clear. 6mph NW breeze. Sunset arrives at <b>7:14</b>, so golden-hour portraits start
                  around <b>6:30</b>.
                </div>
              </div>
              <div
                style={{
                  ...MONO_STYLE,
                  fontSize: 9,
                  opacity: 0.5,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(31,36,24,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>LAST CHECK · 14s ago</span>
                <span>70% → 30% rain</span>
              </div>
            </Panel>
          </div>

          {/* Milestones bar */}
          <Panel bg={PD.paperCard} style={{ padding: '26px 28px' }}>
            <SectionTitle
              eyebrow="THE DAY"
              title="Seven beats,"
              italic="one thread."
              style={{ marginBottom: 18 }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${MILESTONES.length}, 1fr)`,
                gap: 8,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '4%',
                  right: '4%',
                  top: 16,
                  height: 2,
                  background: PD.line,
                  borderRadius: 99,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '4%',
                  top: 16,
                  height: 2,
                  background: PD.olive,
                  borderRadius: 99,
                  width: '26%',
                }}
              />
              {MILESTONES.map((m, i) => (
                <div key={i} style={{ position: 'relative', textAlign: 'center', zIndex: 2 }}>
                  <div
                    style={{
                      margin: '0 auto 8px',
                      width: m.state === 'soon' ? 20 : 14,
                      height: m.state === 'soon' ? 20 : 14,
                      borderRadius: 99,
                      background:
                        m.state === 'done' ? PD.olive : m.state === 'soon' ? PD.terra : PD.line,
                      border: m.state === 'soon' ? `3px solid ${PD.paperCard}` : 'none',
                      outline: m.state === 'soon' ? `2px solid ${PD.terra}` : 'none',
                      animation: m.state === 'soon' ? 'pl-bloom-breathe 2.4s ease-in-out infinite' : 'none',
                    }}
                  />
                  <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6 }}>{m.t}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, marginTop: 3, lineHeight: 1.2 }}>
                    {m.title}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Vendors */}
          <Panel bg={PD.paper3} style={{ padding: 26 }}>
            <SectionTitle
              eyebrow="ON SITE · 11 CREWS"
              title="Everyone"
              italic="accounted for."
              accent={PD.olive}
            />
            <div
              className="pd-dayof-vendors"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
            >
              {VENDORS.map((v, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    background: PD.paperCard,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    border: '1px solid rgba(31,36,24,0.08)',
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 99,
                      background: v.c,
                      flexShrink: 0,
                      animation: v.s === 'live' ? 'pl-bloom-breathe 2s ease-in-out infinite' : 'none',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {v.n}
                    </div>
                    <div style={{ fontSize: 11, color: '#6A6A56' }}>{v.l}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* RIGHT — pulse + quick actions */}
        <div
          className="pd-dayof-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            position: 'sticky',
            top: 72,
          }}
        >
          <Panel bg={PD.paper} style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
              }}
            >
              <div style={{ ...DISPLAY_STYLE, fontSize: 18, letterSpacing: '-0.015em' }}>Live pulse</div>
              <LiveDot />
            </div>
            <div style={{ padding: '10px 0', maxHeight: 360, overflowY: 'auto' }}>
              {PULSE.map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 20px',
                    display: 'flex',
                    gap: 12,
                    borderBottom: i < PULSE.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
                  }}
                >
                  <div
                    style={{
                      ...MONO_STYLE,
                      fontSize: 9,
                      opacity: 0.5,
                      width: 50,
                      flexShrink: 0,
                      paddingTop: 3,
                    }}
                  >
                    {p.t}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.who}</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: PD.inkSoft,
                        lineHeight: 1.5,
                        marginTop: 2,
                        fontFamily: 'var(--pl-font-body)',
                      }}
                    >
                      {p.m}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: PD.paper3,
                borderTop: '1px solid rgba(31,36,24,0.08)',
              }}
            >
              <form
                onSubmit={(e) => e.preventDefault()}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  background: PD.paperCard,
                  border: '1px solid rgba(31,36,24,0.12)',
                  borderRadius: 12,
                  padding: '6px 8px 6px 12px',
                }}
              >
                <input
                  placeholder="Say something to the whole room..."
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    padding: '6px 0',
                    color: PD.ink,
                  }}
                />
                <button
                  style={{
                    background: PD.ink,
                    color: PD.paper,
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Post
                </button>
              </form>
            </div>
          </Panel>

          <Panel bg={PD.paper2} style={{ padding: 22 }}>
            <SectionTitle
              eyebrow="QUICK THROWS"
              title="Handle it in"
              italic="one tap."
              accent={PD.terra}
            />
            <div
              className="pd-dayof-throws"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
            >
              {[
                'Call the tent guy',
                'Delay ceremony 10 min',
                'Hide the bar location',
                'Broadcast weather plan',
                'Start grand-entrance music',
                'Dim the lawn lights',
              ].map((q) => (
                <button
                  key={q}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    fontSize: 12.5,
                    background: PD.paperCard,
                    border: '1px solid rgba(31,36,24,0.12)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    color: PD.ink,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-dayof-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-dayof-right) {
            position: relative !important;
            top: auto !important;
          }
        }
        @media (max-width: 760px) {
          :global(.pd-dayof-top),
          :global(.pd-dayof-vendors),
          :global(.pd-dayof-throws) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashShell>
  );
}

function Countdown({ target, now }: { target: Date; now: Date }) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span>
      {h.toString().padStart(1, '0')}
      <span style={{ opacity: 0.4 }}>:</span>
      {m.toString().padStart(2, '0')}
      <span style={{ opacity: 0.4 }}>:</span>
      {s.toString().padStart(2, '0')}
    </span>
  );
}

function LiveDot() {
  const style: CSSProperties = {
    ...MONO_STYLE,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: PD.terra,
  };
  return (
    <span style={style}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: PD.terra,
          animation: 'pl-bloom-breathe 1.6s ease-in-out infinite',
        }}
      />
      LIVE
    </span>
  );
}
