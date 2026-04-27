// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-canvas/types.ts
//
// Canvas scene model for the invite designer's free-form mode.
// Every element is a positioned, sized, optionally rotated rect
// in a 1000×1400 design coordinate space — the same viewBox the
// existing SVG renderer uses, so templates port over cleanly and
// PNG export at print resolution is just a Sharp scale.
// ─────────────────────────────────────────────────────────────

export type CanvasElementId = string;

export interface BaseElement {
  id: CanvasElementId;
  /** Top-left in canvas coords (1000×1400). */
  x: number;
  y: number;
  /** Box dimensions in canvas coords. */
  w: number;
  h: number;
  /** Rotation in degrees about the centre. */
  rotation?: number;
  /** Z-index — higher renders on top. Templates seed in order. */
  z: number;
  /** Locked elements skip selection / drag. */
  locked?: boolean;
  /** Hidden elements aren't rendered or exported. */
  hidden?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  /** Font family CSS value, e.g. "Fraunces, Georgia, serif". */
  fontFamily: string;
  /** Pixel size at canvas scale. Renderer applies CSS px directly. */
  fontSize: number;
  fontWeight: number;
  italic?: boolean;
  /** Letter-spacing in em. Negative for tight tracking. */
  tracking?: number;
  /** Line-height multiplier. */
  lineHeight?: number;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  /** Optional ink shadow for letterpress feel. */
  letterpress?: boolean;
}

export type PhotoFilter =
  | 'none' | 'sepia' | 'film' | 'dreamy' | 'mono'
  | 'vintage' | 'noir' | 'sunwash';

export interface PhotoElement extends BaseElement {
  type: 'photo';
  /** Image URL — manifest photo, R2 upload, or paste. */
  src: string;
  /** Shape applied as a clip mask. */
  shape: 'rect' | 'rounded' | 'circle' | 'arch' | 'polaroid';
  /** Border radius in canvas px when shape='rounded'. */
  cornerRadius?: number;
  filter?: PhotoFilter;
  /** Per-photo zoom in (1 = no crop, 2 = 2× crop). */
  zoom?: number;
  /** Pan within the slot, fractional [-0.5, 0.5]. */
  offsetX?: number;
  offsetY?: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  /** rect = filled background, line = horizontal/vertical rule,
   *  ellipse = filled circle/oval. */
  shape: 'rect' | 'line' | 'ellipse';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  /** For 'line', this picks horizontal vs. vertical orientation. */
  orientation?: 'horizontal' | 'vertical';
}

/** Background-layer element. Always at z=0, always full-bleed,
 *  always locked from drag — but its src/colour are editable. */
export interface BackgroundElement extends BaseElement {
  type: 'background';
  /** Solid paper colour fallback. */
  color: string;
  /** Optional URL — typically a Pear-painted backdrop on R2. */
  imageUrl?: string;
  /** When set, a solid colour plate covers the centre band of
   *  the bg image so text sits on it readably. */
  textPlate?: { y: number; h: number; opacity: number };
}

export type CanvasElement =
  | BackgroundElement
  | TextElement
  | PhotoElement
  | ShapeElement;

export interface CanvasScene {
  /** Schema version — bump when adding required fields. */
  version: 1;
  /** Display title shown above the canvas. */
  label: string;
  /** Width × height in canvas coords. Templates use 1000×1400. */
  width: number;
  height: number;
  /** Ordered list of elements, lowest z first. The canvas renders
   *  in this order; the inspector reorders by z. */
  elements: CanvasElement[];
}

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1400;

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36).slice(-4)}`;
}

/** Type narrowing helpers — saves consumers a switch. */
export const isText = (e: CanvasElement): e is TextElement => e.type === 'text';
export const isPhoto = (e: CanvasElement): e is PhotoElement => e.type === 'photo';
export const isShape = (e: CanvasElement): e is ShapeElement => e.type === 'shape';
export const isBackground = (e: CanvasElement): e is BackgroundElement => e.type === 'background';

/** Bring an element forward / send it back. Returns a new scene. */
export function moveLayer(scene: CanvasScene, id: string, delta: 1 | -1): CanvasScene {
  const sorted = [...scene.elements].sort((a, b) => a.z - b.z);
  const idx = sorted.findIndex((e) => e.id === id);
  if (idx === -1) return scene;
  const swapIdx = idx + delta;
  if (swapIdx < 1 || swapIdx >= sorted.length) return scene; // bg stays at 0
  const a = sorted[idx];
  const b = sorted[swapIdx];
  return {
    ...scene,
    elements: scene.elements.map((e) => {
      if (e.id === a.id) return { ...e, z: b.z };
      if (e.id === b.id) return { ...e, z: a.z };
      return e;
    }),
  };
}

export function deleteElement(scene: CanvasScene, id: string): CanvasScene {
  const target = scene.elements.find((e) => e.id === id);
  if (!target || target.type === 'background') return scene;
  return { ...scene, elements: scene.elements.filter((e) => e.id !== id) };
}

export function duplicateElement(scene: CanvasScene, id: string): { scene: CanvasScene; newId: string | null } {
  const src = scene.elements.find((e) => e.id === id);
  if (!src || src.type === 'background') return { scene, newId: null };
  const copy = {
    ...src,
    id: newId(src.type),
    x: src.x + 24,
    y: src.y + 24,
    z: Math.max(...scene.elements.map((e) => e.z)) + 1,
  } as CanvasElement;
  return { scene: { ...scene, elements: [...scene.elements, copy] }, newId: copy.id };
}

export function updateElement(scene: CanvasScene, id: string, patch: Partial<CanvasElement>): CanvasScene {
  return {
    ...scene,
    elements: scene.elements.map((e) =>
      e.id === id ? ({ ...e, ...patch } as CanvasElement) : e,
    ),
  };
}
