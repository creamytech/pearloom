/* design-tryon — pure snapshot/apply/restore helpers. These back
   the hover try-on on the canvas root; the invariants under test:
   the baseline accumulates across successive previews (sliding
   tile → tile never snapshots a preview as "original"), restore
   removes keys that had no inline value, and the theme-var
   expansion mirrors themeRootStyle's alias + literal writes. */

import { describe, it, expect } from 'vitest';
import {
  applyPatch,
  captureBaseline,
  emptySnapshot,
  expandThemeVarsForPreview,
  restoreBaseline,
  type TryOnTarget,
} from './design-tryon';

function fakeTarget(initial?: { vars?: Record<string, string>; attrs?: Record<string, string> }) {
  const vars = new Map(Object.entries(initial?.vars ?? {}));
  const attrs = new Map(Object.entries(initial?.attrs ?? {}));
  const t: TryOnTarget = {
    getVar: (n) => vars.get(n) ?? '',
    setVar: (n, v) => { vars.set(n, v); },
    removeVar: (n) => { vars.delete(n); },
    getAttr: (n) => (attrs.has(n) ? attrs.get(n)! : null),
    setAttr: (n, v) => { attrs.set(n, v); },
    removeAttr: (n) => { attrs.delete(n); },
  };
  return { t, vars, attrs };
}

describe('captureBaseline + applyPatch + restoreBaseline', () => {
  it('restores the exact pre-preview values on cancel', () => {
    const { t, vars, attrs } = fakeTarget({
      vars: { '--t-accent': '#111111' },
      attrs: { 'data-pl-kit': 'classic' },
    });
    const snap = emptySnapshot();
    const patch = { vars: { '--t-accent': '#ABCDEF' }, attrs: { 'data-pl-kit': 'ticket' } };

    captureBaseline(t, patch, snap);
    applyPatch(t, patch);
    expect(vars.get('--t-accent')).toBe('#ABCDEF');
    expect(attrs.get('data-pl-kit')).toBe('ticket');

    restoreBaseline(t, snap);
    expect(vars.get('--t-accent')).toBe('#111111');
    expect(attrs.get('data-pl-kit')).toBe('classic');
  });

  it('removes keys that had no inline value before the preview', () => {
    const { t, vars, attrs } = fakeTarget();
    const snap = emptySnapshot();
    const patch = { vars: { '--t-gold': '#C19A4B' }, attrs: { 'data-pl-texture': 'linen' } };

    captureBaseline(t, patch, snap);
    applyPatch(t, patch);
    restoreBaseline(t, snap);

    expect(vars.has('--t-gold')).toBe(false);
    expect(attrs.has('data-pl-texture')).toBe(false);
  });

  it('accumulates the baseline across successive previews — the first value wins', () => {
    const { t, vars } = fakeTarget({ vars: { '--t-accent': '#123456' } });
    const original = '#123456';
    const snap = emptySnapshot();

    const tileA = { vars: { '--t-accent': '#AAAAAA' } };
    captureBaseline(t, tileA, snap);
    applyPatch(t, tileA);

    /* Sliding to tile B — the baseline must NOT re-capture #AAAAAA. */
    const tileB = { vars: { '--t-accent': '#BBBBBB', '--t-paper': '#FFFFF0' } };
    captureBaseline(t, tileB, snap);
    applyPatch(t, tileB);

    restoreBaseline(t, snap);
    expect(vars.get('--t-accent')).toBe(original);
    expect(vars.has('--t-paper')).toBe(false);
  });

  it('styles keys ride the same capture/restore path', () => {
    const { t, vars } = fakeTarget({ vars: { background: '#FBF7EE' } });
    const snap = emptySnapshot();
    const patch = { styles: { background: '#14110C', color: '#F2EFE6' } };

    captureBaseline(t, patch, snap);
    applyPatch(t, patch);
    expect(vars.get('background')).toBe('#14110C');

    restoreBaseline(t, snap);
    expect(vars.get('background')).toBe('#FBF7EE');
    expect(vars.has('color')).toBe(false);
  });
});

describe('expandThemeVarsForPreview', () => {
  it('mirrors themeRootStyle: aliases + literal background/color/font', () => {
    const out = expandThemeVarsForPreview({
      '--t-paper': '#FBF7EE',
      '--t-ink': '#2A2418',
      '--t-body': "'Inter', sans-serif",
      '--t-display': "'Fraunces', serif",
    });
    expect(out.vars?.['--paper']).toBe('#FBF7EE');
    expect(out.vars?.['--cream']).toBe('#FBF7EE');
    expect(out.vars?.['--ink']).toBe('#2A2418');
    expect(out.vars?.['--font-display']).toBe("'Fraunces', serif");
    expect(out.styles?.background).toBe('#FBF7EE');
    expect(out.styles?.color).toBe('#2A2418');
    expect(out.styles?.['font-family']).toBe("'Inter', sans-serif");
  });

  it('a fonts-only preview never touches the palette', () => {
    const out = expandThemeVarsForPreview({ '--t-display': "'Cinzel', serif", '--t-body': "'Tenor Sans', sans-serif" });
    expect(out.styles?.background).toBeUndefined();
    expect(out.styles?.color).toBeUndefined();
    expect(out.vars?.['--paper']).toBeUndefined();
    expect(out.vars?.['--font-display']).toBe("'Cinzel', serif");
  });
});
