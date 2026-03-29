'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef } from 'react';
import type { StoryManifest } from '@/types';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { Hero } from '@/components/hero';
import { Timeline } from '@/components/timeline';
import { WeddingEvents } from '@/components/wedding-events';
import { RegistryShowcase } from '@/components/registry-showcase';
import { FaqSection } from '@/components/faq-section';
import { TravelSection } from '@/components/travel-section';
import { deriveVibeSkin } from '@/lib/vibe-engine';
import { WaveDivider } from '@/components/vibe/WaveDivider';
import type { FaqItem } from '@/types';

interface PreviewPageProps {
  params: Promise<{ token: string }>;
}

// ── Feedback Form Component ──────────────────────────────────────────────────
function FeedbackForm({ token, onClose }: { token: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', token, name: name.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setStatus('sent');
        setTimeout(onClose, 1500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '5rem',
        right: '1.5rem',
        width: '320px',
        background: 'rgba(30,27,22,0.97)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '1rem',
        padding: '1.25rem',
        zIndex: 10000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: '#f5f0e8', fontWeight: 600, fontSize: '0.9rem' }}>Leave feedback</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {status === 'sent' ? (
        <p style={{ color: '#A3B18A', fontSize: '0.875rem', textAlign: 'center', padding: '0.5rem 0' }}>
          Thanks for your feedback!
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.07)',
              color: '#f5f0e8',
              fontSize: '0.875rem',
              marginBottom: '0.6rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Your message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={3}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.07)',
              color: '#f5f0e8',
              fontSize: '0.875rem',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              marginBottom: '0.75rem',
              boxSizing: 'border-box',
            }}
          />
          {status === 'error' && (
            <p style={{ color: '#e88', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Something went wrong. Please try again.</p>
          )}
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '0.5rem',
              background: '#A3B18A',
              color: '#1e1b16',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              opacity: status === 'sending' ? 0.7 : 1,
            }}
          >
            {status === 'sending' ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Preview Banner Component ─────────────────────────────────────────────────
function PreviewBanner({ token }: { token: string }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          background: 'rgba(30,27,22,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1rem' }}>👁️</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: 500 }}>
            Preview Mode
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            This site hasn&apos;t been published yet
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => setShowFeedback(v => !v)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '0.4rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Leave feedback
          </button>
          <button
            onClick={handleShare}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '0.4rem',
              border: '1px solid rgba(163,177,138,0.5)',
              background: 'rgba(163,177,138,0.15)',
              color: '#A3B18A',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {copied ? 'Copied!' : 'Share this preview'}
          </button>
        </div>
      </div>
      {showFeedback && (
        <FeedbackForm token={token} onClose={() => setShowFeedback(false)} />
      )}
    </>
  );
}

// ── Site Renderer ────────────────────────────────────────────────────────────
function SiteRenderer({ manifest }: { manifest: StoryManifest }) {
  const vibeSkin = manifest.vibeSkin || deriveVibeSkin(manifest.vibeString || '');
  const pal = vibeSkin.palette;
  const bgColor = pal.background;
  const cardBg = pal.card;
  const accentLight = pal.accent2;

  const dynamicTheme = {
    name: 'pearloom-ai',
    fonts: { heading: vibeSkin.fonts.heading, body: vibeSkin.fonts.body },
    colors: {
      background: pal.background,
      foreground: pal.foreground,
      accent: pal.accent,
      accentLight: pal.accent2,
      muted: pal.muted,
      cardBg: pal.card,
    },
    borderRadius: '1rem',
  };

  const coverPhoto = manifest.chapters?.[0]?.images?.[0]?.url || 'https://images.unsplash.com/photo-1519741497674-611481863552';
  const safeNames: [string, string] = [
    manifest.coupleId?.split('-')[0] || 'Together',
    manifest.coupleId?.split('-')[1] || 'Forever',
  ];

  const sitePages = [
    { id: 'story', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
  ] as import('@/types').SitePage[];

  // FaqSection expects FaqItemWithCategory — add a default category if missing
  const faqsWithCategory = (manifest.faqs || []).map((f: FaqItem) => ({
    ...f,
    category: (f as FaqItem & { category?: string }).category ?? 'General',
  }));

  return (
    <ThemeProvider theme={dynamicTheme}>
      <div style={{ minHeight: '100vh', background: bgColor, color: pal.foreground }}>
        <SiteNav
          pages={sitePages}
          names={safeNames}
        />
        <Hero
          names={safeNames}
          subtitle={manifest.vibeString || 'A love story beautifully told.'}
          coverPhoto={coverPhoto}
          weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
          vibeSkin={vibeSkin}
        />
        <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
        {(manifest.chapters?.length ?? 0) > 0 && (
          <section id="our-story">
            <Timeline chapters={manifest.chapters ?? []} layoutFormat={manifest.layoutFormat} />
          </section>
        )}
        {(manifest.events?.length ?? 0) > 0 && (
          <>
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
            <section id="schedule" style={{ background: cardBg }}>
              <WeddingEvents events={manifest.events ?? []} title={vibeSkin.sectionLabels?.events || 'The Celebration'} />
            </section>
          </>
        )}
        {(manifest.registry?.entries?.length ?? 0) > 0 || manifest.registry?.cashFundUrl ? (
          <>
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={accentLight} height={60} />
            <section id="registry" style={{ background: accentLight }}>
              <RegistryShowcase
                registries={manifest.registry?.entries || []}
                cashFundUrl={manifest.registry?.cashFundUrl}
                cashFundMessage={manifest.registry?.cashFundMessage}
                title={vibeSkin.sectionLabels?.registry || 'Our Registry'}
              />
            </section>
          </>
        ) : null}
        {manifest.travelInfo ? (
          <>
            <WaveDivider skin={vibeSkin} fromColor={accentLight} toColor={cardBg} height={60} />
            <section id="travel" style={{ background: cardBg }}>
              <TravelSection info={manifest.travelInfo} />
            </section>
          </>
        ) : null}
        {faqsWithCategory.length > 0 && (
          <>
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={60} />
            <section id="faq">
              <FaqSection faqs={faqsWithCategory} />
            </section>
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────
export default function PreviewPage({ params }: PreviewPageProps) {
  const [token, setToken] = useState<string>('');
  const [manifest, setManifest] = useState<StoryManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    async function load() {
      if (fetchedRef.current) return;
      fetchedRef.current = true;

      const { token: t } = await params;
      setToken(t);

      try {
        const res = await fetch(`/api/preview?token=${encodeURIComponent(t)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'This preview link has expired or is invalid.');
          return;
        }
        const data = await res.json();
        if (!data.manifest) {
          setError('This preview link has expired or is invalid.');
          return;
        }
        setManifest(data.manifest as StoryManifest);
      } catch {
        setError('Failed to load preview. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif', fontSize: '1rem' }}>Loading preview…</p>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e1b16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '2.5rem' }}>🔗</span>
        <h1 style={{ color: '#f5f0e8', fontFamily: 'Georgia, serif', fontSize: '1.5rem', fontWeight: 400, margin: 0 }}>
          This preview link has expired or is invalid
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'sans-serif', fontSize: '0.9rem', margin: 0 }}>
          Ask the couple for a new link.
        </p>
      </div>
    );
  }

  return (
    <>
      <PreviewBanner token={token} />
      <SiteRenderer manifest={manifest} />
    </>
  );
}
