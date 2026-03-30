'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteCompletenessPanel.tsx
// Animated completeness score + AI suggestions for each missing field.
// Shows what's done, what's missing, and generates bespoke
// AI-written content for gaps with one click.
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  CheckCircle2, Circle, Sparkles, ChevronDown,
  Image, CalendarDays, MapPin, Users, Mic2,
  BookOpen, Globe, Hash, Music, Type,
} from 'lucide-react';
import type { StoryManifest } from '@/types';

// ── Types ──────────────────────────────────────────────────────

interface Milestone {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  suggestionField?: string; // matches /api/suggest-content field names
  suggestionContext?: string;
  ctaLabel?: string;
  onApply?: (value: string) => void;
}

interface SiteCompletenessPanelProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  onUpdate?: (patch: Partial<StoryManifest>) => void;
  /** When provided, shows a compact inline summary instead of the full panel */
  compact?: boolean;
}

// ── Circular progress ring ──────────────────────────────────────

function ProgressRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const is100 = score === 100;

  const color = is100 ? 'var(--eg-gold, #D6C6A8)' : score >= 80 ? 'var(--eg-accent, #A3B18A)' : score >= 50 ? 'var(--eg-gold, #D6C6A8)' : 'var(--eg-plum, #6D597A)';
  const glowControls = useAnimation();

  useEffect(() => {
    if (is100) {
      glowControls.start({
        opacity: [0, 0.55, 0],
        scale: [1, 1.18, 1],
        transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
      });
    }
  }, [is100, glowControls]);

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      {/* Pulsing glow halo (100% only) */}
      {is100 && (
        <motion.div
          animate={glowControls}
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(214,198,168,0.55) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={6} />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
        {/* Score text (counter-rotated) */}
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          style={{
            transform: 'rotate(90deg)',
            transformOrigin: `${size / 2}px ${size / 2}px`,
            fontSize: size * 0.22,
            fontWeight: 800,
            fill: color,
            fontFamily: 'var(--eg-font-body, system-ui)',
          }}
        >
          {score}%
        </text>
      </svg>
    </div>
  );
}

// ── 100% Celebration sparkles ───────────────────────────────────

const SPARKLE_POSITIONS = [
  { x: -18, y: -14, delay: 0.1, size: 10 },
  { x: 16, y: -20, delay: 0.25, size: 8 },
  { x: 28, y: 4, delay: 0.4, size: 7 },
  { x: 18, y: 22, delay: 0.55, size: 9 },
  { x: -24, y: 16, delay: 0.7, size: 8 },
];

function CelebrationSparkles() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {SPARKLE_POSITIONS.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: p.x,
            y: p.y,
          }}
          transition={{
            duration: 1.8,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 2.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            color: 'var(--eg-gold, #D6C6A8)',
            fontSize: p.size,
            lineHeight: 1,
          }}
        >
          ✦
        </motion.div>
      ))}
    </div>
  );
}

// ── Single milestone row ────────────────────────────────────────

function MilestoneRow({
  milestone,
  vibeString,
  coupleNames,
  onApply,
  isLast,
}: {
  milestone: Milestone;
  vibeString: string;
  coupleNames: [string, string];
  onApply?: (field: string, value: string) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [applied, setApplied] = useState(false);

  const fetchSuggestion = useCallback(async () => {
    if (!milestone.suggestionField) return;
    setLoading(true);
    try {
      const res = await fetch('/api/suggest-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: milestone.suggestionField,
          vibeString,
          coupleNames,
          context: milestone.suggestionContext,
        }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion || '');
    } catch {
      setSuggestion('Unable to generate suggestion right now.');
    } finally {
      setLoading(false);
    }
  }, [milestone.suggestionField, milestone.suggestionContext, vibeString, coupleNames]);

  const handleExpand = () => {
    if (!expanded && !suggestion && milestone.suggestionField) {
      fetchSuggestion();
    }
    setExpanded(v => !v);
  };

  const handleApply = () => {
    if (suggestion && onApply && milestone.suggestionField) {
      onApply(milestone.suggestionField, suggestion);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  const Icon = milestone.icon;

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)' }}>
      {/* Main row */}
      <div
        onClick={!milestone.done && milestone.suggestionField ? handleExpand : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 0',
          cursor: !milestone.done && milestone.suggestionField ? 'pointer' : 'default',
        }}
      >
        {/* Status icon */}
        <div style={{ flexShrink: 0, width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {milestone.done
            ? <CheckCircle2 size={18} color="#A3B18A" />
            : <Circle size={18} color="rgba(0,0,0,0.18)" />
          }
        </div>

        {/* Category icon */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: milestone.done ? 'rgba(163,177,138,0.12)' : 'rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={milestone.done ? '#A3B18A' : 'rgba(0,0,0,0.3)'} />
        </div>

        {/* Labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.78rem', fontWeight: 700,
            color: milestone.done ? 'var(--eg-fg)' : 'rgba(0,0,0,0.5)',
            lineHeight: 1.3,
          }}>
            {milestone.label}
          </div>
          {!milestone.done && (
            <div style={{ fontSize: '0.67rem', color: 'rgba(0,0,0,0.35)', marginTop: '1px' }}>
              {milestone.description}
            </div>
          )}
        </div>

        {/* AI badge / chevron for incomplete items */}
        {!milestone.done && milestone.suggestionField && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '100px',
              background: expanded ? 'rgba(163,177,138,0.15)' : 'rgba(163,177,138,0.08)',
              border: '1px solid rgba(163,177,138,0.2)',
            }}>
              <Sparkles size={10} color="var(--eg-accent, #A3B18A)" />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--eg-accent, #A3B18A)', letterSpacing: '0.06em' }}>
                AI Write
              </span>
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={13} color="rgba(0,0,0,0.25)" />
            </motion.div>
          </div>
        )}
      </div>

      {/* Expanded suggestion panel */}
      <AnimatePresence>
        {expanded && !milestone.done && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              margin: '0 0 10px 38px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #fdfaf5, #fef9f2)',
              borderRadius: '10px',
              border: '1px solid rgba(163,177,138,0.15)',
            }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '14px', height: '14px', border: '2px solid rgba(163,177,138,0.3)', borderTopColor: 'var(--eg-accent, #A3B18A)', borderRadius: '50%' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--eg-accent, #A3B18A)', fontStyle: 'italic' }}>
                    Crafting your suggestion…
                  </span>
                </div>
              ) : suggestion ? (
                <>
                  <p style={{
                    fontSize: '0.8rem', lineHeight: 1.65, color: '#3D3530',
                    margin: '0 0 10px', fontStyle: 'italic',
                    fontFamily: 'var(--eg-font-heading, Georgia, serif)',
                  }}>
                    &ldquo;{suggestion}&rdquo;
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={handleApply}
                      disabled={applied}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 12px', borderRadius: '6px', border: 'none',
                        background: applied ? 'var(--eg-accent, #A3B18A)' : 'linear-gradient(135deg, #A3B18A, #8FA876)',
                        color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                        cursor: applied ? 'default' : 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {applied ? '✓ Applied!' : `Use this ${milestone.ctaLabel || 'suggestion'}`}
                    </button>
                    <button
                      onClick={fetchSuggestion}
                      style={{
                        padding: '5px 10px', borderRadius: '6px',
                        border: '1px solid rgba(163,177,138,0.2)',
                        background: 'transparent', color: 'var(--eg-accent, #A3B18A)',
                        fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function SiteCompletenessPanel({
  manifest,
  coupleNames,
  onUpdate,
  compact = false,
}: SiteCompletenessPanelProps) {
  const [open, setOpen] = useState(false);

  // ── Compute milestones ──────────────────────────────────────
  const chaptersWithPhotos = (manifest.chapters || []).filter(c => c.images?.length > 0);
  const totalPhotos = (manifest.chapters || []).reduce((n, c) => n + (c.images?.length || 0), 0);

  const milestones: Milestone[] = [
    {
      id: 'story',
      label: 'Love story created',
      description: 'Your story chapters have been generated',
      icon: BookOpen,
      done: (manifest.chapters?.length ?? 0) >= 3,
    },
    {
      id: 'photos',
      label: 'Photos added',
      description: 'Add photos to bring your chapters to life',
      icon: Image,
      done: totalPhotos >= 3,
      suggestionField: undefined, // photos can't be AI-written
    },
    {
      id: 'date',
      label: 'Wedding date set',
      description: 'Let your guests know when to save the date',
      icon: CalendarDays,
      done: !!manifest.logistics?.date,
    },
    {
      id: 'events',
      label: 'Event details added',
      description: 'Add ceremony & reception info for guests',
      icon: MapPin,
      done: (manifest.events?.length ?? 0) > 0,
    },
    {
      id: 'tagline',
      label: 'Hero tagline written',
      description: 'A poetic subtitle for your site header',
      icon: Type,
      done: !!manifest.poetry?.heroTagline,
      suggestionField: 'tagline',
      ctaLabel: 'tagline',
      onApply: (value) => onUpdate?.({ poetry: { ...manifest.poetry, heroTagline: value, closingLine: manifest.poetry?.closingLine || '', rsvpIntro: manifest.poetry?.rsvpIntro || '' } }),
    },
    {
      id: 'rsvp-intro',
      label: 'RSVP intro message',
      description: 'A personal note welcoming guests to RSVP',
      icon: Users,
      done: !!manifest.poetry?.rsvpIntro,
      suggestionField: 'rsvpIntro',
      ctaLabel: 'message',
      onApply: (value) => onUpdate?.({ poetry: { heroTagline: manifest.poetry?.heroTagline || '', closingLine: manifest.poetry?.closingLine || '', rsvpIntro: value } }),
    },
    {
      id: 'hashtag',
      label: 'Wedding hashtag set',
      description: 'Give guests a hashtag to tag their photos',
      icon: Hash,
      done: (manifest.hashtags?.length ?? 0) > 0,
      suggestionField: 'hashtags',
      ctaLabel: 'hashtags',
      onApply: (value) => {
        const tags = value.split('\n').filter(Boolean).map(t => t.trim());
        onUpdate?.({ hashtags: tags });
      },
    },
    {
      id: 'soundtrack',
      label: '"Our Soundtrack" added',
      description: 'Share the playlist that defines your love story',
      icon: Music,
      done: !!manifest.spotifyUrl,
    },
    {
      id: 'voice',
      label: 'Voice samples recorded',
      description: 'Train the AI chatbot with your voice',
      icon: Mic2,
      done: (manifest.voiceSamples?.length ?? 0) >= 3,
    },
    {
      id: 'published',
      label: 'Site published',
      description: 'Share your love story with the world',
      icon: Globe,
      done: !!manifest.publishedAt,
    },
  ];

  const doneCount = milestones.filter(m => m.done).length;
  const score = Math.round((doneCount / milestones.length) * 100);
  const incomplete = milestones.filter(m => !m.done);

  const handleApply = (field: string, value: string) => {
    const milestone = milestones.find(m => m.suggestionField === field);
    if (milestone?.onApply) {
      milestone.onApply(value);
    }
  };

  // ── Compact mode (badge in site card) ──────────────────────
  if (compact) {
    const scoreColor = score >= 80 ? 'var(--eg-accent, #A3B18A)' : score >= 50 ? 'var(--eg-gold, #D6C6A8)' : 'var(--eg-plum, #6D597A)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Mini progress bar */}
        <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.07)', borderRadius: '100px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
            style={{ height: '100%', background: scoreColor, borderRadius: '100px' }}
          />
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: scoreColor, flexShrink: 0 }}>
          {score}%
        </span>
        {incomplete.length > 0 && (
          <span style={{ fontSize: '0.62rem', color: 'rgba(0,0,0,0.4)', flexShrink: 0 }}>
            {incomplete.length} left
          </span>
        )}
      </div>
    );
  }

  // ── Full panel ──────────────────────────────────────────────
  return (
    <div style={{
      background: '#fff',
      borderRadius: '1rem',
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
      overflow: 'hidden',
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '1.1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '14px',
          background: score === 100 ? 'linear-gradient(135deg, rgba(214,198,168,0.07) 0%, rgba(163,177,138,0.06) 100%)' : 'none',
          border: 'none', cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.6s ease',
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing score={score} size={60} />
          {score === 100 && <CelebrationSparkles />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--eg-muted)', marginBottom: '3px' }}>
            Site Completeness
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--eg-fg)' }}>
            {doneCount}/{milestones.length} milestones complete
          </div>
          {incomplete.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              <Sparkles size={11} color="var(--eg-accent, #A3B18A)" />
              <span style={{ fontSize: '0.68rem', color: 'var(--eg-accent, #A3B18A)', fontWeight: 600 }}>
                {incomplete.filter(m => m.suggestionField).length} AI suggestions available
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginTop: '3px' }}
            >
              <motion.span
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'linear-gradient(90deg, #A3B18A, #D6C6A8, #C9A96E, #A3B18A)',
                  backgroundSize: '300% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block',
                }}
              >
                ✨ Your site is looking incredible!
              </motion.span>
            </motion.div>
          )}
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ flexShrink: 0, color: 'rgba(0,0,0,0.25)' }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Expandable milestone list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {/* Section header */}
            <div style={{
              padding: '0 1.25rem',
              borderTop: '1px solid rgba(0,0,0,0.04)',
            }}>
              {/* Incomplete items first */}
              {incomplete.length > 0 && (
                <div style={{ paddingTop: '8px', paddingBottom: '4px' }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)', marginBottom: '4px' }}>
                    To do
                  </div>
                  {incomplete.map((m, i) => (
                    <MilestoneRow
                      key={m.id}
                      milestone={m}
                      vibeString={manifest.vibeString || ''}
                      coupleNames={coupleNames}
                      onApply={handleApply}
                      isLast={i === incomplete.length - 1}
                    />
                  ))}
                </div>
              )}

              {/* Completed items */}
              {doneCount > 0 && (
                <div style={{ paddingTop: '8px', paddingBottom: '12px', borderTop: incomplete.length > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none', marginTop: incomplete.length > 0 ? '4px' : 0 }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)', marginBottom: '4px' }}>
                    Done
                  </div>
                  {milestones.filter(m => m.done).map((m, i, arr) => (
                    <MilestoneRow
                      key={m.id}
                      milestone={m}
                      vibeString={manifest.vibeString || ''}
                      coupleNames={coupleNames}
                      onApply={handleApply}
                      isLast={i === arr.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
