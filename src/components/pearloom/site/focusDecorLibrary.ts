// ─────────────────────────────────────────────────────────────
// focusDecorLibrary — shared helper used by every empty-state
// affordance that wants to drop the user inside the Decor
// Library panel (Theme tab in the editor sidebar). Mirrors the
// inline pattern in DecorDividerEditOverlay so behaviour stays
// consistent: dispatch the inspector-focus event, wait one tick
// for the Theme panel to mount, then scrollIntoView the
// [data-pl-decor-library] anchor.
// ─────────────────────────────────────────────────────────────

export function focusDecorLibrary(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('pearloom:inspector-focus', { detail: { blockKey: 'theme' } }),
  );
  setTimeout(() => {
    const el = document.querySelector('[data-pl-decor-library]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 240);
}
