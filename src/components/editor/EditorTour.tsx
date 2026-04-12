'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorTour.tsx
// Interactive 5-step guided tour for first-time editor users
// Spotlight cutout + glass step card with CSS keyframe animations
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

const LS_KEY = 'pearloom_tour_completed';

// ── Tour step definitions ─────────────────────────────────────

interface TourStep {
  /** CSS selector or a custom finder function for the target element */
  find: string | (() => Element | null);
  title: string;
  body: string;
  icon: string;
}

/** Find publish button by its text content (no title attribute on it) */
function findPublishButton(): Element | null {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.trim() === 'Publish' && btn.style.borderRadius === '100px') return btn;
  }
  return null;
}

const STEPS: TourStep[] = [
  {
    find: '.pl-site-scope',
    title: 'This is your site',
    body: 'Everything you see here is your live site. Click any section to edit it. Double-click text to type directly.',
    icon: '\u{1F441}',
  },
  {
    find: 'button[title="Design"]',
    title: 'Design your look',
    body: 'Choose colors, fonts, and visual style. Your theme updates the entire site instantly.',
    icon: '\u{1F3A8}',
  },
  {
    find: 'button[title="Layout"]',
    title: 'Build with blocks',
    body: 'Add sections like countdown timers, photo galleries, RSVP forms, and more. Drag to reorder.',
    icon: '\u{1F9F1}',
  },
  {
    find: 'button[title="Chapters"]',
    title: 'Tell your story',
    body: 'Add chapters with photos and text. Pear can help write and enhance your narrative.',
    icon: '\u{1F4D6}',
  },
  {
    find: findPublishButton,
    title: 'Share with the world',
    body: 'When you\'re ready, hit Publish to get your unique URL. Share it with guests via link, QR code, or email.',
    icon: '\u{1F30D}',
  },
];

// ── Positioning helpers ───────────────────────────────────────

type CardPlacement = 'bottom' | 'top' | 'left' | 'right';

function computePlacement(targetRect: DOMRect): CardPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = 340;
  const cardH = 210;
  const gap = 16;

  // Prefer bottom
  if (targetRect.bottom + gap + cardH < vh && targetRect.left + cardW < vw) return 'bottom';
  // Then top
  if (targetRect.top - gap - cardH > 0) return 'top';
  // Then right
  if (targetRect.right + gap + cardW < vw) return 'right';
  // Fallback left
  return 'left';
}

function getCardPosition(targetRect: DOMRect, placement: CardPlacement) {
  const gap = 16;
  switch (placement) {
    case 'bottom':
      return { top: targetRect.bottom + gap, left: Math.max(12, Math.min(targetRect.left, window.innerWidth - 360)) };
    case 'top':
      return { top: targetRect.top - gap - 210, left: Math.max(12, Math.min(targetRect.left, window.innerWidth - 360)) };
    case 'right':
      return { top: Math.max(12, targetRect.top), left: targetRect.right + gap };
    case 'left':
      return { top: Math.max(12, targetRect.top), left: Math.max(12, targetRect.left - gap - 340) };
  }
}

// ── Component ─────────────────────────────────────────────────

export function EditorTour({ onComplete }: { onComplete?: () => void }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const rafRef = useRef(0);

  // Check localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_KEY)) return;
    } catch {}
    // Delay start to let editor elements render
    const t = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Resolve a step's find to a DOM element
  const findElement = useCallback((s: TourStep): Element | null => {
    if (typeof s.find === 'function') return s.find();
    return document.querySelector(s.find);
  }, []);

  // Find and track the target element for the current step
  const updateRect = useCallback(() => {
    if (!active) return;
    const el = findElement(STEPS[step]);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
    rafRef.current = requestAnimationFrame(updateRect);
  }, [active, step, findElement]);

  useEffect(() => {
    if (!active) return;
    // Initial calculation
    updateRect();
    // Recalculate on resize
    const onResize = () => updateRect();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, updateRect]);

  // Scroll target into view
  useEffect(() => {
    if (!active) return;
    const el = findElement(STEPS[step]);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [active, step, findElement]);

  const markComplete = useCallback(() => {
    try { localStorage.setItem(LS_KEY, '1'); } catch {}
    setActive(false);
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      markComplete();
      return;
    }
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setTransitioning(false);
    }, 200);
  }, [step, markComplete]);

  const handleBack = useCallback(() => {
    if (step <= 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setTransitioning(false);
    }, 200);
  }, [step]);

  const handleSkip = useCallback(() => {
    markComplete();
  }, [markComplete]);

  if (!active) return null;

  const currentStep = STEPS[step];
  const placement = targetRect ? computePlacement(targetRect) : 'bottom';
  const cardPos = targetRect ? getCardPosition(targetRect, placement) : { top: window.innerHeight / 2 - 105, left: window.innerWidth / 2 - 170 };

  // Spotlight cutout dimensions
  const pad = 10;
  const spotX = targetRect ? targetRect.left - pad : 0;
  const spotY = targetRect ? targetRect.top - pad : 0;
  const spotW = targetRect ? targetRect.width + pad * 2 : 0;
  const spotH = targetRect ? targetRect.height + pad * 2 : 0;
  const spotR = 14;

  return (
    <>
      <style>{`
        @keyframes pl-tour-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pl-tour-card-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pl-tour-card-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-8px) scale(0.97); }
        }
        @keyframes pl-tour-dot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.35); }
        }
      `}</style>

      {/* Dark overlay with spotlight cutout */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          animation: 'pl-tour-fade-in 0.4s ease both',
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          // Only allow clicks through the spotlight area
          if (targetRect) {
            const x = e.clientX;
            const y = e.clientY;
            if (
              x >= spotX && x <= spotX + spotW &&
              y >= spotY && y <= spotY + spotH
            ) {
              return;
            }
          }
          // Clicking outside spotlight does nothing (no dismiss)
        }}
      >
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
          preserveAspectRatio="none"
        >
          <defs>
            <mask id="pl-tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={spotX}
                  y={spotY}
                  width={spotW}
                  height={spotH}
                  rx={spotR}
                  ry={spotR}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(20, 16, 12, 0.62)"
            mask="url(#pl-tour-mask)"
          />
        </svg>

        {/* Spotlight ring glow */}
        {targetRect && (
          <div
            style={{
              position: 'absolute',
              left: spotX - 2,
              top: spotY - 2,
              width: spotW + 4,
              height: spotH + 4,
              borderRadius: `${spotR + 2}px`,
              border: '2px solid #A1A1AA',
              boxShadow: '0 0 20px rgba(24,24,27,0.12), inset 0 0 20px rgba(24,24,27,0.04)',
              pointerEvents: 'none',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        )}

        {/* Step card */}
        <div
          style={{
            position: 'absolute',
            top: cardPos.top,
            left: cardPos.left,
            width: '340px',
            padding: '24px',
            borderRadius: '18px',
            background: 'rgba(250, 247, 242, 0.88)',
            backdropFilter: 'blur(32px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
            border: '1px solid #E4E4E7',
            boxShadow: '0 12px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.4)',
            animation: transitioning ? 'pl-tour-card-exit 0.2s ease both' : 'pl-tour-card-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
            pointerEvents: 'auto',
            zIndex: 9001,
          } as React.CSSProperties}
        >
          {/* Step indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <span style={{
              fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--pl-muted, #8a8472)',
            }}>
              {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.68rem', fontWeight: 600,
                color: 'var(--pl-muted, #8a8472)',
                padding: '2px 6px', borderRadius: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Skip Tour
            </button>
          </div>

          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{currentStep.icon}</span>
            <h3 style={{
              margin: 0, fontSize: '1.15rem', fontWeight: 700,
              fontFamily: 'var(--pl-font-heading, Georgia, serif)',
              color: 'var(--pl-ink, #2b1e14)',
              letterSpacing: '-0.01em',
            }}>
              {currentStep.title}
            </h3>
          </div>

          {/* Body */}
          <p style={{
            margin: '0 0 18px 0', fontSize: '0.82rem', lineHeight: 1.6,
            color: 'var(--pl-ink-soft, #5a4f42)',
          }}>
            {currentStep.body}
          </p>

          {/* Progress dots */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '16px',
          }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '8px',
                  background: i === step ? '#18181B' : i < step ? '#18181B' : 'rgba(0,0,0,0.1)',
                  opacity: i <= step ? 1 : 0.5,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {step > 0 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '8px 18px', borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#FFFFFF',
                  color: 'var(--pl-ink-soft, #5a4f42)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.6)')}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                padding: '8px 22px', borderRadius: '8px', border: 'none',
                background: '#18181B',
                color: '#fff', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.04em',
                boxShadow: '0 2px 8px rgba(110,140,92,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(110,140,92,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(110,140,92,0.3)';
              }}
            >
              {step >= STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
