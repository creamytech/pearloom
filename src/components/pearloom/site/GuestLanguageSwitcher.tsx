'use client';

// ─────────────────────────────────────────────────────────────
// GuestLanguageSwitcher — the on-site language picker.
//
// Mounts as a sibling of ThemedSite's root (like the RSVP pill), so
// the site's --t-* theme bag doesn't reach it by inheritance; the
// shell hands us the resolved bag and we re-declare the few vars we
// paint with on our own root.
//
// It reads availableLocales(manifest) — the ONLY locales the host
// actually translated — and offers English (the authored base) plus
// each of them. Choosing one navigates to the same URL with
// ?lang=<code> set, preserving every other query param (including
// the ?g= passport token). The published route reads ?lang server-
// side and runs applyLocale, so the switch is a real re-render in
// the chosen language, not a client-side DOM walk.
//
// Renders nothing when the manifest carries no non-English
// translations (honesty rule — never offer a language we can't show).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '../motifs';
import { availableLocales } from '@/lib/i18n/apply-locale';
import { localeNativeName } from '@/lib/i18n/locales';
import type { StoryManifest } from '@/types';

interface Props {
  manifest: StoryManifest;
  /** The resolved site theme bag (getTheme(themeId).vars + themeVars). */
  theme: Record<string, string>;
}

/** Same URL, ?lang swapped, every other query param (incl. ?g=) kept. */
function hrefForLocale(locale: string): string {
  if (typeof window === 'undefined') return '#';
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    url.hash = '';
    return `${url.pathname}${url.search}`;
  } catch {
    return '#';
  }
}

/* useSyncExternalStore lets us read the live ?lang from the URL
   without a setState-in-effect (banned by the React Compiler lint)
   and without a router context (the published shell hydrates in
   tests without one). SSR + the first hydration render use the
   server snapshot (the manifest's applied locale); the client then
   reconciles to the real URL value with no hydration warning. */
function subscribeToUrl(cb: () => void): () => void {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
}
function readUrlLang(fallback: string): string {
  try {
    return new URLSearchParams(window.location.search).get('lang') || fallback;
  } catch {
    return fallback;
  }
}

export function GuestLanguageSwitcher({ manifest, theme }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // The applied locale — the URL's ?lang when present, otherwise the
  // manifest's active locale (which the server already resolved).
  const serverLocale = manifest.activeLocale ?? 'en';
  const current = useSyncExternalStore(
    subscribeToUrl,
    () => readUrlLang(serverLocale),
    () => serverLocale,
  );

  // Dismiss on outside-click / Escape.
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const extras = availableLocales(manifest).filter((l) => l && l !== 'en');
  if (extras.length === 0) return null;
  const locales = ['en', ...extras];

  // Re-declare the site vars we paint with on our own root (see header).
  const paper = theme['--t-card'] ?? theme['--t-paper'] ?? '#FDFAF0';
  const ink = theme['--t-ink'] ?? '#0E0D0B';
  const inkSoft = theme['--t-ink-soft'] ?? '#3A332C';
  const line = theme['--t-line'] ?? 'rgba(14,13,11,0.14)';
  const accent = theme['--t-accent'] ?? '#5C6B3F';
  const body = theme['--t-body'] ?? 'system-ui, sans-serif';
  const radius = theme['--t-radius'] ?? '12px';

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        bottom: 'calc(clamp(16px, 3vw, 28px) + env(safe-area-inset-bottom, 0px))',
        left: 'clamp(16px, 3vw, 28px)',
        zIndex: 120,
        fontFamily: body,
      }}
    >
      {open && (
        <div
          role="menu"
          aria-label="Choose a language"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            minWidth: 176,
            padding: 6,
            borderRadius: radius,
            background: paper,
            border: `1px solid ${line}`,
            boxShadow: '0 12px 34px rgba(14,13,11,0.16), 0 2px 8px rgba(14,13,11,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: inkSoft,
              opacity: 0.7,
              padding: '6px 10px 4px',
            }}
          >
            Language
          </div>
          {locales.map((code) => {
            const on = code === current;
            return (
              <a
                key={code}
                href={hrefForLocale(code)}
                role="menuitemradio"
                aria-checked={on}
                onClick={close}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13.5,
                  fontWeight: on ? 700 : 500,
                  color: on ? accent : ink,
                  background: on ? `color-mix(in srgb, ${accent} 9%, transparent)` : 'transparent',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => {
                  if (!on) e.currentTarget.style.background = `color-mix(in srgb, ${ink} 5%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  if (!on) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>{localeNativeName(code)}</span>
                {on && <Icon name="check" size={13} color={accent} />}
              </a>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language, ${localeNativeName(current)}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 13px',
          borderRadius: 999,
          background: paper,
          border: `1px solid ${line}`,
          color: ink,
          fontFamily: 'inherit',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(14,13,11,0.10)',
          lineHeight: 1,
        }}
      >
        <Icon name="globe" size={14} color={accent} />
        <span>{localeNativeName(current)}</span>
      </button>
    </div>
  );
}

export default GuestLanguageSwitcher;
