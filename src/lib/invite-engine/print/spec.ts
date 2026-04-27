// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/print/spec.ts
//
// Print-shop bridge (scaffold). Declares the output spec Lob /
// Gelato / Moo require for letterpress + digital card printing.
// No provider is wired yet — this file exists so the rest of
// the pipeline can hand us a PrintSpec and we can finish the
// integration without touching the designer UI.
//
// TODO: pick provider (Lob US, Gelato global, Moo premium),
// add an API route at /api/invite/print that uploads the CMYK
// PNG and returns a tracking URL.
// ─────────────────────────────────────────────────────────────

export type PrintStock =
  | 'cotton-letterpress'         // 110lb, deckle edge, tactile press
  | 'thick-matte'                // 100lb, flat CMYK
  | 'pearl-gloss'                // 100lb, pearlescent finish
  | 'recycled-kraft'             // recycled kraft with black ink only
  | 'vellum-overlay';            // translucent vellum, layered on top

export interface PrintSpec {
  /** Key in R2 for the final 300dpi CMYK PNG. */
  r2Key: string;
  /** Printed size in inches. 5x7 is the standard invite. */
  sizeInches: '5x7' | '4.25x5.5' | '5.5x8.5' | '4x6';
  stock: PrintStock;
  /** Number of copies. */
  quantity: number;
  /** Envelope preference. */
  envelope?: 'cream-cotton' | 'kraft' | 'ebony' | 'none';
  /** Shipping address id from the user profile. */
  shipToId: string;
}

export function estimateCents(spec: Pick<PrintSpec, 'sizeInches' | 'stock' | 'quantity'>): number {
  // Rough per-card prices in USD cents; will be replaced by
  // provider quotes when the integration lands.
  const base: Record<PrintStock, number> = {
    'cotton-letterpress': 650,
    'thick-matte': 180,
    'pearl-gloss': 240,
    'recycled-kraft': 150,
    'vellum-overlay': 380,
  };
  const sizeBump: Record<PrintSpec['sizeInches'], number> = {
    '4x6': 0, '4.25x5.5': 0, '5x7': 20, '5.5x8.5': 60,
  };
  const perCard = base[spec.stock] + sizeBump[spec.sizeInches];
  return perCard * spec.quantity;
}
