'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / WelcomeOverlay.tsx — Context-aware welcome screen
// First visit: "Your site is ready" with editing hints
// Returning: Personalized greeting with site stats
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { StoryManifest } from '@/types';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  siteName?: string;
  manifest?: StoryManifest;
  coupleNames?: [string, string];
}

const VISIT_KEY = 'pearloom_editor_visits';

function getVisitCount(): number {
  try { return parseInt(localStorage.getItem(VISIT_KEY) || '0', 10); } catch { return 0; }
}

function incrementVisit(): void {
  try { localStorage.setItem(VISIT_KEY, String(getVisitCount() + 1)); } catch {}
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getSiteStats(manifest?: StoryManifest) {
  if (!manifest) return null;
  const rsvpCount = manifest.rsvps?.length || 0;
  const attending = manifest.rsvps?.filter(r => r.status === 'attending').length || 0;
  const guestbookCount = (manifest as any).guestbookMessages?.length || 0;
  const chapterCount = manifest.chapters?.length || 0;
  const eventCount = manifest.events?.length || 0;
  const photoCount = (manifest.chapters?.reduce((sum, ch) => sum + (ch.images?.length || 0), 0) || 0)
    + ((manifest as any).coverPhoto ? 1 : 0)
    + ((manifest as any).heroSlideshow?.filter(Boolean)?.length || 0);
  const hasBlocks = (manifest.blocks?.length || 0) > 0;

  const stats: Array<{ label: string; value: string }> = [];
  if (rsvpCount > 0) stats.push({ label: 'RSVPs', value: `${attending} attending` });
  if (guestbookCount > 0) stats.push({ label: 'Messages', value: `${guestbookCount} new` });
  if (photoCount > 0) stats.push({ label: 'Photos', value: String(photoCount) });
  if (chapterCount > 0) stats.push({ label: 'Chapters', value: String(chapterCount) });
  if (eventCount > 0) stats.push({ label: 'Events', value: String(eventCount) });

  return { rsvpCount, attending, guestbookCount, chapterCount, eventCount, photoCount, hasBlocks, stats };
}

export function WelcomeOverlay({ onDismiss, siteName, manifest, coupleNames }: WelcomeOverlayProps) {
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const visits = getVisitCount();
    setIsReturning(visits > 0);
    incrementVisit();
  }, []);

  const stats = getSiteStats(manifest);
  const firstName = coupleNames?.[0] || '';
  const greeting = getTimeGreeting();

  // ── Returning user content ─────────────────────────────────
  const returningTitle = firstName ? `${greeting}, ${firstName}` : `${greeting}!`;
  const returningSubtitle = stats?.rsvpCount
    ? `You have ${stats.attending} guest${stats.attending !== 1 ? 's' : ''} attending so far.`
    : stats?.hasBlocks
      ? 'Your site is looking great. Keep building!'
      : 'Pick up where you left off.';

  // ── First visit content ─────────────────────────────────────
  const firstTitle = 'Your Pearloom site is ready';
  const firstSubtitle = 'Click any section to edit it. Drag to rearrange. Make it yours.';

  const title = isReturning ? returningTitle : firstTitle;
  const subtitle = isReturning ? returningSubtitle : firstSubtitle;
  const ctaText = isReturning ? 'Continue editing' : 'Click anywhere to start editing';

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', overflow: 'hidden',
      }}
    >
      {/* Clean neutral background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#FAFAFA',
      }} />

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '0',
          padding: 'clamp(2.5rem, 6vw, 4rem) clamp(2rem, 5vw, 5rem)',
          borderRadius: '10px',
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
          maxWidth: '480px',
          width: '90%',
        } as React.CSSProperties}
      >
        {/* Decorative accent */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '48px' }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '2px', background: '#18181B', borderRadius: '2px', marginBottom: '2rem' }}
        />

        {/* Accent symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: '1.8rem', color: '#18181B', opacity: 0.6,
            marginBottom: '1.5rem',
          }}
        >
          {isReturning ? '✦' : '✦'}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'inherit',
            fontSize: isReturning ? 'clamp(1.5rem, 4vw, 2.2rem)' : 'clamp(1.8rem, 5vw, 2.8rem)',
            fontWeight: 400, 
            color: '#3F3F46',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            margin: '0 0 0.75rem',
            lineHeight: 1.15,
          }}
        >
          {title}
        </motion.h1>

        {/* Site name */}
        {siteName && !isReturning && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            style={{
              fontSize: '0.9rem', fontWeight: 600,
              color: '#18181B',
              marginBottom: '0.5rem',
              letterSpacing: '0.02em',
            }}
          >
            {siteName}
          </motion.p>
        )}

        {/* Subtitle / stats */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: '0.8rem',
            color: '#71717A',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '320px',
            margin: '0 0 1.5rem',
          }}
        >
          {subtitle}
        </motion.p>

        {/* Quick stats for returning users */}
        {isReturning && stats && stats.stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            style={{
              display: 'flex', gap: '16px', marginBottom: '1.5rem',
              flexWrap: 'wrap', justifyContent: 'center',
            }}
          >
            {stats.stats.slice(0, 3).map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 16px', borderRadius: '12px',
                  background: 'rgba(24,24,27,0.04)',
                  border: '1px solid rgba(24,24,27,0.08)',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#18181B' }}>{s.value}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* CTA hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6, 1] }}
          transition={{ duration: 2, delay: 1.8, repeat: Infinity, repeatDelay: 3 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 20px', borderRadius: '8px',
            background: 'rgba(24,24,27,0.06)',
            border: '1px solid rgba(24,24,27,0.1)',
            color: '#18181B',
            fontSize: '0.65rem', fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          {ctaText}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
