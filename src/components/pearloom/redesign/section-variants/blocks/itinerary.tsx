'use client';

/* Itinerary section — multi-day plan, hour by hour.

   Data: manifest.itinerary.days[]  (written by ItineraryPanel)
     { id, label, date?, slots: [{ id, time?, title, detail?, location? }] }
   Legacy fallback: manifest.blocks[] entry of type 'itinerary' with
   config.days in the same slot shape (wizard-seeded sites).

   Variants (layouts.ts):
     days    — day-grouped sections with a mono "DAY ONE" kicker +
               gold rule, then hour rows (tabular-figure time, title,
               quiet detail line).
     flow    — one continuous vertical thread: a literal 1px accent
               line down the left with a gold dot at every stop — the
               loom thread as a timeline.
     tickets — every slot is a perforated ticket stub (dashed
               separator + punched notches, the time as the "admit"
               corner) nodding to the Ticket kit.

   When the plan spans >1 day, a row of mono day pills jump-scrolls
   between days (anchor scroll inside the section; honours
   prefers-reduced-motion by falling back to an instant jump). */

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

export interface ItinerarySlotData {
  id?: string;
  time?: string;
  title?: string;
  detail?: string;
  location?: string;
}
export interface ItineraryDayData {
  id?: string;
  label?: string;
  date?: string;
  slots?: ItinerarySlotData[];
}

export function readItineraryDays(manifest: BlockSectionProps['manifest']): ItineraryDayData[] {
  const loose = manifest as unknown as {
    itinerary?: { days?: ItineraryDayData[] };
    blocks?: Array<{ type?: string; config?: { days?: ItineraryDayData[] } }>;
  };
  const fromManifest = loose.itinerary?.days;
  if (Array.isArray(fromManifest) && fromManifest.length > 0) return fromManifest;
  const legacy = (loose.blocks ?? []).find((b) => b?.type === 'itinerary')?.config?.days;
  return Array.isArray(legacy) ? legacy : [];
}

/* ─── helpers ─────────────────────────────────────────────────── */

const DAY_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];

function dayKicker(i: number): string {
  return `DAY ${DAY_WORDS[i] ?? String(i + 1)}`;
}

function slotsOf(day: ItineraryDayData): ItinerarySlotData[] {
  return (day.slots ?? []).filter((s) => (s.title ?? '').trim() || (s.time ?? '').trim());
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

const monoKicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: 'var(--t-ink-muted)',
  whiteSpace: 'nowrap',
};

const timeStyle: CSSProperties = {
  fontFamily: MONO,
  fontSize: 12,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '0.06em',
  color: 'var(--t-accent-ink)',
  whiteSpace: 'nowrap',
};

function SlotText({ slot }: { slot: ItinerarySlotData }) {
  const sub = [slot.detail, slot.location].filter((v) => (v ?? '').trim()).join(' · ');
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--t-ink)', lineHeight: 1.35 }}>
        {slot.title?.trim() || '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--t-ink-soft)', marginTop: 2, lineHeight: 1.5 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── section ─────────────────────────────────────────────────── */

export function ItinerarySection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const dayRefs = useRef<Array<HTMLDivElement | null>>([]);
  const days = readItineraryDays(manifest).filter(
    (d) => (d.label ?? '').trim() || (d.slots ?? []).some((s) => (s.title ?? '').trim()),
  );
  const empty = days.length === 0;
  if (empty && !editable) return null;

  const setDayRef = (i: number) => (el: HTMLDivElement | null) => { dayRefs.current[i] = el; };
  const jumpTo = (i: number) => {
    dayRefs.current[i]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  /* Day-jump pills — only when the plan spans more than one day. */
  const pills = days.length > 1 ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 26 }}>
      {days.map((day, i) => (
        <button
          key={day.id ?? i}
          type="button"
          onClick={() => jumpTo(i)}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--t-line)',
            background: 'var(--t-card)',
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--t-ink-soft)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {day.label?.trim() || dayKicker(i)}
        </button>
      ))}
    </div>
  ) : null;

  let body: ReactNode;
  if (variant === 'flow') {
    body = <FlowBody days={days} pad={pad} setDayRef={setDayRef} />;
  } else if (variant === 'tickets') {
    body = <TicketsBody days={days} setDayRef={setDayRef} />;
  } else {
    body = <DaysBody days={days} setDayRef={setDayRef} />;
  }

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'itineraryEyebrow', 'The plan')}
        title={blockCopy(manifest, 'itineraryTitle', 'The weekend, hour by hour')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('itineraryEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('itineraryTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add days and time slots in the Itinerary panel." />
      ) : (
        <>
          {pills}
          {body}
        </>
      )}
    </BlockFrame>
  );
}

interface BodyProps {
  days: ItineraryDayData[];
  setDayRef: (i: number) => (el: HTMLDivElement | null) => void;
}

/* ─── days — day-grouped sections, mono kicker + gold rule ────── */

function DaysBody({ days, setDayRef }: BodyProps) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
      {days.map((day, di) => (
        <div key={day.id ?? di} ref={setDayRef(di)} style={{ scrollMarginTop: 24 }}>
          {/* Mono kicker + gold rule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <span style={monoKicker}>{dayKicker(di)}</span>
            <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--t-gold)', opacity: 0.85 }} />
            {day.date?.trim() && (
              <span style={{ ...monoKicker, letterSpacing: '0.14em', color: 'var(--t-ink-muted)' }}>
                {day.date}
              </span>
            )}
          </div>
          {day.label?.trim() && (
            <div
              style={{
                fontFamily: 'var(--t-display)',
                fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                fontStyle: 'italic',
                fontSize: 22,
                color: 'var(--t-ink)',
                marginBottom: 8,
              }}
            >
              {day.label}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {slotsOf(day).map((slot, si) => (
              <div
                key={slot.id ?? si}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px minmax(0, 1fr)',
                  gap: 16,
                  padding: '11px 0',
                  borderTop: si === 0 ? 'none' : '1px solid var(--t-line-soft)',
                  alignItems: 'baseline',
                }}
              >
                <span style={timeStyle}>{slot.time?.trim() || '·'}</span>
                <SlotText slot={slot} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── flow — one continuous thread down the left ──────────────── */

function FlowBody({ days, pad, setDayRef }: BodyProps & { pad: number }) {
  return (
    <div style={{ position: 'relative', maxWidth: 540, margin: '0 auto', paddingLeft: 32 }}>
      {/* The loom thread — a single accent line through every day. */}
      <div
        aria-hidden
        style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 1, background: 'var(--t-accent)', opacity: 0.5 }}
      />
      {days.map((day, di) => (
        <div key={day.id ?? di} ref={setDayRef(di)} style={{ scrollMarginTop: 24 }}>
          {/* Day node — a larger gold knot on the thread. */}
          <div style={{ position: 'relative', padding: `${di === 0 ? 0 : Math.round(18 * pad)}px 0 12px` }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: -31.5,
                top: di === 0 ? 4 : Math.round(18 * pad) + 4,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--t-gold)',
                boxShadow: '0 0 0 4px var(--t-paper)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={monoKicker}>{dayKicker(di)}</span>
              {day.label?.trim() && (
                <span
                  style={{
                    fontFamily: 'var(--t-display)',
                    fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                    fontStyle: 'italic',
                    fontSize: 20,
                    color: 'var(--t-ink)',
                  }}
                >
                  {day.label}
                </span>
              )}
              {day.date?.trim() && (
                <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>{day.date}</span>
              )}
            </div>
          </div>
          {slotsOf(day).map((slot, si) => (
            <div key={slot.id ?? si} style={{ position: 'relative', paddingBottom: Math.round(18 * pad) }}>
              {/* Gold dot at each stop. */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: -29.5,
                  top: 5,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--t-gold)',
                  boxShadow: '0 0 0 3px var(--t-paper)',
                }}
              />
              {slot.time?.trim() && (
                <div style={{ ...timeStyle, fontSize: 11.5, marginBottom: 2 }}>{slot.time}</div>
              )}
              <SlotText slot={slot} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── tickets — perforated stub per slot (Ticket-kit nod) ─────── */

function TicketsBody({ days, setDayRef }: BodyProps) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      {days.map((day, di) => (
        <div key={day.id ?? di} ref={setDayRef(di)} style={{ scrollMarginTop: 24 }}>
          {(days.length > 1 || day.label?.trim() || day.date?.trim()) && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, justifyContent: 'center' }}>
              <span style={monoKicker}>{dayKicker(di)}</span>
              {day.label?.trim() && (
                <span
                  style={{
                    fontFamily: 'var(--t-display)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    color: 'var(--t-ink)',
                  }}
                >
                  {day.label}
                </span>
              )}
              {day.date?.trim() && (
                <span style={{ fontSize: 11, color: 'var(--t-ink-muted)' }}>{day.date}</span>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slotsOf(day).map((slot, si) => (
              <div
                key={slot.id ?? si}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: '94px minmax(0, 1fr)',
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-line)',
                  borderRadius: 'var(--t-radius, 10px)',
                }}
              >
                {/* Admit corner — the stub. */}
                <div
                  style={{
                    borderRight: '1.5px dashed var(--t-line)',
                    padding: '16px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>
                    Admit
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--t-ink)' }}>
                    {slot.time?.trim() || '—'}
                  </span>
                </div>
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <SlotText slot={slot} />
                </div>
                {/* Punched notches on the perforation line — clipped to
                    semicircles by the card's overflow:hidden. */}
                <span
                  aria-hidden
                  style={{ position: 'absolute', left: 87, top: -7, width: 14, height: 14, borderRadius: '50%', background: 'var(--t-paper)', border: '1px solid var(--t-line)' }}
                />
                <span
                  aria-hidden
                  style={{ position: 'absolute', left: 87, bottom: -7, width: 14, height: 14, borderRadius: '50%', background: 'var(--t-paper)', border: '1px solid var(--t-line)' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
