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
  const photoCount = manifest.chapters?.reduce((sum, ch) => sum + (ch.images?.length || 0), 0) || 0;
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
      {/* Warm gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #E8D5C4 0%, #F2E6D9 25%, #D4B8A0 50%, #E8CDB8 75%, #F0DFD0 100%)',
      }} />

      {/* Soft radial glows */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 30% 40%, rgba(255,240,220,0.5) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 70% 60%, rgba(210,190,170,0.4) 0%, transparent 50%)
        `,
      }} />

      {/* Noise texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
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
          borderRadius: '32px',
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(40px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 24px 80px rgba(43,30,20,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
          maxWidth: '480px',
          width: '90%',
        } as React.CSSProperties}
      >
        {/* Decorative accent */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '48px' }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: '2px', background: 'var(--pl-olive)', borderRadius: '2px', marginBottom: '2rem' }}
        />

        {/* Accent symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: '1.8rem', color: 'var(--pl-olive)', opacity: 0.6,
            marginBottom: '1.5rem',
          }}
        >
          {isReturning ? '👋' : '✦'}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: 'var(--pl-font-heading)',
            fontSize: isReturning ? 'clamp(1.5rem, 4vw, 2.2rem)' : 'clamp(1.8rem, 5vw, 2.8rem)',
            fontWeight: 400, fontStyle: 'italic',
            color: 'var(--pl-ink-soft)',
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
              fontSize: '0.92rem', fontWeight: 600,
              color: 'var(--pl-olive-deep)',
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
            fontSize: '0.88rem',
            color: 'var(--pl-muted)',
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
                  background: 'rgba(163,177,138,0.08)',
                  border: '1px solid rgba(163,177,138,0.15)',
                }}
              >
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--pl-olive-deep)' }}>{s.value}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--pl-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
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
            padding: '8px 20px', borderRadius: '100px',
            background: 'rgba(163,177,138,0.1)',
            border: '1px solid rgba(163,177,138,0.2)',
            color: 'var(--pl-olive-deep)',
            fontSize: '0.72rem', fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          {ctaText}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
