'use client';

// Analytics — quiet numbers, warm readings.

import { Swirl } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, btnInk, btnGhost } from './DashShell';

export function DashAnalytics() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const visits = [14, 18, 21, 35, 88, 142, 67];
  const max = Math.max(...visits);
  const rsvpCurve = [0, 4, 10, 18, 32, 48, 62, 78, 92, 108, 118];

  return (
    <DashShell>
      <Topbar
        subtitle="ANALYTICS · SANTOS–KIM"
        title={
          <span>
            Quiet{' '}
            <span style={{ fontStyle: 'italic', color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              numbers
            </span>
            , warm{' '}
            <span style={{ fontStyle: 'italic', color: PD.gold, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              readings
            </span>
            .
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Export CSV</button>
            <button style={btnInk}>✦ Ask Pear to summarize</button>
          </div>
        }
      >
        You&rsquo;ll see how people are moving through the site. Not vanity metrics, the ones that help you
        plan.
      </Topbar>

      <main style={{ padding: '20px 40px 60px' }}>
        {/* KPIs */}
        <div
          className="pd-analytics-kpi"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}
        >
          {[
            { l: 'Site visits · 7d', v: '385', delta: '+34%', c: PD.olive },
            { l: 'RSVP completion', v: '78%', delta: '+12 this week', c: PD.gold },
            { l: 'Median scroll', v: '82%', delta: 'Reaches the story block', c: PD.plum },
            { l: 'Avg. dwell', v: '4m 12s', delta: 'Longer than wedding average', c: PD.terra },
          ].map((k) => (
            <Panel key={k.l} bg={PD.paperCard} style={{ padding: '18px 20px' }}>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 8 }}>
                {k.l.toUpperCase()}
              </div>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 40,
                  lineHeight: 1,
                  fontWeight: 400,
                  letterSpacing: '-0.025em',
                }}
              >
                {k.v}
              </div>
              <div style={{ fontSize: 11.5, color: k.c, marginTop: 8, fontWeight: 500, fontFamily: 'var(--pl-font-body)' }}>
                {k.delta}
              </div>
            </Panel>
          ))}
        </div>

        {/* Charts */}
        <div
          className="pd-analytics-charts"
          style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, marginBottom: 20 }}
        >
          <Panel bg={PD.paper3} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="VISITS · LAST 7 DAYS"
              title="Saturday is"
              italic="opening day."
              accent={PD.olive}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: 180,
                gap: 14,
                padding: '20px 4px 0',
              }}
            >
              {visits.map((v, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#6A6A56', fontWeight: 500 }}>{v}</div>
                  <div
                    style={{
                      width: '100%',
                      height: `${(v / max) * 140}px`,
                      background: i === 5 ? PD.terra : PD.olive,
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.5 }}>{days[i]}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                padding: '12px 14px',
                background: PD.paperCard,
                borderRadius: 12,
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.5,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <span style={{ fontSize: 16, color: PD.terra, fontFamily: '"Fraunces", Georgia, serif' }}>✦</span>
              <span>
                <b>Pear noticed.</b> Traffic spiked Saturday after Marcus shared to the family thread.
                That&rsquo;s usually when RSVPs start flowing too.
              </span>
            </div>
          </Panel>

          <Panel bg={PD.paperDeep} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="RSVP CURVE · 10 WEEKS"
              title="Steady, not"
              italic="panicked."
              accent={PD.gold}
            />
            <div style={{ height: 200, position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="rsvpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PD.gold} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={PD.gold} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={200 - y * 180}
                    x2="400"
                    y2={200 - y * 180}
                    stroke="rgba(31,36,24,0.08)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d={`M 0 ${200 - rsvpCurve[0] * 1.5} ${rsvpCurve
                    .map((v, i) => `L ${(i / (rsvpCurve.length - 1)) * 400} ${200 - v * 1.5}`)
                    .join(' ')} L 400 200 L 0 200 Z`}
                  fill="url(#rsvpGrad)"
                />
                <path
                  d={`M 0 ${200 - rsvpCurve[0] * 1.5} ${rsvpCurve
                    .map((v, i) => `L ${(i / (rsvpCurve.length - 1)) * 400} ${200 - v * 1.5}`)
                    .join(' ')}`}
                  stroke={PD.gold}
                  strokeWidth="2.5"
                  fill="none"
                />
                {rsvpCurve.map((v, i) => (
                  <circle
                    key={i}
                    cx={(i / (rsvpCurve.length - 1)) * 400}
                    cy={200 - v * 1.5}
                    r="4"
                    fill={PD.paperDeep}
                    stroke={PD.gold}
                    strokeWidth="2"
                  />
                ))}
                <circle cx="400" cy={200 - 118 * 1.5} r="8" fill={PD.terra} />
              </svg>
              <div
                style={{
                  ...MONO_STYLE,
                  position: 'absolute',
                  right: 10,
                  top: 12,
                  fontSize: 10,
                  color: PD.terra,
                  background: PD.paperCard,
                  padding: '3px 8px',
                  borderRadius: 999,
                  border: `1px solid ${PD.terra}`,
                }}
              >
                TODAY · 118 YES
              </div>
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Your curve mirrors the average Pearloom wedding. Expect the remaining RSVPs to arrive in
              three small waves: two weeks out, five days out, and the morning of.
            </div>
          </Panel>
        </div>

        {/* Scroll depth */}
        <div
          className="pd-analytics-scroll"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}
        >
          <Panel bg={PD.paper} style={{ padding: 28 }}>
            <SectionTitle
              eyebrow="WHAT PEOPLE READ"
              title="Scroll depth"
              italic="on the site."
              accent={PD.plum}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { s: 'Hero', pct: 100, c: PD.olive },
                { s: 'The couple (story)', pct: 92, c: PD.olive },
                { s: 'Schedule', pct: 84, c: PD.olive },
                { s: 'RSVP', pct: 71, c: PD.gold },
                { s: 'Travel + lodging', pct: 58, c: PD.gold },
                { s: 'Registry', pct: 44, c: PD.terra },
                { s: 'FAQ', pct: 31, c: PD.terra },
                { s: 'Footer', pct: 22, c: PD.plum },
              ].map((r) => (
                <div
                  key={r.s}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 54px',
                    gap: 14,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.s}</div>
                  <div
                    style={{
                      height: 12,
                      background: PD.paper3,
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${r.pct}%`,
                        height: '100%',
                        background: r.c,
                        borderRadius: 99,
                        transition: 'width 600ms',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      ...MONO_STYLE,
                      fontSize: 11,
                      textAlign: 'right',
                      color: r.c,
                      fontWeight: 500,
                    }}
                  >
                    {r.pct}%
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            bg={PD.ink}
            style={{
              padding: 28,
              color: PD.paper,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', bottom: -40, right: -30, opacity: 0.4 }} aria-hidden>
              <Swirl size={180} color={PD.butter} strokeWidth={2} />
            </div>
            <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 8 }}>
              PEAR&rsquo;S READING
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 22,
                lineHeight: 1.3,
                fontStyle: 'italic',
                fontWeight: 400,
                marginBottom: 18,
                position: 'relative',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &ldquo;People love your story, lose interest at Registry. Want me to rewrite it warmer, less
              checklist?&rdquo;
            </div>
            <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
              <button style={{ ...btnInk, background: PD.paper, color: PD.ink }}>Rewrite it</button>
              <button
                style={{ ...btnGhost, color: PD.paper, borderColor: 'rgba(244,236,216,0.22)' }}
              >
                Leave it
              </button>
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-analytics-kpi) {
            grid-template-columns: 1fr 1fr !important;
          }
          :global(.pd-analytics-charts),
          :global(.pd-analytics-scroll) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashShell>
  );
}
