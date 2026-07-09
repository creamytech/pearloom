'use client';

/* ─────────────────────────────────────────────────────────────
   design-tryon — shared hover/focus "try before you commit" for
   the editor canvas.

   Panels call `preview(patch)` while a tile is hovered/focused:
   the patch (CSS custom props, data-* attributes, plain style
   props) is painted STRAIGHT onto the canvas root imperatively —
   no manifest write, no autosave, no undo entry, no ThemedSite
   re-render. `cancel()` restores exactly what was there before
   the first preview; `commit()` keeps the painted values and
   drops the snapshot (the click's onChange re-renders the root
   with the same values, so nothing flashes).

   FontsPick's bespoke previewRef was the prior art; this hook is
   the shared version so ThemePackPicker / KitPick / ColorsPick
   don't each grow a copy. EditorThemeShop keeps its own
   snapshot-the-manifest flow (it previews far more than root
   vars — full pack applies).

   React Compiler note: refs are only touched inside event
   handlers + effects; nothing here reads a ref during render.
   ───────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface TryOnPatch {
  /** CSS custom properties (e.g. --t-accent) set on the root. */
  vars?: Record<string, string>;
  /** data-* attributes (e.g. data-pl-kit) set on the root. */
  attrs?: Record<string, string>;
  /** Plain inline style props (background, color, fontFamily). */
  styles?: Record<string, string>;
}

/** Inline values as they were before the try-on touched them.
 *  null = the key had no inline value / attribute. */
export interface TryOnSnapshot {
  vars: Record<string, string | null>;
  attrs: Record<string, string | null>;
  styles: Record<string, string | null>;
}

/** The minimal element surface the pure helpers need — lets unit
 *  tests run against a plain object instead of a real DOM node. */
export interface TryOnTarget {
  getVar(name: string): string;
  setVar(name: string, value: string): void;
  removeVar(name: string): void;
  getAttr(name: string): string | null;
  setAttr(name: string, value: string): void;
  removeAttr(name: string): void;
}

export function emptySnapshot(): TryOnSnapshot {
  return { vars: {}, attrs: {}, styles: {} };
}

/* captureBaseline — record the pre-preview inline value for every
   key this patch touches that we HAVEN'T already captured. Called
   before each apply so sliding across tiles accumulates one true
   baseline (tile B's preview must not snapshot tile A's paint). */
export function captureBaseline(target: TryOnTarget, patch: TryOnPatch, snap: TryOnSnapshot): void {
  for (const k of Object.keys(patch.vars ?? {})) {
    if (!(k in snap.vars)) snap.vars[k] = target.getVar(k) || null;
  }
  for (const k of Object.keys(patch.styles ?? {})) {
    if (!(k in snap.styles)) snap.styles[k] = target.getVar(k) || null;
  }
  for (const k of Object.keys(patch.attrs ?? {})) {
    if (!(k in snap.attrs)) snap.attrs[k] = target.getAttr(k);
  }
}

export function applyPatch(target: TryOnTarget, patch: TryOnPatch): void {
  for (const [k, v] of Object.entries(patch.vars ?? {})) target.setVar(k, v);
  for (const [k, v] of Object.entries(patch.styles ?? {})) target.setVar(k, v);
  for (const [k, v] of Object.entries(patch.attrs ?? {})) target.setAttr(k, v);
}

export function restoreBaseline(target: TryOnTarget, snap: TryOnSnapshot): void {
  for (const [k, v] of Object.entries(snap.vars)) {
    if (v === null) target.removeVar(k);
    else target.setVar(k, v);
  }
  for (const [k, v] of Object.entries(snap.styles)) {
    if (v === null) target.removeVar(k);
    else target.setVar(k, v);
  }
  for (const [k, v] of Object.entries(snap.attrs)) {
    if (v === null) target.removeAttr(k);
    else target.setAttr(k, v);
  }
}

/* expandThemeVarsForPreview — a --t-* var bag alone doesn't fully
   repaint the canvas root: themeRootStyle() ALSO writes literal
   background / color / fontFamily plus the .pl8 alias vars
   (--paper, --ink, --line, …) as resolved values. Mirror that
   mapping so a preview looks exactly like the commit will. Only
   keys present in `vars` produce aliases — a fonts-only preview
   never touches the palette. */
export function expandThemeVarsForPreview(vars: Record<string, string>): TryOnPatch {
  const aliasOf: Record<string, string[]> = {
    '--t-paper': ['--paper', '--cream'],
    '--t-card': ['--card'],
    '--t-ink': ['--ink'],
    '--t-ink-soft': ['--ink-soft'],
    '--t-ink-muted': ['--ink-muted'],
    '--t-section': ['--cream-2', '--cream-3'],
    '--t-line': ['--line'],
    '--t-line-soft': ['--line-soft', '--card-ring'],
    '--t-gold': ['--gold'],
    '--t-display': ['--font-display'],
  };
  const out: Required<TryOnPatch> = { vars: { ...vars }, attrs: {}, styles: {} };
  for (const [token, aliases] of Object.entries(aliasOf)) {
    const v = vars[token];
    if (v === undefined) continue;
    for (const a of aliases) out.vars[a] = v;
  }
  if (vars['--t-paper']) out.styles.background = vars['--t-paper'];
  if (vars['--t-ink']) out.styles.color = vars['--t-ink'];
  if (vars['--t-body']) out.styles['font-family'] = vars['--t-body'];
  return out;
}

/** The live canvas root — scoped to the editor's canvas scroll
 *  region first so miniature .pl8-guest trees (Three Pressings,
 *  shop cards) can never steal the preview. */
export function findCanvasRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return (
    document.querySelector<HTMLElement>('[data-pl-canvas-scroll] .pl8-guest')
    ?? document.querySelector<HTMLElement>('.pl8-guest')
  );
}

function domTarget(el: HTMLElement): TryOnTarget {
  return {
    getVar: (n) => el.style.getPropertyValue(n),
    setVar: (n, v) => el.style.setProperty(n, v),
    removeVar: (n) => { el.style.removeProperty(n); },
    getAttr: (n) => el.getAttribute(n),
    setAttr: (n, v) => el.setAttribute(n, v),
    removeAttr: (n) => el.removeAttribute(n),
  };
}

export interface CanvasTryOn {
  /** Paint a patch onto the canvas root (hover/focus enter). */
  preview: (patch: TryOnPatch) => void;
  /** Restore the pre-preview canvas (hover leave / blur / Esc). */
  cancel: () => void;
  /** Keep the painted values; the caller's onChange commit will
   *  re-render the root with the same values (click). */
  commit: () => void;
}

export function useCanvasTryOn(): CanvasTryOn {
  const session = useRef<{ el: HTMLElement; snap: TryOnSnapshot } | null>(null);

  /* Leak guard — a panel unmounting mid-hover (tab switch, sheet
     close) must not leave the preview stuck on the canvas. */
  useEffect(() => () => {
    const s = session.current;
    session.current = null;
    if (s) restoreBaseline(domTarget(s.el), s.snap);
  }, []);

  const preview = useCallback((patch: TryOnPatch) => {
    const el = findCanvasRoot();
    if (!el) return;
    if (!session.current || session.current.el !== el) {
      /* Root swapped (layout change remounts it) — drop the
         stale snapshot rather than restore onto a dead node. */
      session.current = { el, snap: emptySnapshot() };
    }
    const t = domTarget(el);
    captureBaseline(t, patch, session.current.snap);
    applyPatch(t, patch);
  }, []);

  const cancel = useCallback(() => {
    const s = session.current;
    session.current = null;
    if (s) restoreBaseline(domTarget(s.el), s.snap);
  }, []);

  const commit = useCallback(() => {
    session.current = null;
  }, []);

  return useMemo(() => ({ preview, cancel, commit }), [preview, cancel, commit]);
}
