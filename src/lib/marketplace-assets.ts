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
): AssetItem {
  return { id, name, type, url: `/assets/packs/${id}`, category };
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
    asset('botanical-icons/rose', 'Rose', 'svg', 'icons'),
    asset('botanical-icons/lily', 'Lily', 'svg', 'icons'),
    asset('botanical-icons/fern', 'Fern', 'svg', 'icons'),
    asset('botanical-icons/olive-branch', 'Olive Branch', 'svg', 'icons'),
    asset('botanical-icons/eucalyptus', 'Eucalyptus', 'svg', 'icons'),
    asset('botanical-icons/lavender', 'Lavender', 'svg', 'icons'),
    asset('botanical-icons/sunflower', 'Sunflower', 'svg', 'icons'),
    asset('botanical-icons/daisy', 'Daisy', 'svg', 'icons'),
    asset('botanical-icons/peony', 'Peony', 'svg', 'icons'),
    asset('botanical-icons/tulip', 'Tulip', 'svg', 'icons'),
    asset('botanical-icons/magnolia', 'Magnolia', 'svg', 'icons'),
    asset('botanical-icons/wildflower', 'Wildflower', 'svg', 'icons'),
    asset('botanical-icons/succulent', 'Succulent', 'svg', 'icons'),
    asset('botanical-icons/monstera', 'Monstera', 'svg', 'icons'),
    asset('botanical-icons/palm', 'Palm', 'svg', 'icons'),
    asset('botanical-icons/ivy', 'Ivy', 'svg', 'icons'),
    asset('botanical-icons/wreath', 'Wreath', 'svg', 'icons'),
    asset('botanical-icons/bouquet', 'Bouquet', 'svg', 'icons'),
    asset('botanical-icons/laurel', 'Laurel', 'svg', 'icons'),
    asset('botanical-icons/vine', 'Vine', 'svg', 'icons'),
    asset('botanical-icons/blossom', 'Blossom', 'svg', 'icons'),
    asset('botanical-icons/leaf', 'Leaf', 'svg', 'icons'),
    asset('botanical-icons/acorn', 'Acorn', 'svg', 'icons'),
    asset('botanical-icons/berry', 'Berry', 'svg', 'icons'),
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
    asset('art-deco-icons/fan', 'Fan', 'svg', 'icons'),
    asset('art-deco-icons/chevron', 'Chevron', 'svg', 'icons'),
    asset('art-deco-icons/keystone', 'Keystone', 'svg', 'icons'),
    asset('art-deco-icons/sunburst', 'Sunburst', 'svg', 'icons'),
    asset('art-deco-icons/pyramid', 'Pyramid', 'svg', 'icons'),
    asset('art-deco-icons/diamond', 'Diamond', 'svg', 'icons'),
    asset('art-deco-icons/arch', 'Arch', 'svg', 'icons'),
    asset('art-deco-icons/column', 'Column', 'svg', 'icons'),
    asset('art-deco-icons/feather', 'Feather', 'svg', 'icons'),
    asset('art-deco-icons/gatsby', 'Gatsby', 'svg', 'icons'),
    asset('art-deco-icons/chandelier', 'Chandelier', 'svg', 'icons'),
    asset('art-deco-icons/champagne', 'Champagne', 'svg', 'icons'),
    asset('art-deco-icons/cocktail', 'Cocktail', 'svg', 'icons'),
    asset('art-deco-icons/gramophone', 'Gramophone', 'svg', 'icons'),
    asset('art-deco-icons/compass', 'Compass', 'svg', 'icons'),
    asset('art-deco-icons/crown', 'Crown', 'svg', 'icons'),
    asset('art-deco-icons/shield', 'Shield', 'svg', 'icons'),
    asset('art-deco-icons/monogram-frame', 'Monogram Frame', 'svg', 'icons'),
    asset('art-deco-icons/ornate-border', 'Ornate Border', 'svg', 'icons'),
    asset('art-deco-icons/geometric-rose', 'Geometric Rose', 'svg', 'icons'),
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
