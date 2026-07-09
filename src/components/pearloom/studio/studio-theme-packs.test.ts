import { describe, expect, it } from 'vitest';
import { PACKS } from '@/lib/theme-store/packs';
import {
  isPackLookId,
  packFont,
  packFromLookId,
  packLookId,
  packPalette,
  packStudioTexture,
  packThemeRootStyle,
} from './studio-theme-packs';

describe('pack look ids', () => {
  it('round-trips every catalog pack', () => {
    for (const pack of PACKS) {
      const id = packLookId(pack.id);
      expect(isPackLookId(id)).toBe(true);
      expect(packFromLookId(id)?.id).toBe(pack.id);
    }
  });

  it('rejects non-pack ids (presets, site sentinel, junk)', () => {
    for (const id of ['lavender', 'site', '', 'packless', 'PACK:x']) {
      expect(isPackLookId(id)).toBe(false);
      expect(packFromLookId(id)).toBeNull();
    }
    expect(packFromLookId(null)).toBeNull();
    expect(packFromLookId(undefined)).toBeNull();
  });

  it('resolves a retired pack id to null (stale-manifest fallback)', () => {
    expect(packFromLookId('pack:this-pack-never-existed')).toBeNull();
  });
});

describe('pack look resolution', () => {
  const pack = PACKS[0];

  it('builds a var()-based palette so the mounted bag wins', () => {
    const p = packPalette(pack);
    expect(p.id).toBe(packLookId(pack.id));
    expect(p.paper).toBe('var(--t-paper)');
    expect(p.ink).toBe('var(--t-ink)');
    expect(p.accent).toBe('var(--t-accent)');
  });

  it('builds a var()-based font pair', () => {
    const f = packFont(pack);
    expect(f.id).toBe(packLookId(pack.id));
    expect(f.display).toBe('var(--t-display)');
    expect(f.ui).toBe('var(--t-body)');
  });

  it('every pack carries a mountable --t-* bag and rail swatches', () => {
    for (const p of PACKS) {
      const root = packThemeRootStyle(p) as Record<string, string>;
      expect(root['--t-paper']).toBeTruthy();
      expect(root['--t-ink']).toBeTruthy();
      expect(root['--t-accent']).toBeTruthy();
      expect(root['--t-display']).toBeTruthy();
      expect(p.swatches).toHaveLength(4);
    }
  });

  it("maps the 'none' texture to smooth (null)", () => {
    const smooth = PACKS.find((p) => p.texture === 'none');
    const grained = PACKS.find((p) => p.texture !== 'none');
    if (smooth) expect(packStudioTexture(smooth)).toBeNull();
    if (grained) expect(packStudioTexture(grained!)).toBe(grained!.texture);
  });
});
