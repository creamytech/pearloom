// ─────────────────────────────────────────────────────────────
// The themed stationery email (ATELIER-PLAN INV.1). Pins:
//   • the batch invite wears the SITE's theme — accent + faces
//     from the SuiteTheme contract, never the old hardcoded
//     near-black template (#0E0B12 is a forbidden string here)
//   • per-cardType subjects + solemn register survive the move
//   • the guest is addressed ("Dear …" + "Pressed for …")
//   • photo / date / venue render when present, vanish when not
//   • the shared layout ships no CAN-SPAM placeholder
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  buildStationeryEmail,
  emailThemeFromSuite,
  emailLayout,
  DEFAULT_EMAIL_THEME,
} from './email-sequences';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import type { StoryManifest } from '@/types';

const THEMED_MANIFEST = {
  occasion: 'wedding',
  themeVars: {
    '--t-paper': '#FBF7EE',
    '--t-ink': '#233047',
    '--t-accent': '#3E5C76',
    '--t-card': '#FFFFFF',
  },
} as unknown as StoryManifest;

function themedInvite(overrides: Partial<Parameters<typeof buildStationeryEmail>[0]> = {}) {
  const suite = suiteThemeFromManifest(THEMED_MANIFEST, ['Maya', 'Jordan']);
  return buildStationeryEmail({
    cardType: 'invite',
    coupleDisplay: 'Maya & Jordan',
    occasionLabel: 'wedding',
    solemn: false,
    solo: false,
    guestName: 'Amara',
    ctaUrl: 'https://pearloom.com/i/tok-123',
    dateDisplay: 'Saturday, June 27, 2026',
    venueName: 'Lark Hill Farm',
    photoUrl: 'https://cdn.example.com/cover.jpg',
    monogram: { initA: 'M', initB: 'J' },
    themeColors: emailThemeFromSuite(suite),
    ...overrides,
  });
}

describe('buildStationeryEmail — the invite wears the couple’s theme', () => {
  it('carries the site accent and never the retired near-black template', () => {
    const { html } = themedInvite();
    expect(html).toContain('#3E5C76');       // the site's --t-accent
    expect(html).not.toContain('#0E0B12');   // the old hardcoded body bg
    expect(html).not.toContain('#C4A96A');   // the old hardcoded gold
  });

  it('addresses the guest and presses their name', () => {
    const { html } = themedInvite();
    expect(html).toContain('Dear');
    expect(html).toContain('Amara');
    expect(html).toContain('Pressed for Amara');
  });

  it('renders photo, date, venue, and monogram when present — none when absent', () => {
    const rich = themedInvite();
    expect(rich.html).toContain('https://cdn.example.com/cover.jpg');
    expect(rich.html).toContain('Saturday, June 27, 2026');
    expect(rich.html).toContain('Lark Hill Farm');
    expect(rich.html).toContain('M&amp;J');
    const bare = themedInvite({ photoUrl: undefined, dateDisplay: undefined, venueName: undefined, monogram: undefined, guestName: undefined });
    expect(bare.html).not.toContain('cdn.example.com');
    expect(bare.html).not.toContain('Pressed for');
  });

  it('keeps the per-cardType subjects', () => {
    expect(themedInvite().subject).toBe("You're invited to Maya & Jordan's wedding");
    expect(themedInvite({ cardType: 'std' }).subject).toBe('Save the date — Maya & Jordan');
    expect(themedInvite({ cardType: 'thanks' }).subject).toBe('Thank you, from Maya & Jordan');
  });

  it('solemn occasions keep the remembering register', () => {
    const memorial = themedInvite({
      solemn: true,
      solo: true,
      coupleDisplay: 'Eleanor',
      occasionLabel: 'memorial',
      occasionTitle: 'Memorial',
    });
    expect(memorial.subject).toBe('Memorial for Eleanor');
    expect(memorial.html).toContain('Join us in remembering');
    expect(memorial.html).not.toContain('celebrate');
    const thanks = themedInvite({ cardType: 'thanks', solemn: true, coupleDisplay: 'Eleanor' });
    expect(thanks.subject).toBe('With thanks, from the family of Eleanor');
  });
});

describe('emailLayout — one default, no placeholders', () => {
  it('ships no CAN-SPAM placeholder (address renders only from config)', () => {
    const html = emailLayout('<tr><td>hello</td></tr>');
    expect(html).not.toContain('[MAILING ADDRESS]');
  });

  it('the unthemed default is the brand paper (one token set)', () => {
    expect(DEFAULT_EMAIL_THEME.background).toBe('#F5EFE2');
    expect(DEFAULT_EMAIL_THEME.headingFont).toBe('Fraunces');
    const html = emailLayout('<tr><td>hello</td></tr>');
    expect(html).toContain('#F5EFE2');
    expect(html).not.toContain('#F5F1E8'); // the old second default
  });
});
