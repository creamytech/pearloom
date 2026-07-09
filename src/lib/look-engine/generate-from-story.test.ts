import { describe, it, expect } from 'vitest';
import { generateLookFromStory } from './generate-from-story';

describe('generateLookFromStory', () => {
  it('detects Santorini → Linen Folder + Linen texture', () => {
    const look = generateLookFromStory('July wedding in Santorini, olive groves, relaxed');
    expect(look.occasion).toBe('wedding');
    expect(look.edition).toBe('linen-folder');
    expect(look.texture).toBe('linen');
    expect(look.voiceOverride).toBe('playful'); // 'relaxed' triggers playful
    expect(look.rationale).toMatch(/Wedding/);
  });

  it('detects Tuscan vineyard → Almanac + Watercolor + poetic', () => {
    const look = generateLookFromStory('Tuscan vineyard, lemons, romantic dreamy');
    expect(look.edition).toBe('almanac');
    expect(look.texture).toBe('watercolor');
    expect(look.voiceOverride).toBe('poetic');
  });

  it('detects black-tie evening → Cinema + Letterpress', () => {
    const look = generateLookFromStory('Black-tie evening gala, candlelit');
    expect(look.edition).toBe('cinema');
    expect(look.texture).toBe('letterpress');
  });

  it('detects modern minimal city → Quiet + Smooth + spacious', () => {
    const look = generateLookFromStory('Modern minimal city wedding');
    expect(look.edition).toBe('quiet');
    expect(look.texture).toBe('smooth');
    expect(look.density).toBe('spacious');
  });

  it('detects bachelor party → bachelor-party occasion + Postcard Box', () => {
    const look = generateLookFromStory('Bachelor party in Vegas');
    expect(look.occasion).toBe('bachelor-party');
    expect(look.edition).toBe('postcard-box');
    expect(look.texture).toBe('newsprint');
  });

  it('forces classic voice on somber occasions even with playful keywords', () => {
    const look = generateLookFromStory('Funeral, casual gathering');
    expect(look.occasion).toBe('funeral');
    expect(look.voiceOverride).toBe('classic');
    expect(look.edition).toBe('quiet');
  });

  it('detects cozy keyword → cozy density', () => {
    const look = generateLookFromStory('Cozy intimate dinner party for our anniversary');
    expect(look.occasion).toBe('anniversary');
    expect(look.density).toBe('cozy');
  });

  it('detects "subtle" → low textureIntensity', () => {
    const look = generateLookFromStory('Subtle understated wedding ceremony');
    expect(look.textureIntensity).toBe(0.5);
  });

  it('detects "rich textured" → high textureIntensity', () => {
    const look = generateLookFromStory('Rich textured bold wedding reception');
    expect(look.textureIntensity).toBe(1.4);
  });

  it('falls back to occasion-default Edition when no place/material keywords', () => {
    const look = generateLookFromStory('Anniversary dinner');
    expect(look.occasion).toBe('anniversary');
    expect(look.edition).toBe('almanac');
    expect(look.texture).toBe('letterpress');
  });

  it('falls back to wedding + almanac when nothing matches', () => {
    const look = generateLookFromStory('hello world');
    expect(look.occasion).toBe('wedding');
    expect(look.edition).toBe('almanac');
  });

  it('handles empty input gracefully', () => {
    const look = generateLookFromStory('');
    expect(look.occasion).toBe('wedding');
    expect(look.density).toBe('comfortable');
    expect(look.textureIntensity).toBe(1);
  });

  it('detects memorial → quiet + vellum + classic voice', () => {
    const look = generateLookFromStory('Celebration of life for my grandmother, intimate');
    expect(look.occasion).toBe('memorial');
    expect(look.edition).toBe('quiet');
    expect(look.texture).toBe('vellum');
    expect(look.voiceOverride).toBe('classic'); // somber overrides playful keywords
  });

  it('detects engagement → almanac + watercolor by default', () => {
    const look = generateLookFromStory('Just got engaged');
    expect(look.occasion).toBe('engagement');
    expect(look.edition).toBe('almanac');
    expect(look.texture).toBe('watercolor');
  });
});
