'use client';

// Connections — people as knots, events as threads.

import { Fragment, useState } from 'react';
import { Bloom, Sparkle } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';

interface Person {
  x: number; y: number; r: number;
  name: string; role: string; color: string;
  couple?: boolean; future?: boolean;
}

interface Event {
  n: string;
  type: 'birth' | 'friend' | 'marriage' | 'sibling';
  year: number;
  from: string;
  to: string;
  highlight?: boolean;
  future?: boolean;
}

const PEOPLE: Record<string, Person> = {
  lorraine: { x: 50, y: 28, r: 38, name: 'Lorraine Kim', role: 'Grandmother',   color: PD.plum },
  marcus:   { x: 28, y: 48, r: 30, name: 'Marcus Kim',   role: 'Father of bride', color: PD.olive },
  dana:     { x: 28, y: 68, r: 28, name: 'Dana Kim',     role: 'Mother of bride', color: PD.gold },
  anu:      { x: 52, y: 58, r: 34, name: 'Anu Santos-Kim', role: 'Bride',         color: PD.terra, couple: true },
  priya:    { x: 66, y: 58, r: 34, name: 'Priya Santos', role: 'Spouse',          color: PD.terra, couple: true },
  oscar:    { x: 80, y: 44, r: 28, name: 'Oscar Santos', role: 'Father of spouse', color: PD.olive },
  ines:     { x: 82, y: 68, r: 26, name: 'Ines Morales', role: 'Aunt',            color: PD.rose },
  theo:     { x: 48, y: 85, r: 20, name: 'Theo (future)', role: 'Child, 2028',    color: PD.stone, future: true },
};

const EVENTS: Event[] = [
  { n: 'lorraine+marcus', type: 'birth',    year: 1962, from: 'lorraine', to: 'marcus' },
  { n: 'lorraine+oscar',  type: 'friend',   year: 1998, from: 'lorraine', to: 'oscar' },
  { n: 'marcus+dana',     type: 'marriage', year: 1991, from: 'marcus',   to: 'dana' },
  { n: 'anu-child',       type: 'birth',    year: 1995, from: 'marcus',   to: 'anu' },
  { n: 'anu-child2',      type: 'birth',    year: 1995, from: 'dana',     to: 'anu' },
  { n: 'anu-priya',       type: 'marriage', year: 2026, from: 'anu',      to: 'priya', highlight: true },
  { n: 'priya-child',     type: 'birth',    year: 1994, from: 'oscar',    to: 'priya' },
  { n: 'priya-sister',    type: 'sibling',  year: 2001, from: 'priya',    to: 'ines' },
  { n: 'future-child',    type: 'birth',    year: 2028, from: 'anu',      to: 'theo', future: true },
  { n: 'future-child2',   type: 'birth',    year: 2028, from: 'priya',    to: 'theo', future: true },
];

export function DashConnections() {
  const [focus, setFocus] = useState('lorraine');
  const focusPerson = PEOPLE[focus];

  return (
    <DashShell>
      <Topbar
        subtitle="CONNECTIONS · THE FAMILY LOOM"
        title={
          <span>
            Every person is a{' '}
            <span style={{ fontStyle: 'italic', color: PD.plum, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              knot
            </span>
            . Every event is a thread.
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Add a person</button>
            <button style={btnInk}>✦ Pear, what am I missing?</button>
          </div>
        }
      >
        Weave your events into a lifelong tapestry. The photos from Marcus&rsquo;s 60th sit next to
        Dana&rsquo;s sister&rsquo;s wedding. When the next gathering comes, the stories are already there.
      </Topbar>

      <main
        className="pd-connections-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        {/* LOOM CANVAS */}
        <Panel bg={PD.paperCard} style={{ padding: 0, overflow: 'hidden', minHeight: 620 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 22px',
              borderBottom: '1px solid rgba(31,36,24,0.08)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>
                THE KIM–SANTOS LOOM · 8 KNOTS · 66 YEARS
              </div>
              <div style={{ ...DISPLAY_STYLE, fontSize: 18, marginTop: 3, fontWeight: 500 }}>
                Weaving 1960 → 2028
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>LEGEND ·</div>
              {[
                { l: 'marriage', c: PD.terra },
                { l: 'birth', c: PD.olive },
                { l: 'friend', c: PD.gold },
                { l: 'future', c: PD.stone, dash: true },
              ].map((x) => (
                <span
                  key={x.l}
                  style={{ ...MONO_STYLE, fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      background: x.dash ? 'transparent' : x.c,
                      borderTop: x.dash ? `2px dashed ${x.c}` : 'none',
                    }}
                  />{' '}
                  {x.l.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 560,
              background: `linear-gradient(180deg, ${PD.paperCard} 0%, ${PD.paper3} 100%)`,
            }}
          >
            {/* Threads */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0 }}
            >
              {EVENTS.map((e, i) => {
                const a = PEOPLE[e.from];
                const b = PEOPLE[e.to];
                const midX = (a.x + b.x) / 2 + ((i % 3) - 1) * 3;
                const midY = (a.y + b.y) / 2 + ((i % 2) - 0.5) * 4;
                const color =
                  e.type === 'marriage'
                    ? PD.terra
                    : e.type === 'birth'
                    ? PD.olive
                    : e.type === 'sibling'
                    ? PD.plum
                    : PD.gold;
                return (
                  <g key={i}>
                    <path
                      d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`}
                      stroke={color}
                      strokeWidth={e.highlight ? 0.45 : 0.28}
                      fill="none"
                      strokeDasharray={e.future ? '0.8 1' : undefined}
                      strokeOpacity={e.future ? 0.5 : e.highlight ? 1 : 0.7}
                    />
                    {e.highlight && (
                      <path
                        d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`}
                        stroke={color}
                        strokeWidth="0.18"
                        fill="none"
                        strokeDasharray="0.6 0.8"
                        opacity="0.9"
                        style={{ animation: 'pl-thread-dash 24s linear infinite' }}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* People */}
            {Object.entries(PEOPLE).map(([k, p]) => {
              const active = k === focus;
              return (
                <button
                  key={k}
                  onClick={() => setFocus(k)}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: p.r * 2,
                    height: p.r * 2,
                    borderRadius: 999,
                    background: p.future ? 'transparent' : p.color,
                    border: p.future
                      ? `2px dashed ${p.color}`
                      : active
                      ? `3px solid ${PD.ink}`
                      : `2px solid ${PD.paperCard}`,
                    boxShadow: active
                      ? '0 10px 30px -6px rgba(31,36,24,0.3)'
                      : '0 4px 10px -4px rgba(31,36,24,0.2)',
                    cursor: 'pointer',
                    fontFamily: '"Fraunces", Georgia, serif',
                    color: PD.paper,
                    fontSize: 11,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 200ms',
                    padding: 4,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: p.r > 30 ? 13 : 10.5,
                      lineHeight: 1.1,
                      color: p.future ? p.color : PD.paper,
                      fontWeight: 600,
                    }}
                  >
                    {p.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                </button>
              );
            })}

            {/* Year ribbon */}
            <div
              style={{
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 16,
                height: 28,
                background: 'rgba(31,36,24,0.88)',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                padding: '0 18px',
                color: PD.paper,
                fontSize: 10,
                ...MONO_STYLE,
              }}
            >
              {[1960, 1975, 1990, 2005, 2020, 2030, 2050].map((y, i, arr) => (
                <Fragment key={y}>
                  <span style={{ opacity: 0.7 }}>{y}</span>
                  {i < arr.length - 1 && (
                    <span
                      style={{
                        flex: 1,
                        height: 1,
                        background: 'rgba(244,236,216,0.2)',
                        margin: '0 8px',
                      }}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </Panel>

        {/* RIGHT — focus detail */}
        <div
          className="pd-connections-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'sticky',
            top: 72,
          }}
        >
          <Panel bg={PD.paper2} style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{ position: 'absolute', top: -60, right: -60, opacity: 0.28, pointerEvents: 'none' }}
              aria-hidden
            >
              <Bloom size={130} color={focusPerson.color} centerColor={PD.plum} speed={12} />
            </div>
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 9,
                color: focusPerson.color,
                marginBottom: 10,
                position: 'relative',
              }}
            >
              FOCUS · {focusPerson.role.toUpperCase()}
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 28,
                lineHeight: 1.08,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                position: 'relative',
                maxWidth: '82%',
              }}
            >
              {focusPerson.name}
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 14,
                fontStyle: 'italic',
                color: focusPerson.color,
                marginTop: 8,
                position: 'relative',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {focus === 'lorraine' ? 'born 1938 · Seoul → Boise' : 'appears in 4 events'}
            </div>
            <div
              style={{
                marginTop: 22,
                padding: '14px 0',
                borderTop: '1px solid rgba(31,36,24,0.1)',
                borderBottom: '1px solid rgba(31,36,24,0.1)',
              }}
            >
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 10 }}>
                THREADS THROUGH LORRAINE
              </div>
              {[
                { y: 1962, t: 'Gave birth to Marcus', c: PD.olive, upcoming: false },
                { y: 1991, t: 'Walked Marcus at his wedding', c: PD.terra, upcoming: false },
                { y: 1995, t: 'First to hold baby Anu', c: PD.olive, upcoming: false },
                { y: 2026, t: 'Will sit at the aisle · Sep 6', c: PD.terra, upcoming: true },
              ].map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0' }}>
                  <div style={{ ...MONO_STYLE, fontSize: 10, color: e.c, width: 42, flexShrink: 0 }}>
                    {e.y}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: PD.ink,
                      fontWeight: e.upcoming ? 600 : 400,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {e.t}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button style={{ ...btnMini, background: PD.ink, color: PD.paper, flex: 1 }}>
                View her reel
              </button>
              <button style={btnMiniGhost}>Add a memory</button>
            </div>
          </Panel>

          <Panel
            bg={PD.ink}
            style={{
              padding: 22,
              color: PD.paper,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Sparkle size={24} color={PD.butter} />
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 20,
                lineHeight: 1.3,
                fontStyle: 'italic',
                fontWeight: 400,
                margin: '12px 0 14px',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &ldquo;A wedding today is a memorial in forty years. Start the weave now.&rdquo;
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: PD.stone,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              When you host a memorial for Lorraine someday, Pearloom will already have the photos, the
              songs she loved, the names of everyone who shaped her.
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-connections-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-connections-right) {
            position: relative !important;
            top: auto !important;
          }
        }
      `}</style>
    </DashShell>
  );
}
