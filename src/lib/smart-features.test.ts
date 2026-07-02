import { describe, it, expect, vi } from 'vitest';
import {
  smartNameFontSize,
  smartBlockOrder,
  validateTypography,
  checkVisualRhythm,
  detectContentNudges,
  colorTemperature,
  temperatureAdvice,
  heroTextColors,
  textColorForBrightness,
} from './smart-features';

// ── smartNameFontSize ───────────────────────────────────────

describe('smartNameFontSize', () => {
  it('returns a CSS clamp() string', () => {
    const result = smartNameFontSize('Ali');
    expect(result).toMatch(/^clamp\(.+rem,.+vw,.+rem\)$/);
  });

  it('gives short names a bigger max size than long names', () => {
    const short = smartNameFontSize('Ali');   // 3 chars
    const long = smartNameFontSize('Alexandria Konstantinopolis'); // 28 chars

    // Extract the max rem value (last number before "rem)")
    const maxRem = (s: string) => {
      const match = s.match(/,\s*([\d.]+)rem\)$/);
      return match ? parseFloat(match[1]) : 0;
    };

    expect(maxRem(short)).toBeGreaterThan(maxRem(long));
  });

  it('scales down progressively for longer names', () => {
    const sizes = [
      smartNameFontSize('Jo'),           // 2 chars  -> scale 1.0
      smartNameFontSize('Michael'),      // 7 chars  -> scale 0.9
      smartNameFontSize('Alexandria'),   // 10 chars -> scale 0.8
      smartNameFontSize('Bartholomew'),  // 11 chars -> scale 0.65
    ];

    const maxRem = (s: string) => {
      const match = s.match(/,\s*([\d.]+)rem\)$/);
      return match ? parseFloat(match[1]) : 0;
    };

    for (let i = 0; i < sizes.length - 1; i++) {
      expect(maxRem(sizes[i])).toBeGreaterThan(maxRem(sizes[i + 1]));
    }
  });

  it('handles empty string (edge case)', () => {
    const result = smartNameFontSize('');
    expect(result).toMatch(/^clamp\(/);
  });

  it('trims whitespace from name before measuring', () => {
    const trimmed = smartNameFontSize('  Ali  ');
    const untrimmed = smartNameFontSize('Ali');
    expect(trimmed).toBe(untrimmed);
  });

  it('respects custom minRem and maxRem parameters', () => {
    const result = smartNameFontSize('Ali', 1.0, 5.0);
    expect(result).toMatch(/^clamp\(/);
    // Max should be based on 5.0 * scale, not the default 10
    const maxMatch = result.match(/,\s*([\d.]+)rem\)$/);
    expect(maxMatch).not.toBeNull();
    expect(parseFloat(maxMatch![1])).toBeLessThanOrEqual(5.0);
  });
});

// ── smartBlockOrder ─────────────────────────────────────────

describe('smartBlockOrder', () => {
  const makeBlocks = (...types: string[]) =>
    types.map((type, i) => ({ type, id: `block-${i}` }));

  it('places hero first when it is not already first', () => {
    const blocks = makeBlocks('event', 'hero', 'story', 'footer');
    const { reordered, changes } = smartBlockOrder(blocks);

    expect(reordered[0].type).toBe('hero');
    expect(changes.some(c => c.type === 'hero')).toBe(true);
  });

  it('does not move hero if already first', () => {
    const blocks = makeBlocks('hero', 'story', 'event', 'footer');
    const { reordered, changes } = smartBlockOrder(blocks);

    expect(reordered[0].type).toBe('hero');
    expect(changes.some(c => c.type === 'hero')).toBe(false);
  });

  it('places footer last', () => {
    const blocks = makeBlocks('hero', 'footer', 'story', 'event');
    const { reordered, changes } = smartBlockOrder(blocks);

    expect(reordered[reordered.length - 1].type).toBe('footer');
    expect(changes.some(c => c.type === 'footer')).toBe(true);
  });

  it('does not move footer if already last', () => {
    const blocks = makeBlocks('hero', 'story', 'event', 'footer');
    const { changes } = smartBlockOrder(blocks);

    expect(changes.some(c => c.type === 'footer')).toBe(false);
  });

  it('promotes RSVP when deadline is within 14 days', () => {
    const blocks = makeBlocks('hero', 'story', 'event', 'gallery', 'rsvp', 'footer');

    // RSVP deadline 5 days from now
    const soon = new Date();
    soon.setDate(soon.getDate() + 5);

    // Wedding date in the future
    const wedding = new Date();
    wedding.setDate(wedding.getDate() + 30);

    const { reordered, changes } = smartBlockOrder(
      blocks,
      wedding.toISOString(),
      soon.toISOString(),
    );

    // RSVP should be promoted (closer to the top, after events)
    const rsvpIdx = reordered.findIndex(b => b.type === 'rsvp');
    const eventIdx = reordered.findIndex(b => b.type === 'event');
    expect(rsvpIdx).toBeLessThanOrEqual(eventIdx + 2);
    expect(changes.some(c => c.type === 'rsvp' && c.reason?.includes('promoted'))).toBe(true);
  });

  it('does not promote RSVP when deadline is far away', () => {
    const blocks = makeBlocks('hero', 'story', 'event', 'gallery', 'rsvp', 'footer');

    const farDeadline = new Date();
    farDeadline.setDate(farDeadline.getDate() + 60);

    const wedding = new Date();
    wedding.setDate(wedding.getDate() + 90);

    const { changes } = smartBlockOrder(
      blocks,
      wedding.toISOString(),
      farDeadline.toISOString(),
    );

    expect(changes.some(c => c.type === 'rsvp' && c.reason?.includes('promoted'))).toBe(false);
  });

  it('demotes countdown and RSVP when wedding date has passed', () => {
    const blocks = makeBlocks('hero', 'countdown', 'event', 'rsvp', 'story', 'footer');

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const { reordered, changes } = smartBlockOrder(blocks, pastDate.toISOString());

    // Countdown and RSVP should be near the bottom (before footer)
    const countdownIdx = reordered.findIndex(b => b.type === 'countdown');
    const rsvpIdx = reordered.findIndex(b => b.type === 'rsvp');
    const footerIdx = reordered.findIndex(b => b.type === 'footer');

    expect(countdownIdx).toBeLessThan(footerIdx);
    expect(rsvpIdx).toBeLessThan(footerIdx);
    expect(changes.some(c => c.type === 'countdown' && c.reason?.includes('passed'))).toBe(true);
  });

  it('does not mutate the original blocks array', () => {
    const blocks = makeBlocks('event', 'hero', 'footer', 'story');
    const originalOrder = blocks.map(b => b.type);
    smartBlockOrder(blocks);

    expect(blocks.map(b => b.type)).toEqual(originalOrder);
  });

  it('handles blocks with no hero or footer', () => {
    const blocks = makeBlocks('story', 'event', 'gallery');
    const { reordered } = smartBlockOrder(blocks);

    expect(reordered.length).toBe(3);
  });

  it('handles empty blocks array', () => {
    const { reordered, changes } = smartBlockOrder([]);
    expect(reordered).toEqual([]);
    expect(changes).toEqual([]);
  });
});

// ── validateTypography ──────────────────────────────────────

describe('validateTypography', () => {
  it('reports error when both fonts are decorative/script (double-script)', () => {
    const issues = validateTypography('Great Vibes', 'Dancing Script');
    const error = issues.find(i => i.severity === 'error');
    expect(error).toBeDefined();
    expect(error!.title).toContain('decorative');
  });

  it('warns when same font is used for heading and body', () => {
    const issues = validateTypography('Inter', 'Inter');
    const warn = issues.find(i => i.severity === 'warn');
    expect(warn).toBeDefined();
    expect(warn!.title).toContain('No typographic contrast');
  });

  it('warns when body font is decorative but heading is not', () => {
    const issues = validateTypography('Inter', 'Allura');
    const warn = issues.find(i => i.severity === 'warn');
    expect(warn).toBeDefined();
    expect(warn!.title).toContain('Script font for body');
  });

  it('returns ok for a good pairing (serif heading + sans body)', () => {
    const issues = validateTypography('Playfair Display', 'Inter');
    // Should have no errors
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors.length).toBe(0);
    // The heading is display, body is readable -- only ok expected
    const ok = issues.find(i => i.severity === 'ok');
    expect(ok).toBeDefined();
    expect(ok!.title).toContain('Good font pairing');
  });

  it('returns ok for two different readable body fonts', () => {
    const issues = validateTypography('Outfit', 'DM Sans');
    const ok = issues.find(i => i.severity === 'ok');
    expect(ok).toBeDefined();
  });

  it('double-script detection is case-sensitive to font names', () => {
    // Using exact font name from the known set
    const issues = validateTypography('Playfair Display', 'Cormorant Garamond');
    const error = issues.find(i => i.severity === 'error');
    expect(error).toBeDefined();
  });

  it('includes a suggestion when issues are found', () => {
    const issues = validateTypography('Great Vibes', 'Allura');
    const withSuggestion = issues.filter(i => i.suggestion);
    expect(withSuggestion.length).toBeGreaterThan(0);
  });
});

// ── checkVisualRhythm ───────────────────────────────────────

describe('checkVisualRhythm', () => {
  const makeBlocks = (...types: string[]) => types.map(type => ({ type }));

  it('detects 3+ consecutive text blocks as monotony', () => {
    const blocks = makeBlocks('text', 'quote', 'vibeQuote', 'gallery');
    const issues = checkVisualRhythm(blocks);

    const monotony = issues.find(i => i.title.toLowerCase().includes('monotony'));
    expect(monotony).toBeDefined();
    expect(monotony!.detail).toContain('3');
  });

  it('detects 3+ consecutive visual blocks as monotony', () => {
    const blocks = makeBlocks('hero', 'photos', 'gallery', 'video', 'text');
    const issues = checkVisualRhythm(blocks);

    const monotony = issues.find(i => i.title.toLowerCase().includes('monotony'));
    expect(monotony).toBeDefined();
  });

  it('detects 3+ consecutive interactive blocks as monotony', () => {
    const blocks = makeBlocks('rsvp', 'guestbook', 'quiz', 'text');
    const issues = checkVisualRhythm(blocks);

    const monotony = issues.find(i => i.title.toLowerCase().includes('monotony'));
    expect(monotony).toBeDefined();
  });

  it('returns no monotony issues for well-alternated blocks', () => {
    const blocks = makeBlocks('hero', 'text', 'photos', 'rsvp', 'text', 'gallery');
    const issues = checkVisualRhythm(blocks);

    const monotony = issues.filter(i => i.title.toLowerCase().includes('monotony'));
    expect(monotony.length).toBe(0);
  });

  it('warns about no dividers in a long page (>6 blocks)', () => {
    const blocks = makeBlocks('hero', 'text', 'photos', 'rsvp', 'text', 'gallery', 'guestbook');
    const issues = checkVisualRhythm(blocks);

    const noDividers = issues.find(i => i.title.includes('No visual breaks'));
    expect(noDividers).toBeDefined();
  });

  it('does not warn about dividers when dividers are present', () => {
    const blocks = makeBlocks('hero', 'text', 'divider', 'photos', 'divider', 'rsvp', 'text', 'gallery');
    const issues = checkVisualRhythm(blocks);

    const noDividers = issues.find(i => i.title.includes('No visual breaks'));
    expect(noDividers).toBeUndefined();
  });

  it('returns no issues for fewer than 3 blocks', () => {
    const blocks = makeBlocks('hero', 'text');
    const issues = checkVisualRhythm(blocks);
    expect(issues.length).toBe(0);
  });

  it('ignores spacer and other category blocks for monotony check', () => {
    const blocks = makeBlocks('divider', 'divider', 'divider');
    const issues = checkVisualRhythm(blocks);

    const monotony = issues.filter(i => i.title.toLowerCase().includes('monotony'));
    expect(monotony.length).toBe(0);
  });

  it('warns when interactive content is buried near the bottom', () => {
    // Interactive block at index 5 out of 6 (> 80%)
    const blocks = makeBlocks('hero', 'text', 'photos', 'gallery', 'text', 'rsvp');
    const issues = checkVisualRhythm(blocks);

    const buried = issues.find(i => i.title.includes('Interactive content buried'));
    expect(buried).toBeDefined();
  });
});

// ── detectContentNudges ─────────────────────────────────────

describe('detectContentNudges', () => {
  it('catches missing events (no events array)', () => {
    const nudges = detectContentNudges({
      chapters: [{ title: 'Our Story', body: 'Once upon a time...' }],
      events: [],
    });

    const eventNudge = nudges.find(n => n.id === 'no-events');
    expect(eventNudge).toBeDefined();
    expect(eventNudge!.priority).toBe('high');
  });

  it('catches no RSVP deadline when events exist', () => {
    const nudges = detectContentNudges({
      events: [{ date: '2026-06-15', time: '3pm', venue: 'Grand Hall' }],
      logistics: { date: '2026-06-15', venue: 'Grand Hall' },
    });

    const rsvpNudge = nudges.find(n => n.id === 'no-rsvp-deadline');
    expect(rsvpNudge).toBeDefined();
    expect(rsvpNudge!.priority).toBe('high');
  });

  it('does not flag RSVP deadline issue when no events exist', () => {
    const nudges = detectContentNudges({
      events: [],
      logistics: {},
    });

    const rsvpNudge = nudges.find(n => n.id === 'no-rsvp-deadline');
    expect(rsvpNudge).toBeUndefined();
  });

  it('catches empty chapters (no story)', () => {
    const nudges = detectContentNudges({
      chapters: [],
    });

    const chapterNudge = nudges.find(n => n.id === 'no-chapters');
    expect(chapterNudge).toBeDefined();
    expect(chapterNudge!.priority).toBe('high');
  });

  it('catches few chapters (less than 3)', () => {
    const nudges = detectContentNudges({
      chapters: [
        { title: 'Chapter 1', body: 'text' },
        { title: 'Chapter 2', body: 'text' },
      ],
    });

    const fewNudge = nudges.find(n => n.id === 'few-chapters');
    expect(fewNudge).toBeDefined();
    expect(fewNudge!.priority).toBe('medium');
  });

  it('does not flag few chapters when 3+ exist', () => {
    const nudges = detectContentNudges({
      chapters: [
        { title: 'Ch1', body: 'text' },
        { title: 'Ch2', body: 'text' },
        { title: 'Ch3', body: 'text' },
      ],
    });

    expect(nudges.find(n => n.id === 'no-chapters')).toBeUndefined();
    expect(nudges.find(n => n.id === 'few-chapters')).toBeUndefined();
  });

  it('catches chapters without photos', () => {
    const nudges = detectContentNudges({
      chapters: [
        { title: 'Ch1', body: 'text', images: [] },
        { title: 'Ch2', body: 'text', images: [{ url: 'pic.jpg' } as unknown] },
      ],
    });

    const photoNudge = nudges.find(n => n.id === 'chapters-no-photos');
    expect(photoNudge).toBeDefined();
  });

  it('catches no registry', () => {
    const nudges = detectContentNudges({
      registry: { entries: [] },
    });

    expect(nudges.find(n => n.id === 'no-registry')).toBeDefined();
  });

  it('catches no FAQs', () => {
    const nudges = detectContentNudges({ faqs: [] });

    expect(nudges.find(n => n.id === 'no-faqs')).toBeDefined();
  });

  it('catches no wedding party for wedding occasion', () => {
    const nudges = detectContentNudges({
      occasion: 'wedding',
      weddingParty: [],
    });

    expect(nudges.find(n => n.id === 'no-wedding-party')).toBeDefined();
  });

  it('does not flag wedding party for birthday occasion', () => {
    const nudges = detectContentNudges({
      occasion: 'birthday',
      weddingParty: [],
    });

    expect(nudges.find(n => n.id === 'no-wedding-party')).toBeUndefined();
  });

  it('returns nudges sorted by priority (high first)', () => {
    const nudges = detectContentNudges({
      chapters: [],
      events: [],
      faqs: [],
      registry: {},
    });

    // Verify high priority items come before low priority items
    const firstHigh = nudges.findIndex(n => n.priority === 'high');
    const lastLow = nudges.length - 1 - [...nudges].reverse().findIndex(n => n.priority === 'low');

    if (firstHigh !== -1 && lastLow !== -1 && lastLow < nudges.length) {
      expect(firstHigh).toBeLessThan(lastLow);
    }
  });

  it('includes AI prompts where applicable', () => {
    const nudges = detectContentNudges({ chapters: [] });

    const withPrompt = nudges.find(n => n.aiPrompt);
    expect(withPrompt).toBeDefined();
  });

  it('returns empty array for fully complete manifest', () => {
    const nudges = detectContentNudges({
      occasion: 'birthday', // no wedding party needed
      chapters: [
        { title: 'Ch1', body: 'text', images: [{ url: 'a.jpg' } as unknown] },
        { title: 'Ch2', body: 'text', images: [{ url: 'b.jpg' } as unknown] },
        { title: 'Ch3', body: 'text', images: [{ url: 'c.jpg' } as unknown] },
      ],
      events: [{ date: '2026-06-15', time: '3pm', venue: 'Grand Hall' }],
      logistics: { rsvpDeadline: '2026-06-01', venue: 'Grand Hall' },
      registry: { entries: [{ name: 'item' } as unknown], cashFundUrl: 'https://...' },
      travelInfo: { hotels: [{ name: 'Hotel' } as unknown] },
      faqs: [{ q: 'Dress code?', a: 'Formal' } as unknown],
    });

    expect(nudges.length).toBe(0);
  });
});

// ── colorTemperature ────────────────────────────────────────

describe('colorTemperature', () => {
  it('returns positive for warm colors (red/orange)', () => {
    expect(colorTemperature('#FF4400')).toBeGreaterThan(0);
  });

  it('returns negative for cool colors (blue)', () => {
    expect(colorTemperature('#0044FF')).toBeLessThan(0);
  });

  it('returns 0 for invalid hex', () => {
    expect(colorTemperature('')).toBe(0);
  });

  it('returns value between -1 and 1', () => {
    const warm = colorTemperature('#FF0000');
    const cool = colorTemperature('#0000FF');
    expect(warm).toBeLessThanOrEqual(1);
    expect(warm).toBeGreaterThanOrEqual(-1);
    expect(cool).toBeLessThanOrEqual(1);
    expect(cool).toBeGreaterThanOrEqual(-1);
  });
});

// ── temperatureAdvice ───────────────────────────────────────

describe('temperatureAdvice', () => {
  it('returns neutral for empty array', () => {
    const result = temperatureAdvice([]);
    expect(result.suggestion).toBe('neutral');
  });

  it('returns warm for warm-toned photo colors', () => {
    const result = temperatureAdvice(['#FF6600', '#FF8800', '#FFAA00']);
    expect(result.suggestion).toBe('warm');
  });

  it('returns cool for cool-toned photo colors', () => {
    const result = temperatureAdvice(['#0044FF', '#0066CC', '#3366FF']);
    expect(result.suggestion).toBe('cool');
  });
});

// ── heroTextColors ──────────────────────────────────────────

describe('heroTextColors', () => {
  it('returns light text colors for dark backgrounds', () => {
    const colors = heroTextColors('#000000');
    expect(colors.primary).toBe('#FFFFFF');
  });

  it('returns dark text colors for light backgrounds', () => {
    const colors = heroTextColors('#FFFFFF');
    expect(colors.primary).toBe('#1C1C1C');
  });

  it('returns default dark text for invalid hex', () => {
    const colors = heroTextColors('');
    expect(colors.primary).toBe('#1C1C1C');
  });
});

// ── textColorForBrightness ──────────────────────────────────

describe('textColorForBrightness', () => {
  it('returns light for dark backgrounds (brightness < 128)', () => {
    expect(textColorForBrightness(0)).toBe('light');
    expect(textColorForBrightness(50)).toBe('light');
    expect(textColorForBrightness(127)).toBe('light');
  });

  it('returns dark for light backgrounds (brightness >= 128)', () => {
    expect(textColorForBrightness(128)).toBe('dark');
    expect(textColorForBrightness(200)).toBe('dark');
    expect(textColorForBrightness(255)).toBe('dark');
  });
});
