// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-canvas/templates.ts
//
// Convert a template variant + couple/event facts into a fully
// editable CanvasScene. Each template seeds a starter set of
// elements the host can then drag, resize, restyle, or delete.
//
// Templates here are intentionally LIGHTER than the SVG variants
// — they hand the host a beautiful blank-ish canvas instead of
// trying to be the final design. The whole point of the canvas
// mode is freedom.
// ─────────────────────────────────────────────────────────────

import type { CanvasScene, CanvasElement } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, newId } from './types';

export type CanvasTemplateId =
  | 'classic-stack'
  | 'photo-postcard'
  | 'split-portrait'
  | 'polaroid-pair'
  | 'engraved-formal'
  | 'modern-mono'
  | 'cinema-noir'
  | 'blank';

export interface CanvasTemplate {
  id: CanvasTemplateId;
  label: string;
  blurb: string;
  paper: string;
  ink: string;
  accent: string;
  soft: string;
  /** When true, photo placeholders fill in from the host's first
   *  manifest photo when seeding the scene. */
  photoFirst?: boolean;
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'classic-stack',
    label: 'Classic stack',
    blurb: 'Centered editorial stack — kicker, names, date, venue.',
    paper: '#F8F1E4',
    ink: '#0E0D0B',
    accent: '#C6703D',
    soft: '#EDE0C5',
  },
  {
    id: 'photo-postcard',
    label: 'Photo postcard',
    blurb: 'Full-bleed engagement photo with a date stamp ribbon.',
    paper: '#FBF7EE',
    ink: '#FFFFFF',
    accent: '#C6703D',
    soft: '#EDE0C5',
    photoFirst: true,
  },
  {
    id: 'split-portrait',
    label: 'Split portrait',
    blurb: 'Half photo on the left, type stack on the right.',
    paper: '#FBF7EE',
    ink: '#0E0D0B',
    accent: '#5C6B3F',
    soft: '#E8E0D0',
    photoFirst: true,
  },
  {
    id: 'polaroid-pair',
    label: 'Polaroid pair',
    blurb: 'Two scattered polaroids over cream paper.',
    paper: '#F8F1E4',
    ink: '#3D4A1F',
    accent: '#C6703D',
    soft: '#EDE0C5',
    photoFirst: true,
  },
  {
    id: 'engraved-formal',
    label: 'Engraved formal',
    blurb: 'Centered serif type with a single hairline rule.',
    paper: '#FBF7EE',
    ink: '#0E0D0B',
    accent: '#5C4F2E',
    soft: '#E8E0D0',
  },
  {
    id: 'modern-mono',
    label: 'Modern mono',
    blurb: 'Left-aligned editorial with a peach accent line.',
    paper: '#F8F1E4',
    ink: '#0E0D0B',
    accent: '#C6703D',
    soft: '#EDE0C5',
  },
  {
    id: 'cinema-noir',
    label: 'Cinema noir',
    blurb: 'Dark velvet ground with gold leaf type.',
    paper: '#0E0D0B',
    ink: '#F1EBDC',
    accent: '#D4B373',
    soft: '#3A322A',
  },
  {
    id: 'blank',
    label: 'Blank canvas',
    blurb: 'Cream paper. Add everything yourself.',
    paper: '#F8F1E4',
    ink: '#0E0D0B',
    accent: '#C6703D',
    soft: '#EDE0C5',
  },
];

export function getCanvasTemplate(id: CanvasTemplateId): CanvasTemplate {
  return CANVAS_TEMPLATES.find((t) => t.id === id) ?? CANVAS_TEMPLATES[0];
}

export interface SeedContext {
  names: [string, string];
  /** Already-formatted human date label e.g. "September 14, 2026". */
  dateLabel: string;
  venue?: string;
  occasionLabel?: string;
  /** Optional first photo — used by photo-first templates. */
  photo?: string;
  /** Stamp text e.g. "SAVE THE DATE". */
  stamp: string;
}

export function buildScene(templateId: CanvasTemplateId, ctx: SeedContext): CanvasScene {
  const t = getCanvasTemplate(templateId);
  const nameLine = ctx.names[1] ? `${ctx.names[0]} & ${ctx.names[1]}` : (ctx.names[0] || 'Our celebration');
  const elements: CanvasElement[] = [
    {
      id: newId('bg'),
      type: 'background',
      x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT,
      z: 0,
      locked: true,
      color: t.paper,
    },
  ];

  const text = (
    text: string,
    x: number, y: number, w: number, h: number,
    opts: Partial<import('./types').TextElement>,
  ): import('./types').TextElement => ({
    id: newId('text'),
    type: 'text',
    x, y, w, h, z: 0, // z set below
    text,
    fontFamily: opts.fontFamily ?? 'Fraunces, Georgia, serif',
    fontSize: opts.fontSize ?? 36,
    fontWeight: opts.fontWeight ?? 500,
    italic: opts.italic ?? false,
    textAlign: opts.textAlign ?? 'center',
    color: opts.color ?? t.ink,
    tracking: opts.tracking ?? 0,
    lineHeight: opts.lineHeight ?? 1.05,
    letterpress: opts.letterpress ?? false,
  });

  const photo = (
    src: string,
    x: number, y: number, w: number, h: number,
    opts: Partial<import('./types').PhotoElement> = {},
  ): import('./types').PhotoElement => ({
    id: newId('photo'),
    type: 'photo',
    x, y, w, h, z: 0,
    src,
    shape: opts.shape ?? 'rect',
    cornerRadius: opts.cornerRadius ?? 14,
    rotation: opts.rotation,
    filter: opts.filter ?? 'none',
    zoom: opts.zoom ?? 1,
    offsetX: opts.offsetX ?? 0,
    offsetY: opts.offsetY ?? 0,
  });

  const line = (
    x: number, y: number, w: number,
    color: string,
    strokeWidth = 1.4,
  ): import('./types').ShapeElement => ({
    id: newId('line'),
    type: 'shape',
    x, y, w, h: strokeWidth,
    z: 0,
    shape: 'line',
    orientation: 'horizontal',
    fill: color,
  });

  switch (templateId) {
    case 'classic-stack': {
      elements.push(
        text(ctx.stamp, 100, 230, 800, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 16, tracking: 0.18, color: t.accent, fontWeight: 700 }),
        text(nameLine, 60, 380, 880, 240, { fontSize: 110, fontWeight: 500, color: t.ink, tracking: -0.02, letterpress: true }),
        line(380, 720, 240, t.accent, 1.2),
        text(ctx.dateLabel, 100, 770, 800, 60, { fontFamily: 'Fraunces, Georgia, serif', fontSize: 36, color: t.ink }),
        text(ctx.venue ?? 'Venue to come', 100, 840, 800, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, color: t.ink, italic: true }),
      );
      break;
    }
    case 'photo-postcard': {
      if (ctx.photo) elements.push(photo(ctx.photo, 0, 0, 1000, 1400, { shape: 'rect' }));
      elements.push(
        text(ctx.stamp, 80, 140, 600, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18, tracking: 0.22, color: '#FFFFFF', fontWeight: 600 }),
        text(nameLine, 60, 1080, 880, 140, { fontSize: 88, fontWeight: 500, color: '#FFFFFF', textAlign: 'left' }),
        text(ctx.dateLabel, 60, 1230, 880, 60, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, color: '#FFFFFF', textAlign: 'left', tracking: 0.06 }),
      );
      break;
    }
    case 'split-portrait': {
      if (ctx.photo) elements.push(photo(ctx.photo, 0, 0, 480, 1400, { shape: 'rect' }));
      elements.push(
        line(540, 220, 360, t.accent, 1),
        text(ctx.stamp, 540, 180, 360, 40, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, tracking: 0.2, color: t.accent, fontWeight: 700, textAlign: 'left' }),
        text(ctx.names[0] || 'Our', 540, 380, 420, 110, { fontSize: 90, fontWeight: 600, color: t.ink, textAlign: 'left', tracking: -0.02 }),
        text('and', 540, 510, 420, 60, { fontSize: 38, fontWeight: 400, italic: true, color: t.accent, textAlign: 'left' }),
        text(ctx.names[1] || 'Story', 540, 580, 420, 110, { fontSize: 90, fontWeight: 600, color: t.ink, textAlign: 'left', tracking: -0.02 }),
        line(540, 760, 200, t.accent, 1.2),
        text(ctx.dateLabel, 540, 800, 420, 50, { fontSize: 30, color: t.ink, textAlign: 'left' }),
        text(ctx.venue ?? '', 540, 860, 420, 40, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18, color: t.ink, textAlign: 'left', italic: true }),
      );
      break;
    }
    case 'polaroid-pair': {
      if (ctx.photo) {
        elements.push(
          photo(ctx.photo, 90, 200, 380, 460, { shape: 'polaroid', rotation: -6 }),
          photo(ctx.photo, 540, 280, 380, 460, { shape: 'polaroid', rotation: 5 }),
        );
      }
      elements.push(
        text(ctx.stamp, 100, 130, 800, 40, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, tracking: 0.22, color: t.ink, fontWeight: 700 }),
        text(nameLine, 60, 880, 880, 130, { fontSize: 96, fontWeight: 600, color: t.ink, tracking: -0.02 }),
        line(380, 1020, 240, t.accent, 1.4),
        text(ctx.dateLabel, 100, 1060, 800, 60, { fontSize: 32, color: t.ink }),
        text(ctx.venue ?? '', 100, 1130, 800, 40, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18, color: t.ink, italic: true }),
      );
      break;
    }
    case 'engraved-formal': {
      elements.push(
        text(ctx.stamp, 100, 200, 800, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, tracking: 0.32, color: t.ink, fontWeight: 600 }),
        text('Together with their families', 100, 280, 800, 50, { fontSize: 24, italic: true, color: t.ink }),
        text(ctx.names[0] || 'Our', 60, 420, 880, 130, { fontSize: 96, fontWeight: 500, color: t.ink, tracking: -0.02 }),
        text('&', 60, 560, 880, 80, { fontSize: 50, italic: true, fontWeight: 400, color: t.accent }),
        text(ctx.names[1] || 'Celebration', 60, 660, 880, 130, { fontSize: 96, fontWeight: 500, color: t.ink, tracking: -0.02 }),
        line(430, 820, 140, t.accent, 1),
        text(ctx.dateLabel, 60, 870, 880, 60, { fontSize: 32, color: t.ink }),
        text(ctx.venue ?? '', 60, 940, 880, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, color: t.ink, italic: true }),
        text('Reception to follow', 60, 1080, 880, 50, { fontSize: 22, italic: true, color: t.ink }),
      );
      break;
    }
    case 'modern-mono': {
      elements.push(
        line(100, 220, 200, t.ink, 1.4),
        text(ctx.stamp, 100, 240, 800, 40, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, tracking: 0.32, color: t.ink, fontWeight: 700, textAlign: 'left' }),
        text(ctx.names[0] || 'Our', 100, 420, 800, 160, { fontSize: 130, fontWeight: 500, color: t.ink, tracking: -0.04, textAlign: 'left' }),
        text('and', 100, 590, 800, 100, { fontSize: 64, fontWeight: 400, italic: true, color: t.accent, textAlign: 'left' }),
        text(ctx.names[1] || 'Story', 100, 700, 800, 160, { fontSize: 130, fontWeight: 500, color: t.ink, tracking: -0.04, textAlign: 'left' }),
        line(100, 920, 200, t.accent, 1.4),
        text(ctx.dateLabel, 100, 970, 800, 60, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: t.ink, textAlign: 'left' }),
        text(ctx.venue ?? '', 100, 1030, 800, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18, color: t.ink, textAlign: 'left' }),
      );
      break;
    }
    case 'cinema-noir': {
      elements.push(
        text(ctx.stamp, 100, 200, 800, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 16, tracking: 0.32, color: t.ink, fontWeight: 600 }),
        text(ctx.names[0] || 'Our', 60, 400, 880, 140, { fontSize: 110, fontWeight: 600, color: t.ink, tracking: -0.02 }),
        text('and', 60, 560, 880, 80, { fontSize: 56, italic: true, color: t.accent }),
        text(ctx.names[1] || 'Story', 60, 660, 880, 140, { fontSize: 110, fontWeight: 600, color: t.ink, tracking: -0.02 }),
        line(380, 850, 240, t.accent, 1.5),
        text(ctx.dateLabel, 60, 900, 880, 60, { fontSize: 30, color: t.accent }),
        text(ctx.venue ?? '', 60, 970, 880, 50, { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, color: t.ink, italic: true }),
      );
      break;
    }
    case 'blank':
    default: {
      // Just the paper background. Host adds elements freely.
      break;
    }
  }

  // Reassign z so it counts up cleanly from 0.
  const ordered = elements.map((el, i) => ({ ...el, z: i }));

  return {
    version: 1,
    label: t.label,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    elements: ordered,
  };
}
