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

function resolveTheme(pref: ThemePreference): Theme {
  if (pref !== 'system') return pref;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy useState init reads localStorage + matchMedia on first
  // mount. Render is pure (react-hooks/set-state-in-effect)
  // and the host doesn't see a flash of light theme before
  // the effect runs.
  const [preference, setPrefState] = useState<ThemePreference>(() => readPreference());
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readPreference()));

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (preference === 'system') {
        const next = mql.matches ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.dataset.theme = next;
      }
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [preference]);

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
      {children}
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
