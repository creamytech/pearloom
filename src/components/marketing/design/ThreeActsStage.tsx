'use client';

// Three Acts — Compose / Conduct / Remember. Tabbed stage with a
// per-act animated preview: ComposeStage (drafting chat +
// palette + blocks), ConductStage (live run-of-show + seating +
// photo/voice counters), RememberStage (gallery grid + "one year
// on" card + stats). Matches design bundle's builder.jsx exactly.

import { useState, type CSSProperties } from 'react';
import { Bloom } from '@/components/brand/groove';
import { Pear, Pearl, Pill, PLButton, Ornament, PD, DISPLAY_STYLE, MONO_STYLE } from './DesignAtoms';

interface Act {
  key: string;
  num: string;
  verb: string;
  tag: string;
  h: string;
  p: string;
  accent: string;
}

const ACTS: Act[] = [
  {
    key: 'compose',
    num: 'I',
    verb: 'Compose',
    tag: 'THE SITE',
    h: 'Three questions. A handful of photos. A whole site.',
    p: "Tell Pear what you're gathering for, when, and where. Drop in some pictures. She reads the faces, the light, the season, and presses a five-color palette from your own photographs. The cover, the story, the RSVP, travel, registry, FAQ, all drafted in your voice, ready for you to edit a word or two.",
    accent: PD.olive,
  },
  {
    key: 'conduct',
    num: 'II',
    verb: 'Conduct',
    tag: 'THE DAY-OF',
    h: 'On the day, Pearloom becomes a room.',
    p: 'Announcements push to guests in a breath. Voice toasts collect in one moderated stream. Vendor bookings sit beside the run-of-show. A live photo wall fills in as the night unfolds. Drag tables on a real floor plan with constraints like must sit together and avoid table seven.',
    accent: PD.terra,
  },
  {
    key: 'remember',
    num: 'III',
    verb: 'Remember',
    tag: 'THE FILM',
    h: "Pearloom doesn't quietly retire.",
    p: "Photos file themselves into The Reel, one gallery across every site you've ever made. On the right dates, the site returns with a highlight film auto-cut from the weekend and a time capsule of notes. Your first site is yours to keep, free, forever.",
    accent: PD.gold,
  },
];

export function ThreeActsStage() {
  const [act, setAct] = useState(0);
  const a = ACTS[act];

  return (
    <section id="acts" style={{ padding: '140px 24px 100px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72, maxWidth: 780, marginInline: 'auto' }}>
          <Pill color="transparent" style={{ marginBottom: 18 }}>
            <Pearl size={7} /> THE THREE ACTS
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(40px, 5.5vw, 80px)',
              lineHeight: 0.95,
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: PD.ink,
            }}
          >
            Every Pearloom celebration lives
            <br />
            inside{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              three verbs.
            </span>
          </h2>
        </div>

        {/* Big tabbed stage */}
        <div
          style={{
            background: PD.paper3,
            border: '1px solid rgba(31,36,24,0.14)',
            borderRadius: 28,
            padding: 'clamp(24px, 3vw, 48px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{ position: 'absolute', top: -30, right: -30, opacity: 0.3, pointerEvents: 'none' }}
            aria-hidden
          >
            <Bloom size={180} color={a.accent} centerColor={PD.ink} speed={5} />
          </div>

          {/* Act chooser */}
          <div
            className="pd-acts-tabs"
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid rgba(31,36,24,0.15)',
              marginBottom: 36,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {ACTS.map((x, i) => (
              <button
                key={x.key}
                onClick={() => setAct(i)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '18px 14px 24px',
                  textAlign: 'left',
                  color: act === i ? PD.ink : 'rgba(31,36,24,0.45)',
                  fontFamily: 'inherit',
                  position: 'relative',
                  borderRight: i < 2 ? '1px solid rgba(31,36,24,0.1)' : 'none',
                }}
              >
                <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.7, marginBottom: 8 }}>
                  ACT {x.num} · {x.tag}
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 'clamp(24px, 3vw, 36px)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    color: act === i ? x.accent : 'inherit',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  {x.verb}
                </div>
                {act === i && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: x.accent,
                      borderRadius: 2,
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <div
            className="pd-acts-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '0.9fr 1.1fr',
              gap: 48,
              alignItems: 'center',
              minHeight: 440,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div>
              <h3
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 'clamp(28px, 3.2vw, 44px)',
                  lineHeight: 1.05,
                  fontWeight: 400,
                  margin: '0 0 20px',
                  letterSpacing: '-0.02em',
                  color: PD.ink,
                }}
              >
                {a.h}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: PD.inkSoft,
                  margin: '0 0 28px',
                  maxWidth: 460,
                }}
              >
                {a.p}
              </p>
              <PLButton variant="ghost" size="md" style={{ borderColor: a.accent, color: a.accent }}>
                See act {a.num.toLowerCase()} in motion →
              </PLButton>
            </div>

            <div style={{ position: 'relative' }}>
              {act === 0 && <ComposeStage accent={a.accent} />}
              {act === 1 && <ConductStage accent={a.accent} />}
              {act === 2 && <RememberStage accent={a.accent} />}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-acts-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

// ── Compose stage — Pear chat + palette + basted blocks ───────
function ComposeStage({ accent }: { accent: string }) {
  return (
    <div
      style={{
        background: PD.paper,
        border: '1px solid rgba(31,36,24,0.14)',
        borderRadius: 20,
        padding: 24,
        position: 'relative',
        minHeight: 420,
      }}
    >
      <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.6, marginBottom: 12 }}>
        PEAR · DRAFTING IN YOUR VOICE
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Pear size={24} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <div
            style={{
              background: PD.paper2,
              borderRadius: 14,
              padding: '10px 14px',
              fontSize: 13,
              color: PD.ink,
              maxWidth: '85%',
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            What are we gathering for, and when?
          </div>
        </div>
        <div
          style={{
            alignSelf: 'flex-end',
            background: PD.ink,
            color: PD.paper,
            borderRadius: 14,
            padding: '10px 14px',
            fontSize: 13,
            maxWidth: '75%',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          Our wedding. September 6, in Point Reyes.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Pear size={24} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <div
            style={{
              background: PD.paper2,
              borderRadius: 14,
              padding: '10px 14px',
              fontSize: 13,
              color: PD.ink,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            <span style={{ ...MONO_STYLE, opacity: 0.6, fontSize: 9 }}>threading</span>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 99,
                background: accent,
                animation: 'pl-float-y 1.2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Palette */}
      <div
        style={{
          background: PD.paper2,
          border: '1px solid rgba(31,36,24,0.08)',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.65 }}>PALETTE · PRESSED FROM 12 PHOTOS</div>
          <Pearl size={8} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { c: PD.paper, l: 'paper' },
            { c: PD.gold, l: 'gold' },
            { c: PD.olive, l: 'olive' },
            { c: PD.stone, l: 'stone' },
            { c: PD.plum, l: 'plum' },
          ].map((s) => (
            <div key={s.l} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: s.c,
                  borderRadius: 8,
                  border: '1px solid rgba(31,36,24,0.12)',
                }}
              />
              <div style={{ ...MONO_STYLE, fontSize: 8, opacity: 0.55, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...MONO_STYLE, fontSize: 10, marginBottom: 8 }}>BLOCKS · BASTED IN</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['Cover', 'Story', 'RSVP', 'Travel', 'Registry', 'Toasts', 'FAQ', 'Run of show'].map((b, i) => {
          const on = i < 5;
          return (
            <span
              key={b}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 999,
                background: on ? accent : 'transparent',
                color: on ? PD.paper : PD.ink,
                border: on ? 'none' : '1px dashed rgba(31,36,24,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              {on && <span style={{ width: 5, height: 5, borderRadius: 99, background: PD.paper }} />}
              {b}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Conduct stage — live run-of-show + announcement + seating ─
function ConductStage({ accent }: { accent: string }) {
  return (
    <div
      style={{
        background: PD.paper,
        border: '1px solid rgba(31,36,24,0.14)',
        borderRadius: 20,
        padding: 20,
        minHeight: 420,
        position: 'relative',
      }}
    >
      <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.6, marginBottom: 14 }}>
        THE DIRECTOR · LIVE ROOM
      </div>

      <div style={{ background: PD.paper2, borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 16,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Run of the day
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: accent, fontFamily: 'var(--pl-font-body)' }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: accent,
                animation: 'pl-float-y 1.4s infinite',
              }}
            />
            now · 6:42pm
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            height: 8,
            background: PD.line,
            borderRadius: 99,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '58%',
              background: `linear-gradient(90deg, ${accent}, ${PD.gold})`,
              borderRadius: 99,
            }}
          />
          {[0, 20, 42, 58, 78, 100].map((p, i) => (
            <div
              key={p}
              style={{
                position: 'absolute',
                left: `${p}%`,
                top: -3,
                width: 14,
                height: 14,
                borderRadius: 99,
                background: PD.paper,
                border: `1.5px solid ${i <= 3 ? accent : PD.stone}`,
                transform: 'translateX(-50%)',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: PD.inkSoft, fontFamily: 'var(--pl-font-body)' }}>
          <span>3:30 arrive</span>
          <span>4:00 vows</span>
          <span>5:15 portraits</span>
          <span>6:30 supper</span>
          <span>9:00 dance</span>
        </div>
      </div>

      <div
        style={{
          background: PD.ink,
          color: PD.paper,
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--pl-font-body)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 99, background: accent }} />
        <div style={{ flex: 1, fontSize: 12.5 }}>
          Announcement.{' '}
          <em style={{ fontFamily: '"Fraunces", Georgia, serif', fontStyle: 'italic' }}>
            Toasts are starting. Come back to the long table.
          </em>
        </div>
        <button
          style={{
            background: accent,
            color: PD.paper,
            border: 'none',
            padding: '5px 10px',
            borderRadius: 999,
            fontSize: 10,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Push
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1.2',
              borderRadius: 12,
              background: i === 3 ? accent : PD.paper2,
              border: '1px solid rgba(31,36,24,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: i === 3 ? PD.paper : PD.inkSoft,
              fontWeight: 500,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            T{i + 1}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {[PD.stone, PD.rose, PD.pear, PD.butter, PD.plum].map((c, i) => (
          <div
            key={c}
            style={{
              flex: 1,
              aspectRatio: '1',
              borderRadius: 8,
              background: c,
              opacity: 0.8 - i * 0.08,
              border: '1px solid rgba(31,36,24,0.1)',
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: PD.inkSoft,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--pl-font-body)',
        }}
      >
        <span>◎ 124 photos threading in</span>
        <span>♪ 8 voice toasts queued</span>
      </div>
    </div>
  );
}

// ── Remember stage — photo collage + one year on + stats ──────
function RememberStage({ accent }: { accent: string }) {
  const tiles: Array<{ c: string; cs: CSSProperties['gridColumn']; rs: CSSProperties['gridRow'] }> = [
    { c: PD.olive, cs: 'span 3', rs: 'span 2' },
    { c: PD.rose, cs: 'span 3', rs: 'span 3' },
    { c: PD.stone, cs: 'span 2', rs: 'span 2' },
    { c: PD.gold, cs: 'span 1', rs: 'span 2' },
    { c: PD.pear, cs: 'span 3', rs: 'span 2' },
    { c: PD.plum, cs: 'span 3', rs: 'span 2' },
  ];
  return (
    <div
      style={{
        background: PD.paper,
        border: '1px solid rgba(31,36,24,0.14)',
        borderRadius: 20,
        padding: 20,
        minHeight: 420,
        position: 'relative',
      }}
    >
      <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.6, marginBottom: 14 }}>
        THE REEL · ONE GALLERY ACROSS EVERY SITE
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '40px', gap: 4, marginBottom: 14 }}>
        {tiles.map((t, i) => (
          <div
            key={i}
            style={{ gridColumn: t.cs, gridRow: t.rs, background: t.c, borderRadius: 6 }}
          />
        ))}
      </div>

      <div
        style={{
          background: PD.paper2,
          borderRadius: 14,
          padding: '14px 16px',
          border: `1px solid ${accent}33`,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Ornament size={14} color={accent} />
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 15,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            One year on.
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>LANDS SEP 6 · 2027</div>
        </div>
        <div style={{ fontSize: 12, color: PD.inkSoft, lineHeight: 1.45, fontFamily: 'var(--pl-font-body)' }}>
          A highlight reel, auto-cut from your weekend, arrives in your inbox. The site stays, always.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { n: '412', l: 'photos in The Reel' },
          { n: '38', l: 'voice toasts, kept' },
          { n: '∞', l: 'the site stays' },
        ].map((x) => (
          <div
            key={x.l}
            style={{ flex: 1, padding: '10px 12px', background: PD.paperDeep, borderRadius: 12 }}
          >
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 20,
                color: accent,
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {x.n}
            </div>
            <div style={{ fontSize: 10, color: PD.inkSoft, fontFamily: 'var(--pl-font-body)' }}>
              {x.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
