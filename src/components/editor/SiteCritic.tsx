'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SiteCritic.tsx
//
// AI Site Critic — reviews a generated wedding site manifest
// and surfaces actionable improvement suggestions. All checks
// are client-side (no API calls). Shown after site generation.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryManifest } from '@/types';
import { IconSparkle, IconWarn, IconClose, IconChevronDown, IconChevronUp } from './EditorIcons';

// ── Suggestion types ─────────────────────────────────────────

type SuggestionLevel = 'warning' | 'suggestion';
type EditorTab = 'details' | 'events' | 'story' | 'registry' | 'travel' | 'faq' | 'chapters';

interface Suggestion {
  id: string;
  level: SuggestionLevel;
  title: string;
  description: string;
  tab: EditorTab;
}

interface SiteCriticProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  onNavigate?: (tab: string) => void;
}

// ── Analysis engine ──────────────────────────────────────────

function analyzeManifest(manifest: StoryManifest, names: [string, string]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const couple = `${names[0]} & ${names[1]}`;

  // No event date set
  if (!manifest.logistics?.date && !manifest.events?.some(e => e.date)) {
    suggestions.push({
      id: 'no-date',
      level: 'warning',
      title: 'No event date set',
      description: `Guests need to know when ${couple}'s big day is. Add the date so the countdown and calendar links work.`,
      tab: 'details',
    });
  }

  // Missing ceremony/reception time
  const hasCeremonyTime = manifest.events?.some(e => e.type === 'ceremony' && e.time);
  const hasReceptionTime = manifest.events?.some(e => e.type === 'reception' && e.time);
  if (!hasCeremonyTime && !hasReceptionTime && !manifest.logistics?.time) {
    suggestions.push({
      id: 'no-times',
      level: 'warning',
      title: 'Missing ceremony & reception times',
      description: 'Add event times so guests can plan their day. This also powers the schedule page.',
      tab: 'events',
    });
  }

  // No RSVP deadline
  if (!manifest.logistics?.rsvpDeadline) {
    suggestions.push({
      id: 'no-rsvp-deadline',
      level: 'warning',
      title: 'No RSVP deadline set',
      description: 'Setting a deadline helps you get a final headcount for catering, seating, and favours.',
      tab: 'details',
    });
  }

  // Fewer than 3 chapters
  const chapterCount = manifest.chapters?.length ?? 0;
  if (chapterCount < 3) {
    suggestions.push({
      id: 'few-chapters',
      level: 'suggestion',
      title: chapterCount === 0 ? 'No story chapters yet' : `Only ${chapterCount} story chapter${chapterCount === 1 ? '' : 's'}`,
      description: 'Three or more chapters make for a richer narrative. Add moments like how you met, the proposal, or a favourite trip.',
      tab: 'story',
    });
  }

  // No registry links
  const hasRegistry = manifest.registry?.enabled && (
    (manifest.registry.entries?.length ?? 0) > 0 || manifest.registry.cashFundUrl
  );
  if (!hasRegistry) {
    suggestions.push({
      id: 'no-registry',
      level: 'suggestion',
      title: 'No registry links',
      description: 'Add gift registry links or a cash fund so guests know where to send their love.',
      tab: 'registry',
    });
  }

  // Missing travel/hotel info
  const hasTravel = manifest.travelInfo && (
    (manifest.travelInfo.hotels?.length ?? 0) > 0 ||
    (manifest.travelInfo.airports?.length ?? 0) > 0 ||
    manifest.travelInfo.parkingInfo ||
    manifest.travelInfo.directions
  );
  if (!hasTravel) {
    suggestions.push({
      id: 'no-travel',
      level: 'suggestion',
      title: 'Missing travel & hotel info',
      description: 'Help out-of-town guests by adding nearby hotels, airport info, or parking details.',
      tab: 'travel',
    });
  }

  // No FAQ items
  if (!manifest.faqs || manifest.faqs.length === 0) {
    suggestions.push({
      id: 'no-faqs',
      level: 'suggestion',
      title: 'No FAQs added',
      description: 'Answer common questions upfront: dress code, plus-ones, kids, parking. It saves you dozens of texts.',
      tab: 'faq',
    });
  }

  // Chapter with no images
  const emptyChapter = manifest.chapters?.find(ch => !ch.images || ch.images.length === 0);
  if (emptyChapter) {
    suggestions.push({
      id: 'chapter-no-images',
      level: 'suggestion',
      title: `"${emptyChapter.title}" has no photos`,
      description: 'Chapters with images are much more engaging. Upload or connect photos for this chapter.',
      tab: 'chapters',
    });
  }

  return suggestions;
}

// ── Severity dot ─────────────────────────────────────────────

function StatusDot({ level }: { level: SuggestionLevel }) {
  const color = level === 'warning' ? '#D97706' : 'var(--pl-olive, #A3B18A)';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
        marginTop: 3,
      }}
    />
  );
}

// ── Max visible before "Show more" ──────────────────────────

const MAX_VISIBLE = 5;

// ── Component ────────────────────────────────────────────────

export function SiteCritic({ manifest, coupleNames, onNavigate }: SiteCriticProps) {
  const suggestions = useMemo(
    () => analyzeManifest(manifest, coupleNames),
    [manifest, coupleNames],
  );

  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (suggestions.length === 0 || dismissed) return null;

  const visible = showAll ? suggestions : suggestions.slice(0, MAX_VISIBLE);
  const hiddenCount = suggestions.length - MAX_VISIBLE;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          background: 'var(--pl-cream, #FAF7F2)',
          borderLeft: '3px solid var(--pl-olive, #A3B18A)',
          borderRadius: '8px',
          padding: '14px 16px',
          position: 'relative',
        }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: collapsed ? 0 : 12,
          }}
        >
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--pl-ink, #1A1A1A)',
            }}
          >
            <span style={{ color: 'var(--pl-olive, #A3B18A)', display: 'flex', alignItems: 'center' }}>
              <IconSparkle size={15} />
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              AI Review
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--pl-muted)',
                background: 'var(--pl-olive-12)',
                borderRadius: 10,
                padding: '1px 7px',
                marginLeft: 2,
              }}
            >
              {suggestions.length}
            </span>
            <span style={{ color: 'var(--pl-muted)', display: 'flex', alignItems: 'center', marginLeft: 2 }}>
              {collapsed ? <IconChevronDown size={12} /> : <IconChevronUp size={12} />}
            </span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--pl-muted)',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              opacity: 0.6,
            }}
            aria-label="Dismiss review"
          >
            <IconClose size={12} />
          </button>
        </div>

        {/* ── Suggestion rows ─────────────────────────────── */}
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <StatusDot level={s.level} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--pl-ink, #1A1A1A)', lineHeight: 1.3 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--pl-muted)', lineHeight: 1.45, marginTop: 2 }}>
                    {s.description}
                  </div>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate(s.tab)}
                    style={{
                      flexShrink: 0,
                      alignSelf: 'center',
                      background: 'var(--pl-olive, #A3B18A)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Fix
                  </button>
                )}
              </div>
            ))}

            {/* ── Show more / less ─────────────────────────── */}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(v => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--pl-olive, #A3B18A)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '4px 0 0',
                  textAlign: 'left',
                }}
              >
                {showAll ? 'Show fewer' : `Show ${hiddenCount} more suggestion${hiddenCount === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
