'use client';

// Dashboard home — welcome + 3-up start rail + sites list +
// At a glance analytics + Linked celebrations.

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { Sparkle } from '@/components/brand/groove';
import { siteDisplayName, useUserSites, type SiteSummary } from '../design/dash/hooks';

const AVATAR_FALLBACK = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80';

export function DashHome() {
  const { data: session } = useSession();
  const { sites, loading } = useUserSites();
  const first = (session?.user?.name || session?.user?.email || 'there').split(/[\s@]/)[0];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: 24,
      }}
      className="pl-dash-home-grid"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Welcome firstName={first} />
        <StartRail />
        <SiteList sites={sites} loading={loading} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <AtAGlance />
        <LinkedCelebrations />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <HelpStrip />
      </div>
      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pl-dash-home-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Welcome({ firstName }: { firstName: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(36px, 4vw, 54px)',
            fontWeight: 400,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          Welcome back, {firstName}
          <Sparkle size={22} color={PD.gold} />
        </h1>
        <p style={{ color: PD.inkSoft, fontSize: 15, margin: 0 }}>
          Let&rsquo;s create something meaningful.
        </p>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          background: PD.paperCard,
          borderRadius: 14,
          border: '1px solid rgba(31,36,24,0.06)',
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: '#E8DFE9',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
          }}
        >
          ⚇
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: PD.ink }}>3 guest tasks left</div>
          <div style={{ fontSize: 11.5, color: PD.inkSoft }}>We&rsquo;ll help you finish.</div>
        </div>
        <Link
          href="/rsvps"
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.18)',
            borderRadius: 999,
            padding: '7px 14px',
            fontSize: 12.5,
            color: PD.ink,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          See tasks →
        </Link>
      </div>
    </div>
  );
}

function StartRail() {
  const cards = [
    {
      k: 'ai',
      kicker: 'LET PEAR DRAFT IT',
      kickerColor: '#6E5BA8',
      title: 'Let Pear draft it',
      body: 'Answer a few quick questions and Pear will create a beautiful first draft.',
      cta: 'Start with AI',
      href: '/wizard/new',
      bg: '#E8DFE9',
      ctaBg: '#6E5BA8',
      accent: PD.pear,
    },
    {
      k: 'photos',
      kicker: 'START WITH PHOTOS',
      kickerColor: PD.oliveDeep,
      title: 'Start with photos',
      body: 'Upload your photos and Pear will build a story around them.',
      cta: 'Upload photos',
      href: '/wizard/new?mode=photos',
      bg: PD.paperCard,
      ctaBg: 'transparent',
      ctaFg: PD.ink,
      accent: PD.olive,
    },
    {
      k: 'template',
      kicker: 'START FROM TEMPLATE',
      kickerColor: PD.gold,
      title: 'Start from template',
      body: 'Choose a template and make it uniquely yours.',
      cta: 'Browse templates',
      href: '/marketplace',
      bg: PD.paperCard,
      ctaBg: 'transparent',
      ctaFg: PD.ink,
      accent: PD.gold,
    },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 16,
      }}
      className="pl-dash-home-rail"
    >
      {cards.map((c) => (
        <div
          key={c.k}
          style={{
            background: c.bg,
            borderRadius: 18,
            padding: 22,
            border: '1px solid rgba(31,36,24,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 200,
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              opacity: 0.85,
            }}
          >
            <Pear size={46} color={c.accent} stem={PD.oliveDeep} leaf={PD.olive} />
          </div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10,
              letterSpacing: '0.22em',
              color: c.kickerColor,
            }}
          >
            {c.kicker}
          </div>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.015em',
              color: PD.ink,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: PD.inkSoft,
              lineHeight: 1.5,
              maxWidth: 240,
              flex: 1,
            }}
          >
            {c.body}
          </div>
          <Link
            href={c.href}
            style={{
              alignSelf: 'flex-start',
              background: c.ctaBg,
              color: c.ctaFg ?? '#FFFEF7',
              border: c.ctaBg === 'transparent' ? '1px solid rgba(31,36,24,0.2)' : 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            {c.cta}
          </Link>
        </div>
      ))}
      <style jsx>{`
        @media (max-width: 1000px) {
          :global(.pl-dash-home-rail) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function SiteList({ sites, loading }: { sites?: SiteSummary[] | null; loading: boolean }) {
  return (
    <div
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            ...DISPLAY_STYLE,
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.015em',
          }}
        >
          Your sites{' '}
          <span
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 12,
              color: PD.inkSoft,
              background: PD.paperCard,
              padding: '2px 8px',
              borderRadius: 999,
              marginLeft: 4,
              verticalAlign: 'middle',
            }}
          >
            {sites?.length ?? 0}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            style={{
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: PD.ink,
            }}
          >
            Sort: Recently updated ▾
          </button>
          <Link
            href="/wizard/new"
            style={{
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 12,
              textDecoration: 'none',
              color: PD.ink,
              fontWeight: 500,
            }}
          >
            + New site
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '30px 0', textAlign: 'center', color: PD.inkSoft, fontSize: 13 }}>
          Threading your sites…
        </div>
      ) : !sites?.length ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: PD.inkSoft }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>No sites yet.</div>
          <div style={{ fontSize: 12 }}>
            Start one with Pear, photos, or a template above.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sites.map((s, i) => (
            <SiteRow key={s.id} site={s} primary={i === 0} />
          ))}
          <Link
            href="#"
            style={{
              marginTop: 10,
              textAlign: 'center',
              fontSize: 12.5,
              color: PD.ink,
              textDecoration: 'none',
              padding: '10px 0',
              fontWeight: 500,
            }}
          >
            View all sites →
          </Link>
        </div>
      )}
    </div>
  );
}

function SiteRow({ site, primary }: { site: SiteSummary; primary: boolean }) {
  const published = !!site.published;
  const badge = primary ? 'Primary' : site.occasion ?? 'Site';
  const formatted = useMemo(() => {
    if (!site.updated_at) return 'just now';
    const diff = Date.now() - new Date(site.updated_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  }, [site.updated_at]);

  return (
    <Link
      href={`/editor/${site.domain}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 10px',
        borderRadius: 12,
        textDecoration: 'none',
        color: PD.ink,
        borderBottom: '1px solid rgba(31,36,24,0.04)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: PD.paperCard,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Pear size={24} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{siteDisplayName(site)}</span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 999,
              background: primary ? '#E8DFE9' : PD.paperCard,
              color: PD.ink,
              fontWeight: 500,
            }}
          >
            {badge}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: PD.inkSoft }}>
          {site.domain}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: published ? PD.olive : PD.gold,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: published ? PD.olive : PD.gold,
            }}
          />
          {published ? 'Published' : 'Draft'}
        </div>
        <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: 3 }}>Updated {formatted}</div>
      </div>
      <span
        aria-hidden
        style={{ fontSize: 14, color: PD.inkSoft, opacity: 0.5, marginLeft: 8 }}
      >
        ⋯
      </span>
    </Link>
  );
}

function AtAGlance() {
  const stats = [
    { k: 'visits', l: 'Site visits', v: '842', delta: '+18%', up: true },
    { k: 'rsvps', l: 'RSVPs', v: '124', delta: '+22%', up: true },
    { k: 'messages', l: 'Messages', v: '9', delta: '−8%', up: false },
    { k: 'registry', l: 'Registry clicks', v: '56', delta: '+14%', up: true },
  ];
  return (
    <div
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ ...DISPLAY_STYLE, fontSize: 20, fontWeight: 400, letterSpacing: '-0.015em' }}>
          At a glance
        </div>
        <span style={{ fontSize: 11.5, color: PD.inkSoft }}>This week ▾</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.k}>
            <div style={{ fontSize: 11.5, color: PD.inkSoft, marginBottom: 4 }}>{s.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div
                style={{
                  ...DISPLAY_STYLE,
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: '-0.015em',
                }}
              >
                {s.v}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: s.up ? PD.olive : '#C47A4A',
                  fontWeight: 500,
                }}
              >
                {s.up ? '↑' : '↓'} {s.delta}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, height: 70, position: 'relative' }}>
        <Sparkline />
      </div>
      <Link
        href="/dashboard/analytics"
        style={{
          display: 'block',
          marginTop: 10,
          fontSize: 12.5,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        View full analytics →
      </Link>
    </div>
  );
}

function Sparkline() {
  // 7 points with a peak Wed.
  const pts = [180, 240, 420, 842, 520, 380, 300];
  const max = Math.max(...pts);
  const w = 300;
  const h = 70;
  const path = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const fill = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="pl-sparkfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6E5BA8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#6E5BA8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#pl-sparkfill)" />
      <path d={path} stroke="#6E5BA8" strokeWidth="1.6" fill="none" />
      <circle cx={(3 / 6) * w} cy={h - (842 / max) * h} r="4" fill="#6E5BA8" />
    </svg>
  );
}

function LinkedCelebrations() {
  const items = [
    { name: 'Parker Welcome Party', date: 'June 12, 2025', status: 'Published' },
    { name: 'Rehearsal Dinner', date: 'June 13, 2025', status: 'Draft' },
    { name: 'Bridal Shower', date: 'May 3, 2025', status: 'Published' },
  ];
  return (
    <div
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ ...DISPLAY_STYLE, fontSize: 20, fontWeight: 400, letterSpacing: '-0.015em' }}>
          Linked celebrations{' '}
          <span
            style={{
              fontFamily: 'var(--pl-font-body)',
              fontSize: 12,
              color: PD.inkSoft,
              background: PD.paperCard,
              padding: '2px 8px',
              borderRadius: 999,
              marginLeft: 4,
              verticalAlign: 'middle',
            }}
          >
            3
          </span>
        </div>
        <Link
          href="/dashboard/connections"
          style={{
            fontSize: 12,
            color: PD.ink,
            textDecoration: 'none',
            border: '1px solid rgba(31,36,24,0.15)',
            padding: '6px 12px',
            borderRadius: 999,
            fontWeight: 500,
          }}
        >
          Manage
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((i) => (
          <div
            key={i.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom: '1px solid rgba(31,36,24,0.04)',
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: PD.paperCard,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
              }}
            >
              ✦
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
              <div style={{ fontSize: 11, color: PD.inkSoft }}>{i.date}</div>
            </div>
            <span
              style={{
                fontSize: 11,
                color: i.status === 'Published' ? PD.olive : PD.gold,
                fontWeight: 500,
              }}
            >
              ● {i.status}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/connections"
        style={{
          display: 'block',
          marginTop: 10,
          fontSize: 12.5,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Add or link another →
      </Link>
    </div>
  );
}

function HelpStrip() {
  return (
    <div
      style={{
        background: '#E8DFE9',
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Image
          src={AVATAR_FALLBACK}
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: 999, objectFit: 'cover' }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: PD.ink, marginBottom: 2 }}>
            Need help with your site?
          </div>
          <div style={{ fontSize: 12, color: PD.inkSoft }}>
            Book a free 1:1 session with a Pearloom specialist.
          </div>
        </div>
      </div>
      <Link
        href="/dashboard/help"
        style={{
          background: '#6E5BA8',
          color: '#FFFEF7',
          padding: '10px 18px',
          borderRadius: 999,
          fontSize: 12.5,
          fontWeight: 500,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Book a call <span>→</span>
      </Link>
    </div>
  );
}
