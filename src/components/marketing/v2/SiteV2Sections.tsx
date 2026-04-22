'use client';

// Site v2 — Our Story card, 5-up action rail, Linked events strip,
// Footer. All pull from real manifest when available.

import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { REMEMBER, WIZARD } from '@/lib/assets';
import { BrandImage } from './BrandImage';
import type { StoryManifest, Chapter, ChapterImage } from '@/types';

// ── Our Story card ───────────────────────────────────────────
export function OurStoryCard({
  manifest,
  siteDomain,
}: {
  manifest?: StoryManifest | null;
  siteDomain?: string;
}) {
  const firstChapter: Chapter | undefined = manifest?.chapters?.[0];
  const storyText =
    firstChapter?.description?.slice(0, 200) ??
    firstChapter?.title ??
    "What started as a chance meeting over coffee turned into a lifetime of adventures. We're so grateful to celebrate this next chapter with our favorite people.";
  const photos: ChapterImage[] = (manifest?.chapters ?? [])
    .flatMap((c) => c.images ?? [])
    .slice(0, 3);

  return (
    <section
      id="our-story"
      style={{
        padding: '0 clamp(20px, 5vw, 56px) clamp(20px, 4vw, 36px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: PD.paperCard,
          borderRadius: 22,
          padding: 'clamp(24px, 3vw, 36px)',
          border: '1px solid rgba(31,36,24,0.05)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)',
          gap: 28,
          alignItems: 'center',
        }}
        className="pl-sitev2-story-grid"
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, width: 80 }}>
            <BrandImage
              src={REMEMBER.pearOutlineSad}
              alt=""
              style={{ width: '100%' }}
              fallback={<Pear size={64} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                ...DISPLAY_STYLE,
                fontSize: 'clamp(26px, 3vw, 34px)',
                fontWeight: 400,
                margin: '0 0 14px',
                letterSpacing: '-0.018em',
              }}
            >
              Our story
            </h2>
            <p
              style={{
                fontSize: 14,
                color: PD.inkSoft,
                lineHeight: 1.6,
                margin: '0 0 14px',
              }}
            >
              {storyText}
              {(firstChapter?.description ?? '').length > 200 ? '…' : ''}
            </p>
            <Link
              href={siteDomain ? `/sites/${siteDomain}#story` : '#story'}
              style={{
                fontSize: 13,
                color: PD.ink,
                textDecoration: 'none',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Read our full story <span>→</span>
            </Link>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
          className="pl-sitev2-story-photos"
        >
          {(photos.length ? photos : placeholder3()).map((img, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '3 / 4',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                background: PD.paper,
              }}
            >
              {'url' in img && img.url ? (
                <Image
                  src={img.url}
                  alt={('caption' in img && img.caption) || ''}
                  fill
                  sizes="(max-width: 820px) 33vw, 200px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <BrandImage
                  src={(img as { url: string }).url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  fallback={<div style={{ width: '100%', height: '100%' }} />}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pl-sitev2-story-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function placeholder3(): ChapterImage[] {
  return [
    { url: REMEMBER.polaroidCoupleWalk, caption: '' },
    { url: REMEMBER.tableCardArrangement, caption: '' },
    { url: REMEMBER.pearThankyouStill, caption: '' },
  ] as ChapterImage[];
}

// ── Action rail: RSVP / Travel / Schedule / Registry / Photos ─
interface ActionCard {
  k: string;
  label: string;
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
  bg: string;
}

export function ActionRail({ siteDomain, onRsvp }: { siteDomain?: string; onRsvp: () => void }) {
  const path = (p: string) => (siteDomain ? `/sites/${siteDomain}${p}` : p);
  const cards: ActionCard[] = [
    {
      k: 'rsvp',
      label: 'RSVP',
      body: 'Let us know if you can join us by May 1st.',
      cta: 'RSVP now',
      href: path('/rsvp'),
      icon: <IconEnvelope />,
      bg: '#E8DFE9',
    },
    {
      k: 'travel',
      label: 'Travel',
      body: 'Find recommended hotels and travel tips.',
      cta: 'View travel',
      href: path('/travel'),
      icon: <IconSuitcase />,
      bg: PD.paperCard,
    },
    {
      k: 'schedule',
      label: 'Schedule',
      body: 'Explore the weekend events and timeline.',
      cta: 'See the schedule',
      href: path('/schedule'),
      icon: <IconCalendar />,
      bg: '#F3D0BD',
    },
    {
      k: 'registry',
      label: 'Registry',
      body: 'Your love and presence mean the most.',
      cta: 'View registry',
      href: path('/registry'),
      icon: <IconGift />,
      bg: '#D9E0C2',
    },
    {
      k: 'photos',
      label: 'Photos',
      body: 'Browse our engagement photos and memories.',
      cta: 'View photos',
      href: path('/photos'),
      icon: <IconPhotos />,
      bg: PD.paperCard,
    },
  ];
  return (
    <section
      style={{
        padding: '0 clamp(20px, 5vw, 56px) clamp(24px, 4vw, 44px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 14,
        }}
        className="pl-sitev2-action-grid"
      >
        {cards.map((c) => (
          <div
            key={c.k}
            style={{
              background: c.bg,
              borderRadius: 18,
              padding: '22px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
              border: '1px solid rgba(31,36,24,0.05)',
              minHeight: 220,
            }}
          >
            <div style={{ marginBottom: 4 }}>{c.icon}</div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: '-0.015em',
                color: PD.ink,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: PD.inkSoft,
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {c.body}
            </div>
            {c.k === 'rsvp' ? (
              <button
                onClick={onRsvp}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: PD.ink,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  padding: 4,
                }}
              >
                {c.cta} →
              </button>
            ) : (
              <Link
                href={c.href}
                style={{
                  fontSize: 12,
                  color: PD.ink,
                  textDecoration: 'underline',
                  fontWeight: 500,
                }}
              >
                {c.cta} →
              </Link>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pl-sitev2-action-grid) {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          :global(.pl-sitev2-action-grid) {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}

function IconEnvelope() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <rect x="10" y="18" width="40" height="28" rx="2" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 10 18 L 30 34 L 50 18" stroke={PD.olive} strokeWidth="1.4" fill="none" />
      <path
        d="M 38 10 C 40 12, 42 14, 42 16"
        stroke="#B89EBF"
        strokeWidth="1.4"
        fill="none"
      />
      <circle cx="44" cy="14" r="2" fill="#B89EBF" />
    </svg>
  );
}
function IconSuitcase() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <rect x="12" y="20" width="36" height="28" rx="3" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 22 20 L 22 14 L 38 14 L 38 20" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 30 48 L 30 52" stroke={PD.olive} strokeWidth="1.4" />
      <circle cx="42" cy="24" r="2" fill="#B89EBF" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <rect x="10" y="16" width="40" height="34" rx="3" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 10 24 L 50 24" stroke={PD.olive} strokeWidth="1.4" />
      <circle cx="18" cy="34" r="1.6" fill={PD.olive} />
      <circle cx="26" cy="34" r="1.6" fill={PD.olive} />
      <circle cx="34" cy="34" r="1.6" fill={PD.olive} />
      <circle cx="42" cy="34" r="1.6" fill="#B89EBF" />
      <circle cx="18" cy="42" r="1.6" fill={PD.olive} />
      <path d="M 18 12 L 18 20" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 42 12 L 42 20" stroke={PD.olive} strokeWidth="1.4" />
    </svg>
  );
}
function IconGift() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <rect x="12" y="22" width="36" height="26" rx="2" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 10 22 L 50 22" stroke={PD.olive} strokeWidth="1.4" />
      <path d="M 30 22 L 30 48" stroke={PD.olive} strokeWidth="1.4" />
      <path
        d="M 30 22 C 22 18, 18 10, 24 8 C 28 8, 30 16, 30 22 C 30 16, 32 8, 36 8 C 42 10, 38 18, 30 22"
        stroke={PD.olive}
        strokeWidth="1.4"
        fill="none"
      />
      <path d="M 44 14 L 46 18" stroke="#B89EBF" strokeWidth="1.4" />
    </svg>
  );
}
function IconPhotos() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
      <rect x="14" y="18" width="32" height="32" rx="2" stroke={PD.olive} strokeWidth="1.4" fill="#FFFEF7" transform="rotate(-4 30 34)" />
      <rect x="18" y="14" width="32" height="32" rx="2" stroke={PD.olive} strokeWidth="1.4" fill="#FFFEF7" />
      <circle cx="26" cy="24" r="2" fill={PD.olive} />
      <path d="M 20 40 L 28 32 L 36 38 L 46 30" stroke={PD.olive} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

// ── More to celebrate: linked sibling events ─────────────────
export interface LinkedSibling {
  domain: string;
  title: string;
  date?: string | null;
  venue?: string | null;
}

export function LinkedEventsStrip({
  siblings,
  loading,
}: {
  siblings: LinkedSibling[];
  loading: boolean;
}) {
  if (loading || siblings.length === 0) return null;
  return (
    <section
      style={{
        padding: 'clamp(20px, 4vw, 36px) clamp(20px, 5vw, 56px)',
        background: PD.paper,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 20, color: '#6E5BA8' }}>✦</span>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(24px, 2.6vw, 30px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.015em',
              textAlign: 'center',
            }}
          >
            More to celebrate
          </h2>
          <span style={{ fontSize: 20, color: '#6E5BA8' }}>✦</span>
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: PD.inkSoft,
            marginBottom: 22,
          }}
        >
          We can&rsquo;t wait to celebrate with you again.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {siblings.slice(0, 4).map((s) => (
            <Link
              key={s.domain}
              href={`/sites/${s.domain}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                background: '#FFFEF7',
                border: '1px solid rgba(31,36,24,0.06)',
                borderRadius: 16,
                textDecoration: 'none',
                color: PD.ink,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 10,
                  background: PD.paperCard,
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <BrandImage
                  src={WIZARD.flowerCosmosBunch}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  fallback={<div style={{ width: '100%', height: '100%' }} />}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: '"Fraunces", Georgia, serif',
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: 2 }}>
                  {s.date
                    ? new Date(s.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : s.venue || ''}
                </div>
              </div>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: '1px solid rgba(31,36,24,0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────
export function SiteV2Footer({
  names,
  email,
  items,
}: {
  names: [string, string];
  email?: string;
  items: Array<{ label: string; href: string }>;
}) {
  const [a, b] = names;
  const signature = b ? `${a} & ${b}` : a;
  return (
    <footer
      style={{
        padding: 'clamp(28px, 4vw, 48px) clamp(20px, 5vw, 56px) clamp(32px, 4vw, 56px)',
        background: PD.paper,
        borderTop: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'start',
        }}
        className="pl-sitev2-footer-grid"
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Pear size={54} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <div>
            <div
              style={{
                fontFamily: '"Fraunces", Georgia, serif',
                fontSize: 16,
                fontStyle: 'italic',
                color: PD.ink,
                lineHeight: 1.4,
                marginBottom: 14,
              }}
            >
              Thank you for being part of our story. We can&rsquo;t wait to celebrate together!
            </div>
            <div
              style={{
                fontFamily: '"Caveat", "Fraunces", cursive',
                fontSize: 22,
                fontStyle: 'italic',
                color: '#6E5BA8',
              }}
            >
              {signature}
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              color: PD.inkSoft,
              letterSpacing: '0.22em',
              marginBottom: 14,
            }}
          >
            QUICK LINKS
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  style={{ fontSize: 13.5, color: PD.ink, textDecoration: 'none' }}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              color: PD.inkSoft,
              letterSpacing: '0.22em',
              marginBottom: 14,
            }}
          >
            QUESTIONS?
          </div>
          <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 10 }}>We&rsquo;re here to help!</div>
          {email && (
            <a
              href={`mailto:${email}`}
              style={{
                fontSize: 13,
                color: PD.ink,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 14,
              }}
            >
              ✉ {email}
            </a>
          )}
          {email && (
            <div>
              <a
                href={`mailto:${email}`}
                style={{
                  display: 'inline-flex',
                  background: 'transparent',
                  border: '1px solid rgba(31,36,24,0.18)',
                  borderRadius: 999,
                  padding: '9px 16px',
                  fontSize: 12.5,
                  color: PD.ink,
                  textDecoration: 'none',
                  fontWeight: 500,
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 10,
                }}
              >
                Contact us →
              </a>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '40px auto 0',
          textAlign: 'center',
          fontSize: 11,
          color: PD.inkSoft,
          opacity: 0.7,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: 'center',
          width: '100%',
        }}
      >
        Made with <Pear size={14} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} /> Pearloom
        &nbsp;© {new Date().getFullYear()}
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pl-sitev2-footer-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
