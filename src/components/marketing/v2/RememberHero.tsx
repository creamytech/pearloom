'use client';

// Remember page hero — "The moments you'll never forget." with
// video frame on the right.

import Image from 'next/image';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { Sparkle } from '@/components/brand/groove';
import { REMEMBER, WIZARD } from '@/lib/assets';
import { BrandImage } from './BrandImage';
import type { StoryManifest } from '@/types';

export function RememberHero({
  manifest,
  onWatch,
  onPeek,
}: {
  manifest?: StoryManifest | null;
  onWatch: () => void;
  onPeek: () => void;
}) {
  const videoUrl = manifest?.heroSlideshow?.[0] || manifest?.coverPhoto;
  return (
    <section
      style={{
        padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 40px) clamp(24px, 4vw, 48px)',
        background: PD.paper,
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
          gap: 48,
          alignItems: 'center',
          position: 'relative',
        }}
        className="pl-remember-hero-grid"
      >
        {/* Left copy */}
        <div>
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 11,
              color: '#6E5BA8',
              letterSpacing: '0.26em',
              marginBottom: 20,
            }}
          >
            YOUR DAY, REMEMBERED
          </div>
          <h1
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(48px, 6vw, 80px)',
              fontWeight: 400,
              letterSpacing: '-0.028em',
              lineHeight: 1.02,
              margin: '0 0 28px',
              color: PD.ink,
            }}
          >
            The moments
            <br />
            you&rsquo;ll never
            <br />
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              forget
            </span>
            .
          </h1>
          <p
            style={{
              fontSize: 15.5,
              lineHeight: 1.6,
              color: PD.inkSoft,
              maxWidth: 440,
              margin: '0 0 32px',
            }}
          >
            We&rsquo;ve gathered the best of your day—videos, voice messages, and photos—into a
            beautiful keepsake made to relive and share forever.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={onWatch}
              style={{
                background: PD.oliveDeep,
                color: '#FFFEF7',
                border: 'none',
                borderRadius: 999,
                padding: '13px 22px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 22px rgba(76,90,38,0.24)',
              }}
            >
              Watch your highlight reel <span style={{ fontSize: 14 }}>▶</span>
            </button>
            <button
              onClick={onPeek}
              style={{
                background: 'transparent',
                border: 'none',
                color: PD.ink,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 500,
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
                }}
              >
                ▶
              </span>
              See what&rsquo;s inside
            </button>
          </div>

          {/* Pear + flower flourish top-left of left col */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -14,
              left: -8,
              opacity: 0.65,
              pointerEvents: 'none',
            }}
          >
            <Pear size={40} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
          </div>
        </div>

        {/* Right — video player */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              borderRadius: 18,
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              background: PD.paperCard,
              boxShadow: '0 30px 70px rgba(31,36,24,0.18)',
              border: '1px solid rgba(31,36,24,0.05)',
            }}
          >
            {videoUrl ? (
              <Image
                src={videoUrl}
                alt=""
                fill
                sizes="(max-width: 900px) 100vw, 620px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <BrandImage
                src={REMEMBER.videoPlayerCouple}
                alt="Highlight reel"
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
            <button
              onClick={onWatch}
              aria-label="Play highlight"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 72,
                height: 72,
                borderRadius: 999,
                background: 'rgba(244,236,216,0.9)',
                color: PD.ink,
                border: 'none',
                cursor: 'pointer',
                fontSize: 22,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 8px 24px rgba(31,36,24,0.2)',
              }}
            >
              ▶
            </button>
            {/* Timeline bar */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#FFFEF7',
                fontSize: 11,
                fontFamily: 'var(--pl-font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              <span>00:00</span>
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 999,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '0%',
                    background: '#FFFEF7',
                    borderRadius: 999,
                  }}
                />
              </div>
              <span>03:42</span>
              <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 14 }}>⛶</span>
            </div>
          </div>

          {/* Flower accents */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: -20,
              right: -16,
              width: 80,
              opacity: 0.9,
              pointerEvents: 'none',
            }}
          >
            <BrandImage
              src={REMEMBER.flowerPurpleDaisies}
              alt=""
              fallback={<Sparkle size={40} color={PD.gold} />}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          :global(.pl-remember-hero-grid) {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </section>
  );
}
