/* =========================================================================
   PEARLOOM THEME PACKS — the "looks" a couple can dress their site in.
   Each pack bundles: a palette, a material/texture, a type pairing,
   component looks (cards / buttons / dividers / photos) and decorative
   motifs. Textures are generated procedurally (SVG filters + CSS) so they
   work offline with no image assets.

   Exports (window):
     THEMES, getTheme, themeStyle, ThemeDefs,
     TextureLayer, WatercolorWash,
     OliveSprig, WatercolorBloom, Lemon, PressedFlower,
     TDivider, TButton, TCard, TPhoto, MotifScatter,
     ThemePicker
   ========================================================================= */

const { useId: useThemeId, useState: useThemeState, useRef: useThemeRef } = React;

/* =========================================================================
   1. THEME DATA
   ========================================================================= */

const THEMES = [
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
      '--t-gold': '#B89244', '--t-line': 'rgba(61,74,31,0.14)', '--t-line-soft': 'rgba(61,74,31,0.08)',
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
    blurb: 'Inky velvet, candlelight gold — made for evenings.',
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
];

function getTheme(id) { return THEMES.find(t => t.id === id) || THEMES[0]; }

/* Module-level decor overrides (set by the site renderer each pass) so motifs
   & dividers can be globally re-skinned from the Decor Library. */
let __decor = {};
function setDecor(d) { __decor = d || {}; }
function getDecor() { return __decor; }

/* Build the inline-style object of CSS custom properties for a theme. */
function themeStyle(theme, { density = 'comfortable' } = {}) {
  const pad = { cozy: 0.74, comfortable: 1, spacious: 1.32 }[density] || 1;
  return { ...theme.vars, '--t-pad': pad };
}

/* Full theme ROOT style: the --t-* set PLUS the base design-system vars
   (--ink, --paper, --font-display …) shadowed to the theme's values, so any
   markup that references base tokens reskins for free. Scope to a site root. */
function themeRootStyle(theme, density = 'comfortable', override = null) {
  const v = override ? { ...theme.vars, ...override } : theme.vars;
  const pad = { cozy: 0.74, comfortable: 1, spacious: 1.32 }[density] || 1;
  return {
    ...v,
    '--t-pad': pad,
    '--paper': v['--t-paper'], '--card': v['--t-card'],
    '--ink': v['--t-ink'], '--ink-soft': v['--t-ink-soft'], '--ink-muted': v['--t-ink-muted'],
    '--cream': v['--t-paper'], '--cream-2': v['--t-section'], '--cream-3': v['--t-section'],
    '--line': v['--t-line'], '--line-soft': v['--t-line-soft'], '--card-ring': v['--t-line-soft'],
    '--font-display': v['--t-display'], '--gold': v['--t-gold'],
    fontFamily: v['--t-body'], color: v['--t-ink'], background: v['--t-paper'],
  };
}

/* =========================================================================
   2. SVG FILTER DEFS — mounted once per canvas
   ========================================================================= */

function ThemeDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* fine paper grain — dark specks (alpha = noise) */}
        <filter id="t-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0"/>
        </filter>
        {/* opaque grayscale FABRIC noise — for soft-light tonal weave unevenness */}
        <filter id="t-fabric">
          <feTurbulence type="fractalNoise" baseFrequency="0.06 0.11" numOctaves="3" seed="4" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="saturate" values="0" result="g"/>
          <feComponentTransfer in="g"><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
        </filter>
        {/* coarse mottle — large soft tonal blotches (handmade-paper unevenness) */}
        <filter id="t-mottle">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="11" result="n"/>
          <feColorMatrix in="n" type="saturate" values="0" result="g"/>
          <feComponentTransfer in="g"><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
        </filter>
        {/* fine directional WEAVE tooth — tight, thread-like grayscale */}
        <filter id="t-weave">
          <feTurbulence type="fractalNoise" baseFrequency="0.5 0.85" numOctaves="2" seed="6" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="saturate" values="0" result="g"/>
          <feComponentTransfer in="g"><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
        </filter>
        {/* organic watercolor edge — displaces soft shapes into painterly blobs */}
        <filter id="t-watercolor" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.016" numOctaves="3" seed="8" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        {/* lighter wash displacement for big backgrounds */}
        <filter id="t-wash" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.011" numOctaves="2" seed="3" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="48" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        {/* rough brush edge for divider strokes */}
        <filter id="t-brush" x="-10%" y="-40%" width="120%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.18" numOctaves="2" seed="5" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9"/>
        </filter>
        {/* deckled / torn paper edge */}
        <filter id="t-deckle" x="-5%" y="-30%" width="110%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.4" numOctaves="3" seed="2" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6"/>
        </filter>
      </defs>
    </svg>
  );
}

/* =========================================================================
   3. TEXTURE LAYERS — full-bleed material applied to the page surface
   ========================================================================= */

function TextureLayer({ texture, intensity = 1 }) {
  if (!texture || texture === 'none') return null;
  const base = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 };

  if (texture === 'linen') {
    // Linen = a fine, tight weave tooth + faint directional threads. No big
    // low-frequency clouds (those read as fog). Stays crisp under text.
    return (
      <div aria-hidden="true" style={base}>
        <div style={{
          position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.5 * intensity,
          backgroundImage: `
            repeating-linear-gradient(0deg, rgba(0,0,0,0.13) 0 1px, transparent 1px 2px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 2px)`,
          backgroundSize: '2px 2px, 2px 2px',
        }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.4 * intensity, mixBlendMode: 'soft-light' }}/>
      </div>
    );
  }

  if (texture === 'paper') {
    // handmade cotton paper: fine fibre tooth + light specks + a hint of mottle
    return (
      <div aria-hidden="true" style={base}>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.3 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.16 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.1 * intensity, mixBlendMode: 'multiply' }}/>
      </div>
    );
  }

  if (texture === 'cotton') {
    // cold-press cotton / watercolour paper — a coarser, more visible tooth
    return (
      <div aria-hidden="true" style={base}>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.34 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.42 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.16 * intensity, mixBlendMode: 'multiply' }}/>
      </div>
    );
  }

  if (texture === 'velvet') {
    // velvet pile + a soft raking sheen — reads on dark surfaces
    return (
      <div aria-hidden="true" style={base}>
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.6 * intensity,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 3px)' }}/>
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: 0.16 * intensity,
          background: 'linear-gradient(118deg, transparent 28%, rgba(255,255,255,0.12) 50%, transparent 72%)' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.3 * intensity, mixBlendMode: 'soft-light' }}/>
      </div>
    );
  }

  if (texture === 'watercolor') {
    // pigment washes that tint the page + watercolour-paper tooth + granulation
    return (
      <div aria-hidden="true" style={{ ...base, overflow: 'hidden' }}>
        <WatercolorWash tone="rgba(194,105,62,0.30)" style={{ top: '-6%', left: '-12%', width: 720, height: 580, mixBlendMode: 'multiply' }} seed={0} opacity={0.7 * intensity}/>
        <WatercolorWash tone="rgba(138,154,107,0.34)" style={{ top: '30%', right: '-14%', width: 640, height: 540, mixBlendMode: 'multiply' }} seed={1} opacity={0.7 * intensity}/>
        <WatercolorWash tone="rgba(217,154,106,0.30)" style={{ bottom: '-8%', left: '24%', width: 600, height: 500, mixBlendMode: 'multiply' }} seed={2} opacity={0.6 * intensity}/>
        <WatercolorWash tone="rgba(201,154,78,0.26)" style={{ top: '52%', left: '-8%', width: 460, height: 420, mixBlendMode: 'multiply' }} seed={1} opacity={0.55 * intensity}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.2 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.08 * intensity, mixBlendMode: 'multiply' }}/>
      </div>
    );
  }

  if (texture === 'kraft') {
    return (
      <div aria-hidden="true" style={base}>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.28 * intensity, mixBlendMode: 'multiply' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.3 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.2 * intensity, mixBlendMode: 'multiply' }}/>
      </div>
    );
  }

  if (texture === 'canvas') {
    return (
      <div aria-hidden="true" style={base}>
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.55 * intensity,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 3px)', backgroundSize: '3px 3px, 3px 3px' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-weave)', opacity: 0.35 * intensity, mixBlendMode: 'soft-light' }}/>
      </div>
    );
  }

  if (texture === 'marble') {
    return (
      <div aria-hidden="true" style={{ ...base, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-20%', filter: 'url(#t-wash)', opacity: 0.5 * intensity, mixBlendMode: 'multiply',
          background: 'repeating-linear-gradient(58deg, transparent 0 26px, color-mix(in oklab, var(--t-ink) 12%, transparent) 26px 27px, transparent 27px 62px), radial-gradient(42% 30% at 30% 24%, color-mix(in oklab, var(--t-ink) 9%, transparent), transparent 70%)' }}/>
        <div style={{ position: 'absolute', inset: '-20%', filter: 'url(#t-watercolor)', opacity: 0.4 * intensity, mixBlendMode: 'soft-light',
          background: 'repeating-linear-gradient(58deg, transparent 0 46px, rgba(255,255,255,0.55) 46px 48px, transparent 48px 94px)' }}/>
      </div>
    );
  }

  if (texture === 'gilded') {
    return (
      <div aria-hidden="true" style={base}>
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.5 * intensity,
          background: 'linear-gradient(120deg, transparent 22%, color-mix(in oklab, var(--t-gold) 62%, transparent) 48%, transparent 64%)' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.18 * intensity, mixBlendMode: 'soft-light' }}/>
        <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.12 * intensity, mixBlendMode: 'multiply' }}/>
      </div>
    );
  }

  return null;
}

/* =========================================================================
   3b. PATTERN LAYER — bold decorative print BEHIND content (zIndex 0).
   Tinted from the theme's own accent/gold so it reskins per pack. Distinct
   from TextureLayer (a material grain that sits on top).
   ========================================================================= */

function PatternLayer({ pattern, intensity = 1 }) {
  if (!pattern || pattern === 'none') return null;
  const k = intensity;
  const a  = (p) => `color-mix(in oklab, var(--t-accent) ${p * k}%, transparent)`;
  const a2 = (p) => `color-mix(in oklab, var(--t-accent-2) ${p * k}%, transparent)`;
  const g  = (p) => `color-mix(in oklab, var(--t-gold) ${p * k}%, transparent)`;
  const ink = (p) => `color-mix(in oklab, var(--t-ink) ${p * k}%, transparent)`;
  const base = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 };
  let bg = null, size = 'auto', extra = {};
  switch (pattern) {
    case 'gingham':  bg = `repeating-linear-gradient(0deg, ${a(13)} 0 14px, transparent 14px 28px), repeating-linear-gradient(90deg, ${a(13)} 0 14px, transparent 14px 28px)`; break;
    case 'stripe':   bg = `repeating-linear-gradient(90deg, ${a(12)} 0 10px, transparent 10px 22px)`; break;
    case 'cabana':   bg = `repeating-linear-gradient(90deg, ${a(15)} 0 28px, transparent 28px 56px)`; break;
    case 'diagonal': bg = `repeating-linear-gradient(45deg, ${a(11)} 0 12px, transparent 12px 26px)`; break;
    case 'dots':     bg = `radial-gradient(${a(22)} 22%, transparent 24%)`; size = '20px 20px'; break;
    case 'grid':     bg = `repeating-linear-gradient(0deg, var(--t-line) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, var(--t-line) 0 1px, transparent 1px 26px)`; break;
    case 'deco':     bg = `repeating-linear-gradient(135deg, ${a(13)} 0 14px, transparent 14px 28px, ${g(13)} 28px 42px, transparent 42px 56px)`; break;
    case 'scallop':  bg = `radial-gradient(circle at 50% 0, transparent 11px, ${a(13)} 12px 13px, transparent 14px)`; size = '30px 30px'; break;
    case 'wave':     bg = `radial-gradient(circle at 50% 100%, transparent 13px, ${a(12)} 14px 15px, transparent 16px)`; size = '34px 17px'; break;
    case 'confetti': bg = `radial-gradient(${a(42)} 30%, transparent 32%), radial-gradient(${a2(42)} 30%, transparent 32%), radial-gradient(${g(42)} 30%, transparent 32%)`; size = '46px 46px, 62px 62px, 38px 38px'; extra = { backgroundPosition: '0 0, 18px 24px, 32px 8px' }; break;
    case 'terrazzo': bg = `radial-gradient(${a(34)} 18%, transparent 20%), radial-gradient(${a2(30)} 16%, transparent 18%), radial-gradient(${g(30)} 14%, transparent 16%), radial-gradient(${ink(12)} 12%, transparent 14%)`; size = '52px 52px, 72px 72px, 44px 44px, 90px 90px'; extra = { backgroundPosition: '0 0, 26px 30px, 40px 12px, 60px 50px' }; break;
    case 'celestial':bg = `radial-gradient(${g(75)} 6%, transparent 8%), radial-gradient(rgba(255,255,255,0.65) 5%, transparent 7%), radial-gradient(rgba(255,255,255,0.4) 4%, transparent 6%)`; size = '88px 88px, 118px 118px, 152px 152px'; extra = { backgroundPosition: '0 0, 34px 48px, 86px 24px' }; break;
    default: return null;
  }
  return <div aria-hidden="true" style={{ ...base, backgroundImage: bg, backgroundSize: size, ...extra }}/>;
}

/* A single painterly wash blob */
function WatercolorWash({ tone = 'var(--t-accent-bg)', style = {}, seed = 0, opacity = 0.6 }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', opacity, ...style }}>
      <div style={{
        position: 'absolute', inset: 0,
        filter: 'url(#t-wash)',
        background: `radial-gradient(60% 55% at ${40 + seed*12}% ${44 - seed*8}%, ${tone} 0%, transparent 70%),
                     radial-gradient(50% 60% at ${64 - seed*10}% ${60 + seed*6}%, ${tone} 0%, transparent 72%)`,
      }}/>
    </div>
  );
}

/* =========================================================================
   4. MOTIFS — simple, tasteful botanical glyphs (geometric primitives only)
   ========================================================================= */

function OliveSprig({ size = 90, color = 'var(--t-motif, var(--t-accent))', berry = 'var(--t-gold)', flip = false, className = '', style = {} }) {
  return (
    <svg viewBox="0 0 120 60" width={size} height={size * 0.5} className={className}
      style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }} aria-hidden="true">
      <path d="M6 52 C 40 46, 78 36, 114 8" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      {[[28,44,-28],[44,38,-30],[60,31,-32],[76,24,-34],[92,17,-36]].map(([x,y,r],i)=>(
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse cx="0" cy="-7" rx="4.2" ry="9" fill={color} opacity={0.92}/>
        </g>
      ))}
      {[[36,47],[68,30],[100,14]].map(([x,y],i)=>(
        <ellipse key={i} cx={x} cy={y+5} rx="3.4" ry="4.4" fill={berry} transform={`rotate(-18 ${x} ${y+5})`}/>
      ))}
    </svg>
  );
}

function Lemon({ size = 44, color = 'var(--t-motif, var(--t-gold))', leaf = 'var(--t-accent)', className = '', style = {} }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} style={style} aria-hidden="true">
      <ellipse cx="30" cy="36" rx="17" ry="13" fill={color} transform="rotate(-24 30 36)"/>
      <ellipse cx="22" cy="30" rx="4" ry="6" fill="rgba(255,255,255,0.35)" transform="rotate(-24 22 30)"/>
      <path d="M40 22 C 48 14, 56 16, 56 16 C 54 24, 48 26, 40 22 Z" fill={leaf}/>
      <path d="M40 22 C 46 18, 52 17, 56 16" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none"/>
    </svg>
  );
}

function WatercolorBloom({ size = 120, tone = 'var(--t-motif, var(--t-accent))', tone2 = 'var(--t-accent-2)', className = '', style = {} }) {
  return (
    <div className={className} aria-hidden="true" style={{ width: size, height: size, position: 'relative', ...style }}>
      <div style={{
        position: 'absolute', inset: 0, filter: 'url(#t-watercolor)',
        background: `radial-gradient(40% 40% at 38% 42%, ${tone} 0%, transparent 64%),
                     radial-gradient(38% 38% at 62% 56%, ${tone2} 0%, transparent 66%),
                     radial-gradient(30% 30% at 54% 36%, ${tone} 0%, transparent 60%)`,
        opacity: 0.85,
      }}/>
    </div>
  );
}

function PressedFlower({ size = 56, petal = 'var(--t-motif, var(--t-accent-2))', center = 'var(--t-gold)', className = '', style = {} }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} style={style} aria-hidden="true">
      <g transform="translate(30 30)">
        {petals.map((a, i) => (
          <ellipse key={i} cx="0" cy="-13" rx="6.5" ry="12" fill={petal} opacity={0.9} transform={`rotate(${a})`}/>
        ))}
        <circle r="7" fill={center}/>
        <circle r="7" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      </g>
    </svg>
  );
}

/* Pick the right motif for a theme */
function Motif({ kind, size, style, className }) {
  if (kind === 'olive')   return <OliveSprig size={size} style={style} className={className}/>;
  if (kind === 'bloom')   return <WatercolorBloom size={size} style={style} className={className}/>;
  if (kind === 'pressed') return <PressedFlower size={size} style={style} className={className}/>;
  if (kind === 'lemon')   return <Lemon size={size} style={style} className={className}/>;
  if (kind === 'sun')     return <SunMotif size={size} style={style} className={className}/>;
  if (kind === 'wheat')   return <WheatMotif size={size} style={style} className={className}/>;
  if (kind === 'fern')    return <FernMotif size={size} style={style} className={className}/>;
  if (kind === 'shell')   return <ShellMotif size={size} style={style} className={className}/>;
  if (kind === 'citrus')  return <CitrusMotif size={size} style={style} className={className}/>;
  if (kind === 'laurel')  return <LaurelMotif size={size} style={style} className={className}/>;
  if (kind === 'deco')    return <DecoFan size={size} style={style} className={className}/>;
  if (kind === 'palm')    return <PalmMotif size={size} style={style} className={className}/>;
  return null;
}

function SunMotif({ size = 60, color = 'var(--t-motif, var(--t-gold))', className = '', style = {} }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} style={style} aria-hidden="true">
      <circle cx="30" cy="30" r="11" fill="none" stroke={color} strokeWidth="2"/>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30) * Math.PI / 180, r1 = 16, r2 = i % 2 ? 24 : 27;
        return <line key={i} x1={30 + Math.cos(a) * r1} y1={30 + Math.sin(a) * r1} x2={30 + Math.cos(a) * r2} y2={30 + Math.sin(a) * r2} stroke={color} strokeWidth="2" strokeLinecap="round"/>;
      })}
    </svg>
  );
}
function WheatMotif({ size = 70, color = 'var(--t-motif, var(--t-accent))', grain = 'var(--t-gold)', flip = false, className = '', style = {} }) {
  return (
    <svg viewBox="0 0 60 80" width={size * 0.75} height={size} className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }} aria-hidden="true">
      <path d="M30 78 L30 22" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {[20, 32, 44, 56].map((y, i) => (
        <g key={i}>
          <path d={`M30 ${y} Q18 ${y - 2} 14 ${y + 8}`} fill="none" stroke={grain} strokeWidth="3" strokeLinecap="round"/>
          <path d={`M30 ${y} Q42 ${y - 2} 46 ${y + 8}`} fill="none" stroke={grain} strokeWidth="3" strokeLinecap="round"/>
        </g>
      ))}
      <path d="M30 22 Q24 10 30 4 Q36 10 30 22" fill={grain}/>
    </svg>
  );
}
function FernMotif({ size = 80, color = 'var(--t-motif, var(--t-accent))', flip = false, className = '', style = {} }) {
  return (
    <svg viewBox="0 0 60 90" width={size * 0.67} height={size} className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }} aria-hidden="true">
      <path d="M30 88 C 30 60, 30 30, 30 6" fill="none" stroke={color} strokeWidth="1.6"/>
      {Array.from({ length: 9 }).map((_, i) => {
        const y = 80 - i * 9, len = 22 - i * 2;
        return <g key={i}>
          <path d={`M30 ${y} Q${30 - len * 0.6} ${y - 3} ${30 - len} ${y - 9}`} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
          <path d={`M30 ${y} Q${30 + len * 0.6} ${y - 3} ${30 + len} ${y - 9}`} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
        </g>;
      })}
    </svg>
  );
}
function ShellMotif({ size = 60, color = 'var(--t-motif, var(--t-accent))', className = '', style = {} }) {
  return (
    <svg viewBox="0 0 60 56" width={size} height={size * 0.93} className={className} style={style} aria-hidden="true">
      <path d="M30 52 C 8 52, 4 22, 30 6 C 56 22, 52 52, 30 52 Z" fill="none" stroke={color} strokeWidth="1.6"/>
      {[-20, -10, 0, 10, 20].map((d, i) => (
        <path key={i} d={`M30 50 Q${30 + d} 24 ${30 + d * 1.5} 9`} fill="none" stroke={color} strokeWidth="1.2" opacity={0.8}/>
      ))}
    </svg>
  );
}
function CitrusMotif({ size = 54, color = 'var(--t-motif, var(--t-accent))', flesh = 'var(--t-gold)', className = '', style = {} }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} style={style} aria-hidden="true">
      <circle cx="30" cy="30" r="22" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="30" cy="30" r="16" fill={`color-mix(in oklab, ${flesh} 30%, transparent)`}/>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 45) * Math.PI / 180;
        return <line key={i} x1="30" y1="30" x2={30 + Math.cos(a) * 15} y2={30 + Math.sin(a) * 15} stroke={color} strokeWidth="1.3"/>;
      })}
      <circle cx="30" cy="30" r="3" fill={color}/>
    </svg>
  );
}
function LaurelMotif({ size = 80, color = 'var(--t-motif, var(--t-accent))', className = '', style = {} }) {
  const leaf = (cx, cy, r) => <ellipse cx={cx} cy={cy} rx="3.4" ry="7" fill={color} opacity={0.9} transform={`rotate(${r} ${cx} ${cy})`}/>;
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} style={style} aria-hidden="true">
      <path d="M40 74 C 18 66, 14 36, 26 12" fill="none" stroke={color} strokeWidth="1.5"/>
      <path d="M40 74 C 62 66, 66 36, 54 12" fill="none" stroke={color} strokeWidth="1.5"/>
      {[[24,58,30],[20,46,40],[19,34,55],[23,22,70],[56,58,-30],[60,46,-40],[61,34,-55],[57,22,-70]].map((p, i) => <g key={i}>{leaf(p[0], p[1], p[2])}</g>)}
    </svg>
  );
}
function DecoFan({ size = 64, color = 'var(--t-motif, var(--t-gold))', className = '', style = {} }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} style={style} aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M32 56 A 30 30 0 0 1 ${32 - 26 + i * 13} ${56 - Math.sqrt(Math.max(0, 900 - (26 - i * 13) ** 2))}`} fill="none" stroke={color} strokeWidth="1.6"/>)}
      {[-26, -13, 0, 13, 26].map((dx, i) => <line key={i} x1="32" y1="56" x2={32 + dx} y2={56 - Math.sqrt(Math.max(0, 900 - dx * dx))} stroke={color} strokeWidth="1.4"/>)}
      <circle cx="32" cy="56" r="2.4" fill={color}/>
    </svg>
  );
}
function PalmMotif({ size = 80, color = 'var(--t-motif, var(--t-accent))', flip = false, className = '', style = {} }) {
  return (
    <svg viewBox="0 0 70 80" width={size * 0.88} height={size} className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none', ...style }} aria-hidden="true">
      <path d="M35 78 C 34 54, 33 30, 35 10" fill="none" stroke={color} strokeWidth="1.8"/>
      {[-58, -34, -12, 12, 34, 58].map((deg, i) => (
        <path key={i} d="M35 12 Q 50 14 64 6" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${deg} 35 12)`}/>
      ))}
    </svg>
  );
}

/* Scatter a couple of motifs in a section's corners (decorative, behind content) */
function MotifScatter({ motif, density = 'sparse', accent }) {
  const dec = (typeof getDecor !== 'undefined') ? getDecor() : {};
  if (dec.density) density = dec.density;
  if (!motif || motif === 'none' || density === 'none') return null;
  const sets = {
    sparse: [
      { kind: motif, size: 96, style: { top: 16, right: 22, opacity: 0.5 } },
    ],
    generous: [
      { kind: motif, size: 104, style: { top: 14, left: 18, opacity: 0.55, transform: 'scaleX(-1)' } },
      { kind: motif, size: 88, style: { bottom: 16, right: 24, opacity: 0.45 } },
    ],
  };
  const items = sets[density] || sets.sparse;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={i} style={{ position: 'absolute', ...it.style }}>
          <Motif kind={it.kind} size={it.size}/>
        </div>
      ))}
      {motif === 'bloom' && (
        <div style={{ position: 'absolute', bottom: 18, left: 26, opacity: 0.7, transform: 'rotate(-8deg)' }}>
          <Lemon size={44}/>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   5. THEMED COMPONENT PRIMITIVES — read the look flags
   ========================================================================= */

function TDivider({ look = 'rule', motif = 'olive', width = 220, style = {} }) {
  const wrap = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, margin: '0 auto', ...style };
  if (look === 'rule') {
    return <div style={{ ...wrap, width }}><div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/></div>;
  }
  if (look === 'dot') {
    return (
      <div style={{ ...wrap, width }}>
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-gold)' }}/>
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/>
      </div>
    );
  }
  if (look === 'brush') {
    return (
      <div style={{ ...wrap, width }}>
        <div style={{ width, height: 9, filter: 'url(#t-brush)',
          background: 'linear-gradient(90deg, transparent, var(--t-accent) 14%, var(--t-accent) 86%, transparent)',
          borderRadius: 6, opacity: 0.85 }}/>
      </div>
    );
  }
  if (look === 'sprig') {
    return (
      <div style={{ ...wrap, width: width + 80 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/>
        <OliveSprig size={64} flip/>
        <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--t-accent)' }}/>
        <OliveSprig size={64}/>
        <div style={{ flex: 1, height: 1, background: 'var(--t-line)' }}/>
      </div>
    );
  }
  if (look === 'deckle') {
    return (
      <div style={{ ...wrap, width }}>
        <div style={{ width, height: 4, filter: 'url(#t-deckle)',
          background: 'linear-gradient(90deg, transparent, var(--t-ink-soft) 18%, var(--t-ink-soft) 82%, transparent)',
          opacity: 0.5 }}/>
      </div>
    );
  }
  return null;
}

function TButton({ look = 'pill', variant = 'primary', children, style = {}, onClick }) {
  const radius = { pill: 999, square: 4, sharp: 0, soft: 12 }[look] ?? 999;
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: look === 'square' || look === 'sharp' ? '11px 22px' : '11px 22px',
    borderRadius: radius, fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--t-body)',
    letterSpacing: look === 'sharp' ? '0.04em' : 0,
    textTransform: look === 'sharp' ? 'uppercase' : 'none',
    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 180ms ease', ...style,
  };
  if (variant === 'primary') {
    return <span style={{ ...base, background: 'var(--t-ink)', color: 'var(--t-paper)' }} onClick={onClick}>{children}</span>;
  }
  if (variant === 'link') {
    return <span style={{ ...base, padding: '11px 2px', borderRadius: 0, background: 'transparent', color: 'var(--t-ink)', borderBottom: '2px solid var(--t-ink)', fontWeight: 700 }} onClick={onClick}>{children}</span>;
  }
  // outline
  return <span style={{ ...base, background: 'transparent', color: 'var(--t-ink)', border: '1.5px solid var(--t-line)' }} onClick={onClick}>{children}</span>;
}

function TCard({ look = 'soft', children, style = {}, tone }) {
  const looks = {
    frame: { background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius)', boxShadow: 'none' },
    soft:  { background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)' },
    wash:  { background: 'var(--t-card)', border: '1px solid var(--t-line-soft)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)' },
    flat:  { background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius)', boxShadow: 'none' },
  };
  return <div style={{ ...looks[look], ...style }}>{children}</div>;
}

/* Themed photo frame. tone -> PhotoPlaceholder gradient. */
function TPhoto({ look = 'clean', tone = 'warm', aspect = '1/1', caption, width = '100%', style = {} }) {
  const ph = <PhotoPlaceholder tone={tone} aspect={aspect} style={{ width: '100%', height: '100%' }}/>;

  if (look === 'arch') {
    return (
      <div style={{ width, ...style }}>
        <div style={{ aspectRatio: aspect, borderRadius: '999px 999px var(--t-radius) var(--t-radius)', overflow: 'hidden',
          border: '1px solid var(--t-line)', padding: 5, background: 'var(--t-card)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '999px 999px 3px 3px', overflow: 'hidden' }}>{ph}</div>
        </div>
      </div>
    );
  }
  if (look === 'polaroid') {
    return (
      <div style={{ width, background: '#fff', padding: caption ? '8px 8px 30px' : 8,
        boxShadow: '0 12px 28px rgba(0,0,0,0.14)', position: 'relative', transform: 'rotate(-1.4deg)', ...style }}>
        <div style={{ aspectRatio: aspect, overflow: 'hidden' }}>{ph}</div>
        {caption && <div style={{ position: 'absolute', bottom: 7, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--t-script)', fontSize: 17, color: 'var(--t-ink-soft)' }}>{caption}</div>}
      </div>
    );
  }
  if (look === 'tape') {
    return (
      <div style={{ width, position: 'relative', ...style }}>
        <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: 64, height: 20, background: 'rgba(194,105,62,0.32)', zIndex: 2 }}/>
        <div style={{ aspectRatio: aspect, overflow: 'hidden', borderRadius: 'var(--t-radius)', border: '4px solid #fff', boxShadow: 'var(--t-shadow)' }}>{ph}</div>
      </div>
    );
  }
  if (look === 'deckle') {
    return (
      <div style={{ width, ...style }}>
        <div style={{ filter: 'url(#t-deckle)', background: 'var(--t-card)', padding: 6 }}>
          <div style={{ aspectRatio: aspect, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--t-line)' }}>{ph}</div>
        </div>
      </div>
    );
  }
  // clean
  return <div style={{ width, aspectRatio: aspect, overflow: 'hidden', borderRadius: 'var(--t-radius)', ...style }}>{ph}</div>;
}

/* =========================================================================
   6. THEME PICKER — gallery of packs + fine-tune controls (right rail)
   ========================================================================= */

function ThemeThumb({ theme, active, recommended, onClick }) {
  const v = theme.vars;
  return (
    <button onClick={onClick} className="lift" style={{
      position: 'relative', textAlign: 'left', borderRadius: 12, overflow: 'hidden',
      border: active ? '2px solid var(--ink)' : '1px solid var(--line)',
      background: v['--t-paper'], padding: 0, cursor: 'pointer',
      boxShadow: active ? '0 8px 20px rgba(61,74,31,0.16)' : 'none',
    }}>
      {/* mini preview */}
      <div style={{ position: 'relative', height: 92, background: v['--t-section'], overflow: 'hidden' }}>
        <MiniTexture theme={theme}/>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px' }}>
          <div style={{ fontFamily: v['--t-display'], fontWeight: v['--t-display-wght'], fontSize: 26, lineHeight: 0.92, color: v['--t-ink'] }}>Aa</div>
          <div style={{ fontFamily: v['--t-display'], fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: 13, color: v['--t-accent-ink'] }}>{theme.id === 'editorial' ? 'and' : 'and'}</div>
        </div>
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          {theme.motif === 'olive' && <OliveSprig size={42} color={v['--t-accent']} berry={v['--t-gold']}/>}
          {theme.motif === 'bloom' && <WatercolorBloom size={40} tone={v['--t-accent']} tone2={v['--t-accent-2']}/>}
          {theme.motif === 'pressed' && <PressedFlower size={30} petal={v['--t-accent-2']} center={v['--t-gold']}/>}
        </div>
        {active && (
          <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={12} color="var(--cream)"/>
          </div>
        )}
        {!active && recommended && (
          <div style={{ position: 'absolute', top: 7, left: 7, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.8)', color: '#3D4A1F', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>
            <Icon name="star" size={9} color="var(--gold)"/> PICK
          </div>
        )}
      </div>
      {/* label + swatches */}
      <div style={{ padding: '9px 11px 11px', background: 'var(--card)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{theme.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.35 }}>{theme.blurb}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {theme.swatches.map((c, i) => (
            <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}/>
          ))}
        </div>
      </div>
    </button>
  );
}

function MiniTexture({ theme }) {
  const v = theme.vars;
  if (theme.texture === 'linen') {
    return <div style={{ position: 'absolute', inset: 0, backgroundImage:
      'repeating-linear-gradient(90deg, rgba(40,61,78,0.06) 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, rgba(40,61,78,0.06) 0 1px, transparent 1px 4px)' }}/>;
  }
  if (theme.texture === 'watercolor') {
    return <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-wash)',
      background: `radial-gradient(50% 60% at 30% 40%, ${v['--t-accent-bg']} 0%, transparent 70%), radial-gradient(50% 60% at 70% 60%, rgba(138,154,107,0.3) 0%, transparent 72%)` }}/>;
  }
  if (theme.texture === 'paper') {
    return <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-grain)', opacity: 0.08, mixBlendMode: 'multiply' }}/>;
  }
  if (theme.texture === 'cotton') {
    return <div style={{ position: 'absolute', inset: 0, filter: 'url(#t-mottle)', opacity: 0.5, mixBlendMode: 'soft-light' }}/>;
  }
  if (theme.texture === 'velvet') {
    return <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'soft-light', opacity: 0.7, backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 3px)' }}/>;
  }
  return null;
}

function ThemePicker({ themeId, setThemeId, eventId, setEventId, siteLayout, setSiteLayout, kitId, setKitId, density, setDensity, textureIntensity, setTextureIntensity, motifsOn, setMotifsOn, voice, setVoice, photosOn, setPhotosOn, palette, setPalette, onGenerate, onShuffle, onOpenDecor, decorActive, onOpenShop }) {
  const active = getTheme(themeId);
  const haveEvents = typeof getEvent !== 'undefined' && eventId;
  const event = haveEvents ? getEvent(eventId) : null;
  const rec = (event && typeof recommendedThemes !== 'undefined') ? recommendedThemes(event) : THEMES.map(t => t.id);
  const orderedThemes = rec.map(id => THEMES.find(t => t.id === id)).filter(Boolean);
  const recTop = new Set(rec.slice(0, 3));

  return (
    <aside style={{
      gridArea: 'right', background: 'var(--card)', borderLeft: '1px solid var(--line-soft)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
        <div className="eyebrow" style={{ color: 'var(--lavender-ink)' }}>SITE LOOK</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '4px 0 2px', fontWeight: 600 }}>Theme packs</h3>
          {onShuffle && <button onClick={onShuffle} title="Shuffle the whole look" className="lift" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}><Icon name="sparkles" size={13}/> Shuffle</button>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>A whole look — texture, palette, type & motifs, tuned to your event.</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {haveEvents && setEventId && <EventSelect event={event} setEventId={setEventId}/>}

        {onGenerate && <GenerateCard onGenerate={onGenerate}/>}

        <div>
          {haveEvents && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 9 }}>
              Recommended for {event.label}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {orderedThemes.map(t => (
              <ThemeThumb key={t.id} theme={t} active={t.id === themeId} recommended={recTop.has(t.id)} onClick={() => setThemeId(t.id)}/>
            ))}
          </div>
        </div>

        {setSiteLayout && <SiteLayoutPick value={siteLayout} setValue={setSiteLayout}/>}

        {setKitId && typeof KITS !== 'undefined' && <KitPick value={kitId} setValue={setKitId}/>}

        {/* Fine tune */}
        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
            Fine-tune · {active.name}
          </div>

          {setVoice && (
            <PickRow label="Voice">
              <Segmented value={voice} setValue={setVoice} options={(typeof VOICES !== 'undefined' ? VOICES : [{id:'classic',label:'Classic'}])}/>
            </PickRow>
          )}

          <PickRow label="Spacing">
            <Segmented value={density} setValue={setDensity} options={[
              { id: 'cozy', label: 'Cozy' }, { id: 'comfortable', label: 'Comfy' }, { id: 'spacious', label: 'Airy' },
            ]}/>
          </PickRow>

          {active.texture !== 'none' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{active.texture === 'linen' ? 'Linen weave' : active.texture === 'watercolor' ? 'Watercolor washes' : active.texture === 'cotton' ? 'Cotton tooth' : active.texture === 'velvet' ? 'Velvet sheen' : 'Paper grain'}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>{textureIntensity <= 0.01 ? 'Off' : textureIntensity < 0.6 ? 'Faint' : textureIntensity < 1.05 ? 'Natural' : textureIntensity < 1.35 ? 'Rich' : 'Bold'}</span>
              </div>
              <Slider value={textureIntensity} setValue={setTextureIntensity} min={0} max={1.5} step={0.05}/>
            </div>
          )}

          {active.motif !== 'none' && (
            <PickRow label="Motifs">
              <Toggle on={motifsOn} set={setMotifsOn}/>
            </PickRow>
          )}

          {setPhotosOn && (
            <PickRow label="Use my photos">
              <Toggle on={photosOn} set={setPhotosOn}/>
            </PickRow>
          )}
        </div>

          <LegibilityNote theme={active} palette={palette} textureIntensity={textureIntensity} setTextureIntensity={setTextureIntensity}/>

        {onOpenShop && (
          <button onClick={onOpenShop} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderRadius: 13, width: '100%', cursor: 'pointer', background: 'var(--ink)', color: 'var(--cream)', border: 'none', textAlign: 'left' }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="sparkles" size={17} color="var(--gold)"/></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>Theme Shop</span>
              <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>60+ premium packs · try live</span>
            </span>
            <Icon name="arrow-up" size={15} color="var(--cream)"/>
          </button>
        )}

        {onOpenDecor && (
          <button onClick={onOpenDecor} className="lift" style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderRadius: 13, width: '100%', cursor: 'pointer',
            background: 'linear-gradient(120deg, var(--lavender-bg), var(--peach-bg))', border: '1px solid var(--line-soft)', textAlign: 'left',
          }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--card)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(61,74,31,0.08)' }}>
              <Icon name="sparkles" size={18} color="var(--lavender-ink)"/>
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Decor Library</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)' }}>Motifs, dividers, patterns &amp; monograms</span>
            </span>
            {decorActive
              ? <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '3px 8px', borderRadius: 999 }}>ON</span>
              : <Icon name="arrow-right" size={15} color="var(--ink-soft)"/>}
          </button>
        )}

        {setPalette && <PaletteFromPhotos palette={palette} setPalette={setPalette}/>}

        <SavedLooks current={{ themeId, kitId, siteLayout, voice, textureIntensity }}
          apply={(lk) => { setThemeId(lk.themeId); setKitId && setKitId(lk.kitId); setSiteLayout && setSiteLayout(lk.siteLayout); setVoice && setVoice(lk.voice); setTextureIntensity(lk.textureIntensity != null ? lk.textureIntensity : 1); }}/>

        <a href="Pearloom Stationery.html" className="lift" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12,
          background: 'var(--ink)', color: 'var(--cream)', textDecoration: 'none',
        }}>
          <Icon name="send" size={16} color="var(--cream)"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Matching Save-the-Date</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Same theme, print-ready card &amp; envelope</div>
          </div>
          <Icon name="arrow-right" size={14} color="var(--cream)"/>
        </a>
      </div>
    </aside>
  );
}

/* ---- legibility ---- */
function _hx(hex) { const m = (hex || '#000').replace('#', ''); const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m; return [parseInt(n.slice(0,2),16)||0, parseInt(n.slice(2,4),16)||0, parseInt(n.slice(4,6),16)||0]; }
function _lum(hex) { const c = _hx(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; }
function contrastRatio(a, b) { const l1 = _lum(a), l2 = _lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }

function LegibilityNote({ theme, palette, textureIntensity, setTextureIntensity }) {
  const ink = (palette && palette['--t-ink']) || theme.vars['--t-ink'];
  const paper = (palette && palette['--t-paper']) || theme.vars['--t-paper'];
  const ratio = contrastRatio(ink, paper);
  const pass = ratio >= 4.5;
  const highTex = textureIntensity > 1.1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: pass ? 'var(--sage-deep)' : '#b4543a' }}>
        <Icon name={pass ? 'check' : 'eye-off'} size={13} color={pass ? 'var(--sage-deep)' : '#b4543a'}/>
        {pass ? `Text contrast AA · ${ratio.toFixed(1)}:1` : `Low contrast · ${ratio.toFixed(1)}:1`}
      </div>
      {highTex && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'color-mix(in oklab, var(--gold) 16%, var(--cream))' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>High texture can reduce legibility</span>
          <button onClick={() => setTextureIntensity(0.7)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', padding: '3px 9px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--line)' }}>Soften</button>
        </div>
      )}
    </div>
  );
}

/* ---- saved looks ---- */
function SavedLooks({ current, apply }) {
  const [looks, setLooks] = useThemeState(() => { try { return JSON.parse(localStorage.getItem('pl-looks') || '[]'); } catch (e) { return []; } });
  const save = () => { const next = [...looks, current].slice(-6); setLooks(next); localStorage.setItem('pl-looks', JSON.stringify(next)); };
  const remove = (i) => { const next = looks.filter((_, j) => j !== i); setLooks(next); localStorage.setItem('pl-looks', JSON.stringify(next)); };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Saved looks</span>
        <button onClick={save} style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="plus" size={11}/> Save current</button>
      </div>
      {looks.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Save a combo you love to revisit it later.</div>
      ) : (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {looks.map((lk, i) => {
            const t = getTheme(lk.themeId);
            return (
              <button key={i} onClick={() => apply(lk)} title={`${t.name} · ${lk.kitId} · ${lk.siteLayout}`} className="lift" style={{ position: 'relative', width: 40, height: 40, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--line)', background: t.vars['--t-paper'] }}>
                <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${t.swatches[3]} 0 50%, ${t.swatches[0]} 50% 100%)` }}/>
                <span onClick={(e) => { e.stopPropagation(); remove(i); }} style={{ position: 'absolute', top: -2, right: -2, width: 15, height: 15, borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', fontSize: 9, display: 'grid', placeItems: 'center', zIndex: 2 }}>×</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Component kit — a coordinated component design language */
function KitPick({ value, setValue }) {  const kits = (typeof KITS !== 'undefined') ? KITS : [];
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 4 }}>Component kit</div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 9 }}>How cards, dividers, schedule & badges are drawn.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {kits.map(k => {
          const on = value === k.id || (!value && k.id === 'classic');
          return (
            <button key={k.id} onClick={() => setValue(k.id)} className="lift" style={{
              textAlign: 'left', padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
              background: on ? 'var(--ink)' : 'var(--card)', border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: on ? 'var(--cream)' : 'var(--ink)' }}>{k.label}</div>
              <div style={{ fontSize: 9.5, lineHeight: 1.3, color: on ? 'rgba(248,241,228,0.72)' : 'var(--ink-muted)', marginTop: 1 }}>{k.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Site-wide layout archetype — restructures the whole page */
function SiteLayoutPick({ value, setValue }) {
  const opts = [
    { id: 'stacked', label: 'Classic', sub: 'Full scroll' },
    { id: 'boxed', label: 'Invitation', sub: 'Card on a mat' },
    { id: 'split', label: 'Split', sub: 'Sidebar lockup' },
  ];
  const Diagram = ({ id, on }) => {
    const c = on ? 'var(--cream)' : 'var(--ink-muted)';
    const bg = on ? 'rgba(248,241,228,0.22)' : 'var(--cream-2)';
    if (id === 'boxed') {
      return (
        <div style={{ height: 38, borderRadius: 5, background: bg, display: 'grid', placeItems: 'center' }}>
          <div style={{ width: '60%', height: '64%', borderRadius: 3, border: `1.5px solid ${c}`, display: 'flex', flexDirection: 'column', gap: 2, padding: 3 }}>
            <div style={{ height: 3, background: c, borderRadius: 1 }}/><div style={{ height: 3, width: '70%', background: c, borderRadius: 1, opacity: 0.6 }}/>
          </div>
        </div>
      );
    }
    if (id === 'split') {
      return (
        <div style={{ height: 38, borderRadius: 5, background: bg, display: 'flex', gap: 3, padding: 5 }}>
          <div style={{ width: '38%', background: c, borderRadius: 2 }}/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}><div style={{ height: 4, background: c, borderRadius: 1, opacity: 0.6 }}/><div style={{ height: 4, background: c, borderRadius: 1, opacity: 0.6 }}/><div style={{ height: 4, width: '60%', background: c, borderRadius: 1, opacity: 0.6 }}/></div>
        </div>
      );
    }
    return (
      <div style={{ height: 38, borderRadius: 5, background: bg, display: 'flex', flexDirection: 'column', gap: 3, padding: 6 }}>
        <div style={{ height: 6, background: c, borderRadius: 1 }}/><div style={{ height: 5, background: c, borderRadius: 1, opacity: 0.6 }}/><div style={{ height: 5, width: '80%', background: c, borderRadius: 1, opacity: 0.6 }}/>
      </div>
    );
  };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 9 }}>Layout · whole-page feel</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {opts.map(o => {
          const on = value === o.id;
          return (
            <button key={o.id} onClick={() => setValue(o.id)} className="lift" style={{
              padding: 6, borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              background: on ? 'var(--ink)' : 'var(--card)', border: on ? '2px solid var(--ink)' : '1px solid var(--line)',
            }}>
              <Diagram id={o.id} on={on}/>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: on ? 'var(--cream)' : 'var(--ink)', marginTop: 6 }}>{o.label}</div>
              <div style={{ fontSize: 9.5, color: on ? 'rgba(248,241,228,0.7)' : 'var(--ink-muted)' }}>{o.sub}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Event type selector — grouped, searchable popover */
function EventSelect({ event, setEventId }) {  const [open, setOpen] = useThemeState(false);
  const [q, setQ] = useThemeState('');
  const cats = (typeof EVENT_CATEGORIES !== 'undefined') ? EVENT_CATEGORIES : [];
  const ql = q.trim().toLowerCase();
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 7 }}>Event type</div>
      <button onClick={() => setOpen(o => !o)} className="lift" style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 11,
        background: 'var(--cream-2)', border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--card)', border: '1px solid var(--line-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={event.icon} size={15} color="var(--ink-soft)"/>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{event.label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{event.category}</div>
        </div>
        <Icon name={open ? 'chev-up' : 'chev-down'} size={14} color="var(--ink-muted)"/>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, maxHeight: 360, overflow: 'auto',
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 8 }}>
          <div style={{ position: 'sticky', top: 0, background: 'var(--card)', paddingBottom: 6 }}>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={13} color="var(--ink-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}/>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 35+ event types…"
                style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 12.5, outline: 'none' }}/>
            </div>
          </div>
          {cats.map(cat => {
            const evs = cat.events.filter(e => !ql || e.label.toLowerCase().includes(ql) || cat.name.toLowerCase().includes(ql));
            if (!evs.length) return null;
            return (
              <div key={cat.name} style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', padding: '4px 8px' }}>{cat.name}</div>
                {evs.map(e => (
                  <button key={e.id} onClick={() => { setEventId(e.id); setOpen(false); setQ(''); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 8, textAlign: 'left',
                    background: e.id === event.id ? 'var(--cream-2)' : 'transparent', cursor: 'pointer',
                  }}>
                    <Icon name={e.icon} size={13} color="var(--ink-soft)"/>
                    <span style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1 }}>{e.label}</span>
                    {e.id === event.id && <Icon name="check" size={12} color="var(--ink)"/>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* "Generate a look from your story" — text → full configuration */
function GenerateCard({ onGenerate }) {
  const [text, setText] = useThemeState('');
  const [busy, setBusy] = useThemeState(false);
  const [result, setResult] = useThemeState(null);
  const examples = ['July wedding in Santorini, olive groves, relaxed', 'Black-tie evening gala, candlelit', 'Tuscan vineyard, lemons, romantic'];

  const run = (q) => {
    const query = q != null ? q : text;
    if (!query.trim()) return;
    if (q != null) setText(q);
    setBusy(true); setResult(null);
    const heuristic = () => { const { config, rationale } = generateFromStory(query); onGenerate(config); setResult(rationale); setBusy(false); };
    // Real AI when available, deterministic fallback otherwise
    if (typeof window !== 'undefined' && window.claude && window.claude.complete) {
      const themeIds = (typeof THEMES !== 'undefined' ? THEMES.map(t => t.id) : []).join(', ');
      const prompt = `You are a wedding-site art director. From this description, choose a configuration. Reply ONLY with JSON: {"themeId": one of [${themeIds}], "voice": one of [classic, playful, poetic], "density": one of [cozy, comfortable, spacious], "intensity": 0.5-1.4, "motifsOn": boolean, "rationale": one short friendly sentence}. Description: "${query}"`;
      window.claude.complete(prompt).then((out) => {
        try {
          const j = JSON.parse(String(out).match(/\{[\s\S]*\}/)[0]);
          const base = generateFromStory(query).config;
          onGenerate({ ...base, themeId: j.themeId || base.themeId, voice: j.voice || base.voice, density: j.density || base.density, intensity: j.intensity || base.intensity, motifsOn: j.motifsOn != null ? j.motifsOn : base.motifsOn });
          setResult(j.rationale || generateFromStory(query).rationale); setBusy(false);
        } catch (e) { heuristic(); }
      }).catch(heuristic);
    } else {
      setTimeout(heuristic, 850);
    }
  };

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(198,112,61,0.28)' }}>
      <div style={{ padding: '11px 13px', background: 'var(--peach-bg)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pear size={22} tone="sage" sparkle shadow={false}/>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)' }}>Generate a look from your story</div>
      </div>
      <div style={{ padding: 13, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          placeholder="e.g. Sunset wedding in Santorini, lots of olive groves, relaxed and warm…"
          style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 12.5, color: 'var(--ink)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45, outline: 'none' }}/>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => run(ex)} style={{ padding: '4px 9px', borderRadius: 999, background: 'var(--cream-2)', border: '1px solid var(--line-soft)', fontSize: 10.5, color: 'var(--ink-soft)', cursor: 'pointer', textAlign: 'left' }}>{ex.split(',')[0]}</button>
          ))}
        </div>
        <button onClick={() => run()} disabled={busy} className="btn btn-primary btn-sm" style={{ justifyContent: 'center', width: '100%', opacity: busy ? 0.7 : 1 }}>
          {busy ? <><span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cream)', display: 'inline-block' }}/> Pear is designing…</> : <><Icon name="sparkles" size={13} color="var(--cream)"/> Design my site</>}
        </button>
        {result && !busy && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 9, background: 'var(--sage-tint)', fontSize: 11.5, color: 'var(--sage-deep)' }}>
            <Icon name="check" size={13} color="var(--sage-deep)" style={{ flexShrink: 0, marginTop: 1 }}/>
            <span><b>Done.</b> {result}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* Palette extracted from an uploaded photo, retinting the active theme */
function PaletteFromPhotos({ palette, setPalette }) {
  const inputRef = useThemeRef(null);
  const [busy, setBusy] = useThemeState(false);
  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const colors = extractColorsFromImage(img, 6);
        const override = paletteFromColors(colors);
        setPalette(override);
        setBusy(false);
      };
      img.onerror = () => setBusy(false);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Match my photos</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.4 }}>Pear pulls the palette from a photo and retints this theme.</div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }}/>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => inputRef.current && inputRef.current.click()} className="btn btn-outline btn-sm" style={{ fontSize: 12 }}>
          <Icon name="image" size={13}/> {busy ? 'Reading…' : 'Upload a photo'}
        </button>
        {palette && palette._swatches && (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {palette._swatches.map((c,i) => <span key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}/>)}
            </div>
            <button onClick={() => setPalette(null)} title="Clear" style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--cream-2)' }}><Icon name="close" size={12} color="var(--ink-soft)"/></button>
          </>
        )}
      </div>
    </div>
  );
}

function PickRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 30 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', maxWidth: 200 }}>{children}</div>
    </div>
  );
}

function Segmented({ value, setValue, options }) {
  return (
    <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--cream-2)', borderRadius: 8, width: '100%' }}>
      {options.map(o => (
        <button key={o.id} onClick={() => setValue(o.id)} style={{
          flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: value === o.id ? 'var(--ink)' : 'transparent',
          color: value === o.id ? 'var(--cream)' : 'var(--ink-soft)',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function Toggle({ on, set }) {
  return (
    <button onClick={() => set(!on)} style={{
      width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sage)' : 'var(--cream-3)', position: 'relative',
    }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'left 160ms ease' }}/>
    </button>
  );
}

function Slider({ value, setValue, min = 0, max = 1, step = 0.05 }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => setValue(parseFloat(e.target.value))}
      style={{
        width: '100%', height: 6, borderRadius: 999, appearance: 'none', WebkitAppearance: 'none',
        background: `linear-gradient(90deg, var(--ink) 0 ${pct}%, var(--cream-3) ${pct}% 100%)`,
        cursor: 'pointer', outline: 'none',
      }}/>
  );
}

/* ---------- export ---------- */
Object.assign(window, {
  THEMES, getTheme, themeStyle, themeRootStyle, ThemeDefs, setDecor, getDecor,
  TextureLayer, WatercolorWash, PatternLayer,
  OliveSprig, WatercolorBloom, Lemon, PressedFlower, Motif,
  SunMotif, WheatMotif, FernMotif, ShellMotif, CitrusMotif, LaurelMotif, DecoFan, PalmMotif,
  TDivider, TButton, TCard, TPhoto, MotifScatter,
  ThemePicker,
});
