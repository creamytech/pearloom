import { describe, expect, it } from 'vitest';
import { applyVibeLook, vibeLookSummary, VIBE_LOOKS } from './vibe-look';
import type { StoryManifest } from '@/types';

const m = (overrides: Record<string, unknown> = {}) =>
  ({ occasion: 'wedding', ...overrides }) as unknown as StoryManifest;

type Loose = {
  edition?: string;
  kitId?: string;
  density?: string;
  layouts?: Record<string, string>;
  themeVars?: Record<string, string>;
};

describe('applyVibeLook', () => {
  it('no vibes → manifest untouched', () => {
    const input = m();
    expect(applyVibeLook(input, [])).toBe(input);
  });

  it('fills the look axes from a vibe', () => {
    const out = applyVibeLook(m(), ['editorial']) as unknown as Loose;
    expect(out.kitId).toBe('index');
    expect(out.layouts?.hero).toBe('spread');
    expect(out.layouts?.gallery).toBe('frames');
    expect(out.themeVars?.['--t-display-wght']).toBe('560');
  });

  it('never overwrites — explicit fields win', () => {
    const out = applyVibeLook(
      m({ kitId: 'classic', edition: 'cinema', layouts: { hero: 'crest' }, themeVars: { '--t-display-wght': '500' } }),
      ['editorial', 'elegant'],
    ) as unknown as Loose;
    expect(out.kitId).toBe('classic');
    expect(out.edition).toBe('cinema');
    expect(out.layouts?.hero).toBe('crest');
    expect(out.themeVars?.['--t-display-wght']).toBe('500');
    // but empty axes still fill (elegant's schedule lands)
    expect(out.layouts?.story).toBe('quote');
  });

  it('first vibe is loudest per axis', () => {
    const out = applyVibeLook(m(), ['quiet', 'bold']) as unknown as Loose;
    expect(out.layouts?.hero).toBe('minimal'); // quiet wins hero
    expect(out.kitId).toBe('minimal');
    // bold still contributes what quiet left empty
    expect(out.themeVars?.['--t-display-wght']).toBe('680');
  });

  it('unknown vibe ids are ignored', () => {
    const out = applyVibeLook(m(), ['not-a-vibe']) as unknown as Loose;
    expect(out.kitId).toBeUndefined();
  });

  it('every catalog entry carries a summary phrase', () => {
    for (const [id, look] of Object.entries(VIBE_LOOKS)) {
      expect(look.summary, id).toBeTruthy();
    }
  });
});

describe('vibeLookSummary', () => {
  it('joins picked summaries in order', () => {
    const s = vibeLookSummary(['quiet', 'editorial']);
    expect(s).toContain('whitespace');
    expect(s).toContain('framed photos');
  });
  it('empty for unknown-only picks', () => {
    expect(vibeLookSummary(['zzz'])).toBe('');
  });
});
