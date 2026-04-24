// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/layouts.ts
//
// AI layout engine — asks Claude Sonnet to emit N bespoke SVG-
// friendly invite layouts for a given couple, palette, and
// voice. Each layout describes WHERE things go and HOW they're
// styled, not what they render as — the renderer (compose.ts)
// turns the JSON into a real SVG.
//
// This is pure text-in / JSON-out: no image-gen cost. We can
// produce 30 layouts in one Sonnet call for pennies.
// ─────────────────────────────────────────────────────────────

import { generateJson } from '@/lib/claude';
import type { PaletteHex } from './designer-prompts';
import type { InviteArchetype } from './archetypes';

export type InviteVoice = 'celebratory' | 'intimate' | 'ceremonial' | 'playful' | 'solemn';

export interface LayoutSpec {
  id: string;
  name: string;              // "The Garden Plate", "Editorial Serif"
  aspect: 'portrait' | 'landscape' | 'square';
  /** Background treatment. */
  background:
    | { kind: 'solid'; color: string }
    | { kind: 'archetype'; archetypeId: string }
    | { kind: 'photo'; overlay?: number };
  /** Typography choices — both should be Google Fonts. */
  typography: {
    display: string;
    body: string;
    eyebrow?: string;
  };
  /** Where titles / date / venue sit. Coords are 0–100 percent. */
  frame: {
    namesY: number;
    namesX: number;
    namesSize: number;       // rem
    namesStyle: 'italic' | 'upright' | 'script';
    dateY: number;
    dateSize: number;        // rem
    venueY: number;
    venueSize: number;       // rem
  };
  /** Decorative flourishes. */
  decorations: Array<{
    kind: 'thread' | 'sprig' | 'seal' | 'stamp' | 'postmark' | 'rule' | 'dropcap';
    position: 'top' | 'bottom' | 'left' | 'right' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | 'center';
    tone?: 'accent' | 'muted' | 'ink';
  }>;
  /** Whether this layout accepts a couple photo treatment (and
   *  what to do with it). */
  photoTreatment?: 'none' | 'full-bleed' | 'circle-medallion' | 'vignette-top' | 'polaroid';
  notes?: string;             // designer rationale, max ~15 words
}

export interface GenerateLayoutsOpts {
  count: number;              // typical: 30
  palette: PaletteHex;
  voice: InviteVoice;
  occasion: string;
  names: string;
  archetype?: InviteArchetype;  // optional hint to shape the set
}

const LAYOUT_SCHEMA = {
  type: 'object',
  properties: {
    layouts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          aspect: { type: 'string', enum: ['portrait', 'landscape', 'square'] },
          background: {
            type: 'object',
            properties: {
              kind: { type: 'string', enum: ['solid', 'archetype', 'photo'] },
              color: { type: 'string' },
              archetypeId: { type: 'string' },
              overlay: { type: 'number' },
            },
            required: ['kind'],
          },
          typography: {
            type: 'object',
            properties: {
              display: { type: 'string' },
              body: { type: 'string' },
              eyebrow: { type: 'string' },
            },
            required: ['display', 'body'],
          },
          frame: {
            type: 'object',
            properties: {
              namesY: { type: 'number' },
              namesX: { type: 'number' },
              namesSize: { type: 'number' },
              namesStyle: { type: 'string', enum: ['italic', 'upright', 'script'] },
              dateY: { type: 'number' },
              dateSize: { type: 'number' },
              venueY: { type: 'number' },
              venueSize: { type: 'number' },
            },
            required: ['namesY', 'namesX', 'namesSize', 'namesStyle', 'dateY', 'dateSize', 'venueY', 'venueSize'],
          },
          decorations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['thread', 'sprig', 'seal', 'stamp', 'postmark', 'rule', 'dropcap'] },
                position: { type: 'string' },
                tone: { type: 'string' },
              },
              required: ['kind', 'position'],
            },
          },
          photoTreatment: { type: 'string', enum: ['none', 'full-bleed', 'circle-medallion', 'vignette-top', 'polaroid'] },
          notes: { type: 'string' },
        },
        required: ['id', 'name', 'aspect', 'background', 'typography', 'frame', 'decorations'],
      },
    },
  },
  required: ['layouts'],
} as const;

export async function generateInviteLayouts(opts: GenerateLayoutsOpts): Promise<LayoutSpec[]> {
  const system =
    `You are Pearloom's invite designer. You emit ${opts.count} DISTINCT invitation layouts ` +
    `as structured JSON. Every layout must be a real design — no two should feel like ` +
    `variants of the same idea. Prefer editorial, hand-pressed, letterpress, archive, ` +
    `gallery-plate, and botanical-study voices. Avoid clichés (no "confetti frames", ` +
    `no "stock scroll borders", no sans-serif weddings). Typography must be real ` +
    `Google Fonts that render well at large sizes. Compositions should use ample ` +
    `negative space.`;

  const palettes = `Palette hex: ${opts.palette.background} ${opts.palette.foreground} ${opts.palette.accent} ${opts.palette.accentLight ?? ''}`;
  const voiceLine = `Voice: ${opts.voice}. The set should lean toward this voice but stretch it — 20% should be unexpectedly adjacent moods so the couple has real variety to pick from.`;

  const user =
    `Generate ${opts.count} distinct invitation layouts for a "${opts.occasion}" celebrating ` +
    `"${opts.names}". ${palettes}. ${voiceLine} ` +
    `Each layout's \`name\` must be evocative and one-to-three words ("The Garden Plate", "Editorial Serif"). ` +
    `Each \`id\` must be a unique kebab-case string. Use coordinates as 0–100 percent of the card. ` +
    `If you reference an \`archetypeId\`, use one of these: art-deco, italian-poster, bookshop, ` +
    `garden-table, kyoto-winter, tulum-dusk, parisian-salon, desert-heirloom, highlands-manor, ` +
    `riviera-noon, midnight-observatory, letterpress-classical.`;

  const result = await generateJson<{ layouts: LayoutSpec[] }>({
    tier: 'sonnet',
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: 12000,
    temperature: 0.9,
    schema: LAYOUT_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'emit_invite_layouts',
    schemaDescription: 'Emit the full set of invitation layouts in one call.',
  });

  return Array.isArray(result?.layouts) ? result.layouts.slice(0, opts.count) : [];
}
