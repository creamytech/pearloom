'use client';

// ──────────────────────────────────────────────────────────────
// NavBrandIcon — renders the brand glyph in the top nav based on
// manifest.nav.icon. Four kinds:
//   - 'pear' (default) — the Pearloom mark
//   - 'asset' — pick from src/components/pearloom/assets/nav-icons
//   - 'image' — uploaded PNG/JPEG (any URL)
//   - 'ai' — generated via gpt-image-2 (uploaded URL after gen)
//
// Falls back to 'pear' on any malformed config so the nav never
// crashes on a bad manifest.
// ──────────────────────────────────────────────────────────────

import { Pear } from '../motifs';
import { getNavIcon } from '../assets/nav-icons';
import type { StoryManifest } from '@/types';

interface Props {
  manifest: StoryManifest;
  size?: number;
}

export function NavBrandIcon({ manifest, size = 28 }: Props) {
  const cfg = manifest.nav?.icon;
  const kind = cfg?.kind ?? 'pear';

  if (kind === 'asset' && cfg?.assetId) {
    const asset = getNavIcon(cfg.assetId);
    if (asset) {
      const C = asset.Component;
      return (
        <span style={{ display: 'inline-flex', color: 'var(--ink)' }}>
          <C size={size} />
        </span>
      );
    }
    // Asset id not found — fall through to default.
  }

  if ((kind === 'image' || kind === 'ai') && cfg?.imageUrl) {
    return (
      <img
        src={cfg.imageUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  return <Pear size={size} tone="sage" shadow={false} />;
}
