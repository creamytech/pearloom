/* =========================================================================
   PEARLOOM SITE CONFIG — the "content & generation" layer.
   - COPY: 3 tone-of-voice variants for all prose on the site
   - LAYOUTS: per-section layout variants Pear can swap
   - generateFromStory(): turns a free-text description into a full look
   - palette tools: extract dominant colours from a photo + retint a theme

   Exports (window): VOICES, COPY, LAYOUTS, generateFromStory,
     extractColorsFromImage, paletteFromColors
   ========================================================================= */

/* ---------- TONE OF VOICE ---------- */

const VOICES = [
  { id: 'classic', label: 'Classic' },
  { id: 'playful', label: 'Playful' },
  { id: 'poetic',  label: 'Poetic'  },
];

const COPY = {
  classic: {
    tagline: 'together, at last',
    story: {
      eyebrow: 'OUR STORY', title: 'How we', italic: 'met',
      body: 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.',
      chips: ['Together since 2017', 'Santorini, Greece', 'Aegean blue'],
    },
    details:  { eyebrow: 'GOOD TO KNOW', title: 'The', italic: 'details' },
    schedule: { eyebrow: 'THE DAY · APRIL 26', title: 'Schedule of', italic: 'events' },
    travel:   { eyebrow: 'GETTING THERE', title: 'Where to', italic: 'stay' },
    registry: { eyebrow: 'WITH GRATITUDE', title: 'Your presence is the', italic: 'gift', body: 'Your being there is the truest gift of all. Should you wish to mark the occasion, we have gathered a few thoughtful things.' },
    gallery:  { eyebrow: 'ALONG THE WAY', title: 'A few', italic: 'favourites' },
    faq:      { eyebrow: 'QUESTIONS & ANSWERS', title: 'The little', italic: 'things',
      qs: ['What is the dress code, precisely?', 'May I bring a guest?', 'Are children welcome at the ceremony?', 'Where should we stay in Santorini?'] },
    rsvp:     { eyebrow: 'KINDLY REPLY BY APRIL 28', title: 'Save your', italic: 'seat', sub: 'It takes about ninety seconds. We will gently follow up with anyone who forgets.' },
  },
  playful: {
    tagline: 'finally doing the thing!',
    story: {
      eyebrow: 'HOW IT STARTED', title: 'Two strangers, one', italic: 'pizza fight',
      body: "We met on a random Tuesday and immediately got into it over whether olives belong on pizza (they do). Ten years, several apartments and one very patient dog later — we're throwing a party and you're invited. Come eat, dance, and prove us right about the olives.",
      chips: ['Since 2017', 'Greece, baby', 'Bring your dancing shoes'],
    },
    details:  { eyebrow: 'THE NEED-TO-KNOWS', title: 'Stuff to', italic: 'know' },
    schedule: { eyebrow: 'APRIL 26 · GAME PLAN', title: 'How the day', italic: 'goes' },
    travel:   { eyebrow: 'CRASH NEARBY', title: 'Where to', italic: 'sleep' },
    registry: { eyebrow: 'IF YOU INSIST', title: 'Honestly? Just', italic: 'show up', body: "Seriously, you being there is the whole gift. But if your hands are itching to give something, we put a few fun things together." },
    gallery:  { eyebrow: 'RECEIPTS', title: 'A few', italic: 'good ones' },
    faq:      { eyebrow: 'YOU ASKED', title: 'Quick', italic: 'answers',
      qs: ['So... what do I wear?', 'Can I bring a plus-one?', 'Are kids invited?', 'Where do I crash in Santorini?'] },
    rsvp:     { eyebrow: 'RSVP BY APRIL 28', title: "Are you", italic: 'in?', sub: "Takes like 90 seconds. Pear will nag anyone who ghosts us (lovingly)." },
  },
  poetic: {
    tagline: 'where it was always going',
    story: {
      eyebrow: 'IN OUR WORDS', title: 'How we found our', italic: 'way here',
      body: 'It began quietly — a Tuesday, a small argument, a long walk that refused to end. Years gathered like tide-lines, soft and sure, until the shape of a life appeared between us. We are marrying where the sea meets the white stone, and we would carry no memory more gladly than the one we make with you.',
      chips: ['Since 2017', 'By the Aegean', 'Salt & olive light'],
    },
    details:  { eyebrow: 'SMALL CERTAINTIES', title: 'The', italic: 'particulars' },
    schedule: { eyebrow: 'APRIL 26 · THE HOURS', title: 'The day, in', italic: 'light' },
    travel:   { eyebrow: 'A PLACE TO REST', title: 'Where to', italic: 'stay' },
    registry: { eyebrow: 'IF YOU WISH', title: 'Your presence is the', italic: 'gift', body: 'To have you near is more than enough. If your heart insists on giving, here are a few small ways to share in the days ahead.' },
    gallery:  { eyebrow: 'FRAGMENTS', title: 'A few', italic: 'we keep' },
    faq:      { eyebrow: 'GENTLE ANSWERS', title: 'The little', italic: 'things',
      qs: ['What does one wear?', 'May I bring someone dear?', 'Are little ones welcome?', 'Where might we stay by the sea?'] },
    rsvp:     { eyebrow: 'REPLY BY APRIL 28', title: 'Will you', italic: 'be there?', sub: 'A minute is all it takes. We will hold a place for you by the water.' },
  },
};

/* ---------- LAYOUT VARIANTS (per section) ---------- */

const LAYOUTS = {
  hero:     [{ id: 'centered', label: 'Centered' }, { id: 'split', label: 'Split' }, { id: 'minimal', label: 'Minimal' }, { id: 'fullbleed', label: 'Full-bleed' }, { id: 'typographic', label: 'Typographic' }, { id: 'postcard', label: 'Postcard' }],
  story:    [{ id: 'sidebyside', label: 'Side by side' }, { id: 'stacked', label: 'Stacked' }, { id: 'quote', label: 'Quote-led' }, { id: 'timeline', label: 'Timeline' }, { id: 'zigzag', label: 'Zigzag' }, { id: 'letter', label: 'Letter' }],
  details:  [{ id: 'tiles', label: 'Tiles' }, { id: 'iconrow', label: 'Icon row' }, { id: 'list', label: 'Leader list' }, { id: 'accordion', label: 'Accordion' }, { id: 'bento', label: 'Bento' }],
  schedule: [{ id: 'cards', label: 'Cards' }, { id: 'list', label: 'List' }, { id: 'timeline', label: 'Timeline' }, { id: 'stepper', label: 'Stepper' }, { id: 'numbered', label: 'Numbered' }],
  travel:   [{ id: 'map', label: 'Map + cards' }, { id: 'rows', label: 'Rows' }, { id: 'table', label: 'Comparison' }, { id: 'carousel', label: 'Carousel' }],
  registry: [{ id: 'cards', label: 'Cards' }, { id: 'chips', label: 'Chips' }, { id: 'progress', label: 'Fund hero' }, { id: 'logowall', label: 'Logo wall' }],
  schedule: [{ id: 'cards', label: 'Cards' }, { id: 'list', label: 'List' }],
  gallery:  [{ id: 'grid', label: 'Grid' }, { id: 'mosaic', label: 'Mosaic' }, { id: 'strip', label: 'Filmstrip' }, { id: 'masonry', label: 'Masonry' }, { id: 'slideshow', label: 'Slideshow' }, { id: 'polaroid', label: 'Polaroid wall' }],
  rsvp:     [{ id: 'centered', label: 'Centered' }, { id: 'split', label: 'Split' }, { id: 'banner', label: 'Banner' }, { id: 'minimal', label: 'Minimal' }],
  faq:      [{ id: 'accordion', label: 'Accordion' }, { id: 'twocol', label: 'Two column' }, { id: 'numbered', label: 'Numbered' }, { id: 'cards', label: 'Cards' }],
};

/* ---------- STORY → LOOK GENERATOR ---------- */

function generateFromStory(text) {
  const t = (text || '').toLowerCase();
  const has = (...words) => words.some(w => t.includes(w));

  // EVENT TYPE by keyword
  let eventId = 'wedding', themeStrong = false;
  const evMap = [
    ['celebration-of-life', ['celebration of life']],
    ['funeral', ['funeral', 'memorial', 'passing', 'in memory', 'in loving memory', 'mourning']],
    ['bachelorette', ['bachelorette', 'hen party', 'hen do']],
    ['bachelor', ['bachelor party', 'stag']],
    ['engagement', ['engagement', 'engaged', 'proposal', 'she said yes', 'he said yes']],
    ['vow-renewal', ['vow renewal', 'renew our vows']],
    ['baby-shower', ['baby shower', 'baby is on the way', 'expecting']],
    ['gender-reveal', ['gender reveal']],
    ['bridal-shower', ['bridal shower']],
    ['milestone-birthday', ['30th', '40th', '50th', '60th', '70th', 'milestone birthday', 'turning 30', 'turning 40', 'turning 50']],
    ['sweet-sixteen', ['sweet sixteen', 'sweet 16']],
    ['quinceanera', ['quince', 'quinceañera', 'quinceanera']],
    ['bar-mitzvah', ['mitzvah']],
    ['birthday', ['birthday', 'bday', 'turning']],
    ['graduation', ['graduation', 'grad party', 'commencement', 'class of']],
    ['retirement', ['retirement', 'retiring', 'retire']],
    ['anniversary', ['anniversary']],
    ['reunion', ['reunion']],
    ['housewarming', ['housewarming', 'new place', 'new home', 'moved in']],
    ['nye', ['new year', "new year's", 'nye']],
    ['holiday', ['holiday party', 'christmas party', 'festive']],
    ['conference', ['conference', 'summit']],
    ['product-launch', ['product launch', 'launch event', 'unveiling']],
    ['fundraiser', ['fundraiser', 'gala', 'benefit', 'charity dinner']],
    ['awards', ['awards', 'award night']],
    ['workshop', ['workshop', 'class', 'masterclass']],
    ['corporate', ['corporate', 'company', 'offsite', 'team event', 'work event']],
    ['festival', ['festival']],
    ['sports', ['5k', 'marathon', 'tournament', 'race']],
    ['prom', ['prom', 'school dance', 'homecoming']],
    ['cocktail', ['cocktail party']],
    ['dinner-party', ['dinner party', 'supper club']],
    ['wedding', ['wedding', 'getting married', 'marry', 'our big day', 'nuptials']],
  ];
  for (const [id, words] of evMap) { if (has(...words)) { eventId = id; break; } }

  // THEME by place / material / season
  let themeId = null, why = '';
  if (has('santorini', 'greece', 'greek', 'aegean', 'cyclad', 'mykonos', 'linen', 'olive', 'mediterran'))      { themeId = 'santorini'; why = 'Greece + linen → Santorini Linen'; themeStrong = true; }
  else if (has('tuscan', 'tuscany', 'italy', 'italian', 'vineyard', 'lemon', 'watercolor', 'watercolour', 'terracotta')) { themeId = 'tuscan'; why = 'Italy + watercolor → Tuscan Watercolor'; themeStrong = true; }
  else if (has('coast', 'beach', 'ocean', 'sea', 'nautical', 'cape', 'sail', 'harbor', 'harbour', 'maine', 'newport')) { themeId = 'coastal'; why = 'seaside → Coastal Ink'; themeStrong = true; }
  else if (has('evening', 'night', 'black tie', 'candle', 'velvet', 'glamour', 'glam'))                          { themeId = 'midnight'; why = 'evening + formal → Midnight Velvet'; themeStrong = true; }
  else if (has('modern', 'minimal', 'editorial', 'city', 'urban', 'industrial', 'loft', 'clean'))                 { themeId = 'editorial'; why = 'modern + city → Modern Editorial'; themeStrong = true; }
  else if (has('garden', 'wildflower', 'meadow', 'barn', 'rustic', 'spring', 'field', 'farm'))                    { themeId = 'garden'; why = 'garden + wildflowers → Pressed Garden'; themeStrong = true; }

  // If no explicit material/place, let the EVENT's mood choose the theme
  let evName = eventId;
  if (typeof getEvent !== 'undefined') {
    const ev = getEvent(eventId);
    evName = ev.label.toLowerCase();
    if (!themeStrong && typeof recommendedThemes !== 'undefined') {
      themeId = recommendedThemes(ev)[0];
      why = `${ev.label} → ${getTheme ? getTheme(themeId).name : themeId}`;
    }
  }
  if (!themeId) themeId = 'garden';
  const ev = (typeof getEvent !== 'undefined') ? getEvent(eventId) : null;
  const somber = ev && ev.mood === 'somber';

  // VOICE by tone words (somber events stay classic)
  let voice = 'classic';
  if (!somber && has('fun', 'playful', 'casual', 'party', 'laid-back', 'laid back', 'relaxed', 'lively', 'silly'))  voice = 'playful';
  else if (!somber && has('romantic', 'poetic', 'dreamy', 'intimate', 'soulful', 'lyrical', 'tender'))              voice = 'poetic';

  // DENSITY
  let density = 'comfortable';
  if (has('minimal', 'airy', 'spacious', 'clean', 'modern')) density = 'spacious';
  else if (has('cozy', 'cosy', 'intimate', 'small', 'tight')) density = 'cozy';

  // TEXTURE INTENSITY
  let intensity = 1;
  if (has('subtle', 'understated', 'restrained', 'minimal')) intensity = 0.5;
  else if (has('rich', 'textured', 'tactile', 'bold', 'lush')) intensity = 1.4;

  const motifsOn = themeId !== 'editorial' && !somber && !has('no motif', 'clean', 'minimal');

  const rationale = `${evName ? evName.charAt(0).toUpperCase() + evName.slice(1) + ' · ' : ''}${why}.`;

  const d = (ev && typeof eventDefaults !== 'undefined') ? eventDefaults(ev) : {};
  return { config: { eventId, themeId, voice, density, intensity, motifsOn, kitId: d.kitId, siteLayout: d.siteLayout }, rationale };
}

/* ---------- COLOUR UTILITIES ---------- */

function _hexToRgb(hex) {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
function _rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function _rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}
function _hslToHex(h, s, l) {
  h /= 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return _rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/* Downscale an image to a small canvas and bucket-quantize to dominant colours. */
function extractColorsFromImage(img, count = 6) {
  const W = 48, H = 48;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);
  let data;
  try { data = ctx.getImageData(0, 0, W, H).data; } catch (e) { return []; }
  const buckets = {};
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]; if (a < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, l] = _rgbToHsl(r, g, b);
    if (l > 0.94 || l < 0.06) continue;              // skip near-white/black
    const key = `${Math.round(r / 28)}-${Math.round(g / 28)}-${Math.round(b / 28)}`;
    if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0, s: 0 };
    const k = buckets[key]; k.r += r; k.g += g; k.b += b; k.n++; k.s += s;
  }
  const arr = Object.values(buckets)
    .map(k => ({ hex: _rgbToHex(k.r / k.n, k.g / k.n, k.b / k.n), n: k.n, sat: k.s / k.n }))
    .sort((a, b) => (b.n * (0.4 + b.sat)) - (a.n * (0.4 + a.sat)));
  return arr.slice(0, count).map(x => x.hex);
}

/* Build a theme-var override from extracted colours: accent family + gold,
   keeping the theme's own paper/ink so text stays legible. */
function paletteFromColors(colors) {
  if (!colors || !colors.length) return null;
  const ranked = colors.map(hex => { const [h, s, l] = _rgbToHsl(..._hexToRgb(hex)); return { hex, h, s, l }; });
  // accent = most saturated mid-tone
  const sorted = [...ranked].sort((a, b) => (b.s - Math.abs(b.l - 0.5)) - (a.s - Math.abs(a.l - 0.5)));
  const acc = sorted[0];
  // a warm one for gold, else derive
  const warm = ranked.find(c => c.h < 60 || c.h > 330) || acc;
  const accentHex   = _hslToHex(acc.h, Math.min(0.6, Math.max(0.28, acc.s)), Math.min(0.5, Math.max(0.34, acc.l)));
  const accent2Hex  = _hslToHex(acc.h, Math.min(0.5, acc.s * 0.8), Math.min(0.66, acc.l + 0.16));
  const accentBgHex = _hslToHex(acc.h, Math.min(0.4, acc.s * 0.55), 0.9);
  const accentInkHex= _hslToHex(acc.h, Math.min(0.7, acc.s + 0.1), Math.max(0.26, acc.l - 0.14));
  const goldHex     = _hslToHex(warm.h, Math.min(0.55, Math.max(0.3, warm.s)), 0.52);
  return {
    '--t-accent': accentHex, '--t-accent-2': accent2Hex,
    '--t-accent-bg': accentBgHex, '--t-accent-ink': accentInkHex, '--t-gold': goldHex,
    _swatches: [accentHex, accent2Hex, goldHex, accentBgHex],
  };
}

Object.assign(window, { VOICES, COPY, LAYOUTS, generateFromStory, extractColorsFromImage, paletteFromColors });
