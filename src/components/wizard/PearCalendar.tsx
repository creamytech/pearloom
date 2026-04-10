'use client';

// ─────────────────────────────────────────────────────────────
// PearCalendar — Beautiful inline date picker for the wizard
// Organic Glass design, month navigation, quick presets
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PearCalendarProps {
  onSelect: (date: string) => void; // YYYY-MM-DD
  dark?: boolean;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

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

  // Colors
  const textColor = dark ? '#FAF7F2' : 'var(--pl-ink-soft, #3D3530)';
  const mutedColor = dark ? 'rgba(250,247,242,0.5)' : 'var(--pl-muted, #8C7E72)';
  const cellBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)';
  const cellHover = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)';
  const pillBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)';
  const pillBorder = dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.5)';

  return (
    <div>
      {/* Quick presets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'This weekend', value: thisWeekend },
          { label: 'Next month', value: nextMonthDate },
          { label: 'In 3 months', value: threeMonths },
        ].map(p => (
          <button
            key={p.label}
            onClick={() => {
              setSelected(p.value);
              const d = new Date(p.value + 'T12:00:00');
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
            }}
            style={{
              padding: '7px 16px', borderRadius: 100,
              background: selected === p.value ? 'var(--pl-olive, #A3B18A)' : pillBg,
              border: selected === p.value ? '1px solid var(--pl-olive)' : pillBorder,
              fontSize: '0.78rem', fontWeight: 600,
              color: selected === p.value ? '#fff' : textColor,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(16px)',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
        padding: '16px 12px',
      } as React.CSSProperties}>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
          <button onClick={prevMonth} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: cellBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: textColor, fontSize: '1rem', transition: 'background 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <AnimatePresence mode="wait">
            <motion.span
              key={`${viewYear}-${viewMonth}`}
              initial={{ opacity: 0, x: direction * 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -20 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: 'var(--pl-font-heading)',
                fontStyle: 'italic',
                fontSize: '1.05rem',
                fontWeight: 400,
                color: textColor,
              }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </motion.span>
          </AnimatePresence>

          <button onClick={nextMonth} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: cellBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: textColor, fontSize: '1rem', transition: 'background 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{
              textAlign: 'center', fontSize: '0.68rem', fontWeight: 700,
              color: mutedColor, textTransform: 'uppercase' as const,
              letterSpacing: '0.05em', padding: '4px 0',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.2 }}
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
                    borderRadius: '50%',
                    border: isToday && !isSelected ? `1.5px solid var(--pl-olive, #A3B18A)` : 'none',
                    background: isSelected
                      ? 'var(--pl-olive, #A3B18A)'
                      : 'transparent',
                    color: isSelected
                      ? '#fff'
                      : isPast
                        ? (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
                        : textColor,
                    fontSize: '0.82rem',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    cursor: isPast ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    padding: 0,
                    fontFamily: 'inherit',
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
            style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <p style={{
              textAlign: 'center', fontSize: '0.85rem', color: textColor, fontWeight: 600,
            }}>
              {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
            <button
              onClick={handleConfirm}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 100,
                background: 'var(--pl-olive, #A3B18A)', border: 'none',
                fontSize: '0.88rem', fontWeight: 700, color: '#fff', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Confirm date
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
