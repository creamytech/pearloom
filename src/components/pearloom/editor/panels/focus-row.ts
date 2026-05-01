// ─────────────────────────────────────────────────────────────
// Shared focus-row helper. Multiple section panels (Travel /
// FAQ / Schedule / Registry) listen for `pearloom:focus-*-row`
// events, find a target with a `data-pl-*-row-id` attribute, and
// scroll + flash. They all hit the same problem: if the target
// lives inside a *collapsed* PanelSection, scrollIntoView lands
// on the closed header — guests never see the row light up.
//
// This helper:
//   • Walks up from the target through PanelSection wrappers
//   • Clicks any header with aria-expanded="false" so the
//     section opens (PanelSection is internally-stateful, so
//     clicking its button is the only way to toggle).
//   • Scrolls the row into view.
//   • Re-applies the .pl8-canvas-focus-flash CSS class to play
//     the highlight animation. Force reflow between removes +
//     adds so a second click in quick succession re-flashes.
// ─────────────────────────────────────────────────────────────

export function focusPanelRow(selector: string): void {
  if (typeof document === 'undefined') return;
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  // Walk up and expand every collapsed PanelSection ancestor so
  // the row is actually visible when we scroll.
  let cursor: HTMLElement | null = target.parentElement;
  while (cursor && cursor !== document.body) {
    // PanelSection's header is a <button aria-expanded="false">
    // when collapsed. Look for it as a direct child of the
    // section wrapper before recursing further up.
    const header = cursor.querySelector(':scope > button[aria-expanded]') as HTMLButtonElement | null;
    if (header && header.getAttribute('aria-expanded') === 'false') {
      header.click();
    }
    cursor = cursor.parentElement;
  }

  // Defer the scroll + flash a tick so any expansion transition
  // has a chance to start (PanelSection animates gap + padding
  // for ~200ms; we don't need to wait the whole way, just let
  // the row mount in the open state).
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.remove('pl8-canvas-focus-flash');
    void target.offsetWidth;
    target.classList.add('pl8-canvas-focus-flash');
  }, 60);
}
