// ─────────────────────────────────────────────────────────────
// Pearloom / editor/inline-toolbar-bus.ts
//
// Tiny event-bus that keeps the five canvas-overlay toolbars
// mutually exclusive. Without this the Rewrite chip, Style
// pill, Section hover bar, Multi-select bar, and Art hover bar
// can all fight for the same pixels — we hear "too noisy" in
// user testing and see Z-index collisions.
//
// Usage (in each toolbar):
//   useEffect(() => {
//     return onInlineToolbarActivated((id) => {
//       if (id !== MY_ID) hide();
//     });
//   }, []);
//
//   function onShow() { hide others → announce('MY_ID'); setVisible(true); }
// ─────────────────────────────────────────────────────────────

const EVENT_NAME = 'pearloom:inline-toolbar-activated';

export type InlineToolbarId =
  | 'rewrite'
  | 'style'
  | 'section'
  | 'multi-select'
  | 'art';

/**
 * Announce that a given inline toolbar just became visible.
 * Every other subscriber should hide itself in response.
 */
export function announceInlineToolbar(id: InlineToolbarId): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<InlineToolbarId>(EVENT_NAME, { detail: id }));
}

/**
 * Subscribe to activations. The callback receives the id of
 * the toolbar that just opened. Return the callback's result
 * from a useEffect to unsubscribe.
 */
export function onInlineToolbarActivated(
  cb: (id: InlineToolbarId) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const id = (e as CustomEvent<InlineToolbarId>).detail;
    if (id) cb(id);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
