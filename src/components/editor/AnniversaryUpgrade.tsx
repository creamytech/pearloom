'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gem } from 'lucide-react';
import { Button } from '@/components/ui';
import type { StoryManifest, Chapter } from '@/types';
import { parseLocalDate } from '@/lib/date';

interface AnniversaryUpgradeProps {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}

function getYearsAndMonths(dateStr?: string): { years: number; months: number } | null {
  if (!dateStr) return null;
  const weddingDate = parseLocalDate(dateStr);
  if (isNaN(weddingDate.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - weddingDate.getFullYear()) * 12 + (now.getMonth() - weddingDate.getMonth());
  if (months <= 0) return null;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return { years, months: remainingMonths };
}

// ── Anniversary Badge — floats on published site ─────────────────────────────
export function AnniversaryBadge({ weddingDate }: { weddingDate?: string }) {
  const result = getYearsAndMonths(weddingDate);
  if (!result) return null;

  const { years, months } = result;
  const label = years >= 1
    ? `${years} Year${years !== 1 ? 's' : ''} Married`
    : `${months} Month${months !== 1 ? 's' : ''} Together`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 1.5 }}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9000,
        background: 'rgba(30,27,22,0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(163,177,138,0.35)',
        borderRadius: '2rem',
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
      }}
    >
      <Gem size={16} style={{ color: 'var(--pl-olive)' }} />
      <span
        style={{
          color: '#f5f0e8',
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <motion.span
        animate={{ rotate: [0, 15, -10, 5, 0] }}
        transition={{ duration: 1.2, delay: 2.5, repeat: Infinity, repeatDelay: 6 }}
        style={{ fontSize: '0.8rem', display: 'inline-block' }}
      >

      </motion.span>
    </motion.div>
  );
}

// ── Anniversary Upgrade Panel ─────────────────────────────────────────────────
export function AnniversaryUpgrade({ manifest, onChange }: AnniversaryUpgradeProps) {
  const weddingDate = manifest.events?.[0]?.date || manifest.logistics?.date;
  const result = getYearsAndMonths(weddingDate);

  const anniversaryChapterExists = manifest.chapters?.some(ch => ch.id === '__anniversary__');

  function handleTransform() {
    const years = result?.years ?? 0;
    const months = result?.months ?? 0;

    const titleLabel = years >= 1
      ? `${years} Year${years !== 1 ? 's' : ''} of Love`
      : 'Still Going Strong';

    const anniversaryChapter: Chapter = {
      id: '__anniversary__',
      date: new Date().toISOString().split('T')[0],
      title: `${titleLabel} — Then & Now`,
      subtitle: 'Our love story continues.',
      description: 'Add your anniversary memories here — new photos, new adventures, the same love.',
      images: [],
      location: null,
      mood: 'golden anniversary',
      layout: 'editorial',
      order: (manifest.chapters?.length ?? 0) + 1,
    };

    const updatedChapters = anniversaryChapterExists
      ? manifest.chapters
      : [...(manifest.chapters || []), anniversaryChapter];

    onChange({
      ...manifest,
      anniversaryMode: true,
      occasion: 'anniversary',
      chapters: updatedChapters,
    });
  }

  function handleRevert() {
    const filteredChapters = (manifest.chapters || []).filter(ch => ch.id !== '__anniversary__');
    onChange({
      ...manifest,
      anniversaryMode: false,
      occasion: 'wedding',
      chapters: filteredChapters,
    });
  }

  function handleAddChapter() {
    const idx = (manifest.chapters?.length ?? 0) + 1;
    const newChapter: Chapter = {
      id: `__anniversary_${Date.now()}__`,
      date: new Date().toISOString().split('T')[0],
      title: 'New Anniversary Memory',
      subtitle: 'Another chapter in our story.',
      description: 'Share what you\'ve been up to since the wedding.',
      images: [],
      location: null,
      mood: 'romantic',
      layout: 'editorial',
      order: idx,
    };
    onChange({
      ...manifest,
      chapters: [...(manifest.chapters || []), newChapter],
    });
  }

  const panelStyle: React.CSSProperties = {
    background: 'rgba(163,177,138,0.08)',
    border: '1px solid rgba(163,177,138,0.2)',
    borderRadius: '0.875rem',
    padding: '1.25rem',
    marginTop: '1rem',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#f5f0e8',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: 'rgba(245,240,232,0.65)',
    lineHeight: 1.6,
    marginBottom: '1rem',
  };

  const btnSecondaryStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    background: 'transparent',
    color: 'rgba(245,240,232,0.6)',
    fontWeight: 500,
    fontSize: '0.8rem',
    border: '1px solid rgba(0,0,0,0.08)',
    cursor: 'pointer',
  };

  if (manifest.anniversaryMode) {
    return (
      <div style={panelStyle}>
        <div style={headingStyle}>
          <span>✓</span>
          <span>Anniversary Mode Active</span>
        </div>
        <p style={bodyStyle}>
          Your site is celebrating your love story continuing.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button variant="accent" size="sm" onClick={handleAddChapter}>
            Add Anniversary Chapter +
          </Button>
          <button style={btnSecondaryStyle} onClick={handleRevert}>
            Revert to Wedding Site
          </button>
        </div>
      </div>
    );
  }

  const timeLabel = result
    ? result.years >= 1
      ? `${result.years} year${result.years !== 1 ? 's' : ''}${result.months > 0 ? ` and ${result.months} month${result.months !== 1 ? 's' : ''}` : ''}`
      : `${result.months} month${result.months !== 1 ? 's' : ''}`
    : null;

  return (
    <div style={panelStyle}>
      <div style={headingStyle}>
        <span>🎊</span>
        <span>Celebrate Your Anniversary</span>
      </div>
      <p style={bodyStyle}>
        {timeLabel
          ? `Your wedding was ${timeLabel} ago. Transform your site into an anniversary celebration — add new memories and a "Then & Now" section.`
          : 'Transform your wedding site into an anniversary celebration — add new memories and a "Then & Now" section.'}
      </p>
      <Button variant="accent" size="sm" onClick={handleTransform}>
        Transform to Anniversary Site →
      </Button>
    </div>
  );
}
