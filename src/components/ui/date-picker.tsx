'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ui/date-picker.tsx
// Custom date picker — no native <input type="date">.
// Glass dropdown calendar with month navigation,
// day grid, and elegant serif typography.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerProps {
  value?: string; // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, label, placeholder = 'Select date', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState(selected?.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() || new Date().getMonth());

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{ day: number; month: 'prev' | 'current' | 'next'; date: Date }> = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({ day: d, month: 'prev', date: new Date(viewYear, viewMonth - 1, d) });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: 'current', date: new Date(viewYear, viewMonth, d) });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, month: 'next', date: new Date(viewYear, viewMonth + 1, d) });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleSelect = (date: Date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    onChange(iso);
    setOpen(false);
  };

  const isSelected = (date: Date): boolean => {
    if (!selected) return false;
    return date.getFullYear() === selected.getFullYear() &&
      date.getMonth() === selected.getMonth() &&
      date.getDate() === selected.getDate();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  };

  const displayValue = selected
    ? selected.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && (
        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-1.5">
          {label}
        </span>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--pl-divider)] bg-white cursor-pointer hover:border-[var(--pl-olive)] transition-colors text-left"
      >
        <Calendar size={14} className="text-[var(--pl-muted)] flex-shrink-0" />
        <span className={cn(
          'text-[0.88rem] flex-1',
          displayValue ? 'text-[var(--pl-ink)]' : 'text-[var(--pl-muted)] opacity-50',
        )}>
          {displayValue || placeholder}
        </span>
      </button>

      {/* Calendar dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 w-[280px] p-4 rounded-[16px] bg-white/95 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] shadow-[0_8px_32px_rgba(43,30,20,0.12)]"
          >
            {/* Month/Year header */}
            <div className="flex items-center justify-between mb-3">
              <motion.button
                onClick={handlePrevMonth}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-7 h-7 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer text-[var(--pl-muted)] hover:bg-[rgba(0,0,0,0.04)]"
              >
                <ChevronLeft size={16} />
              </motion.button>
              <span className="font-heading text-[0.95rem] font-semibold text-[var(--pl-ink)]">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <motion.button
                onClick={handleNextMonth}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-7 h-7 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer text-[var(--pl-muted)] hover:bg-[rgba(0,0,0,0.04)]"
              >
                <ChevronRight size={16} />
              </motion.button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[0.58rem] font-bold uppercase tracking-[0.08em] text-[var(--pl-muted)] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0">
              {calendarDays.map((d, i) => {
                const sel = isSelected(d.date);
                const today = isToday(d.date);
                return (
                  <motion.button
                    key={i}
                    onClick={() => handleSelect(d.date)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-full aspect-square flex items-center justify-center border-none cursor-pointer rounded-md text-[0.78rem] transition-all duration-100"
                    style={{
                      background: sel ? 'var(--pl-olive-deep)' : today ? 'var(--pl-olive-mist)' : 'transparent',
                      color: sel ? 'white' : d.month !== 'current' ? 'var(--pl-divider)' : today ? 'var(--pl-olive-deep)' : 'var(--pl-ink)',
                      fontWeight: sel || today ? 700 : 400,
                    }}
                  >
                    {d.day}
                  </motion.button>
                );
              })}
            </div>

            {/* Today button */}
            <button
              onClick={() => handleSelect(new Date())}
              className="w-full mt-2 py-1.5 rounded-md border-none bg-[var(--pl-cream-deep)] text-[var(--pl-olive-deep)] text-[0.72rem] font-semibold cursor-pointer hover:bg-[rgba(163,177,138,0.1)] transition-colors"
            >
              Today
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
