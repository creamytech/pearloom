// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/designer-prompts.ts
//
// Prompt builders for the invite-engine. Separated from the
// archetype data so the prompt logic is testable and the data
// is declarative. Every builder returns a single flat prompt
// string that the image-router can send to gpt-image-2.
// ─────────────────────────────────────────────────────────────

import type { InviteArchetype } from './archetypes';

export interface PaletteHex {
  background: string;
  foreground: string;
  accent: string;
  accentLight?: string;
  muted?: string;
}

export interface InviteContext {
  names: string;          // "Jess & Tom"
  date: string;           // already formatted — "September 14, 2026"
  venue?: string;         // "The Glassbarn"
  city?: string;          // "Hudson, NY"
  occasionLabel: string;  // "wedding", "anniversary", "bachelor weekend"
  palette: PaletteHex;
  /** True when a couple portrait will be passed as inputImage. */
  hasPortrait: boolean;
  /** Optional free-form host hint: "feels like Tuscany", "more
   *  modern", "moody dark blues", etc. Concatenated into the
   *  prompt's instruction tail. */
  hint?: string;
  /** True when an inspiration mood-board image will also be sent
   *  as a reference. Painter is told to mimic palette + composition
   *  but NOT copy literal subjects. */
  hasInspiration?: boolean;
}

/** Substitute a limited set of template tokens into a prompt
 *  string. We use curly braces so prompts stay readable in the
 *  archetype file and accidentally-unclosed braces fail loud. */
function fill(template: string, slots: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z.]+)\}/g, (_, key: string) => slots[key] ?? '');
}

function photoInstruction(archetype: InviteArchetype, ctx: InviteContext): string {
  if (!archetype.supportsPortrait) return '';
  if (ctx.hasPortrait) {
    return (
      'Paint the couple into the scene using the attached portrait — preserve their faces, expressions, and hairline silhouettes exactly. They should feel illustrated in the same painterly style as the rest of the scene, not pasted in. Place them proportionate to the framing described. '
    );
  }
  // No portrait attached — fall back to quiet suggestion instead of omitting.
  return 'No human figures in the scene — leave the space feeling intimate, as if the couple just stepped away. ';
}

export function buildArchetypePrompt(archetype: InviteArchetype, ctx: InviteContext): string {
  const slots: Record<string, string> = {
    names: ctx.names,
    date: ctx.date,
    venue: ctx.venue || '',
    city: ctx.city || '',
    occasionLabel: ctx.occasionLabel,
    'palette.background': ctx.palette.background,
    'palette.foreground': ctx.palette.foreground,
    'palette.accent': ctx.palette.accent,
    palette: `${ctx.palette.background}, ${ctx.palette.foreground}, ${ctx.palette.accent}`,
    photoInstruction: photoInstruction(archetype, ctx),
  };
  let prompt = fill(archetype.prompt, slots).replace(/\s+/g, ' ').trim();
  // Append optional host hint + inspiration directives so the
  // archetype prompt stays canonical but bespoke renders honour
  // the host's intent.
  if (ctx.hasInspiration) {
    prompt += ' Use the second attached image as MOOD / PALETTE / COMPOSITION reference only — mimic its lighting, colour relationships, and rhythm of negative space. Do NOT copy specific subjects, faces, or recognisable landmarks from the reference.';
  }
  if (ctx.hint && ctx.hint.length > 0) {
    prompt += ` Host's note: "${ctx.hint}". Honour this even if it bends the archetype's defaults.`;
  }
  return prompt;
}

// ── Companion elements (stamp, seal, postmark, avatar) ───────

export function buildStampPrompt(ctx: InviteContext & { motif?: string }): string {
  const motif = ctx.motif?.trim() || 'a single sprig of olive leaves';
  return (
    `A commemorative postage stamp for "${ctx.names}", illustrated in a ${ctx.palette.accent} and ${ctx.palette.background} palette. Square composition with a deep gothic-style perforated border. Centred illustration: ${motif}. Small serif type at the top reading "${ctx.names}"; "${ctx.date}" along the bottom edge. Vintage Swiss engraved-stamp style, subtle paper grain, two ink colours only. No gradients, no modern typography.`
  );
}

export function buildSealPrompt(ctx: InviteContext & { monogram?: string }): string {
  const initials = ctx.monogram || ctx.names.split(/[&+,]/).map((n) => n.trim()[0]?.toUpperCase()).filter(Boolean).join('');
  return (
    `A circular wax seal pressed into warm sealing wax. The wax colour is ${ctx.palette.accent}. Monogram inside the seal: interlocking letters "${initials}" in a classical engraved serif. Realistic wax texture with soft edges, a slight drip on one side, gentle light from above. Isolated on a pure ${ctx.palette.background} background — no shadow beyond the seal itself. Square framing, single object. Photoreal (not illustrated). No text beyond the monogram.`
  );
}

export function buildPostmarkPrompt(ctx: InviteContext): string {
  return (
    `A faded vintage postmark overlay. Circular outer ring with the venue city "${ctx.city || ''}" in small capitals at the top; date "${ctx.date}" across the centre on a single line; a short horizontal rule beneath. Stamped-ink look with ink bleed, slight offset, partially faded, high transparency. Deep ink colour: ${ctx.palette.foreground}. Background is pure white — this will be composited as an overlay. Square framing. No extra decorative elements.`
  );
}

export function buildAvatarPrompt(opts: {
  illustrationPrompt: string;
  palette: PaletteHex;
}): string {
  return (
    `${opts.illustrationPrompt} Painted character illustration of the couple (two figures, intimate composition, standing close). Isolated on a pure ${opts.palette.background} background with generous negative space. Soft brushwork, not photographic. Consistent character design — this illustration will be reused across many surfaces, so facial features must be distinctive and clearly drawn. No text, no scene, no props — just the couple rendered as a reusable character pair. Palette: ${opts.palette.foreground}, ${opts.palette.accent}, ${opts.palette.background}.`
  );
}

export function buildScenePrompt(opts: {
  sceneDescription: string;  // "cutting the cake", "at the altar"
  palette: PaletteHex;
}): string {
  return (
    `Same two painted characters as the attached couple-avatar illustration, in a new scene: ${opts.sceneDescription}. Preserve their face shapes, hair silhouettes, and clothing colours exactly from the reference. Soft painterly style, warm natural light. Palette drawn from ${opts.palette.foreground}, ${opts.palette.accent}, ${opts.palette.background}. No text, no decorative borders. Painted illustration, not photographic.`
  );
}

export function buildEnvelopeBackPrompt(ctx: InviteContext & { motif?: string }): string {
  const motif = ctx.motif?.trim() || 'olive branches';
  return (
    `The back of a wedding invitation envelope — a cream paper envelope flap closed, with a warm ${ctx.palette.accent} wax seal pressed at the meeting point. Delicate illustration of ${motif} wrapping down and around the seal on both sides, painted in a matching palette. Soft warm light from above-left, subtle paper texture. No text on the envelope. Portrait orientation, centred composition.`
  );
}
