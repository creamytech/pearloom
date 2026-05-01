// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/inline-edit.ts
// Inline text editing protocol — enables clicking text in the
// preview iframe and editing it directly. Uses postMessage
// communication between the editor and the preview iframe.
//
// Protocol:
//   Editor → Iframe:
//     { type: 'pearloom-edit-mode', enabled: true }
//     { type: 'pearloom-inline-edit-start', elementId: string }
//     { type: 'pearloom-inline-edit-cancel' }
//
//   Iframe → Editor:
//     { type: 'pearloom-inline-edit-focus', elementId: string, currentText: string, rect: DOMRect }
//     { type: 'pearloom-inline-edit-commit', elementId: string, newText: string }
//     { type: 'pearloom-inline-edit-blur' }
//
// The iframe's preview page injects a script that:
// 1. Marks editable elements with [data-pl-editable="chapterId:field"]
// 2. On click, sends focus event with current text and position
// 3. Makes the element contentEditable
// 4. On blur, sends commit event with new text
// ─────────────────────────────────────────────────────────────

/**
 * Inline edit event from the iframe.
 */
export interface InlineEditEvent {
  type: 'pearloom-inline-edit-focus' | 'pearloom-inline-edit-commit' | 'pearloom-inline-edit-blur';
  elementId: string;
  currentText?: string;
  newText?: string;
  rect?: { top: number; left: number; width: number; height: number };
}

/**
 * Parse an elementId into its parts.
 * Format: "chapterId:field" or "block:blockId:field"
 *
 * @example
 *   parseElementId("ch-1234:title")     → { type: 'chapter', id: 'ch-1234', field: 'title' }
 *   parseElementId("block:hero-1:subtitle") → { type: 'block', id: 'hero-1', field: 'subtitle' }
 */
export function parseElementId(elementId: string): {
  type: 'chapter' | 'block';
  id: string;
  field: string;
} | null {
  if (elementId.startsWith('block:')) {
    const parts = elementId.split(':');
    if (parts.length >= 3) {
      return { type: 'block', id: parts[1], field: parts.slice(2).join(':') };
    }
  }

  const colonIdx = elementId.indexOf(':');
  if (colonIdx > 0) {
    return {
      type: 'chapter',
      id: elementId.slice(0, colonIdx),
      field: elementId.slice(colonIdx + 1),
    };
  }

  return null;
}

/**
 * Script to inject into the preview iframe to enable inline editing.
 * This script:
 * 1. Finds all [data-pl-editable] elements
 * 2. Adds click handlers that send focus events
 * 3. Makes clicked elements contentEditable
 * 4. Sends commit events on blur
 */
export const INLINE_EDIT_SCRIPT = `
(function() {
  if (window.__plInlineEditInitialized) return;
  window.__plInlineEditInitialized = true;

  let activeElement = null;

  document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-pl-editable]');
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const elementId = el.getAttribute('data-pl-editable');
    const rect = el.getBoundingClientRect();

    // Send focus event to parent
    window.parent.postMessage({
      type: 'pearloom-inline-edit-focus',
      elementId: elementId,
      currentText: el.textContent || '',
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    }, '*');

    // Make editable
    el.contentEditable = 'true';
    el.focus();
    el.style.outline = '2px solid rgba(163,177,138,0.5)';
    el.style.outlineOffset = '4px';
    el.style.borderRadius = '4px';
    activeElement = el;

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });

  document.addEventListener('focusout', function(e) {
    if (!activeElement) return;
    const el = activeElement;
    const elementId = el.getAttribute('data-pl-editable');

    // Commit the edit
    window.parent.postMessage({
      type: 'pearloom-inline-edit-commit',
      elementId: elementId,
      newText: el.textContent || ''
    }, '*');

    // Clean up
    el.contentEditable = 'false';
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.borderRadius = '';
    activeElement = null;
  });

  // Handle Escape to cancel
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && activeElement) {
      activeElement.contentEditable = 'false';
      activeElement.style.outline = '';
      activeElement.style.outlineOffset = '';
      activeElement.style.borderRadius = '';
      window.parent.postMessage({ type: 'pearloom-inline-edit-blur' }, '*');
      activeElement = null;
    }
    // Enter to commit (for single-line fields)
    if (e.key === 'Enter' && !e.shiftKey && activeElement) {
      e.preventDefault();
      activeElement.blur();
    }
  });
})();
`;
