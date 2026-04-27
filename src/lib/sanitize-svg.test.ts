import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from './sanitize-svg';

describe('sanitizeSvg', () => {
  it('returns empty string for falsy input', () => {
    expect(sanitizeSvg('')).toBe('');
    expect(sanitizeSvg(null as unknown as string)).toBe('');
    expect(sanitizeSvg(undefined as unknown as string)).toBe('');
  });

  it('preserves safe SVG markup', () => {
    const safe = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#5C6B3F"/></svg>';
    expect(sanitizeSvg(safe)).toBe(safe);
  });

  it('removes script tags', () => {
    const input = '<svg><script>alert("xss")</script><circle r="5"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('script');
    expect(result).toContain('<circle');
  });

  it('removes iframe tags', () => {
    const input = '<svg><iframe src="evil.com"></iframe></svg>';
    expect(sanitizeSvg(input)).not.toContain('iframe');
  });

  it('removes event handlers', () => {
    const input = '<svg><circle onclick="alert(1)" r="5"/></svg>';
    expect(sanitizeSvg(input)).not.toContain('onclick');
  });

  it('removes javascript: URLs', () => {
    const input = '<svg><a href="javascript:alert(1)"><circle r="5"/></a></svg>';
    expect(sanitizeSvg(input)).not.toContain('javascript:');
  });

  it('removes object and embed tags', () => {
    const input = '<svg><object data="evil.swf"></object><embed src="evil.swf"></embed></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('object');
    expect(result).not.toContain('embed');
  });

  it('removes foreignObject tags', () => {
    const input = '<svg><foreignObject><div>evil</div></foreignObject></svg>';
    expect(sanitizeSvg(input)).not.toContain('foreignObject');
  });
});
