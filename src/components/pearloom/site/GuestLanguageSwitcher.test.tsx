// ─────────────────────────────────────────────────────────────
// GuestLanguageSwitcher — honesty gate + SSR/hydration guard.
//  • Renders NOTHING when the manifest has no non-English locale.
//  • Mounts when the host has published ≥1 translation.
//  • The useSyncExternalStore(url) path hydrates without warnings
//    (no router context, matching the published-shell test).
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';
import { GuestLanguageSwitcher } from './GuestLanguageSwitcher';
import type { StoryManifest } from '@/types';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const THEME: Record<string, string> = {
  '--t-paper': '#FDFAF0', '--t-card': '#FFFDF7', '--t-ink': '#0E0D0B',
  '--t-ink-soft': '#3A332C', '--t-line': 'rgba(14,13,11,0.14)', '--t-accent': '#5C6B3F',
};

function manifestWith(translations?: StoryManifest['translations'], activeLocale?: string): StoryManifest {
  return { names: ['Ana', 'Luis'], chapters: [], translations, activeLocale } as unknown as StoryManifest;
}

describe('GuestLanguageSwitcher', () => {
  it('renders nothing when there are no non-English translations', () => {
    expect(renderToString(<GuestLanguageSwitcher manifest={manifestWith(undefined)} theme={THEME} />)).toBe('');
    // A translations map that only carries 'en' still offers nothing.
    expect(renderToString(<GuestLanguageSwitcher manifest={manifestWith({ en: {} })} theme={THEME} />)).toBe('');
  });

  it('mounts a switcher when a non-English translation exists', () => {
    const html = renderToString(
      <GuestLanguageSwitcher manifest={manifestWith({ es: { updatedAt: 'x' } })} theme={THEME} />,
    );
    expect(html).not.toBe('');
    // Collapsed control shows the current (base) language endonym.
    expect(html).toContain('English');
    expect(html).toContain('aria-haspopup="menu"');
  });

  it('hydrates cleanly with translations present', async () => {
    const ui = <GuestLanguageSwitcher manifest={manifestWith({ es: {}, fr: {} })} theme={THEME} />;
    const host = document.createElement('div');
    host.innerHTML = renderToString(ui);
    document.body.appendChild(host);
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ')); });
    try {
      await act(async () => { hydrateRoot(host, ui); });
    } finally {
      spy.mockRestore();
      host.remove();
    }
    if (errors.length) throw new Error('HYDRATION ERRORS:\n' + errors.join('\n---\n').slice(0, 3000));
    expect(errors).toEqual([]);
  });
});
