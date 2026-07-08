// Tests for the Studio press-ready SVG serializer. Strict-XML
// rasterizers demand well-formed, escaped SVG — every layout ×
// motif combination must produce it at the 1000×1400 viewBox.

import { describe, it, expect } from 'vitest';
import { studioCardToPrintSvg, escapeXml, wrapText, type StudioCardSvgArgs } from './studio-card-svg';
import { PALETTES, FONT_PAIRS, LAYOUTS, MOTIFS, buildTypeContent } from './studio-constants';

function baseArgs(overrides: Partial<StudioCardSvgArgs> = {}): StudioCardSvgArgs {
  return {
    type: 'std',
    layout: 'classic',
    motif: 'stamp',
    palette: PALETTES[0],
    font: FONT_PAIRS[0],
    content: buildTypeContent({
      type: 'std',
      nameA: 'Emma',
      nameB: 'James',
      dateShort: 'Apr 26, 2027',
      dateLong: 'Monday, April 26, 2027',
      venue: 'The Orchard House',
      place: 'Hudson, New York',
      siteUrl: 'pearloom.com/wedding/emma-james',
    }),
    nameA: 'Emma',
    nameB: 'James',
    monogram: 'E&J',
    ...overrides,
  };
}

describe('studioCardToPrintSvg', () => {
  it('emits the 1000×1400 viewBox the print renderer expects', () => {
    const svg = studioCardToPrintSvg(baseArgs());
    expect(svg).toContain('viewBox="0 0 1000 1400"');
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('renders every layout × motif combination without throwing', () => {
    for (const layout of LAYOUTS) {
      for (const motif of MOTIFS) {
        const svg = studioCardToPrintSvg(baseArgs({ layout: layout.id, motif: motif.id }));
        expect(svg).toContain('</svg>');
        // Paper ground always present.
        expect(svg).toContain(`fill="${PALETTES[0].paper}"`);
      }
    }
  });

  it('carries the couple names and manifest-derived copy onto the card', () => {
    const svg = studioCardToPrintSvg(baseArgs());
    expect(svg).toContain('Emma');
    expect(svg).toContain('James');
    expect(svg).toContain('Monday, April 26, 2027');
  });

  it('escapes XML-hostile names instead of breaking the document', () => {
    const svg = studioCardToPrintSvg(baseArgs({ nameA: 'Anna & Co <3', layout: 'minimal', motif: 'none' }));
    expect(svg).toContain('Anna &amp; Co &lt;3');
    expect(svg).not.toContain('Co <3');
  });

  it('uses the gradient fallback when the photo layout has no inlined photo', () => {
    const svg = studioCardToPrintSvg(baseArgs({ layout: 'photo', photoDataUrl: null }));
    expect(svg).toContain('pl-photo-fallback');
    expect(svg).not.toContain('<image');
  });

  it('embeds an inlined data-URI photo on the photo layout', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const svg = studioCardToPrintSvg(baseArgs({ layout: 'photo', photoDataUrl: dataUrl }));
    expect(svg).toContain(`<image href="${dataUrl}"`);
  });

  it('prefers the inlined AI motif over the built-in glyph', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const svg = studioCardToPrintSvg(baseArgs({ motif: 'stamp', motifDataUrl: dataUrl }));
    expect(svg).toContain(`<image href="${dataUrl}"`);
    // The built-in stamp arc text must not double-render.
    expect(svg).not.toContain('pl-stamp-arc');
  });

  it('skips the paper-grain wash on the dark palette (matches the canvas)', () => {
    const twilight = PALETTES.find(p => p.id === 'twilight')!;
    const dark = studioCardToPrintSvg(baseArgs({ palette: twilight }));
    const light = studioCardToPrintSvg(baseArgs());
    expect(dark).not.toContain('pl-paper-noise');
    expect(light).toContain('pl-paper-noise');
  });

  it('renders a single name with no amp line on solo occasions', () => {
    const soloContent = buildTypeContent({
      type: 'std',
      nameA: 'Eleanor',
      nameB: '',
      dateShort: 'Apr 26, 2027',
      dateLong: 'Monday, April 26, 2027',
      venue: 'The Orchard House',
      place: 'Hudson, New York',
      siteUrl: 'pearloom.com/memorial/eleanor',
      occasion: 'memorial',
    });
    for (const layout of LAYOUTS) {
      const svg = studioCardToPrintSvg(baseArgs({
        layout: layout.id,
        nameA: 'Eleanor',
        nameB: '',
        monogram: 'E',
        content: soloContent,
      }));
      expect(svg).toContain('Eleanor');
      expect(svg).not.toContain('>and</text>');
      expect(svg).not.toContain('Eleanor &amp;');
    }
  });

  it('never emits a remote http(s) image reference (librsvg cannot fetch them)', () => {
    for (const layout of LAYOUTS) {
      const svg = studioCardToPrintSvg(baseArgs({
        layout: layout.id,
        photoDataUrl: null,
        motifDataUrl: null,
      }));
      expect(svg).not.toMatch(/href="https?:/);
    }
  });
});

describe('buildTypeContent occasion routing', () => {
  const base = {
    nameA: 'Eleanor', nameB: '',
    dateShort: 'Apr 26, 2027', dateLong: 'Monday, April 26, 2027',
    venue: 'The Orchard House', place: 'Hudson, New York',
    siteUrl: 'pearloom.com/memorial/eleanor',
  };

  it('keeps couple copy for the wedding arc', () => {
    const c = buildTypeContent({ ...base, type: 'std', nameA: 'Emma', nameB: 'James', occasion: 'wedding' });
    expect(c.line2).toBe('are getting married');
    expect(c.headline).toBe('Emma & James');
  });

  it('never says "are getting married" on non-wedding occasions', () => {
    for (const occasion of ['birthday', 'memorial', 'reunion', 'baby-shower', 'graduation']) {
      for (const type of ['std', 'invite', 'thanks'] as const) {
        const c = buildTypeContent({ ...base, type, occasion });
        const all = [c.eyebrow, c.line2, c.line4, c.cta, c.scriptBody, ...c.pearNudges].join(' ');
        expect(all).not.toMatch(/getting married|wedding|couples/i);
      }
    }
  });

  it('routes solemn occasions to gathered-not-celebrated copy', () => {
    const std = buildTypeContent({ ...base, type: 'std', occasion: 'memorial' });
    expect(std.eyebrow).toBe('In loving memory');
    expect(std.stamp).toBe('IN MEMORY');
    const thanks = buildTypeContent({ ...base, type: 'thanks', occasion: 'memorial' });
    expect(thanks.line4).toBe('the family of Eleanor');
    const all = [std.line2, std.cta, std.scriptBody, thanks.line2].join(' ');
    expect(all).not.toMatch(/celebrat|party|can't wait/i);
  });

  it('solo cards carry one name in the headline', () => {
    const c = buildTypeContent({ ...base, type: 'invite', occasion: 'birthday' });
    expect(c.headline).toBe('Eleanor');
  });
});

describe('helpers', () => {
  it('escapeXml escapes the five XML metacharacters', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });

  it('wrapText wraps greedily and never returns an empty array', () => {
    expect(wrapText('save the date with us', 10)).toEqual(['save the', 'date with', 'us']);
    expect(wrapText('', 10)).toEqual(['']);
  });
});
