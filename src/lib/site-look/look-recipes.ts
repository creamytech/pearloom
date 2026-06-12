// ─────────────────────────────────────────────────────────────
// look-recipes — the wizard's three end-of-flow LOOKS.
//
// A look is everything BUT the palette: component kit, paper
// texture (+ intensity), ornament placement, rhythm. The wizard
// pairs each recipe with the host's picked palette so the three
// options genuinely differ in construction — not three tints of
// the same site.
//
// Recipe 1 is always "Pear's match": the exact occasion defaults
// applyWizardLook would stamp anyway (lookDefaultsFor +
// recommendTextureFor), so not touching the picker changes
// nothing. Recipes 2–3 are voice-curated alternates — solemn
// voices never see scrapbook tape or ticket stubs.
// ─────────────────────────────────────────────────────────────

import { getEventType, lookDefaultsFor, recommendTextureFor } from '@/lib/event-os/event-types';
import { motifLayoutForKit } from '@/lib/site-look/motif-layouts';

export interface LookRecipe {
  id: string;
  /** Display label — house-style, definite article. */
  label: string;
  blurb: string;
  kitId: 'classic' | 'ticket' | 'plate' | 'scrapbook' | 'index' | 'minimal' | 'glass';
  /** [data-pl-texture] value. */
  texture: string;
  textureIntensity: number;
  /** MotifLayer placement id (MOTIF_LAYOUTS). */
  motifLayout: string;
  density: 'cozy' | 'comfortable' | 'spacious';
}

const KIT_BLURB: Record<string, string> = {
  classic: 'Calm cards, the editorial standard.',
  ticket: 'Perforated stubs and mono time pills.',
  plate: 'Triple-inset plates, italic display.',
  scrapbook: 'Tape strips and a hand-placed tilt.',
  index: 'Ruled rows with a red margin line.',
  minimal: 'Hairlines and whitespace, nothing else.',
  glass: 'Liquid panes over aurora light.',
};

type RecipeSeed = Omit<LookRecipe, 'id'>;

const SEEDS: Record<string, RecipeSeed> = {
  classic:   { label: 'The Classic',    blurb: 'Calm cards on linen — the editorial standard.',            kitId: 'classic',   texture: 'linen',  textureIntensity: 1.0, motifLayout: 'dividers',  density: 'comfortable' },
  press:     { label: 'The Fine Press', blurb: 'Plated cards, gilded paper, marks at the corners.',        kitId: 'plate',     texture: 'gilded', textureIntensity: 0.9, motifLayout: 'corners',   density: 'comfortable' },
  pressQuiet:{ label: 'The Fine Press', blurb: 'Plated cards on linen, marks at the corners.',             kitId: 'plate',     texture: 'linen',  textureIntensity: 0.8, motifLayout: 'corners',   density: 'spacious' },
  keepsake:  { label: 'The Keepsake',   blurb: 'Scrapbook tape, kraft grain, ornaments scattered through.', kitId: 'scrapbook', texture: 'kraft',  textureIntensity: 1.2, motifLayout: 'scattered', density: 'cozy' },
  ticket:    { label: 'The Ticket Stub', blurb: 'Perforated rows, canvas weave, marks in the seams.',      kitId: 'ticket',    texture: 'canvas', textureIntensity: 1.1, motifLayout: 'dividers',  density: 'cozy' },
  ledger:    { label: 'The Ledger',     blurb: 'Ruled index rows, plain paper, marks down the margins.',   kitId: 'index',     texture: 'paper',  textureIntensity: 0.7, motifLayout: 'margins',   density: 'comfortable' },
  quiet:     { label: 'The Quiet Page', blurb: 'Hairline rows, bare paper, no ornament at all.',           kitId: 'minimal',   texture: 'paper',  textureIntensity: 0.6, motifLayout: 'none',      density: 'spacious' },
};

/* Ordered, voice-appropriate candidate pools. Each pool spans ≥4
   distinct kits so two alternates always survive after the
   match's kit is removed — and solemn voices never see tape or
   ticket stubs by construction. */
const CANDIDATES: Record<string, RecipeSeed[]> = {
  celebratory: [SEEDS.press, SEEDS.keepsake, SEEDS.classic, SEEDS.quiet],
  playful:     [SEEDS.ticket, SEEDS.keepsake, SEEDS.press, SEEDS.classic],
  ceremonial:  [SEEDS.press, SEEDS.ledger, SEEDS.classic, SEEDS.quiet],
  intimate:    [SEEDS.quiet, SEEDS.pressQuiet, SEEDS.classic, SEEDS.ledger],
  solemn:      [SEEDS.quiet, SEEDS.ledger, SEEDS.pressQuiet, SEEDS.classic],
};

/** The three looks for an occasion. [0] is always Pear's match —
 *  identical to what applyWizardLook stamps when nothing is picked. */
export function lookRecipesFor(occasion?: string): [LookRecipe, LookRecipe, LookRecipe] {
  const defaults = lookDefaultsFor(occasion ?? 'wedding');
  const recTexture = String(recommendTextureFor(occasion ?? 'wedding') || 'paper');
  const match: LookRecipe = {
    id: 'match',
    label: "Pear's match",
    blurb: KIT_BLURB[defaults.kitId] ?? 'Tuned to your occasion.',
    kitId: defaults.kitId as LookRecipe['kitId'],
    texture: recTexture === 'smooth' ? 'paper' : recTexture,
    textureIntensity: defaults.textureIntensity,
    motifLayout: motifLayoutForKit(defaults.kitId),
    density: defaults.density,
  };

  const voice = getEventType(occasion)?.voice ?? 'celebratory';
  const pool = CANDIDATES[voice] ?? CANDIDATES.celebratory;
  const alts: LookRecipe[] = [];
  for (const seed of pool) {
    if (seed.kitId === match.kitId) continue;
    if (alts.some((a) => a.kitId === seed.kitId)) continue;
    alts.push({ ...seed, id: `alt-${alts.length === 0 ? 'a' : 'b'}` });
    if (alts.length === 2) break;
  }
  return [match, alts[0], alts[1]];
}
