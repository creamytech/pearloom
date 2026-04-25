'use client';

/* ========================================================================
   PEARLOOM — HOME (v8 handoff port)
   "Plan with heart. Keep every moment."
   ======================================================================== */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  Blob,
  Heart,
  Icon,
  Pear,
  PearMascot,
  PhotoPlaceholder,
  PostIt,
  Sparkle,
  Squiggle,
  Stamp,
} from '../motifs';
import { Float, Reveal } from '../motion';
import { TopNav } from '../chrome';
import { LandingPricing } from '@/components/marketing/v2/LandingPricing';
import { LandingPillars } from '@/components/marketing/v2/LandingPillars';
import { LandingProof } from '@/components/marketing/v2/LandingProof';

function Eyebrow({ children, color = 'var(--peach-ink)' }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Sparkle size={11} color="var(--gold)" />
      {children}
    </div>
  );
}

/* ==================== HERO ==================== */
function Hero() {
  return (
    <section style={{ position: 'relative', padding: '48px 0 140px', overflow: 'hidden' }}>
      {/* Two restrained paper washes + a single hairline filigree —
          a calmer hero atmosphere than the original three blobs +
          two squiggles. */}
      <Blob tone="lavender" size={520} opacity={0.42} seed={0} style={{ position: 'absolute', top: -120, left: -160, zIndex: 0 }} />
      <Blob tone="peach" size={420} opacity={0.32} seed={2} style={{ position: 'absolute', bottom: -120, right: -120, zIndex: 0 }} />
      <Squiggle width={240} variant={3} style={{ position: 'absolute', top: 40, right: 120, opacity: 0.45, zIndex: 0 }} />

      <div
        className="container pl8-hero-grid"
        style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 56, alignItems: 'center' }}
      >
        {/* LEFT */}
        <div className="pl8-hero-left" style={{ position: 'relative' }}>
          <Reveal delay={100}>
            <div data-stamp style={{ position: 'absolute', top: 0, left: -20 }}>
              <Stamp size={88} tone="lavender" icon="pear" rotation={-12} text="MADE FOR MEANINGFUL MOMENTS" />
            </div>
          </Reveal>

          <div style={{ paddingLeft: 90 }}>
            <Reveal delay={140} y={24}>
              <h1 className="display" style={{ fontSize: 78, lineHeight: 0.98, margin: 0 }}>
                Plan with heart.
              </h1>
            </Reveal>
            <Reveal delay={260} y={24}>
              <h1 className="display" style={{ fontSize: 78, lineHeight: 0.98, margin: '6px 0 0', color: 'var(--lavender-2)' }}>
                Keep every
                <br />
                moment.
                <Float amplitude={6} duration={5} style={{ display: 'inline-block', marginLeft: 10, verticalAlign: '-6px' }}>
                  <Heart size={44} color="#F0B098" />
                </Float>
              </h1>
            </Reveal>

            <Reveal delay={400}>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: 'var(--ink-soft)',
                  maxWidth: 460,
                  margin: '28px 0 32px',
                }}
              >
                Pearloom helps you plan, host, and preserve life&apos;s most meaningful events—all in one beautiful place.
              </p>
            </Reveal>

            <Reveal delay={520}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
                <Link className="btn btn-primary btn-lg pl8-btn-sheen" href="/wizard/new">
                  Start your event <Pear size={14} tone="cream" shadow={false} />
                </Link>
                <button type="button" className="btn btn-outline btn-lg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  See how it works
                </button>
              </div>
            </Reveal>

            <Reveal delay={640}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {['#EAB286', '#C4B5D9', '#8B9C5A', '#F0C9A8', '#CBD29E'].map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: c,
                        border: '2px solid var(--cream)',
                        marginLeft: i === 0 ? 0 : -10,
                      }}
                    />
                  ))}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 1, color: 'var(--gold)', fontSize: 13 }}>
                    {'★★★★★'.split('').map((s, i) => (
                      <span key={i}>{s}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Loved by families everywhere</div>
                </div>
              </div>
            </Reveal>
          </div>

          <Float amplitude={6} duration={7} className="pl8-hero-right">
            <div style={{ position: 'absolute', left: -24, bottom: -120, zIndex: 1 }}>
              <Pear size={110} tone="cream" />
            </div>
          </Float>
        </div>

        {/* RIGHT — device + polaroid */}
        <Reveal delay={320} y={32} duration={900} className="pl8-hero-right">
          <div style={{ position: 'relative', height: 640, paddingRight: 48 }}>
            {/* Dashboard window — positioned slightly right + up so the phone has room at bottom-left */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 88,
                right: 0,
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 24px 56px rgba(61,74,31,0.14), 0 2px 6px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
                overflow: 'hidden',
                zIndex: 2,
              }}
            >
              <DashboardPreview />
            </div>

            {/* Phone — bottom-left, overlapping dashboard */}
            <Float amplitude={5} duration={7} style={{ position: 'absolute', left: 0, bottom: 0, zIndex: 4 }}>
              <PhoneMock />
            </Float>

            {/* Couple polaroid — top-right, rotated (rotation outside Float to avoid animation override) */}
            <div style={{ position: 'absolute', top: 16, right: -20, zIndex: 5, transform: 'rotate(6deg)' }}>
              <Float amplitude={4} duration={8} delay={0.5}>
                <CouplePolaroid />
              </Float>
            </div>

            {/* PostIt — tucked behind polaroid corner */}
            <div style={{ position: 'absolute', top: -20, right: 200, zIndex: 3 }}>
              <PostIt tone="lavender" width={180} rotation={8}>
                <div style={{ fontFamily: 'var(--font-script)', fontSize: 20 }}>
                  Every detail,
                  <br />
                  together.
                </div>
                <div style={{ marginTop: 6, opacity: 0.5, fontFamily: 'var(--font-script)', fontSize: 22 }}>~</div>
              </PostIt>
            </div>

            {/* Stamp — bottom-right, peeking below the polaroid */}
            <div style={{ position: 'absolute', bottom: 40, right: 20, zIndex: 6 }}>
              <Stamp size={84} tone="peach" icon="pear" rotation={12} text="MADE TO BE REMEMBERED" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const items = [
    { icon: 'home', label: 'Home', on: true },
    { icon: 'calendar', label: 'Timeline' },
    { icon: 'users', label: 'Guests' },
    { icon: 'section', label: 'Details' },
    { icon: 'gallery', label: 'Gallery' },
    { icon: 'text', label: 'Notes' },
    { icon: 'gift', label: 'Gifts' },
    { icon: 'settings', label: 'Settings' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', minHeight: 380 }}>
      <div style={{ background: '#FBF7EC', borderRight: '1px solid rgba(0,0,0,0.06)', padding: '16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
          <Pear size={22} tone="sage" shadow={false} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Pearloom</div>
        </div>
        {items.map((it) => (
          <div
            key={it.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              marginBottom: 2,
              background: it.on ? '#fff' : 'transparent',
              boxShadow: it.on ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              fontSize: 12.5,
              color: it.on ? 'var(--ink)' : 'var(--ink-soft)',
              fontWeight: it.on ? 600 : 500,
            }}
          >
            <Icon name={it.icon} size={13} />
            {it.label}
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
          The Anderson Wedding <Icon name="chev-down" size={12} color="var(--ink-muted)" />
        </div>
        <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, color: 'var(--ink)', marginBottom: 12 }}>
          We&apos;re so glad you&apos;re here <Sparkle size={11} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Event Date', value: 'June 22, 2025' },
            { label: 'Days to go', value: '87' },
            { label: 'Guests', value: '124' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: '#FDFAF0',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.05)',
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 4 }}>Your progress</div>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: '#EFE8D4',
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              height: '100%',
              width: '75%',
              background: 'linear-gradient(90deg, #A8BA72, #8B9C5A)',
              borderRadius: 999,
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6 }}>Next up</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {[
            { label: 'Send invitations', due: 'Due May 1', done: false },
            { label: 'Choose ceremony music', due: 'Due May 8', done: true },
            { label: 'Finalize seating', due: 'Due May 15', done: false },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 0' }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: t.done ? 'var(--sage)' : 'transparent',
                  border: `1.5px solid ${t.done ? 'var(--sage)' : 'rgba(0,0,0,0.2)'}`,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {t.done && <Icon name="check" size={8} color="#fff" strokeWidth={3} />}
              </div>
              <div style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>
                {t.label}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>{t.due}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-outline btn-sm" style={{ padding: '6px 12px', fontSize: 12 }}>
          Open timeline
        </button>
        <div style={{ marginTop: 12, padding: 10, background: '#FBF7EC', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600 }}>Guestbook</div>
            <div style={{ display: 'flex' }}>
              {['#EAB286', '#C4B5D9', '#8B9C5A'].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: c,
                    border: '1.5px solid #FBF7EC',
                    marginLeft: i === 0 ? 0 : -5,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-script)', fontSize: 16, color: 'var(--ink-soft)' }}>
            So much love for you both!
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMock() {
  const times = [
    { t: '4:00', label: 'Ceremony', icon: 'heart-icon', tone: '#E3E6C8' },
    { t: '5:00', label: 'Cocktail Hour', icon: 'star', tone: '#F7DDC2' },
    { t: '6:00', label: 'Dinner & Toasts', icon: 'gift', tone: '#E8E0F0' },
    { t: '8:00', label: 'Dancing', icon: 'music', tone: '#F7DDC2' },
    { t: '10:30', label: 'Send Off', icon: 'sparkles', tone: '#E3E6C8' },
  ];
  return (
    <div style={{ width: 200, height: 400, background: '#1A1A1A', borderRadius: 32, padding: 7, boxShadow: '0 30px 60px rgba(61,74,31,0.25)' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FDFAF0',
          borderRadius: 26,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 70, height: 18, background: '#1A1A1A', borderRadius: 10, zIndex: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>Timeline</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ padding: '2px 8px', fontSize: 9, background: '#F3E9D4', borderRadius: 999 }}>All</div>
            <Icon name="chev-down" size={10} />
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {times.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#FFFEF7', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', width: 30 }}>{e.t}</div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: e.tone, display: 'grid', placeItems: 'center' }}>
                <Icon name={e.icon} size={11} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{e.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '8px 12px 14px', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          View full timeline
        </div>
      </div>
    </div>
  );
}

function CouplePolaroid() {
  return (
    <div
      style={{
        background: '#fff',
        padding: '10px 10px 40px',
        width: 220,
        boxShadow: '0 18px 40px rgba(61,74,31,0.18)',
        borderRadius: 3,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: 70, height: 20, background: 'rgba(234,178,134,0.55)' }} />
      <PhotoPlaceholder tone="warm" aspect="1 / 1" />
      <div style={{ position: 'absolute', bottom: 8, left: 14 }}>
        <Heart size={14} color="#E8A07A" />
      </div>
      <div style={{ position: 'absolute', bottom: 10, right: 14, fontFamily: 'var(--font-script)', fontSize: 15, color: 'var(--ink-soft)' }}>The big day</div>
    </div>
  );
}

/* ==================== FEATURE TRIAD ==================== */
function FeatureTriad() {
  // anchored via wrapper id="product" below
  const items = [
    {
      title: 'Compose',
      tone: 'lavender',
      bg: 'var(--lavender-bg)',
      body: 'Bring your vision to life with planning tools that make it easy and joyful.',
      icon: (
        <svg viewBox="0 0 40 40" width="24" height="24">
          <path d="M8 30 L8 28 L26 10 L30 14 L12 32 L8 32 Z" fill="#3D4A1F" />
          <path d="M24 10 L28 14" stroke="#fff" strokeWidth={1.5} />
        </svg>
      ),
    },
    {
      title: 'Conduct',
      tone: 'peach',
      bg: 'var(--peach-bg)',
      body: 'Run your event smoothly with timelines, roles, and real-time updates.',
      icon: (
        <svg viewBox="0 0 40 40" width="26" height="26">
          <circle cx="20" cy="20" r="5" fill="#D4A95D" />
          <path
            d="M20 10 v3 M20 27 v3 M10 20 h3 M27 20 h3 M13 13 l2 2 M25 25 l2 2 M27 13 l-2 2 M15 25 l-2 2"
            stroke="#3D4A1F"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: 'Remember',
      tone: 'sage',
      bg: 'var(--sage-tint)',
      body: 'Collect photos, messages, and moments that last long after the day.',
      icon: (
        <svg viewBox="0 0 40 40" width="24" height="24">
          <rect x="10" y="8" width="20" height="26" rx="2" fill="none" stroke="#3D4A1F" strokeWidth={1.8} />
          <path d="M14 8 v26" stroke="#3D4A1F" strokeWidth={1.2} />
          <path
            d="M22 20 c0 -2 -2 -3 -3 -2 c -1 1 -1 3 3 5 c 4 -2 4 -4 3 -5 c -1 -1 -3 0 -3 2 z"
            fill="#E8A07A"
          />
          <path d="M18 28 L26 28 M18 31 L24 31" stroke="#3D4A1F" strokeWidth={1} strokeLinecap="round" />
        </svg>
      ),
    },
  ];
  return (
    <section id="product" className="container" style={{ padding: '48px 32px 24px', position: 'relative', scrollMarginTop: 96 }}>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Sparkle size={11} />
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-soft)', fontWeight: 400 }}>
            Everything you need, beautifully connected.
          </span>
          <Sparkle size={11} />
        </div>
      </Reveal>

      <div className="pl8-cols-3" style={{ gap: 36 }}>
        {items.map((it, i) => (
          <Reveal key={i} delay={i * 120}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: it.bg,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  boxShadow: '0 6px 16px rgba(61,74,31,0.06)',
                }}
              >
                {it.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 600,
                    color:
                      it.tone === 'lavender'
                        ? 'var(--lavender-ink)'
                        : it.tone === 'peach'
                          ? 'var(--peach-ink)'
                          : 'var(--ink)',
                    marginBottom: 4,
                  }}
                >
                  {it.title}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{it.body}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ==================== SIGNATURE FEATURE ==================== */
function SignatureFeature() {
  const [active, setActive] = useState(2);
  const moments = [
    { label: 'The beginning', date: '2016', tone: 'sage' as const },
    { label: 'The proposal', date: '2022', tone: 'cream' as const },
    { label: 'The big day', date: 'June 22, 2025', tone: 'warm' as const, current: true },
    { label: 'The celebration', date: '2025', tone: 'peach' as const },
    { label: 'And beyond', date: 'Forever', tone: 'lavender' as const },
  ];
  return (
    <section className="container" style={{ padding: '40px 32px', position: 'relative' }}>
      <Reveal>
        <div
          style={{
            background: 'var(--lavender-bg)',
            borderRadius: 24,
            padding: '32px 36px',
            display: 'grid',
            gridTemplateColumns: '1fr 2.1fr',
            gap: 40,
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Squiggle width={160} variant={2} stroke="#D4A95D" style={{ position: 'absolute', top: 10, right: 30, opacity: 0.45 }} />
          <Sparkle size={14} style={{ position: 'absolute', top: 18, left: 24 }} />

          <div>
            <Eyebrow color="var(--lavender-ink)">Our signature feature</Eyebrow>
            <h2 className="display" style={{ fontSize: 30, margin: '10px 0 12px', letterSpacing: '-0.015em' }}>
              Your story, <span style={{ fontStyle: 'italic', fontWeight: 400 }}>told through time.</span>
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 18, maxWidth: 340 }}>
              Upload your photos and Pearloom builds a beautiful timeline that weaves your memories into a shareable
              story—before, during, and long after your day.
            </p>
            <Link className="btn btn-primary btn-sm" href="/wizard/new">
              See your story come to life <Pear size={12} tone="cream" shadow={false} />
            </Link>
          </div>

          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', top: 75, left: 40, right: 40, height: 4, width: 'calc(100% - 80px)' }}
              preserveAspectRatio="none"
              viewBox="0 0 1000 4"
            >
              <path d="M0 2 L1000 2" stroke="#B7A4D0" strokeWidth={1.2} strokeDasharray="3 5" fill="none" />
            </svg>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, position: 'relative' }}>
              {moments.map((m, i) => {
                const isActive = i === active;
                return (
                  <Reveal key={i} delay={120 + i * 90}>
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      style={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        padding: '8px 4px',
                        background: isActive ? 'rgba(255,255,255,0.75)' : 'transparent',
                        borderRadius: 10,
                        border: isActive ? '1.5px solid var(--peach-2)' : '1.5px solid transparent',
                        transition: 'all 360ms cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: isActive ? 'var(--peach-2)' : '#fff',
                          color: isActive ? '#fff' : 'var(--ink-soft)',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'grid',
                          placeItems: 'center',
                          margin: '0 auto 10px',
                          boxShadow: isActive ? '0 0 0 4px rgba(240,201,168,0.3)' : '0 2px 4px rgba(0,0,0,0.06)',
                          position: 'relative',
                        }}
                      >
                        {i + 1}
                        {isActive && (
                          <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }}>
                            <Heart size={12} color="#E8A07A" />
                          </div>
                        )}
                      </div>
                      <div style={{ background: '#fff', padding: 3, boxShadow: '0 4px 10px rgba(61,74,31,0.1)', marginBottom: 8 }}>
                        <PhotoPlaceholder tone={m.tone} aspect="1/1" />
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-soft)' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 1 }}>{m.date}</div>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ==================== EVENT TYPES ==================== */
function EventTypes() {
  const types = [
    {
      name: 'Weddings',
      body: 'Celebrate your love your way.',
      icon: (
        <svg viewBox="0 0 40 40" width="26" height="26">
          <circle cx="16" cy="22" r="7" fill="none" stroke="#3D4A1F" strokeWidth={1.8} />
          <circle cx="26" cy="22" r="7" fill="none" stroke="#D4A95D" strokeWidth={1.8} />
        </svg>
      ),
    },
    {
      name: 'Memorials',
      body: 'Honor a life beautifully.',
      icon: (
        <svg viewBox="0 0 40 40" width="26" height="26">
          <path
            d="M20 8 c -4 0 -7 3 -7 7 c 0 5 7 10 7 10 s 7 -5 7 -10 c 0 -4 -3 -7 -7 -7 z"
            fill="none"
            stroke="#3D4A1F"
            strokeWidth={1.5}
          />
          <path d="M13 30 L20 25 L27 30 L27 32 L13 32 z" fill="#F0C9A8" />
        </svg>
      ),
    },
    {
      name: 'Birthdays',
      body: 'Make every year worth remembering.',
      icon: (
        <svg viewBox="0 0 40 40" width="26" height="26">
          <path d="M10 20 L30 20 L30 30 Q 30 32 28 32 L 12 32 Q 10 32 10 30 z" fill="#F0C9A8" />
          <path d="M8 20 L32 20" stroke="#3D4A1F" strokeWidth={1.5} />
          <rect x="14" y="14" width="12" height="6" fill="#C4B5D9" />
          <path
            d="M17 10 Q 17 8 19 8 Q 21 8 21 10 M 23 10 Q 23 8 25 8 Q 27 8 27 10"
            stroke="#D4A95D"
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      name: 'Reunions',
      body: 'Reconnect and make new memories.',
      icon: (
        <svg viewBox="0 0 40 40" width="28" height="28">
          <circle cx="14" cy="15" r="4" fill="#8B9C5A" />
          <circle cx="26" cy="15" r="4" fill="#C4B5D9" />
          <circle cx="20" cy="22" r="4" fill="#F0C9A8" />
          <path d="M8 32 c 0 -4 3 -6 6 -6 h 12 c 3 0 6 2 6 6" fill="#3D4A1F" opacity="0.15" />
        </svg>
      ),
    },
    {
      name: 'And more',
      body: 'Showers, anniversaries, retirements & more.',
      icon: (
        <svg viewBox="0 0 40 40" width="26" height="26">
          <path d="M20 6 l2 5 l5 1 l-4 4 l1 5 l-4 -2 l-4 2 l1 -5 l-4 -4 l5 -1 z" fill="#D4A95D" />
          <circle cx="10" cy="28" r="2" fill="#C4B5D9" />
          <circle cx="30" cy="28" r="2" fill="#8B9C5A" />
        </svg>
      ),
    },
  ];
  return (
    <section id="event-types" className="container" style={{ padding: '20px 32px 40px', scrollMarginTop: 96 }}>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Sparkle size={11} />
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-soft)', fontWeight: 400 }}>
            Made for every kind of meaningful.
          </span>
          <Sparkle size={11} />
        </div>
      </Reveal>

      <div className="pl8-cols-5">
        {types.map((t, i) => (
          <Reveal key={i} delay={i * 80}>
            <Link
              href="/wizard/new"
              className="lift"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--card-ring)',
                borderRadius: 16,
                padding: '18px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: 'var(--cream-2)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {t.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 2 }}>{t.body}</div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ==================== FOOTER STRIP ==================== */
function FooterStrip() {
  return (
    <section style={{ padding: '30px 0 0' }}>
      <Reveal>
        <div
          className="container pl8-footer-strip"
          style={{
            background: 'var(--ink)',
            borderRadius: 24,
            padding: '20px 28px',
            color: 'var(--cream)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', width: 100, marginLeft: 8 }}>
            <Float amplitude={4}>
              <PearMascot size={110} mood="happy" />
            </Float>
            <div style={{ position: 'absolute', top: 30, right: -14 }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle r={3} cx={12} cy={12} fill="#F8F1E4" />
                <circle r={2.2} cx={12} cy={5} fill="#F8F1E4" />
                <circle r={2.2} cx={12} cy={19} fill="#F8F1E4" />
                <circle r={2.2} cx={5} cy={12} fill="#F8F1E4" />
                <circle r={2.2} cx={19} cy={12} fill="#F8F1E4" />
              </svg>
            </div>
          </div>

          <div>
            <div className="display" style={{ fontSize: 26, color: 'var(--cream)' }}>
              Let&apos;s make it meaningful.
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
              Start planning today and create an event that&apos;s perfectly you—and unforgettable.
            </div>
          </div>

          <Link
            className="btn"
            href="/wizard/new"
            style={{ background: 'transparent', color: 'var(--cream)', border: '1.5px solid var(--cream)' }}
          >
            Create your event <Pear size={14} tone="cream" shadow={false} />
          </Link>

          <div style={{ fontFamily: 'var(--font-script)', fontSize: 22, color: 'var(--cream)', lineHeight: 1.1, opacity: 0.95 }}>
            It&apos;s free
            <br />
            to get started!
          </div>

          <Float amplitude={3} duration={6}>
            <Stamp size={76} tone="lavender" icon="pear" rotation={-8} text="WITH YOU EVERY STEP OF THE WAY" />
          </Float>
        </div>
      </Reveal>

      <div
        className="container"
        style={{
          margin: '18px auto 40px',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: 12.5,
          color: 'var(--ink-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" size={13} /> Your data is private and secure
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="heart-icon" size={13} /> Built with care, by real humans
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="sparkles" size={13} /> Here for life&apos;s big (and small) moments
        </div>
      </div>
    </section>
  );
}

/* ==================== HOME V8 ==================== */
export function HomeV8() {
  const router = useRouter();
  const startEvent = () => router.push('/wizard/new');
  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <TopNav active="Home" />
      <Hero />
      <FeatureTriad />
      <SignatureFeature />
      <EventTypes />
      <div id="features" style={{ scrollMarginTop: 96 }}>
        <LandingPillars />
      </div>
      <LandingProof />
      <div id="pricing" style={{ scrollMarginTop: 96 }}>
        <LandingPricing onStart={startEvent} />
      </div>
      <FooterStrip />
    </div>
  );
}
