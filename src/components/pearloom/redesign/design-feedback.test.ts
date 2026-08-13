/* design-feedback — the beacon's pure half. The mapping under
   test is a contract with the canvas markup: scoped selectors
   must match real elements ThemedSite renders ([data-motif-layer],
   .pl8-pattern-layer, [data-pl-divider], [data-pl-monogram]). */

import { describe, it, expect } from 'vitest';
import { beaconPlanFor, beaconText, type DesignChangeKind } from './design-feedback';

describe('beaconPlanFor', () => {
  it('whole-canvas kinds carry no selector', () => {
    const canvasKinds: DesignChangeKind[] = ['theme', 'colors', 'fonts', 'kit', 'texture', 'grain', 'spacing', 'layout', 'background', 'decor'];
    for (const k of canvasKinds) {
      const plan = beaconPlanFor(k);
      expect(plan.scope).toBe('canvas');
      expect(plan.selector).toBeUndefined();
    }
  });

  it('scoped kinds target the layers ThemedSite actually renders', () => {
    expect(beaconPlanFor('motifs')).toMatchObject({ scope: 'scoped', selector: '[data-motif-layer]' });
    expect(beaconPlanFor('pattern')).toMatchObject({ scope: 'scoped', selector: '.pl8-pattern-layer' });
    expect(beaconPlanFor('divider')).toMatchObject({ scope: 'scoped', selector: '[data-pl-divider]' });
    expect(beaconPlanFor('monogram')).toMatchObject({ scope: 'scoped', selector: '[data-pl-monogram]' });
    expect(beaconPlanFor('footer')).toMatchObject({ scope: 'scoped', selector: 'footer' });
    expect(beaconPlanFor('menu')).toMatchObject({ scope: 'scoped', selector: 'nav' });
  });

  it('every noun is a plain word — no craft vocabulary as labels (BRAND §7)', () => {
    const banned = ['palette', 'nav variant', 'density', 'hero', 'kit', 'edition'];
    const kinds: DesignChangeKind[] = ['theme', 'colors', 'fonts', 'kit', 'texture', 'grain', 'spacing', 'layout', 'background', 'decor', 'motifs', 'pattern', 'divider', 'monogram', 'menu', 'footer'];
    for (const k of kinds) {
      expect(banned).not.toContain(beaconPlanFor(k).noun.toLowerCase());
    }
  });
});

describe('beaconText', () => {
  it('joins noun and label with a middot', () => {
    expect(beaconText('texture', 'Linen')).toBe('Paper · Linen');
    expect(beaconText('spacing', 'Airy')).toBe('Spacing · Airy');
    expect(beaconText('kit', 'Ticket')).toBe('Cards · Ticket');
  });

  it('drops an empty or redundant label', () => {
    expect(beaconText('colors')).toBe('Colors');
    expect(beaconText('colors', '  ')).toBe('Colors');
    expect(beaconText('colors', 'colors')).toBe('Colors');
  });
});
