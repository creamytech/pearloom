'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/preview/EditBridge.tsx
// Injected into the preview page when in edit mode.
// Text: contentEditable inline editing (title, subtitle, description).
// Photos: floating action overlay (Replace / Remove / AI Regen).
// All mutations sent to parent editor via postMessage.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react';

interface EditBridgeProps {
  enabled: boolean;
}

interface PhotoOverlay {
  rect: DOMRect;
  chapterId: string | null;
  photoIndex: number;
  src: string;
  isHero: boolean;
  isHeroArt: boolean; // generated /api/hero-art — no real photo
}

export function EditBridge({ enabled }: EditBridgeProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingActionRef = useRef<PhotoOverlay | null>(null);
  const [overlay, setOverlay] = useState<PhotoOverlay | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── Inject edit-mode CSS ──────────────────────────────────────
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

      /* Photo elements — pointer + ring on hover */
      [data-pe-section="chapter"] img,
      [data-pe-section="hero"] img {
        cursor: pointer !important;
      }
      [data-pe-section="chapter"] img:hover,
      [data-pe-section="hero"] img:hover {
        outline: 2px solid rgba(163,177,138,0.55) !important;
        outline-offset: -2px;
      }

      /* Section hover outlines */
      [data-pe-section] {
        transition: outline 0.2s ease;
        outline: 2px solid transparent;
        outline-offset: -2px;
        position: relative;
      }
      [data-pe-section]:hover {
        outline: 2px dashed rgba(163,177,138,0.2) !important;
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
    `;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => { style.remove(); styleRef.current = null; };
  }, [enabled]);

  // ── Make text elements contentEditable ───────────────────────
  useEffect(() => {
    if (!enabled) return;

    const makeEditable = () => {
      document.querySelectorAll('[data-pe-editable="true"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.contentEditable === 'true') return;
        htmlEl.contentEditable = 'true';
        htmlEl.spellcheck = false;
        htmlEl.style.outline = 'none';

        // On focus: temporarily remove overflow:hidden on ancestor containers
        // so text isn't clipped inside fixed-height chapter layouts
        htmlEl.addEventListener('focus', () => {
          let parent = htmlEl.parentElement;
          while (parent && parent !== document.body) {
            const cs = getComputedStyle(parent);
            if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') {
              (parent as HTMLElement & { __peOverflow?: string }).__peOverflow = parent.style.overflow;
              parent.style.overflow = 'visible';
            }
            parent = parent.parentElement;
          }
        });

        htmlEl.addEventListener('blur', () => {
          // Restore overflow on ancestor containers
          let parent = htmlEl.parentElement;
          while (parent && parent !== document.body) {
            const p = parent as HTMLElement & { __peOverflow?: string };
            if ('__peOverflow' in p) {
              p.style.overflow = p.__peOverflow ?? '';
              delete p.__peOverflow;
            }
            parent = parent.parentElement;
          }

          const chapterId = htmlEl.closest('[data-pe-chapter]')?.getAttribute('data-pe-chapter');
          const field = htmlEl.getAttribute('data-pe-field');
          const value = htmlEl.innerText.trim();
          if (chapterId && field) {
            window.parent.postMessage({ type: 'pearloom-edit-commit', chapterId, field, value }, '*');
          }
        });

        htmlEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); htmlEl.blur(); }
          if (e.key === 'Escape') htmlEl.blur();
        });
      });
    };

    makeEditable();
    const observer = new MutationObserver(makeEditable);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled]);

  // ── Inject "Edit Cover Photo" button into the hero section ───
  // The hero img sits under z-index:10 text overlay — can't be clicked directly.
  // We inject a DOM button into the hero at z-index:20 instead.
  useEffect(() => {
    if (!enabled) return;

    const ATTR = 'data-pe-hero-photo-btn';
    let rafId: number;

    const inject = () => {
      if (document.querySelector(`[${ATTR}]`)) return; // already injected

      const heroSection = document.querySelector('[data-pe-section="hero"]') as HTMLElement | null;
      if (!heroSection) return;

      const heroImg = heroSection.querySelector('img') as HTMLImageElement | null;
      if (!heroImg) return; // no cover photo in hero

      const btn = document.createElement('button');
      btn.setAttribute(ATTR, 'true');
      btn.textContent = '↑ Edit Cover Photo';
      btn.style.cssText = [
        'position:absolute', 'bottom:24px', 'left:24px',
        'z-index:20', 'cursor:pointer',
        'background:rgba(22,18,14,0.88)', 'backdrop-filter:blur(16px)',
        '-webkit-backdrop-filter:blur(16px)',
        'border:1px solid rgba(0,0,0,0.08)',
        'border-radius:100px',
        'color:var(--pl-ink)',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:13px', 'font-weight:700',
        'padding:10px 18px', 'min-height:44px',
        'display:flex', 'align-items:center', 'gap:8px',
        'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
        '-webkit-tap-highlight-color:transparent',
        'white-space:nowrap',
      ].join(';');

      btn.onclick = (e) => {
        e.stopPropagation();
        const rect = heroImg.getBoundingClientRect();
        setOverlay({
          rect,
          chapterId: null,
          photoIndex: 0,
          src: heroImg.src,
          isHero: true,
          isHeroArt: heroImg.src.includes('/api/hero-art'),
        });
      };

      heroSection.style.position = 'relative';
      heroSection.appendChild(btn);
    };

    // Try immediately, then retry after images load (hero may render async)
    inject();
    rafId = requestAnimationFrame(() => inject());
    const t = setTimeout(inject, 1500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t);
      document.querySelector(`[${ATTR}]`)?.remove();
    };
  }, [enabled]);

  // ── Section click → open sidebar panel ───────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      // Don't interfere with contentEditable clicks or photo clicks (handled separately)
      const target = e.target as HTMLElement;
      if (target.closest('[data-pe-editable="true"]')) return;
      if (target.tagName === 'IMG') return; // handled by photo click handler

      const section = target.closest('[data-pe-section]');
      if (section) {
        const sectionId = section.getAttribute('data-pe-section');
        const chapterId = section.getAttribute('data-pe-chapter');
        window.parent.postMessage({ type: 'pearloom-section-click', sectionId, chapterId }, '*');
      }
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [enabled]);

  // ── Photo click → show action overlay ────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;

      // Only handle photos inside chapter sections or the hero
      const chapterSection = target.closest('[data-pe-section="chapter"], [data-pe-chapter]');
      const heroSection = target.closest('[data-pe-section="hero"]');
      if (!chapterSection && !heroSection) return;

      e.stopPropagation();
      e.preventDefault();

      const isHero = !!heroSection && !chapterSection;
      const chapterId = (chapterSection || heroSection)?.getAttribute('data-pe-chapter') ?? null;

      // Determine photo index within this chapter container
      let photoIndex = 0;
      if (chapterSection) {
        const allImgs = Array.from(chapterSection.querySelectorAll('img'));
        photoIndex = allImgs.indexOf(target as HTMLImageElement);
        if (photoIndex === -1) photoIndex = 0;
      }

      const src = (target as HTMLImageElement).src;
      const isHeroArt = src.includes('/api/hero-art');

      const rect = target.getBoundingClientRect();
      setOverlay({ rect, chapterId, photoIndex, src, isHero, isHeroArt });
    };

    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [enabled]);

  // ── Replace: open file picker → upload → notify parent ───────
  const handleReplace = useCallback(() => {
    if (!overlay) return;
    pendingActionRef.current = overlay;
    setOverlay(null);

    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,image/heic,image/heif';
      input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
      document.body.appendChild(input);
      fileInputRef.current = input;
    }

    const input = fileInputRef.current;
    // Remove old listener to avoid duplicates
    const newInput = input.cloneNode() as HTMLInputElement;
    input.replaceWith(newInput);
    fileInputRef.current = newInput;

    newInput.onchange = async () => {
      const file = newInput.files?.[0];
      const action = pendingActionRef.current;
      if (!file || !action) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const { publicUrl } = await res.json();

        window.parent.postMessage({
          type: 'pearloom-photo-replace',
          chapterId: action.chapterId,
          photoIndex: action.photoIndex,
          isHero: action.isHero,
          newUrl: publicUrl,
          newAlt: file.name.replace(/\.[^.]+$/, ''),
        }, '*');
      } catch (err) {
        console.error('[EditBridge] photo replace failed:', err);
      } finally {
        setUploading(false);
        newInput.value = '';
        pendingActionRef.current = null;
      }
    };

    newInput.click();
  }, [overlay]);

  // ── Remove photo ──────────────────────────────────────────────
  const handleRemove = useCallback(() => {
    if (!overlay) return;
    window.parent.postMessage({
      type: 'pearloom-photo-remove',
      chapterId: overlay.chapterId,
      photoIndex: overlay.photoIndex,
      isHero: overlay.isHero,
    }, '*');
    setOverlay(null);
  }, [overlay]);

  // ── AI regen ──────────────────────────────────────────────────
  const handleAIRegen = useCallback(() => {
    window.parent.postMessage({ type: 'pearloom-photo-ai-regen' }, '*');
    setOverlay(null);
  }, []);

  if (!enabled) return null;

  // ── Overlay UI ────────────────────────────────────────────────
  if (!overlay && !uploading) return null;

  const { rect } = overlay ?? {};

  // Clamp position so buttons stay in viewport
  const top = rect ? Math.max(8, Math.min(rect.top + 12, window.innerHeight - 60)) : 0;
  const left = rect ? Math.max(8, Math.min(rect.left + 12, window.innerWidth - 200)) : 0;

  return (
    <>
      {/* Full-screen backdrop to dismiss */}
      {overlay && (
        <div
          onClick={() => setOverlay(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            cursor: 'default',
          }}
        />
      )}

      {/* Uploading toast */}
      {uploading && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          background: 'rgba(22,18,14,0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(163,177,138,0.3)',
          borderRadius: '100px',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px', fontWeight: 600,
          color: 'var(--pl-ink)',
          whiteSpace: 'nowrap',
          animation: 'pe-fadein 0.2s ease',
        }}>
          <span style={{ display: 'inline-block', animation: 'pe-spin 0.8s linear infinite' }}>⟳</span>
          Uploading photo…
        </div>
      )}

      {/* Photo action chip */}
      {overlay && rect && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top,
            left,
            zIndex: 10000,
            display: 'flex',
            gap: '6px',
            animation: 'pe-popscale 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <PhotoActionBtn
            label={overlay.isHeroArt ? 'Add Photo' : 'Replace'}
            icon="↑"
            onClick={handleReplace}
          />
          {!overlay.isHeroArt && (
            <PhotoActionBtn
              label="Remove"
              icon="✕"
              onClick={handleRemove}
              danger
            />
          )}
          {overlay.isHeroArt && (
            <PhotoActionBtn
              label="Restyle"
              icon="✦"
              onClick={handleAIRegen}
              accent
            />
          )}
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes pe-popscale {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pe-fadein {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pe-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

// ── Small action button ───────────────────────────────────────
function PhotoActionBtn({
  label, icon, onClick, danger, accent,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        minHeight: '44px', // WCAG touch target
        borderRadius: '100px',
        border: `1px solid ${danger ? 'rgba(248,113,113,0.35)' : accent ? 'rgba(163,177,138,0.4)' : 'rgba(0,0,0,0.08)'}`,
        background: danger
          ? 'rgba(40,10,10,0.92)'
          : accent
          ? 'rgba(163,177,138,0.18)'
          : 'rgba(22,18,14,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: danger ? '#fca5a5' : accent ? '#A3B18A' : 'rgba(255,255,255,0.88)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 700,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '0.02em',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
      } as React.CSSProperties}
    >
      <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
}
