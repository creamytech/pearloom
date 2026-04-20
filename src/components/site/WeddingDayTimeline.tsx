'use client';

// -----------------------------------------------------------------
// Pearloom / components/site/WeddingDayTimeline.tsx
// Real-time wedding-day timeline: shows past, current, and upcoming
// events with live countdowns. Auto-updates every minute.
// Only renders when the current date matches the event date.
// -----------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeddingEvent } from '@/types';

// ── Constants ────────────────────────────────────────────────

// Palette reads from the themed CSS variable layer so the component
// flips correctly with the site light/dark toggle. Alpha variants
// use color-mix() to tint the var without breaking on value reads.
const OLIVE     = 'var(--pl-olive, #5C6B3F)';
const GOLD      = 'var(--pl-gold, var(--pl-olive-mist, #D6C6A8))';
const MUTED     = 'var(--pl-muted, #9A9488)';
const MUTED_50  = 'color-mix(in oklab, var(--pl-muted, #9A9488) 50%, transparent)';
const MUTED_80  = 'color-mix(in oklab, var(--pl-muted, #9A9488) 80%, transparent)';
const GOLD_40   = 'color-mix(in oklab, var(--pl-gold, var(--pl-olive-mist, #D6C6A8)) 40%, transparent)';
const CARD_BG   = 'color-mix(in oklab, var(--pl-cream-card, #ffffff) 80%, transparent)';
const INK       = 'var(--pl-ink, #2B2B2B)';

const TYPE_ICONS: Record<string, string> = {
  ceremony: '\u{1F490}',   // bouquet
  reception: '\u{1F37E}',  // champagne
  rehearsal: '\u{1F3B6}',  // notes
  brunch: '\u{2615}',      // coffee
  'welcome-party': '\u{1F389}', // party popper
  other: '\u{2728}',       // sparkles
};

// ── Helpers ──────────────────────────────────────────────────

/** Parse a time string like "4:00 PM" or "16:00" into minutes since midnight. */
function parseTimeToMinutes(time: string): number {
  // Handle 24h format
  const match24 = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }
  // Handle 12h format
  const match12 = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

/** Get current minutes since midnight. */
function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Check if today matches a given ISO date string. */
function isToday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const now = new Date();
  return now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === d;
}

/** Format minutes remaining into a human-readable string. */
function formatCountdown(diffMinutes: number): string {
  if (diffMinutes <= 0) return 'starting now';
  if (diffMinutes < 60) return `starts in ${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) return `starts in ${hours}h`;
  return `starts in ${hours}h ${mins}m`;
}

type EventStatus = 'past' | 'current' | 'upcoming';

interface TimelineItem {
  event: WeddingEvent;
  status: EventStatus;
  startMinutes: number;
  endMinutes: number;
  countdown: string;
}

// ── Keyframe injection (once) ────────────────────────────────

let injectedKeyframes = false;
function injectKeyframes() {
  if (injectedKeyframes || typeof document === 'undefined') return;
  injectedKeyframes = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pl-timeline-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(214,198,168,0.5); }
      50% { box-shadow: 0 0 0 8px rgba(214,198,168,0); }
    }
    @keyframes pl-timeline-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ── Main component ───────────────────────────────────────────

export interface WeddingDayTimelineProps {
  events: WeddingEvent[];
  weddingDate: string;       // ISO date string
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

export function WeddingDayTimeline({
  events,
  weddingDate,
  accentColor = OLIVE,
  headingFont = 'Playfair Display',
  bodyFont = 'Inter',
}: WeddingDayTimelineProps) {
  const [currentMinutes, setCurrentMinutes] = useState<number>(-1);
  const [mounted, setMounted] = useState(false);

  const tick = useCallback(() => setCurrentMinutes(nowMinutes()), []);

  useEffect(() => {
    injectKeyframes();
    setMounted(true);
    tick();
    const id = setInterval(tick, 60_000); // update every minute
    return () => clearInterval(id);
  }, [tick]);

  // Filter to only events on the wedding date, sorted by time
  const dayEvents = useMemo(() => {
    return events
      .filter((e) => e.date && e.date.startsWith(weddingDate.split('T')[0]))
      .sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      });
  }, [events, weddingDate]);

  // Compute timeline items with statuses
  const items: TimelineItem[] = useMemo(() => {
    if (currentMinutes < 0) return [];

    return dayEvents.map((event, i) => {
      const startMin = parseTimeToMinutes(event.time);
      // End time: use endTime if present, otherwise next event start, otherwise +60min
      let endMin: number;
      if (event.endTime) {
        endMin = parseTimeToMinutes(event.endTime);
      } else if (i < dayEvents.length - 1) {
        endMin = parseTimeToMinutes(dayEvents[i + 1].time);
      } else {
        endMin = startMin + 60;
      }

      let status: EventStatus;
      if (currentMinutes >= endMin) {
        status = 'past';
      } else if (currentMinutes >= startMin) {
        status = 'current';
      } else {
        status = 'upcoming';
      }

      const countdown = status === 'upcoming'
        ? formatCountdown(startMin - currentMinutes)
        : '';

      return { event, status, startMinutes: startMin, endMinutes: endMin, countdown };
    });
  }, [dayEvents, currentMinutes]);

  // Don't render if not mounted, not today, or no events
  if (!mounted) return null;
  if (!isToday(weddingDate)) return null;
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Wedding day live timeline"
      style={{
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
      }}
    >
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', marginBottom: 'clamp(1.5rem, 3vw, 2rem)' }}
      >
        <p
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: MUTED,
            fontWeight: 700,
            fontFamily: `"${bodyFont}", sans-serif`,
            margin: '0 0 0.5rem',
          }}
        >
          Live Timeline
        </p>
        <h2
          style={{
            fontFamily: `"${headingFont}", serif`,
            fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
            fontWeight: 400,
            color: accentColor,
            margin: 0,
          }}
        >
          Today&apos;s Schedule
        </h2>
      </motion.div>

      {/* Timeline */}
      <div
        style={{
          position: 'relative',
          paddingLeft: 32,
        }}
      >
        {/* Vertical gradient line */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 11,
            top: 8,
            bottom: 8,
            width: 2,
            background: `linear-gradient(180deg, ${accentColor} 0%, ${MUTED_50} 100%)`,
            borderRadius: 1,
          }}
        />

        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                position: 'relative',
                marginBottom: i < items.length - 1 ? 16 : 0,
              }}
            >
              {/* Dot on the timeline line */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: -32 + 6,
                  top: 20,
                  width: item.status === 'current' ? 12 : 10,
                  height: item.status === 'current' ? 12 : 10,
                  borderRadius: '50%',
                  background: item.status === 'current'
                    ? GOLD
                    : item.status === 'past'
                      ? MUTED_80
                      : `color-mix(in oklab, ${accentColor} 40%, transparent)`,
                  border: item.status === 'current'
                    ? `2px solid ${GOLD}`
                    : item.status === 'past'
                      ? `2px solid ${MUTED_50}`
                      : `2px solid color-mix(in oklab, ${accentColor} 50%, transparent)`,
                  animation: item.status === 'current'
                    ? 'pl-timeline-pulse 2s ease-in-out infinite'
                    : undefined,
                  transition: 'all 0.3s ease',
                }}
              />

              {/* Card */}
              <div
                style={{
                  background: CARD_BG,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: 14,
                  padding: 'clamp(0.9rem, 2.5vw, 1.2rem) clamp(1rem, 3vw, 1.4rem)',
                  border: item.status === 'current'
                    ? `1.5px solid ${GOLD_40}`
                    : `1px solid rgba(0,0,0,0.06)`,
                  boxShadow: item.status === 'current'
                    ? `0 4px 24px rgba(163,177,138,0.12), 0 1px 4px rgba(0,0,0,0.04)`
                    : '0 2px 12px rgba(0,0,0,0.04)',
                  opacity: item.status === 'past' ? 0.6 : 1,
                  transition: 'all 0.4s ease',
                }}
              >
                {/* Top row: time + status badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                      fontFamily: `"${bodyFont}", sans-serif`,
                      fontWeight: 600,
                      color: item.status === 'past' ? MUTED : accentColor,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.event.time}
                    {item.event.endTime ? ` \u2013 ${item.event.endTime}` : ''}
                  </span>

                  {/* Status badge */}
                  {item.status === 'current' && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        fontFamily: `"${bodyFont}", sans-serif`,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#fff',
                        background: GOLD,
                        padding: '3px 10px',
                        borderRadius: 100,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#fff',
                          animation: 'pl-timeline-pulse 2s ease-in-out infinite',
                        }}
                      />
                      Happening Now
                    </span>
                  )}

                  {item.status === 'past' && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: MUTED,
                      }}
                      aria-label="Completed"
                    >
                      &#10003;
                    </span>
                  )}

                  {item.status === 'upcoming' && item.countdown && (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        fontFamily: `"${bodyFont}", sans-serif`,
                        fontWeight: 600,
                        color: accentColor,
                        letterSpacing: '0.02em',
                        opacity: 0.8,
                      }}
                    >
                      {item.countdown}
                    </span>
                  )}
                </div>

                {/* Event name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: '1rem' }} aria-hidden="true">
                    {TYPE_ICONS[item.event.type] || TYPE_ICONS.other}
                  </span>
                  <h3
                    style={{
                      fontFamily: `"${headingFont}", serif`,
                      fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
                      fontWeight: item.status === 'current' ? 600 : 400,
                      color: item.status === 'past' ? MUTED : INK,
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.event.name}
                  </h3>
                </div>

                {/* Venue + description */}
                {(item.event.venue || item.event.description) && (
                  <div style={{ marginTop: 6 }}>
                    {item.event.venue && (
                      <p
                        style={{
                          fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                          fontFamily: `"${bodyFont}", sans-serif`,
                          color: MUTED,
                          margin: '0 0 2px',
                          paddingLeft: 28, // align with name after icon
                        }}
                      >
                        {item.event.venue}
                      </p>
                    )}
                    {item.event.description && item.status !== 'past' && (
                      <p
                        style={{
                          fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                          fontFamily: `"${bodyFont}", sans-serif`,
                          color: `color-mix(in oklab, var(--pl-muted, #9A9488) 80%, transparent)`,
                          margin: 0,
                          paddingLeft: 28,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.event.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
