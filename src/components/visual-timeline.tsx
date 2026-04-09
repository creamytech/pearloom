'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/visual-timeline.tsx
// Visual Day-Of Timeline — a stunning vertical timeline for events
// with alternating layout, glass cards, and CSS animations.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Heart, Sparkles, UtensilsCrossed, Coffee, Wine, Calendar } from 'lucide-react';
import type { WeddingEvent } from '@/types';
import { parseLocalDate } from '@/lib/date';

function getEventIcon(type: WeddingEvent['type'], size = 16) {
  const style = { width: size, height: size };
  switch (type) {
    case 'ceremony':
      return <Heart style={style} />;
    case 'reception':
      return <Sparkles style={style} />;
    case 'rehearsal':
      return <UtensilsCrossed style={style} />;
    case 'brunch':
      return <Coffee style={style} />;
    case 'welcome-party':
      return <Wine style={style} />;
    default:
      return <Calendar style={style} />;
  }
}

interface VisualTimelineProps {
  events: WeddingEvent[];
}

export function VisualTimeline({ events }: VisualTimelineProps) {
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <>
      <style>{`
        @keyframes pl-tl-fade-up {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pl-tl-line-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        @keyframes pl-tl-dot-pop {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .pl-visual-timeline {
          position: relative;
          padding: 2rem 0;
          max-width: 900px;
          margin: 0 auto;
        }
        /* Central vertical line */
        .pl-tl-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(
            180deg,
            transparent 0%,
            var(--pl-olive, #A3B18A) 8%,
            var(--pl-olive, #A3B18A) 92%,
            transparent 100%
          );
          transform-origin: top center;
          animation: pl-tl-line-grow 0.8s ease-out both;
        }
        .pl-tl-item {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 40px 1fr;
          gap: 0;
          margin-bottom: 2rem;
          animation: pl-tl-fade-up 0.6s ease-out both;
        }
        /* Staggered entrance delays */
        .pl-tl-item:nth-child(1) { animation-delay: 0.15s; }
        .pl-tl-item:nth-child(2) { animation-delay: 0.3s; }
        .pl-tl-item:nth-child(3) { animation-delay: 0.45s; }
        .pl-tl-item:nth-child(4) { animation-delay: 0.6s; }
        .pl-tl-item:nth-child(5) { animation-delay: 0.75s; }
        .pl-tl-item:nth-child(6) { animation-delay: 0.9s; }
        .pl-tl-item:nth-child(7) { animation-delay: 1.05s; }
        .pl-tl-item:nth-child(8) { animation-delay: 1.2s; }

        /* Center dot */
        .pl-tl-dot {
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .pl-tl-dot-inner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--pl-cream, #FDFAF4);
          border: 2px solid var(--pl-olive, #A3B18A);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--pl-olive, #A3B18A);
          box-shadow: 0 2px 12px rgba(163,177,138,0.2);
          animation: pl-tl-dot-pop 0.35s ease-out both;
        }
        .pl-tl-item:nth-child(1) .pl-tl-dot-inner { animation-delay: 0.3s; }
        .pl-tl-item:nth-child(2) .pl-tl-dot-inner { animation-delay: 0.45s; }
        .pl-tl-item:nth-child(3) .pl-tl-dot-inner { animation-delay: 0.6s; }
        .pl-tl-item:nth-child(4) .pl-tl-dot-inner { animation-delay: 0.75s; }
        .pl-tl-item:nth-child(5) .pl-tl-dot-inner { animation-delay: 0.9s; }
        .pl-tl-item:nth-child(6) .pl-tl-dot-inner { animation-delay: 1.05s; }
        .pl-tl-item:nth-child(7) .pl-tl-dot-inner { animation-delay: 1.2s; }
        .pl-tl-item:nth-child(8) .pl-tl-dot-inner { animation-delay: 1.35s; }

        /* Card placement — alternating sides */
        .pl-tl-card-left {
          grid-column: 1;
          text-align: right;
          padding-right: 1.25rem;
        }
        .pl-tl-card-right {
          grid-column: 3;
          text-align: left;
          padding-left: 1.25rem;
        }
        .pl-tl-spacer {
          /* empty cell on the opposite side */
        }

        /* Glass card */
        .pl-tl-card {
          background: rgba(253,250,244,0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(163,177,138,0.18);
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 4px 20px rgba(43,30,20,0.04), 0 1px 4px rgba(43,30,20,0.02);
          transition: box-shadow 0.25s, transform 0.25s;
        }
        .pl-tl-card:hover {
          box-shadow: 0 6px 28px rgba(43,30,20,0.07), 0 2px 6px rgba(43,30,20,0.03);
          transform: translateY(-2px);
        }

        /* Time pill */
        .pl-tl-time-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--pl-olive, #A3B18A);
          background: rgba(163,177,138,0.12);
          padding: 0.25rem 0.65rem;
          border-radius: 100px;
          margin-bottom: 0.65rem;
        }

        /* Event name */
        .pl-tl-name {
          font-family: var(--pl-font-heading);
          font-size: 1.15rem;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: var(--pl-ink, #2B1E14);
          line-height: 1.2;
          margin-bottom: 0.35rem;
        }

        /* Venue */
        .pl-tl-venue {
          font-size: 0.82rem;
          color: var(--pl-muted, #9A9488);
          line-height: 1.5;
          margin-bottom: 0.25rem;
        }

        /* Dress code badge */
        .pl-tl-dresscode {
          display: inline-flex;
          align-items: center;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--pl-muted, #9A9488);
          background: rgba(43,30,20,0.04);
          padding: 0.2rem 0.55rem;
          border-radius: 4px;
          margin-top: 0.35rem;
        }

        /* ── Reduced motion: disable all animations ── */
        @media (prefers-reduced-motion: reduce) {
          .pl-tl-fade-up, .pl-tl-dot-pop, .pl-tl-line-grow { animation: none !important; }
          .pl-tl-item { animation: none !important; opacity: 1 !important; transform: none !important; }
          .pl-tl-dot-inner { animation: none !important; transform: none !important; }
          .pl-tl-line { animation: none !important; transform: none !important; }
        }

        /* ── Mobile: single-column, all cards on the right ── */
        @media (max-width: 768px) {
          .pl-tl-line {
            left: 20px;
          }
          .pl-tl-item {
            grid-template-columns: 40px 1fr;
            margin-bottom: 1.5rem;
          }
          .pl-tl-dot {
            grid-column: 1;
            grid-row: 1;
          }
          .pl-tl-card-left,
          .pl-tl-card-right {
            grid-column: 2;
            grid-row: 1;
            text-align: left;
            padding-left: 0.75rem;
            padding-right: 0;
          }
          .pl-tl-spacer {
            display: none;
          }
        }
      `}</style>

      <div className="pl-visual-timeline">
        <div className="pl-tl-line" />

        {sorted.map((event, i) => {
          const isLeft = i % 2 === 0;
          const dateObj = (() => {
            try { return parseLocalDate(event.date); }
            catch { return null; }
          })();
          const formattedDate = dateObj
            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';

          const cardContent = (
            <div className="pl-tl-card">
              <div className="pl-tl-time-pill">
                {event.time}
                {event.endTime && (
                  <span style={{ opacity: 0.6, fontWeight: 400 }}>
                    {' '} &ndash; {event.endTime}
                  </span>
                )}
                {formattedDate && (
                  <span style={{ opacity: 0.5, fontWeight: 500, marginLeft: '0.25rem' }}>
                    &middot; {formattedDate}
                  </span>
                )}
              </div>

              <div className="pl-tl-name">{event.name}</div>

              {event.venue && (
                <div className="pl-tl-venue">{event.venue}</div>
              )}
              {event.address && (
                <div className="pl-tl-venue" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {event.address}
                </div>
              )}

              {event.dressCode && (
                <div className="pl-tl-dresscode">
                  {event.dressCode}
                </div>
              )}

              {event.description && (
                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--pl-muted, #9A9488)',
                  lineHeight: 1.65,
                  marginTop: '0.5rem',
                  fontStyle: 'italic',
                  opacity: 0.85,
                }}>
                  {event.description}
                </p>
              )}
            </div>
          );

          return (
            <div
              key={event.id}
              className="pl-tl-item"
            >
              {/* Desktop: alternating layout. On mobile CSS overrides to always-right */}
              {isLeft ? (
                <>
                  <div className="pl-tl-card-left">{cardContent}</div>
                  <div className="pl-tl-dot">
                    <div className="pl-tl-dot-inner">
                      {getEventIcon(event.type)}
                    </div>
                  </div>
                  <div className="pl-tl-spacer" />
                </>
              ) : (
                <>
                  <div className="pl-tl-spacer" />
                  <div className="pl-tl-dot">
                    <div className="pl-tl-dot-inner">
                      {getEventIcon(event.type)}
                    </div>
                  </div>
                  <div className="pl-tl-card-right">{cardContent}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
