'use client';

// Voices of the Day, Photos, Heirloom Archive, Time capsule,
// Anniversary broadcast, Closing strip — all for /dashboard/remember.

import Link from 'next/link';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { REMEMBER } from '@/lib/assets';
import { BrandImage } from './BrandImage';
import type { Toast } from './DayOfHooks';
import type { FlatPhoto, RememberCounts } from './RememberHooks';

// ── Voices of the Day ────────────────────────────────────────
export function VoicesSection({
  toasts,
  loading,
}: {
  toasts: Toast[];
  loading: boolean;
}) {
  return (
    <section
      style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 40px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: '#FFFEF7',
          borderRadius: 22,
          padding: 'clamp(22px, 3vw, 34px)',
          border: '1px solid rgba(31,36,24,0.05)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 240px) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'center',
        }}
        className="pl-voices-grid"
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              letterSpacing: '0.24em',
              color: '#6E5BA8',
              marginBottom: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            VOICES OF THE DAY
            <span style={{ fontSize: 14 }}>~|||~</span>
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.018em',
              lineHeight: 1.15,
            }}
          >
            The words you&rsquo;ll want to hear, again and again.
          </h2>
          <button
            style={{
              marginTop: 18,
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '9px 16px',
              fontSize: 12.5,
              color: PD.ink,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ▶ Play all toasts
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 14,
          }}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 150,
                  background: PD.paperCard,
                  borderRadius: 16,
                  border: '1px solid rgba(31,36,24,0.06)',
                }}
              />
            ))
          ) : toasts.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                fontSize: 13,
                color: PD.inkSoft,
                lineHeight: 1.55,
                padding: '20px 0',
              }}
            >
              No voice toasts yet. Guests can leave one from the live page during the event.
            </div>
          ) : (
            <>
              {toasts.slice(0, 5).map((t) => (
                <ToastBubble key={t.id} toast={t} />
              ))}
              {toasts.length > 5 && (
                <Link
                  href="/dashboard/submissions"
                  style={{
                    borderRadius: 20,
                    border: `1.5px dashed ${PD.olive}`,
                    padding: '18px 12px',
                    textDecoration: 'none',
                    color: PD.ink,
                    fontSize: 12,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 150,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>📖</span>
                  <span>
                    View all {toasts.length}
                    <br />
                    toasts
                  </span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pl-voices-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function ToastBubble({ toast }: { toast: Toast }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!toast.audio_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(toast.audio_url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const fmt = (s?: number | null) => {
    if (!s) return '00:00';
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m.toString().padStart(2, '0')}:${sec}`;
  };

  return (
    <div
      style={{
        background: PD.paperCard,
        borderRadius: '46% 54% 42% 58% / 58% 38% 62% 42%',
        padding: '14px 14px 18px',
        border: '1px solid rgba(31,36,24,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 6,
        minHeight: 150,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${PD.pear}, ${PD.olive})`,
          color: '#FFFEF7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Fraunces", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 18,
        }}
      >
        {(toast.guest_name ?? 'G')[0].toUpperCase()}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
        {toast.guest_name ?? 'Guest'}
      </div>
      <div style={{ fontSize: 10.5, color: PD.inkSoft, opacity: 0.7 }}>{fmt(toast.duration_seconds)}</div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16, marginTop: 2 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 4 + ((i * 7) % 12),
              background: PD.olive,
              borderRadius: 2,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          marginTop: 8,
          width: 28,
          height: 28,
          borderRadius: 999,
          background: PD.paper,
          border: '1px solid rgba(31,36,24,0.1)',
          cursor: 'pointer',
          fontSize: 11,
          color: PD.ink,
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>
    </div>
  );
}

// ── Photos section ───────────────────────────────────────────
export function PhotosSection({
  photos,
  siteDomain,
}: {
  photos: FlatPhoto[];
  siteDomain?: string;
}) {
  const four = photos.slice(0, 4);
  const placeholderImgs = [
    REMEMBER.polaroidCoupleWalk,
    REMEMBER.tableCardArrangement,
    REMEMBER.pearThankyouStill,
    REMEMBER.receptionPhotosCover,
  ];
  return (
    <section
      style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 40px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: '#FFFEF7',
          borderRadius: 22,
          padding: 'clamp(22px, 3vw, 34px)',
          border: '1px solid rgba(31,36,24,0.05)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'center',
        }}
        className="pl-photos-grid"
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              letterSpacing: '0.24em',
              color: '#6E5BA8',
              marginBottom: 14,
            }}
          >
            A PICTURE-PERFECT DAY
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.018em',
              lineHeight: 1.15,
            }}
          >
            Photos that brought the day to life.
          </h2>
          <Link
            href={siteDomain ? `/sites/${siteDomain}#photos` : '#'}
            style={{
              marginTop: 18,
              display: 'inline-flex',
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '9px 16px',
              fontSize: 12.5,
              color: PD.ink,
              textDecoration: 'none',
              fontWeight: 500,
              alignItems: 'center',
              gap: 8,
            }}
          >
            View full gallery <span>→</span>
          </Link>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
          className="pl-photos-row"
        >
          {four.length > 0
            ? four.map((p, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '3 / 4',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <Image
                    src={p.url}
                    alt={p.caption ?? ''}
                    fill
                    sizes="(max-width: 820px) 50vw, 220px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ))
            : placeholderImgs.map((src, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '3 / 4',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    background: PD.paperCard,
                  }}
                >
                  <BrandImage
                    src={src}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fallback={<div style={{ width: '100%', height: '100%' }} />}
                  />
                </div>
              ))}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              background: 'rgba(255,255,247,0.92)',
              borderRadius: 999,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: PD.ink,
            }}
          >
            ▦ {photos.length || 0} photos
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pl-photos-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl-photos-row) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

// ── Heirloom archive ─────────────────────────────────────────
const ARCHIVE_ICONS = [
  { k: 'video', l: 'Video recap', icon: '▶' },
  { k: 'toasts', l: 'Voice toasts', icon: '〰' },
  { k: 'photos', l: 'Photos', icon: '▦' },
  { k: 'vows', l: 'Vows', icon: '✎' },
  { k: 'speeches', l: 'Speeches', icon: '❝' },
  { k: 'details', l: 'Details', icon: '❋' },
];

export function HeirloomArchive({
  counts,
  siteDomain,
}: {
  counts: RememberCounts;
  siteDomain?: string;
}) {
  const displayCount = (k: string): string => {
    switch (k) {
      case 'video':
        return counts.video ? `${String(Math.floor(counts.video * 32)).padStart(2, '0')}:42` : '—';
      case 'toasts':
        return String(counts.toasts);
      case 'photos':
        return String(counts.photos);
      case 'vows':
        return String(counts.vows);
      case 'speeches':
        return String(counts.speeches);
      case 'details':
        return counts.details > 0 ? 'All saved' : 'Empty';
      default:
        return '—';
    }
  };
  return (
    <section
      style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 40px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: '#FFFEF7',
          borderRadius: 22,
          padding: 'clamp(22px, 3vw, 34px)',
          border: '1px solid rgba(31,36,24,0.05)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr) auto',
          gap: 24,
          alignItems: 'center',
        }}
        className="pl-archive-grid"
      >
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 10.5,
              letterSpacing: '0.24em',
              color: '#6E5BA8',
              marginBottom: 12,
            }}
          >
            YOUR HEIRLOOM ARCHIVE
          </div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.018em',
              lineHeight: 1.15,
            }}
          >
            Beautifully saved. Always within reach.
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: PD.inkSoft,
              margin: '14px 0 18px',
              lineHeight: 1.55,
            }}
          >
            Every detail from your day, preserved in one timeless place.
          </p>
          <Link
            href={siteDomain ? `/sites/${siteDomain}/recap` : '#'}
            style={{
              display: 'inline-flex',
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '9px 16px',
              fontSize: 12.5,
              color: PD.ink,
              textDecoration: 'none',
              fontWeight: 500,
              alignItems: 'center',
              gap: 8,
            }}
          >
            Explore archive <span>→</span>
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 10,
          }}
          className="pl-archive-tiles"
        >
          {ARCHIVE_ICONS.map((tile) => (
            <div
              key={tile.k}
              style={{
                background: PD.paperCard,
                border: '1px solid rgba(31,36,24,0.06)',
                borderRadius: '52% 48% 46% 54% / 62% 38% 62% 38%',
                padding: '16px 10px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: '#FFFEF7',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: PD.olive,
                }}
              >
                {tile.icon}
              </span>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: PD.ink }}>{tile.l}</div>
              <div
                style={{
                  ...MONO_STYLE,
                  fontSize: 9.5,
                  color: PD.inkSoft,
                  opacity: 0.7,
                  letterSpacing: '0.14em',
                }}
              >
                {displayCount(tile.k)}
              </div>
            </div>
          ))}
        </div>
        <div
          aria-hidden
          style={{ width: 90, opacity: 0.8 }}
          className="pl-archive-pear"
        >
          <BrandImage
            src={REMEMBER.pearOutlineSad}
            alt=""
            style={{ width: '100%' }}
            fallback={<Pear size={72} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />}
          />
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1060px) {
          :global(.pl-archive-grid) {
            grid-template-columns: 1fr !important;
          }
          :global(.pl-archive-pear) {
            display: none;
          }
        }
        @media (max-width: 640px) {
          :global(.pl-archive-tiles) {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </section>
  );
}

// ── Time capsule + Anniversary ───────────────────────────────
export function CapsuleAnniversary({
  anniversaryDate,
}: {
  anniversaryDate?: string;
}) {
  return (
    <section
      style={{
        padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 40px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 18,
        }}
        className="pl-capsule-grid"
      >
        <Card
          kicker="A LETTER TO YOUR FUTURE"
          heading="Time capsule"
          body="Open a note, memory, or moment—just for you, on a future date."
          cta={{ label: 'Create a time capsule', href: '/time-capsule/new' }}
          art={REMEMBER.timeCapsuleBottle}
        />
        <Card
          kicker="REPLAY THE LOVE"
          heading="Anniversary broadcast"
          body={
            anniversaryDate
              ? `We'll send you a beautiful reminder every ${new Date(anniversaryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`
              : `We'll send you a beautiful reminder of this day, every year.`
          }
          cta={{ label: 'Set your anniversary', href: '/dashboard/profile#anniversary' }}
          art={REMEMBER.flowerLavenderDaisies}
        />
      </div>
      <style jsx>{`
        @media (max-width: 820px) {
          :global(.pl-capsule-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Card({
  kicker,
  heading,
  body,
  cta,
  art,
}: {
  kicker: string;
  heading: string;
  body: string;
  cta: { label: string; href: string };
  art: string;
}) {
  return (
    <div
      style={{
        background: '#FFFEF7',
        borderRadius: 22,
        padding: 'clamp(22px, 3vw, 30px)',
        border: '1px solid rgba(31,36,24,0.05)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 120px',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10,
            letterSpacing: '0.24em',
            color: '#6E5BA8',
            marginBottom: 10,
          }}
        >
          {kicker}
        </div>
        <h3
          style={{
            ...DISPLAY_STYLE,
            fontSize: 24,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.015em',
          }}
        >
          {heading}
        </h3>
        <p style={{ fontSize: 13, color: PD.inkSoft, margin: '10px 0 14px', lineHeight: 1.55 }}>
          {body}
        </p>
        <Link
          href={cta.href}
          style={{
            display: 'inline-flex',
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 12,
            color: PD.ink,
            textDecoration: 'none',
            fontWeight: 500,
            alignItems: 'center',
            gap: 6,
          }}
        >
          {cta.label} <span>→</span>
        </Link>
      </div>
      <BrandImage
        src={art}
        alt=""
        style={{ width: '100%' }}
        fallback={
          <div
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 12,
              background: `linear-gradient(135deg, ${PD.paperCard}, ${PD.rose})`,
            }}
          />
        }
      />
    </div>
  );
}

// ── Closing strip ────────────────────────────────────────────
export function ClosingStrip() {
  return (
    <section
      style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(16px, 4vw, 40px) clamp(40px, 5vw, 60px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          background: '#E8DFE9',
          borderRadius: 22,
          padding: 'clamp(22px, 3vw, 32px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'center',
        }}
        className="pl-closing-grid"
      >
        <div>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '-0.018em',
              lineHeight: 1.2,
            }}
          >
            The beginning of your{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: '#6E5BA8',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              forever
            </span>{' '}
            story.
          </h2>
          <p
            style={{
              fontSize: 13,
              color: PD.inkSoft,
              margin: '8px 0 0',
              lineHeight: 1.55,
            }}
          >
            Thank you for letting Pearloom be part of it.
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 10 }}>
            Relive, share, and pass down the moments that matter most.
          </div>
          <button
            style={{
              background: PD.oliveDeep,
              color: '#FFFEF7',
              padding: '10px 18px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Share your keepsake ↑
          </button>
          <div style={{ fontSize: 11, color: PD.inkSoft, marginTop: 8 }}>
            Shared with 24 loved ones
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            justifyContent: 'flex-end',
          }}
        >
          <Pear size={44} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          <div
            style={{
              fontFamily: '"Caveat", "Fraunces", cursive',
              fontSize: 18,
              fontStyle: 'italic',
              color: PD.ink,
              lineHeight: 1.3,
            }}
          >
            Made with love,
            <br />
            saved for always.
            <span style={{ color: '#6E5BA8', marginLeft: 6 }}>♡</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 960px) {
          :global(.pl-closing-grid) {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
