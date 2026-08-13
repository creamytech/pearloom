// ─────────────────────────────────────────────────────────────
// Pearloom / lib/suite-card.ts
//
// THE suite-card formatter (A.3 — L55/L99). Every designed card a
// host's celebration unfurls into — the publish modal's share
// card, the First Pressing arrival overlay, the "It's pressed."
// moment — formats through here, replacing three hand-assembled
// versions that each got something wrong:
//
//   • Raw ISO dates ("2026-08-15") printed on letterpress moments
//     while the site hero formatted the same date as "Saturday,
//     August 15, 2026" (L99). One formatter now — the hero's own
//     (ThemedSite.formatHeroDate delegates here too).
//   • No contrast floor: the share card rendered the suite theme's
//     ink on the suite theme's card color and measured 1.72–2.12:1
//     (L55). Card ink now comes from inkFamilyForBackground
//     (color-utils), which flips the whole ink family against the
//     actual background.
//   • Dangling "·" when the date or venue is missing — the joiner
//     renders only between two real values.
// ─────────────────────────────────────────────────────────────

import { contrastRatio, inkFamilyForBackground, type InkFamily } from '@/lib/color-utils';

/** "2027-06-12" → "Saturday, June 12, 2027". Anything that isn't an
 *  ISO-leading date string passes through untouched (hosts type
 *  things like "Midsummer weekend" and we keep their words). */
export function humaneDateLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** The card's date-and-venue line: humane date, "·" only BETWEEN two
 *  real values, never dangling (the L71 class). */
export function suiteDateVenueLine(
  date: string | null | undefined,
  venue: string | null | undefined,
): string {
  const d = humaneDateLabel(date);
  const v = (venue ?? '').trim();
  if (d && v) return `${d} · ${v}`;
  return d || v;
}

/** Contrast-floored ink family for a card background — the one way
 *  a designed card picks its text colors (never the theme's ink
 *  straight onto the theme's card color).
 *
 *  The warm brand inks cover light and dark grounds; MID-TONE card
 *  colors (the audit's olive, rgb(109,125,63)) beat both — the warm
 *  dark ink lands ~4.25:1 and warm cream ~4.22:1. For those the
 *  family escalates to pure black/white, whichever clears AA. Warmth
 *  is the common case; legibility is the floor. */
export function suiteCardInk(background: string | null | undefined): InkFamily {
  const fam = inkFamilyForBackground(background);
  const bg = background ?? '#F5EFE2';
  const ratio = contrastRatio(fam.ink, bg);
  if (ratio !== null && ratio < 4.5) {
    const black = contrastRatio('#000000', bg) ?? 0;
    const white = contrastRatio('#FFFFFF', bg) ?? 0;
    // Solid tones, not alpha — measurable, and alpha over a mid-tone
    // ground just blends back toward the problem.
    return black >= white
      ? { ink: '#000000', inkSoft: '#141414', inkMuted: '#242424', divider: 'rgba(0,0,0,0.24)' }
      : { ink: '#FFFFFF', inkSoft: '#F4F4F4', inkMuted: '#E4E4E4', divider: 'rgba(255,255,255,0.30)' };
  }
  return fam;
}
