// ─────────────────────────────────────────────────────────────
// Pearloom / lib/use-focus-trap.ts
//
// Trap keyboard focus inside a container while `active` is true.
// Used by every modal in the product (AuthModal, GuestImportDialog,
// RegistryItemsManager item editor, PhotoLightbox, DashSettings
// delete-account modal) so Tab can't escape to the page behind
// the modal.
//
// Behavior:
//   • On `active` flipping true: capture document.activeElement,
//     focus the first focusable element inside the container.
//   • While active, intercept Tab/Shift+Tab keys: if at the
//     last focusable, Tab wraps to first; if at first, Shift+Tab
//     wraps to last. (The cycle is the trap.)
//   • On `active` flipping false: return focus to the originally-
//     captured element (the trigger button that opened the modal).
//
// Phase 4.3 + 4.5 of AUDIT-2026-05-29 (a11y parity).
//
// Honours prefers-reduced-motion only indirectly — focus moves
// have no animation, so no work needed here.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, type RefObject } from 'react';

// Selector covers every element that can receive keyboard focus
// in a modal in practice. Inputs with tabindex=-1 are explicitly
// excluded — those are programmatically-focusable-only by design.
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]:not([tabindex="-1"])',
  'video[controls]:not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  '[contenteditable=""]:not([tabindex="-1"])',
  '[contenteditable="true"]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    // Filter out elements that are visually hidden — display:none
    // or visibility:hidden would otherwise be captured but can't
    // actually accept focus, breaking the cycle.
    .filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/**
 * Trap focus inside `containerRef` while `active` is true.
 * Restores focus to the previously-focused element on deactivate.
 *
 * @example
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(open, dialogRef);
 *   return open ? <div ref={dialogRef} role="dialog">…</div> : null;
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember who had focus before we opened — so we can return
    // focus there when the modal closes (industry standard, makes
    // Esc-close feel right to keyboard users).
    previousActiveRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element. If the modal already has
    // an autoFocus'd input, the browser focused it before this
    // effect ran — re-focusing it is a no-op. If nothing is
    // autoFocus'd, this seeds the cycle so Tab works from the start.
    const focusables = getFocusableElements(container);
    if (focusables.length > 0 && !container.contains(document.activeElement)) {
      focusables[0].focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const c = containerRef.current;
      if (!c) return;
      const els = getFocusableElements(c);
      if (els.length === 0) {
        // Trap with no focusables — prevent default so Tab can't
        // escape, but there's nowhere to send focus.
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        // Shift+Tab from the first element wraps to the last.
        if (activeEl === first || !c.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from the last element wraps to the first.
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus to the element that had it before we opened.
      // Guard against the trigger having unmounted while the modal
      // was open (e.g., a list-item delete button that wiped its
      // own row).
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        prev.focus();
      }
      previousActiveRef.current = null;
    };
  }, [active, containerRef]);
}
