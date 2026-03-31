'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/preview/EditBridge.tsx
// Injected into the preview page when in edit mode.
// Makes text contentEditable, adds hover outlines on sections,
// and sends mutations back to the parent editor via postMessage.
// ─────────────────────────────────────────────────────────────

import { useEffect, useCallback, useRef, useState } from 'react';

// ── Data attributes used to mark editable elements ──────────
// These are added to the preview's rendered DOM elements:
//   data-pe-chapter="ch-xxx"        → chapter ID
//   data-pe-field="title|subtitle|description"  → which field
//   data-pe-section="hero|events|faq|..."       → section ID
//   data-pe-editable="true"         → marks as editable text

interface EditBridgeProps {
  enabled: boolean;
}

export function EditBridge({ enabled }: EditBridgeProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Inject edit-mode styles
  useEffect(() => {
    if (!enabled) {
      styleRef.current?.remove();
      styleRef.current = null;
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      /* Editable text elements */
      [data-pe-editable="true"] {
        cursor: text !important;
        transition: outline 0.15s ease, background 0.15s ease;
        outline: 2px solid transparent;
        outline-offset: 4px;
        border-radius: 4px;
      }
      [data-pe-editable="true"]:hover {
        outline: 2px dashed rgba(163,177,138,0.4) !important;
      }
      [data-pe-editable="true"]:focus {
        outline: 2px solid rgba(163,177,138,0.7) !important;
        background: rgba(163,177,138,0.05) !important;
      }
      [data-pe-editable="true"][contenteditable="true"] {
        cursor: text !important;
      }

      /* Section hover outlines */
      [data-pe-section] {
        transition: outline 0.2s ease;
        outline: 2px solid transparent;
        outline-offset: -2px;
      }
      [data-pe-section]:hover {
        outline: 2px dashed rgba(163,177,138,0.25) !important;
      }
      [data-pe-section].pe-section-active {
        outline: 2px solid rgba(163,177,138,0.5) !important;
      }

      /* Section label badge on hover */
      [data-pe-section]:hover::after {
        content: attr(data-pe-label);
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(163,177,138,0.9);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 4px;
        z-index: 100;
        pointer-events: none;
        font-family: system-ui, sans-serif;
      }
      [data-pe-section] {
        position: relative;
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    return () => {
      style.remove();
      styleRef.current = null;
    };
  }, [enabled]);

  // Make marked elements editable and listen for changes
  useEffect(() => {
    if (!enabled) return;

    const makeEditable = () => {
      document.querySelectorAll('[data-pe-editable="true"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.contentEditable === 'true') return; // already set
        htmlEl.contentEditable = 'true';
        htmlEl.spellcheck = false;
        htmlEl.style.outline = 'none'; // remove default contentEditable outline

        // On blur, send the edit back to the parent
        htmlEl.addEventListener('blur', () => {
          const chapterId = htmlEl.closest('[data-pe-chapter]')?.getAttribute('data-pe-chapter');
          const field = htmlEl.getAttribute('data-pe-field');
          const value = htmlEl.innerText.trim();

          if (chapterId && field && value) {
            window.parent.postMessage({
              type: 'pearloom-edit-commit',
              chapterId,
              field,
              value,
            }, '*');
          }
        });

        // On Enter (non-shift), blur to commit
        htmlEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            htmlEl.blur();
          }
          if (e.key === 'Escape') {
            htmlEl.blur();
          }
        });
      });
    };

    // Run immediately and observe DOM changes (for when sections re-render)
    makeEditable();
    const observer = new MutationObserver(() => makeEditable());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [enabled]);

  // Section click → send to parent to open sidebar
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      const section = (e.target as HTMLElement).closest('[data-pe-section]');
      if (section) {
        const sectionId = section.getAttribute('data-pe-section');
        const chapterId = section.getAttribute('data-pe-chapter');
        window.parent.postMessage({
          type: 'pearloom-section-click',
          sectionId,
          chapterId,
        }, '*');
      }
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [enabled]);

  return null; // This component only injects side effects
}
