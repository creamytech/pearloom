// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Pearloom / lib/vibe-engine/generator.ts
// Gemini-powered skin generation: extractCoupleProfile, generateVibeSkin, generateSiteArt.
// ——————————————————————————————————————————————————————————————————————————————————————————————————

import type { VibeSkin, CoupleProfile, VibeSkinContext, SiteArtResult } from './types';
import { WAVE_PATHS, CORNER_STYLES, extractSvgFromField, isValidSvg, buildFallbackArt } from './svg-library';
import { deriveFallback } from './fallback';

// ── Dev-only logging helpers ─────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log.bind(console) : () => {};
const logWarn = isDev ? console.warn.bind(console) : () => {};

// Pass 2 (VibeSkin + custom SVG art) uses Gemini 3.1 Pro — SVG precision + visual creativity
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';
// Couple DNA extraction uses Flash-Lite — lightweight extraction task
const GEMINI_LITE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';


// — Extract couple DNA from vibeString + chapters ——————————————————————————————————————————————————
export async function extractCoupleProfile(
  vibeString: string,
  chapters: Array<{ title: string; description: string; mood: string }>,
  apiKey: string,
  occasion?: string,
  clusterNotes?: Array<{ note: string; location: string | null }>
): Promise<CoupleProfile> {
  const storyText = chapters.map(c => `"${c.title}": ${c.description}`).join('\n');
  const notesText = clusterNotes && clusterNotes.length > 0
    ? '\n\nUSER PHOTO NOTES (personal details the user added — highest priority for extraction):\n' +
      clusterNotes.map((cn, i) => `- ${cn.location ? `[${cn.location}] ` : ''}${cn.note}`).join('\n')
    : '';

  const occasionDNAHints: Record<string, string> = {
    wedding: `Also extract: ceremony location, proposal location if mentioned, honeymoon destination if mentioned.`,
    anniversary: `Also extract: the number of years together, how long they've been married, any mentioned milestones, places they've lived or traveled together over the years.`,
    birthday: `Also extract: the birthday person's name, their age, their passions/hobbies, any mentioned life achievements or milestones.`,
    engagement: `Also extract: proposal location, how the proposal happened, ring description if mentioned, how long they dated before engagement.`,
    story: `Extract all personal places, interests, pets, and defining moments from their life together.`,
  };
  const dnaHint = occasionDNAHints[occasion || 'wedding'] || occasionDNAHints.wedding;

  const prompt = `Given this couple's vibe and story, extract their unique personal elements as JSON.

VIBE:
${vibeString}

STORY CHAPTERS:
${storyText}${notesText}

OCCASION-SPECIFIC EXTRACTION NOTES: ${dnaHint}

Return ONLY this JSON (no extra text, no markdown):
{
  "pets": [],
  "interests": [],
  "locations": [],
  "motifs": [],
  "heritage": [],
  "illustrationPrompt": "1-2 sentences describing what to draw to represent this couple's world. Be specific and visual. E.g.: 'Two cats (one orange tabby, one black) intertwined with vinyl records and coffee cups, surrounded by Brooklyn cityscape silhouettes.' or 'Hiking trails winding through mountain peaks with pine trees and star constellations above, a dog's paw print trail below.'"
}

Rules:
- pets: include animal type, quantity, and names if mentioned. Empty array if none.
- interests: max 5 most visually representable hobbies/interests
- locations: specific named places only (not generic "a coffee shop")
- motifs: recurring objects, themes, or symbols that could be illustrated
- heritage: cultural backgrounds if clearly mentioned, else empty
- illustrationPrompt: make it visually specific, richly detailed, and drawable as SVG lineart`;

  const emptyProfile: CoupleProfile = { pets: [], interests: [], locations: [], motifs: [], heritage: [], illustrationPrompt: '' };

  async function attemptExtraction(attemptPrompt: string): Promise<CoupleProfile | null> {
    try {
      const res = await fetch(
        `${GEMINI_LITE_URL}?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: attemptPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned) as CoupleProfile;
    } catch {
      return null;
    }
  }

  // First attempt with full prompt
  let profile = await attemptExtraction(prompt);

  // Retry once with a simplified prompt if the first attempt failed
  if (!profile) {
    logWarn('[VibeEngine] Couple profile extraction failed — retrying with simplified prompt');
    const simplePrompt = `Extract personal elements from this vibe description as JSON.

VIBE: ${vibeString}

Return ONLY this JSON:
{"pets":[],"interests":[],"locations":[],"motifs":[],"heritage":[],"illustrationPrompt":"1-2 sentences describing what to draw to represent this person/couple's world. Be specific and visual."}`;
    profile = await attemptExtraction(simplePrompt);
  }

  if (!profile) {
    logWarn('[VibeEngine] Couple profile extraction failed on both attempts');
    // Build a fallback illustrationPrompt from vibeString keywords
    const fallbackPrompt = buildFallbackIllustrationPrompt(vibeString);
    return { ...emptyProfile, illustrationPrompt: fallbackPrompt };
  }

  // If the API succeeded but returned an empty illustrationPrompt, generate one from vibeString
  if (!profile.illustrationPrompt) {
    profile.illustrationPrompt = buildFallbackIllustrationPrompt(vibeString);
  }

  return profile;
}

/**
 * Builds a basic illustration prompt from vibeString keywords when API extraction fails.
 * Extracts meaningful nouns/themes to produce at least some content-specific art direction.
 */
function buildFallbackIllustrationPrompt(vibeString: string): string {
  if (!vibeString || vibeString.trim().length === 0) return '';

  // Extract meaningful words (3+ chars, skip common filler words)
  const skipWords = new Set([
    'the', 'and', 'for', 'with', 'our', 'this', 'that', 'from', 'have', 'has',
    'but', 'not', 'are', 'was', 'were', 'been', 'being', 'very', 'really',
    'just', 'more', 'some', 'than', 'them', 'they', 'will', 'would', 'could',
    'should', 'about', 'into', 'also', 'like', 'love', 'want', 'make',
  ]);

  const words = vibeString
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !skipWords.has(w));

  const unique = [...new Set(words)].slice(0, 8);
  if (unique.length === 0) return '';

  return `Illustration featuring: ${unique.join(', ')}. Artistic interpretation of these themes and motifs in a cohesive visual composition.`;
}

export async function generateVibeSkin(
  vibeString: string,
  apiKey?: string,
  coupleNames?: [string, string],
  context?: VibeSkinContext,
  occasion?: string
): Promise<VibeSkin> {
  if (!apiKey) return deriveFallback(vibeString);

  // Extract occasion-specific numeric details from the vibe string
  const anniversaryMatch = vibeString.match(/ANNIVERSARY:\s*(\d+)\s*years/i);
  const anniversaryYears = anniversaryMatch ? parseInt(anniversaryMatch[1], 10) : 0;
  const birthdayMatch = vibeString.match(/BIRTHDAY:.*?(\d+)(?:th|st|nd|rd)?\s*birthday/i);
  const birthdayAge = birthdayMatch ? birthdayMatch[1] : '';

  const occasionVisualGuidance: Record<string, string> = {
    wedding: `OCCASION: Wedding.
    SYMBOLIC MOTIFS to consider: rings, florals, vows, unity candles, champagne,
    doves, infinity symbols, intertwined initials, wedding arches, veils.
    PARTICLE suggestions: petals, confetti, bubbles, fireflies.
    COLOR DIRECTION: romantic, aspirational — pinks/creams/golds/whites for classic;
    deep jewel tones for dramatic; sage/terracotta for bohemian.
    TONE: Should feel timeless, romantic, celebratory but not garish.`,

    anniversary: `OCCASION: Anniversary celebration (${anniversaryYears ? `${anniversaryYears} years together` : 'milestone year'}).
    SYMBOLIC MOTIFS to consider: intertwined circles/rings, spirals (representing years),
    infinity symbols, the number of years (e.g. "${anniversaryYears || '?'}"), pressed flowers,
    a tree with deep roots, wine glasses, candle flames.
    ${anniversaryYears >= 25 ? 'MILESTONE: This is a major anniversary. Use richer, more luxurious visual language — gold, deep jewel tones, something that feels earned and magnificent.' : ''}
    PARTICLE suggestions: fireflies, sakura, stars (feel contemplative, warm).
    COLOR DIRECTION: warmer and richer than a first-wedding — deeper, more mature palette.
    More amber, cognac, deep rose, forest green. Less pastel.
    TONE: Nostalgic warmth, depth, the beauty of time passing.`,

    birthday: `OCCASION: Birthday celebration${birthdayAge ? ` — turning ${birthdayAge}` : ''}.
    SYMBOLIC MOTIFS to consider: stars, candles, balloons (tasteful), confetti,
    champagne, flowers, ribbon, the number ${birthdayAge || ''},
    gifts/bows (elegant version), sparklers, fireworks.
    ${birthdayAge && [30,40,50,60,70,80].includes(parseInt(birthdayAge)) ? `MILESTONE: This is a ${birthdayAge}th birthday! Make it feel BIG and celebratory. Bold, vibrant, joyful.` : ''}
    PARTICLE suggestions: confetti, stars, sparkles, bubbles.
    COLOR DIRECTION: Joyful and celebratory. Can be more vibrant than a wedding.
    Think champagne gold, coral, jewel tones, or the person's favourite colors from the vibe.
    TONE: Joyful, warm, celebratory, uplifting. This should make someone smile immediately.`,

    engagement: `OCCASION: Engagement announcement / celebration.
    SYMBOLIC MOTIFS to consider: rings (especially solitaire/oval/round shapes),
    diamonds, sparkle/light refractions, champagne, roses,
    "YES", hearts (tasteful), keys, locks, doors opening.
    PARTICLE suggestions: stars, sparkles, petals — feel electric and magical.
    COLOR DIRECTION: Fresh and bright with romantic undertones.
    Blush, rose gold, champagne, white, or electric jewel tones (sapphire, emerald).
    TONE: Electric excitement, romantic electricity, the thrill of "what's next".
    Should feel like the best news ever just happened.`,

    story: `OCCASION: Personal love story / memory site (no specific event).
    SYMBOLIC MOTIFS: Drawn entirely from the couple's story and photos.
    No event-specific symbols. Focus on personal motifs from their DNA (pets, places, interests).
    PARTICLE suggestions: leaves, petals, fireflies, stars — soft and personal.
    COLOR DIRECTION: Entirely emotion and photo-driven. Let the vibe string guide.
    TONE: Intimate, literary, personal. This is a private world.`,
  };

  const visualGuidance = occasionVisualGuidance[occasion || 'wedding'] || occasionVisualGuidance.wedding;

  const namesContext = coupleNames
    ? `The couple is ${coupleNames[0]} & ${coupleNames[1]}.`
    : '';

  const storyContext = context?.chapters?.length
    ? `
STORY CONTEXT (use this to deeply inform the visual identity):
The couple's story has these chapters:
${context.chapters.map(c => `- "${c.title}" — ${c.mood} mood, ${c.location?.label || 'no specific location'}: ${c.description}`).join('\n')}

Key moods detected: ${[...new Set(context.chapters.map(c => c.mood))].join(', ')}
Key locations: ${[...new Set(context.chapters.map(c => c.location?.label).filter(Boolean))].join(', ') || 'not specified'}
`
    : '';

  const profile = context?.coupleProfile;
  const coupleProfileContext = profile ? `
## COUPLE DNA — MANDATORY ILLUSTRATION BRIEF
${profile.pets.length ? `PETS: ${profile.pets.join(', ')}` : ''}
${profile.interests.length ? `INTERESTS: ${profile.interests.join(', ')}` : ''}
${profile.locations.length ? `KEY PLACES: ${profile.locations.join(', ')}` : ''}
${profile.motifs.length ? `VISUAL MOTIFS: ${profile.motifs.join(', ')}` : ''}
${profile.heritage.length ? `CULTURAL HERITAGE: ${profile.heritage.join(', ')}` : ''}
ILLUSTRATION PROMPT: ${profile.illustrationPrompt}

KEY MOTIFS: ${[...profile.pets, ...profile.interests, ...profile.motifs].filter(Boolean).join(', ') || 'see illustration prompt above'}
The hero illustration MUST reference these elements. If they have cats, draw cats. If Coco/marigold inspiration, draw marigolds and papel picado. If pets are mentioned, those animals must appear prominently.

SVG ART RULES — READ CAREFULLY:
- heroBlobSvg: Draw "${profile.illustrationPrompt}". Use this as the LITERAL subject matter. If they have cats, draw actual cat silhouettes in elegant poses. If they love hiking, draw mountain peaks and winding trails. If they mention vinyl records, draw record discs with musical notes. Fill 70%+ of the 500×700 canvas with THESE SPECIFIC ELEMENTS.
- heroPatternSvg: Use their world as the repeating element. Cats → small paw prints and whisker curves. Music → staff lines and notes. Hiking → tiny mountain peaks. Coffee → coffee cup outlines. Heritage-inspired → cultural patterns.
- chapterIcons: Generate one small SVG icon (80×80) per chapter that visually represents THAT CHAPTER's content. A chapter about "meeting at a coffee shop" gets a coffee cup. A chapter about "our first hike" gets a mountain peak. An anniversary chapter gets intertwined rings. Make each icon feel hand-crafted and specific.
` : '';

  const chapterIconsPrompt = context?.chapters?.length
    ? `  "chapterIcons": [${context.chapters.map(c =>
        `"<FULL SVG for chapter '${c.title}': Simple, elegant line-art icon 80×80 that represents '${c.description.slice(0, 80)}...'. 1-3 thematic elements. stroke only, no fill. Use accent color. viewBox='0 0 80 80'. Complete <svg>...</svg> on one line.>"`
      ).join(', ')}],`
    : '  "chapterIcons": [],';

  const inspirationDirective = context?.inspirationUrls?.length
    ? `🚨 CRITICAL VISUAL DIRECTIVE — READ THIS FIRST:
The couple has provided ${context.inspirationUrls.length} inspiration image(s). These images ARE THE DESIGN.
You MUST extract the EXACT colors from these images and use them as the palette.
DO NOT use generic wedding colors. DO NOT use ivory/beige/sage defaults.
Extract the 5-6 most dominant/vibrant colors from these images and use them directly.
If the images show: hot pink → palette.accent = that exact hot pink.
If the images show: marigold gold → palette.accent2 = that exact marigold.
If the images show: deep navy → palette.ink = that exact navy.
This is NON-NEGOTIABLE. The inspiration images override everything else.

`
    : '';

  const prompt = `${inspirationDirective}You are a world-class wedding visual designer AND SVG artist for Pearloom, a premium wedding website platform.
${namesContext}
The couple's vibe is: "${vibeString}"

## OCCASION VISUAL DIRECTION — READ BEFORE DESIGNING
${visualGuidance}

${storyContext}
${coupleProfileContext}
Your job: design a COMPLETELY UNIQUE visual identity for this specific couple. Every SVG illustration should reflect THEIR actual world — their pets, interests, places, and story. No two sites should ever look the same.

## MANDATORY COLOR RULE — READ FIRST
If the vibe string contains "Color inspiration:" with hex values (e.g. "#E84393, #F8C000"), those are the couple's CHOSEN colors. You MUST build the palette from those exact hex values. Do NOT substitute muted or desaturated alternatives. If the inspiration images show vibrant colors, use them vibrantly. The couple's explicit choice OVERRIDES everything below.

## COLOR RULES
- If inspiration images are provided, use THEIR exact colors — vibrant, saturated, bold if that's what they show.
- A Coco/Day of the Dead inspired site should use: hot pink #E84393, marigold #F8C000, deep navy #1A1A5E, warm gold #F5A623.
- A festival/fiesta inspired site should be COLORFUL not beige.
- Only default to muted/elegant if NO inspiration images are provided and the vibe string uses soft/minimal language.
- If vibeString has vibrant/festive/colorful/bold keywords OR bright hex colors: use FULL SATURATION. Embrace it.
- If vibeString has words like minimal/clean/subtle/soft (and no inspiration images): prefer desaturated tones.
- Analogous color schemes work well, but analogous doesn't mean dull.
- When in doubt: trust the hex colors and inspiration images over generic defaults.

## TONE-TO-PALETTE MAPPING
Read the actual emotional tone words in the vibe and derive the palette from them:
- "dreamy moonlight celestial" → cool silvers, deep navy (#0d1b2a), soft lavender (#c8c0d8), foreground: #e8e4f0
- "garden botanical greenery" → sage greens (#5a7a5a), warm cream (#f5f0e8), terracotta (#c4714a), bg: #eef2eb
- "rustic vineyard tuscany" → warm terracotta (#b5633a), dusty rose (#d4a086), aged gold (#c4a24a), bg: #f4ede6
- "beach coastal waves" → sea glass teal (#4a9b8e), sandy beige (#f0e8d8), driftwood gray (#8a8278), bg: #eef4f2
- "modern minimalist clean" → warm off-white (#f2ede6), charcoal (#1a1a1a), single accent (your choice), bg: #f5f0e8
- "whimsical fairytale enchanted" → dusty rose (#c48090), forest green (#4a6a4a), antique gold (#b89a4a), bg: #f5ece8
- "dark romantic gothic" → deep burgundy (#6a1a2a), black (#0d0d0d), silver (#b0b0b8), bg: #1a1014
- "art deco roaring twenties" → black (#0d0d0d), gold (#c4a438), cream (#f5f0e0), bg: #0d0d0d
- "wildflower meadow boho" → lavender (#9a84b4), sage (#7a9a6a), terracotta (#b4724a), cream (#f5f0e4), bg: #f0ece4
- "japanese zen cherry" → blush (#e8bcc0), white (#f5f2f0), charcoal (#2a2828), bamboo green (#6a8a68), bg: #f8f4f2
- "vibrant festival fiesta colorful bold celebration" → hot pink (#E84393), golden yellow (#F8C000), deep orange (#F5841F), deep navy (#2A2690), bg: #FFF5F8
- "tropical neon pop maximalist" → electric teal (#00C9B1), hot pink (#FF4D8D), deep violet (#3D0066), lime (#B8F400), bg: #0A0A1A
- "warm festive mexican boho colorful" → terracotta (#C45C1A), magenta (#D4225A), golden (#F5A800), cobalt (#1A3A8F), bg: #FFF8F0

## SECTION LABEL GUIDANCE — OCCASION-AWARE (CRITICAL)
Avoid generic defaults. Labels MUST match the occasion:
${occasion === 'birthday' ? `This is a BIRTHDAY site. NEVER use couple language ("Our", "We", "How We Fell"). Use:
- story: "About [Name]" / "Their Story" / "The Legend" / "Who They Are"
- events: "The Party" / "The Celebration" / "Join the Fun"
- registry: "Wish List" / "Gift Ideas" / "Surprise Them"
- rsvp: "Can You Make It?" / "Join the Celebration" / "Be There"` :
occasion === 'anniversary' ? `This is an ANNIVERSARY site. Use reflective, nostalgic language:
- story: "Our Journey" / "Through the Years" / "How It All Began"
- events: "The Anniversary" / "Celebrating Us" / "The Occasion"` :
`Use personality-driven labels that match the couple's vibe:
- story: "How We Fell" / "The Chapter" / "Our Beginning"
- events: "The Celebration" / "Join Us" / "The Day"`}
- travel: "Finding Us" / "Getting There" / "The Journey Here"
- faqs: "What to Know" / "Your Questions" / "Need to Know"
- rsvp: "Will You Be There?" / "Save a Seat" / "RSVP With Love"

## FONT PAIRINGS (choose one that matches the aesthetic)
- Classic romantic: Cormorant Garamond + Raleway
- Modern minimal: DM Serif Display + DM Sans
- Art Nouveau: Playfair Display + Josefin Sans
- Rustic: Abril Fatface + Nunito
- Japanese-inspired: Noto Serif JP + Noto Sans JP
- Coastal: Libre Baskerville + Karla
- Celestial: Cinzel + Lato
- Bohemian: Crimson Text + Cabin
- Vintage: Rokkitt + Source Sans Pro
- Modern luxury: Bodoni Moda + Inter
- Handcrafted: Satisfy + Open Sans
- Garden: Fraunces + Mulish
- Editorial: EB Garamond + Outfit
- Architectural: Tenor Sans + Source Sans 3

Return ONLY this JSON. All SVG strings must be valid JSON-escaped strings:
{
  "curve": "<one of: organic | arch | geometric | wave | petal | cascade | ribbon | mountain>",
  "particle": "<one of: petals | stars | bubbles | leaves | confetti | snowflakes | fireflies | sakura>",
  "accentShape": "<one of: ring | arch | diamond | leaf | infinity>",
  "sectionEntrance": "<one of: fade-up | bloom | drift | float | reveal>",
  "texture": "<one of: none | linen | floral | marble | bokeh | starfield | paper>",
  "headingStyle": "<one of: italic-serif | uppercase-tracked | thin-elegant | bold-editorial | script-like>",
  "cardStyle": "<one of: glass | solid | outlined | minimal | elevated>",
  "decorIcons": ["<5 creative unicode chars specific to this couple's world>"],
  "accentSymbol": "<single elegant unicode symbol — their primary visual motif>",
  "particleColor": "<hex color for ambient particles>",
  "sectionGradient": "<CSS linear-gradient using 2-3 palette colors — e.g. 'linear-gradient(135deg, #f5ede4 0%, #fdf9f5 60%, #ede8e0 100%)'>",
  "palette": {
    "background": "<primary page bg hex — NEVER plain white. Derive from tone mapping above>",
    "foreground": "<text color hex — must contrast strongly with background>",
    "accent": "<primary accent hex — bold, vibrant, emotionally tied to their vibe>",
    "accent2": "<secondary accent hex — softer complementary tone>",
    "card": "<card/section bg hex — slightly different from page bg for depth>",
    "muted": "<muted text hex for captions/timestamps>",
    "highlight": "<hover/selected states — a contrasting, emotionally charged color>",
    "subtle": "<very light tint, barely different from bg, for section alternation>",
    "ink": "<darkest possible tone for headings and max-contrast text — near-black>"
  },
  "fonts": {
    "heading": "<Google Fonts heading font name — use the FONT PAIRINGS list above to match the vibe>",
    "body": "<Google Fonts body font name — the matching pair>"
  },
  "sectionLabels": {
    "story": "<personality-driven label from SECTION LABEL GUIDANCE above>",
    "events": "<label>",
    "registry": "<label>",
    "travel": "<label>",
    "faqs": "<label>",
    "rsvp": "<warm personal RSVP invitation in the couple's voice>",
    "photos": "<label for the photos section, e.g. 'Our Moments' or 'Our Photos'>"
  },
  "dividerQuote": "<Write a single original poetic phrase (6-10 words MAXIMUM) that is short, lyrical, and emotionally specific to this couple. Evoke their vibe — a place, a feeling, a moment. Think of it as a whispered caption, not a full sentence. NOT a cliche. Examples of good length: 'Where the sea met us first', 'Fog-laced mornings and tangled roots', 'Every city led back to you'>",
  "tone": "<one of: dreamy | playful | luxurious | wild | intimate | cosmic | rustic>",
  "heroPatternSvg": "<FULL SVG: subtle repeating bg pattern. viewBox='0 0 200 200'. 8-12 thematic elements. All opacities 0.06-0.15. Use the accent color. Complete <svg>...</svg> on one line.>",
  "sectionBorderSvg": "<FULL SVG: ornamental border strip. viewBox='0 0 800 40'. MUST be personalized to the couple's interests from the COUPLE DNA above — if they love cats, weave paw prints into the border. If botanical, use leaves and vines. If coastal, use waves and shells. If they love music, use musical notes. Match the vibe. Complete <svg>...</svg> on one line.>",
  "cornerFlourishSvg": "<FULL SVG: LARGE decorative corner illustration. viewBox='0 0 300 300'. This is THE premium personalized decoration — think Zola-style floral corners but themed to THIS couple. Draw a rich, detailed corner piece: if botanical vibe, lush flowers and leaves cascading from the corner. If they love cats, elegant cat silhouettes with vine-like tails. If they're sports fans, subtle sport motifs woven into organic shapes. If they love travel, compass roses and map elements. Use 15-25 elements. All in the accent color at opacity 0.15-0.35. The design should fill the corner triangle from (0,0) to roughly (250,0) and (0,250). Complete <svg>...</svg> on one line.>",
  "medallionSvg": "<FULL SVG: circular ornament for section headers. viewBox='0 0 120 120'. Complete <svg>...</svg> on one line.>",
  "heroBlobSvg": "<FULL SVG: viewBox='0 0 500 700'. THIS MUST ILLUSTRATE THE COUPLE'S ACTUAL WORLD. If they have cats: draw 4-6 elegant cat silhouettes in different poses scattered throughout. If they love hiking: draw mountain peaks, trails, pine trees. If they mention vinyl: draw record discs, musical notes, a turntable. If they mention a city: draw that city's skyline. Use the illustrationPrompt above as your exact brief. 20-30 elements. Fill 70%+ of canvas. Use ONLY accent color. Opacity 0.12-0.25. Complete <svg>...</svg> on one line.>",
  "accentBlobSvg": "<FULL SVG: organic decorative shape for section backgrounds. viewBox='0 0 600 400'. One large irregular polygon blob fill (opacity 0.07) PLUS concentric rings (stroke, opacity 0.08-0.14) and 6 radial accent dots (opacity 0.20). Used layered behind section content. Complete <svg>...</svg> on one line.>",
  "sectionBlobPath": "<SVG path string ONLY — no svg tags. Organic full-width top edge for section containers. ViewBox coords 0 0 1440 500. Match the 'curve' choice: cascade=multi-cascade beziers, ribbon=wide sinusoid, mountain=sharp peaks, organic=flowing beziers, arch=smooth arcs, wave=rhythmic waves, petal=petal scallops, geometric=sharp zigzag.>",
  "chapterColors": ["<hex tint per chapter — e.g. beach chapter → '#E8F4F8', golden hour → '#FDF0E0', forest → '#EAF2E8', night → '#1A1A2E'. One entry per chapter. These are applied as very subtle (3-5% opacity) background washes on each story section.>"],
  ${chapterIconsPrompt}
}

CRITICAL DESIGN RULES:
1. palette.background: NEVER #ffffff or any pure white. Use the TONE-TO-PALETTE MAPPING above.
2. fonts: MUST use the FONT PAIRINGS list. Match the aesthetic boldly — Cinzel for celestial, Satisfy for handcrafted, Bodoni Moda for luxury.
3. SVGs: each must be a single line string. Use spaces between tags, escaped quotes.
4. SVG opacities: 0.06-0.20 only — ultra subtle, never solid.
5. decorIcons: thematically specific (botanical, celestial, nautical, architectural) — NOT generic hearts.
6. dividerQuote: MUST be 6-10 words maximum. Short, poetic, specific to this couple's vibe. Never a generic love quote.
7. All 9 palette colors must form a cohesive, premium visual system. Prefer analogous schemes with one contrasting accent.
8. heroBlobSvg: MUST illustrate the couple's actual world using the COUPLE DNA above. Not generic branches. Draw their pets, hobbies, locations. Fill 70%+ of the 500x700 canvas.
9. chapterIcons: Each icon must be specific to that chapter's content — not generic. A coffee chapter = coffee cup. A travel chapter = airplane or map. A proposal chapter = ring. Simple, elegant, 3-5 stroke elements max per icon.
10. accentBlobSvg: The blob polygon must be irregular and organic, filling ~60% of canvas.
11. sectionBlobPath: Match curve type exactly — cascade/ribbon/mountain have distinct geometries.
12. headingStyle: italic-serif for romantic, uppercase-tracked for minimal/luxury, script-like for handcrafted, bold-editorial for modern, thin-elegant for art deco.
13. cardStyle: glass for dreamy/cosmic, elevated for luxurious, outlined for minimal, solid for rustic, minimal for zen.
14. sectionGradient: use palette.subtle → palette.card → palette.background for a gentle wash.
15. curve / wavePath: The wave dividers between sections should be GENTLE and SUBTLE. Prefer: ribbon (wide sinusoid), arch (smooth arc), organic (soft flowing). Reserve mountain/geometric for bold/modern vibes. The rendered height is max 80px — the SVG path coords should reflect gentle height changes, NOT dramatic peaks.
16. RESPECT THE BRIEF: If the couple chose vibrant hex colors or submitted vibrant inspiration images, USE THOSE COLORS at full saturation. Do not desaturate or mute colors that the couple chose. A Coco / festival / fiesta vibe should look like hot pink, deep navy, and golden yellow — not dusty rose and cream. Serve the couple's actual vision.`;

  try {
    // Fetch inspiration images as base64 inline_data parts
    const imageParts = await Promise.all(
      (context?.inspirationUrls || []).slice(0, 4).map(async (url) => {
        try {
          const imgRes = await fetch(url);
          if (!imgRes.ok) return null;
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          const mime = imgRes.headers.get('content-type') || 'image/jpeg';
          return { inlineData: { mimeType: mime, data: b64 } };
        } catch { return null; }
      })
    ).then(parts => parts.filter((p): p is { inlineData: { mimeType: string; data: string } } => p !== null));

    // Build multimodal parts array — inspiration images come BEFORE the text prompt so the model sees them first
    const parts: Record<string, unknown>[] = [];

    if (imageParts.length > 0) {
      parts.push({ text: `INSPIRATION IMAGES (HIGHEST PRIORITY — ${imageParts.length} image(s) follow): Extract the EXACT dominant colors from these images. They ARE the palette. Do NOT soften or desaturate. These images OVERRIDE all tone mapping defaults.` });
      parts.push(...imageParts);
    }

    // Text prompt comes after inspiration images
    parts.push({ text: prompt });

    // Add representative photos from the couple's actual uploads
    if (context?.photoUrls?.length) {
      parts.push({ text: `\n\nCOUPLE'S ACTUAL PHOTOS: These images are from the couple's real photo collection. Extract the dominant color palette, lighting style (warm/cool/neutral), and overall aesthetic (film/digital, bright/moody, candid/posed). The visual identity MUST harmonize with these photos.\n` });

      for (const url of context.photoUrls.slice(0, 3)) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const contentType = resp.headers.get('content-type') || 'image/jpeg';
            parts.push({ inlineData: { mimeType: contentType, data: base64 } });
          }
        } catch {
          // Skip failed image fetches silently
        }
      }
    }

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 12000,
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
      .replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

    // Gemini returns untyped JSON — every field is validated individually below
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as Record<string, any>;

    const VALID_CURVES: VibeSkin['curve'][] = ['organic', 'arch', 'geometric', 'wave', 'petal', 'cascade', 'ribbon', 'mountain'];
    const VALID_PARTICLES: VibeSkin['particle'][] = ['petals', 'stars', 'bubbles', 'leaves', 'confetti', 'snowflakes', 'fireflies', 'sakura'];
    const VALID_SHAPES: VibeSkin['accentShape'][] = ['ring', 'arch', 'diamond', 'leaf', 'infinity'];
    const VALID_ENTRANCES: VibeSkin['sectionEntrance'][] = ['fade-up', 'bloom', 'drift', 'float', 'reveal'];
    const VALID_TEXTURES: VibeSkin['texture'][] = ['none', 'linen', 'floral', 'marble', 'bokeh', 'starfield', 'paper'];
    const VALID_TONES: VibeSkin['tone'][] = ['dreamy', 'playful', 'luxurious', 'wild', 'intimate', 'cosmic', 'rustic'];
    const VALID_HEADING_STYLES: VibeSkin['headingStyle'][] = ['italic-serif', 'uppercase-tracked', 'thin-elegant', 'bold-editorial', 'script-like'];
    const VALID_CARD_STYLES: VibeSkin['cardStyle'][] = ['glass', 'solid', 'outlined', 'minimal', 'elevated'];

    const curve: VibeSkin['curve'] = VALID_CURVES.includes(parsed.curve) ? parsed.curve : 'organic';
    const waveDef = WAVE_PATHS[curve];
    const accentForFallback = typeof parsed.palette?.accent === 'string' && parsed.palette.accent.startsWith('#')
      ? parsed.palette.accent : '#A3B18A';
    const fallbackArt = buildFallbackArt(accentForFallback, curve);

    // Extract and validate SVG fields — fall back to deterministic art if invalid
    const resolvesvg = (field: string): string => {
      const raw = typeof parsed[field] === 'string' ? parsed[field] : null;
      if (raw) {
        const svg = extractSvgFromField(raw);
        if (svg && isValidSvg(svg)) return svg;
        logWarn(`[VibeEngine] SVG validation failed for "${field}" — using fallback. Raw length: ${raw.length}`);
      }
      return fallbackArt[field as keyof typeof fallbackArt] as string;
    };

    const hexOrDefault = (val: unknown, def: string): string =>
      typeof val === 'string' && val.startsWith('#') ? val : def;

    const bgColor = hexOrDefault(parsed.palette?.background, '#F5F1E8');
    const fgColor = hexOrDefault(parsed.palette?.foreground, '#2B2B2B');
    const accentColor = hexOrDefault(parsed.palette?.accent, '#A3B18A');
    const accent2Color = hexOrDefault(parsed.palette?.accent2, '#D6C6A8');
    const cardColor = (typeof parsed.palette?.card === 'string' &&
      (parsed.palette.card.startsWith('#') || parsed.palette.card.startsWith('rgba')))
      ? parsed.palette.card : '#FDFAF4';
    const mutedColor = hexOrDefault(parsed.palette?.muted, '#9A9488');
    const highlightColor = hexOrDefault(parsed.palette?.highlight, accentColor);
    const subtleColor = hexOrDefault(parsed.palette?.subtle, bgColor);
    const inkColor = hexOrDefault(parsed.palette?.ink, '#1C1C1C');

    return {
      curve,
      particle: VALID_PARTICLES.includes(parsed.particle) ? parsed.particle : 'petals',
      accentShape: VALID_SHAPES.includes(parsed.accentShape) ? parsed.accentShape : 'ring',
      sectionEntrance: VALID_ENTRANCES.includes(parsed.sectionEntrance) ? parsed.sectionEntrance : 'fade-up',
      texture: VALID_TEXTURES.includes(parsed.texture) ? parsed.texture : 'none',
      headingStyle: VALID_HEADING_STYLES.includes(parsed.headingStyle) ? parsed.headingStyle : 'italic-serif',
      cardStyle: VALID_CARD_STYLES.includes(parsed.cardStyle) ? parsed.cardStyle : 'elevated',
      sectionGradient: typeof parsed.sectionGradient === 'string' && parsed.sectionGradient.startsWith('linear-gradient')
        ? parsed.sectionGradient
        : `linear-gradient(135deg, ${subtleColor} 0%, ${cardColor} 100%)`,
      decorIcons: Array.isArray(parsed.decorIcons) && parsed.decorIcons.length > 0
        ? parsed.decorIcons.slice(0, 5)
        : ['✦', '•', '◦', '✧', '·'],
      accentSymbol: typeof parsed.accentSymbol === 'string' ? parsed.accentSymbol : '✦',
      particleColor: hexOrDefault(parsed.particleColor, accent2Color),
      sectionLabels: (() => {
        // Occasion-aware fallback labels — used when Gemini doesn't provide custom labels
        const occ = occasion || 'wedding';
        const occasionDefaults: Record<string, Partial<Record<string, string>>> = {
          birthday: { story: 'Their Story', events: 'The Party', registry: 'Wish List', photos: 'Gallery', rsvp: 'Join the Celebration' },
          anniversary: { story: 'Our Journey', events: 'The Anniversary', registry: 'Wish List', photos: 'Through the Years', rsvp: 'Join Us' },
          engagement: { story: 'Our Beginning', events: 'The Engagement', photos: 'Our Photos' },
          story: { story: 'Our Story', events: 'Our Moments', photos: 'Our Photos' },
        };
        const d = occasionDefaults[occ] || {};
        return {
          story: parsed.sectionLabels?.story || d.story || 'The Story',
          events: parsed.sectionLabels?.events || d.events || 'The Celebration',
          registry: parsed.sectionLabels?.registry || d.registry || 'Gift Guide',
          travel: parsed.sectionLabels?.travel || 'Getting There',
          faqs: parsed.sectionLabels?.faqs || 'What to Know',
          rsvp: parsed.sectionLabels?.rsvp || d.rsvp || 'Will You Be There?',
          photos: parsed.sectionLabels?.photos || d.photos || 'Our Photos',
        };
      })(),
      dividerQuote: typeof parsed.dividerQuote === 'string' ? parsed.dividerQuote : vibeString,
      cornerStyle: CORNER_STYLES[curve],
      tone: VALID_TONES.includes(parsed.tone) ? parsed.tone : 'dreamy',
      palette: {
        background: bgColor,
        foreground: fgColor,
        accent: accentColor,
        accent2: accent2Color,
        card: cardColor,
        muted: mutedColor,
        highlight: highlightColor,
        subtle: subtleColor,
        ink: inkColor,
      },
      fonts: {
        heading: (typeof parsed.fonts?.heading === 'string' && parsed.fonts.heading.length > 0) ? parsed.fonts.heading : 'Playfair Display',
        body:    (typeof parsed.fonts?.body === 'string' && parsed.fonts.body.length > 0)       ? parsed.fonts.body    : 'Inter',
      },
      wavePath: waveDef.d,
      wavePathInverted: waveDef.di,
      heroPatternSvg: resolvesvg('heroPatternSvg'),
      sectionBorderSvg: resolvesvg('sectionBorderSvg'),
      cornerFlourishSvg: resolvesvg('cornerFlourishSvg'),
      medallionSvg: resolvesvg('medallionSvg'),
      heroBlobSvg: resolvesvg('heroBlobSvg'),
      accentBlobSvg: resolvesvg('accentBlobSvg'),
      sectionBlobPath: typeof parsed.sectionBlobPath === 'string' && parsed.sectionBlobPath.startsWith('M')
        ? parsed.sectionBlobPath
        : fallbackArt.sectionBlobPath,
      chapterIcons: Array.isArray(parsed.chapterIcons)
        ? parsed.chapterIcons.map((raw: unknown) => {
            if (typeof raw !== 'string') return null;
            const svg = extractSvgFromField(raw);
            return svg && isValidSvg(svg) ? svg : null;
          }).filter(Boolean) as string[]
        : [],
      chapterColors: Array.isArray(parsed.chapterColors)
        ? parsed.chapterColors.map((c: unknown) =>
            typeof c === 'string' && c.startsWith('#') ? c : null
          ).filter(Boolean) as string[]
        : [],
      aiGenerated: true,
    };
  } catch (err) {
    logWarn('[VibeEngine] Gemini skin generation failed, using fallback:', err);
    return deriveFallback(vibeString);
  }
}

// ── Pass 2.5: Raster Art Generation (Nano Banana Pro) ────────────────────────
// Generates a beautiful AI-painted hero art panel + ambient background art
// tuned to the couple's specific vibe, palette, and occasion.
// Uses gemini-3-pro-image-preview (Nano Banana Pro) — generated once at
// site creation time, stored as base64 data URLs in vibeSkin.

const NANO_BANANA_PRO = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';
const NANO_BANANA_2   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent';



export async function generateSiteArt(
  vibeString: string,
  palette: VibeSkin['palette'],
  apiKey: string,
  occasion?: string,
  coupleNames?: [string, string],
  coupleProfile?: CoupleProfile,
): Promise<SiteArtResult> {

  const occ = occasion || 'wedding';
  const names = coupleNames ? `${coupleNames[0]} & ${coupleNames[1]}` : 'this couple';

  // Occasion-specific art direction (structural/style guidance)
  const occasionArtDirection: Record<string, string> = {
    wedding: `Soft botanical watercolor with delicate florals — roses, peonies, eucalyptus, trailing vines. Ethereal light rays filtering through. No people, no text. Romantic and timeless. Colors should feel warm, luminous, and aspirational.`,
    anniversary: `Rich oil-painting style scene with intertwined botanical elements — mature roses, deep amber tones, golden hour light. Impressionistic brush strokes. Nostalgic and warm. No people, no text. Evokes the depth and richness of time passing together.`,
    birthday: `Joyful celebratory art with confetti, ribbons, soft bokeh lights, and festive botanicals. Energetic yet elegant. No people, no text. Should feel like a beautiful party invitation illustration — festive but refined.`,
    engagement: `Dreamy romantic painting — soft florals, sparkle/light effects, champagne tones. Electric and hopeful. No people, no text. Should feel like the moment right after "yes" — full of joy and anticipation.`,
    story: `Intimate impressionistic scene — soft light, personal motifs from nature, abstract washes of color. No people, no text. Literary and introspective. Should feel like the cover of a beautiful memoir.`,
  };

  // Build profile-aware art direction: incorporate the couple's actual motifs,
  // interests, and illustration prompt into the raster art generation.
  let artDirection = occasionArtDirection[occ] || occasionArtDirection.wedding;

  const hasProfile = coupleProfile && (
    coupleProfile.illustrationPrompt ||
    coupleProfile.motifs.length > 0 ||
    coupleProfile.interests.length > 0 ||
    coupleProfile.pets.length > 0
  );

  if (hasProfile) {
    const profileParts: string[] = [];

    if (coupleProfile.illustrationPrompt) {
      profileParts.push(`PRIMARY VISUAL THEME: ${coupleProfile.illustrationPrompt}`);
    }

    if (coupleProfile.motifs.length > 0) {
      profileParts.push(`KEY MOTIFS TO INCORPORATE: ${coupleProfile.motifs.join(', ')}`);
    }

    if (coupleProfile.interests.length > 0) {
      profileParts.push(`PERSONAL INTERESTS (weave subtly into the art): ${coupleProfile.interests.join(', ')}`);
    }

    if (coupleProfile.pets.length > 0) {
      profileParts.push(`PETS (include as subtle elements): ${coupleProfile.pets.join(', ')}`);
    }

    if (coupleProfile.locations.length > 0) {
      profileParts.push(`MEANINGFUL PLACES (hint at in background/atmosphere): ${coupleProfile.locations.join(', ')}`);
    }

    // Profile-aware direction: personal motifs take priority, occasion style is secondary
    artDirection = `${profileParts.join('\n')}\n\nSTYLE GUIDANCE: ${artDirection}`;
  }

  // Extract key color descriptions from the palette
  const colorDesc = [
    `background: ${palette.background}`,
    `primary accent: ${palette.accent}`,
    `secondary: ${palette.accent2}`,
    `tone: ${palette.highlight}`,
  ].join(', ');

  // IMPORTANT: Since Nano Banana does not support transparent backgrounds,
  // all prompts specify the EXACT background color. CSS mask-image + mix-blend-mode
  // handles edge-blending seamlessly on the rendered site.
  const bgHex = palette.background;
  const accentHex = palette.accent;

  const heroPrompt = `Create a stunning, editorial-quality painted illustration for a ${occ} website for ${names}.

BACKGROUND: Paint this on a SOLID ${bgHex} background — this is the exact page background color. The artwork should emerge from and fade back into this background color naturally at the edges, making it feel like part of the page.

ART DIRECTION: ${artDirection}

COLOR PALETTE (stay within these exact tones — no other colors):
${colorDesc}

VIBE/MOOD: "${vibeString.slice(0, 200)}"

COMPOSITION:
- Horizontal landscape orientation
- Rich botanical/atmospheric detail in center
- Soft, painterly fade toward all four edges (the edges must match ${bgHex})
- Depth: foreground elements slightly bolder, background washed/ethereal
- No text, no faces, no people, no logos, no watermarks, no borders
- Premium editorial quality — think Kinfolk magazine, Vogue editorial, Architectural Digest`;

  const ambientPrompt = `Create a very soft, abstract atmospheric art background for a ${occ} website.

BACKGROUND: Solid ${bgHex} — the art must be painted ON this color, not over it.

Style: Subtle impressionistic wash — like morning light filtering through curtains
Colors: Extremely soft — use ${bgHex} as the dominant tone with barely-there hints of ${accentHex}
Content: Loose abstract botanical shapes, botanical brushstrokes, barely suggested flora
Opacity feel: The art should feel like it's 15% visible — transparent-looking but without actual transparency
Edges: Must fade completely back into ${bgHex} at all edges — no hard borders
No text, no faces, no people, no logos, no watermarks`;

  const artStripPrompt = `Create a narrow horizontal decorative art strip for a ${occ} website divider.

BACKGROUND: Solid ${bgHex}
Style: Watercolor botanical strip — delicate florals, leaves, stems arranged in a horizontal band
Colors: ${accentHex} and soft variants, on ${bgHex} background
Composition: Wide and narrow (aspect ratio ~8:1) — decorative horizontal band
Left and right edges must fade completely into ${bgHex}
No text, no people, no faces, no logos`;

  async function fetchImage(prompt: string, model: string): Promise<string | undefined> {
    try {
      // 25s hard timeout per image — if the model hangs, skip gracefully
      const imgController = new AbortController();
      const imgTimeout = setTimeout(() => imgController.abort(), 25_000);
      let res: Response;
      try {
        res = await fetch(`${model}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['image'],
            },
          }),
          signal: imgController.signal,
        });
      } finally {
        clearTimeout(imgTimeout);
      }
      if (!res.ok) {
        logWarn(`[Site Art] Image generation returned ${res.status}`);
        return undefined;
      }
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find(
        (p: Record<string, unknown>) => p.inlineData
      );
      if (!part?.inlineData?.data) return undefined;
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    } catch (err) {
      logWarn('[Site Art] Image generation failed:', err);
      return undefined;
    }
  }

  // Generate all three art pieces in parallel:
  // - Hero art: Nano Banana Pro (max quality — the showpiece)
  // - Ambient + art strip: Nano Banana 2 (faster, good enough for subtle use)
  const [heroArtDataUrl, ambientArtDataUrl, artStripDataUrl] = await Promise.all([
    fetchImage(heroPrompt, NANO_BANANA_PRO),
    fetchImage(ambientPrompt, NANO_BANANA_2),
    fetchImage(artStripPrompt, NANO_BANANA_2),
  ]);

  log(
    '[Site Art] Pass 2.5 complete —',
    heroArtDataUrl ? 'hero art ✓' : 'hero art ✗',
    ambientArtDataUrl ? 'ambient ✓' : 'ambient ✗',
    artStripDataUrl ? 'art strip ✓' : 'art strip ✗'
  );

  return { heroArtDataUrl, ambientArtDataUrl, artStripDataUrl };
}
