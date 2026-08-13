/* Living backgrounds — the v2 design system's interactive shader
   wallpapers (handoff-v2/ui_kits/wallpapers). The runtime lives at
   public/wallpaper-engine.js (window.PearloomWallpaper); this is the
   catalog the picker + renderer share. Every wallpaper is free —
   the dormant price metadata was stripped 2026-08-13
   (EDITOR-CALM-PLAN E.1): design is never the paywall. */

export type WallpaperId = 'silk' | 'aurora' | 'water' | 'dust' | 'marble';

export interface WallpaperDef {
  id: WallpaperId;
  /** Display name, e.g. "Woven Silk". */
  name: string;
  /** The occasions it suits (shown in the picker/store). */
  occ: string;
  /** Swatch gradient for the picker tile. */
  grad: string;
  desc: string;
}

export const WALLPAPERS: WallpaperDef[] = [
  { id: 'silk', name: 'Woven Silk', occ: 'Weddings', grad: 'linear-gradient(135deg,#5C6B3F,#C19A4B)', desc: 'Two threads, olive and gold, weave across warm paper, and lean toward your cursor.' },
  { id: 'aurora', name: 'Aurora Linen',  occ: 'Engagements & showers',  grad: 'linear-gradient(135deg,#FBE8D6,#8B9C5A 70%,#C19A4B)', desc: 'Soft bands of cream, peach and sage drift like light through a curtain.' },
  { id: 'water',  name: 'Still Water',   occ: 'Memorials',             grad: 'linear-gradient(135deg,#1A1610,#6B5A8C 80%,#8B9C5A)', desc: 'A quiet pool that ripples where you rest your hand. Free, always, for memorials.' },
  { id: 'dust',   name: 'Gilded Dust',   occ: 'Anniversaries',          grad: 'linear-gradient(135deg,#2A1E12,#C6703D 70%,#C19A4B)', desc: 'Golden motes drift on a warm ember ground and gather where you touch.' },
  { id: 'marble', name: 'Marbled Paper', occ: 'Garden & milestones', grad: 'linear-gradient(135deg,#FDFAF0,#D9A89E 55%,#8B9C5A)', desc: 'Hand-marbled ink (rose, sage and gold veins) that swirls under your cursor.' },
];

const WALLPAPER_IDS = new Set(WALLPAPERS.map((w) => w.id));

export function isWallpaperId(v: unknown): v is WallpaperId {
  return typeof v === 'string' && WALLPAPER_IDS.has(v as WallpaperId);
}
