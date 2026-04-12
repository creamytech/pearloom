'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / MobileBottomSheet.tsx
// Spring-physics draggable bottom sheet with 3 snap points.
// Core UI primitive for the rebuilt mobile editor.
// ─────────────────────────────────────────────────────────────

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────

export interface MobileBottomSheetProps {
  children: ReactNode;
  /** [peek%, half%, full%] of viewport height — defaults to [12, 45, 88] */
  snapPoints?: [number, number, number];
  /** Which snap index to start at */
  initialSnap?: 0 | 1 | 2;
  /** Controlled snap — when changed externally, animates to this snap */
  snap?: 0 | 1 | 2;
  /** Called when the sheet settles at a new snap point */
  onSnapChange?: (snapIndex: 0 | 1 | 2) => void;
  /** Optional fixed header rendered inside the sheet below the handle */
  header?: ReactNode;
  /** Whether to show the drag handle bar (default true) */
  showHandle?: boolean;
  /** Control visibility externally */
  open?: boolean;
  /** Called when the sheet is dragged below the peek point (dismiss) */
  onClose?: () => void;
}

type SnapIndex = 0 | 1 | 2;

// ── Spring config ──────────────────────────────────────────────

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 };

/** Velocity threshold (px/s) for jumping to next snap in drag direction */
const VELOCITY_THRESHOLD = 500;

/** Handle area height — tall enough for easy thumb grabbing */
const HANDLE_HEIGHT = 52;

// ── Sheet context for the useMobileSheet hook ──────────────────

interface MobileSheetContextValue {
  snapTo: (index: SnapIndex) => void;
  currentSnap: SnapIndex;
  isExpanded: boolean;
}

const MobileSheetContext = createContext<MobileSheetContextValue>({
  snapTo: () => {},
  currentSnap: 0,
  isExpanded: false,
});

/**
 * Hook to control the nearest ancestor MobileBottomSheet.
 *
 * Returns `{ snapTo, currentSnap, isExpanded }`.
 */
export function useMobileSheet(): MobileSheetContextValue {
  return useContext(MobileSheetContext);
}

// ── Helpers ────────────────────────────────────────────────────

/** Convert a snap-point percentage to an absolute Y offset (px from top of viewport). */
function pctToY(pct: number, vh: number): number {
  return vh * (1 - pct / 100);
}

/** Find the closest snap index given a Y position. */
function closestSnap(yPos: number, snapYs: number[]): SnapIndex {
  let best: SnapIndex = 0;
  let bestDist = Math.abs(yPos - snapYs[0]);
  for (let i = 1; i < snapYs.length; i++) {
    const d = Math.abs(yPos - snapYs[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i as SnapIndex;
    }
  }
  return best;
}

// ── Component ──────────────────────────────────────────────────

export function MobileBottomSheet({
  children,
  snapPoints = [10, 50, 92],
  initialSnap = 0,
  snap: controlledSnap,
  onSnapChange,
  header,
  showHandle = true,
  open = true,
  onClose,
}: MobileBottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState<SnapIndex>(initialSnap);
  const [vh, setVh] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);

  // Memoize snap Y values
  const snapYs = useMemo(
    () => snapPoints.map((pct) => pctToY(pct, vh)) as [number, number, number],
    [snapPoints, vh],
  );

  const y = useMotionValue(snapYs[initialSnap]);

  const contentRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartMotionY = useRef(0);
  const dragStartTime = useRef(0);

  // ── Viewport resize tracking ──────────────────────────────────

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    // Also listen to visual viewport resize (keyboard etc.)
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (vv) vv.removeEventListener('resize', update);
    };
  }, []);

  // ── Snap animation helper ─────────────────────────────────────

  const animateToSnap = useCallback(
    (index: SnapIndex) => {
      const target = snapYs[index];
      animate(y, target, SPRING);
      setCurrentSnap(index);
      onSnapChange?.(index);
    },
    [snapYs, y, onSnapChange],
  );

  // ── Animate to initial snap on mount / when snapYs change ─────

  useEffect(() => {
    animate(y, snapYs[currentSnap], SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapYs]);

  // ── When `open` becomes true, snap to initialSnap ─────────────

  useEffect(() => {
    if (open) {
      animateToSnap(initialSnap);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controlled snap — react to external snap changes ──────────

  const lastControlledSnap = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (controlledSnap !== undefined && controlledSnap !== lastControlledSnap.current) {
      lastControlledSnap.current = controlledSnap;
      animateToSnap(controlledSnap);
    }
  }, [controlledSnap, animateToSnap]);

  // ── Drag handlers (touch on handle area) ──────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      dragStartY.current = e.clientY;
      dragStartMotionY.current = y.get();
      dragStartTime.current = e.timeStamp;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientY - dragStartY.current;
      const newY = dragStartMotionY.current + delta;
      // Clamp: don't allow dragging above the full-snap Y
      const minY = snapYs[2]; // full snap (smallest Y = top of screen area)
      const maxY = vh; // below viewport bottom
      y.set(Math.max(minY - 16, Math.min(maxY, newY))); // allow 16px rubber-band past full (subtle)
    },
    [snapYs, vh, y],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const currentY = y.get();
      const totalDelta = e.clientY - dragStartY.current;
      // Compute velocity from drag distance and elapsed time
      const elapsed = Math.max((e.timeStamp - dragStartTime.current) / 1000, 0.016); // seconds, min 1 frame
      const velocity = totalDelta / elapsed; // px/s

      let target: SnapIndex;

      if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
        // Velocity-based: jump to next snap in drag direction
        if (velocity > 0) {
          // Dragging down
          target = Math.max(0, currentSnap - 1) as SnapIndex;
        } else {
          // Dragging up
          target = Math.min(2, currentSnap + 1) as SnapIndex;
        }
      } else {
        // Position-based: snap to nearest
        target = closestSnap(currentY, snapYs);
      }

      // If dragged well below peek, fire onClose
      if (currentY > snapYs[0] + 60) {
        onClose?.();
        // Still snap back to peek
        target = 0;
      }

      animateToSnap(target);
    },
    [y, snapYs, currentSnap, onClose, animateToSnap],
  );

  // ── Content scroll-to-drag passthrough ────────────────────────
  // When the sheet is at the full snap and content scroll is at 0,
  // dragging down should collapse the sheet instead of scrolling.

  const contentTouchStartY = useRef(0);
  const contentTouchStartTime = useRef(0);
  const isContentDragging = useRef(false);

  const handleContentTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (currentSnap < 1) return;
      const el = contentRef.current;
      if (!el) return;
      contentTouchStartY.current = e.touches[0].clientY;
      contentTouchStartTime.current = e.timeStamp;
      // Only take over if scrolled to top
      if (el.scrollTop <= 0) {
        isContentDragging.current = true;
        dragStartY.current = e.touches[0].clientY;
        dragStartMotionY.current = y.get();
      }
    },
    [currentSnap, y],
  );

  const handleContentTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isContentDragging.current) return;
      const delta = e.touches[0].clientY - dragStartY.current;
      if (delta > 0) {
        // Dragging down from top — move sheet
        e.preventDefault();
        const newY = dragStartMotionY.current + delta;
        y.set(Math.min(newY, vh));
      } else {
        // Dragging up — let scroll work normally
        isContentDragging.current = false;
      }
    },
    [vh, y],
  );

  const handleContentTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isContentDragging.current) return;
      isContentDragging.current = false;
      const currentY = y.get();

      // Compute velocity for momentum-based snapping
      const lastTouch = e.changedTouches[0];
      const elapsed = Math.max((e.timeStamp - contentTouchStartTime.current) / 1000, 0.016);
      const totalDelta = lastTouch.clientY - contentTouchStartY.current;
      const velocity = totalDelta / elapsed;

      if (currentY > snapYs[0] + 60) {
        onClose?.();
        animateToSnap(0);
      } else if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
        // Velocity-based snap: fast swipe down collapses
        const target = velocity > 0
          ? Math.max(0, currentSnap - 1) as SnapIndex
          : Math.min(2, currentSnap + 1) as SnapIndex;
        animateToSnap(target);
      } else {
        animateToSnap(closestSnap(currentY, snapYs));
      }
    },
    [y, snapYs, currentSnap, onClose, animateToSnap],
  );

  // ── Keyboard avoidance: auto-expand when input is focused ─────

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Expand to full so keyboard doesn't cover the input
        if (currentSnap < 2) animateToSnap(2);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [currentSnap, animateToSnap]);

  // ── Backdrop tap handler ──────────────────────────────────────

  const handleBackdropTap = useCallback(() => {
    animateToSnap(0);
  }, [animateToSnap]);

  // ── Context value ─────────────────────────────────────────────

  const ctxValue = useMemo<MobileSheetContextValue>(
    () => ({
      snapTo: animateToSnap,
      currentSnap,
      isExpanded: currentSnap === 2,
    }),
    [animateToSnap, currentSnap],
  );

  // ── Render ────────────────────────────────────────────────────

  const showBackdrop = currentSnap >= 1;

  return (
    <MobileSheetContext.Provider value={ctxValue}>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: showBackdrop ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleBackdropTap}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.1)',
                zIndex: 1199,
                pointerEvents: showBackdrop ? 'auto' : 'none',
              }}
            />

            {/* Sheet */}
            <motion.div
              key="mobile-sheet"
              initial={{ y: vh }}
              animate={{ y: snapYs[currentSnap] }}
              exit={{ y: vh }}
              transition={SPRING}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                y,
                height: vh,
                zIndex: 1200,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--pl-radius-lg) var(--pl-radius-lg) 0 0',
                background: 'var(--pl-glass-heavy)',
                backdropFilter: 'var(--pl-glass-blur)',
                WebkitBackdropFilter: 'var(--pl-glass-blur)',
                borderTop: '1px solid var(--pl-glass-light-border)',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                willChange: 'transform',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              {/* Handle area — this is the drag target */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  flexShrink: 0,
                  height: HANDLE_HEIGHT,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {showHandle && (
                  <div
                    style={{
                      width: 48,
                      height: 5,
                      borderRadius: 3,
                      background: 'var(--pl-black-10, rgba(0,0,0,0.1))',
                    }}
                  />
                )}
              </div>

              {/* Optional fixed header */}
              {header && (
                <div
                  style={{
                    flexShrink: 0,
                    paddingLeft: 16,
                    paddingRight: 16,
                    paddingBottom: 8,
                  }}
                >
                  {header}
                </div>
              )}

              {/* Scrollable content area — scrollable at half AND full snap */}
              <div
                ref={contentRef}
                onTouchStart={handleContentTouchStart}
                onTouchMove={handleContentTouchMove}
                onTouchEnd={handleContentTouchEnd}
                style={{
                  flex: 1,
                  overflowY: currentSnap >= 1 ? 'auto' : 'hidden',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: currentSnap >= 1 ? 'pan-y' : 'none',
                  minHeight: 0,
                  /* Extra bottom padding so content doesn't get hidden behind the
                     fixed 52px tab bar + safe area inset */
                  paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
                } as React.CSSProperties}
              >
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MobileSheetContext.Provider>
  );
}
