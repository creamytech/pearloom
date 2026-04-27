'use client';

// Sites home — real /api/sites wiring. Shows the user's sites
// grid, or the empty-state invitation when they have none.

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Bloom, Swirl } from '@/components/brand/groove';
import { Pear, Pearl, Pill, Squiggle, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, btnInk, btnGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useUserSites, type SiteSummary } from './hooks';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

const PATHS = [
  {
    k: 'pear',
    href: '/wizard/new',
    icon: '✦',
    label: 'Let Pear draft it',
    sub: 'Answer three questions. Pear presses a palette, story, RSVP, schedule. Takes about eight minutes.',
    accent: PD.olive,
    bg: PD.paper2,
    tilt: -1.5,
    recommended: true,
    time: 'about 8 minutes',
  },
  {
    k: 'photos',
    href: '/wizard/new?mode=photos',
    icon: '◎',
    label: 'Start with photos',
    sub: 'Drop in twelve or so pictures. We read the light, the faces, and weave a site around them.',
    accent: PD.gold,
    bg: PD.paperDeep,
    tilt: 0,
    time: 'about 12 minutes',
  },
  {
    k: 'template',
    href: '/marketplace?tab=templates',
    icon: '❧',
    label: 'From a template',
    sub: 'Pick a hand-crafted mood, then swap the words for your own. Editorial, quiet, or loud.',
    accent: PD.terra,
    bg: PD.paper2,
    tilt: 1.5,
    time: 'about 5 minutes',
  },
];

function greetingFor(hour: number) {
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashSites() {
  const { data: session } = useSession();
  const { sites, loading, error } = useUserSites();

  const firstName =
    session?.user?.name?.split(' ')[0]?.trim() ||
    session?.user?.email?.split('@')[0] ||
    '';

  const greeting = `${greetingFor(new Date().getHours()).toUpperCase()}${firstName ? ', ' + firstName.toUpperCase() : ''}`;
  const hasSites = (sites?.length ?? 0) > 0;

  return (
    <DashLayout
      active="sites"
      title={
        hasSites ? (
          <span>
            Your{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              loom
            </span>
            , woven.
          </span>
        ) : (
          <span>
            Your{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              loom
            </span>{' '}
            is empty.
          </span>
        )
      }
      subtitle={
        hasSites
          ? 'Pick up where you left off, or weave something new.'
          : 'One thread is enough to start. The first site is yours to keep, free, forever.'
      }
      actions={
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px',
              background: PD.paper3,
              border: '1px solid rgba(31,36,24,0.1)',
              borderRadius: 999,
            }}
          >
            <Pearl size={8} />
            <div>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6 }}>SITES</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{sites?.length ?? 0} hosted</div>
            </div>
          </div>
          <Link
            href="/wizard/new"
            style={{
              background: PD.ink,
              color: PD.paper,
              border: 'none',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'inherit',
              textDecoration: 'none',
            }}
          >
            ✦ Begin a new site
          </Link>
        </>
      }
    >

      <main style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {error && (
          <Panel
            bg="#F1D7CE"
            style={{ padding: 16, marginBottom: 24, color: PD.terra, fontSize: 13 }}
          >
            Couldn&rsquo;t load your sites ({error}). Try refreshing in a moment.
          </Panel>
        )}

        {loading && !sites && <LoadingGrid />}

        {hasSites ? (
          <>
            <SectionTitle eyebrow="YOUR SITES" title="Every thread you’ve" italic="already pulled." />
            <div
              className="pd-sites-grid pl8-dash-stagger"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 18,
                marginBottom: 48,
              }}
            >
              {sites!.map((s) => (
                <SiteCard key={s.id} site={s} />
              ))}
              <NewSiteTile />
            </div>
            <SectionTitle eyebrow="KEEP WEAVING" title="Pick a" italic="new thread." />
            <PathsGrid />
          </>
        ) : !loading ? (
          <EmptyInvitation />
        ) : null}
      </main>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-sites-grid),
          :global(.pd-sites-paths) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}

function LoadingGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 18,
        marginBottom: 48,
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 210,
            borderRadius: 20,
            background: `linear-gradient(120deg, ${PD.paper3} 40%, ${PD.paper2} 50%, ${PD.paper3} 60%)`,
            backgroundSize: '300% 100%',
            animation: 'pl-pearl-shimmer 2.4s ease-in-out infinite',
            border: '1px solid rgba(31,36,24,0.08)',
          }}
        />
      ))}
    </div>
  );
}

function SiteCard({ site }: { site: SiteSummary }) {
  const pearColor =
    site.occasion === 'memorial' || site.occasion === 'funeral'
      ? PD.plum
      : site.occasion === 'milestone-birthday' || site.occasion === 'birthday'
      ? PD.butter
      : PD.pear;

  const accent =
    site.occasion === 'memorial' || site.occasion === 'funeral'
      ? PD.plum
      : site.occasion === 'milestone-birthday' || site.occasion === 'birthday'
      ? PD.gold
      : PD.olive;

  const date = site.eventDate ? formatDate(site.eventDate) : null;

  return (
    <Link
      href={`/editor/${site.domain}`}
      style={{
        display: 'block',
        background: PD.paperCard,
        borderRadius: 18,
        border: '1px solid rgba(31,36,24,0.12)',
        overflow: 'hidden',
        textDecoration: 'none',
        color: PD.ink,
        transition: 'transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 18px 40px -18px rgba(31,36,24,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          height: 120,
          background: site.coverPhoto
            ? `linear-gradient(180deg, rgba(31,36,24,0) 30%, rgba(31,36,24,0.45) 100%), url(${site.coverPhoto}) center/cover`
            : `linear-gradient(135deg, ${pearColor}, ${accent})`,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <Pear size={28} color={PD.butter} stem={PD.paper} leaf={PD.paper} />
        </div>
        {date && (
          <div
            style={{
              ...MONO_STYLE,
              position: 'absolute',
              bottom: 12,
              left: 14,
              fontSize: 9,
              color: PD.paper,
              opacity: 0.85,
            }}
          >
            {date.toUpperCase()}
          </div>
        )}
        {site.published !== undefined && (
          <div
            style={{
              ...MONO_STYLE,
              position: 'absolute',
              top: 12,
              left: 12,
              fontSize: 8,
              padding: '3px 8px',
              borderRadius: 999,
              background: site.published ? PD.olive : 'rgba(31,36,24,0.5)',
              color: PD.paper,
            }}
          >
            {site.published ? 'LIVE' : 'DRAFT'}
          </div>
        )}
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {siteDisplayName(site)}
        </div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 13,
            fontStyle: 'italic',
            color: accent,
            margin: '4px 0 10px',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            textTransform: 'capitalize',
          }}
        >
          {humanOccasion(site.occasion)}
          {site.venue ? ` · ${site.venue}` : ''}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            fontSize: 11,
            color: '#6A6A56',
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          <span>{formatSiteDisplayUrl(site.domain, '', normalizeOccasion(site.occasion))}</span>
          <span style={{ marginLeft: 'auto' }}>→</span>
        </div>
      </div>
    </Link>
  );
}

function humanOccasion(o?: string) {
  if (!o) return 'A celebration';
  return o.replace(/-/g, ' ');
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function NewSiteTile() {
  return (
    <Link
      href="/wizard/new"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 210,
        borderRadius: 18,
        background: PD.paper3,
        border: `1.5px dashed rgba(31,36,24,0.22)`,
        textDecoration: 'none',
        color: PD.ink,
        textAlign: 'center',
        padding: 24,
        transition: 'all 220ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = PD.paper2;
        e.currentTarget.style.borderColor = 'rgba(31,36,24,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = PD.paper3;
        e.currentTarget.style.borderColor = 'rgba(31,36,24,0.22)';
      }}
    >
      <div>
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 28,
            fontStyle: 'italic',
            color: PD.olive,
            marginBottom: 4,
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          }}
        >
          +
        </div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Begin a new site</div>
        <div style={{ fontSize: 12, color: '#6A6A56', marginTop: 4, fontFamily: 'var(--pl-font-body)' }}>
          Three questions. Eight minutes.
        </div>
      </div>
    </Link>
  );
}

function PathsGrid() {
  return (
    <div
      className="pd-sites-paths"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
      }}
    >
      {PATHS.map((p) => (
        <Link
          key={p.k}
          href={p.href}
          style={{
            display: 'block',
            textAlign: 'left',
            background: p.bg,
            color: PD.ink,
            border: '1px solid rgba(31,36,24,0.12)',
            borderRadius: 20,
            padding: '24px 24px 22px',
            textDecoration: 'none',
            transform: `rotate(${p.tilt}deg)`,
            transition: 'all 260ms cubic-bezier(.2,.8,.2,1)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotate(0deg) translateY(-4px)';
            e.currentTarget.style.borderColor = p.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `rotate(${p.tilt}deg)`;
            e.currentTarget.style.borderColor = 'rgba(31,36,24,0.12)';
          }}
        >
          {p.recommended && (
            <div
              style={{
                ...MONO_STYLE,
                position: 'absolute',
                top: 14,
                right: 14,
                fontSize: 9,
                background: PD.ink,
                color: PD.paper,
                padding: '4px 9px',
                borderRadius: 999,
              }}
            >
              RECOMMENDED
            </div>
          )}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: p.accent,
              color: PD.paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              marginBottom: 18,
              fontFamily: '"Fraunces", Georgia, serif',
            }}
          >
            {p.icon}
          </div>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 26,
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            {p.label}
          </div>
          <div
            style={{
              fontSize: 14,
              color: PD.inkSoft,
              lineHeight: 1.5,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            {p.sub}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 18,
              fontSize: 12.5,
              fontWeight: 500,
              color: p.accent,
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            {p.time}
            <span style={{ marginLeft: 'auto' }}>→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyInvitation() {
  return (
    <>
      <Panel
        style={{
          padding: 0,
          overflow: 'hidden',
          marginBottom: 36,
          position: 'relative',
          minHeight: 360,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -60,
            width: 380,
            height: 380,
            background: PD.pear,
            opacity: 0.35,
            filter: 'blur(30px)',
            borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
            animation: 'pl-blob-morph 14s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: 100,
            width: 300,
            height: 300,
            background: PD.butter,
            opacity: 0.32,
            filter: 'blur(26px)',
            borderRadius: '55% 45% 38% 62% / 38% 52% 48% 62%',
            animation: 'pl-blob-morph 18s ease-in-out infinite -6s',
          }}
        />
        <div style={{ position: 'absolute', top: 30, left: '42%', opacity: 0.4 }} aria-hidden>
          <Swirl size={120} color={PD.olive} strokeWidth={1.4} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: '10%',
            animation: 'pl-float-y 5s ease-in-out infinite',
          }}
          aria-hidden
        >
          <Bloom size={90} color={PD.rose} centerColor={PD.plum} speed={8} />
        </div>

        <div
          className="pd-sites-hero"
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 40,
            padding: '56px 56px 48px',
            alignItems: 'center',
          }}
        >
          <div>
            <Pill color="rgba(255,255,255,0.6)" style={{ marginBottom: 16 }}>
              <Pearl size={8} /> FIRST SITE, ALWAYS FREE
            </Pill>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(42px, 5.5vw, 72px)',
                lineHeight: 0.95,
                margin: '0 0 18px',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: PD.ink,
              }}
            >
              Let&rsquo;s press
              <br />
              your{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: PD.olive,
                  position: 'relative',
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                }}
              >
                first day
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: -8 }}>
                  <Squiggle width={260} height={14} color={PD.gold} strokeWidth={3} animated />
                </span>
              </span>
              .
            </h2>
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.55,
                color: PD.inkSoft,
                margin: '0 0 28px',
                maxWidth: 440,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              Tell Pear what you&rsquo;re gathering for. She&rsquo;ll take your photos, your date, your
              voice, and hand back a whole site in about eight minutes. You edit what she got wrong.
              You keep what she got right.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="/wizard/new"
                style={{
                  background: PD.ink,
                  color: PD.paper,
                  border: 'none',
                  borderRadius: 999,
                  padding: '14px 24px',
                  fontSize: 15,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                }}
              >
                ✦ Start with Pear
              </Link>
              <Link
                href="/marketplace?tab=templates"
                style={{
                  background: 'transparent',
                  color: PD.ink,
                  border: '1px solid rgba(31,36,24,0.2)',
                  borderRadius: 999,
                  padding: '14px 22px',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                }}
              >
                Browse templates
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: 300,
                background: PD.paperCard,
                borderRadius: 18,
                border: '1px solid rgba(31,36,24,0.12)',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -14px rgba(31,36,24,0.2)',
                transform: 'rotate(-2deg)',
              }}
            >
              <div
                style={{
                  height: 110,
                  background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <Pear size={28} color={PD.butter} stem={PD.paper} leaf={PD.paper} />
                </div>
              </div>
              <div style={{ padding: '18px 18px 20px' }}>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 22,
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  Your names here
                </div>
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: PD.gold,
                    margin: '4px 0 10px',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  a wedding, a wander, a wake
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                  {[PD.gold, PD.olive, PD.stone, PD.rose, PD.plum].map((c) => (
                    <div key={c} style={{ flex: 1, height: 10, background: c, borderRadius: 3 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <SectionTitle eyebrow="THREE WAYS IN" title="Pick a" italic="thread." />
      <PathsGrid />
    </>
  );
}

// Silence unused style import warnings
void btnInk;
void btnGhost;
