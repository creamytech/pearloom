'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/theme-provider.tsx
// Injects dynamic CSS variables + background patterns from ThemeSchema
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

/** Generate a CSS background pattern string from the AI's backgroundPattern enum */
function getPatternStyle(pattern: string, accentLight: string): string {
  switch (pattern) {
    case 'dots':
      return `background-image: radial-gradient(circle, ${accentLight}55 1px, transparent 1px); background-size: 28px 28px;`;
    case 'grid':
      return `background-image: linear-gradient(${accentLight}30 1px, transparent 1px), linear-gradient(90deg, ${accentLight}30 1px, transparent 1px); background-size: 40px 40px;`;
    case 'noise':
      return `background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 200px;`;
    case 'waves':
      return `background-image: repeating-linear-gradient(0deg, transparent, transparent 22px, ${accentLight}22 22px, ${accentLight}22 23px);`;
    case 'topography':
      return `background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cpath d='M0 80 Q150 40 300 80 T600 80' stroke='%23c9a87c' stroke-width='0.8' fill='none' opacity='0.18'/%3E%3Cpath d='M0 160 Q150 120 300 160 T600 160' stroke='%23c9a87c' stroke-width='0.8' fill='none' opacity='0.18'/%3E%3Cpath d='M0 240 Q150 200 300 240 T600 240' stroke='%23c9a87c' stroke-width='0.8' fill='none' opacity='0.18'/%3E%3Cpath d='M0 320 Q150 280 300 320 T600 320' stroke='%23c9a87c' stroke-width='0.8' fill='none' opacity='0.18'/%3E%3Cpath d='M0 400 Q150 360 300 400 T600 400' stroke='%23c9a87c' stroke-width='0.8' fill='none' opacity='0.18'/%3E%3Cpath d='M0 480 Q150 440 300 480 T600 480' stroke='%23c9a87c' stroke-width='0.8' fill='none' opacity='0.18'/%3E%3C/svg%3E"); background-size: 600px 600px;`;
    case 'floral':
      return `background-image: radial-gradient(ellipse at 0% 0%, ${accentLight}30 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, ${accentLight}30 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, ${accentLight}15 0%, transparent 70%);`;
    default:
      return '';
  }
}

export function ThemeProvider({ theme = defaultTheme, children }: ThemeProviderProps) {
  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

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

  const patternStyle = theme.backgroundPattern && theme.backgroundPattern !== 'none'
    ? getPatternStyle(theme.backgroundPattern, theme.colors.accentLight)
    : '';

  return (
    <ThemeContext.Provider value={{ theme }}>
      {patternStyle && (
        <style>{`body { ${patternStyle} }`}</style>
      )}
      {children}
    </ThemeContext.Provider>
  );
}
