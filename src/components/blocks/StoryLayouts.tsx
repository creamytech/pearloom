'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / blocks/StoryLayouts.tsx
// 6 story layout components for chapter rendering + picker
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/* ── Shared types ─────────────────────────────────────────── */

export interface StoryLayoutProps {
  photos: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
  title: string;
  subtitle?: string;
  body?: string;
  date?: string;
  /** Index of the current chapter (for alternating layouts) */
  index?: number;
}

export type StoryLayoutType = 'parallax' | 'filmstrip' | 'magazine' | 'timeline' | 'kenburns' | 'bento';

/* ── Helpers ──────────────────────────────────────────────── */

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

const HEADING_FONT = 'var(--pl-font-heading, "Playfair Display", Georgia, serif)';
const BODY_FONT = 'var(--pl-font-body, "Lora", Georgia, serif)';
const INK = 'var(--pl-ink-soft, #3D3530)';
const MUTED = 'var(--pl-muted, #8C7E72)';
const OLIVE = 'var(--pl-olive, #A3B18A)';
const CREAM = 'var(--pl-cream, #FAF7F2)';

/* ═════════════════════════════════════════════════════════════
   1. ParallaxScroll — full-viewport parallax hero per chapter
   ═════════════════════════════════════════════════════════════ */

export function ParallaxScroll({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const [ref, inView] = useInView(0.15);
  const bgPhoto = photos[0]?.url;

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: bgPhoto ? `url(${bgPhoto}) center/cover` : CREAM,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark gradient overlay for text readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.75) 100%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 2,
          textAlign: 'center', padding: '0 24px',
          maxWidth: 800, color: '#fff',
        }}
      >
        {date && (
          <p style={{
            fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            fontWeight: 600, opacity: 0.75, marginBottom: 20,
          }}>
            {date}
          </p>
        )}
        <h2 style={{
          fontFamily: HEADING_FONT, fontStyle: 'italic',
          fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 400,
          lineHeight: 1.1, margin: '0 0 16px',
          textShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            fontFamily: BODY_FONT, fontStyle: 'italic',
            fontSize: 'clamp(1rem, 2vw, 1.25rem)', opacity: 0.9,
            marginBottom: 24,
          }}>
            {subtitle}
          </p>
        )}
        {body && (
          <p style={{
            fontFamily: BODY_FONT, fontSize: 'clamp(0.95rem, 1.6vw, 1.1rem)',
            lineHeight: 1.75, maxWidth: 620, margin: '0 auto', opacity: 0.85,
          }}>
            {body}
          </p>
        )}
      </motion.div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   2. FilmStrip — horizontal film frame with sprocket holes
   ═════════════════════════════════════════════════════════════ */

export function FilmStrip({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const [ref, inView] = useInView(0.2);
  const photo = photos[0]?.url;

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <section
      ref={ref}
      style={{
        padding: '80px 24px', background: CREAM,
        display: 'flex', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', gap: 48, maxWidth: 1100, width: '100%',
        }}
      >
        {/* Film frame with sprocket holes */}
        {photo && (
          <div style={{
            position: 'relative',
            width: isMobile ? '100%' : '55%',
            aspectRatio: '4/5',
            background: '#1a1a1a',
            padding: '24px 0',
            transform: isMobile ? 'none' : 'rotate(-2deg)',
            boxShadow: '0 20px 60px rgba(43,30,20,0.15)',
            borderRadius: 4,
          }}>
            {/* Top sprocket holes */}
            <div style={{
              position: 'absolute', top: 4, left: 0, right: 0, height: 16,
              display: 'flex', justifyContent: 'space-around', padding: '0 8px',
            }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ width: 14, height: 10, background: CREAM, borderRadius: 2 }} />
              ))}
            </div>
            {/* Bottom sprocket holes */}
            <div style={{
              position: 'absolute', bottom: 4, left: 0, right: 0, height: 16,
              display: 'flex', justifyContent: 'space-around', padding: '0 8px',
            }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ width: 14, height: 10, background: CREAM, borderRadius: 2 }} />
              ))}
            </div>
            {/* Photo */}
            <img
              src={photo} alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Text panel */}
        <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
          {date && (
            <p style={{
              fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
              fontWeight: 700, color: OLIVE, marginBottom: 16,
            }}>
              {date}
            </p>
          )}
          <h2 style={{
            fontFamily: HEADING_FONT, fontStyle: 'italic',
            fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 400,
            color: INK, lineHeight: 1.15, margin: '0 0 16px',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontFamily: BODY_FONT, fontStyle: 'italic',
              fontSize: '1.15rem', color: MUTED, marginBottom: 20, lineHeight: 1.5,
            }}>
              {subtitle}
            </p>
          )}
          {body && (
            <p style={{
              fontFamily: BODY_FONT, fontSize: '1rem',
              lineHeight: 1.75, color: INK,
            }}>
              {body}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   3. MagazineSpread — alternating editorial layouts
   ═════════════════════════════════════════════════════════════ */

export function MagazineSpread({ photos, title, subtitle, body, date, index = 0 }: StoryLayoutProps) {
  const [ref, inView] = useInView(0.15);
  const even = index % 2 === 0;
  const mainPhoto = photos[0]?.url;

  if (even) {
    // Full-bleed with text overlay at bottom
    return (
      <section
        ref={ref}
        style={{
          position: 'relative', height: '85vh', overflow: 'hidden',
          background: '#000',
        }}
      >
        {mainPhoto && (
          <motion.img
            src={mainPhoto}
            initial={{ scale: 1.1 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
            }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.3 }}
          style={{
            position: 'absolute', bottom: 60, left: 0, right: 0,
            padding: '0 48px', color: '#fff',
          }}
        >
          {date && (
            <p style={{
              fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
              fontWeight: 700, opacity: 0.75, marginBottom: 12,
            }}>
              {date}
            </p>
          )}
          <h2 style={{
            fontFamily: HEADING_FONT, fontStyle: 'italic',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 400,
            lineHeight: 1.1, margin: '0 0 16px', maxWidth: 900,
          }}>
            {title}
          </h2>
          {body && (
            <p style={{
              fontFamily: BODY_FONT, fontSize: '1.1rem',
              lineHeight: 1.65, maxWidth: 600, opacity: 0.9,
            }}>
              {body}
            </p>
          )}
        </motion.div>
      </section>
    );
  }

  // Two-column layout with pull quote
  return (
    <section
      ref={ref}
      style={{
        padding: '100px 48px', background: CREAM,
        display: 'flex', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 60,
          maxWidth: 1200, width: '100%',
          alignItems: 'center',
        }}
      >
        {/* Text column */}
        <div>
          {date && (
            <p style={{
              fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
              fontWeight: 700, color: OLIVE, marginBottom: 16,
            }}>
              {date}
            </p>
          )}
          <h2 style={{
            fontFamily: HEADING_FONT, fontStyle: 'italic',
            fontSize: 'clamp(2rem, 3.5vw, 3.5rem)', fontWeight: 400,
            color: INK, lineHeight: 1.1, margin: '0 0 24px',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontFamily: HEADING_FONT, fontStyle: 'italic',
              fontSize: '1.5rem', color: OLIVE,
              marginBottom: 24, lineHeight: 1.3,
              borderLeft: `3px solid ${OLIVE}`, paddingLeft: 20,
            }}>
              &ldquo;{subtitle}&rdquo;
            </p>
          )}
          {body && (
            <p style={{
              fontFamily: BODY_FONT, fontSize: '1.05rem',
              lineHeight: 1.8, color: INK,
            }}>
              {body}
            </p>
          )}
        </div>

        {/* Photo column with hover zoom */}
        {mainPhoto && (
          <div style={{
            position: 'relative', aspectRatio: '3/4',
            overflow: 'hidden', borderRadius: 8,
            boxShadow: '0 20px 60px rgba(43,30,20,0.12)',
          }}>
            <img
              src={mainPhoto} alt={title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 0.8s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
          </div>
        )}
      </motion.div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   4. TimelineVine — vertical timeline with alternating branches
   ═════════════════════════════════════════════════════════════ */

export function TimelineVine({ photos, title, subtitle, body, date, index = 0 }: StoryLayoutProps) {
  const [ref, inView] = useInView(0.2);
  const left = index % 2 === 0;
  const photo = photos[0]?.url;

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        padding: '60px 24px', background: CREAM,
        display: 'flex', justifyContent: 'center',
      }}
    >
      {/* Center vine */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: '50%',
        width: 2, background: `linear-gradient(to bottom, transparent, ${OLIVE}66, ${OLIVE}66, transparent)`,
      }} />

      <div style={{
        position: 'relative', maxWidth: 1100, width: '100%',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
      }}>
        {/* Node circle on timeline */}
        <motion.div
          initial={{ scale: 0 }}
          animate={inView ? { scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          style={{
            position: 'absolute', left: '50%', top: 48,
            transform: 'translateX(-50%)',
            width: 18, height: 18, borderRadius: '50%',
            background: OLIVE, border: `3px solid ${CREAM}`,
            boxShadow: '0 4px 16px rgba(163,177,138,0.4)',
            zIndex: 2,
          }}
        />

        {/* Content card — alternating side */}
        <motion.div
          initial={{ opacity: 0, x: left ? -40 : 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            gridColumn: left ? 1 : 2,
            padding: left ? '20px 60px 20px 0' : '20px 0 20px 60px',
            textAlign: left ? 'right' : 'left',
          }}
        >
          {/* Connector line from card to vine */}
          <div style={{
            position: 'absolute', top: 56,
            [left ? 'right' : 'left']: 'calc(50% + 9px)',
            width: 52, height: 2,
            background: `${OLIVE}66`,
          } as React.CSSProperties} />

          <div style={{
            display: 'inline-block', maxWidth: 440, textAlign: 'left',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(43,30,20,0.08)',
          }}>
            {photo && (
              <img
                src={photo} alt={title}
                style={{
                  width: '100%', aspectRatio: '16/9',
                  objectFit: 'cover', display: 'block',
                }}
              />
            )}
            <div style={{ padding: 24 }}>
              {date && (
                <p style={{
                  fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                  fontWeight: 700, color: OLIVE, marginBottom: 8,
                }}>
                  {date}
                </p>
              )}
              <h3 style={{
                fontFamily: HEADING_FONT, fontStyle: 'italic',
                fontSize: '1.75rem', fontWeight: 400,
                color: INK, margin: '0 0 10px', lineHeight: 1.2,
              }}>
                {title}
              </h3>
              {subtitle && (
                <p style={{ fontSize: '0.9rem', color: MUTED, fontStyle: 'italic', marginBottom: 12 }}>
                  {subtitle}
                </p>
              )}
              {body && (
                <p style={{
                  fontFamily: BODY_FONT, fontSize: '0.95rem',
                  lineHeight: 1.65, color: INK,
                }}>
                  {body}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   5. KenBurns — slow zoom + crossfade slideshow
   ═════════════════════════════════════════════════════════════ */

export function KenBurns({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const [ref, inView] = useInView(0.15);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % photos.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [photos.length]);

  return (
    <section
      ref={ref}
      style={{
        position: 'relative', height: '90vh',
        overflow: 'hidden', background: '#000',
      }}
    >
      {/* All photos stacked with Ken Burns */}
      {photos.map((photo, i) => {
        const isActive = i === idx;
        return (
          <motion.div
            key={`${photo.url}-${i}`}
            initial={false}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 2, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <motion.img
              src={photo.url} alt={photo.alt || title}
              initial={{ scale: 1 }}
              animate={isActive ? { scale: 1.15 } : { scale: 1 }}
              transition={{ duration: 12, ease: 'linear' }}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                willChange: 'transform',
              }}
            />
          </motion.div>
        );
      })}

      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)',
      }} />

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, delay: 0.4 }}
        style={{
          position: 'absolute', bottom: 80, left: 0, right: 0,
          padding: '0 48px', color: '#fff', textAlign: 'center',
          maxWidth: 900, margin: '0 auto',
        }}
      >
        {date && (
          <p style={{
            fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
            fontWeight: 700, opacity: 0.75, marginBottom: 16,
          }}>
            {date}
          </p>
        )}
        <h2 style={{
          fontFamily: HEADING_FONT, fontStyle: 'italic',
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 400,
          lineHeight: 1.1, margin: '0 0 16px',
          textShadow: '0 2px 20px rgba(0,0,0,0.5)',
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            fontFamily: BODY_FONT, fontStyle: 'italic',
            fontSize: '1.2rem', opacity: 0.9, marginBottom: 16,
          }}>
            {subtitle}
          </p>
        )}
        {body && (
          <p style={{
            fontFamily: BODY_FONT, fontSize: '1rem',
            lineHeight: 1.7, opacity: 0.85,
          }}>
            {body}
          </p>
        )}
      </motion.div>

      {/* Progress dots */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 32, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 8,
          padding: '8px 14px', borderRadius: 100,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
        }}>
          {photos.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === idx ? 24 : 6, height: 6, borderRadius: 100,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   6. BentoGrid — asymmetric bento box layout
   ═════════════════════════════════════════════════════════════ */

export function BentoGrid({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const [ref, inView] = useInView(0.15);
  const photoCount = photos.length;

  return (
    <section
      ref={ref}
      style={{
        padding: '80px 24px', background: CREAM,
        display: 'flex', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        style={{
          maxWidth: 1100, width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: '160px',
          gap: 10,
        }}
      >
        {/* Text cell */}
        <div style={{
          gridColumn: 'span 2', gridRow: 'span 2',
          padding: 28, borderRadius: 16,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 8px 32px rgba(43,30,20,0.06)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          {date && (
            <p style={{
              fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase',
              fontWeight: 700, color: OLIVE, marginBottom: 12,
            }}>
              {date}
            </p>
          )}
          <h2 style={{
            fontFamily: HEADING_FONT, fontStyle: 'italic',
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 400,
            color: INK, lineHeight: 1.15, margin: '0 0 14px',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontSize: '0.95rem', color: MUTED,
              fontStyle: 'italic', marginBottom: 12,
            }}>
              {subtitle}
            </p>
          )}
          {body && (
            <p style={{
              fontFamily: BODY_FONT, fontSize: '0.92rem',
              lineHeight: 1.65, color: INK,
            }}>
              {body}
            </p>
          )}
        </div>

        {/* First photo — large 2x2 */}
        {photoCount >= 1 && (
          <BentoCell photo={photos[0]} span="2x2" />
        )}

        {/* Remaining photos — 1x1 cells */}
        {photoCount >= 2 && <BentoCell photo={photos[1]} span="1x1" />}
        {photoCount >= 3 && <BentoCell photo={photos[2]} span="1x1" />}
        {photoCount >= 4 && <BentoCell photo={photos[3]} span="1x1" />}
        {photoCount >= 5 && <BentoCell photo={photos[4]} span="1x1" />}
      </motion.div>
    </section>
  );
}

function BentoCell({ photo, span }: { photo: { url: string; alt?: string }; span: '1x1' | '2x2' }) {
  return (
    <div
      style={{
        gridColumn: span === '2x2' ? 'span 2' : 'span 1',
        gridRow: span === '2x2' ? 'span 2' : 'span 1',
        borderRadius: 16, overflow: 'hidden',
        background: '#1a1a1a',
        boxShadow: '0 4px 16px rgba(43,30,20,0.08)',
        cursor: 'pointer',
      }}
    >
      <img
        src={photo.url} alt={photo.alt || ''}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transition: 'transform 0.5s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   StoryLayoutPicker — 3x2 grid of mini layout previews
   ═════════════════════════════════════════════════════════════ */

interface PickerProps {
  selected: StoryLayoutType;
  onSelect: (layout: StoryLayoutType) => void;
}

const LAYOUTS: { id: StoryLayoutType; label: string; description: string }[] = [
  { id: 'parallax', label: 'Parallax Scroll', description: 'Full-screen cinematic' },
  { id: 'filmstrip', label: 'Film Strip', description: 'Horizontal photo frame' },
  { id: 'magazine', label: 'Magazine', description: 'Editorial spreads' },
  { id: 'timeline', label: 'Timeline', description: 'Vertical journey' },
  { id: 'kenburns', label: 'Ken Burns', description: 'Slow zoom slideshow' },
  { id: 'bento', label: 'Bento Grid', description: 'Asymmetric grid' },
];

/** Abstract mini-preview — colored rectangles suggesting each layout */
function MiniPreview({ type }: { type: StoryLayoutType }) {
  const bg = 'rgba(163,177,138,0.15)';
  const fg = OLIVE;
  const text = 'rgba(61,53,48,0.3)';

  switch (type) {
    case 'parallax':
      return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="70" fill={fg} opacity="0.8" />
          <rect y="45" width="100" height="25" fill="rgba(0,0,0,0.3)" />
          <rect x="30" y="52" width="40" height="3" fill="#fff" opacity="0.9" />
          <rect x="35" y="58" width="30" height="2" fill="#fff" opacity="0.6" />
        </svg>
      );
    case 'filmstrip':
      return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="70" fill={bg} />
          {/* Film frame */}
          <rect x="5" y="12" width="48" height="46" fill={fg} opacity="0.85" transform="rotate(-2 29 35)" />
          {/* Sprocket holes */}
          {[0,1,2,3,4,5,6].map(i => (
            <rect key={`top-${i}`} x={7 + i * 7} y="8" width="4" height="3" fill={bg} />
          ))}
          {[0,1,2,3,4,5,6].map(i => (
            <rect key={`bot-${i}`} x={7 + i * 7} y="58" width="4" height="3" fill={bg} />
          ))}
          {/* Text lines */}
          <rect x="60" y="22" width="32" height="3" fill={text} />
          <rect x="60" y="30" width="28" height="2" fill={text} opacity="0.6" />
          <rect x="60" y="36" width="30" height="2" fill={text} opacity="0.6" />
          <rect x="60" y="42" width="25" height="2" fill={text} opacity="0.6" />
        </svg>
      );
    case 'magazine':
      return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="70" fill={bg} />
          {/* Left text column */}
          <rect x="6" y="12" width="40" height="3" fill={text} />
          <rect x="6" y="18" width="32" height="2" fill={text} opacity="0.6" />
          <rect x="6" y="23" width="36" height="2" fill={text} opacity="0.6" />
          <rect x="6" y="28" width="30" height="2" fill={text} opacity="0.6" />
          <rect x="6" y="36" width="20" height="3" fill={fg} />
          {/* Right photo */}
          <rect x="54" y="10" width="40" height="50" fill={fg} opacity="0.85" rx="2" />
        </svg>
      );
    case 'timeline':
      return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="70" fill={bg} />
          {/* Vine */}
          <line x1="50" y1="5" x2="50" y2="65" stroke={fg} strokeWidth="1.5" opacity="0.5" />
          {/* Nodes */}
          <circle cx="50" cy="18" r="3" fill={fg} />
          <circle cx="50" cy="38" r="3" fill={fg} />
          <circle cx="50" cy="56" r="3" fill={fg} />
          {/* Left card */}
          <rect x="8" y="12" width="30" height="14" fill={fg} opacity="0.8" rx="2" />
          {/* Right card */}
          <rect x="62" y="32" width="30" height="14" fill={fg} opacity="0.8" rx="2" />
          {/* Left card 2 */}
          <rect x="8" y="50" width="30" height="12" fill={fg} opacity="0.8" rx="2" />
        </svg>
      );
    case 'kenburns':
      return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="70" fill={fg} opacity="0.85" />
          {/* Zoom indicator — corner brackets */}
          <path d="M20 20 L20 12 L28 12" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d="M72 12 L80 12 L80 20" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d="M80 50 L80 58 L72 58" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7" />
          <path d="M28 58 L20 58 L20 50" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.7" />
          {/* Center text */}
          <rect x="30" y="32" width="40" height="3" fill="#fff" opacity="0.9" />
          <rect x="35" y="38" width="30" height="2" fill="#fff" opacity="0.6" />
          {/* Dots */}
          <rect x="44" y="62" width="12" height="2" fill="#fff" opacity="0.8" rx="1" />
        </svg>
      );
    case 'bento':
      return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="70" fill={bg} />
          {/* Text cell 2x2 */}
          <rect x="6" y="8" width="38" height="38" fill="rgba(255,255,255,0.9)" rx="2" />
          <rect x="10" y="14" width="20" height="2" fill={fg} />
          <rect x="10" y="20" width="24" height="2" fill={text} opacity="0.6" />
          <rect x="10" y="25" width="22" height="2" fill={text} opacity="0.6" />
          {/* Big photo 2x2 */}
          <rect x="50" y="8" width="44" height="38" fill={fg} opacity="0.85" rx="2" />
          {/* Small photos */}
          <rect x="6" y="50" width="20" height="14" fill={fg} opacity="0.7" rx="2" />
          <rect x="30" y="50" width="20" height="14" fill={fg} opacity="0.75" rx="2" />
          <rect x="54" y="50" width="18" height="14" fill={fg} opacity="0.7" rx="2" />
          <rect x="76" y="50" width="18" height="14" fill={fg} opacity="0.75" rx="2" />
        </svg>
      );
  }
}

export function StoryLayoutPicker({ selected, onSelect }: PickerProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
    }}>
      {LAYOUTS.map(layout => {
        const isSelected = selected === layout.id;
        return (
          <button
            key={layout.id}
            onClick={() => onSelect(layout.id)}
            style={{
              padding: 0,
              borderRadius: 14,
              overflow: 'hidden',
              border: isSelected ? `2px solid ${OLIVE}` : '2px solid rgba(255,255,255,0.4)',
              background: isSelected ? 'rgba(163,177,138,0.08)' : 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left' as const,
              boxShadow: isSelected ? '0 4px 16px rgba(163,177,138,0.25)' : '0 2px 8px rgba(43,30,20,0.04)',
            }}
          >
            <div style={{
              width: '100%', aspectRatio: '10/7',
              background: 'rgba(255,255,255,0.4)',
            }}>
              <MiniPreview type={layout.id} />
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: INK, marginBottom: 2,
              }}>
                {layout.label}
              </div>
              <div style={{
                fontSize: '0.68rem', color: MUTED, lineHeight: 1.3,
              }}>
                {layout.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Dynamic renderer — picks layout by type ──────────────── */

export function StoryLayout({ type, ...props }: StoryLayoutProps & { type: StoryLayoutType }) {
  switch (type) {
    case 'parallax':  return <ParallaxScroll {...props} />;
    case 'filmstrip': return <FilmStrip {...props} />;
    case 'magazine':  return <MagazineSpread {...props} />;
    case 'timeline':  return <TimelineVine {...props} />;
    case 'kenburns':  return <KenBurns {...props} />;
    case 'bento':     return <BentoGrid {...props} />;
    default:          return <ParallaxScroll {...props} />;
  }
}
