'use client';

// Guests — RSVP tracker with warm list + filters + Pear notes

import { useState } from 'react';
import { Bloom } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, SectionTitle, btnInk, btnGhost } from './DashShell';

type RsvpKey = 'yes' | 'no' | 'maybe' | 'pending';

interface Guest {
  n: string;
  em: string;
  party: string;
  rsvp: RsvpKey;
  meal: string;
  note: string;
  tags: string[];
}

const GUESTS: Guest[] = [
  { n: 'Anu Patel',         em: 'anu@patel.fam',         party: 'Anu + 1',         rsvp: 'yes',    meal: 'veg',   note: 'Gluten-free, seated w/ college friends', tags: ['family'] },
  { n: 'Marcus + Dana Kim', em: 'm.kim@example.com',     party: 'Kim (3)',         rsvp: 'yes',    meal: 'fish',  note: 'Kids: Otis (7) — kids\' table', tags: ['family','plus-kids'] },
  { n: 'Halide Studios',    em: 'hello@halidestudio.co', party: 'Photog (2)',      rsvp: 'yes',    meal: 'vendor',note: 'Vendor meals · table 11', tags: ['vendor'] },
  { n: 'Grandma Lorraine',  em: '—',                     party: 'Lorraine',        rsvp: 'yes',    meal: 'veg',   note: 'Needs ramp access, chair at aisle', tags: ['family','access'] },
  { n: 'Jenna + Theo',      em: 'jenna.l@email.co',      party: 'Lee (2)',         rsvp: 'yes',    meal: 'beef',  note: '', tags: ['friends'] },
  { n: 'Ren Abara',         em: 'ren@abara.studio',      party: 'Ren',             rsvp: 'maybe',  meal: '—',     note: 'Travelling from Lagos — needs confirm', tags: ['friends','travel'] },
  { n: 'Priya + Dev Rao',   em: 'rao.p@example.org',     party: 'Rao (2)',         rsvp: 'no',     meal: '—',     note: 'Sent a card — watching kids', tags: ['friends'] },
  { n: 'The Calloway Four', em: 'c.calloway@co.net',     party: 'Calloway (4)',    rsvp: 'pending',meal: '—',     note: 'Nudged 2 days ago · open but no click', tags: ['friends'] },
  { n: 'Aunt Ines + Joaq',  em: 'ines@kimfamily.com',    party: 'Kim-Morales (2)', rsvp: 'yes',    meal: 'fish',  note: 'Anniversary the same weekend (!)', tags: ['family'] },
  { n: 'Hailey Chen',       em: 'hailey@coop.farm',      party: 'Hailey + 1',      rsvp: 'yes',    meal: 'beef',  note: '', tags: ['friends'] },
  { n: 'Oscar Santos',      em: 'oscar@santosfam.co',    party: 'Santos (5)',      rsvp: 'pending',meal: '—',     note: 'Open 4x, no tap — Pear will try phone', tags: ['family'] },
  { n: 'Dr. Wen',           em: 'wen@clinic.org',        party: 'Wen',             rsvp: 'yes',    meal: 'veg',   note: 'On call — might leave after toasts', tags: ['friends'] },
];

const rsvpMap: Record<RsvpKey, { bg: string; fg: string; label: string }> = {
  yes:     { bg: '#E6EAC8', fg: PD.oliveDeep, label: 'Yes' },
  no:      { bg: '#F1D7CE', fg: PD.plum,      label: 'No' },
  maybe:   { bg: '#F4E1BC', fg: PD.gold,      label: 'Maybe' },
  pending: { bg: '#E6DFC9', fg: '#6A6A56',    label: 'Pending' },
};

export function DashGuests() {
  const [filter, setFilter] = useState<RsvpKey | 'all'>('all');
  const [q, setQ] = useState('');

  const filtered = GUESTS.filter(
    (g) =>
      (filter === 'all' || g.rsvp === filter) &&
      (q === '' || (g.n + g.note + g.tags.join(' ')).toLowerCase().includes(q.toLowerCase())),
  );

  const counts = {
    all: GUESTS.length,
    yes: GUESTS.filter((g) => g.rsvp === 'yes').length,
    pending: GUESTS.filter((g) => g.rsvp === 'pending').length,
    maybe: GUESTS.filter((g) => g.rsvp === 'maybe').length,
    no: GUESTS.filter((g) => g.rsvp === 'no').length,
  };

  return (
    <DashShell>
      <Topbar
        subtitle="GUESTS · SANTOS–KIM"
        title={
          <span>
            <span style={{ fontStyle: 'italic', color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>138</span>{' '}
            coming, three{' '}
            <span style={{ fontStyle: 'italic', color: PD.gold, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>maybe</span>,
            thirty still quiet.
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>Import from CSV</button>
            <button style={btnInk}>✦ Add a guest</button>
          </div>
        }
      >
        The room has 141 seats. RSVP closes August 16. Pear is following up on the quiet ones once a week.
      </Topbar>

      <main
        className="pd-guests-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* STATS */}
          <div
            className="pd-guests-stats"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}
          >
            {[
              { l: 'Invited', v: 141, c: PD.stone },
              { l: 'Yes', v: counts.yes, c: PD.olive },
              { l: 'Maybe', v: counts.maybe, c: PD.gold },
              { l: 'Pending', v: counts.pending, c: PD.plum },
              { l: 'Declined', v: counts.no, c: PD.terra },
            ].map((s) => (
              <Panel key={s.l} bg={PD.paperCard} style={{ padding: '14px 16px' }}>
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 6 }}>{s.l.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 34,
                      lineHeight: 1,
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      background: PD.paper3,
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${(s.v / 141) * 100}%`,
                        height: '100%',
                        background: s.c,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          {/* FILTER TABS + SEARCH + TABLE */}
          <Panel bg={PD.paper} padding={0} style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '12px 14px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {([
                { k: 'all', l: `All · ${counts.all}` },
                { k: 'yes', l: `Yes · ${counts.yes}` },
                { k: 'pending', l: `Pending · ${counts.pending}` },
                { k: 'maybe', l: `Maybe · ${counts.maybe}` },
                { k: 'no', l: `No · ${counts.no}` },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setFilter(t.k)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 999,
                    background: filter === t.k ? PD.ink : 'transparent',
                    color: filter === t.k ? PD.paper : PD.ink,
                    border: `1px solid ${filter === t.k ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {t.l}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: PD.paper3,
                  borderRadius: 999,
                  padding: '5px 12px',
                  border: '1px solid rgba(31,36,24,0.1)',
                }}
              >
                <span style={{ fontSize: 11, opacity: 0.5, fontFamily: '"Fraunces", Georgia, serif' }}>✦</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, tag, or note"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    width: 200,
                    color: PD.ink,
                  }}
                />
              </div>
            </div>

            {/* TABLE */}
            <div>
              <div
                className="pd-guests-head"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 1fr 0.7fr 1.5fr 90px',
                  padding: '10px 18px',
                  background: PD.paper3,
                  borderBottom: '1px solid rgba(31,36,24,0.08)',
                }}
              >
                {['Guest', 'Party', 'RSVP', 'Note', 'Meal'].map((h) => (
                  <div key={h} style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>{h.toUpperCase()}</div>
                ))}
              </div>
              {filtered.map((g, i) => {
                const r = rsvpMap[g.rsvp];
                return (
                  <div
                    key={i}
                    className="pd-guests-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.3fr 1fr 0.7fr 1.5fr 90px',
                      padding: '14px 18px',
                      borderBottom: i < filtered.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 99,
                          background: `hsl(${(i * 47) % 360} 30% 72%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 600,
                          color: PD.ink,
                          fontFamily: '"Fraunces", Georgia, serif',
                          fontStyle: 'italic',
                        }}
                      >
                        {g.n.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{g.n}</div>
                        <div style={{ fontSize: 11, color: '#6A6A56' }}>{g.em}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13 }}>{g.party}</div>
                    <div>
                      <span
                        style={{
                          ...MONO_STYLE,
                          fontSize: 10,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: r.bg,
                          color: r.fg,
                          border: `1px solid ${r.fg}26`,
                        }}
                      >
                        {r.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: PD.inkSoft,
                        lineHeight: 1.4,
                        fontFamily: 'var(--pl-font-body)',
                      }}
                    >
                      {g.note || <span style={{ opacity: 0.3 }}>—</span>}
                    </div>
                    <div style={{ fontSize: 12, textTransform: 'capitalize', color: '#6A6A56' }}>
                      {g.meal}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* RIGHT — Pear notices */}
        <div
          className="pd-guests-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            position: 'sticky',
            top: 72,
          }}
        >
          <Panel
            bg={PD.ink}
            style={{
              color: PD.paper,
              padding: 22,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.4 }} aria-hidden>
              <Bloom size={100} color={PD.butter} centerColor={PD.terra} speed={9} />
            </div>
            <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.butter, marginBottom: 6 }}>PEAR NOTICED</div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 20,
                lineHeight: 1.25,
                fontWeight: 400,
                fontStyle: 'italic',
                marginBottom: 16,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Three families haven&rsquo;t opened the invite since June. Want me to try a warmer version?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(244,236,216,0.08)',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                Calloway four, Santos five, Ren abara
              </div>
              <button
                style={{
                  ...btnInk,
                  background: PD.paper,
                  color: PD.ink,
                  marginTop: 6,
                }}
              >
                Draft the nudge
              </button>
              <button
                style={{
                  ...btnGhost,
                  borderColor: 'rgba(244,236,216,0.2)',
                  color: PD.paper,
                }}
              >
                Leave them be
              </button>
            </div>
          </Panel>

          <Panel bg={PD.paperDeep} style={{ padding: 20 }}>
            <SectionTitle
              eyebrow="SOFT INSIGHTS"
              title="Small things"
              italic="matter."
              accent={PD.gold}
              style={{ marginBottom: 14 }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              <div style={{ padding: '10px 12px', background: PD.paperCard, borderRadius: 10 }}>
                <span style={{ fontWeight: 600 }}>14 guests</span> marked gluten-free or veg. Current menu
                counts support this.
              </div>
              <div style={{ padding: '10px 12px', background: PD.paperCard, borderRadius: 10 }}>
                <span style={{ fontWeight: 600 }}>2 access notes</span> — ramp at lawn, chair at aisle for
                Lorraine.
              </div>
              <div style={{ padding: '10px 12px', background: PD.paperCard, borderRadius: 10 }}>
                <span style={{ fontWeight: 600 }}>4 kids</span> under 10 — kids&rsquo; table has room, crayons
                ordered.
              </div>
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-guests-main) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-guests-right) {
            position: relative !important;
            top: auto !important;
          }
        }
        @media (max-width: 760px) {
          :global(.pd-guests-stats) {
            grid-template-columns: 1fr 1fr !important;
          }
          :global(.pd-guests-head),
          :global(.pd-guests-row) {
            grid-template-columns: 1fr 0.6fr !important;
          }
          :global(.pd-guests-head) > *:nth-child(n+3),
          :global(.pd-guests-row) > *:nth-child(n+3) {
            display: none;
          }
        }
      `}</style>
    </DashShell>
  );
}
