/* Living backgrounds — the v2 design system's interactive shader
   wallpapers (handoff-v2/ui_kits/wallpapers). The runtime lives at
   public/wallpaper-engine.js (window.PearloomWallpaper); this is the
   catalog the picker + store + renderer share. Prices/occasions match
   the v2 showcase; "Still Water" is always free for memorials.

   NOTE the price labels are catalog metadata for the future store
   listing — nothing charges for a wallpaper yet, and the editor
   picker deliberately shows no price. Wire through the theme-pack
   checkout (pl-store-owned + publish paywall) when wallpapers get
   their SKUs. */

export type WallpaperId = 'silk' | 'aurora' | 'water' | 'dust' | 'marble';

export interface WallpaperDef {
  id: WallpaperId;
  /** Display name, e.g. "Woven Silk". */
  name: string;
  /** The occasions it suits (shown in the picker/store). */
  occ: string;
  /** Store price label, e.g. "$12". */
  price: string;
  /** Always free (Still Water for memorials). */
  free?: boolean;
  /** Swatch gradient for the picker tile. */
  grad: string;
  desc: string;
}

export const WALLPAPERS: WallpaperDef[] = [
  { id: 'silk',   name: 'Woven Silk',    occ: 'Weddings',              price: '$12',  grad: 'linear-gradient(135deg,#5C6B3F,#C19A4B)', desc: 'Two threads, olive and gold, weave across warm paper — and lean toward your cursor.' },
  { id: 'aurora', name: 'Aurora Linen',  occ: 'Engagements & showers', price: '$12',  grad: 'linear-gradient(135deg,#FBE8D6,#8B9C5A 70%,#C19A4B)', desc: 'Soft bands of cream, peach and sage drift like light through a curtain.' },
  { id: 'water',  name: 'Still Water',   occ: 'Memorials',             price: 'Free', free: true, grad: 'linear-gradient(135deg,#1A1610,#6B5A8C 80%,#8B9C5A)', desc: 'A quiet pool that ripples where you rest your hand. Free, always, for memorials.' },
  { id: 'dust',   name: 'Gilded Dust',   occ: 'Anniversaries',         price: '$14',  grad: 'linear-gradient(135deg,#2A1E12,#C6703D 70%,#C19A4B)', desc: 'Golden motes drift on a warm ember ground and gather where you touch.' },
  { id: 'marble', name: 'Marbled Paper', occ: 'Garden & milestones',   price: '$14',  grad: 'linear-gradient(135deg,#FDFAF0,#D9A89E 55%,#8B9C5A)', desc: 'Hand-marbled ink — rose, sage and gold veins — that swirls under your cursor.' },
];

const WALLPAPER_IDS = new Set(WALLPAPERS.map((w) => w.id));

export function isWallpaperId(v: unknown): v is WallpaperId {
  return typeof v === 'string' && WALLPAPER_IDS.has(v as WallpaperId);
}
