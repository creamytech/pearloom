import { describe, it, expect } from 'vitest';
import { DEFAULT_VARIANT, LAYOUTS, readVariant } from './layouts';

describe('LAYOUTS registry', () => {
  it("every section's default variant id exists in its registry", () => {
    for (const [section, def] of Object.entries(DEFAULT_VARIANT)) {
      const variants = LAYOUTS[section as keyof typeof LAYOUTS];
      expect(variants, section).toBeTruthy();
      expect(variants!.map((v) => v.id), section).toContain(def);
    }
  });

  it("the map registry no longer offers 'static' (cut 2026-07-02 — it was a live iframe with clicks off)", () => {
    expect(LAYOUTS.map!.map((v) => v.id)).not.toContain('static');
  });

  it("manifests still carrying layouts.map='static' keep resolving (renderer falls through to embed)", () => {
    /* readVariant returns the stored pick verbatim; MapBlock has no
       'static' branch any more, so this id lands on the default
       embed path. The contract pinned here is just "no crash + a
       string comes back". */
    expect(readVariant({ layouts: { map: 'static' } }, 'map')).toBe('static');
    expect(readVariant({}, 'map')).toBe('embed');
  });
});
