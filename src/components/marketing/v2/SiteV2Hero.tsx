'use client';

// Site v2 nav + hero. Top nav sticks. Hero is the "Alex & Jamie"
// composition: kicker + big ampersand display + date + venue +
// RSVP CTA + right-side pear-in-flowers photo.

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { Sparkle } from '@/components/brand/groove';
import { REMEMBER, WIZARD, EDITOR } from '@/lib/assets';
import { BrandImage } from './BrandImage';
import type { StoryManifest } from '@/types';

interface SiteNavItem {
  k: string;
  label: string;
  href: string;
}

export function SiteNav({
  names,
  items,
  onRsvp,
}: {
  names: [string, string];
  items: SiteNavItem[];
  onRsvp: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const [a, b] = names;
  const title = b ? `${a[0] ?? ''} & ${b[0] ?? ''}` : a;

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: scrolled ? 'rgba(244,236,216,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(31,36,24,0.08)' : '1px solid transparent',
        transition: 'background 220ms ease, border-color 220ms ease',
        padding: '18px clamp(20px, 5vw, 56px)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        fontFamily: 'var(--pl-font-body)',
      }}
    >
      <Link
        href="#"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: PD.ink,
        }}
      >
        <Pear size={30} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <span
          style={{
            ...DISPLAY_STYLE,
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}
          className="pl-sitev2-brand"
        >
          Pearloom
        </span>
      </Link>
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 28,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        className="pl-sitev2-links"
      >
        {items.map((i) => (
          <Link
            key={i.k}
            href={i.href}
            style={{
              color: PD.ink,
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 400,
            }}
          >
            {i.label}
          </Link>
        ))}
      </div>
      <button
        onClick={onRsvp}
        style={{
          background: PD.oliveDeep,
          color: '#FFFEF7',
          border: 'none',
          borderRadius: 999,
          padding: '10px 22px',
          fontSize: 13.5,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0,
          boxShadow: '0 6px 18px rgba(76,90,38,0.22)',
        }}
      >
        RSVP now
      </button>
      <button
        aria-label="Save"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: 'transparent',
          border: '1px solid rgba(31,36,24,0.15)',
          cursor: 'pointer',
          fontSize: 14,
          color: PD.ink,
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
        className="pl-sitev2-heart"
      >
        ♡
      </button>
      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl-sitev2-links) {
            display: none !important;
          }
          :global(.pl-sitev2-heart) {
            display: none !important;
          }
        }
      `}</style>
      <noscript>{title}</noscript>
    </nav>
  );
}

export function SiteHero({
  names,
  eventDate,
  venue,
  heroImage,
  onRsvp,
}: {
  names: [string, string];
  eventDate?: string;
  venue?: string;
  heroImage?: string;
  onRsvp: () => void;
}) {
  const [a, b] = names;
  const formattedDate = eventDate
    ? (() => {
        try {
          return new Date(eventDate)
            .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            .toUpperCase();
        } catch {
          return '';
        }
      })()
    : '';

  return (
    <section
      style={{
        padding: 'clamp(24px, 6vw, 56px) clamp(20px, 5vw, 56px) clamp(40px, 6vw, 80px)',
        background: PD.paper,
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
          gap: 48,
          alignItems: 'center',
        }}
        className="pl-sitev2-hero-grid"
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 11,
              color: '#6E5BA8',
              letterSpacing: '0.26em',
              marginBottom: 22,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            WELCOME TO OUR WEDDING
            <Sparkle size={14} color={PD.gold} />
          </div>
          <h1
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(56px, 8vw, 110px)',
              fontWeight: 400,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              margin: 0,
              color: PD.ink,
            }}
          >
            {a}{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &amp;
            </span>{' '}
            {b}
          </h1>
          {formattedDate && (
            <div
              style={{
                ...MONO_STYLE,
                fontSize: 13,
                color: PD.ink,
                marginTop: 28,
                letterSpacing: '0.22em',
              }}
            >
              {formattedDate}
            </div>
          )}
          {venue && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 14,
                fontSize: 14,
                color: PD.ink,
              }}
            >
              <span style={{ color: PD.olive }}>◉</span>
              {venue}
            </div>
          )}
          {/* Olive divider scribble */}
          <svg
            width="200"
            height="24"
            viewBox="0 0 200 24"
            style={{ display: 'block', margin: '18px 0', opacity: 0.6 }}
            aria-hidden
          >
            <path
              d="M 0 12 C 40 4, 80 20, 120 12 C 150 6, 180 14, 200 10"
              stroke={PD.olive}
              strokeWidth="1"
              fill="none"
            />
            <circle cx="196" cy="11" r="2.5" fill={PD.gold} />
          </svg>
          <p
            style={{
              fontSize: 15,
              color: PD.inkSoft,
              lineHeight: 1.65,
              margin: '0 0 28px',
              maxWidth: 440,
            }}
          >
            We can&rsquo;t wait to celebrate with you. Explore everything you need to know for
            our wedding weekend, all in one place.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onRsvp}
              style={{
                background: PD.oliveDeep,
                color: '#FFFEF7',
                border: 'none',
                borderRadius: 999,
                padding: '14px 24px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 10px 24px rgba(76,90,38,0.24)',
              }}
            >
              RSVP now <span style={{ fontSize: 14 }}>→</span>
            </button>
            <button
              onClick={() =>
                window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' })
              }
              style={{
                background: 'transparent',
                border: 'none',
                color: PD.ink,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: '1.5px solid rgba(31,36,24,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: PD.ink,
                }}
              >
                ↓
              </span>
              Scroll to explore
            </button>
          </div>
        </div>

        {/* Right — photo composition on organic paper blob */}
        <div style={{ position: 'relative', aspectRatio: '1 / 1', maxWidth: 580, marginLeft: 'auto' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '4% -6% 4% 0%',
              background: PD.paperCard,
              borderRadius: '62% 38% 52% 48% / 48% 54% 46% 52%',
              filter: 'blur(0.5px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '8%',
              right: '-4%',
              bottom: '8%',
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 30px 70px rgba(31,36,24,0.18)',
            }}
          >
            {heroImage ? (
              <Image src={heroImage} alt="" fill sizes="(max-width: 900px) 100vw, 580px" style={{ objectFit: 'cover' }} />
            ) : (
              <BrandImage
                src={REMEMBER.pearThankyouStill}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fallback={
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${PD.paperCard}, ${PD.rose})`,
                    }}
                  />
                }
              />
            )}
          </div>
          {/* Floating Pearloom card on the blob */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '16%',
              left: '16%',
              width: '36%',
              aspectRatio: '3 / 4',
              transform: 'rotate(-6deg)',
              boxShadow: '0 14px 30px rgba(31,36,24,0.22)',
              borderRadius: 6,
            }}
          >
            <BrandImage
              src={WIZARD.pearloomCardFront}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }}
              fallback={
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: PD.paper,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...DISPLAY_STYLE,
                    fontSize: 20,
                    color: PD.olive,
                  }}
                >
                  A &amp; J
                </div>
              }
            />
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: '10%',
              right: '2%',
              width: 70,
              opacity: 0.9,
              pointerEvents: 'none',
            }}
          >
            <BrandImage
              src={EDITOR.pearPhoto}
              alt=""
              style={{ width: '100%' }}
              fallback={<Pear size={48} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl-sitev2-hero-grid) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </section>
  );
}
