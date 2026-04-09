// ─────────────────────────────────────────────────────────────
// Pearloom / lib/marketplace-assets.ts
// Curated Asset Packs — premium downloadable packs of icons,
// backgrounds, decorative accents, and stickers for the
// marketplace.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface AssetItem {
  id: string;
  name: string;
  type: 'svg' | 'png' | 'pattern';
  url: string;
  category: string;
  svgContent?: string; // Inline SVG for preview rendering
}

export interface AssetPack {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  previewDescription: string;
  tags: string[];
  category: 'icons' | 'backgrounds' | 'accents' | 'stickers';
  items: AssetItem[];
}

// ── Helper ───────────────────────────────────────────────────

function asset(
  id: string,
  name: string,
  type: 'svg' | 'png' | 'pattern',
  category: string,
  svgContent?: string,
): AssetItem {
  return { id, name, type, url: `/assets/packs/${id}`, category, svgContent };
}

// ── Icon Packs ───────────────────────────────────────────────

const botanicalIcons: AssetPack = {
  id: 'botanical-icons',
  name: 'Botanical Icons',
  description:
    '24 hand-drawn botanical SVG icons featuring flowers, leaves, and organic forms perfect for garden-themed and nature-inspired designs.',
  price: 299,
  previewDescription:
    'Delicate hand-drawn botanicals ranging from classic roses and peonies to trendy monstera and eucalyptus sprigs.',
  tags: ['garden', 'floral', 'botanical', 'organic', 'nature'],
  category: 'icons',
  items: [
    asset('botanical-icons/rose', 'Rose', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="5"/><ellipse cx="24" cy="14" rx="5" ry="8"/><ellipse cx="24" cy="34" rx="5" ry="8"/><ellipse cx="14" cy="24" rx="8" ry="5"/><ellipse cx="34" cy="24" rx="8" ry="5"/><ellipse cx="17" cy="17" rx="6" ry="4" transform="rotate(-45 17 17)"/></svg>'),
    asset('botanical-icons/lily', 'Lily', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 6c-3 8-10 14-10 22 3-2 7-3 10-2 3-1 7 0 10 2 0-8-7-14-10-22z"/><line x1="24" y1="28" x2="24" y2="44" stroke="currentColor" stroke-width="2"/></svg>'),
    asset('botanical-icons/fern', 'Fern', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 4v40" stroke="currentColor" stroke-width="2" fill="none"/><path d="M24 10l-8 4M24 16l-10 5M24 22l-11 5M24 28l-9 4M24 34l-6 3M24 10l8 4M24 16l10 5M24 22l11 5M24 28l9 4M24 34l6 3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'),
    asset('botanical-icons/olive-branch', 'Olive Branch', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 40Q24 24 40 8" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="16" cy="30" rx="3" ry="5" transform="rotate(-30 16 30)"/><ellipse cx="22" cy="24" rx="3" ry="5" transform="rotate(-35 22 24)"/><ellipse cx="28" cy="18" rx="3" ry="5" transform="rotate(-40 28 18)"/><ellipse cx="34" cy="12" rx="3" ry="5" transform="rotate(-45 34 12)"/></svg>'),
    asset('botanical-icons/eucalyptus', 'Eucalyptus', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 4v40" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="18" cy="12" r="4"/><circle cx="30" cy="18" r="4"/><circle cx="18" cy="24" r="4"/><circle cx="30" cy="30" r="4"/><circle cx="18" cy="36" r="4"/></svg>'),
    asset('botanical-icons/lavender', 'Lavender', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><line x1="24" y1="20" x2="24" y2="44" stroke="currentColor" stroke-width="2"/><ellipse cx="24" cy="8" rx="3" ry="2"/><ellipse cx="21" cy="11" rx="3" ry="2"/><ellipse cx="27" cy="11" rx="3" ry="2"/><ellipse cx="21" cy="15" rx="3" ry="2"/><ellipse cx="27" cy="15" rx="3" ry="2"/><ellipse cx="24" cy="18" rx="3" ry="2"/></svg>'),
    asset('botanical-icons/sunflower', 'Sunflower', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="22" r="6"/><ellipse cx="24" cy="10" rx="3" ry="6"/><ellipse cx="24" cy="34" rx="3" ry="6"/><ellipse cx="12" cy="22" rx="6" ry="3"/><ellipse cx="36" cy="22" rx="6" ry="3"/><ellipse cx="16" cy="14" rx="5" ry="3" transform="rotate(-45 16 14)"/><ellipse cx="32" cy="14" rx="5" ry="3" transform="rotate(45 32 14)"/><ellipse cx="16" cy="30" rx="5" ry="3" transform="rotate(45 16 30)"/><ellipse cx="32" cy="30" rx="5" ry="3" transform="rotate(-45 32 30)"/></svg>'),
    asset('botanical-icons/daisy', 'Daisy', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="4"/><ellipse cx="24" cy="12" rx="3" ry="7"/><ellipse cx="24" cy="36" rx="3" ry="7"/><ellipse cx="12" cy="24" rx="7" ry="3"/><ellipse cx="36" cy="24" rx="7" ry="3"/><ellipse cx="16" cy="16" rx="6" ry="3" transform="rotate(-45 16 16)"/><ellipse cx="32" cy="16" rx="6" ry="3" transform="rotate(45 32 16)"/><ellipse cx="16" cy="32" rx="6" ry="3" transform="rotate(45 16 32)"/><ellipse cx="32" cy="32" rx="6" ry="3" transform="rotate(-45 32 32)"/></svg>'),
    asset('botanical-icons/peony', 'Peony', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="4"/><circle cx="24" cy="24" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 4"/></svg>'),
    asset('botanical-icons/tulip', 'Tulip', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 6c-6 4-10 10-10 16h20c0-6-4-12-10-16z"/><line x1="24" y1="22" x2="24" y2="44" stroke="currentColor" stroke-width="2.5"/><path d="M24 30c-4 0-8-2-10-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'),
    asset('botanical-icons/magnolia', 'Magnolia', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24" cy="12" rx="5" ry="10"/><ellipse cx="14" cy="22" rx="5" ry="10" transform="rotate(60 14 22)"/><ellipse cx="34" cy="22" rx="5" ry="10" transform="rotate(-60 34 22)"/><ellipse cx="14" cy="30" rx="5" ry="10" transform="rotate(120 14 30)"/><ellipse cx="34" cy="30" rx="5" ry="10" transform="rotate(-120 34 30)"/><ellipse cx="24" cy="36" rx="5" ry="10" transform="rotate(180 24 36)"/></svg>'),
    asset('botanical-icons/wildflower', 'Wildflower', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="18" r="3"/><circle cx="18" cy="14" r="2.5"/><circle cx="30" cy="14" r="2.5"/><circle cx="20" cy="20" r="2.5"/><circle cx="28" cy="20" r="2.5"/><line x1="24" y1="22" x2="24" y2="44" stroke="currentColor" stroke-width="2"/><path d="M24 32l-6 4M24 28l6 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'),
    asset('botanical-icons/succulent', 'Succulent', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24" cy="24" r="4"/><ellipse cx="24" cy="16" rx="4" ry="6"/><ellipse cx="24" cy="32" rx="4" ry="6"/><ellipse cx="16" cy="24" rx="6" ry="4"/><ellipse cx="32" cy="24" rx="6" ry="4"/><ellipse cx="17" cy="17" rx="5" ry="3" transform="rotate(-45 17 17)"/><ellipse cx="31" cy="17" rx="5" ry="3" transform="rotate(45 31 17)"/><ellipse cx="17" cy="31" rx="5" ry="3" transform="rotate(45 17 31)"/><ellipse cx="31" cy="31" rx="5" ry="3" transform="rotate(-45 31 31)"/></svg>'),
    asset('botanical-icons/monstera', 'Monstera', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 4C12 10 8 24 10 38l14-2 14 2c2-14-2-28-14-34z"/><ellipse cx="20" cy="20" rx="3" ry="4" fill="white"/><ellipse cx="28" cy="22" rx="2" ry="5" fill="white"/><ellipse cx="18" cy="30" rx="2" ry="4" fill="white"/><line x1="24" y1="38" x2="24" y2="46" stroke="currentColor" stroke-width="2.5"/></svg>'),
    asset('botanical-icons/palm', 'Palm', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 24l-18-8c6-2 14 0 18 8z"/><path d="M24 24l18-8c-6-2-14 0-18 8z"/><path d="M24 24l-14 6c4-6 10-8 14-6z"/><path d="M24 24l14 6c-4-6-10-8-14-6z"/><path d="M24 24l0-18c-2 6-2 12 0 18z"/><line x1="24" y1="24" x2="24" y2="46" stroke="currentColor" stroke-width="2.5"/></svg>'),
    asset('botanical-icons/ivy', 'Ivy', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 6Q20 16 24 24Q28 32 38 42" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M14 10l-3-1c1 3 3 4 3 1z"/><path d="M20 18l-4-1c1 4 4 5 4 1z"/><path d="M26 26l4-1c-1 4-4 5-4 1z"/><path d="M32 34l4-1c-1 4-4 5-4 1z"/></svg>'),
    asset('botanical-icons/wreath', 'Wreath', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="16" rx="3" ry="2" transform="rotate(-30 12 16)"/><ellipse cx="10" cy="26" rx="3" ry="2" transform="rotate(20 10 26)"/><ellipse cx="16" cy="36" rx="3" ry="2" transform="rotate(50 16 36)"/><ellipse cx="32" cy="36" rx="3" ry="2" transform="rotate(-50 32 36)"/><ellipse cx="38" cy="26" rx="3" ry="2" transform="rotate(-20 38 26)"/><ellipse cx="36" cy="16" rx="3" ry="2" transform="rotate(30 36 16)"/><ellipse cx="24" cy="8" rx="3" ry="2"/></svg>'),
    asset('botanical-icons/bouquet', 'Bouquet', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="14" r="5"/><circle cx="30" cy="14" r="5"/><circle cx="24" cy="10" r="5"/><circle cx="15" cy="20" r="4"/><circle cx="33" cy="20" r="4"/><path d="M18 26l-4 18h20l-4-18z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 32h12" stroke="currentColor" stroke-width="1.5"/></svg>'),
    asset('botanical-icons/laurel', 'Laurel', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 44V38" stroke="currentColor" stroke-width="2"/><path d="M24 38Q16 32 12 24Q10 16 14 8"/><path d="M24 38Q32 32 36 24Q38 16 34 8"/><ellipse cx="14" cy="14" rx="3" ry="5" transform="rotate(20 14 14)" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="34" cy="14" rx="3" ry="5" transform="rotate(-20 34 14)" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'),
    asset('botanical-icons/vine', 'Vine', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 8Q16 16 16 24Q16 32 24 32Q32 32 32 24Q32 16 40 8" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="12" cy="14" rx="3" ry="2"/><ellipse cx="18" cy="28" rx="3" ry="2"/><ellipse cx="30" cy="28" rx="3" ry="2"/><ellipse cx="36" cy="14" rx="3" ry="2"/></svg>'),
    asset('botanical-icons/blossom', 'Blossom', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 40Q14 30 24 24" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="18" cy="18" r="2"/><circle cx="14" cy="22" r="3"/><circle cx="22" cy="14" r="3"/><circle cx="26" cy="22" r="2"/><circle cx="20" cy="26" r="2"/><path d="M14 22l-3 2M22 14l-1-3M18 18l0-4" stroke="currentColor" stroke-width="1" fill="none"/></svg>'),
    asset('botanical-icons/leaf', 'Leaf', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 40Q8 24 20 12Q32 4 40 8Q36 20 24 32Q16 38 12 40z"/><path d="M12 40Q20 28 36 10" stroke="white" stroke-width="1.5" fill="none"/></svg>'),
    asset('botanical-icons/acorn', 'Acorn', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 20h20c0-6-4-10-10-10s-10 4-10 10z"/><ellipse cx="24" cy="32" rx="8" ry="12"/><rect x="22" y="6" width="4" height="6" rx="2"/></svg>'),
    asset('botanical-icons/berry', 'Berry', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 8Q24 4 34 8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M24 8v10" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="24" r="5"/><circle cx="30" cy="24" r="5"/><circle cx="24" cy="20" r="5"/><circle cx="21" cy="32" r="5"/><circle cx="27" cy="32" r="5"/></svg>'),
  ],
};

const artDecoIcons: AssetPack = {
  id: 'art-deco-icons',
  name: 'Art Deco Icons',
  description:
    '20 geometric Art Deco SVG icons inspired by the roaring twenties, featuring bold symmetry and glamorous motifs.',
  price: 299,
  previewDescription:
    'Bold geometric shapes and Gatsby-era motifs — fans, sunbursts, and ornate frames dripping with golden-age glamour.',
  tags: ['art deco', 'gatsby', 'geometric', 'gold', 'glamour'],
  category: 'icons',
  items: [
    asset('art-deco-icons/fan', 'Fan', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 40L6 12h36L24 40z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M24 40L12 12M24 40L18 12M24 40V12M24 40L30 12M24 40L36 12" stroke="currentColor" stroke-width="1"/><path d="M6 12a18 18 0 0 1 36 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>'),
    asset('art-deco-icons/chevron', 'Chevron', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 16l18 16 18-16" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 24l18 16 18-16" fill="none" stroke="currentColor" stroke-width="2"/></svg>'),
    asset('art-deco-icons/keystone', 'Keystone', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 40l4-32h20l4 32H10z" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" stroke-width="1"/></svg>'),
    asset('art-deco-icons/sunburst', 'Sunburst', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="6"/><g stroke="currentColor" stroke-width="1.5"><line x1="24" y1="4" x2="24" y2="14"/><line x1="24" y1="34" x2="24" y2="44"/><line x1="4" y1="24" x2="14" y2="24"/><line x1="34" y1="24" x2="44" y2="24"/><line x1="10" y1="10" x2="17" y2="17"/><line x1="31" y1="31" x2="38" y2="38"/><line x1="38" y1="10" x2="31" y2="17"/><line x1="17" y1="31" x2="10" y2="38"/></g></svg>'),
    asset('art-deco-icons/pyramid', 'Pyramid', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 4L4 42h40L24 4z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M24 4v38M4 42l20-20 20 20" stroke="currentColor" stroke-width="1" fill="none"/></svg>'),
    asset('art-deco-icons/diamond', 'Diamond', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="4" width="28" height="28" rx="2" transform="rotate(45 24 24)" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="24" y="12" width="17" height="17" rx="1" transform="rotate(45 24 24)" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'),
    asset('art-deco-icons/arch', 'Arch', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 44V20a16 16 0 0 1 32 0v24" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M16 44V24a8 8 0 0 1 16 0v20" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'),
    asset('art-deco-icons/column', 'Column', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="14" y="8" width="20" height="4" rx="1"/><rect x="16" y="12" width="16" height="28"/><rect x="14" y="40" width="20" height="4" rx="1"/><line x1="20" y1="12" x2="20" y2="40" stroke="white" stroke-width="1"/><line x1="24" y1="12" x2="24" y2="40" stroke="white" stroke-width="1"/><line x1="28" y1="12" x2="28" y2="40" stroke="white" stroke-width="1"/></svg>'),
    asset('art-deco-icons/feather', 'Feather', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M36 4Q20 12 12 36l2 2Q28 22 36 4z"/><path d="M12 36l-4 8 4-2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M14 38Q24 24 34 8" stroke="white" stroke-width="1" fill="none"/></svg>'),
    asset('art-deco-icons/gatsby', 'Gatsby', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="24" cy="24" r="3"/><line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" stroke-width="1"/><line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="1"/></svg>'),
    asset('art-deco-icons/chandelier', 'Chandelier', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><line x1="24" y1="2" x2="24" y2="10" stroke="currentColor" stroke-width="2"/><path d="M10 10h28" stroke="currentColor" stroke-width="2"/><path d="M10 10l4 14M24 10v18M38 10l-4 14" stroke="currentColor" stroke-width="1.5" fill="none"/><ellipse cx="14" cy="28" rx="4" ry="6"/><ellipse cx="24" cy="32" rx="4" ry="6"/><ellipse cx="34" cy="28" rx="4" ry="6"/></svg>'),
    asset('art-deco-icons/champagne', 'Champagne', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18 6h12l-2 20h-8L18 6z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="24" y1="26" x2="24" y2="38" stroke="currentColor" stroke-width="2"/><path d="M16 38h16" stroke="currentColor" stroke-width="2.5"/><circle cx="22" cy="14" r="1.5"/><circle cx="26" cy="10" r="1"/></svg>'),
    asset('art-deco-icons/cocktail', 'Cocktail', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 8h28L24 26 10 8z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="24" y1="26" x2="24" y2="40" stroke="currentColor" stroke-width="2"/><path d="M16 40h16" stroke="currentColor" stroke-width="2.5"/><line x1="10" y1="14" x2="38" y2="14" stroke="currentColor" stroke-width="1"/><circle cx="36" cy="6" r="2"/></svg>'),
    asset('art-deco-icons/gramophone', 'Gramophone', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M28 6l6-2v14l-6 2V6z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M28 14Q20 18 18 26" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="18" cy="34" rx="12" ry="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="18" y1="26" x2="18" y2="34" stroke="currentColor" stroke-width="2"/></svg>'),
    asset('art-deco-icons/compass', 'Compass', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="24,6 27,22 24,26 21,22"/><polygon points="24,42 21,26 24,22 27,26" fill="none" stroke="currentColor" stroke-width="1"/><line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="1"/><circle cx="24" cy="24" r="3"/></svg>'),
    asset('art-deco-icons/crown', 'Crown', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M8 34l4-20 8 10 4-14 4 14 8-10 4 20H8z" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="8" y="34" width="32" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>'),
    asset('art-deco-icons/shield', 'Shield', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 4L6 12v14c0 10 8 16 18 18 10-2 18-8 18-18V12L24 4z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M24 10L12 16v10c0 7 5 11 12 13 7-2 12-6 12-13V16L24 10z" fill="none" stroke="currentColor" stroke-width="1"/></svg>'),
    asset('art-deco-icons/monogram-frame', 'Monogram Frame', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="10" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1"/><line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="42" y1="6" x2="38" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="42" x2="10" y2="38" stroke="currentColor" stroke-width="1.5"/><line x1="42" y1="42" x2="38" y2="38" stroke="currentColor" stroke-width="1.5"/></svg>'),
    asset('art-deco-icons/ornate-border', 'Ornate Border', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v2H6v14H4V4z" stroke="currentColor" stroke-width="1" fill="none"/><path d="M8 8h8v2H10v8H8V8z" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="20" r="1.5"/></svg>'),
    asset('art-deco-icons/geometric-rose', 'Geometric Rose', 'svg', 'icons', '<svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="24,4 28,20 44,24 28,28 24,44 20,28 4,24 20,20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="16" y="16" width="16" height="16" transform="rotate(45 24 24)" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="24" cy="24" r="4"/></svg>'),
  ],
};

const minimalistIcons: AssetPack = {
  id: 'minimalist-icons',
  name: 'Minimalist Icons',
  description:
    '20 clean-line SVG icons with a modern, pared-back aesthetic ideal for contemporary and editorial designs.',
  price: 299,
  previewDescription:
    'Crisp single-weight line icons that pair beautifully with sans-serif typography and whitespace-forward layouts.',
  tags: ['minimal', 'clean', 'modern', 'simple', 'line-art'],
  category: 'icons',
  items: [
    asset('minimalist-icons/heart-line', 'Heart Line', 'svg', 'icons'),
    asset('minimalist-icons/ring-simple', 'Ring Simple', 'svg', 'icons'),
    asset('minimalist-icons/glass-toast', 'Glass Toast', 'svg', 'icons'),
    asset('minimalist-icons/map-pin', 'Map Pin', 'svg', 'icons'),
    asset('minimalist-icons/calendar-line', 'Calendar Line', 'svg', 'icons'),
    asset('minimalist-icons/gift-box', 'Gift Box', 'svg', 'icons'),
    asset('minimalist-icons/plane-simple', 'Plane Simple', 'svg', 'icons'),
    asset('minimalist-icons/camera-line', 'Camera Line', 'svg', 'icons'),
    asset('minimalist-icons/music-note', 'Music Note', 'svg', 'icons'),
    asset('minimalist-icons/envelope-line', 'Envelope Line', 'svg', 'icons'),
    asset('minimalist-icons/star-simple', 'Star Simple', 'svg', 'icons'),
    asset('minimalist-icons/clock-line', 'Clock Line', 'svg', 'icons'),
    asset('minimalist-icons/home-line', 'Home Line', 'svg', 'icons'),
    asset('minimalist-icons/key-line', 'Key Line', 'svg', 'icons'),
    asset('minimalist-icons/compass-line', 'Compass Line', 'svg', 'icons'),
    asset('minimalist-icons/feather-line', 'Feather Line', 'svg', 'icons'),
    asset('minimalist-icons/flower-line', 'Flower Line', 'svg', 'icons'),
    asset('minimalist-icons/sun-line', 'Sun Line', 'svg', 'icons'),
    asset('minimalist-icons/moon-line', 'Moon Line', 'svg', 'icons'),
    asset('minimalist-icons/sparkle-line', 'Sparkle Line', 'svg', 'icons'),
  ],
};

// ── Background Packs ─────────────────────────────────────────

const watercolorWashes: AssetPack = {
  id: 'watercolor-washes',
  name: 'Watercolor Washes',
  description:
    '8 hand-painted watercolor background PNGs with soft, organic color transitions perfect for romantic and artistic designs.',
  price: 399,
  previewDescription:
    'Dreamy hand-painted washes in a curated palette — from blushing pinks to sage greens, each texture is unique and unrepeatable.',
  tags: ['watercolor', 'painted', 'soft', 'artistic', 'texture'],
  category: 'backgrounds',
  items: [
    asset('watercolor-washes/blush-wash', 'Blush Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/sage-wash', 'Sage Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/sunset-wash', 'Sunset Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/ocean-wash', 'Ocean Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/lavender-wash', 'Lavender Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/golden-wash', 'Golden Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/dusty-rose-wash', 'Dusty Rose Wash', 'png', 'backgrounds'),
    asset('watercolor-washes/mint-wash', 'Mint Wash', 'png', 'backgrounds'),
  ],
};

const marbleAndStone: AssetPack = {
  id: 'marble-and-stone',
  name: 'Marble & Stone',
  description:
    '8 luxury stone texture PNGs featuring high-resolution marble, slate, and terrazzo surfaces for elegant, upscale designs.',
  price: 399,
  previewDescription:
    'Rich, high-resolution stone surfaces — from classic white Carrara to dramatic black onyx and playful terrazzo.',
  tags: ['marble', 'stone', 'luxury', 'texture', 'elegant'],
  category: 'backgrounds',
  items: [
    asset('marble-and-stone/white-marble', 'White Marble', 'png', 'backgrounds'),
    asset('marble-and-stone/black-marble', 'Black Marble', 'png', 'backgrounds'),
    asset('marble-and-stone/rose-gold-marble', 'Rose Gold Marble', 'png', 'backgrounds'),
    asset('marble-and-stone/travertine', 'Travertine', 'png', 'backgrounds'),
    asset('marble-and-stone/slate', 'Slate', 'png', 'backgrounds'),
    asset('marble-and-stone/sandstone', 'Sandstone', 'png', 'backgrounds'),
    asset('marble-and-stone/onyx', 'Onyx', 'png', 'backgrounds'),
    asset('marble-and-stone/terrazzo', 'Terrazzo', 'png', 'backgrounds'),
  ],
};

const gradientMeshes: AssetPack = {
  id: 'gradient-meshes',
  name: 'Gradient Meshes',
  description:
    '8 fluid gradient mesh patterns with smooth, multi-point color transitions for modern and vibrant designs.',
  price: 399,
  previewDescription:
    'Silky fluid gradients that shift through carefully chosen color stops — aurora blues, sunset oranges, and champagne golds.',
  tags: ['gradient', 'mesh', 'modern', 'fluid', 'colorful'],
  category: 'backgrounds',
  items: [
    asset('gradient-meshes/aurora', 'Aurora (Blue-Purple)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/sunset', 'Sunset (Orange-Pink)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/ocean', 'Ocean (Teal-Blue)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/forest', 'Forest (Green-Emerald)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/champagne', 'Champagne (Gold-Cream)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/rose', 'Rose (Pink-Blush)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/twilight', 'Twilight (Purple-Navy)', 'pattern', 'backgrounds'),
    asset('gradient-meshes/dawn', 'Dawn (Peach-Lavender)', 'pattern', 'backgrounds'),
  ],
};

// ── Decorative Accent Packs ──────────────────────────────────

const cornerFlourishes: AssetPack = {
  id: 'corner-flourishes',
  name: 'Corner Flourishes',
  description:
    '12 ornate corner SVG decorations in styles from Victorian to modern geometric, each in top-left orientation for easy rotation.',
  price: 299,
  previewDescription:
    'Elegant corner ornaments spanning six distinct styles, each with a standard and detailed variation — rotate to fit any corner.',
  tags: ['corner', 'flourish', 'ornate', 'decorative', 'frame'],
  category: 'accents',
  items: [
    asset('corner-flourishes/victorian-corner', 'Victorian Corner', 'svg', 'accents'),
    asset('corner-flourishes/art-nouveau-corner', 'Art Nouveau Corner', 'svg', 'accents'),
    asset('corner-flourishes/botanical-corner', 'Botanical Corner', 'svg', 'accents'),
    asset('corner-flourishes/geometric-corner', 'Geometric Corner', 'svg', 'accents'),
    asset('corner-flourishes/minimal-corner', 'Minimal Corner', 'svg', 'accents'),
    asset('corner-flourishes/baroque-corner', 'Baroque Corner', 'svg', 'accents'),
    asset('corner-flourishes/victorian-corner-alt', 'Victorian Corner Alt', 'svg', 'accents'),
    asset('corner-flourishes/art-nouveau-corner-alt', 'Art Nouveau Corner Alt', 'svg', 'accents'),
    asset('corner-flourishes/botanical-corner-alt', 'Botanical Corner Alt', 'svg', 'accents'),
    asset('corner-flourishes/geometric-corner-alt', 'Geometric Corner Alt', 'svg', 'accents'),
    asset('corner-flourishes/minimal-corner-alt', 'Minimal Corner Alt', 'svg', 'accents'),
    asset('corner-flourishes/baroque-corner-alt', 'Baroque Corner Alt', 'svg', 'accents'),
  ],
};

const sectionDividers: AssetPack = {
  id: 'section-dividers',
  name: 'Section Dividers',
  description:
    '16 decorative divider SVGs for separating content sections with style — from delicate vines to bold geometric lines.',
  price: 299,
  previewDescription:
    'A versatile collection of horizontal dividers ranging from organic botanical garlands to crisp geometric patterns.',
  tags: ['divider', 'separator', 'border', 'line', 'section'],
  category: 'accents',
  items: [
    asset('section-dividers/vine-divider', 'Vine Divider', 'svg', 'accents'),
    asset('section-dividers/geometric-line', 'Geometric Line', 'svg', 'accents'),
    asset('section-dividers/wave-swoosh', 'Wave Swoosh', 'svg', 'accents'),
    asset('section-dividers/floral-garland', 'Floral Garland', 'svg', 'accents'),
    asset('section-dividers/arrow-divider', 'Arrow Divider', 'svg', 'accents'),
    asset('section-dividers/diamond-chain', 'Diamond Chain', 'svg', 'accents'),
    asset('section-dividers/dot-pattern', 'Dot Pattern', 'svg', 'accents'),
    asset('section-dividers/leaf-border', 'Leaf Border', 'svg', 'accents'),
    asset('section-dividers/scroll-divider', 'Scroll Divider', 'svg', 'accents'),
    asset('section-dividers/art-deco-line', 'Art Deco Line', 'svg', 'accents'),
    asset('section-dividers/minimal-dash', 'Minimal Dash', 'svg', 'accents'),
    asset('section-dividers/organic-branch', 'Organic Branch', 'svg', 'accents'),
    asset('section-dividers/ribbon', 'Ribbon', 'svg', 'accents'),
    asset('section-dividers/laurel', 'Laurel', 'svg', 'accents'),
    asset('section-dividers/braided', 'Braided', 'svg', 'accents'),
    asset('section-dividers/zigzag', 'Zigzag', 'svg', 'accents'),
  ],
};

const monogramFrames: AssetPack = {
  id: 'monogram-frames',
  name: 'Monogram Frames',
  description:
    '10 monogram frame SVGs for showcasing initials and crests — styles range from rustic wreaths to sleek modern geometry.',
  price: 299,
  previewDescription:
    'Beautiful frames designed to wrap around initials or monograms, from lush botanical wreaths to clean geometric shapes.',
  tags: ['monogram', 'frame', 'initials', 'crest', 'logo'],
  category: 'accents',
  items: [
    asset('monogram-frames/circle-wreath', 'Circle Wreath', 'svg', 'accents'),
    asset('monogram-frames/oval-botanical', 'Oval Botanical', 'svg', 'accents'),
    asset('monogram-frames/diamond-geometric', 'Diamond Geometric', 'svg', 'accents'),
    asset('monogram-frames/shield-crest', 'Shield Crest', 'svg', 'accents'),
    asset('monogram-frames/art-deco-frame', 'Art Deco Frame', 'svg', 'accents'),
    asset('monogram-frames/rustic-wood', 'Rustic Wood', 'svg', 'accents'),
    asset('monogram-frames/modern-square', 'Modern Square', 'svg', 'accents'),
    asset('monogram-frames/vintage-ornate', 'Vintage Ornate', 'svg', 'accents'),
    asset('monogram-frames/minimal-ring', 'Minimal Ring', 'svg', 'accents'),
    asset('monogram-frames/heart-frame', 'Heart Frame', 'svg', 'accents'),
  ],
};

// ── Sticker Packs ────────────────────────────────────────────

const romanticStickers: AssetPack = {
  id: 'romantic-stickers',
  name: 'Romantic Stickers',
  description:
    '15 decorative romantic sticker SVGs featuring hearts, rings, and celebration motifs for love-themed designs.',
  price: 199,
  previewDescription:
    'Playful and heartfelt stickers — from blushing hearts and intertwined rings to champagne toasts and confetti bursts.',
  tags: ['romantic', 'love', 'hearts', 'wedding', 'celebration'],
  category: 'stickers',
  items: [
    asset('romantic-stickers/heart-classic', 'Heart Classic', 'svg', 'stickers'),
    asset('romantic-stickers/heart-outline', 'Heart Outline', 'svg', 'stickers'),
    asset('romantic-stickers/heart-double', 'Heart Double', 'svg', 'stickers'),
    asset('romantic-stickers/rings', 'Rings', 'svg', 'stickers'),
    asset('romantic-stickers/dove', 'Dove', 'svg', 'stickers'),
    asset('romantic-stickers/champagne-glasses', 'Champagne Glasses', 'svg', 'stickers'),
    asset('romantic-stickers/love-letter', 'Love Letter', 'svg', 'stickers'),
    asset('romantic-stickers/rose', 'Rose', 'svg', 'stickers'),
    asset('romantic-stickers/kiss-mark', 'Kiss Mark', 'svg', 'stickers'),
    asset('romantic-stickers/infinity', 'Infinity', 'svg', 'stickers'),
    asset('romantic-stickers/bow', 'Bow', 'svg', 'stickers'),
    asset('romantic-stickers/sparkle-burst', 'Sparkle Burst', 'svg', 'stickers'),
    asset('romantic-stickers/confetti', 'Confetti', 'svg', 'stickers'),
    asset('romantic-stickers/balloon-pair', 'Balloon Pair', 'svg', 'stickers'),
    asset('romantic-stickers/cake', 'Cake', 'svg', 'stickers'),
  ],
};

const celestialStickers: AssetPack = {
  id: 'celestial-stickers',
  name: 'Celestial Stickers',
  description:
    '15 cosmic sticker SVGs featuring moons, stars, and celestial phenomena for dreamy, night-sky-inspired designs.',
  price: 199,
  previewDescription:
    'Ethereal cosmic elements — crescent moons, twinkling constellations, and swirling galaxies for a celestial atmosphere.',
  tags: ['celestial', 'stars', 'moon', 'cosmic', 'night'],
  category: 'stickers',
  items: [
    asset('celestial-stickers/moon-crescent', 'Moon Crescent', 'svg', 'stickers'),
    asset('celestial-stickers/moon-half', 'Moon Half', 'svg', 'stickers'),
    asset('celestial-stickers/moon-full', 'Moon Full', 'svg', 'stickers'),
    asset('celestial-stickers/star-classic', 'Star Classic', 'svg', 'stickers'),
    asset('celestial-stickers/star-burst', 'Star Burst', 'svg', 'stickers'),
    asset('celestial-stickers/star-tiny', 'Star Tiny', 'svg', 'stickers'),
    asset('celestial-stickers/constellation', 'Constellation', 'svg', 'stickers'),
    asset('celestial-stickers/sun', 'Sun', 'svg', 'stickers'),
    asset('celestial-stickers/planet', 'Planet', 'svg', 'stickers'),
    asset('celestial-stickers/comet', 'Comet', 'svg', 'stickers'),
    asset('celestial-stickers/galaxy-swirl', 'Galaxy Swirl', 'svg', 'stickers'),
    asset('celestial-stickers/zodiac-wheel', 'Zodiac Wheel', 'svg', 'stickers'),
    asset('celestial-stickers/shooting-star', 'Shooting Star', 'svg', 'stickers'),
    asset('celestial-stickers/eclipse', 'Eclipse', 'svg', 'stickers'),
    asset('celestial-stickers/nebula', 'Nebula', 'svg', 'stickers'),
  ],
};

const botanicalStickers: AssetPack = {
  id: 'botanical-stickers',
  name: 'Botanical Stickers',
  description:
    '15 nature sticker SVGs featuring leaves, flowers, and woodland elements for organic, garden-inspired designs.',
  price: 199,
  previewDescription:
    'Charming nature stickers — leafy clusters, tiny mushrooms, fluttering butterflies, and miniature wreaths from the garden.',
  tags: ['botanical', 'nature', 'garden', 'organic', 'plant'],
  category: 'stickers',
  items: [
    asset('botanical-stickers/leaf-cluster', 'Leaf Cluster', 'svg', 'stickers'),
    asset('botanical-stickers/flower-bunch', 'Flower Bunch', 'svg', 'stickers'),
    asset('botanical-stickers/fern-frond', 'Fern Frond', 'svg', 'stickers'),
    asset('botanical-stickers/mushroom', 'Mushroom', 'svg', 'stickers'),
    asset('botanical-stickers/butterfly', 'Butterfly', 'svg', 'stickers'),
    asset('botanical-stickers/bird', 'Bird', 'svg', 'stickers'),
    asset('botanical-stickers/acorn', 'Acorn', 'svg', 'stickers'),
    asset('botanical-stickers/pinecone', 'Pinecone', 'svg', 'stickers'),
    asset('botanical-stickers/berry-branch', 'Berry Branch', 'svg', 'stickers'),
    asset('botanical-stickers/succulent', 'Succulent', 'svg', 'stickers'),
    asset('botanical-stickers/cactus', 'Cactus', 'svg', 'stickers'),
    asset('botanical-stickers/sunflower', 'Sunflower', 'svg', 'stickers'),
    asset('botanical-stickers/daisy-chain', 'Daisy Chain', 'svg', 'stickers'),
    asset('botanical-stickers/wreath-mini', 'Wreath Mini', 'svg', 'stickers'),
    asset('botanical-stickers/seed-pod', 'Seed Pod', 'svg', 'stickers'),
  ],
};

// ── Full Collection ──────────────────────────────────────────

export const MARKETPLACE_PACKS: AssetPack[] = [
  // Icons
  botanicalIcons,
  artDecoIcons,
  minimalistIcons,
  // Backgrounds
  watercolorWashes,
  marbleAndStone,
  gradientMeshes,
  // Decorative Accents
  cornerFlourishes,
  sectionDividers,
  monogramFrames,
  // Stickers
  romanticStickers,
  celestialStickers,
  botanicalStickers,
];

// ── Helpers ──────────────────────────────────────────────────

/**
 * Return all packs that belong to a given category
 * (e.g. "icons", "backgrounds", "accents", "stickers").
 */
export function getPacksByCategory(type: string): AssetPack[] {
  return MARKETPLACE_PACKS.filter((pack) => pack.category === type);
}

/**
 * Search packs by a free-text query. Matches against the pack
 * name, description, and tags (case-insensitive).
 */
export function searchPacks(query: string): AssetPack[] {
  const lower = query.toLowerCase();
  return MARKETPLACE_PACKS.filter((pack) => {
    if (pack.name.toLowerCase().includes(lower)) return true;
    if (pack.description.toLowerCase().includes(lower)) return true;
    return pack.tags.some((tag) => tag.toLowerCase().includes(lower));
  });
}

/**
 * Find a single pack by its unique ID.
 */
export function getPackById(id: string): AssetPack | undefined {
  return MARKETPLACE_PACKS.find((pack) => pack.id === id);
}
