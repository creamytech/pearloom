// ─────────────────────────────────────────────────────────────
// Pearloom / lib/qr-engine/themes.ts
//
// Theme presets for the AI-generated QR poster. Each preset
// produces a single 1024×1536 portrait background with a clean
// central area where the real, scannable QR will be composited
// at print time.
//
// Critical constraints baked into every prompt:
//   • DO NOT draw a QR code — leave the centre blank/light so
//     the real one composites cleanly.
//   • Hold a clear 700×700 zone in the centre at ~y = poster-50%.
//   • Output must be print-quality, no JPEG artefacts at edges.
// ─────────────────────────────────────────────────────────────

export type QrThemeId =
  | 'floral-garden'
  | 'art-deco'
  | 'modern-mono'
  | 'watercolor-soft'
  | 'neon-disco'
  | 'pastel-confetti'
  | 'family-vintage'
  | 'editorial-cream'
  | 'noir-mirror'
  | 'tropical-palm';

export interface QrTheme {
  id: QrThemeId;
  label: string;
  blurb: string;
  /** Best-fit occasions for surfacing in the picker. */
  occasions: string[];
  /** Typography colour over the AI background — auto when undefined. */
  textColor?: string;
  /** QR module dark colour. */
  qrDark: string;
  /** QR module light colour (matches the theme's "centre area"). */
  qrLight: string;
  /** The full prompt sent to gpt-image-2. {names} {dateLabel}
   *  {kicker} get interpolated; "do not draw a QR" is mandatory. */
  prompt: string;
}

export const QR_THEMES: QrTheme[] = [
  {
    id: 'floral-garden',
    label: 'Floral garden',
    blurb: 'Lush eucalyptus + cream paper card.',
    occasions: ['wedding', 'engagement', 'bridal-shower', 'baby-shower', 'anniversary'],
    qrDark: '#0E0D0B',
    qrLight: '#FBF7EE',
    prompt: `Editorial wedding poster, A4 portrait composition. Lush watercolor florals — eucalyptus, peony, garden roses, olive branches — wreathing the four corners. The centre HALF of the poster is a clean cream paper card (warm off-white, very subtle paper texture). On the cream card, a 700×700 px square area in the EXACT geometric centre of the poster is left COMPLETELY BLANK and pure cream — no marks, no watermark, no graphics, no QR pattern. Above the blank area, calligraphy script reading "{kicker}". Below the blank area, the names "{names}" in a classic display serif at 70px, and beneath them in smaller italic the date "{dateLabel}". Do NOT draw a QR code or any pixel pattern. Soft natural light from the upper-left, palette: cream, sage green, warm blush, deep olive. Painterly, not photographic.`,
  },
  {
    id: 'art-deco',
    label: 'Art deco',
    blurb: 'Gold geometry + jet black + mirror lines.',
    occasions: ['wedding', 'milestone-birthday', 'engagement', 'anniversary', 'retirement'],
    qrDark: '#1A1410',
    qrLight: '#E9D9A8',
    prompt: `Art deco poster, A4 portrait. Symmetric geometric gold-leaf fan motifs in the four corners, hairline gold lines spanning vertically. Background colour is deep jet black with a subtle warm grain. The exact geometric centre holds a 700×700 px square area filled with a warm GOLD paper card colour (#E9D9A8) — totally smooth, no marks, no QR pattern, leave it pure. Above the gold square, in slim gold sans-serif caps with wide letter-spacing: "{kicker}". Below: "{names}" in tall art deco display serif (gold), and beneath it a single hairline rule + "{dateLabel}" in italic gold. Do NOT draw a QR code. Print-quality, no banding.`,
  },
  {
    id: 'modern-mono',
    label: 'Modern mono',
    blurb: 'Editorial black on cream with one peach accent.',
    occasions: ['wedding', 'engagement', 'milestone-birthday', 'graduation', 'retirement', 'housewarming'],
    qrDark: '#0E0D0B',
    qrLight: '#FBF7EE',
    prompt: `Minimalist editorial poster, A4 portrait. Background is warm cream paper (#FBF7EE) with a faint paper grain. A single thin peach-orange (#C6703D) horizontal line rests at exactly 25% from the top, full width. The centre of the poster holds a 700×700 px BLANK cream square — exactly geometric centre, no marks, no QR, no pattern. Above the blank area: "{kicker}" in tiny black sans-serif uppercase with 0.3em letter-spacing. Below the blank area: a thin peach hairline + "{names}" in classic black serif, then "{dateLabel}" in italic. Tons of negative space. Do NOT draw a QR code. Calm and editorial, no decorative flourishes.`,
  },
  {
    id: 'watercolor-soft',
    label: 'Watercolor soft',
    blurb: 'Dove-grey blooms for memorials + showers.',
    occasions: ['memorial', 'funeral', 'baby-shower', 'sip-and-see', 'first-communion', 'baptism', 'confirmation'],
    qrDark: '#3A3A3A',
    qrLight: '#FBFBFB',
    qrDark2: '#5C4F2E',
    qrLight2: '#FBF7EE',
    textColor: '#3A3A3A',
    prompt: `Soft watercolor poster, A4 portrait. Pale dove-grey background with translucent watercolor blooms — magnolia, baby's breath, soft dusty roses — in the upper-left and lower-right corners. Centre 700×700 px is COMPLETELY BLANK pure soft white (#FBFBFB), no marks, no QR pattern, no watermark. Above the blank: gentle italic calligraphy "{kicker}" in dove grey. Below: serif "{names}" in dove grey at 64px, then "{dateLabel}" in italic. Soft, dignified, not festive. Do NOT draw a QR code.`,
  } as QrTheme & { qrDark2?: string; qrLight2?: string },
  {
    id: 'neon-disco',
    label: 'Neon disco',
    blurb: 'Velvet purple, gold glints, mirror ball.',
    occasions: ['bachelor-party', 'bachelorette-party', 'milestone-birthday', 'sweet-sixteen', 'quinceanera'],
    qrDark: '#FFFFFF',
    qrLight: '#1A0A2A',
    textColor: '#FFD56B',
    prompt: `Late-70s disco poster, A4 portrait. Deep velvet purple-black background. A single chrome mirror disco ball at the top centre with sparkling reflections, and gold star glints scattered. The exact geometric centre holds a 700×700 px square of deep velvet purple-black (#1A0A2A) — totally clean, no QR, no marks, no glints inside. Above the blank: gold neon hand-script "{kicker}". Below: "{names}" in tall gold sans-serif caps with subtle glow, then a row of three gold stars + "{dateLabel}" italic. High-contrast, vibrant, fun. Do NOT draw a QR code.`,
  },
  {
    id: 'pastel-confetti',
    label: 'Pastel confetti',
    blurb: 'Balloons + rainbow streamers + soft pinks.',
    occasions: ['baby-shower', 'first-birthday', 'sweet-sixteen', 'birthday', 'gender-reveal'],
    qrDark: '#7A4E8A',
    qrLight: '#FFF6FA',
    prompt: `Hand-illustrated party poster, A4 portrait. Pastel confetti, soft balloons (mint, blush, butter yellow, lavender) drifting from the top corners. Background is barely-pink (#FFF6FA). The centre 700×700 px is a clean white card with rounded corners — totally smooth, no marks, no QR pattern. Above the white card: hand-drawn balloon-script "{kicker}" in deep plum. Below: "{names}" in playful display serif, then "{dateLabel}" italic. Cheerful, soft, charming. Do NOT draw a QR code. Illustrated style, not photographic.`,
  },
  {
    id: 'family-vintage',
    label: 'Family vintage',
    blurb: 'Kraft paper, rosette stamp, sepia ink.',
    occasions: ['reunion', 'milestone-birthday', 'retirement', 'graduation'],
    qrDark: '#3A2412',
    qrLight: '#F2E5C9',
    prompt: `Vintage kraft-paper poster, A4 portrait. Warm kraft paper background (#F2E5C9) with subtle fibre texture. A central rosette badge stamp at the top in dark sepia. The geometric centre holds a 700×700 px clean kraft-paper area — totally smooth, no marks, no QR. Above: stamped serif caps "{kicker}" in deep sepia. Below: "{names}" in big slab serif, "{dateLabel}" in italic. Two small olive-leaf sprigs in the lower corners. Do NOT draw a QR code. Reads as a vintage tea-shop bulletin.`,
  },
  {
    id: 'editorial-cream',
    label: 'Editorial cream',
    blurb: 'Magazine-style with a single peach rule.',
    occasions: ['wedding', 'anniversary', 'engagement', 'graduation', 'housewarming', 'retirement'],
    qrDark: '#0E0D0B',
    qrLight: '#F5EFE2',
    prompt: `High-end editorial magazine spread, A4 portrait. Warm cream paper (#F5EFE2) with mild grain. Top quarter has a 1px peach-ink (#C6703D) horizontal rule. Bottom quarter has a matching rule. The exact geometric centre holds a 700×700 px clean cream square — no marks, no QR pattern. Above it: classic small caps "{kicker}" in black with wide letter-spacing. Below it: "{names}" in elegant Didone serif (semibold, tight tracking), then italic "{dateLabel}". A single small peach diamond ornament between names and date. No decorative flourishes. Refined and quiet. Do NOT draw a QR code.`,
  },
  {
    id: 'noir-mirror',
    label: 'Noir mirror',
    blurb: 'Inky black with a chrome silver border.',
    occasions: ['bachelor-party', 'milestone-birthday', 'wedding', 'engagement'],
    qrDark: '#FFFFFF',
    qrLight: '#0A0A0A',
    textColor: '#E9D9A8',
    prompt: `Noir poster, A4 portrait. Pure ink-black background. A thin polished-chrome silver border traces the entire perimeter at exactly 30px from the edges. The geometric centre holds a 700×700 px clean ink-black square — totally smooth, no marks, no QR pattern. Above it: thin gold sans-serif uppercase "{kicker}" with wide letter-spacing. Below: "{names}" in tall classic display serif in warm gold (#E9D9A8), then a hairline gold rule + italic "{dateLabel}". Chrome reflections subtle in the four corners. High contrast, sophisticated. Do NOT draw a QR code.`,
  },
  {
    id: 'tropical-palm',
    label: 'Tropical palm',
    blurb: 'Banana leaves + pink sunset for destinations.',
    occasions: ['wedding', 'welcome-party', 'engagement', 'bachelor-party', 'bachelorette-party'],
    qrDark: '#0E0D0B',
    qrLight: '#FFF0E8',
    prompt: `Tropical destination poster, A4 portrait. Lush dark banana-leaf foliage in the upper-left and lower-right corners. A pink-and-coral sunset gradient at the very top. The centre 700×700 px is a clean warm peach paper card (#FFF0E8) — totally smooth, no marks, no QR pattern. Above it: italic palmy script "{kicker}" in dark green. Below: "{names}" in clean serif, then italic "{dateLabel}". Lush, slightly painterly. Do NOT draw a QR code. Print-quality.`,
  },
];

/** Best theme picker for a given occasion. Falls back to floral
 *  garden when nothing matches. */
export function suggestThemesForOccasion(occasion: string | undefined): QrTheme[] {
  if (!occasion) return QR_THEMES;
  const matches = QR_THEMES.filter((t) => t.occasions.includes(occasion));
  return matches.length > 0 ? matches : QR_THEMES;
}

export function getQrTheme(id: QrThemeId | string): QrTheme | undefined {
  return QR_THEMES.find((t) => t.id === id);
}

/** Fill the theme prompt with the host's copy + names + date. */
export function buildQrPosterPrompt(
  theme: QrTheme,
  ctx: { names: string; dateLabel: string; kicker: string },
): string {
  return theme.prompt
    .replaceAll('{names}', ctx.names)
    .replaceAll('{dateLabel}', ctx.dateLabel)
    .replaceAll('{kicker}', ctx.kicker)
    .replace(/\s+/g, ' ')
    .trim();
}
