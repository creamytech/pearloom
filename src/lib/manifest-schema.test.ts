// ─────────────────────────────────────────────────────────────
// manifest-schema — the write-boundary guardrail.
//
// The contract these tests defend: a VALID save is NEVER rejected
// (data loss beats a loose field), a structurally-BROKEN payload
// always is, and every accepted manifest carries the current
// schema version. If a test here fails, either the guardrail got
// too strict (rejecting real saves — a data-loss risk) or too
// loose (letting renderer-crashing shapes through).
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  validateManifestForWrite,
  migrateManifest,
  CURRENT_MANIFEST_VERSION,
} from './manifest-schema';

describe('validateManifestForWrite — rejects structural corruption', () => {
  it('rejects a non-object body', () => {
    for (const bad of [null, undefined, 42, 'a string', true]) {
      const r = validateManifestForWrite(bad);
      expect(r.ok, `${String(bad)} should be rejected`).toBe(false);
    }
  });

  it('rejects an array (the classic client-bug shape)', () => {
    const r = validateManifestForWrite([{ occasion: 'wedding' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/array/i);
  });

  it('rejects load-bearing fields with the wrong type', () => {
    const cases: Array<[string, unknown]> = [
      ['blockOrder', 'hero,story'],       // string, not string[]
      ['blockOrder', [1, 2, 3]],           // number[], not string[]
      ['faqs', { a: 1 }],                  // object, not array
      ['events', 'none'],                  // string, not array
      ['themeVars', ['--t-a']],            // array, not object
      ['theme', 'santorini'],              // string, not object
      ['occasion', ['wedding']],           // array, not string
      ['names', { 0: 'A' }],               // object, not array
    ];
    for (const [field, value] of cases) {
      const r = validateManifestForWrite({ occasion: 'wedding', [field]: value });
      expect(r.ok, `${field}=${JSON.stringify(value)} should be rejected`).toBe(false);
      if (!r.ok) expect(r.field).toBe(field);
    }
  });
});

describe('validateManifestForWrite — accepts real manifests', () => {
  it('accepts a full, well-formed manifest and stamps the version', () => {
    const m = {
      occasion: 'wedding',
      subdomain: 'emma-and-james',
      names: ['Emma', 'James'],
      blockOrder: ['hero', 'story', 'rsvp'],
      hiddenSections: ['registry'],
      faqs: [{ id: 'f1', question: 'Q', answer: 'A', order: 0 }],
      events: [{ id: 'e1', name: 'Ceremony' }],
      chapters: [{ id: 'c1', title: 'How we met' }],
      themeVars: { '--t-accent': '#8a9a5b' },
      theme: { colors: { accent: '#8a9a5b' } },
      blockVariants: { hero: 'postcard' },
      translations: { es: { faq: [] } },
      galleryImages: ['https://r2/1.jpg'],
    };
    const r = validateManifestForWrite(m);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.manifest.schemaVersion).toBe(CURRENT_MANIFEST_VERSION);
      expect(r.manifest.occasion).toBe('wedding');
      expect(r.manifest.blockOrder).toEqual(['hero', 'story', 'rsvp']);
    }
  });

  it('accepts an almost-empty manifest (early wizard state)', () => {
    const r = validateManifestForWrite({ subdomain: 'new-site' });
    expect(r.ok).toBe(true);
  });

  it('accepts a manifest with absent optional fields (they default in the renderer)', () => {
    const r = validateManifestForWrite({ occasion: 'memorial' });
    expect(r.ok).toBe(true);
  });

  it('treats explicit null on an optional field as absent, not malformed', () => {
    // Historical manifests carry `field: null` for cleared sections;
    // that must not be read as a type violation.
    const r = validateManifestForWrite({ occasion: 'wedding', blockOrder: null, themeVars: null });
    expect(r.ok).toBe(true);
  });

  it('does not mutate the input', () => {
    const m = { occasion: 'wedding' } as Record<string, unknown>;
    validateManifestForWrite(m);
    expect('schemaVersion' in m).toBe(false);
  });

  it('preserves unknown / future fields untouched (forward-compatible)', () => {
    const r = validateManifestForWrite({ occasion: 'wedding', someFutureField: { deep: [1, 2] } });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.manifest as unknown as Record<string, unknown>).someFutureField).toEqual({ deep: [1, 2] });
    }
  });
});

describe('migrateManifest', () => {
  it('is idempotent — re-stamping an already-current manifest is a no-op on content', () => {
    const once = migrateManifest({ occasion: 'wedding' });
    const twice = migrateManifest(once as unknown as Record<string, unknown>);
    expect(twice.schemaVersion).toBe(CURRENT_MANIFEST_VERSION);
    expect(twice.occasion).toBe('wedding');
  });

  it('stamps a legacy (unversioned) manifest to the current version', () => {
    const migrated = migrateManifest({ occasion: 'anniversary' });
    expect(migrated.schemaVersion).toBe(CURRENT_MANIFEST_VERSION);
  });
});
