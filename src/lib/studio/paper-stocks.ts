// ─────────────────────────────────────────────────────────────
// Pearloom / lib/studio/paper-stocks.ts
//
// The Studio's physical paper stocks (STUDIO-PLAN SV.2) — a pure
// module so SERVER surfaces can read them too: /api/invite-card
// presses the per-guest email card on the same sheet the Studio
// canvas shows. The Studio's client constants re-export from
// here; there is exactly one stock table.
// ─────────────────────────────────────────────────────────────

export interface PaperStock {
  id: string;
  name: string;
  paper: string;
  /** Ink override for sheets the palette's ink can't sit on. */
  ink?: string;
  /** Dark sheet — suppresses the light-paper noise overlay. */
  dark?: boolean;
}

export const PAPER_STOCKS: ReadonlyArray<PaperStock> = [
  { id: 'bright', name: 'Bright white', paper: '#FFFFFF' },
  { id: 'cream',  name: 'Cream',        paper: '#FDFAF0' },
  { id: 'ecru',   name: 'Ecru',         paper: '#F2E9D8' },
  { id: 'blush',  name: 'Blush',        paper: '#FBEEEC' },
  { id: 'kraft',  name: 'Kraft',        paper: '#D9C09A', ink: '#3A2E1C' },
  { id: 'navy',   name: 'Navy',         paper: '#1F2236', ink: '#F8F1E4', dark: true },
];

export function paperStockById(id: string | null | undefined): PaperStock | null {
  if (!id) return null;
  return PAPER_STOCKS.find((s) => s.id === id) ?? null;
}
