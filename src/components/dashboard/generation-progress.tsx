'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / GenerationProgress.tsx
// The Loom — radial visualization with step sidebar
// Matches Stitch "The Loom: Ethereal Echoes" screen
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GooglePhotoMetadata } from '@/types';

// ── Loom passes ──────────────────────────────────────────────
const PASSES = [
  { headline: 'Semantic Anchoring', copy: 'Scanning dates, places, and faces.', pct: 2 },
  { headline: 'Atmospheric Synthesis', copy: 'Turning memories into chapters.', pct: 15 },
  { headline: 'Chromatic Weaving', copy: 'Colors, fonts, shapes from your vibe.', pct: 40 },
  { headline: 'Memory Granulation', copy: 'The inside moments that make you, you.', pct: 55 },
  { headline: 'Ethereal Depth Pass', copy: 'Designing your world with care.', pct: 68 },
  { headline: 'Textural Cohesion', copy: 'One-of-a-kind artwork for your site.', pct: 82 },
  { headline: 'Final Polish', copy: 'The tagline and the closing line.', pct: 96 },
];

// ── Sidebar step categories ──────────────────────────────────
const SIDEBAR_STEPS = [
  { id: 'neural',    label: 'Neural Thread',    passes: [0, 1] },
  { id: 'chromatic', label: 'Chromatic Weave',  passes: [2, 3] },
  { id: 'pattern',   label: 'Pattern Loft',     passes: [4, 5] },
  { id: 'final',     label: 'Final Curation',   passes: [6] },
];

function getActiveSidebarStep(passIdx: number): string {
  for (const step of SIDEBAR_STEPS) {
    if (step.passes.includes(passIdx)) return step.id;
  }
  return SIDEBAR_STEPS[SIDEBAR_STEPS.length - 1].id;
}

// ── Photo mosaic for radial center ───────────────────────────
function LoomPhotos({ photos, count }: { photos: GooglePhotoMetadata[]; count: number }) {
  const visible = photos.slice(0, Math.min(count, 4));
  if (visible.length === 0) return null;

  const positions = [
    { top: '25%', left: '30%', rotate: -8, size: 80 },
    { top: '20%', left: '55%', rotate: 6, size: 64 },
    { top: '55%', left: '25%', rotate: -4, size: 56 },
    { top: '50%', left: '58%', rotate: 10, size: 72 },
  ];

  return (
    <>
      {visible.map((photo, i) => {
        const pos = positions[i % positions.length];
        const src = photo.baseUrl?.includes('googleusercontent.com')
          ? `/api/photos/proxy?url=${encodeURIComponent(photo.baseUrl)}&w=200&h=200`
          : photo.baseUrl;
        return (
          <motion.div
            key={photo.id || i}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.3 + 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              top: pos.top, left: pos.left,
              width: pos.size, height: pos.size,
              borderRadius: '16px',
              overflow: 'hidden',
              transform: `rotate(${pos.rotate}deg)`,
              boxShadow: '0 8px 32px rgba(43,30,20,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </motion.div>
        );
      })}
    </>
  );
}

export function GenerationProgress({
  step = 0,
  onCancel,
  photos = [],
  names = ['', ''],
  vibeString = '',
  occasion = 'wedding',
  isComplete = false,
  onComplete,
}: {
  step?: number;
  onCancel?: () => void;
  photos?: GooglePhotoMetadata[];
  names?: [string, string];
  vibeString?: string;
  occasion?: string;
  isComplete?: boolean;
  onComplete?: () => void;
}) {
  const idx = Math.min(step, PASSES.length - 1);
  const pass = PASSES[idx];
  const activeSidebar = isComplete ? 'final' : getActiveSidebarStep(idx);
  const [elapsed, setElapsed] = useState(0);
  const activeCount = Math.min(idx + 2, photos.length, 4);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isComplete || !onComplete) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [isComplete, onComplete]);

  const displayName = names[1]?.trim()
    ? `${names[0]} & ${names[1]}`
    : names[0] || 'your heirloom';

  const pct = isComplete ? 100 : pass.pct;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex',
      background: 'var(--pl-cream)',
      fontFamily: 'var(--pl-font-body)',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '52px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
        borderBottom: '1px solid var(--pl-divider)',
        background: 'white', zIndex: 10,
      }}>
        <span style={{
          fontSize: '1rem', fontWeight: 600,
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          color: 'var(--pl-ink-soft)',
        }}>
          Pearloom
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--pl-ink)' }}>
          The Loom
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '16px' }}
          >
            ✦
          </motion.span>
          <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--pl-olive-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            ⚙
          </span>
        </div>
      </div>

      {/* ── Left sidebar — step list ── */}
      <aside style={{
        width: '220px', flexShrink: 0,
        paddingTop: '72px', padding: '72px 20px 24px',
        borderRight: '1px solid var(--pl-divider)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--pl-cream)',
      }}>
        <h2 style={{
          fontSize: '1.1rem', fontWeight: 500,
          fontFamily: 'var(--pl-font-heading)',
          fontStyle: 'italic',
          color: 'var(--pl-ink-soft)',
          marginBottom: '4px',
        }}>
          The Loom
        </h2>
        <p style={{
          fontSize: '0.62rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--pl-muted)',
          marginBottom: '28px',
        }}>
          Weaving your heirloom...
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {SIDEBAR_STEPS.map((s) => {
            const isActive = activeSidebar === s.id;
            const isPast = SIDEBAR_STEPS.findIndex(x => x.id === activeSidebar) > SIDEBAR_STEPS.findIndex(x => x.id === s.id);
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(163,177,138,0.12)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px',
                  background: isPast || isActive ? 'var(--pl-olive-deep)' : 'var(--pl-cream-deep)',
                  color: isPast || isActive ? 'white' : 'var(--pl-muted)',
                  fontWeight: 700,
                }}>
                  {isPast ? '✓' : '⚙'}
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* New generation button */}
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '12px',
            borderRadius: '10px', border: 'none',
            background: 'var(--pl-olive-deep)',
            color: 'white', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginTop: 'auto',
          }}
        >
          New Generation
        </button>
      </aside>

      {/* ── Center — radial loom + progress ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        paddingTop: '52px', overflow: 'hidden',
        background: 'linear-gradient(180deg, var(--pl-cream-deep) 0%, var(--pl-cream) 40%)',
      }}>
        {/* Active generation header */}
        <div style={{
          textAlign: 'center', padding: '32px 24px 0',
          background: 'linear-gradient(180deg, rgba(163,177,138,0.08) 0%, transparent 100%)',
        }}>
          <p style={{
            fontSize: '0.62rem', fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--pl-muted)', marginBottom: '8px',
          }}>
            Active Generation
          </p>
          <h1 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
            fontWeight: 500,
            fontFamily: 'var(--pl-font-heading)',
            fontStyle: 'italic',
            color: 'var(--pl-ink)',
            margin: 0,
          }}>
            The Loom: {displayName}
          </h1>
        </div>

        {/* Radial loom visualization */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Concentric circles */}
          {[280, 220, 160].map((size, i) => (
            <motion.div
              key={size}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 30 + i * 10, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: size, height: size,
                borderRadius: '50%',
                border: `1px solid rgba(163,177,138,${0.12 - i * 0.03})`,
              }}
            />
          ))}

          {/* Center sparkle */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(163,177,138,0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <span style={{ fontSize: '20px' }}>✦</span>
          </motion.div>

          {/* Photo thumbnails floating in the loom */}
          <LoomPhotos photos={photos} count={activeCount} />
        </div>

        {/* Right sidebar — step list with numbering */}
        <div style={{
          position: 'absolute', right: '32px', top: '50%',
          transform: 'translateY(-50%)',
          width: '260px',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          {PASSES.map((p, i) => {
            const isActive = i === idx;
            const isPast = i < idx;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '8px 0',
                opacity: isPast ? 0.5 : isActive ? 1 : 0.4,
              }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                  minWidth: '20px',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{
                  width: isActive ? '24px' : '16px',
                  height: '2px',
                  background: isActive ? 'var(--pl-ink)' : 'var(--pl-divider)',
                  transition: 'all 0.3s',
                }} />
                <span style={{
                  fontSize: isActive ? '1rem' : '0.82rem',
                  fontFamily: isActive ? 'var(--pl-font-heading)' : 'var(--pl-font-body)',
                  fontWeight: isActive ? 600 : 400,
                  fontStyle: isActive ? 'italic' : 'normal',
                  color: isActive ? 'var(--pl-ink)' : 'var(--pl-muted)',
                  transition: 'all 0.3s',
                }}>
                  {p.headline}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom progress bar */}
        <div style={{
          padding: '16px 32px 24px',
          borderTop: '1px solid var(--pl-divider)',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <div>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--pl-muted)',
                }}>
                  Weaving Progress
                </span>
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{
                      fontSize: '1.1rem', fontWeight: 500,
                      fontFamily: 'var(--pl-font-heading)',
                      fontStyle: 'italic',
                      color: 'var(--pl-ink)',
                      margin: '2px 0 0',
                    }}
                  >
                    {isComplete ? 'Weaving Complete' : `Refining ${pass.headline}`}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <span style={{
                fontSize: '1.2rem', fontWeight: 600,
                color: 'var(--pl-olive-deep)',
              }}>
                {pct}%
              </span>
            </div>
            {/* Progress bar */}
            <div style={{
              height: '6px', borderRadius: '3px',
              background: 'var(--pl-cream-deep)',
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  height: '100%', borderRadius: '3px',
                  background: 'var(--pl-olive-deep)',
                }}
              />
            </div>
            {/* Status line */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '8px',
            }}>
              <span style={{
                fontSize: '0.58rem', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--pl-muted)',
              }}>
                AI Engine: <strong style={{ color: 'var(--pl-ink-soft)' }}>Loom v2.4</strong>
                {' // '}Latency: <strong style={{ color: 'var(--pl-ink-soft)' }}>14ms</strong>
                {' // '}Entropy: <strong style={{ color: 'var(--pl-ink-soft)' }}>0.82</strong>
              </span>
              {onCancel && !isComplete && (
                <button
                  onClick={onCancel}
                  style={{
                    fontSize: '0.62rem', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--pl-warning)',
                    background: 'none', border: 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  ✕ Abort Generation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
