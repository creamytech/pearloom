'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteAnalytics.tsx
// Polished analytics dashboard widget for a couple's site.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  Eye, Users, ImageIcon, CheckCircle2, Circle,
  TrendingUp, Share2, Pencil, ExternalLink,
} from 'lucide-react';
import type { StoryManifest } from '@/types';
import { buildSiteUrl } from '@/lib/site-urls';

// ── Brand palette ──────────────────────────────────────────────
// All values resolve to design tokens defined in globals.css. Names retained
// as semantic aliases (sage, gold, etc.) for legibility at call sites.
const C = {
  ivory:    'var(--pl-cream)',
  gold:     'var(--pl-gold)',
  sage:     'var(--pl-olive)',
  espresso: 'var(--pl-ink-soft)',
  muted:    'var(--pl-muted)',
  red:      'var(--pl-plum)',
  white:    'var(--pl-cream-card)',
  border:   'var(--pl-divider)',
  shadow:   '0 2px 14px color-mix(in oklab, var(--pl-ink) 8%, transparent)',
};

// ── Shared card wrapper ────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white,
      borderRadius: '1rem',
      padding: '1.25rem',
      border: `1px solid ${C.border}`,
      boxShadow: C.shadow,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'block',
      fontSize: '0.6rem',
      fontWeight: 800,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: C.muted,
      marginBottom: '1rem',
    }}>
      {children}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: C.white,
        borderRadius: '1rem',
        padding: '1.1rem',
        border: `1px solid ${C.border}`,
        boxShadow: C.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: C.muted,
        }}>
          {label}
        </span>
        <div style={{
          width: '28px', height: '28px', borderRadius: '0.5rem',
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} color={color} />
        </div>
      </div>
      <div style={{
        fontSize: '1.85rem', fontWeight: 700, color: C.espresso,
        fontFamily: 'var(--pl-font-heading, serif)', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.68rem', color: C.muted }}>{sub}</div>
      )}
    </motion.div>
  );
}

// ── Props ──────────────────────────────────────────────────────
export interface SiteAnalyticsProps {
  manifest: StoryManifest;
  coupleNames: [string, string];
  onEdit?: () => void;
  onShare?: () => void;
}

// ── Main component ─────────────────────────────────────────────
export function SiteAnalytics({ manifest, coupleNames, onEdit, onShare }: SiteAnalyticsProps) {

  // ── Computed stats ──────────────────────────────────────────
  const views = manifest.analytics?.views ?? 0;

  const rsvps = manifest.rsvps ?? [];
  const attending = rsvps.filter((r) => r.status === 'attending').length;
  const declined  = rsvps.filter((r) => r.status === 'declined').length;
  const awaiting  = rsvps.filter((r) => r.status === 'pending').length;
  const rsvpTotal = rsvps.length;

  const totalPhotos = (manifest.chapters ?? []).reduce(
    (sum, ch) => sum + (ch.images?.length ?? 0),
    0,
  );

  const chapters = manifest.chapters ?? [];
  const completedChapters = chapters.filter(
    (ch) => ch.title && ch.description && ch.images?.length > 0,
  ).length;
  const completionPct = chapters.length > 0
    ? Math.round((completedChapters / chapters.length) * 100)
    : 0;

  // ── RSVP bar percentages ────────────────────────────────────
  const attendingPct = rsvpTotal > 0 ? (attending / rsvpTotal) * 100 : 0;
  const declinedPct  = rsvpTotal > 0 ? (declined  / rsvpTotal) * 100 : 0;
  const awaitingPct  = rsvpTotal > 0 ? (awaiting  / rsvpTotal) * 100 : 0;

  // ── Guest name list (max 6) ─────────────────────────────────
  const attendingGuests = rsvps.filter((r) => r.status === 'attending');
  const shownGuests = attendingGuests.slice(0, 6);
  const extraGuests = attendingGuests.length - shownGuests.length;

  // ── Checklist ───────────────────────────────────────────────
  const checklist: { label: string; done: boolean }[] = [
    { label: 'Story created',          done: true },
    { label: 'Cover photos added',     done: (chapters[0]?.images?.length ?? 0) > 0 },
    { label: 'Wedding date set',       done: !!manifest.logistics?.date },
    { label: 'Events added',           done: (manifest.events?.length ?? 0) > 0 },
    { label: 'Site published',         done: !!(manifest.publishedAt || manifest.subdomain) },
    { label: '5+ chapters',            done: chapters.length >= 5 },
  ];

  // ── Preview URL ─────────────────────────────────────────────
  const previewHref = manifest.previewToken
    ? `/preview/${manifest.previewToken}`
    : manifest.subdomain
      ? buildSiteUrl(manifest.subdomain, '', undefined, manifest.occasion)
      : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: C.muted,
        }}>
          Site Overview
        </span>
        <span style={{ fontSize: '0.78rem', color: C.muted }}>
          {coupleNames[0]} &amp; {coupleNames[1]}
        </span>
      </div>

      {/* 4-stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.7rem' }}>
        <StatCard
          icon={Eye}
          label="Views"
          value={views.toLocaleString()}
          sub={manifest.analytics?.lastViewed ? `Last visit ${manifest.analytics.lastViewed}` : undefined}
          color={C.gold}
          delay={0}
        />
        <StatCard
          icon={Users}
          label="RSVPs"
          value={rsvpTotal}
          sub={rsvpTotal > 0 ? `${attending} attending` : 'None yet'}
          color={C.sage}
          delay={0.06}
        />
        <StatCard
          icon={ImageIcon}
          label="Photos"
          value={totalPhotos}
          sub={`across ${chapters.length} chapter${chapters.length !== 1 ? 's' : ''}`}
          color="var(--pl-gold)"
          delay={0.12}
        />
        <StatCard
          icon={TrendingUp}
          label="Completion"
          value={`${completionPct}%`}
          sub={`${completedChapters} of ${chapters.length} chapters full`}
          color={C.espresso}
          delay={0.18}
        />
      </div>

      {/* RSVP breakdown */}
      {rsvpTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
        >
          <Card>
            <SectionLabel>RSVP Breakdown</SectionLabel>

            {/* Segmented bar */}
            <div style={{
              display: 'flex', height: '8px', borderRadius: '100px', overflow: 'hidden',
              background: 'color-mix(in oklab, var(--pl-ink) 6%, transparent)', gap: '1px',
            }}>
              {attendingPct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attendingPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                  style={{ height: '100%', background: C.sage, borderRadius: '100px 0 0 100px' }}
                />
              )}
              {declinedPct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${declinedPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.4 }}
                  style={{ height: '100%', background: C.red }}
                />
              )}
              {awaitingPct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${awaitingPct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
                  style={{ height: '100%', background: 'color-mix(in oklab, var(--pl-muted) 60%, var(--pl-cream))', borderRadius: '0 100px 100px 0' }}
                />
              )}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem' }}>
              {[
                { label: 'Attending', count: attending, color: C.sage },
                { label: 'Declining', count: declined,  color: C.red },
                { label: 'Awaiting',  count: awaiting,  color: 'color-mix(in oklab, var(--pl-muted) 60%, var(--pl-cream))' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.7rem', color: C.muted }}>
                    {item.count} {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Guest names */}
            {shownGuests.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.85rem' }}>
                {shownGuests.map((r) => (
                  <span
                    key={r.id}
                    style={{
                      fontSize: '0.72rem', padding: '0.2rem 0.65rem',
                      borderRadius: '100px', background: C.ivory,
                      color: C.espresso, fontWeight: 500,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {r.guestName}
                  </span>
                ))}
                {extraGuests > 0 && (
                  <span style={{
                    fontSize: '0.72rem', padding: '0.2rem 0.65rem',
                    borderRadius: '100px', background: 'color-mix(in oklab, var(--pl-ink) 5%, transparent)',
                    color: C.muted, fontWeight: 500,
                  }}>
                    +{extraGuests} more
                  </span>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Story completeness checklist */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
      >
        <Card>
          <SectionLabel>Story Checklist</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {checklist.map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.55rem 0',
                  borderBottom: i < checklist.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                {item.done
                  ? <CheckCircle2 size={15} color={C.sage} strokeWidth={2.2} />
                  : <Circle      size={15} color={C.muted} strokeWidth={1.6} />
                }
                <span style={{
                  fontSize: '0.8rem',
                  color: item.done ? C.espresso : C.muted,
                  fontWeight: item.done ? 500 : 400,
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.34 }}
        style={{ display: 'flex', gap: '0.6rem' }}
      >
        {/* Edit Story */}
        <button
          onClick={onEdit}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem', padding: '0.65rem 0.5rem',
            borderRadius: '0.75rem', border: `1px solid ${C.border}`,
            background: C.gold, color: C.white,
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            fontFamily: 'var(--pl-font-body, sans-serif)',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = '0.88'; }}
          onMouseOut={(e)  => { e.currentTarget.style.opacity = '1'; }}
        >
          <Pencil size={12} />
          Edit Story
        </button>

        {/* Share Site */}
        <button
          onClick={onShare}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem', padding: '0.65rem 0.5rem',
            borderRadius: '0.75rem', border: `1px solid ${C.border}`,
            background: C.white, color: C.espresso,
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            fontFamily: 'var(--pl-font-body, sans-serif)',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = C.ivory; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = C.white; }}
        >
          <Share2 size={12} />
          Share Site
        </button>

        {/* Preview */}
        {previewHref ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.65rem 0.5rem',
              borderRadius: '0.75rem', border: `1px solid ${C.border}`,
              background: C.white, color: C.espresso,
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              fontFamily: 'var(--pl-font-body, sans-serif)',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = C.ivory; }}
            onMouseOut={(e)  => { (e.currentTarget as HTMLAnchorElement).style.background = C.white; }}
          >
            <ExternalLink size={12} />
            Preview
          </a>
        ) : (
          <button
            disabled
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.65rem 0.5rem',
              borderRadius: '0.75rem', border: `1px solid ${C.border}`,
              background: C.ivory, color: C.muted,
              cursor: 'default', fontSize: '0.75rem', fontWeight: 600,
              fontFamily: 'var(--pl-font-body, sans-serif)',
            }}
          >
            <ExternalLink size={12} />
            Preview
          </button>
        )}
      </motion.div>

    </div>
  );
}
