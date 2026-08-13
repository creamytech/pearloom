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

describe('isItemFree — design is free for everyone (EDITOR-CALM-PLAN E.1)', () => {
  const freeItem = { price: 0, type: 'template' } as Parameters<typeof isItemFree>[0];
  const paidTemplate = { price: 1200, type: 'template' } as Parameters<typeof isItemFree>[0];
  const paidAssetPack = { price: 499, type: 'icon-pack' } as Parameters<typeof isItemFree>[0];

  it('every item is free for every plan — including unknown plan names', () => {
    for (const item of [freeItem, paidTemplate, paidAssetPack]) {
      for (const plan of ['free', 'pro', 'premium', 'atelier', 'legacy', 'page', 'pass', 'keepsake', '', 'vip']) {
        expect(isItemFree(item, plan)).toBe(true);
      }
    }
  });
});
