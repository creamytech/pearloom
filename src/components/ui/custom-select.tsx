'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ui/custom-select.tsx
// Custom select dropdown — replaces native <select>.
// Glass dropdown with search, animated entrance, and olive accents.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select...',
  searchable = false,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

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
        className={cn(
          'flex items-center justify-between w-full px-3 py-2.5',
          'rounded-[var(--pl-radius-sm)] border-[1.5px] bg-white cursor-pointer',
          'transition-all duration-150',
          open
            ? 'border-[var(--pl-olive)] shadow-[0_0_0_3px_rgba(163,177,138,0.15)]'
            : 'border-[var(--pl-divider)] hover:border-[var(--pl-olive-hover)]',
        )}
      >
        <span className={cn(
          'text-[0.88rem] text-left truncate',
          selected ? 'text-[var(--pl-ink)]' : 'text-[var(--pl-muted)] opacity-60',
        )}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className="flex-shrink-0 text-[var(--pl-muted)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-[14px] bg-white/95 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] shadow-[0_8px_32px_rgba(43,30,20,0.12)] overflow-hidden"
          >
            {/* Search */}
            {searchable && (
              <div className="px-2 pt-2 pb-1">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--pl-cream-deep)] border border-[var(--pl-divider)]">
                  <Search size={12} className="text-[var(--pl-muted)] flex-shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-[0.82rem] text-[var(--pl-ink)] placeholder:text-[var(--pl-muted)] placeholder:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-[220px] overflow-y-auto py-1 px-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-[0.82rem] text-[var(--pl-muted)]">
                  No options found
                </div>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    disabled={option.disabled}
                    className={cn(
                      'flex items-center justify-between w-full px-3 py-2 rounded-lg',
                      'border-none cursor-pointer text-left transition-all duration-100',
                      option.value === value
                        ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)]'
                        : 'bg-transparent text-[var(--pl-ink)] hover:bg-[rgba(0,0,0,0.03)]',
                      option.disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div>
                      <span className="text-[0.85rem] font-medium block">{option.label}</span>
                      {option.description && (
                        <span className="text-[0.68rem] text-[var(--pl-muted)] block mt-0.5">
                          {option.description}
                        </span>
                      )}
                    </div>
                    {option.value === value && (
                      <Check size={14} className="text-[var(--pl-olive)] flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
