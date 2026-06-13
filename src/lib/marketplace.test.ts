import { describe, it, expect } from 'vitest';
import { formatPrice, isItemFree, MARKETPLACE_CATEGORIES } from './marketplace';
import type { MarketplaceItem } from './marketplace';

// ── Helper to create a MarketplaceItem ──────────────────────

function makeItem(overrides: Partial<MarketplaceItem> = {}): MarketplaceItem {
  return {
    id: 'item-1',
    type: 'template',
    name: 'Test Item',
    description: 'A test marketplace item',
    price: 499,
    currency: 'usd',
    creatorRevenue: 0.7,
    tags: ['wedding'],
    popularity: 100,
    purchaseCount: 50,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── formatPrice ─────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats 0 cents as "Free"', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('formats 399 cents as "$3.99"', () => {
    expect(formatPrice(399)).toBe('$3.99');
  });

  it('formats 499 cents as "$4.99"', () => {
    expect(formatPrice(499)).toBe('$4.99');
  });

  it('formats 1200 cents as "$12.00"', () => {
    expect(formatPrice(1200)).toBe('$12.00');
  });

  it('formats 1 cent as "$0.01"', () => {
    expect(formatPrice(1)).toBe('$0.01');
  });

  it('formats 100 cents as "$1.00"', () => {
    expect(formatPrice(100)).toBe('$1.00');
  });

  it('formats 9999 cents as "$99.99"', () => {
    expect(formatPrice(9999)).toBe('$99.99');
  });

  it('formats 50 cents as "$0.50"', () => {
    expect(formatPrice(50)).toBe('$0.50');
  });
});

// ── isItemFree ──────────────────────────────────────────────

describe('isItemFree', () => {
  describe('free items (price === 0)', () => {
    const freeItem = makeItem({ price: 0 });

    it('is always free for free plan', () => {
      expect(isItemFree(freeItem, 'free')).toBe(true);
    });

    it('is always free for pro plan', () => {
      expect(isItemFree(freeItem, 'pro')).toBe(true);
    });

    it('is always free for premium plan', () => {
      expect(isItemFree(freeItem, 'premium')).toBe(true);
    });

    it('is always free for atelier plan', () => {
      expect(isItemFree(freeItem, 'atelier')).toBe(true);
    });

    it('is always free for legacy plan', () => {
      expect(isItemFree(freeItem, 'legacy')).toBe(true);
    });
  });

  describe('paid templates', () => {
    const paidTemplate = makeItem({ price: 499, type: 'template' });

    it('is NOT free for free plan users', () => {
      expect(isItemFree(paidTemplate, 'free')).toBe(false);
    });

    it('IS free for pro plan users (templates included)', () => {
      expect(isItemFree(paidTemplate, 'pro')).toBe(true);
    });

    it('IS free for atelier plan users (templates included)', () => {
      expect(isItemFree(paidTemplate, 'atelier')).toBe(true);
    });

    it('IS free for premium plan users (everything included)', () => {
      expect(isItemFree(paidTemplate, 'premium')).toBe(true);
    });

    it('IS free for legacy plan users (everything included)', () => {
      expect(isItemFree(paidTemplate, 'legacy')).toBe(true);
    });
  });

  describe('paid asset packs (non-template)', () => {
    const iconPack = makeItem({ price: 299, type: 'icon-pack' });
    const themePack = makeItem({ price: 599, type: 'theme' });
    const stickerPack = makeItem({ price: 199, type: 'sticker-pack' });
    const bgPack = makeItem({ price: 399, type: 'background-pack' });
    const accentPack = makeItem({ price: 299, type: 'accent-pack' });
    const fontPairing = makeItem({ price: 149, type: 'font-pairing' });

    it('is NOT free for free plan users', () => {
      expect(isItemFree(iconPack, 'free')).toBe(false);
      expect(isItemFree(themePack, 'free')).toBe(false);
      expect(isItemFree(stickerPack, 'free')).toBe(false);
    });

    it('is NOT free for pro plan users (only templates are free for pro)', () => {
      expect(isItemFree(iconPack, 'pro')).toBe(false);
      expect(isItemFree(themePack, 'pro')).toBe(false);
      expect(isItemFree(stickerPack, 'pro')).toBe(false);
      expect(isItemFree(bgPack, 'pro')).toBe(false);
      expect(isItemFree(accentPack, 'pro')).toBe(false);
      expect(isItemFree(fontPairing, 'pro')).toBe(false);
    });

    it('is NOT free for atelier plan users (same as pro)', () => {
      expect(isItemFree(iconPack, 'atelier')).toBe(false);
      expect(isItemFree(themePack, 'atelier')).toBe(false);
    });

    it('IS free for premium plan users (everything included)', () => {
      expect(isItemFree(iconPack, 'premium')).toBe(true);
      expect(isItemFree(themePack, 'premium')).toBe(true);
      expect(isItemFree(stickerPack, 'premium')).toBe(true);
      expect(isItemFree(bgPack, 'premium')).toBe(true);
      expect(isItemFree(accentPack, 'premium')).toBe(true);
      expect(isItemFree(fontPairing, 'premium')).toBe(true);
    });

    it('IS free for legacy plan users (everything included)', () => {
      expect(isItemFree(iconPack, 'legacy')).toBe(true);
      expect(isItemFree(themePack, 'legacy')).toBe(true);
    });
  });

  describe('plan name case insensitivity', () => {
    const paidTemplate = makeItem({ price: 499, type: 'template' });

    it('handles uppercase plan names', () => {
      expect(isItemFree(paidTemplate, 'PRO')).toBe(true);
      expect(isItemFree(paidTemplate, 'PREMIUM')).toBe(true);
    });

    it('handles mixed case plan names', () => {
      expect(isItemFree(paidTemplate, 'Pro')).toBe(true);
      expect(isItemFree(paidTemplate, 'Premium')).toBe(true);
      expect(isItemFree(paidTemplate, 'Atelier')).toBe(true);
      expect(isItemFree(paidTemplate, 'Legacy')).toBe(true);
    });
  });

  describe('unknown plan names', () => {
    const paidItem = makeItem({ price: 499 });

    it('returns false for unrecognized plan names', () => {
      expect(isItemFree(paidItem, 'starter')).toBe(false);
      expect(isItemFree(paidItem, 'basic')).toBe(false);
      expect(isItemFree(paidItem, '')).toBe(false);
    });
  });
});

// ── MARKETPLACE_CATEGORIES ──────────────────────────────────

describe('MARKETPLACE_CATEGORIES', () => {
  it('has at least 5 categories', () => {
    expect(MARKETPLACE_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it('each category has an id and label', () => {
    for (const cat of MARKETPLACE_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });

  it('includes wedding category', () => {
    expect(MARKETPLACE_CATEGORIES.find(c => c.id === 'wedding')).toBeDefined();
  });
});
