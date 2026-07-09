 
/* LITERAL PORT of handoff/shared/themes.jsx THEMES catalog + themeRootStyle.

   Per the integration guide §0: this is THE primary visual fix. The
   generated-site renderer must emit the full --t-* token set via
   themeRootStyle() so each theme pack visually distinguishes itself
   (palette + material texture + type pairing + radii + shadows).

   Consumers: ThemedSiteRenderer reads manifest.themeId / manifest.theme.themeId,
   resolves a Theme, calls themeRootStyle(), spreads the result onto the
   .pl8-guest root's style attribute. The result is that every var(--t-*)
   reference inside the site re-skins per theme.
*/

import type { CSSProperties } from 'react';

export type ThemeLook = {
  card: 'frame' | 'wash' | 'soft' | 'flat';
  button: 'square' | 'pill' | 'sharp';
  divider: 'sprig' | 'brush' | 'dot' | 'rule' | 'deckle';
  photo: 'arch' | 'tape' | 'polaroid' | 'clean' | 'deckle';
  heroAlign: 'left' | 'center';
  motifDensity: 'sparse' | 'generous' | 'none';
};

export type ThemeVars = Record<string, string>;

export type Theme = {
  id: string;
  name: string;
  blurb: string;
  swatches: string[];
  texture: 'linen' | 'watercolor' | 'paper' | 'velvet' | 'cotton' | 'none';
  motif: 'olive' | 'bloom' | 'pressed' | 'none';
  look: ThemeLook;
  dark?: boolean;
  foil?: boolean;
  vars: ThemeVars;
};

export const THEMES: Theme[] = [
  {
    id: 'santorini',
    name: 'Santorini Linen',
    blurb: 'Sun-bleached linen, Aegean blue, whitewash & olive.',
    swatches: ['#3F6E92', '#283D4E', '#C2A165', '#EDE7DA'],
    texture: 'linen',
    motif: 'olive',
    look: { card: 'frame', button: 'square', divider: 'sprig', photo: 'arch', heroAlign: 'center', motifDensity: 'sparse' },
    vars: {
      '--t-paper': '#F5F1E8', '--t-section': '#EDE7DA', '--t-card': '#FBF9F3',
      '--t-ink': '#283D4E', '--t-ink-soft': '#4A6076', '--t-ink-muted': '#8A9AA6',
      '--t-accent': '#3F6E92', '--t-accent-2': '#7C9BB0', '--t-accent-bg': '#E2EAEF', '--t-accent-ink': '#2C5571',
      '--t-gold': '#C2A165', '--t-line': 'rgba(40,61,78,0.16)', '--t-line-soft': 'rgba(40,61,78,0.08)',
      '--t-rsvp': '#283D4E', '--t-rsvp-ink': '#F5F1E8',
      '--t-display': "'Cormorant Garamond', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '5px', '--t-radius-lg': '8px',
      '--t-display-wght': '600', '--t-hero-scale': '1.18', '--t-eyebrow-ls': '0.2em',
      '--t-shadow': '0 1px 0 rgba(40,61,78,0.05)',
    },
  },
  {
    id: 'tuscan',
    name: 'Tuscan Watercolor',
    blurb: 'Soft washes, terracotta & sage, blooms and lemons.',
    swatches: ['#C2693E', '#8A9A6B', '#C99A4E', '#F4E3D3'],
    texture: 'watercolor',
    motif: 'bloom',
    look: { card: 'wash', button: 'pill', divider: 'brush', photo: 'tape', heroAlign: 'center', motifDensity: 'generous' },
    vars: {
      '--t-paper': '#FBF6EC', '--t-section': '#F6ECDC', '--t-card': '#FFFCF5',
      '--t-ink': '#4B3D2A', '--t-ink-soft': '#6E5B43', '--t-ink-muted': '#A0907A',
      '--t-accent': '#C2693E', '--t-accent-2': '#D89A6A', '--t-accent-bg': '#F4E3D3', '--t-accent-ink': '#A4502A',
      '--t-gold': '#C99A4E', '--t-line': 'rgba(75,61,42,0.15)', '--t-line-soft': 'rgba(75,61,42,0.08)',
      '--t-rsvp': '#4B3D2A', '--t-rsvp-ink': '#FBF6EC',
      '--t-display': "'Fraunces', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '16px', '--t-radius-lg': '24px',
      '--t-display-wght': '500', '--t-hero-scale': '1', '--t-eyebrow-ls': '0.14em',
      '--t-shadow': '0 14px 30px rgba(75,61,42,0.10)',
    },
  },
  {
    id: 'garden',
    name: 'Pressed Garden',
    blurb: 'Cotton paper, pressed wildflowers, the Pearloom warmth.',
    swatches: ['#B7A4D0', '#8B9C5A', '#EAB286', '#F3E9D4'],
    texture: 'paper',
    motif: 'pressed',
    look: { card: 'soft', button: 'pill', divider: 'dot', photo: 'polaroid', heroAlign: 'center', motifDensity: 'generous' },
    vars: {
      '--t-paper': '#FDFAF0', '--t-section': '#F3E9D4', '--t-card': '#FFFEF7',
      '--t-ink': '#3D4A1F', '--t-ink-soft': '#566438', '--t-ink-muted': '#8A8671',
      '--t-accent': '#B7A4D0', '--t-accent-2': '#C4B5D9', '--t-accent-bg': '#E8E0F0', '--t-accent-ink': '#6B5A8C',
      '--t-gold': '#C19A4B', '--t-line': 'rgba(61,74,31,0.14)', '--t-line-soft': 'rgba(61,74,31,0.08)',
      '--t-rsvp': '#3D4A1F', '--t-rsvp-ink': '#F8F1E4',
      '--t-display': "'Fraunces', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '14px', '--t-radius-lg': '22px',
      '--t-display-wght': '600', '--t-hero-scale': '1', '--t-eyebrow-ls': '0.14em',
      '--t-shadow': '0 8px 22px rgba(61,74,31,0.08)',
    },
  },
  {
    id: 'editorial',
    name: 'Modern Editorial',
    blurb: 'Flat matte, high-contrast type. The clean counterpoint.',
    swatches: ['#1A1A17', '#B08940', '#E9E7E0', '#F4F3EF'],
    texture: 'none',
    motif: 'none',
    look: { card: 'flat', button: 'sharp', divider: 'rule', photo: 'clean', heroAlign: 'left', motifDensity: 'none' },
    vars: {
      '--t-paper': '#F4F3EF', '--t-section': '#EAE8E1', '--t-card': '#FBFAF7',
      '--t-ink': '#1A1A17', '--t-ink-soft': '#46453E', '--t-ink-muted': '#8A8980',
      '--t-accent': '#1A1A17', '--t-accent-2': '#B08940', '--t-accent-bg': '#E9E7E0', '--t-accent-ink': '#1A1A17',
      '--t-gold': '#B08940', '--t-line': 'rgba(26,26,23,0.16)', '--t-line-soft': 'rgba(26,26,23,0.08)',
      '--t-rsvp': '#1A1A17', '--t-rsvp-ink': '#F4F3EF',
      '--t-display': "'Inter', sans-serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Inter', sans-serif",
      '--t-radius': '2px', '--t-radius-lg': '3px',
      '--t-display-wght': '800', '--t-hero-scale': '1', '--t-eyebrow-ls': '0.24em',
      '--t-shadow': 'none',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Velvet',
    blurb: 'Inky velvet, candlelight gold, made for evenings.',
    swatches: ['#1A1B2E', '#C9A24B', '#B9A6E0', '#262842'],
    dark: true,
    foil: true,
    texture: 'velvet',
    motif: 'pressed',
    look: { card: 'soft', button: 'pill', divider: 'dot', photo: 'clean', heroAlign: 'center', motifDensity: 'sparse' },
    vars: {
      '--t-paper': '#1A1B2E', '--t-section': '#20223A', '--t-card': '#262842',
      '--t-ink': '#F1EBDD', '--t-ink-soft': '#C4BDD0', '--t-ink-muted': '#8B86A0',
      '--t-accent': '#B9A6E0', '--t-accent-2': '#C9A24B', '--t-accent-bg': '#2E2C50', '--t-accent-ink': '#D9C9F0',
      '--t-gold': '#C9A24B', '--t-line': 'rgba(241,235,221,0.16)', '--t-line-soft': 'rgba(241,235,221,0.09)',
      '--t-rsvp': '#C9A24B', '--t-rsvp-ink': '#1A1B2E',
      '--t-display': "'Cormorant Garamond', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '12px', '--t-radius-lg': '18px',
      '--t-display-wght': '500', '--t-hero-scale': '1.08', '--t-eyebrow-ls': '0.18em',
      '--t-shadow': '0 16px 40px rgba(0,0,0,0.40)',
    },
  },
  {
    id: 'coastal',
    name: 'Coastal Ink',
    blurb: 'Deckled paper, navy ink line-work, sea-glass calm.',
    swatches: ['#2C5E7A', '#1F3A4D', '#C9B89A', '#E8E4D6'],
    texture: 'cotton',
    motif: 'none',
    look: { card: 'frame', button: 'square', divider: 'deckle', photo: 'deckle', heroAlign: 'center', motifDensity: 'none' },
    vars: {
      '--t-paper': '#EAE5D7', '--t-section': '#E0DAC8', '--t-card': '#F4F0E4',
      '--t-ink': '#1F3A4D', '--t-ink-soft': '#3E5B6E', '--t-ink-muted': '#82929E',
      '--t-accent': '#2C5E7A', '--t-accent-2': '#6E93A8', '--t-accent-bg': '#DCE5E7', '--t-accent-ink': '#1F4254',
      '--t-gold': '#B89A5E', '--t-line': 'rgba(31,58,77,0.18)', '--t-line-soft': 'rgba(31,58,77,0.09)',
      '--t-rsvp': '#1F3A4D', '--t-rsvp-ink': '#EAE5D7',
      '--t-display': "'Cormorant Garamond', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '2px', '--t-radius-lg': '3px',
      '--t-display-wght': '600', '--t-hero-scale': '1.12', '--t-eyebrow-ls': '0.22em',
      '--t-shadow': '0 1px 0 rgba(31,58,77,0.06)',
    },
  },

  /* ── New collection (2026-06-18) — reconciled into the real --t-* contract.
     Body fonts kept on the production 'Inter' convention (the design-system
     port used 'Geist'); everything else verbatim from the signed-off packs. ── */
  {
    id: 'amalfi',
    name: 'Amalfi Citrus',
    blurb: 'Sun-bleached blue, lemon and terracotta, a coastal supper.',
    swatches: ['#2E6B8A', '#C6703D', '#D9B44A', '#FBF6EA'],
    texture: 'linen',
    motif: 'bloom',
    look: { card: 'frame', button: 'pill', divider: 'sprig', photo: 'arch', heroAlign: 'center', motifDensity: 'generous' },
    vars: {
      '--t-paper': '#FBF6EA', '--t-section': '#F1E7D4', '--t-card': '#FFFCF4',
      '--t-ink': '#1A2A33', '--t-ink-soft': '#3C5560', '--t-ink-muted': '#7E8E96',
      '--t-accent': '#2E6B8A', '--t-accent-2': '#5E94AD', '--t-accent-bg': '#E2EAEF', '--t-accent-ink': '#235874',
      '--t-gold': '#D9B44A', '--t-line': 'rgba(26,42,51,0.16)', '--t-line-soft': 'rgba(26,42,51,0.08)',
      '--t-rsvp': '#C6703D', '--t-rsvp-ink': '#FBF6EA',
      '--t-display': "'Fraunces', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '14px', '--t-radius-lg': '22px',
      '--t-display-wght': '500', '--t-hero-scale': '1.06', '--t-eyebrow-ls': '0.16em',
      '--t-shadow': '0 10px 26px rgba(26,42,51,0.10)',
    },
  },
  {
    id: 'first-light',
    name: 'First Light',
    blurb: 'Dawn rose and gold, the morning after, every year after.',
    swatches: ['#C6563D', '#C19A4B', '#D9A89E', '#FCF4EE'],
    texture: 'paper',
    motif: 'pressed',
    look: { card: 'soft', button: 'pill', divider: 'dot', photo: 'polaroid', heroAlign: 'center', motifDensity: 'sparse' },
    vars: {
      '--t-paper': '#FCF4EE', '--t-section': '#F6E4DA', '--t-card': '#FFFBF7',
      '--t-ink': '#3A2A2A', '--t-ink-soft': '#5E4742', '--t-ink-muted': '#9C8780',
      '--t-accent': '#C6563D', '--t-accent-2': '#D9897A', '--t-accent-bg': '#F6DDD4', '--t-accent-ink': '#A63F2A',
      '--t-gold': '#C19A4B', '--t-line': 'rgba(58,42,42,0.14)', '--t-line-soft': 'rgba(58,42,42,0.07)',
      '--t-rsvp': '#C6563D', '--t-rsvp-ink': '#FCF4EE',
      '--t-display': "'Fraunces', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '14px', '--t-radius-lg': '22px',
      '--t-display-wght': '600', '--t-hero-scale': '1', '--t-eyebrow-ls': '0.14em',
      '--t-shadow': '0 8px 22px rgba(58,42,42,0.09)',
    },
  },
  {
    id: 'deco-gilt',
    name: 'Deco Gilt',
    blurb: 'Jazz-age geometry, ink, gilt and a hard-edged fan.',
    swatches: ['#14110C', '#C9A24B', '#7C8A6A', '#F3ECD9'],
    dark: true,
    foil: true,
    texture: 'velvet',
    motif: 'none',
    look: { card: 'flat', button: 'sharp', divider: 'rule', photo: 'clean', heroAlign: 'left', motifDensity: 'none' },
    vars: {
      '--t-paper': '#14110C', '--t-section': '#1C1810', '--t-card': '#211C13',
      '--t-ink': '#F3ECD9', '--t-ink-soft': '#C9C0A8', '--t-ink-muted': '#8A8266',
      '--t-accent': '#C9A24B', '--t-accent-2': '#7C8A6A', '--t-accent-bg': '#2A2416', '--t-accent-ink': '#E6C977',
      '--t-gold': '#C9A24B', '--t-line': 'rgba(243,236,217,0.16)', '--t-line-soft': 'rgba(243,236,217,0.08)',
      '--t-rsvp': '#C9A24B', '--t-rsvp-ink': '#14110C',
      '--t-display': "'Fraunces', Georgia, serif", '--t-body': "'Geist Mono', ui-monospace, monospace", '--t-script': "'Caveat', cursive",
      '--t-radius': '1px', '--t-radius-lg': '2px',
      '--t-display-wght': '700', '--t-hero-scale': '1.1', '--t-eyebrow-ls': '0.3em',
      '--t-shadow': '0 16px 40px rgba(0,0,0,0.45)',
    },
  },
  {
    id: 'tide-coast',
    name: 'Tide & Coast',
    blurb: 'Fog, driftwood and rope, an unhurried seaside vow.',
    swatches: ['#5E7A82', '#C8BFA5', '#9DB0B2', '#F2F1EC'],
    texture: 'cotton',
    motif: 'none',
    look: { card: 'frame', button: 'square', divider: 'deckle', photo: 'deckle', heroAlign: 'center', motifDensity: 'sparse' },
    vars: {
      '--t-paper': '#F2F1EC', '--t-section': '#E6E5DD', '--t-card': '#FAFAF6',
      '--t-ink': '#2C353A', '--t-ink-soft': '#4E5A60', '--t-ink-muted': '#8B969B',
      '--t-accent': '#5E7A82', '--t-accent-2': '#9DB0B2', '--t-accent-bg': '#DEE5E5', '--t-accent-ink': '#46626A',
      '--t-gold': '#B8A580', '--t-line': 'rgba(44,53,58,0.16)', '--t-line-soft': 'rgba(44,53,58,0.08)',
      '--t-rsvp': '#2C353A', '--t-rsvp-ink': '#F2F1EC',
      '--t-display': "'Cormorant Garamond', Georgia, serif", '--t-body': "'Inter', sans-serif", '--t-script': "'Caveat', cursive",
      '--t-radius': '3px', '--t-radius-lg': '5px',
      '--t-display-wght': '600', '--t-hero-scale': '1.12', '--t-eyebrow-ls': '0.2em',
      '--t-shadow': '0 1px 0 rgba(44,53,58,0.06)',
    },
  },
];

export const DEFAULT_THEME_ID = 'garden';

export function getTheme(id?: string | null): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID) ?? THEMES[0];
}

export type Density = 'cozy' | 'comfortable' | 'spacious';

const PAD_BY_DENSITY: Record<Density, number> = {
  cozy: 0.74,
  comfortable: 1,
  spacious: 1.32,
};

/* Full theme ROOT style: the --t-* set PLUS the base design-system vars
   (--ink, --paper, --font-display …) shadowed to the theme's values so any
   markup referencing base tokens re-skins for free. Scope this to the
   published-site root (.pl8-guest).

   Literal port of handoff/shared/themes.jsx L164-177. */
export function themeRootStyle(theme: Theme, density: Density = 'comfortable', override: ThemeVars | null = null): CSSProperties {
  const v = override ? { ...theme.vars, ...override } : theme.vars;
  const pad = PAD_BY_DENSITY[density] ?? 1;
  return {
    ...(v as unknown as CSSProperties),
    ['--t-pad' as string]: pad,
    ['--paper' as string]: v['--t-paper'],
    ['--card' as string]: v['--t-card'],
    ['--ink' as string]: v['--t-ink'],
    ['--ink-soft' as string]: v['--t-ink-soft'],
    ['--ink-muted' as string]: v['--t-ink-muted'],
    ['--cream' as string]: v['--t-paper'],
    ['--cream-2' as string]: v['--t-section'],
    ['--cream-3' as string]: v['--t-section'],
    ['--line' as string]: v['--t-line'],
    ['--line-soft' as string]: v['--t-line-soft'],
    ['--card-ring' as string]: v['--t-line-soft'],
    ['--font-display' as string]: v['--t-display'],
    ['--gold' as string]: v['--t-gold'],
    fontFamily: v['--t-body'],
    color: v['--t-ink'],
    background: v['--t-paper'],
  };
}
