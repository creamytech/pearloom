'use client';

// ─────────────────────────────────────────────────────────────
// ThemeToggle — pill button that flips light/dark with a sun
// crescent → moon crescent crossfade. Used in toolbars, nav,
// editor chrome.
// ─────────────────────────────────────────────────────────────

import { useTheme } from './ThemeProvider';

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { theme, toggle } = useTheme();
  const dim = size === 'sm' ? 28 : 32;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      style={{
        width: dim,
        height: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--pl-radius-full)',
        border: '1px solid var(--pl-divider)',
        background: 'var(--pl-cream-card)',
        color: 'var(--pl-ink)',
        cursor: 'pointer',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-spring)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-olive)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-divider)';
      }}
    >
      <svg width={size === 'sm' ? 14 : 16} height={size === 'sm' ? 14 : 16} viewBox="0 0 16 16" fill="none">
        {theme === 'dark' ? (
          // moon
          <path d="M12 9.2A4.5 4.5 0 0 1 6.8 4a.5.5 0 0 0-.7-.55A6 6 0 1 0 12.55 9.9a.5.5 0 0 0-.55-.7Z" fill="currentColor" />
        ) : (
          // sun
          <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="2.6" fill="currentColor" />
            <line x1="8" y1="1.5" x2="8" y2="3" />
            <line x1="8" y1="13" x2="8" y2="14.5" />
            <line x1="1.5" y1="8" x2="3" y2="8" />
            <line x1="13" y1="8" x2="14.5" y2="8" />
            <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" />
            <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" />
            <line x1="3.4" y1="12.6" x2="4.5" y2="11.5" />
            <line x1="11.5" y1="4.5" x2="12.6" y2="3.4" />
          </g>
        )}
      </svg>
    </button>
  );
}
