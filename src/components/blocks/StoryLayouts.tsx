'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/blocks/StoryLayouts.tsx
// Six chapter layouts for storytelling pages, plus a picker.
// All use inline styles and follow the Organic Glass design system.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, radius, shadow, ease, text as textScale } from '@/lib/design-tokens';

// ── Shared Props ──────────────────────────────────────────────

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

// ── Shared Style Helpers ──────────────────────────────────────

const headingFont =
  "'Fraunces', 'Cormorant Garamond', 'Playfair Display', Georgia, serif";
const bodyFont =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const glassCard: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(16px) saturate(140%)',
  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
  border: `1px solid ${colors.divider}`,
  borderRadius: radius.lg,
  boxShadow: shadow.md,
};

// ─────────────────────────────────────────────────────────────
// 1. ParallaxScroll
// ─────────────────────────────────────────────────────────────

export function ParallaxScroll({
  photos,
  title,
  subtitle,
  body,
  date,
}: StoryLayoutProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const bgUrl = photos[0]?.url;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sectionStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundColor: colors.inkSoft,
    overflow: 'hidden',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(26,26,26,0.25) 0%, rgba(26,26,26,0.55) 55%, rgba(26,26,26,0.78) 100%)',
    pointerEvents: 'none',
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    maxWidth: '760px',
    padding: '3rem 1.5rem',
    textAlign: 'center',
    color: '#F5F1E8',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(36px)',
    transition:
      'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <section ref={sectionRef} style={sectionStyle}>
      <div style={overlayStyle} />
      <div style={contentStyle}>
        {date && (
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: textScale.xs,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.85,
              marginBottom: '1rem',
            }}
          >
            {date}
          </div>
        )}
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: textScale['3xl'],
            lineHeight: 1.08,
            fontWeight: 400,
            margin: '0 0 1rem 0',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <div
            style={{
              fontFamily: headingFont,
              fontStyle: 'italic',
              fontSize: textScale.xl,
              opacity: 0.9,
              marginBottom: '1.25rem',
            }}
          >
            {subtitle}
          </div>
        )}
        {body && (
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: textScale.md,
              lineHeight: 1.75,
              maxWidth: '620px',
              margin: '0 auto',
              opacity: 0.92,
            }}
          >
            {body}
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. FilmStrip
// ─────────────────────────────────────────────────────────────

export function FilmStrip({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const primary = photos[0];

  const sprocketHoles = Array.from({ length: 14 }).map((_, i) => (
    <span
      key={i}
      style={{
        display: 'inline-block',
        width: '14px',
        height: '8px',
        borderRadius: '3px',
        background: colors.cream,
      }}
    />
  ));

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .pl-filmstrip-wrap {
            flex-direction: column !important;
          }
          .pl-filmstrip-photo, .pl-filmstrip-text {
            width: 100% !important;
          }
          .pl-filmstrip-photo {
            transform: rotate(0deg) !important;
          }
        }
      `}</style>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: ease.smooth }}
        style={{
          padding: 'clamp(3rem, 6vw, 5rem) 1.5rem',
          background: colors.cream,
        }}
      >
        <div
          className="pl-filmstrip-wrap"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '3rem',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div
            className="pl-filmstrip-photo"
            style={{
              width: '55%',
              position: 'relative',
              transform: 'rotate(-2deg)',
              background: colors.ink,
              padding: '24px 10px',
              borderRadius: '6px',
              boxShadow: shadow.lg,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '20px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 8px',
              }}
            >
              {sprocketHoles}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '20px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 8px',
              }}
            >
              {sprocketHoles}
            </div>
            {primary ? (
              <img
                src={primary.url}
                alt={primary.alt || title}
                style={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                  borderRadius: '2px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  background: colors.inkSoft,
                  borderRadius: '2px',
                }}
              />
            )}
          </div>

          <div
            className="pl-filmstrip-text"
            style={{ width: '45%', fontFamily: bodyFont, color: colors.ink }}
          >
            {date && (
              <div
                style={{
                  fontSize: textScale.xs,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: colors.oliveDeep,
                  marginBottom: '0.75rem',
                  fontWeight: 500,
                }}
              >
                {date}
              </div>
            )}
            <h2
              style={{
                fontFamily: headingFont,
                fontSize: textScale['2xl'],
                lineHeight: 1.1,
                fontWeight: 400,
                margin: '0 0 0.75rem 0',
                color: colors.ink,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div
                style={{
                  fontFamily: headingFont,
                  fontStyle: 'italic',
                  fontSize: textScale.lg,
                  color: colors.muted,
                  marginBottom: '1.25rem',
                }}
              >
                {subtitle}
              </div>
            )}
            {body && (
              <p
                style={{
                  fontSize: textScale.md,
                  lineHeight: 1.75,
                  color: colors.inkSoft,
                  margin: 0,
                }}
              >
                {body}
              </p>
            )}
          </div>
        </div>
      </motion.section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. MagazineSpread
// ─────────────────────────────────────────────────────────────

export function MagazineSpread({
  photos,
  title,
  subtitle,
  body,
  date,
  index = 0,
}: StoryLayoutProps) {
  const isEven = index % 2 === 0;
  const primary = photos[0];

  // Even index: full-bleed photo with text overlay at bottom
  if (isEven) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: ease.smooth }}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '85vh',
          display: 'grid',
          gridTemplateRows: '1fr auto',
          overflow: 'hidden',
          background: colors.inkSoft,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          {primary && (
            <motion.img
              src={primary.url}
              alt={primary.alt || title}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.8, ease: ease.smooth }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(26,26,26,0) 40%, rgba(26,26,26,0.82) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div
          style={{
            position: 'relative',
            gridRow: 2,
            padding: 'clamp(2rem, 5vw, 4rem)',
            color: '#F5F1E8',
            maxWidth: '900px',
            fontFamily: bodyFont,
          }}
        >
          {date && (
            <div
              style={{
                fontSize: textScale.xs,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                opacity: 0.88,
              }}
            >
              {date}
            </div>
          )}
          <h2
            style={{
              fontFamily: headingFont,
              fontSize: textScale['3xl'],
              lineHeight: 1.05,
              fontWeight: 400,
              margin: '0 0 1rem 0',
              fontStyle: 'italic',
            }}
          >
            {title}
          </h2>
          {body && (
            <p
              style={{
                fontSize: textScale.md,
                lineHeight: 1.75,
                margin: 0,
                opacity: 0.92,
                maxWidth: '640px',
              }}
            >
              {body}
            </p>
          )}
        </div>
      </motion.section>
    );
  }

  // Odd index: two-column grid
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: ease.smooth }}
      style={{
        padding: 'clamp(3rem, 6vw, 5rem) 1.5rem',
        background: colors.cream,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '2rem',
          maxWidth: '1240px',
          margin: '0 auto',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            gridColumn: 'span 7',
            overflow: 'hidden',
            borderRadius: radius.lg,
            boxShadow: shadow.lg,
            aspectRatio: '4 / 5',
            background: colors.oliveMist,
          }}
        >
          {primary && (
            <motion.img
              src={primary.url}
              alt={primary.alt || title}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.8, ease: ease.smooth }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}
        </div>
        <div
          style={{
            gridColumn: 'span 5',
            fontFamily: bodyFont,
            color: colors.ink,
          }}
        >
          {date && (
            <div
              style={{
                fontSize: textScale.xs,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: colors.oliveDeep,
                marginBottom: '0.75rem',
                fontWeight: 500,
              }}
            >
              {date}
            </div>
          )}
          <h2
            style={{
              fontFamily: headingFont,
              fontSize: textScale['2xl'],
              lineHeight: 1.1,
              fontWeight: 400,
              margin: '0 0 1rem 0',
              color: colors.ink,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <blockquote
              style={{
                fontFamily: headingFont,
                fontStyle: 'italic',
                fontSize: textScale.xl,
                lineHeight: 1.3,
                color: colors.oliveDeep,
                borderLeft: `3px solid ${colors.olive}`,
                paddingLeft: '1rem',
                margin: '1rem 0',
              }}
            >
              {subtitle}
            </blockquote>
          )}
          {body && (
            <p
              style={{
                fontSize: textScale.md,
                lineHeight: 1.75,
                color: colors.inkSoft,
                margin: 0,
              }}
            >
              {body}
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. TimelineVine
// ─────────────────────────────────────────────────────────────

export function TimelineVine({
  photos,
  title,
  subtitle,
  body,
  date,
  index = 0,
}: StoryLayoutProps) {
  const onRight = index % 2 === 0;
  const primary = photos[0];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: ease.smooth }}
      style={{
        position: 'relative',
        padding: '2.5rem 1.5rem',
        background: colors.cream,
      }}
    >
      {/* Central vine line */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '2px',
          background: `linear-gradient(180deg, ${colors.olive}00, ${colors.olive} 12%, ${colors.olive} 88%, ${colors.olive}00)`,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: '1080px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          minHeight: '260px',
        }}
      >
        {/* Node circle with date */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: colors.olive,
            border: `4px solid ${colors.cream}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadow.md,
          }}
        >
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: textScale.xs,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.1,
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '4px',
            }}
          >
            {date || ''}
          </div>
        </div>

        {/* Connector line from card to vine */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: onRight ? '50%' : 'calc(50% - 60px)',
            width: '60px',
            height: '2px',
            background: colors.olive,
            transform: 'translateY(-50%)',
            zIndex: 1,
          }}
        />

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, x: onRight ? 40 : -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: ease.smooth }}
          style={{
            ...glassCard,
            gridColumn: onRight ? 2 : 1,
            marginLeft: onRight ? '64px' : 0,
            marginRight: onRight ? 0 : '64px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
            overflow: 'hidden',
          }}
        >
          {primary && (
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                overflow: 'hidden',
                borderRadius: radius.md,
                background: colors.oliveMist,
              }}
            >
              <img
                src={primary.url}
                alt={primary.alt || title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}
          <div style={{ fontFamily: bodyFont, color: colors.ink }}>
            <h3
              style={{
                fontFamily: headingFont,
                fontSize: textScale.xl,
                lineHeight: 1.2,
                fontWeight: 400,
                margin: '0 0 0.5rem 0',
                color: colors.ink,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <div
                style={{
                  fontFamily: headingFont,
                  fontStyle: 'italic',
                  fontSize: textScale.base,
                  color: colors.oliveDeep,
                  marginBottom: '0.5rem',
                }}
              >
                {subtitle}
              </div>
            )}
            {body && (
              <p
                style={{
                  fontSize: textScale.base,
                  lineHeight: 1.65,
                  color: colors.inkSoft,
                  margin: 0,
                }}
              >
                {body}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. KenBurns
// ─────────────────────────────────────────────────────────────

export function KenBurns({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const hasMultiple = photos.length > 1;

  useEffect(() => {
    if (!hasMultiple) return;
    const id = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % photos.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [hasMultiple, photos.length]);

  return (
    <>
      <style>{`
        @keyframes pl-kb-zoom {
          from { transform: scale(1); }
          to   { transform: scale(1.12); }
        }
      `}</style>
      <section
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '80vh',
          overflow: 'hidden',
          background: colors.inkSoft,
        }}
      >
        {photos.map((p, i) => (
          <div
            key={`${p.url}-${i}`}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === activeIdx ? 1 : 0,
              transition: 'opacity 1400ms cubic-bezier(0.22, 1, 0.36, 1)',
              overflow: 'hidden',
            }}
          >
            <img
              src={p.url}
              alt={p.alt || title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transformOrigin: 'center center',
                animation: 'pl-kb-zoom 12s ease-out forwards',
              }}
            />
          </div>
        ))}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(26,26,26,0) 45%, rgba(26,26,26,0.55) 80%, rgba(26,26,26,0.88) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Text */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: 'clamp(2rem, 5vw, 4rem)',
            color: '#F5F1E8',
            fontFamily: bodyFont,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${title}-${activeIdx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease: ease.smooth }}
              style={{ maxWidth: '720px' }}
            >
              {date && (
                <div
                  style={{
                    fontSize: textScale.xs,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: '0.75rem',
                    opacity: 0.88,
                  }}
                >
                  {date}
                </div>
              )}
              <h2
                style={{
                  fontFamily: headingFont,
                  fontSize: textScale['3xl'],
                  lineHeight: 1.08,
                  fontWeight: 400,
                  margin: '0 0 0.75rem 0',
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <div
                  style={{
                    fontFamily: headingFont,
                    fontStyle: 'italic',
                    fontSize: textScale.xl,
                    opacity: 0.9,
                    marginBottom: '0.75rem',
                  }}
                >
                  {subtitle}
                </div>
              )}
              {body && (
                <p
                  style={{
                    fontSize: textScale.md,
                    lineHeight: 1.7,
                    margin: 0,
                    opacity: 0.92,
                  }}
                >
                  {body}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. BentoGrid
// ─────────────────────────────────────────────────────────────

export function BentoGrid({ photos, title, subtitle, body, date }: StoryLayoutProps) {
  const count = photos.length;

  const cellBase: React.CSSProperties = {
    borderRadius: '16px',
    overflow: 'hidden',
    background: colors.oliveMist,
    position: 'relative',
  };

  const photoCell = (
    p: { url: string; alt?: string },
    key: string,
    style: React.CSSProperties
  ) => (
    <motion.div
      key={key}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.35, ease: ease.smooth }}
      style={{ ...cellBase, ...style }}
    >
      <img
        src={p.url}
        alt={p.alt || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </motion.div>
  );

  const textCard = (style: React.CSSProperties) => (
    <motion.div
      key="text-card"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.35, ease: ease.smooth }}
      style={{
        ...glassCard,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        ...style,
      }}
    >
      {date && (
        <div
          style={{
            fontFamily: bodyFont,
            fontSize: textScale.xs,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: colors.oliveDeep,
            marginBottom: '0.5rem',
            fontWeight: 500,
          }}
        >
          {date}
        </div>
      )}
      <h3
        style={{
          fontFamily: headingFont,
          fontSize: textScale.xl,
          lineHeight: 1.15,
          fontWeight: 400,
          margin: '0 0 0.5rem 0',
          color: colors.ink,
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <div
          style={{
            fontFamily: headingFont,
            fontStyle: 'italic',
            fontSize: textScale.base,
            color: colors.muted,
            marginBottom: '0.5rem',
          }}
        >
          {subtitle}
        </div>
      )}
      {body && (
        <p
          style={{
            fontFamily: bodyFont,
            fontSize: textScale.sm,
            lineHeight: 1.6,
            color: colors.inkSoft,
            margin: 0,
          }}
        >
          {body}
        </p>
      )}
    </motion.div>
  );

  // Layout selection based on number of photos
  let gridContent: React.ReactNode;

  if (count === 0) {
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '8px',
        }}
      >
        {textCard({ minHeight: '280px' })}
      </div>
    );
  } else if (count === 1) {
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {photoCell(photos[0], 'p0', {
          gridColumn: 'span 3',
          gridRow: 'span 2',
        })}
        {textCard({ gridColumn: 'span 1', gridRow: 'span 2' })}
      </div>
    );
  } else if (count === 2) {
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {photoCell(photos[0], 'p0', {
          gridColumn: 'span 2',
          gridRow: 'span 2',
        })}
        {photoCell(photos[1], 'p1', { gridColumn: 'span 1', gridRow: 'span 1' })}
        {textCard({ gridColumn: 'span 1', gridRow: 'span 1' })}
      </div>
    );
  } else {
    // 3+ photos
    const extras = photos.slice(1, 5);
    gridContent = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {photoCell(photos[0], 'p0', {
          gridColumn: 'span 2',
          gridRow: 'span 2',
        })}
        {extras.map((p, i) =>
          photoCell(p, `p${i + 1}`, {
            gridColumn: 'span 1',
            gridRow: 'span 1',
          })
        )}
        {textCard({ gridColumn: 'span 1', gridRow: 'span 1' })}
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: ease.smooth }}
      style={{
        padding: 'clamp(2rem, 5vw, 4rem) 1.5rem',
        background: colors.cream,
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>{gridContent}</div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// Layout Picker
// ─────────────────────────────────────────────────────────────

export type StoryLayoutType =
  | 'parallax'
  | 'filmstrip'
  | 'magazine'
  | 'timeline'
  | 'kenburns'
  | 'bento';

const LAYOUT_OPTIONS: Array<{ type: StoryLayoutType; label: string }> = [
  { type: 'parallax', label: 'Parallax' },
  { type: 'filmstrip', label: 'Film Strip' },
  { type: 'magazine', label: 'Magazine' },
  { type: 'timeline', label: 'Timeline' },
  { type: 'kenburns', label: 'Ken Burns' },
  { type: 'bento', label: 'Bento' },
];

// Mini-diagram renderers — abstract representations of each layout
function MiniDiagram({ type }: { type: StoryLayoutType }) {
  const box: React.CSSProperties = {
    width: '100%',
    height: '60px',
    background: colors.oliveMist,
    borderRadius: '6px',
    position: 'relative',
    overflow: 'hidden',
  };
  const photoFill: React.CSSProperties = {
    background: colors.olive,
    borderRadius: '3px',
  };
  const line: React.CSSProperties = {
    background: colors.muted,
    height: '2px',
    borderRadius: '1px',
    opacity: 0.55,
  };

  switch (type) {
    case 'parallax':
      return (
        <div style={box}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: colors.olive,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '20%',
              right: '20%',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div
              style={{
                background: colors.cream,
                height: '4px',
                width: '100%',
                borderRadius: '1px',
              }}
            />
            <div
              style={{
                background: colors.cream,
                height: '2px',
                width: '70%',
                borderRadius: '1px',
                margin: '0 auto',
              }}
            />
          </div>
        </div>
      );

    case 'filmstrip':
      return (
        <div style={{ ...box, display: 'flex', padding: '8px', gap: '6px' }}>
          <div
            style={{
              ...photoFill,
              width: '55%',
              height: '100%',
              transform: 'rotate(-4deg)',
            }}
          />
          <div
            style={{
              width: '45%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <div style={{ ...line, width: '80%' }} />
            <div style={{ ...line, width: '60%' }} />
            <div style={{ ...line, width: '70%' }} />
          </div>
        </div>
      );

    case 'magazine':
      return (
        <div style={{ ...box, display: 'flex', padding: '6px', gap: '6px' }}>
          <div style={{ ...photoFill, width: '60%', height: '100%' }} />
          <div
            style={{
              width: '40%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <div style={{ ...line, width: '90%', height: '3px' }} />
            <div style={{ ...line, width: '70%' }} />
            <div style={{ ...line, width: '80%' }} />
          </div>
        </div>
      );

    case 'timeline':
      return (
        <div style={box}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              background: colors.olive,
              transform: 'translateX(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: colors.olive,
              transform: 'translate(-50%, -50%)',
              border: `2px solid ${colors.cream}`,
            }}
          />
          <div
            style={{
              ...photoFill,
              position: 'absolute',
              left: '8px',
              top: '10px',
              width: '34%',
              height: '18px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '10px',
              width: '34%',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div style={{ ...line, width: '100%' }} />
            <div style={{ ...line, width: '70%' }} />
          </div>
        </div>
      );

    case 'kenburns':
      return (
        <div style={box}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: colors.olive,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, transparent 50%, rgba(26,26,26,0.6) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              bottom: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div
              style={{
                background: colors.cream,
                height: '3px',
                width: '70%',
                borderRadius: '1px',
              }}
            />
            <div
              style={{
                background: colors.cream,
                height: '2px',
                width: '50%',
                borderRadius: '1px',
              }}
            />
          </div>
        </div>
      );

    case 'bento':
      return (
        <div
          style={{
            ...box,
            background: 'transparent',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '3px',
          }}
        >
          <div
            style={{
              ...photoFill,
              gridColumn: 'span 2',
              gridRow: 'span 2',
            }}
          />
          <div style={{ ...photoFill, opacity: 0.75 }} />
          <div
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: `1px solid ${colors.divider}`,
              borderRadius: '3px',
            }}
          />
        </div>
      );

    default:
      return <div style={box} />;
  }
}

// ─────────────────────────────────────────────────────────────
// StoryLayout dispatcher — picks a layout component by type
// ─────────────────────────────────────────────────────────────

export interface StoryLayoutDispatchProps extends StoryLayoutProps {
  type: StoryLayoutType;
}

export function StoryLayout({ type, ...props }: StoryLayoutDispatchProps) {
  switch (type) {
    case 'parallax':
      return <ParallaxScroll {...props} />;
    case 'filmstrip':
      return <FilmStrip {...props} />;
    case 'magazine':
      return <MagazineSpread {...props} />;
    case 'timeline':
      return <TimelineVine {...props} />;
    case 'kenburns':
      return <KenBurns {...props} />;
    case 'bento':
      return <BentoGrid {...props} />;
    default:
      return <ParallaxScroll {...props} />;
  }
}

export function StoryLayoutPicker({
  selected,
  onSelect,
}: {
  selected: StoryLayoutType;
  onSelect: (layout: StoryLayoutType) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(100px, 1fr))',
        gap: '12px',
        maxWidth: '360px',
        fontFamily: bodyFont,
      }}
    >
      {LAYOUT_OPTIONS.map((opt) => {
        const isSelected = selected === opt.type;
        return (
          <motion.button
            key={opt.type}
            type="button"
            onClick={() => onSelect(opt.type)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: ease.smooth }}
            style={{
              width: '100%',
              padding: '10px',
              background: isSelected ? colors.oliveMist : colors.card,
              border: `2px solid ${isSelected ? colors.olive : colors.divider}`,
              borderRadius: radius.md,
              boxShadow: isSelected ? shadow.focus : shadow.xs,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '8px',
              textAlign: 'center',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            aria-pressed={isSelected}
            aria-label={`Select ${opt.label} layout`}
          >
            <MiniDiagram type={opt.type} />
            <span
              style={{
                fontSize: textScale.xs,
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? colors.oliveDeep : colors.inkSoft,
                letterSpacing: '0.02em',
              }}
            >
              {opt.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
