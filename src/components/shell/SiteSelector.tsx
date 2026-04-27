'use client';

// ─────────────────────────────────────────────────────────────
// SiteSelector — the ONE site picker. Replaces three hand-rolled
// <select>s on day-of, director, RSVP. Persists last-used site
// to localStorage so deep-linking + reloads don't strand users.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export interface SiteOption {
  id: string;
  label: string;
  subdomain?: string;
  occasion?: string;
}

interface SiteSelectorProps {
  options: SiteOption[];
  value?: string;
  onChange: (siteId: string) => void;
  placeholder?: string;
  /** Persist the choice under this key (so different surfaces can share or isolate) */
  storageKey?: string;
  loading?: boolean;
}

const DEFAULT_KEY = 'pl-active-site';

export function SiteSelector({
  options,
  value,
  onChange,
  placeholder = 'Pick a site',
  storageKey = DEFAULT_KEY,
  loading,
}: SiteSelectorProps) {
  const [hydrated, setHydrated] = useState(false);

  // On mount, restore last-used unless a value is already passed
  useEffect(() => {
    setHydrated(true);
    if (!value && options.length > 0) {
      try {
        const stored = localStorage.getItem(storageKey);
        const exists = options.find((o) => o.id === stored);
        onChange(exists ? exists.id : options[0].id);
      } catch {
        onChange(options[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  // Persist on change
  useEffect(() => {
    if (!hydrated || !value) return;
    try {
      localStorage.setItem(storageKey, value);
    } catch {}
  }, [value, hydrated, storageKey]);

  if (loading) {
    return (
      <div
        style={{
          width: 220,
          height: 40,
          background:
            'linear-gradient(90deg, var(--pl-cream-deep) 0%, var(--pl-divider-soft) 50%, var(--pl-cream-deep) 100%)',
          backgroundSize: '200% 100%',
          animation: 'pl-shimmer 1.6s linear infinite',
          borderRadius: 'var(--pl-radius-md)',
        }}
      />
    );
  }

  if (options.length === 0) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select site"
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          padding: '9px 36px 9px 14px',
          borderRadius: 'var(--pl-radius-md)',
          border: '1px solid var(--pl-divider)',
          background: 'var(--pl-cream-card)',
          color: 'var(--pl-ink)',
          font: 'inherit',
          fontSize: '0.9rem',
          fontWeight: 500,
          minWidth: 220,
          cursor: 'pointer',
          transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--pl-olive)';
          e.currentTarget.style.boxShadow = 'var(--pl-shadow-focus)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--pl-divider)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--pl-muted)',
          fontSize: 10,
        }}
      >
        ▼
      </span>
    </div>
  );
}
