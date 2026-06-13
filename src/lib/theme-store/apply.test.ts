// ─────────────────────────────────────────────────────────────
// Pearloom / lib/theme-store/apply.test.ts
//
// Covers the invariants applyPackToManifest must hold:
//   • returns a NEW manifest (no mutation of the input)
//   • writes theme.colors.{background, foreground, accent,
//     accentLight, muted, cardBg} from the pack's --t-* vars
//   • lifts theme.fonts.heading / .body from the pack font stacks
//     (first family extracted, surrounding quotes stripped)
//   • stamps kitId from pack.kit
//   • stamps texture / pattern only when the pack defines them
//   • preserves unrelated manifest fields (occasion, vibeString,
//     edition, siteLayout, etc.) so apply never clobbers picks
//     that aren't part of the pack
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { applyPackToManifest } from './apply';
import { PACKS, getPackById } from './packs';
import type { StoryManifest } from '@/types';

const baseManifest = {
  occasion: 'wedding',
  vibeString: 'editorial · sage · slow',
  edition: 'almanac',
  siteLayout: 'stacked',
  names: ['Avery', 'Wren'],
  theme: {
    colors: {
      background: '#FFFFFF',
      foreground: '#000000',
      accent: '#FF0000',
      accentLight: '#FFCCCC',
      muted: '#888888',
      cardBg: '#FAFAFA',
    },
    fonts: { heading: 'Old', body: 'Old' },
    cardRadius: 'lg',
  },
} as unknown as StoryManifest;

describe('applyPackToManifest', () => {
  it('returns a new manifest object', () => {
    const pack = PACKS[0]!;
    const next = applyPackToManifest(pack, baseManifest);
    expect(next).not.toBe(baseManifest);
  });

  it('does not mutate the input manifest', () => {
    const pack = PACKS[0]!;
    const snapshot = JSON.parse(JSON.stringify(baseManifest));
    applyPackToManifest(pack, baseManifest);
    expect(JSON.parse(JSON.stringify(baseManifest))).toEqual(snapshot);
  });

  it('writes theme.colors from the pack themeRef', () => {
    const pack = getPackById('santorini-linen')!;
    const next = applyPackToManifest(pack, baseManifest) as unknown as {
      theme: { colors: Record<string, string> };
    };
    expect(next.theme.colors.background).toBe(pack.themeRef['--t-paper']);
    expect(next.theme.colors.foreground).toBe(pack.themeRef['--t-ink']);
    expect(next.theme.colors.accent).toBe(pack.themeRef['--t-accent']);
  });

  it('lifts the first font family from --t-display / --t-body', () => {
    const pack = getPackById('santorini-linen')!;
    const next = applyPackToManifest(pack, baseManifest) as unknown as {
      theme: { fonts: Record<string, string> };
    };
    // Santorini Linen ships F.cormorant: "'Cormorant Garamond', Georgia, serif"
    expect(next.theme.fonts.heading).toBe('Cormorant Garamond');
    // No body override on the pack → falls through to F.inter default
    expect(next.theme.fonts.body).toBe('Inter');
  });

  it('stamps kitId from pack.kit', () => {
    const pack = getPackById('santorini-linen')!;
    const next = applyPackToManifest(pack, baseManifest) as unknown as {
      kitId: string;
    };
    expect(next.kitId).toBe(pack.kit);
  });

  it('only stamps texture when the pack defines a non-none texture', () => {
    const withTexture = getPackById('santorini-linen')!; // texture: 'linen'
    const nextA = applyPackToManifest(withTexture, baseManifest) as unknown as {
      texture: string;
    };
    expect(nextA.texture).toBe('linen');

    const noTexture = PACKS.find((p) => p.texture === 'none');
    if (noTexture) {
      const nextB = applyPackToManifest(noTexture, {
        ...baseManifest,
        texture: 'paper',
      } as unknown as StoryManifest) as unknown as { texture: string };
      // texture stays as the manifest's existing 'paper' — pack
      // didn't define one, so apply leaves it alone.
      expect(nextB.texture).toBe('paper');
    }
  });

  it('preserves unrelated manifest fields', () => {
    const pack = PACKS[0]!;
    const next = applyPackToManifest(pack, baseManifest) as unknown as Record<
      string,
      unknown
    >;
    expect(next.occasion).toBe('wedding');
    expect(next.vibeString).toBe('editorial · sage · slow');
    expect(next.edition).toBe('almanac');
    expect(next.siteLayout).toBe('stacked');
    expect(next.names).toEqual(['Avery', 'Wren']);
  });

  it('preserves unrelated theme fields like cardRadius', () => {
    const pack = PACKS[0]!;
    const next = applyPackToManifest(pack, baseManifest) as unknown as {
      theme: Record<string, unknown>;
    };
    expect(next.theme.cardRadius).toBe('lg');
  });

  it('stamps appliedPackId onto the manifest (the publish paywall reads it)', () => {
    // Reversed 2026-06-13: try-before-you-buy needs the receipt.
    // The editor applies any pack freely; /api/sites/publish gates
    // on ownership of manifest.appliedPackId. Without the stamp the
    // gate can't tell which pack a draft is wearing.
    const pack = PACKS[0]!;
    const next = applyPackToManifest(pack, baseManifest) as unknown as Record<
      string,
      unknown
    >;
    expect(next.appliedPackId).toBe(pack.id);
  });
});
