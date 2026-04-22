'use client';

// ─────────────────────────────────────────────────────────────
// SiteRendererV2 — new public-facing guest-site renderer built
// from mockup 4 (Alex & Jamie). Composes: SiteNav → SiteHero →
// OurStoryCard → ActionRail → LinkedEventsStrip → SiteV2Footer.
//
// Drops in at /sites/[domain] as a flagged alternative to the
// classic renderer. To render v2 on a site, the manifest can set
// `rendererVersion: 'v2'` OR visitors can append ?v=2. When
// ready, the classic renderer becomes the fallback.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { PD } from '../design/DesignAtoms';
import { SiteNav, SiteHero } from './SiteV2Hero';
import {
  OurStoryCard,
  ActionRail,
  LinkedEventsStrip,
  SiteV2Footer,
  type LinkedSibling,
} from './SiteV2Sections';
import type { StoryManifest } from '@/types';

interface SiteRendererV2Props {
  manifest: StoryManifest;
  siteId?: string;
  domain: string;
  names: [string, string];
  hostEmail?: string;
}

export function SiteRendererV2({
  manifest,
  siteId,
  domain,
  names,
  hostEmail,
}: SiteRendererV2Props) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [siblings, setSiblings] = useState<LinkedSibling[]>([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);

  const onRsvp = useCallback(() => {
    setRsvpOpen(true);
    // Smooth-scroll to RSVP section if present
    const el = document.getElementById('rsvp');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (typeof window !== 'undefined') window.location.hash = '#rsvp';
  }, []);

  // Celebration siblings (linked events strip)
  useEffect(() => {
    if (!siteId) return;
    setSiblingsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/celebrations/siblings?siteId=${encodeURIComponent(siteId)}`,
        );
        if (!res.ok) {
          setSiblings([]);
          return;
        }
        const data = (await res.json()) as {
          siblings?: Array<{
            domain: string;
            title?: string;
            eventDate?: string | null;
            venue?: string | null;
          }>;
        };
        setSiblings(
          (data.siblings ?? []).map((s) => ({
            domain: s.domain,
            title: s.title ?? s.domain,
            date: s.eventDate ?? undefined,
            venue: s.venue ?? undefined,
          })),
        );
      } catch {
        setSiblings([]);
      } finally {
        setSiblingsLoading(false);
      }
    })();
  }, [siteId]);

  const navItems = [
    { k: 'story', label: 'Our Story', href: '#our-story' },
    { k: 'schedule', label: 'Schedule', href: '#schedule' },
    { k: 'travel', label: 'Travel', href: '#travel' },
    { k: 'registry', label: 'Registry', href: '#registry' },
    { k: 'photos', label: 'Photos', href: '#photos' },
    { k: 'rsvp', label: 'RSVP', href: '#rsvp' },
  ];

  const footerItems = [
    { label: 'Our Story', href: '#our-story' },
    { label: 'Schedule', href: '#schedule' },
    { label: 'Travel', href: '#travel' },
    { label: 'Registry', href: '#registry' },
    { label: 'Photos', href: '#photos' },
    { label: 'RSVP', href: '#rsvp' },
  ];

  const heroImage = manifest.coverPhoto || manifest.heroSlideshow?.[0];
  const eventDate = manifest.logistics?.date;
  const venue = manifest.logistics?.venue;

  return (
    <div
      style={{
        background: PD.paper,
        minHeight: '100vh',
        color: PD.ink,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <SiteNav names={names} items={navItems} onRsvp={onRsvp} />
      <SiteHero
        names={names}
        eventDate={eventDate}
        venue={venue}
        heroImage={heroImage}
        onRsvp={onRsvp}
      />
      <OurStoryCard manifest={manifest} siteDomain={domain} />
      <ActionRail siteDomain={domain} onRsvp={onRsvp} />
      <LinkedEventsStrip siblings={siblings} loading={siblingsLoading} />
      <SiteV2Footer names={names} email={hostEmail} items={footerItems} />

      {rsvpOpen && (
        <div
          role="dialog"
          aria-label="RSVP"
          onClick={() => setRsvpOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(31,36,24,0.48)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFEF7',
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 30px 80px rgba(31,36,24,0.3)',
            }}
          >
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 26,
                fontStyle: 'italic',
                color: PD.ink,
                marginBottom: 12,
              }}
            >
              RSVP
            </div>
            <div style={{ fontSize: 14, color: PD.inkSoft, marginBottom: 22, lineHeight: 1.55 }}>
              Head to the RSVP section below — we&rsquo;ve scrolled there for you.
            </div>
            <button
              onClick={() => setRsvpOpen(false)}
              style={{
                background: PD.oliveDeep,
                color: '#FFFEF7',
                border: 'none',
                borderRadius: 999,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
