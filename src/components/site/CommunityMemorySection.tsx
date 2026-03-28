'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';
import CommunityMemorySubmit from './CommunityMemorySubmit';

interface Memory {
  id: string;
  guestName: string;
  relationship: string | null;
  memoryText: string;
  photoUrl: string | null;
  createdAt: string;
}

interface CommunityMemorySectionProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
}

export default function CommunityMemorySection({
  siteId,
  coupleNames,
  vibeSkin,
}: CommunityMemorySectionProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const submitRef = useRef<HTMLDivElement>(null);

  const [name1, name2] = coupleNames;
  const palette = vibeSkin.palette;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/community-memory?siteId=${encodeURIComponent(siteId)}&approved=true`);
        const json = await res.json();
        setMemories(json.memories || []);
      } catch (err) {
        console.error('[CommunityMemorySection] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId]);

  function handleShareClick() {
    setShowSubmit(true);
    // Scroll to submit form after it appears
    setTimeout(() => {
      submitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleSubmitted() {
    setShowSubmit(false);
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 32 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <section
      style={{
        background: vibeSkin.sectionGradient || palette.subtle,
        padding: '80px 24px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── Section Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p
            style={{
              fontFamily: vibeSkin.fonts.body,
              fontSize: 13,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: palette.accent,
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            {vibeSkin.sectionLabels?.story || 'From Those Who Love You'}
          </p>
          <h2
            style={{
              fontFamily: vibeSkin.fonts.heading,
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: palette.ink,
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 16,
              fontStyle:
                vibeSkin.headingStyle === 'italic-serif' ? 'italic' : 'normal',
            }}
          >
            Memories From Your People
          </h2>
          <span
            style={{
              display: 'block',
              fontSize: 28,
              color: palette.accent,
              marginBottom: 14,
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            {vibeSkin.accentSymbol || '✦'}
          </span>
          <p
            style={{
              fontFamily: vibeSkin.fonts.body,
              fontSize: 17,
              color: palette.muted,
              maxWidth: 480,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            The moments your friends and family remember most
          </p>
        </div>

        {/* ── Memory Grid ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: palette.muted }}>
            Loading memories…
          </div>
        ) : memories.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '56px 24px',
              color: palette.muted,
              fontFamily: vibeSkin.fonts.body,
              fontSize: 17,
              fontStyle: 'italic',
            }}
          >
            Be the first to share a memory. Your story with them matters.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))',
              gap: 24,
            }}
          >
            {memories.map((memory, i) => (
              <motion.div
                key={memory.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={cardVariants}
              >
                <div
                  style={{
                    background: palette.card,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
                    border: `1px solid ${palette.accent2}33`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Photo */}
                  {memory.photoUrl && (
                    <div
                      style={{
                        aspectRatio: '4/3',
                        overflow: 'hidden',
                        background: palette.subtle,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={memory.photoUrl}
                        alt={`Photo from ${memory.guestName}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div
                    style={{
                      padding: '24px 28px 20px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {/* Memory text */}
                    <p
                      style={{
                        fontFamily: vibeSkin.fonts.heading,
                        fontSize: 16,
                        lineHeight: 1.7,
                        color: palette.foreground,
                        fontStyle: 'italic',
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      &ldquo;{memory.memoryText}&rdquo;
                    </p>

                    {/* Footer */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          fontFamily: vibeSkin.fonts.body,
                          fontSize: 13,
                          color: palette.accent,
                          fontWeight: 700,
                          fontVariant: 'small-caps',
                          margin: 0,
                          letterSpacing: '0.04em',
                        }}
                      >
                        — {memory.guestName}
                        {memory.relationship ? `, ${memory.relationship}` : ''}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{ fontSize: 14, color: palette.accent2 }}
                          aria-hidden="true"
                        >
                          ♥
                        </span>
                        <span
                          style={{
                            fontFamily: vibeSkin.fonts.body,
                            fontSize: 12,
                            color: palette.muted,
                          }}
                        >
                          {formatDate(memory.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Submission CTA ── */}
        <AnimatePresence>
          {!showSubmit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', marginTop: 56 }}
            >
              <p
                style={{
                  fontFamily: vibeSkin.fonts.body,
                  fontSize: 15,
                  color: palette.muted,
                  marginBottom: 16,
                }}
              >
                ✏️ Share Your Memory
              </p>
              <button
                onClick={handleShareClick}
                style={{
                  background: palette.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 32px',
                  fontFamily: vibeSkin.fonts.body,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = '0.85')}
                onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = '1')}
              >
                Share a moment with {name1} &amp; {name2} →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit Form (inline) ── */}
        <AnimatePresence>
          {showSubmit && (
            <motion.div
              ref={submitRef}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: 56 }}
            >
              <CommunityMemorySubmit
                siteId={siteId}
                coupleNames={coupleNames}
                vibeSkin={vibeSkin}
                onSubmitted={handleSubmitted}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
