// ─────────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/prompts.ts — prompt templates
// ─────────────────────────────────────────────────────────────────

import type { PhotoCluster } from './types';

export function buildPrompt(
  clusters: PhotoCluster[],
  vibeString: string,
  coupleNames: [string, string],
  occasion?: string,
  eventDate?: string,
  photoCount?: number,
  layoutFormat?: string
): string {
  // Build richly detailed cluster summaries including per-photo metadata
  const clusterSummary = clusters.map((c, i) => {
    const photoDetails = c.photos.map(p => ({
      filename: p.filename,
      date: p.creationTime?.slice(0, 10),
      camera: [p.cameraMake, p.cameraModel].filter(Boolean).join(' ') || 'unknown',
      dimensions: `${p.width}x${p.height}`,
      mimeType: p.mimeType,
    }));

    // Summarize the distinct dates in this cluster for the AI
    const uniqueDates = [...new Set(c.photos.map(p => p.creationTime?.slice(0, 10)).filter(Boolean))].sort();
    const dateContext = uniqueDates.length === 1
      ? `Single day: ${uniqueDates[0]}`
      : `${uniqueDates.length} days: ${uniqueDates.join(', ')}`;

    return {
      clusterIndex: i,
      dateRange: `${c.startDate.slice(0, 10)} to ${c.endDate.slice(0, 10)}`,
      dateContext,
      photoCount: c.photos.length,
      note: c.note || null,
      noteInstruction: c.note
        ? `⚠️ HIGHEST PRIORITY CONTEXT — written BY THE COUPLE about this exact moment: '${c.note}'. The chapter title, subtitle, and description MUST directly reflect this note's emotion, details, and voice. This note describes ONLY this cluster — do not apply it to other clusters.`
        : null,
      location: c.location?.label || null,
      locationInstruction: c.location?.label
        ? `This chapter takes place in ${c.location.label}. Weave this place into the narrative naturally — the light there, the feeling of arriving, what made it memorable. This is a DIFFERENT location from other clusters — write about THIS specific place, not other clusters' locations.`
        : 'No specific location was given for this chapter. Do NOT make up or invent a location. Write about the emotional space and feeling instead of a geographical place.',
      photos: photoDetails,
    };
  });

  const occ = occasion || 'wedding';
  const occasionLabels: Record<string, string> = {
    wedding: 'a breathtaking wedding website with ceremony & reception events',
    engagement: 'a stunning engagement announcement & celebration website',
    anniversary: 'a beautiful anniversary celebration documenting years of love',
    birthday: 'a joyful birthday celebration gift website',
    story: 'a deeply personal love story documentary website',
  };
  const ctxLabel = occasionLabels[occ] || occasionLabels.wedding;
  const occCap = occ.charAt(0).toUpperCase() + occ.slice(1);

  const eventDateCtx = eventDate
    ? `\n- The couple's event is on ${eventDate}. If this chapter predates the event, write with anticipation building toward it. If the chapter is recent, write with the joy of imminence.`
    : '';

  const occasionChapterGuidance: Record<string, string> = {
    wedding: `CHAPTER STRUCTURE: Build toward the wedding day. Suggested arc:
    - "How we met" or "The beginning" — origin story
    - "Growing together" — key moments, adventures, milestones
    - "The proposal" — if proposal happened and photos exist
    - "Our wedding day" or forward-looking — ceremony/celebration
    Each chapter should build emotional anticipation toward the event.`,

    anniversary: `CHAPTER STRUCTURE: This is a RETROSPECTIVE celebration of years together. Build a timeline narrative:
    - Early chapters: "The beginning", "Year One", early memories
    - Middle chapters: milestones, adventures, challenges overcome, growth
    - Final chapter: "Today" or "Still choosing you" — present-day celebration
    If anniversaryYears is provided, reference the specific milestone meaningfully.
    Tone: warm, nostalgic, celebratory of endurance and deepening love.
    DO NOT treat this as a forward-looking wedding site. This is a love retrospective.`,

    birthday: `CHAPTER STRUCTURE: This is a TRIBUTE to a specific person. Build chapters that celebrate WHO THEY ARE:
    - First chapter: "Who you are" — their personality, spirit, what makes them unique
    - Middle chapters: key life chapters, their passions, adventures, relationships
    - Final chapter: "Here's to you" or "Happy [age]th" — joyful celebration
    If birthdayAge is provided, reference the milestone meaningfully.
    Tone: joyful, celebratory, personal, tribute-style. Center the birthday person, not a couple narrative.
    DO NOT write as if this is a couple's love story.`,

    engagement: `CHAPTER STRUCTURE: This is a LOVE STORY building toward the proposal and beyond:
    - First chapters: how they met, falling in love, growing together
    - Key chapter: "The proposal" — tell the proposal story with emotion and detail
    - Final chapter: "What's next" or "Forever starts now" — the future together
    If proposalStory is in the vibe data, use it as the emotional centerpiece.
    Tone: romantic, electric, forward-looking, full of anticipation.`,

    story: `CHAPTER STRUCTURE: This is a PURE LOVE STORY or personal narrative with no event anchor:
    - Chapters based entirely on the photos and emotional moments
    - No requirement to build toward any event date
    - Can be abstract, poetic, impressionistic
    - Let the photos and vibe guide structure
    Tone: intimate, literary, personal.`,
  };

  const chapterGuidance = occasionChapterGuidance[occ] || occasionChapterGuidance.wedding;
  const effectivePhotoCount = photoCount ?? clusters.length;

  const occasionEventSchema: Record<string, string> = {
    wedding: `EVENTS: Generate ceremony and reception objects. Leave venue, address, time as empty strings — these come from real user-provided data.`,

    anniversary: `EVENTS: Generate ONE celebration event (the anniversary dinner/party).
    DO NOT generate "ceremony" or "reception" fields — this is not a wedding.
    Event name should reflect the milestone: e.g. "Anniversary Dinner", "25th Anniversary Celebration".
    If no event details provided, omit events entirely or create a single gentle celebration.`,

    birthday: `EVENTS: Generate ONE birthday celebration event.
    DO NOT generate "ceremony" or "reception" — this is a birthday party.
    Event name: "[Name]'s [Age]th Birthday" or similar.
    If this is a surprise party (indicated in vibe), note "Surprise!" in description.`,

    engagement: `EVENTS: Generate ONE engagement party event (if venue provided).
    DO NOT generate "ceremony" or "reception" — that's the wedding, not the engagement.
    Event name: "Engagement Celebration" or "[Name] & [Name] Are Engaged!"`,

    story: `EVENTS: Only generate events if explicitly provided in logistics. Otherwise omit entirely.`,
  };

  const eventSchemaGuidance = occasionEventSchema[occ] || occasionEventSchema.wedding;

  const occasionFaqGuidance: Record<string, string> = {
    wedding: `FAQs: Generate 4-5 wedding-specific FAQs: dress code, RSVP deadline, children policy, parking/accommodation, dietary requirements.`,

    anniversary: `FAQs: Generate 2-3 celebration FAQs appropriate for an anniversary party: is it a formal event, gift registry (if any), what to expect on the night. Keep brief and warm.`,

    birthday: `FAQs: Generate 2-3 birthday party FAQs: dress code/theme, gift info, dietary needs.
    If it's a surprise, include: "How do I keep it a secret?" as a FAQ.`,

    engagement: `FAQs: Generate 2-3 engagement party FAQs: is gifts expected, dress code, timing/schedule.`,

    story: `FAQs: Omit FAQs unless explicitly needed. This is a personal story site, not an event.`,
  };

  const faqGuidance = occasionFaqGuidance[occ] || occasionFaqGuidance.wedding;

  // Occasion-aware names line — birthday sites center the honoree, not a couple
  const namesLine = occ === 'birthday'
    ? `- Honoree (the birthday person): ${coupleNames[0]}${coupleNames[1] ? `\n- This site was created as a gift by: ${coupleNames[1]}` : ''}`
    : `- Names: ${coupleNames[0]} & ${coupleNames[1]}`;

  return `You are the "Memory Engine" for Pearloom \u2014 a world-class storytelling AI that crafts ${ctxLabel}. Your output powers a live, editorial-quality website. It must be stunning.

## The Couple / Honorees
${namesLine}
- Occasion type: ${occCap}${eventDateCtx}

---
## OCCASION-SPECIFIC CHAPTER GUIDANCE (non-negotiable)
${chapterGuidance}

---
## OCCASION-SPECIFIC EVENT GUIDANCE (non-negotiable)
${eventSchemaGuidance}

---
## OCCASION-SPECIFIC FAQ GUIDANCE (non-negotiable)
${faqGuidance}

---
## Their Vibe & Personality (OVERALL TONE ONLY — NOT chapter content)
The vibe string below describes the couple's general personality, aesthetic preferences, and emotional tone.
Use this ONLY to set the writing STYLE, VOICE, and EMOTIONAL REGISTER across all chapters.
DO NOT use interests, hobbies, or personality traits from the vibe to describe WHAT IS HAPPENING in a specific photo or chapter.

For example:
- If the vibe says "loves hiking" but a chapter's photos are from a dinner → write about the dinner, NOT hiking
- If the vibe says "coffee lovers" but photos show a beach → write about the beach, NOT coffee
- The vibe informs HOW you write (warm, playful, poetic), not WHAT you write about

${vibeString}

---
## Photo Clusters (CHAPTER CONTENT SOURCE — this is what each chapter is ABOUT)
Each cluster below represents a distinct moment/location. The chapter content MUST describe what is actually in the photos and the note/location provided — NOT the couple's general interests from the vibe above.

${JSON.stringify(clusterSummary, null, 2)}

## CRITICAL: DATA SEPARATION RULES (non-negotiable)
1. CHAPTER CONTENT comes from the CLUSTER DATA above (dates, location, note, what's visible in photos)
2. WRITING STYLE comes from the VIBE STRING (tone, voice, emotional register)
3. NEVER mix these up. A chapter about a beach trip should describe the beach, not the couple's hobby of cooking just because the vibe mentions cooking.
4. Each cluster is a SEPARATE chapter about a SEPARATE moment. Do not blend content between clusters.

## CRITICAL LOCATION AND CONTEXT RULES (non-negotiable)
- Each cluster above has a "locationInstruction" field. You MUST follow it exactly for that chapter.
- NEVER invent a location if "location" is null. Use the locationInstruction's fallback language instead.
- If a cluster has a location, the chapter description MUST reference that specific place.
- If two clusters have DIFFERENT locations, their chapters MUST describe DIFFERENT places — do not generalize.

## BLURB/NOTE RULES: See noteInstruction in each cluster above

---
## NARRATIVE QUALITY STANDARDS (non-negotiable)

### Titles â€” Be SPECIFIC, evocative, poetic (3-6 words max)
âœ… Good: "That October Night", "Sundays with Poppy", "The Rooftop, Brooklyn", "Her Terrible Fake Laugh", "How It Started"
âŒ Bad: "Our Journey Begins", "Beautiful Memories", "The Start of Us", "First Meeting", "A New Chapter"

Titles must feel like chapter headings from a memoir or short film. They should surprise the reader, not telegraph the obvious.

BANNED TITLES: "Our Story", "The Beginning", "A New Chapter", "Love Story", "Together", "Where It Started", "The First Chapter". ALWAYS include a specific detail — a place name, activity, season, or inside reference from the cluster photos.
Strong title examples: "Kyoto in the Rain", "That Brooklyn Rooftop", "Dancing at Three AM", "Sand Between Our Toes"
Weak title examples (NEVER use these): "Our Story Begins", "A Beautiful Day", "The Start of Something"

### Descriptions â€” Write in FIRST PERSON PLURAL, from inside the memory
- 3â€“4 sentences, intimate and specific
- ALWAYS use "We", "us", "our" â€” written as if the couple themselves are narrating
- Include SENSORY DETAILS: what the weather was, what song was playing, the smell of the place, the texture of the moment
- Reference REAL details from their vibe: pets, restaurants, inside jokes, places, rituals
- Never use: "journey", "adventure", "soulmate", "fairy tale", "happily ever after", "storybook"
- DO use: specific sensory experiences, honest emotions, humor if it fits the vibe
- Each chapter description should feel like it could ONLY belong to this couple

### EMOTIONAL ARC â€” The chapters must have a narrative through-line
- First 1-2 chapters: wonder, excitement, the spark â€” "We found ourselves..."
- Middle chapters: growth, discovery, challenge overcome â€” "We learned..."
- Final 1-2 chapters: certainty, commitment, coming home â€” "We knew..."

### Chapter count: Minimum 3, Maximum 7

### Subtitles â€” One poetic, unusual line
- Should feel like a line from a poem or a song lyric, not a description
- Examples: "the part where everything changed", "neither of us were ready", "in all the best ways"

### Mood Tags â€” Short, evocative, lowercase
- Examples: golden hour, late night, mountain air, lazy sunday, first winter
- Avoid generic: romantic, happy, fun

---
## THEME DESIGN
- Must feel PREMIUM: think Vogue editorial, Kinfolk magazine, Architectural Digest, luxury stationery
- Colors come from the vibe input. If a specific palette or hex was mentioned, use it
- Heading fonts: Cormorant Garamond, EB Garamond, Lora, Playfair Display, Libre Baskerville
- Body fonts: Inter, Outfit, DM Sans, Work Sans, Nunito (all from Google Fonts)
- Background: NEVER pure white. Use warm off-whites (#F5F1E8), soft creams, moody deep tones, dusty greens, rose blush â€” whatever fits the vibe
- Contrast must remain readable at all times

---
## VISUAL ANALYSIS
You have been provided with one representative image per cluster. YOU MUST LOOK AT EACH IMAGE to understand:
- Who is in the photo (clothing, energy, context)
- What environment they're in (indoor, outdoor, landmark, specific setting)
- What the emotional register of the moment is

WRITE DESCRIPTIONS BASED ON WHAT YOU ACTUALLY SEE IN THE PHOTOS — not what the vibe string says about the couple's interests.
- If photos show a restaurant dinner → write about the dinner, even if the vibe says "outdoorsy"
- If photos show a park → write about the park, even if the vibe says "homebodies"
- The vibe string tells you HOW to write (tone), the photos tell you WHAT to write about (content)

If the location metadata says "Unknown" but you can clearly see they're at a ski mountain, write about the mountain. Never gaslighting the couple with incorrect descriptions.

If a cluster location is unknown, deduce it from the visual. Do NOT hallucinate a location based on the vibe string alone.

---
## LAYOUT ROTATION RULES
Available layouts: "editorial", "fullbleed", "split", "cinematic", "gallery", "mosaic"

- Chapter 1: ALWAYS "editorial" or "fullbleed" (maximum visual impact)
- Chapter 2: NEVER the same as chapter 1
- "fullbleed" â€” use for vacations, outdoor scenery, emotional milestone moments
- "cinematic" â€” use for intimate, quiet, emotionally heavy memories
- "gallery" â€” ONLY when a cluster has 3+ images
- "mosaic" â€” use when a cluster has 3â€“5 fun, casual, varied photos (travels, gatherings)
- "split" â€” use for date nights, events, or moments with one strong photo
- "editorial" â€” versatile; use as a reset between heavy layouts
- NEVER use the same layout for two consecutive chapters
- Distribute layouts as evenly as possible across all chapters

---
## CHAPTER COUNT (CRITICAL — enforce strictly)
- You have exactly ${effectivePhotoCount} photo cluster(s). Generate AT MOST ${effectivePhotoCount} chapters — one chapter per photo cluster. Do NOT invent chapters for photos that do not exist.
- Maximum: 7 chapters. If there are more than 7 clusters, intelligently merge the least visually distinct ones into nearby chapters.
- Minimum: If there is only 1 cluster, generate exactly 1 chapter. Do NOT pad to 3.
- Each chapter must have emotional momentum — the full arc from first spark to certainty.

---
## MACRO LAYOUT FORMAT
The couple chose the "${layoutFormat || 'cascade'}" timeline format. Optimize per-chapter layouts for this presentation:
${layoutFormat === 'filmstrip' ? '- Favor "cinematic" and "fullbleed" layouts for dramatic horizontal impact' : ''}
${layoutFormat === 'scrapbook' ? '- Favor "gallery" and "mosaic" layouts for a casual, multi-photo feel' : ''}
${layoutFormat === 'magazine' ? '- Favor "editorial" and "split" layouts for clean editorial spreads' : ''}
${layoutFormat === 'starmap' ? '- Favor "cinematic" layouts for celestial drama' : ''}

---
## OUTPUT SCHEMA (strict JSON, NO markdown)
Return ONLY this JSON with no additional text:
{
  "coupleId": "<generate-uuid>",
  "generatedAt": "<current ISO timestamp>",
  "vibeString": "${vibeString.slice(0, 120)}",
  "theme": {
    "name": "<creative theme name â€” e.g. 'Warm Ivory', 'Midnight Sage', 'Nordic Blush'>",
    "fonts": { "heading": "<Google Font>", "body": "<Google Font>" },
    "colors": {
      "background": "<hex â€” warm off-white or moody dark>",
      "foreground": "<hex>",
      "accent": "<hex â€” warm, saturated but not neon>",
      "accentLight": "<hex â€” very light version of accent for tints>",
      "muted": "<hex â€” readable grey or warm neutral>",
      "cardBg": "<hex â€” slightly lighter/darker than background>"
    },
    "borderRadius": "<css value, e.g. '0.75rem'>",
    "elementShape": "<square | rounded | arch | pill>",
    "cardStyle": "<solid | glass | bordered | shadow-heavy>",
    "backgroundPattern": "<none | noise | dots | grid | waves | floral | topography>"
  },
  "chapters": [
    {
      "id": "<uuid>",
      "date": "<ISO date â€” REAL date from photo metadata>",
      "title": "<evocative, specific, 2â€“5 words>",
      "subtitle": "<one poetic, unusual line â€” not a description>",
      "description": "<3â€“4 sentences, intimate, specific, written as if by the couple>",
      "images": [],
      "location": { "lat": <number>, "lng": <number>, "label": "<City, State or Country>" } | null,
      "mood": "<two-word lowercase mood tag>",
      "layout": "<Choose based on PHOTO COUNT + INTENSITY: 1 photo->editorial, 2 photos->split, 3+ photos->gallery/mosaic, high emotion->cinematic/fullbleed>",
      "emotionalIntensity": "<1-10: rate emotional weight: 1=quiet/everyday, 5=travel/adventure, 8=first kiss/proposal/milestone, 10=life-defining moment>",
      "ambientColor": "<hex tint for this chapter section: beach->#E8F4F8, golden-hour->#FDF0E0, forest->#EAF2E8, night->#1A1A2E, city->#F0F0F8, match the mood>",
      "imagePosition": { "x": "<0-100 horizontal: left-third=25, center=50, right-third=75>", "y": "<0-100 vertical: top=25, center=50, bottom=75>" },
      "heroPhotoIndex": "<index 0-N of the most visually striking image in this chapter to use as the hero/cover — pick the one with best composition, lighting, and emotional impact>",
      "order": <number starting at 0>
    }
  ],
  “events”: [
    /* Follow the OCCASION-SPECIFIC EVENT GUIDANCE above strictly.
       For weddings: generate both “Ceremony” and “Reception” objects.
       For anniversaries/birthdays/engagements: generate ONE event with an appropriate name.
       For story: omit this array entirely if no event details were provided.
       Each event object shape: */
    {
      “id”: “<uuid>”,
      “name”: “<Event name per occasion guidance above>”,
      “date”: “<ISO 8601 date from user data, or empty string>”,
      “time”: “”,
      “endTime”: “”,
      “venue”: “”,
      “address”: “”,
      “description”: “<one warm sentence about what to expect>”,
      “dressCode”: “”,
      “mapUrl”: null
    }
  ],
  “faqs”: [
    /* Follow the OCCASION-SPECIFIC FAQ GUIDANCE above strictly.
       For weddings: 4-5 FAQs (parking, children, dress code, RSVP deadline, dietary).
       For anniversaries/birthdays/engagements: 2-3 FAQs appropriate to the occasion.
       For story: omit this array entirely.
       Each FAQ object shape: */
    {
      “id”: “<uuid>”,
      “question”: “<Question appropriate to the occasion per FAQ guidance above>”,
      “answer”: “<warm, helpful, occasion-appropriate answer>”,
      “order”: 0
    }
  ],
  “travelInfo”: {
    “airports”: [],
    “hotels”: [],
    “parkingInfo”: “”,
    “directions”: “”
  },
  "registry": {
    "enabled": true,
    "cashFundUrl": null,
    "cashFundMessage": "Your presence is the greatest gift. But if you'd like to celebrate us further, we've created a honeymoon fund.",
    "entries": [
      {
        "name": "Zola",
        "url": "https://www.zola.com",
        "note": "Our curated home and experience wishlist"
      }
    ]
  },
  "comingSoon": {
    "enabled": true,
    "title": "<3-5 word section title>",
    "subtitle": "<one personalized line â€” wedding date, birthday wish, or poetic nod to their future>",
    "passwordProtected": false
  }
}

CRITICAL FINAL CHECKS before returning:
1. Did you use REAL dates from photo metadata? (not fabricated)
2. Are all chapter titles specific and evocative? (not generic)
3. Is the layout sequence varied? (no consecutive duplicates)
4. Is the theme background a warm off-white or moody tone? (not #ffffff)
5. Does the vibeString quote feel poetic and site-worthy?
6. Did you follow the OCCASION-SPECIFIC EVENT GUIDANCE? (${occ === 'wedding' ? 'wedding needs ceremony + reception' : occ === 'story' ? 'story: omit events if none provided' : `${occ}: ONE celebration event, NOT ceremony/reception`})
7. Did you follow the OCCASION-SPECIFIC FAQ GUIDANCE? (${occ === 'wedding' ? '4-5 wedding FAQs' : occ === 'story' ? 'story: omit FAQs' : `${occ}: 2-3 occasion-appropriate FAQs`})
8. Does travelInfo have empty arrays for airports and hotels? (leave empty — users add real details in the editor)
9. Does the chapter structure follow the ${occCap} arc? (NOT a generic wedding narrative)`;
}
