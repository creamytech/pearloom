'use client';

// ─────────────────────────────────────────────────────────────
// everglow / components/theme-provider.tsx
// Injects dynamic CSS variables from ThemeSchema into :root
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { ThemeSchema } from '@/types';
import { defaultTheme, themeToCssVars, googleFontsUrl } from '@/lib/theme';

interface ThemeContextValue {
  theme: ThemeSchema;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: defaultTheme });

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  theme?: ThemeSchema;
  children: ReactNode;
}

export function ThemeProvider({ theme = defaultTheme, children }: ThemeProviderProps) {
  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

  // Inject CSS variables into :root on mount / theme change
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }

    return () => {
      for (const key of Object.keys(cssVars)) {
        root.style.removeProperty(key);
      }
    };
  }, [cssVars]);

  // Inject the Google Fonts stylesheet
  useEffect(() => {
    const id = 'everglow-google-fonts';
    let link = document.getElementById(id) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    link.href = googleFontsUrl(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}
