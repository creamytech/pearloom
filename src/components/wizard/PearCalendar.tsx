'use client';

// ─────────────────────────────────────────────────────────────
// PearCalendar — Editorial almanac date picker for the wizard.
// Cream plate, gold hairlines, ink day discs. Month navigation
// via square chevron buttons; quick presets as mono-cap plates.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PearCalendarProps {
  onSelect: (date: string) => void; // YYYY-MM-DD
  dark?: boolean;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const FONT_DISPLAY = 'var(--pl-font-display, "Fraunces", serif)';
const FONT_MONO = 'var(--pl-font-mono, ui-monospace, monospace)';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function PearCalendar({ onSelect, dark = false }: PearCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next

  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  // Build calendar grid
  const grid = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDay = firstDayOfMonth(viewYear, viewMonth);
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    // Pad to fill last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    setDirection(-1);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    setDirection(1);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(viewYear, viewMonth, day);
    // Don't allow past dates
    const dateObj = new Date(dateStr + 'T12:00:00');
    if (dateObj.getTime() < today.getTime() - 86400000) return; // allow today
    setSelected(dateStr);
  };

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  // Quick presets
  const thisWeekend = (() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + ((6 - day + 7) % 7 || 7));
    return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const nextMonthDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 15);
    return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const threeMonths = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3, 1);
    return formatDate(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  // Editorial palette
  const textColor = dark ? '#FAF7F2' : '#18181B';
  const mutedColor = dark ? 'rgba(250,247,242,0.55)' : '#52525B';
  const ruleColor = dark ? 'rgba(212,175,55,0.55)' : 'rgba(184,147,90,0.55)';
  const kickerColor = dark ? 'rgba(212,175,55,0.85)' : 'rgba(184,147,90,0.85)';
  const plateBorder = dark ? 'rgba(212,175,55,0.32)' : 'rgba(184,147,90,0.3)';
  const plateBg = dark
    ? 'rgba(22,16,6,0.35)'
    : 'linear-gradient(180deg, #FAF7F2 0%, #F3EFE7 100%)';
  const chipBg = dark ? 'rgba(22,16,6,0.4)' : 'rgba(250,247,242,0.65)';
  const chipBorder = dark ? '1px solid rgba(212,175,55,0.38)' : '1px solid rgba(184,147,90,0.38)';
  const activeInk = dark ? '#FAF7F2' : '#18181B';
  const activeFg = dark ? '#18181B' : '#FAF7F2';

  return (
    <div>
      {/* Presets — editorial plates */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 2px 8px',
      }}>
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: kickerColor,
        }}>
          Shortcuts · quick dates
        </span>
        <span style={{ flex: 1, height: 1, background: ruleColor, opacity: 0.5 }} />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 6,
        marginBottom: 14,
      }}>
        {[
          { label: 'This Weekend', value: thisWeekend, folio: '01' },
          { label: 'Next Month', value: nextMonthDate, folio: '02' },
          { label: 'In Three Months', value: threeMonths, folio: '03' },
        ].map(p => {
          const active = selected === p.value;
          return (
            <button
              key={p.label}
              onClick={() => {
                setSelected(p.value);
                const d = new Date(p.value + 'T12:00:00');
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                padding: '8px 10px',
                borderRadius: 2,
                background: active ? activeInk : chipBg,
                border: active ? `1px solid ${activeInk}` : chipBorder,
                borderTop: active
                  ? `1.5px solid ${dark ? 'rgba(212,175,55,0.95)' : 'rgba(184,147,90,0.95)'}`
                  : `1.5px solid ${ruleColor}`,
                boxShadow: active ? '0 0 0 3px rgba(184,147,90,0.22)' : 'none',
                cursor: 'pointer',
                fontFamily: FONT_MONO,
                textAlign: 'left',
                transition: 'background 180ms ease, box-shadow 180ms ease',
              }}
            >
              <span style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.28em',
                color: active
                  ? (dark ? 'rgba(22,16,6,0.7)' : 'rgba(250,247,242,0.75)')
                  : kickerColor,
              }}>
                № {p.folio}
              </span>
              <span style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: active ? activeFg : textColor,
                lineHeight: 1.15,
              }}>
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Almanac plate */}
      <div style={{
        borderRadius: 2,
        overflow: 'hidden',
        background: plateBg,
        borderTop: `1.5px solid ${ruleColor}`,
        borderLeft: `1px solid ${plateBorder}`,
        borderRight: `1px solid ${plateBorder}`,
        borderBottom: `1px solid ${plateBorder}`,
        padding: '14px 14px 16px',
        boxShadow: dark ? 'none' : '0 1px 0 rgba(184,147,90,0.04)',
      }}>
        {/* Masthead */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 2px 10px',
          borderBottom: `1px solid ${ruleColor}`,
          marginBottom: 10,
        }}>
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: kickerColor,
          }}>
            Almanac · pick a plate
          </span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.28em',
            color: kickerColor,
          }}>
            № {String(viewMonth + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Month navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          padding: '0 2px',
        }}>
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            style={{
              width: 30,
              height: 30,
              borderRadius: 2,
              border: `1px solid ${plateBorder}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              transition: 'background 180ms ease, border-color 180ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = dark
                ? 'rgba(212,175,55,0.1)'
                : 'rgba(184,147,90,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = ruleColor;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = plateBorder;
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <AnimatePresence mode="wait">
            <motion.span
              key={`${viewYear}-${viewMonth}`}
              initial={{ opacity: 0, x: direction * 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1.2rem',
                fontWeight: 400,
                color: textColor,
                letterSpacing: '-0.005em',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {MONTHS[viewMonth]} <span style={{ color: kickerColor }}>·</span> {viewYear}
            </motion.span>
          </AnimatePresence>

          <button
            onClick={nextMonth}
            aria-label="Next month"
            style={{
              width: 30,
              height: 30,
              borderRadius: 2,
              border: `1px solid ${plateBorder}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: textColor,
              transition: 'background 180ms ease, border-color 180ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = dark
                ? 'rgba(212,175,55,0.1)'
                : 'rgba(184,147,90,0.08)';
              (e.currentTarget as HTMLElement).style.borderColor = ruleColor;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = plateBorder;
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          marginBottom: 6,
          paddingBottom: 6,
          borderBottom: `1px dashed ${ruleColor}`,
        }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontFamily: FONT_MONO,
              fontSize: 8,
              fontWeight: 700,
              color: kickerColor,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.2em',
              padding: '4px 0',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}
          >
            {grid.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;

              const dateStr = formatDate(viewYear, viewMonth, day);
              const isSelected = selected === dateStr;
              const isToday = dateStr === todayStr;
              const dateObj = new Date(dateStr + 'T12:00:00');
              const isPast = dateObj.getTime() < today.getTime() - 86400000;

              return (
                <button
                  key={dateStr}
                  onClick={() => !isPast && handleDayClick(day)}
                  disabled={isPast}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 2,
                    border: isSelected
                      ? `1px solid ${activeInk}`
                      : isToday
                        ? `1px dashed ${ruleColor}`
                        : '1px solid transparent',
                    background: isSelected ? activeInk : 'transparent',
                    color: isSelected
                      ? activeFg
                      : isPast
                        ? (dark ? 'rgba(250,247,242,0.18)' : 'rgba(82,82,91,0.25)')
                        : textColor,
                    fontFamily: isSelected ? FONT_MONO : FONT_DISPLAY,
                    fontStyle: isSelected ? 'normal' : 'italic',
                    fontSize: isSelected ? '0.78rem' : '0.92rem',
                    fontWeight: isSelected ? 700 : 400,
                    letterSpacing: isSelected ? '0.1em' : '-0.005em',
                    fontVariationSettings: isSelected ? 'normal' : '"opsz" 144, "SOFT" 80, "WONK" 1',
                    cursor: isPast ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 180ms ease, border-color 180ms ease',
                    padding: 0,
                    boxShadow: isSelected ? '0 0 0 2px rgba(184,147,90,0.22)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isPast) {
                      (e.currentTarget as HTMLElement).style.background = dark
                        ? 'rgba(212,175,55,0.1)'
                        : 'rgba(184,147,90,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isPast) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Selected date display + confirm */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 2,
              borderTop: `1.5px solid ${ruleColor}`,
              borderLeft: `1px solid ${plateBorder}`,
              borderRight: `1px solid ${plateBorder}`,
              borderBottom: `1px solid ${plateBorder}`,
              background: chipBg,
            }}>
              <span style={{
                fontFamily: FONT_MONO,
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: kickerColor,
                flexShrink: 0,
              }}>
                Dated ·
              </span>
              <span style={{
                fontFamily: FONT_DISPLAY,
                fontStyle: 'italic',
                fontSize: '1rem',
                fontWeight: 400,
                color: textColor,
                letterSpacing: '-0.003em',
                lineHeight: 1.15,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                flex: 1,
              }}>
                {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            <button
              onClick={handleConfirm}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 2,
                background: activeInk,
                color: activeFg,
                border: 'none',
                borderTop: `1.5px solid ${dark ? 'rgba(212,175,55,0.9)' : 'rgba(184,147,90,0.95)'}`,
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 0 3px rgba(184,147,90,0.22)',
                transition: 'box-shadow 180ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(184,147,90,0.32)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(184,147,90,0.22)';
              }}
            >
              Set the Date · ↵
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
