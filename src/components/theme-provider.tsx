'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/theme-provider.tsx
// Injects dynamic CSS variables + all visual atmosphere effects
// from ThemeSchema into visitor-facing site pages, and manages
// per-site light/dark mode (scoped to [data-pl-site-root] so it
// never collides with the editor chrome's theme state).
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeSchema } from '@/types';
import { defaultTheme, themeToCssBlocks, googleFontsUrl } from '@/lib/theme';
import { GrainOverlay } from '@/components/effects/GrainOverlay';
import { VignetteOverlay } from '@/components/effects/VignetteOverlay';
import { GradientMesh } from '@/components/effects/GradientMesh';
import { CustomCursor } from '@/components/effects/CustomCursor';
import { TextureOverlay } from '@/components/effects/TextureOverlay';
import { ScrollRevealInjector } from '@/components/effects/ScrollReveal';
import { ColorTemperature } from '@/components/effects/ColorTemperature';
import { SiteThemeToggle } from '@/components/site/SiteThemeToggle';

type SiteThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeSchema;
  mode: SiteThemeMode;
  setMode: (m: SiteThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  theme?: ThemeSchema;
  /** Set to false on preview/wizard surfaces where the guest toggle would feel out of place. */
  showToggle?: boolean;
  children: ReactNode;
}

const STORAGE_KEY = 'pl-site-theme';

function readInitialMode(): SiteThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {}
  return 'light';
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

export function ThemeProvider({ theme = defaultTheme, showToggle = true, children }: ThemeProviderProps) {
  const [mode, setModeState] = useState<SiteThemeMode>('light');

  // Hydrate mode from localStorage / system preference after mount.
  useEffect(() => {
    setModeState(readInitialMode());
  }, []);

  const setMode = useCallback((next: SiteThemeMode) => {
    setModeState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: SiteThemeMode = prev === 'light' ? 'dark' : 'light';
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  const blocks = useMemo(() => themeToCssBlocks(theme), [theme]);
  const fx = theme.effects ?? {};

  // ── Smooth theme-color transitions ───────────────────────────
  useEffect(() => {
    const STYLE_ID = 'pearloom-theme-transition';
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      body,
      [data-pl-site-root],
      [data-pl-site-root] * {
        transition-property: background-color, color, border-color, fill, stroke;
        transition-duration: 700ms;
        transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
      }
      [data-pl-site-root] input:focus,
      [data-pl-site-root] textarea:focus,
      [data-pl-site-root] button:active {
        transition: none;
      }
    `;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  // ── Google Fonts ─────────────────────────────────────────────
  useEffect(() => {
    const id = 'pearloom-google-fonts';
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

  const ctxValue = useMemo<ThemeContextValue>(
    () => ({ theme, mode, setMode, toggleMode }),
    [theme, mode, setMode, toggleMode],
  );

  return (
    <ThemeContext.Provider value={ctxValue}>
      {/* ── Scoped CSS var blocks — swap instantly via data-theme attr ── */}
      <style
        // The two blocks are scoped to [data-pl-site-root] so the editor's
        // own html[data-theme] cannot accidentally restyle the site canvas.
        dangerouslySetInnerHTML={{
          __html: `
            [data-pl-site-root][data-theme="light"] { ${blocks.light} }
            [data-pl-site-root][data-theme="dark"]  { ${blocks.dark}  color-scheme: dark; }
          `,
        }}
      />

      {/* ── Background pattern ── */}
      {patternStyle && <style>{`body { ${patternStyle} }`}</style>}

      {/* ── Color temperature CSS filter ── */}
      <ColorTemperature value={fx.colorTemp ?? 0} />

      {/* ── Scroll reveal animation injector ── */}
      <ScrollRevealInjector animation={fx.scrollReveal ?? 'none'} />

      {/* ── Animated gradient mesh — behind all content, z=0 ── */}
      {fx.gradientMesh && fx.gradientMesh.preset !== 'none' && (
        <GradientMesh
          preset={fx.gradientMesh.preset}
          speed={fx.gradientMesh.speed}
          opacity={fx.gradientMesh.opacity}
          accentColor={theme.colors.accent}
        />
      )}

      {/* ── Page content root — color temp filter target ── */}
      <div
        data-pl-site-root
        data-theme={mode}
        style={{ position: 'relative', zIndex: 1, minHeight: '100%' }}
      >
        {children}

        {showToggle && <SiteThemeToggle />}
      </div>

      {/* ── Fixed-position overlays (render above content) ── */}
      <TextureOverlay texture={fx.textureOverlay ?? 'none'} intensity={60} />
      <GrainOverlay intensity={fx.grain ?? 0} />
      <VignetteOverlay intensity={fx.vignette ?? 0} />

      {/* ── Custom cursor (portal-like, always on top) ── */}
      <CustomCursor
        shape={fx.customCursor ?? 'none'}
        accentColor={fx.cursorColor || theme.colors.accent}
      />
    </ThemeContext.Provider>
  );
}
