'use client';

// ─────────────────────────────────────────────────────────────
// DesignDayOf — "On the day, it runs itself." The day-of room:
// one quiet space the whole party fills. A live photo wall (a
// staggered editorial masonry of real photographs), a live RSVP
// card whose reply count threads up when the section scrolls into
// view, and the guest playlist with its little equalizers ticking.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { PD, MONO_STYLE, DISPLAY_STYLE, pdInkMix } from './DesignAtoms';
import { U, WALL_IMGS } from './landing-data';
import { Music } from 'lucide-react';

const TRACKS: ReadonlyArray<readonly [string, string]> = [
  ['September', 'Auntie Rosa'],
  ['La Vie en Rose', 'the couple'],
  ['Dancing Queen', 'the groomsmen'],
];

const RSVP_OPTIONS: ReadonlyArray<{ key: 'going' | 'maybe' | 'no'; label: string }> = [
  { key: 'going', label: 'Going' },
  { key: 'maybe', label: 'Maybe' },
  { key: 'no', label: "Can't" },
];

const RSVP_TARGET = 147;

export function DesignDayOf() {
  const [rsvp, setRsvp] = useState<'going' | 'maybe' | 'no'>('going');
  const [count, setCount] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || started) return;
        started = true;
        interval = setInterval(() => {
          setCount((prev) => {
            const next = prev + 7;
            if (next >= RSVP_TARGET) {
              if (interval) {
                clearInterval(interval);
                interval = null;
              }
              observer.disconnect();
              return RSVP_TARGET;
            }
            return next;
          });
        }, 42);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      if (interval) clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="day"
      className="pd-day-sec"
      style={{ padding: 'clamp(64px,9vw,110px) 24px', maxWidth: 1180, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ ...MONO_STYLE, color: PD.terra, marginBottom: 14 }}>The day-of room</div>
        <h2
          className="pl-letterpress"
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(34px,4.6vw,56px)',
            color: PD.ink,
            margin: 0,
          }}
        >
          On the day, it <em style={{ fontStyle: 'italic', color: PD.olive }}>runs itself</em>.
        </h2>
        <p
          style={{
            fontFamily: 'var(--pl-font-body)',
            fontSize: 'clamp(16px,1.3vw,18px)',
            lineHeight: 1.6,
            color: PD.inkSoft,
            maxWidth: 640,
            margin: '18px 0 0',
          }}
        >
          The run of show, the seating, the live photo wall: one quiet room the whole party fills.
          Guests open one link; everything they leave behind comes home to you.
        </p>
      </div>

      {/* Two columns → stacks below 900px */}
      <div
        className="pd-day-grid"
        style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}
      >
        {/* Left — the photo wall (2-col editorial masonry) */}
        <div style={{ columns: 2, columnGap: 12 }}>
          {WALL_IMGS.map((id) => (
            <div
              key={id}
              style={{
                breakInside: 'avoid',
                marginBottom: 12,
                borderRadius: 12,
                overflow: 'hidden',
                // Paper behind every photograph: a failed load shows warm
                // paper, never a void.
                background: PD.paper2,
                boxShadow: `0 8px 22px -14px ${pdInkMix(30)}`,
              }}
            >
              <img
                className="pd-day-tile"
                src={U(id, 600)}
                loading="lazy"
                decoding="async"
                alt=""
                style={{
                  width: '100%',
                  display: 'block',
                  objectFit: 'cover',
                  filter: 'saturate(1.05) sepia(0.04)',
                  transition: 'transform 380ms cubic-bezier(.2,.8,.2,1)',
                }}
              />
            </div>
          ))}
        </div>

        {/* Right — the stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* RSVP card */}
          <div
            ref={cardRef}
            style={{
              background: PD.paperCard,
              border: `1px solid ${PD.line}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontSize: 18,
                color: PD.ink,
                marginBottom: 14,
              }}
            >
              Will you come?
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {RSVP_OPTIONS.map((opt) => {
                const active = rsvp === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRsvp(opt.key)}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      borderRadius: 999,
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: active ? PD.gold : 'transparent',
                      color: active ? PD.slab : PD.inkSoft,
                      border: active ? '1px solid transparent' : `1px solid ${PD.line}`,
                      transition: 'background 200ms ease, color 200ms ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 16 }}>
              <span
                style={{
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontWeight: 600,
                  fontSize: 34,
                  lineHeight: 1,
                  color: PD.gold,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
              <span
                style={{
                  fontFamily: 'var(--pl-font-body)',
                  fontSize: 12.5,
                  color: PD.inkSoft,
                }}
              >
                guests have replied · live
              </span>
            </div>
          </div>

          {/* Guest playlist card */}
          <div
            style={{
              background: PD.paperCard,
              border: `1px solid ${PD.line}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.inkSoft, marginBottom: 14 }}>
              The guest playlist
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TRACKS.map(([title, by], i) => (
                <div
                  key={title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingBottom: i < TRACKS.length - 1 ? 12 : 0,
                    borderBottom: i < TRACKS.length - 1 ? `1px solid ${pdInkMix(8)}` : 'none',
                  }}
                >
                  {/* equalizer */}
                  <div
                    className="pd-anim"
                    aria-hidden
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 2,
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                    }}
                  >
                    <span className="pd-eq-bar" style={{ animationDelay: '0s' }} />
                    <span className="pd-eq-bar" style={{ animationDelay: '0.22s' }} />
                    <span className="pd-eq-bar" style={{ animationDelay: '0.44s' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 13.5,
                        color: PD.ink,
                        lineHeight: 1.25,
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-body)',
                        fontSize: 11.5,
                        color: PD.inkSoft,
                      }}
                    >
                      added by {by}
                    </div>
                  </div>

                  <Music size={14} color={PD.stone} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-day-grid) {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pd-day-sec) {
            padding: 48px 20px !important;
          }
        }
        :global(.pd-day-tile:hover) {
          transform: scale(1.03);
        }
        .pd-eq-bar {
          width: 3px;
          border-radius: 2px;
          background: ${PD.olive};
          height: 30%;
          animation: pd-eq 1.1s ease-in-out infinite;
        }
        @keyframes pd-eq {
          0%,
          100% {
            height: 30%;
          }
          50% {
            height: 100%;
          }
        }
      `}</style>
    </section>
  );
}
