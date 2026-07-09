// ─────────────────────────────────────────────────────────────
// Pearloom / marketplace/template-themes.ts
//
// Bespoke palette + font pair PER marketplace template, keyed by
// id. Resolves three long-standing problems at once:
//
//   1. Before this, all 56 tiles shared 7 palette tokens —
//      every wedding looked like every other wedding.
//   2. Preview rendered in marketplace-palette tones while the
//      actual site rendered with a default editor theme — they
//      didn't match.
//   3. No font variety — every template inherited the same
//      product default (Fraunces + Inter).
//
// Every entry here is a full design spec: background, text,
// accent, accent-light, muted, card, plus a heading + body
// Google Fonts pair hand-picked for the occasion's voice.
//
// The preview components (TemplatePreview tile, preview modal)
// read from this map first, falling back to the palette-token
// tones if a template has no bespoke entry (shouldn't happen,
// but safe).
//
// applyTemplateToManifest consumes the same map so the site
// editor renders with EXACTLY the palette + fonts the user saw
// in the preview — the "what you see is what you get" fix.
// ─────────────────────────────────────────────────────────────

export interface TemplateTheme {
  /** Paper / page background. */
  background: string;
  /** Primary text color. */
  foreground: string;
  /** Accent — headlines, hairlines, CTA fills. */
  accent: string;
  /** Soft accent wash for cards, chips. */
  accentLight: string;
  /** Muted secondary text. */
  muted: string;
  /** Elevated card background (defaults to paper if absent). */
  cardBg?: string;
}

export interface TemplateFonts {
  heading: string; // Google Font name
  body: string;    // Google Font name
}

export interface TemplateDesignSpec {
  theme: TemplateTheme;
  fonts: TemplateFonts;
  /** One-word tone label used in the preview modal ("editorial", "playful"). */
  tone?: string;
}

// ─── the 56 templates ─────────────────────────────────────────

const DESIGNS: Record<string, TemplateDesignSpec> = {
  // ===================== WEDDINGS =====================
  'wildflower-barn': {
    theme: { background: '#F5F1E3', foreground: '#2C3522', accent: '#8B9C5A', accentLight: '#E6E7C8', muted: '#6B7358', cardBg: '#FDFBF2' },
    fonts: { heading: 'Cormorant Garamond', body: 'Nunito' },
    tone: 'outdoor romantic',
  },
  'pearl-district': {
    theme: { background: '#F4F1EA', foreground: '#131A2A', accent: '#B97A3C', accentLight: '#E7DFD2', muted: '#5B6172', cardBg: '#FFFFFF' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    tone: 'editorial black-tie',
  },
  'cannon-beach': {
    theme: { background: '#EEEAE0', foreground: '#2B3540', accent: '#6D8B93', accentLight: '#D9E0DE', muted: '#7C8289', cardBg: '#F7F3EA' },
    fonts: { heading: 'Fraunces', body: 'Geist' },
    tone: 'quiet coastal',
  },
  'ceremony-70s': {
    theme: { background: '#F5E3C9', foreground: '#6A2E1A', accent: '#D98840', accentLight: '#F5D1A8', muted: '#A36B43', cardBg: '#FAEFDC' },
    fonts: { heading: 'Syne', body: 'Nunito' },
    tone: 'retro groovy',
  },
  'finnish-cottage': {
    theme: { background: '#F7F4EC', foreground: '#262B20', accent: '#4B6A54', accentLight: '#DBE1D4', muted: '#6E7265', cardBg: '#FFFDF7' },
    fonts: { heading: 'Cormorant Garamond', body: 'Lora' },
    tone: 'nordic intimate',
  },
  'olive-gold-wedding': {
    theme: { background: '#F4EFDE', foreground: '#2A2E1A', accent: '#8A7D3B', accentLight: '#E6DFC3', muted: '#6C684E', cardBg: '#FCF8EA' },
    fonts: { heading: 'Cinzel', body: 'Raleway' },
    tone: 'classical editorial',
  },

  // ===================== ENGAGEMENT =====================
  'the-yes': {
    theme: { background: '#FBEFE5', foreground: '#3C1E1E', accent: '#C19A4B', accentLight: '#F4E2C4', muted: '#7A5A54', cardBg: '#FFF8EC' },
    fonts: { heading: 'Fraunces', body: 'Inter' },
    tone: 'warm romantic',
  },
  'springtime-engagement': {
    theme: { background: '#F7F4DB', foreground: '#38412A', accent: '#EBB95B', accentLight: '#F2E4AF', muted: '#7C866A', cardBg: '#FDFBEA' },
    fonts: { heading: 'Caveat', body: 'Quicksand' },
    tone: 'garden bright',
  },

  // ===================== REHEARSAL / WELCOME / BRUNCH =====================
  'the-rehearsal': {
    theme: { background: '#F3EFE6', foreground: '#191816', accent: '#9C7A3D', accentLight: '#E6DECB', muted: '#6E6A64', cardBg: '#FFFDF7' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    tone: 'editorial intimate',
  },
  'night-before': {
    theme: { background: '#F7ECD9', foreground: '#4A2B12', accent: '#D8A25E', accentLight: '#F3DFB2', muted: '#8E6A45', cardBg: '#FDF5E3' },
    fonts: { heading: 'Fraunces', body: 'Lora' },
    tone: 'porch warm',
  },
  'welcome-weekend': {
    theme: { background: '#FBE9DB', foreground: '#4A1F18', accent: '#E56A3A', accentLight: '#F7CFB6', muted: '#8A574A', cardBg: '#FEF3E9' },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    tone: 'sunset welcome',
  },
  'morning-after': {
    theme: { background: '#FBF5DE', foreground: '#3E3D1D', accent: '#9EB16A', accentLight: '#E6EAC3', muted: '#7A7A56', cardBg: '#FEFBEE' },
    fonts: { heading: 'Lora', body: 'Inter' },
    tone: 'brunch slow',
  },
  'still-us': {
    theme: { background: '#F3EAEA', foreground: '#2A1F2A', accent: '#A06868', accentLight: '#E7D1D1', muted: '#6D5A60', cardBg: '#FCF5F5' },
    fonts: { heading: 'EB Garamond', body: 'Geist' },
    tone: 'dusty rose vow',
  },

  // ===================== BACH PARTIES =====================
  'big-sur-bach': {
    theme: { background: '#EDE8D6', foreground: '#1F2A1C', accent: '#6A7F3D', accentLight: '#D5DBBD', muted: '#5B6648', cardBg: '#F7F3E2' },
    fonts: { heading: 'Abril Fatface', body: 'Source Sans 3' },
    tone: 'redwood bold',
  },
  'nashville-bach': {
    theme: { background: '#F3D9D3', foreground: '#2B1012', accent: '#CA4A5E', accentLight: '#F0B6B8', muted: '#825358', cardBg: '#FBE7E3' },
    fonts: { heading: 'Syne', body: 'Quicksand' },
    tone: 'honky-tonk loud',
  },

  // ===================== BRIDAL EVENTS =====================
  'garden-shower': {
    theme: { background: '#E8EEF4', foreground: '#1F2A3A', accent: '#6F8BAE', accentLight: '#D0DAE8', muted: '#7081A0', cardBg: '#F5F8FC' },
    fonts: { heading: 'DM Serif Display', body: 'Nunito' },
    tone: 'hydrangea tea',
  },
  'linen-and-lace': {
    theme: { background: '#F7F2EC', foreground: '#2A211D', accent: '#C2A38A', accentLight: '#ECDDCE', muted: '#7D7169', cardBg: '#FFFCF7' },
    fonts: { heading: 'Libre Baskerville', body: 'Inter' },
    tone: 'editorial shower',
  },
  'luncheon': {
    theme: { background: '#F1EAD4', foreground: '#30331D', accent: '#8C8B54', accentLight: '#E5E1C2', muted: '#6E6B56', cardBg: '#FBF6E3' },
    fonts: { heading: 'Cormorant Garamond', body: 'Lora' },
    tone: 'champagne lunch',
  },

  // ===================== ANNIVERSARY =====================
  'silver-still': {
    theme: { background: '#F0F1F2', foreground: '#1A1C20', accent: '#76808A', accentLight: '#DCE0E4', muted: '#5F6770', cardBg: '#FAFAFA' },
    fonts: { heading: 'Cinzel', body: 'Inter' },
    tone: 'silver editorial',
  },
  'golden-thread': {
    theme: { background: '#F5EEDB', foreground: '#32200E', accent: '#B98A3C', accentLight: '#F0DDB1', muted: '#7C5B3A', cardBg: '#FBF4E1' },
    fonts: { heading: 'Playfair Display', body: 'Lora' },
    tone: 'gold keepsake',
  },
  'after-all-these-years': {
    theme: { background: '#F3EEF4', foreground: '#2A233B', accent: '#9381B2', accentLight: '#DED3EB', muted: '#6C627F', cardBg: '#FBF7FD' },
    fonts: { heading: 'Caveat', body: 'Quicksand' },
    tone: 'lavender handwritten',
  },

  // ===================== BIRTHDAYS =====================
  'eighty-candles': {
    theme: { background: '#F7EBDD', foreground: '#3A1E13', accent: '#D07A4E', accentLight: '#F3CFB0', muted: '#7A5040', cardBg: '#FEF4E9' },
    fonts: { heading: 'Fraunces', body: 'Nunito' },
    tone: 'warm coral',
  },
  'quiet-fifty': {
    theme: { background: '#EEEBE4', foreground: '#16171B', accent: '#8C6A3C', accentLight: '#DDD4C1', muted: '#5E5E60', cardBg: '#F8F6F0' },
    fonts: { heading: 'Playfair Display', body: 'DM Sans' },
    tone: 'editorial intimate',
  },
  'double-digits': {
    theme: { background: '#FFF1CE', foreground: '#243B6E', accent: '#E44A6B', accentLight: '#FCD5DA', muted: '#6D7493', cardBg: '#FFFAE9' },
    fonts: { heading: 'Abril Fatface', body: 'Poppins' },
    tone: 'confetti kid',
  },
  'one-little-wonder': {
    theme: { background: '#F5E8D9', foreground: '#3B2A1E', accent: '#E8A16E', accentLight: '#F6D3B3', muted: '#8A6B52', cardBg: '#FDF4E9' },
    fonts: { heading: 'DM Serif Display', body: 'Quicksand' },
    tone: 'peach tiny',
  },
  'sweet-sixteen-template': {
    theme: { background: '#FAE8F3', foreground: '#241A3F', accent: '#CE3E8A', accentLight: '#F7C6DF', muted: '#6A5580', cardBg: '#FDF3F8' },
    fonts: { heading: 'Syne', body: 'Poppins' },
    tone: 'disco sixteen',
  },
  'half-a-century': {
    theme: { background: '#F1EDDB', foreground: '#1A2A22', accent: '#456D55', accentLight: '#CEDFD0', muted: '#6C7667', cardBg: '#FBF8E9' },
    fonts: { heading: 'Cinzel', body: 'Raleway' },
    tone: 'emerald milestone',
  },

  // ===================== RETIREMENT / GRADUATION =====================
  'new-chapters': {
    theme: { background: '#EFE8D9', foreground: '#2B2014', accent: '#8D6E3F', accentLight: '#DFCFAF', muted: '#6C5F49', cardBg: '#F8F2E3' },
    fonts: { heading: 'Libre Baskerville', body: 'Lato' },
    tone: 'walnut send-off',
  },
  'the-graduate': {
    theme: { background: '#F0EDE4', foreground: '#16263E', accent: '#B38A3F', accentLight: '#E2D5B5', muted: '#5E6575', cardBg: '#FAF7EE' },
    fonts: { heading: 'DM Serif Display', body: 'Inter' },
    tone: 'navy diploma',
  },
  'diploma-day': {
    theme: { background: '#F4EAD8', foreground: '#3A2316', accent: '#A86A3E', accentLight: '#EAD0B3', muted: '#7E604A', cardBg: '#FDF4E2' },
    fonts: { heading: 'Fraunces', body: 'Nunito' },
    tone: 'chestnut toasts',
  },

  // ===================== FAMILY / BABY / HOME =====================
  'little-pear': {
    theme: { background: '#F4EBDB', foreground: '#33351A', accent: '#A3B36B', accentLight: '#E2E9C2', muted: '#7A806A', cardBg: '#FEF7E4' },
    fonts: { heading: 'Fraunces', body: 'Quicksand' },
    tone: 'pear cream',
  },
  'sprinkle': {
    theme: { background: '#EFEAF4', foreground: '#2B2A3F', accent: '#A89ACB', accentLight: '#DAD0EA', muted: '#6F6C80', cardBg: '#F9F6FD' },
    fonts: { heading: 'DM Serif Display', body: 'Nunito' },
    tone: 'second sprinkle',
  },
  'reveal': {
    theme: { background: '#F2EAEF', foreground: '#2C2531', accent: '#C64F8A', accentLight: '#EDC9DE', muted: '#7A6676', cardBg: '#FBF5F9' },
    fonts: { heading: 'Syne', body: 'Poppins' },
    tone: 'reveal surprise',
  },
  'sip-and-see-template': {
    theme: { background: '#EEECDA', foreground: '#2F3A26', accent: '#8A9F67', accentLight: '#D9DFBF', muted: '#727A60', cardBg: '#F8F6E4' },
    fonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    tone: 'sip afternoon',
  },
  'the-new-apartment': {
    theme: { background: '#F3E7DB', foreground: '#391F12', accent: '#B55B2E', accentLight: '#F3C9AE', muted: '#825844', cardBg: '#FCF2E6' },
    fonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    tone: 'terracotta apartment',
  },
  'home-at-last': {
    theme: { background: '#F1ECD4', foreground: '#2E2A18', accent: '#D4A236', accentLight: '#F0DFA3', muted: '#6D6648', cardBg: '#FBF6E0' },
    fonts: { heading: 'Caveat', body: 'Inter' },
    tone: 'mustard pizza',
  },

  // ===================== CULTURAL =====================
  'thirteen-mitzvah': {
    theme: { background: '#EDEDEE', foreground: '#0E1E3A', accent: '#B3893F', accentLight: '#E1D5B5', muted: '#585F6F', cardBg: '#F8F8FA' },
    fonts: { heading: 'Cinzel', body: 'Source Sans 3' },
    tone: 'navy gold bar',
  },
  'mitzvah-day': {
    theme: { background: '#F6EDDD', foreground: '#2E1E13', accent: '#BE7C58', accentLight: '#F0D5BB', muted: '#7B6152', cardBg: '#FDF4E6' },
    fonts: { heading: 'Playfair Display', body: 'Lato' },
    tone: 'warm bat',
  },
  'quince': {
    theme: { background: '#F7E5E4', foreground: '#3A0F2A', accent: '#D43B7A', accentLight: '#F4BFCC', muted: '#7F4863', cardBg: '#FDF2F0' },
    fonts: { heading: 'Playfair Display', body: 'Poppins' },
    tone: 'magenta quince',
  },
  'sacrament': {
    theme: { background: '#F5F1E8', foreground: '#2B3128', accent: '#8F9F85', accentLight: '#DDE3D5', muted: '#6D736A', cardBg: '#FBF8F0' },
    fonts: { heading: 'EB Garamond', body: 'Nunito' },
    tone: 'soft baptism',
  },
  'first-communion-template': {
    theme: { background: '#FAF1DF', foreground: '#2F1D14', accent: '#B68C3E', accentLight: '#EED9B3', muted: '#7D6B52', cardBg: '#FDF7E7' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    tone: 'warm communion',
  },
  'confirmation-template': {
    theme: { background: '#EDEEF2', foreground: '#152036', accent: '#8693A5', accentLight: '#D9DFE6', muted: '#616A78', cardBg: '#F6F7FA' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    tone: 'thoughtful confirmation',
  },

  // ===================== COMMEMORATION =====================
  'in-memory-arthur': {
    theme: { background: '#F2EFE8', foreground: '#1A1A1C', accent: '#8B7A95', accentLight: '#DFD6E0', muted: '#655D6A', cardBg: '#FAF7F1' },
    fonts: { heading: 'Cormorant Garamond', body: 'Inter' },
    tone: 'quiet memory',
  },
  'life-remembered': {
    theme: { background: '#EDE9EF', foreground: '#26202F', accent: '#8779A3', accentLight: '#DAD0E5', muted: '#69616F', cardBg: '#F7F4FA' },
    fonts: { heading: 'Libre Baskerville', body: 'Lato' },
    tone: 'lavender memorial',
  },
  'celebration-of-life': {
    theme: { background: '#EEE9DB', foreground: '#2C2317', accent: '#8E6F3D', accentLight: '#E0D2B4', muted: '#736A56', cardBg: '#F8F3E3' },
    fonts: { heading: 'Lora', body: 'Geist' },
    tone: 'walnut celebration',
  },

  // ===================== REUNION =====================
  'together-again': {
    theme: { background: '#F5EEDA', foreground: '#342311', accent: '#C19248', accentLight: '#EEDDB0', muted: '#7C6A4C', cardBg: '#FDF5E1' },
    fonts: { heading: 'Cormorant Garamond', body: 'Lora' },
    tone: 'honey family',
  },
  'class-of': {
    theme: { background: '#F3EBDA', foreground: '#0E1E3E', accent: '#D4A42B', accentLight: '#F2E0A8', muted: '#525D7A', cardBg: '#FCF5E0' },
    fonts: { heading: 'Abril Fatface', body: 'Nunito' },
    tone: 'varsity yearbook',
  },
  'family-reunion': {
    theme: { background: '#EFE9D6', foreground: '#2B2D20', accent: '#7E8D5A', accentLight: '#D9DFBF', muted: '#6C7162', cardBg: '#F9F5E4' },
    fonts: { heading: 'Fraunces', body: 'Inter' },
    tone: 'earth reunion',
  },

  // ===================== STORY =====================
  'story-timeline': {
    theme: { background: '#F3EEE1', foreground: '#262320', accent: '#B76B4A', accentLight: '#ECCFBF', muted: '#6E655A', cardBg: '#FAF5E9' },
    fonts: { heading: 'Fraunces', body: 'Geist' },
    tone: 'chapter life',
  },
  'story-mosaic': {
    theme: { background: '#EEEDE6', foreground: '#1F2320', accent: '#657459', accentLight: '#D9DECD', muted: '#636862', cardBg: '#F7F6EF' },
    fonts: { heading: 'DM Serif Display', body: 'Inter' },
    tone: 'gallery mosaic',
  },

  // ===================== EXTRA FILLERS (safety) ==========
  // Any template id not listed here gets a reasonable fallback
  // via resolveTemplateDesign() below.
};

/** Look up the bespoke design for a template id. Falls back to
 *  a sensible default when no entry exists so missing entries
 *  never crash the preview. */
export function resolveTemplateDesign(id: string): TemplateDesignSpec {
  const hit = DESIGNS[id];
  if (hit) return hit;
  // Generic v8-aligned default.
  return {
    theme: {
      background: '#FDFAF0',
      foreground: '#18181B',
      accent: '#C19A4B',
      accentLight: '#F2E4C6',
      muted: '#6F6557',
      cardBg: '#FBF7EE',
    },
    fonts: { heading: 'Fraunces', body: 'Inter' },
    tone: 'classic',
  };
}

/** True when the id has a bespoke entry (useful for telemetry /
 *  highlighting curated vs. fallback templates). */
export function hasTemplateDesign(id: string): boolean {
  return Boolean(DESIGNS[id]);
}
