/* Content-aware icons for the Details section (2026-07-02).

   The old assignment was positional — ['sparkles','users','gift']
   by card index — so a "Parking" card wore a gift glyph the moment
   it wasn't third in the list. This maps the card's LABEL to a
   semantic glyph from the motifs Icon set; unmatched labels fall
   back to the old positional trio so existing three-card sites
   render pixel-identical.

   Consumed by ThemedSite's buildCopy (details items) and by
   DetailsPanel's row glyphs, so the rail preview and the canvas
   can never disagree. Pure + unit-tested (details-icons.test.ts). */

const RULES: Array<{ icon: string; re: RegExp }> = [
  { icon: 'car',      re: /\b(parking|valet|shuttle|transport|carpool|taxi|uber|lyft|driving|drive|cars?)\b/i },
  { icon: 'hanger',   re: /\b(dress|attire|wardrobe|wear|outfit|black.?tie|suit)\b/i },
  { icon: 'users',    re: /\b(kids?|children|family|adults?|plus.?ones?|guests?|babysit)\b/i },
  { icon: 'gift',     re: /\b(gifts?|registry|presents?|donations?|flowers|in lieu)\b/i },
  { icon: 'home',     re: /\b(hotels?|stay|lodging|rooms?|accommodation|airbnb)\b/i },
  { icon: 'pin',      re: /\b(venue|address|location|where|directions)\b/i },
  { icon: 'clock',    re: /\b(time|timing|when|arrival|doors|curfew|schedule)\b/i },
  { icon: 'sun',      re: /\b(weather|outdoors?|rain|sunscreen|heat|shade)\b/i },
  { icon: 'camera',   re: /\b(photos?|camera|unplugged|pictures?|social)\b/i },
  { icon: 'music',    re: /\b(music|dancing|dance|playlist|band|dj)\b/i },
  { icon: 'fleuron',  re: /\b(food|menu|dinner|drinks?|bar|dietary|cocktails?|dessert|cake)\b/i },
  { icon: 'mail',     re: /\b(rsvp|contact|questions?|reach)\b/i },
  { icon: 'lock',     re: /\b(privacy|password|private)\b/i },
];

/* The pre-2026-07 positional trio — the fallback when a label
   matches nothing, so legacy cards keep their exact glyphs. */
const POSITIONAL = ['sparkles', 'users', 'gift'] as const;

/** Semantic icon for a details-card label; positional fallback. */
export function detailsIconFor(label: string, index: number): string {
  const l = (label ?? '').trim();
  if (l) {
    for (const { icon, re } of RULES) {
      if (re.test(l)) return icon;
    }
  }
  return POSITIONAL[index % POSITIONAL.length];
}
