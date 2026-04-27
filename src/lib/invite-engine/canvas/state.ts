// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/canvas/state.ts
//
// Infinite canvas state (scaffold). Declares the object model +
// pure reducer. The component that mounts this store
// (InviteCanvas.tsx) handles gestures, snap-to-grid, and
// rendering. Kept framework-agnostic so we can later swap in
// zustand or similar.
//
// TODO: add snap-to-grid, multi-select, undo history.
// ─────────────────────────────────────────────────────────────

export type CanvasLayerKind =
  | 'photo'
  | 'text'
  | 'decoration'        // AI-generated art (seal, stamp, sprig, etc.)
  | 'archetype';        // background archetype render

export interface CanvasLayer {
  id: string;
  kind: CanvasLayerKind;
  /** 0–100 percent of the card surface. */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;    // degrees
  zIndex: number;
  /** Kind-specific payload. */
  payload: {
    src?: string;              // URL (photo, archetype, decoration)
    text?: string;             // text layer
    fontFamily?: string;       // text layer
    fontSize?: number;         // rem
    italic?: boolean;          // text layer
    color?: string;            // text layer
    opacity?: number;          // 0–1
  };
}

export interface CanvasState {
  layers: CanvasLayer[];
  /** Currently-selected layer id (single-select MVP). */
  selectedId: string | null;
  /** Width × height of the canvas frame in px. */
  width: number;
  height: number;
}

export type CanvasAction =
  | { type: 'ADD_LAYER'; layer: CanvasLayer }
  | { type: 'UPDATE_LAYER'; id: string; patch: Partial<CanvasLayer> }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'SELECT'; id: string | null }
  | { type: 'REORDER'; id: string; direction: 'up' | 'down' | 'top' | 'bottom' }
  | { type: 'RESIZE_CANVAS'; width: number; height: number };

export function createInitialState(width = 800, height = 1200): CanvasState {
  return { layers: [], selectedId: null, width, height };
}

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.layer], selectedId: action.layer.id };

    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, ...action.patch, payload: { ...l.payload, ...(action.patch.payload ?? {}) } } : l)),
      };

    case 'DELETE_LAYER':
      return {
        ...state,
        layers: state.layers.filter((l) => l.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };

    case 'SELECT':
      return { ...state, selectedId: action.id };

    case 'REORDER': {
      const sorted = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === action.id);
      if (idx < 0) return state;
      if (action.direction === 'up' && idx < sorted.length - 1) {
        const a = sorted[idx].zIndex;
        sorted[idx].zIndex = sorted[idx + 1].zIndex;
        sorted[idx + 1].zIndex = a;
      } else if (action.direction === 'down' && idx > 0) {
        const a = sorted[idx].zIndex;
        sorted[idx].zIndex = sorted[idx - 1].zIndex;
        sorted[idx - 1].zIndex = a;
      } else if (action.direction === 'top') {
        sorted[idx].zIndex = sorted.at(-1)!.zIndex + 1;
      } else if (action.direction === 'bottom') {
        sorted[idx].zIndex = sorted[0].zIndex - 1;
      }
      return { ...state, layers: sorted };
    }

    case 'RESIZE_CANVAS':
      return { ...state, width: action.width, height: action.height };

    default:
      return state;
  }
}
