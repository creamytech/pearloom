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

// ── Helpers ───────────────────────────────────────────────────────────────────
function proxyUrl(rawUrl: string, w: number, h: number): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.includes('googleusercontent.com') || rawUrl.includes('lh3.google')) {
    return `/api/photos/proxy?url=${encodeURIComponent(rawUrl)}&w=${w}&h=${h}`;
  }
  return rawUrl;
}

function getVideoEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?title=0&byline=0`;
  return null;
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
  const occasion = manifest.occasion || 'wedding';
  const SOLO_OCCASIONS = new Set(['birthday', 'story']);
  const idParts = (manifest.coupleId || '').split('-');
  const safeNames: [string, string] = [
    idParts[0] || 'Together',
    // For single-person occasions, second "name" is the occasion keyword — suppress it
    SOLO_OCCASIONS.has(occasion) || SOLO_OCCASIONS.has(idParts[1] || '') ? '' : (idParts[1] || 'Forever'),
  ];

  const sitePages = [
    { id: 'story', slug: 'our-story', label: 'Our Story', enabled: true, order: 0 },
  ] as import('@/types').SitePage[];

  // FaqSection expects FaqItemWithCategory — add a default category if missing
  const faqsWithCategory = (manifest.faqs || []).map((f: FaqItem) => ({
    ...f,
    category: (f as FaqItem & { category?: string }).category ?? 'General',
  }));

  // Render a block by type — respects manifest.blocks ordering
  const renderSection = (type: string) => {
    switch (type) {
      case 'hero':
        return (
          <React.Fragment key="hero">
            <Hero
              names={safeNames}
              subtitle={manifest.vibeString || 'A love story beautifully told.'}
              coverPhoto={coverPhoto}
              weddingDate={manifest.events?.[0]?.date || manifest.logistics?.date}
              vibeSkin={vibeSkin}
            />
            <WaveDivider skin={vibeSkin} fromColor={bgColor} toColor={cardBg} height={60} />
          </React.Fragment>
        );
      case 'story':
        if (!(manifest.chapters?.length)) return null;
        return (
          <section key="story" id="our-story">
            <Timeline chapters={manifest.chapters ?? []} layoutFormat={manifest.layoutFormat} />
          </section>
        );
      case 'event':
        if (!manifest.events?.length) return null;
        return (
          <React.Fragment key="event">
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={60} />
            <section id="schedule" style={{ background: cardBg }}>
              <WeddingEvents events={manifest.events} title={vibeSkin.sectionLabels.events} />
            </section>
          </React.Fragment>
        );
      case 'registry':
        if (!manifest.registry?.entries?.length && !manifest.registry?.cashFundUrl) return null;
        return (
          <React.Fragment key="registry">
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={accentLight} height={60} />
            <section id="registry" style={{ background: accentLight }}>
              <RegistryShowcase
                registries={manifest.registry?.entries || []}
                cashFundUrl={manifest.registry?.cashFundUrl}
                cashFundMessage={manifest.registry?.cashFundMessage}
                title={vibeSkin.sectionLabels.registry}
              />
            </section>
          </React.Fragment>
        );
      case 'travel':
        if (!manifest.travelInfo) return null;
        return (
          <React.Fragment key="travel">
            <WaveDivider skin={vibeSkin} fromColor={accentLight} toColor={cardBg} height={60} />
            <section id="travel" style={{ background: cardBg }}>
              <TravelSection info={manifest.travelInfo} />
            </section>
          </React.Fragment>
        );
      case 'faq':
        if (!faqsWithCategory.length) return null;
        return (
          <React.Fragment key="faq">
            <WaveDivider skin={vibeSkin} fromColor={cardBg} toColor={bgColor} height={60} />
            <section id="faq">
              <FaqSection faqs={faqsWithCategory} />
            </section>
          </React.Fragment>
        );
      case 'countdown': {
        const eventDate = manifest.logistics?.date || manifest.events?.[0]?.date;
        if (!eventDate) return null;
        const occ = manifest.occasion || 'wedding';
        const countdownLabel = occ === 'birthday' ? 'Until the celebration!'
          : occ === 'anniversary' ? 'Until our anniversary!'
          : occ === 'engagement' ? 'Until the big day!'
          : occ === 'story' ? 'The moment arrives'
          : 'Until we say I do';
        const target = new Date(eventDate).getTime();
        const now = Date.now();
        const diff = Math.max(0, target - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return (
          <section key="countdown" style={{ padding: 'clamp(2rem, 5vw, 5rem) 2rem', background: cardBg, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: pal.accent, marginBottom: '2rem', fontFamily: `"${vibeSkin.fonts.body}", sans-serif` }}>
              {countdownLabel}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              {[{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: mins, l: 'Min' }].map(({ v, l }) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 400, color: pal.foreground, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: pal.muted, marginTop: '0.5rem' }}>{l}</div>
                </div>
              ))}
            </div>
          </section>
        );
      }
      case 'text': {
        const blockCfg = (manifest.blocks || []).find((b: { type: string }) => b.type === 'text')?.config || {};
        const textContent = (blockCfg.content || blockCfg.text) as string | undefined;
        if (!textContent) return null;
        return (
          <section key="text" style={{ padding: 'clamp(2rem, 5vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '1.1rem', lineHeight: 1.8, color: pal.foreground, opacity: 0.8, textAlign: 'center', margin: 0 }}>
              {textContent}
            </p>
          </section>
        );
      }
      case 'quote': {
        const blockCfg = (manifest.blocks || []).find((b: { type: string }) => b.type === 'quote')?.config || {};
        const customQuote = (blockCfg.quote || blockCfg.text) as string | undefined;
        const quoteText = customQuote || vibeSkin.dividerQuote || manifest.vibeString || 'A love story beautifully told.';
        return (
          <section key="quote" style={{ padding: 'clamp(2rem, 5vw, 5rem) 2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '2rem', color: pal.accent, opacity: 0.4, marginBottom: '1rem' }}>{vibeSkin.accentSymbol || '✦'}</div>
            <p style={{ fontFamily: `"${vibeSkin.fonts.heading}", serif`, fontSize: 'clamp(1.3rem, 3vw, 2rem)', fontWeight: 400, fontStyle: 'italic', lineHeight: 1.65, color: pal.foreground, opacity: 0.75, margin: 0 }}>
              &ldquo;{quoteText}&rdquo;
            </p>
          </section>
        );
      }
      case 'video': {
        const blockCfg = (manifest.blocks || []).find((b: { type: string }) => b.type === 'video')?.config || {};
        const videoEmbedUrl = getVideoEmbedUrl(blockCfg.url as string | undefined);
        return (
          <section key="video" style={{ padding: 'clamp(2rem, 5vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden', background: cardBg, border: `1px solid ${pal.muted}30` }}>
              {videoEmbedUrl ? (
                <iframe src={videoEmbedUrl} title="Video" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: pal.muted, fontSize: '1rem' }}>Video embed — add YouTube or Vimeo URL</span>
                </div>
              )}
            </div>
          </section>
        );
      }
      case 'map': {
        const blockCfg = (manifest.blocks || []).find((b: { type: string }) => b.type === 'map')?.config || {};
        const mapAddress = (blockCfg.address as string | undefined) || manifest.events?.[0]?.address || manifest.logistics?.venue;
        return (
          <section key="map" style={{ padding: 'clamp(2rem, 5vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ aspectRatio: '16/9', borderRadius: '1rem', overflow: 'hidden', background: cardBg, border: `1px solid ${pal.muted}30` }}>
              {mapAddress ? (
                <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=15`} style={{ width: '100%', height: '100%', border: 'none' }} loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: pal.muted, fontSize: '1rem' }}>Venue map — add address in Details</span>
                </div>
              )}
            </div>
          </section>
        );
      }
      case 'divider':
        return <WaveDivider key="divider" skin={vibeSkin} fromColor={bgColor} toColor={bgColor} height={60} />;
      case 'photos': {
        const allPhotos = (manifest.chapters || []).flatMap((ch: import('@/types').Chapter) => ch.images || []).slice(0, 9);
        if (!allPhotos.length) return null;
        return (
          <section key="photos" style={{ padding: 'clamp(2rem, 5vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: pal.accent, marginBottom: '0.6rem', fontFamily: `"${vibeSkin.fonts.body}", sans-serif` }}>
                {vibeSkin.sectionLabels?.photos || 'Our Photos'}
              </div>
              <div style={{ width: '40px', height: '2px', background: pal.accent, margin: '0 auto', opacity: 0.5 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {allPhotos.map((img: { url: string; alt?: string }, i: number) => (
                <div key={i} style={{ gridColumn: i === 0 ? 'span 2' : undefined, aspectRatio: i === 0 ? '2/1.2' : '1/1', borderRadius: '0.75rem', overflow: 'hidden', background: cardBg }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proxyUrl(img.url, 800, 800)} alt={img.alt || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </section>
        );
      }
      case 'guestbook':
        return (
          <section key="guestbook" style={{ padding: 'clamp(2rem, 5vw, 5rem) 2rem', textAlign: 'center' }}>
            <div style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '0.9rem', color: pal.muted, padding: '2rem', border: `1px dashed ${pal.muted}40`, borderRadius: '1rem', maxWidth: '480px', margin: '0 auto' }}>
              ✦ Guestbook — available on your live site
            </div>
          </section>
        );
      case 'live':
        return (
          <section key="live" style={{ padding: 'clamp(2rem, 5vw, 5rem) 2rem', textAlign: 'center' }}>
            <div style={{ fontFamily: `"${vibeSkin.fonts.body}", sans-serif`, fontSize: '0.9rem', color: pal.muted, padding: '2rem', border: `1px dashed ${pal.muted}40`, borderRadius: '1rem', maxWidth: '480px', margin: '0 auto' }}>
              ✦ Live updates feed — shown on wedding day
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  // Use blocks ordering when available; fall back to legacy hardcoded order
  const visibleBlocks = manifest.blocks && manifest.blocks.length > 0
    ? [...manifest.blocks].sort((a, b) => a.order - b.order).filter(b => b.visible !== false)
    : null;

  const legacyOrder = ['hero', 'story', 'event', 'registry', 'travel', 'faq'];

  return (
    <ThemeProvider theme={dynamicTheme}>
      <div style={{ minHeight: '100vh', background: bgColor, color: pal.foreground }}>
        <SiteNav pages={sitePages} names={safeNames} logoIcon={manifest.logoIcon} logoSvg={manifest.logoSvg} />
        {visibleBlocks
          ? visibleBlocks.map(b => renderSection(b.type))
          : legacyOrder.map(t => renderSection(t))
        }
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
