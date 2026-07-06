'use client';

// ─────────────────────────────────────────────────────────────
// ThemeProvider — runtime theme state + persistence
//
// The actual theme is set on <html data-theme=...> by an inline
// boot script in app/layout.tsx (runs before paint to prevent
// flash). This provider hydrates that value into React state and
// exposes setTheme().
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { MotionConfig } from 'framer-motion';

type Theme = 'light' | 'dark';
type ThemePreference = Theme | 'system';

interface ThemeContextValue {
  theme: Theme;                    // resolved (system → light/dark)
  preference: ThemePreference;     // what the user chose
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  // Safari Private Mode throws on any localStorage access — fall
  // through to 'system' so the app boots cleanly.
  let stored: string | null = null;
  try { stored = localStorage.getItem('pl-theme'); } catch { /* ignore */ }
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

function resolveTheme(_pref: ThemePreference): Theme {
  // The product is light-mode across the board. Dark ("editorial
  // midnight") tokens are kept in CSS so it's a one-line revert, but
  // every preference now resolves to light — nobody is left on dark.
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy useState init reads localStorage + matchMedia on first
  // mount. Render is pure (react-hooks/set-state-in-effect)
  // and the host doesn't see a flash of light theme before
  // the effect runs.
  const [preference, setPrefState] = useState<ThemePreference>(() => readPreference());
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readPreference()));

  // Keep <html data-theme> in sync with the resolved theme. The boot
  // script in layout.tsx sets it before paint, but React hydration of
  // <html> can drop the attribute — re-asserting here makes it
  // deterministic and fixes the toggle-icon / page mismatch on load.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPrefState(p);
    try {
      if (p === 'system') {
        localStorage.removeItem('pl-theme');
      } else {
        localStorage.setItem('pl-theme', p);
      }
    } catch { /* ignore — Safari Private Mode etc. */ }
    const resolved = resolveTheme(p);
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
  }, [theme, setPreference]);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggle }}>
      {/* App-wide reduced-motion contract for framer-motion. The CSS
          layers all honour prefers-reduced-motion, but framer drives
          transforms from JS where the CSS blanket can't reach —
          reducedMotion="user" disables its transform/layout animations
          for those users (opacity is kept, per framer's own a11y
          guidance) everywhere: buttons, toasts, BlurFade, dialogs. */}
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Allow usage outside provider — return a no-op stub keyed to current DOM.
    return {
      theme: typeof document !== 'undefined'
        ? ((document.documentElement.dataset.theme as Theme) || 'light')
        : 'light',
      preference: 'system',
      setPreference: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
