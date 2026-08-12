// The RSVP contrast floor (G.7 / NEW-USER-REVAMP L26): the site's
// ONE primary guest action must never render illegibly, whatever a
// theme pack or derived var bag supplies.
import { describe, it, expect } from 'vitest';
import { getTheme, themeRootStyle } from './themes';

function ratio(aHex: string, bHex: string): number {
  const ch = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const lum = (rgb: readonly [number, number, number]) => {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const la = lum(ch(aHex));
  const lb = lum(ch(bHex));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('the RSVP contrast floor', () => {
  it('repairs the audit’s exact 1.46:1 pair to ≥ 4.5:1', () => {
    // text rgb(44,85,113) on rgb(63,110,146) — the pair the persona
    // walk found on a live site's RSVP button + mobile drawer pill.
    const style = themeRootStyle(getTheme('santorini'), 'comfortable', {
      '--t-rsvp': '#3F6E92',
      '--t-rsvp-ink': '#2C5571',
    }) as Record<string, string>;
    expect(style['--t-rsvp']).toBe('#3F6E92'); // host's background kept
    expect(ratio(style['--t-rsvp'], style['--t-rsvp-ink'])).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves an already-legible pair untouched', () => {
    const style = themeRootStyle(getTheme('santorini'), 'comfortable', {
      '--t-rsvp': '#0E0D0B',
      '--t-rsvp-ink': '#F5EFE2',
    }) as Record<string, string>;
    expect(style['--t-rsvp-ink']).toBe('#F5EFE2');
  });

  it('never touches unmeasurable (non-hex) values', () => {
    const style = themeRootStyle(getTheme('santorini'), 'comfortable', {
      '--t-rsvp': 'oklch(0.5 0.1 250)',
      '--t-rsvp-ink': 'var(--pl-cream)',
    }) as Record<string, string>;
    expect(style['--t-rsvp-ink']).toBe('var(--pl-cream)');
  });

  it('every catalog theme already passes the floor unmodified', () => {
    for (const id of ['santorini', 'tuscan', 'garden', 'editorial', 'midnight', 'coastal', 'amalfi', 'first-light', 'deco-gilt', 'tide-coast']) {
      const theme = getTheme(id);
      const style = themeRootStyle(theme) as Record<string, string>;
      expect(style['--t-rsvp-ink'], `theme ${id}`).toBe(theme.vars['--t-rsvp-ink']);
    }
  });
});
