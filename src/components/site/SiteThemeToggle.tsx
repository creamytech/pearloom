'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/SiteThemeToggle.tsx
// Floating light/dark toggle rendered on public guest sites.
// Reads mode from ThemeProvider context; per-site scoped via
// [data-pl-site-root] so it never collides with editor chrome.
// ─────────────────────────────────────────────────────────────

import { useTheme } from '@/components/theme-provider';

export function SiteThemeToggle() {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className="pl-site-theme-toggle"
      style={{
        position: 'fixed',
        right: 'calc(1rem + env(safe-area-inset-right, 0px))',
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 60,
        width: 44,
        height: 44,
        borderRadius: 9999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--pl-cream-card, rgba(255,255,255,0.9))',
        color: 'var(--pl-ink, #2B2B2B)',
        border: '1px solid color-mix(in oklab, var(--pl-ink) 12%, transparent)',
        boxShadow: '0 10px 30px -12px rgba(0,0,0,0.25), 0 2px 6px -2px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background-color 220ms ease, color 220ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {isDark ? (
        // Sun glyph — shown in dark mode to hint "click for light"
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="3"  x2="12" y2="5"  />
            <line x1="12" y1="19" x2="12" y2="21" />
            <line x1="3"  y1="12" x2="5"  y2="12" />
            <line x1="19" y1="12" x2="21" y2="12" />
            <line x1="5.6"  y1="5.6"  x2="7"    y2="7"    />
            <line x1="17"   y1="17"   x2="18.4" y2="18.4" />
            <line x1="5.6"  y1="18.4" x2="7"    y2="17"   />
            <line x1="17"   y1="7"    x2="18.4" y2="5.6"  />
          </g>
        </svg>
      ) : (
        // Moon glyph — shown in light mode
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
