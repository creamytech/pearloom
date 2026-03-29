'use client';

// Force dynamic rendering — this page uses useSession() which requires a live auth context.
// Static prerendering would cause useSession() to return undefined and crash the build.
export const dynamic = 'force-dynamic';

// ── Dev-only logging helpers ─────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log.bind(console) : () => {};
const logError = isDev ? console.error.bind(console) : () => {};

// -------------------------------------------------------------
// everglow / app/dashboard/page.tsx
// Full wizard flow: Sign In → Dashboard → Select Photos → Set Vibe → Generate → Edit → Preview
// -------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Eye, Pencil, LogIn, ArrowLeft, ArrowRight, Loader2, Check, Globe, LayoutDashboard, Users } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { LocalUploader } from '@/components/dashboard/local-uploader';
import nextDynamic from 'next/dynamic';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { GuestManager } from '@/components/dashboard/guest-manager';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { LandingPage } from '@/components/landing-page';
import { GenerationProgress } from '@/components/dashboard/generation-progress';
import { UserSites } from '@/components/dashboard/user-sites';
import type { GooglePhotoMetadata, StoryManifest, PhotoCluster } from '@/types';
import { ClusterReview } from '@/components/dashboard/cluster-review';

// Full-screen editor -- SSR disabled (uses browser APIs + framer Reorder)
const FullscreenEditor = nextDynamic(
  () => import('@/components/editor/FullscreenEditor').then(m => m.FullscreenEditor),
  { ssr: false }
);

type Step = 'auth' | 'dashboard' | 'photos' | 'local-upload' | 'cluster-review' | 'vibe' | 'generating' | 'edit' | 'preview' | 'guests';

function PhotosStep({
  selectedPhotos,
  onPhotosSelected,
  onContinue,
  onLocalUpload,
}: {
  selectedPhotos: GooglePhotoMetadata[];
  onPhotosSelected: (photos: GooglePhotoMetadata[]) => void;
  onContinue: () => void;
  onLocalUpload: () => void;
}) {
  const [attemptedContinue, setAttemptedContinue] = useState(false);

  const handleContinue = () => {
    if (selectedPhotos.length === 0) {
      setAttemptedContinue(true);
      return;
    }
    onContinue();
  };

  return (
    <div>
      <PhotoBrowser
        onSelectionChange={onPhotosSelected}
        maxSelection={30}
      />

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Google Photos refusing to sync?
        </p>
        <button
          onClick={onLocalUpload}
          style={{
            padding: '0.75rem 2rem', borderRadius: '2rem', border: '1px solid rgba(0,0,0,0.1)',
            background: '#ffffff', color: 'var(--eg-fg)', fontSize: '0.95rem',
            fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          Bypass API and Upload Locally
        </button>
      </div>

      <div style={{ position: 'sticky', bottom: '1rem', marginTop: '2rem' }}>
        <button
          onClick={handleContinue}
          disabled={selectedPhotos.length === 0}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '1rem 1.5rem', borderRadius: '0.75rem',
            background: selectedPhotos.length === 0 ? 'rgba(43,43,43,0.35)' : 'var(--eg-fg)',
            color: '#fff', fontSize: '0.9rem',
            fontWeight: 500, cursor: selectedPhotos.length === 0 ? 'not-allowed' : 'pointer',
            border: 'none',
            boxShadow: selectedPhotos.length === 0 ? 'none' : '0 8px 30px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
          }}
        >
          {selectedPhotos.length > 0 ? `Continue with ${selectedPhotos.length} photos` : 'Select photos to continue'}
          <ArrowRight size={16} />
        </button>
        {attemptedContinue && selectedPhotos.length === 0 && (
          <p style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--eg-muted)' }}>
            Select at least 1 photo to continue
          </p>
        )}
      </div>
    </div>
  );
}

// Generates a memorable random slug like "shauna-and-ben-x7q2"
function generateSlug(names: [string, string]): string {
  const n1 = names[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'us';
  const n2 = names[1].toLowerCase().replace(/[^a-z0-9]/g, '') || 'together';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${n1}-and-${n2}-${suffix}`;
}

const STEP_META: Record<Step, { title: string; subtitle: string; icon: React.ElementType }> = {
  auth: { title: 'Welcome to Pearloom', subtitle: 'Connect Google Photos or upload locally.', icon: LogIn },
  dashboard: { title: '', subtitle: '', icon: LayoutDashboard },
  photos: { title: 'Select Your Memories', subtitle: 'Choose the photos that tell your story.', icon: Camera },
  'local-upload': { title: 'Upload Photos', subtitle: 'Directly upload your favorite high-quality images.', icon: Camera },
  'cluster-review': { title: 'Where Were You?', subtitle: 'Add locations to each memory group for a richer story.', icon: Camera },
  vibe: { title: 'Set Your Vibe', subtitle: 'Describe the feeling -- the AI will do the rest.', icon: Sparkles },
  generating: { title: '', subtitle: '', icon: Sparkles },
  edit: { title: 'Your Story', subtitle: 'Review and edit. Make it perfect.', icon: Pencil },
  preview: { title: 'Preview', subtitle: 'See your site live before publishing.', icon: Eye },
  guests: { title: 'Guest List', subtitle: 'Track RSVPs and manage your guests.', icon: Users },
};

export default function DashboardPage() {
  const { data: session, status } = useSession() ?? { data: null, status: 'loading' as const };
  const [currentStep, setCurrentStep] = useState<Step>(status === 'authenticated' ? 'dashboard' : 'auth');
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhotoMetadata[]>([]);
  const [coupleNames, setCoupleNames] = useState<[string, string]>(['', '']);
  const [reviewedClusters, setReviewedClusters] = useState<PhotoCluster[]>([]);
  const [vibeString, setVibeString] = useState('');
  const [manifest, setManifest] = useState<StoryManifest | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastVibeData, setLastVibeData] = useState<{
    names: [string, string]; vibeString: string; occasion: string;
    subdomain?: string; eventDate?: string; ceremonyVenue?: string;
    ceremonyAddress?: string; ceremonyTime?: string; receptionVenue?: string;
    receptionAddress?: string; receptionTime?: string; dresscode?: string;
    officiant?: string; celebrationVenue?: string; celebrationTime?: string;
    guestNotes?: string; inspirationUrls?: string[]; layoutFormat?: string;
  } | null>(null);

  // Generation cancel ref — allows the cancel button inside GenerationProgress to abort the fetch
  const generationControllerRef = useRef<AbortController | null>(null);

  // Publish Flow State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // ── Wizard draft persistence ──────────────────────────────────
  const WIZARD_STORAGE_KEY = 'pearloom_wizard_draft';
  const [draftBanner, setDraftBanner] = useState<{ savedAt: number; coupleNames: [string, string]; vibeString: string; step: Step } | null>(null);

  // On mount: check for a recent draft (< 24h) and show the banner
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft?.savedAt && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
        setDraftBanner(draft);
      } else {
        localStorage.removeItem(WIZARD_STORAGE_KEY);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save wizard state whenever we're in an active wizard step
  useEffect(() => {
    if (currentStep === 'vibe' || currentStep === 'photos' || currentStep === 'cluster-review' || currentStep === 'local-upload') {
      try {
        localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
          savedAt: Date.now(),
          coupleNames,
          vibeString,
          step: currentStep,
        }));
      } catch {}
    }
  }, [coupleNames, vibeString, currentStep]);

  // Redirect to dashboard once auth is confirmed — must be in useEffect,
  // NOT inline during render, to avoid React's infinite update loop
  useEffect(() => {
    if (status === 'authenticated' && currentStep === 'auth') {
      setCurrentStep('dashboard');
    }
  }, [status, currentStep]);

  const handleSignIn = () => {
    signIn('google');
  };

  const handlePhotosSelected = useCallback((photos: GooglePhotoMetadata[]) => {
    setSelectedPhotos(photos);
  }, []);

  const handleVibeSubmit = useCallback(async (data: {
    names: [string, string];
    vibeString: string;
    occasion: string;
    subdomain?: string;
    eventDate?: string;
    ceremonyVenue?: string;
    ceremonyAddress?: string;
    ceremonyTime?: string;
    receptionVenue?: string;
    receptionAddress?: string;
    receptionTime?: string;
    dresscode?: string;
    officiant?: string;
    celebrationVenue?: string;
    celebrationTime?: string;
    guestNotes?: string;
    inspirationUrls?: string[];
    layoutFormat?: string;
  }) => {
    setCoupleNames(data.names);
    setVibeString(data.vibeString);
    setLastVibeData(data);
    setCurrentStep('generating');
    setGenerationStep(0);
    setError(null);

    // Simulate progress steps — ticks every 14s but caps at step 6 (85% mark).
    // On actual completion we jump to the final step; on error we stop the interval.
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => {
        // Never auto-advance past index 6 — the final step is set on completion
        if (prev >= 6) return prev;
        return prev + 1;
      });
    }, 14000);

    // 270s client timeout — stays under maxDuration=300 on the server
    const controller = new AbortController();
    generationControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 270_000);

    try {
      log('[Generate] Starting generation for:', data.names, '| photos:', selectedPhotos.length);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: selectedPhotos,
          clusters: reviewedClusters.length > 0 ? reviewedClusters : undefined,
          vibeString: data.vibeString,
          names: data.names,
          occasion: data.occasion,
          eventDate: data.eventDate,
          ceremonyVenue: data.ceremonyVenue,
          ceremonyAddress: data.ceremonyAddress,
          ceremonyTime: data.ceremonyTime,
          receptionVenue: data.receptionVenue,
          receptionAddress: data.receptionAddress,
          receptionTime: data.receptionTime,
          dresscode: data.dresscode,
          officiant: data.officiant,
          celebrationVenue: data.celebrationVenue,
          celebrationTime: data.celebrationTime,
          guestNotes: data.guestNotes,
          inspirationUrls: data.inspirationUrls || [],
        }),
        signal: controller.signal,
      });

      clearInterval(stepInterval);
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        logError('[Generate] API error:', res.status, errData);
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const result = await res.json();
      log('[Generate] Raw API result keys:', Object.keys(result));
      if (!result.manifest) {
        logError('[Generate] No manifest in response:', result);
        throw new Error('AI returned an empty manifest. Please try again.');
      }
      log('[Generate] Manifest received ✓ chapters:', result.manifest.chapters?.length);

      // Jump to final step immediately on success
      setGenerationStep(7);

      // Stamp the occasion and layout format onto the manifest so the editor can use it
      result.manifest.occasion = data.occasion || 'wedding';
      if (data.layoutFormat) result.manifest.layoutFormat = data.layoutFormat;
      setManifest(result.manifest);

      // Use slug from wizard if provided, otherwise auto-generate from names
      const autoSlug = data.subdomain || generateSlug(data.names);
      log('[Generate] Subdomain:', autoSlug, data.subdomain ? '(user-chosen)' : '(auto-generated)');
      setSubdomain(autoSlug);

      // Clear wizard draft and editor autosave so stale banners don't appear
      try {
        localStorage.removeItem(WIZARD_STORAGE_KEY);
        localStorage.removeItem('pearloom_draft_manifest');
      } catch {}
      setDraftBanner(null);

      setCurrentStep('edit');
    } catch (err) {
      clearInterval(stepInterval);
      clearTimeout(timeoutId);
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? 'Generation timed out. Please try again — if it keeps happening, try with fewer photos.' : err.message)
        : 'Generation failed. Please try again.';
      logError('[Generate] Caught error:', msg);
      setError(msg);
      setCurrentStep('vibe');
    }
  }, [selectedPhotos]);

  const handleManifestChange = useCallback((updated: StoryManifest) => {
    setManifest(updated);
  }, []);

  const handlePublish = async () => {
    const targetSubdomain = subdomain.trim();
    log('[Publish] Attempting:', { targetSubdomain, hasManifest: !!manifest, names: coupleNames });
    if (!targetSubdomain) return setPublishError('Please enter a subdomain.');
    if (!manifest) return setPublishError('No manifest to publish. Please generate a site first.');
    setPublishError(null);
    setIsPublishing(true);

    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: targetSubdomain, manifest, names: coupleNames }),
      });

      const data = await res.json();
      log('[Publish] API response:', data);
      if (!res.ok) throw new Error(data.error || 'Failed to publish');

      log('[Publish] ✓ Published! URL:', data.url);
      setPublishedUrl(data.url);
      // Open the live site in a new tab so the user lands on their actual URL
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      logError('[Publish] Error:', err);
      setPublishError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPublishing(false);
    }
  };

  const meta = STEP_META[currentStep];

  // -- Full-screen editor takes over the entire viewport --
  if (currentStep === 'edit' && manifest) {
    // Clear any wizard draft so the "Unsaved draft recovered" banner never
    // appears while editing an already-loaded/published site.
    try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {}
    return (
      <FullscreenEditor
        manifest={manifest}
        coupleNames={coupleNames}
        subdomain={subdomain}
        onChange={setManifest}
        onPublish={() => { /* Editor shows its own "It's Live" success UI; user navigates via onExit */ }}
        onExit={() => setCurrentStep('dashboard')}
      />
    );
  }

  return (
    <ThemeProvider theme={{
      name: 'pearloom-ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
      borderRadius: '1rem',
    }}>
      {status !== 'unauthenticated' && (
        <SiteNav
          names={['Pearloom', 'Studio']}
          pages={[]}
          user={session?.user || undefined}
          onGoToDashboard={session ? () => setCurrentStep('dashboard') : undefined}
          onStartNew={session ? () => setCurrentStep('photos') : undefined}
        />
      )}
      
      {/* Only unmount to landing on CONFIRMED unauthenticated.
          Never on 'loading' -- session revalidation mid-generation would
          destroy the component tree and cause React to crash with 'n is not a function'. */}
      {status === 'unauthenticated' ? (
        <LandingPage handleSignIn={handleSignIn} status={status} />
      ) : (
      <main style={{
        minHeight: '100dvh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: '#F5F1E8',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '500px',
          background: 'linear-gradient(180deg, rgba(163,177,138,0.08) 0%, rgba(245,241,232,0) 100%)',
          pointerEvents: 'none', zIndex: 0
        }} />
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
          {/* Step progress */}
          {currentStep !== 'auth' && currentStep !== 'dashboard' && currentStep !== 'generating' && (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              marginBottom: '4rem', background: '#ffffff', padding: '1rem 2rem', 
              borderRadius: '100px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.03)', maxWidth: '800px', margin: '0 auto 4rem'
            }}>
              {([
                { id: 'photos', label: 'Select Memories' },
                { id: 'vibe', label: 'Capture Vibe' },
                { id: 'edit', label: 'Editor' },
              ] as const).map((stepDef, i) => {
                const stepOrder = ['photos', 'vibe', 'edit'] as const;
                const normalizedCurrentStep = currentStep === 'local-upload' ? 'photos' : currentStep as typeof stepOrder[number];
                const currentIndex = stepOrder.indexOf(normalizedCurrentStep);
                const stepIndex = stepOrder.indexOf(stepDef.id);
                const isActive = stepIndex === currentIndex;
                const isDone = stepIndex < currentIndex;

                return (
                  <div key={stepDef.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: isDone ? 'pointer' : 'default' }}
                         onClick={() => isDone && setCurrentStep(stepDef.id)}
                    >
                      <div
                        style={{
                          width: '2.75rem', height: '2.75rem', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                          background: isActive ? 'var(--eg-accent)' : isDone ? 'var(--eg-accent-light)' : '#f5f5f5',
                          color: isActive ? '#fff' : isDone ? 'var(--eg-accent)' : 'var(--eg-muted)',
                          boxShadow: isActive ? '0 8px 20px rgba(163,177,138,0.35)' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)'
                        }}
                      >
                        {isDone ? <Check size={16} strokeWidth={3} /> : i + 1}
                      </div>
                      <span className="hidden md:block" style={{
                        fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.02em',
                        color: isActive ? 'var(--eg-fg)' : 'var(--eg-muted)',
                        opacity: isActive || isDone ? 1 : 0.6,
                        transition: 'all 0.3s ease'
                      }}>
                        {stepDef.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div style={{ 
                        flex: 1, height: '2px', margin: '0 1rem',
                        background: isDone ? 'var(--eg-accent-light)' : '#f0f0f0', 
                        borderRadius: '2px', transition: 'background 0.3s ease' 
                      }} className="hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step wrapper removed for unified SaaS UI */}
          <div style={{
            minHeight: '600px',
            position: 'relative',
            paddingTop: '1rem'
          }}>
            {/* Step header -- hidden during generating & dashboard */}
            {currentStep !== 'dashboard' && currentStep !== 'generating' && (
              <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h2 style={{
                  fontFamily: 'var(--eg-font-heading)',
                  fontSize: '2.5rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.75rem',
                  color: 'var(--eg-fg)',
                }}>
                  {meta.title}
                </h2>
                <p style={{ color: 'var(--eg-muted)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
                  {meta.subtitle}
                </p>
              </div>
            )}

            {/* Error display -- polished card */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginBottom: '2rem',
                  padding: '1.5rem 2rem',
                  borderRadius: '1rem',
                  background: '#fff',
                  border: '1px solid #fecaca',
                  boxShadow: '0 8px 30px rgba(239,68,68,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', gap: '1.25rem', width: '100%' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: '#fef2f2', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}>⚠</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Generation failed</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>{error}</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.5, fontStyle: 'italic' }}>
                      This sometimes happens when our AI is busy. It usually works on the second try.
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {lastVibeData && (
                        <button
                          onClick={() => { setError(null); handleVibeSubmit(lastVibeData); }}
                          style={{
                            padding: '0.5rem 1.25rem', borderRadius: '100px',
                            background: 'var(--eg-accent)', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: '0.82rem', fontWeight: 700,
                            letterSpacing: '0.04em',
                            fontFamily: 'var(--eg-font-body)',
                          }}
                        >
                          Try Again
                        </button>
                      )}
                      <button
                        onClick={() => { setError(null); setCurrentStep('photos'); }}
                        style={{
                          padding: '0.5rem 1.25rem', borderRadius: '100px',
                          background: 'transparent', color: '#6b7280',
                          border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: 600,
                          letterSpacing: '0.04em',
                          fontFamily: 'var(--eg-font-body)',
                        }}
                      >
                        Start Over
                      </button>
                      <button
                        onClick={() => setError(null)}
                        style={{
                          padding: '0.5rem 1rem', borderRadius: '100px',
                          background: 'transparent', color: '#9ca3af',
                          border: 'none', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: 500,
                          fontFamily: 'var(--eg-font-body)',
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
              {/* -- DASHBOARD -- */}
              {currentStep === 'dashboard' && (
                <>
                  {/* Draft resume banner */}
                  {draftBanner && (
                    <div style={{
                      background: '#FFFBF0',
                      border: '1px solid #D4A847',
                      borderRadius: '0.75rem',
                      padding: '0.85rem 1.25rem',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: '0.88rem', color: '#5C4A1A', lineHeight: 1.4 }}>
                        You have an unfinished site
                      </span>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setCoupleNames(draftBanner.coupleNames);
                            setVibeString(draftBanner.vibeString);
                            setCurrentStep(draftBanner.step || 'vibe');
                            setDraftBanner(null);
                          }}
                          style={{
                            fontSize: '0.85rem', fontWeight: 600, color: '#6B7B3A',
                            background: 'none', border: 'none', cursor: 'pointer',
                            textDecoration: 'underline', textUnderlineOffset: '2px', padding: 0,
                          }}
                        >
                          Continue where you left off
                        </button>
                        <span style={{ color: '#C4A050', fontSize: '0.8rem' }}>or</span>
                        <button
                          onClick={() => {
                            try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch {}
                            setDraftBanner(null);
                            setCurrentStep('photos');
                          }}
                          style={{
                            fontSize: '0.85rem', color: '#9A9488', background: 'none',
                            border: 'none', cursor: 'pointer', padding: 0,
                          }}
                        >
                          Start fresh
                        </button>
                      </div>
                    </div>
                  )}
                  <UserSites
                    onStartNew={() => setCurrentStep('photos')}
                    onEditSite={(site) => {
                      setManifest(site.manifest);
                      setSubdomain(site.domain);
                      setCoupleNames(site.names || ['', '']);
                      setCurrentStep('edit');
                    }}
                    onManageGuests={(site) => {
                      setSubdomain(site.domain);
                      setCurrentStep('guests');
                    }}
                  />
                </>
              )}

              {/* -- PHOTOS -- */}
              {currentStep === 'photos' && (
                <PhotosStep
                  selectedPhotos={selectedPhotos}
                  onPhotosSelected={handlePhotosSelected}
                  onContinue={() => setCurrentStep('cluster-review')}
                  onLocalUpload={() => setCurrentStep('local-upload')}
                />
              )}
              {/* CLUSTER REVIEW */}

              {currentStep === 'cluster-review' && (

                <ClusterReview

                  photos={selectedPhotos}

                  onConfirm={(clusters) => {

                    setReviewedClusters(clusters);

                    setCurrentStep('vibe');

                  }}

                  onBack={() => setCurrentStep('photos')}

                />

              )}

              {/* -- LOCAL UPLOAD -- */}
              {currentStep === 'local-upload' && (
                <div style={{ paddingBottom: '2rem' }}>
                  <button
                    onClick={() => setCurrentStep('photos')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem', 
                      fontSize: '0.9rem', color: 'var(--eg-muted)', 
                      marginBottom: '2rem', background: 'none', border: 'none', 
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back to Google Photos
                  </button>
                  <LocalUploader
                    onUploadComplete={(photos) => {
                      setSelectedPhotos(photos);
                      setCurrentStep('cluster-review');
                    }}
                  />
                </div>
              )}
              {/* -- VIBE -- */}
              {currentStep === 'vibe' && (
                <div style={{ paddingBottom: '2rem' }}>
                  <button
                    onClick={() => {
                      const hasData = coupleNames[0] || coupleNames[1] || vibeString;
                      if (hasData && !confirm('You\'ll lose your progress. Go back anyway?')) return;
                      setCurrentStep('photos');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      fontSize: '0.9rem', color: 'var(--eg-muted)',
                      marginBottom: '2rem', background: 'none', border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back to photos
                  </button>
                  <VibeInput
                    onSubmit={handleVibeSubmit}
                    initialNames={coupleNames[0] ? coupleNames : undefined}
                    initialVibe={vibeString || undefined}
                  />
                </div>
              )}

              {/* -- GENERATING -- */}
              {currentStep === 'generating' && (
                <GenerationProgress
                  step={generationStep}
                  photos={selectedPhotos}
                  names={lastVibeData?.names ?? coupleNames}
                  vibeString={lastVibeData?.vibeString ?? vibeString}
                  occasion={lastVibeData?.occasion ?? 'wedding'}
                  onCancel={() => {
                    generationControllerRef.current?.abort();
                    generationControllerRef.current = null;
                    setCurrentStep('vibe');
                    setError(null);
                  }}
                />
              )}

              {/* -- EDIT \u2014 handled by FullscreenEditor (early return above) -- */}

              {/* -- GUESTS -- */}
              {currentStep === 'guests' && subdomain && (
                <div>
                  <button
                    onClick={() => setCurrentStep('dashboard')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      fontSize: '0.9rem', color: 'var(--eg-muted)',
                      marginBottom: '2rem', background: 'none', border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back to My Sites
                  </button>
                  <GuestManager siteId={subdomain} />
                </div>
              )}

              {/* -- PREVIEW -- */}
              {currentStep === 'preview' && manifest && (
                <div>
                  <button
                    onClick={() => setCurrentStep('edit')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem', 
                      fontSize: '0.9rem', color: 'var(--eg-muted)', 
                      marginBottom: '1.5rem', background: 'none', border: 'none', 
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back to editor
                  </button>
                  <div style={{
                    borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.1)',
                    overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    background: '#fff'
                  }}>
                    <div style={{
                      padding: '0.75rem', background: 'rgba(0,0,0,0.02)',
                      borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex',
                      alignItems: 'center', gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#facc15' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4ade80' }} />
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: 'var(--eg-muted)' }}>
                        pearloom.app/{subdomain || `${coupleNames[0].toLowerCase()}-and-${coupleNames[1].toLowerCase()}`}
                      </div>
                    </div>
                    <iframe
                      src={(() => {
                        const key = `preview-${Date.now()}`;
                        if (typeof window !== 'undefined') sessionStorage.setItem(key, JSON.stringify({ manifest, names: coupleNames }));
                        return `/preview?key=${key}`;
                      })()}
                      style={{ width: '100%', height: '600px', border: 'none' }}
                      title="Site Preview"
                    />
                  </div>

                  {/* -- PUBLISH BUTTON (from preview) -- */}
                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setPublishError(null);
                        setPublishedUrl(null);
                        setShowPublishModal(true);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '1rem 3rem', borderRadius: '2rem',
                        background: 'var(--eg-accent)', color: '#fff', fontSize: '1.1rem',
                        fontWeight: 500, cursor: 'pointer', border: 'none',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Globe size={20} />
                      Publish Site
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        {/* -- GLOBAL PUBLISH MODAL -- Works from both edit and preview steps */}
        {showPublishModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(250, 249, 246, 0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: '2rem'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              style={{
                background: '#fff', padding: '3rem', borderRadius: '1.5rem',
                maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                textAlign: 'center'
              }}
            >
              {publishedUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--eg-accent, #A3B18A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Check size={32} />
                  </div>
                  <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginTop: '0.5rem' }}>It&apos;s Live.</h2>
                  <p style={{ color: 'var(--eg-muted)' }}>Your love story is now live at:</p>
                  <code style={{ background: 'rgba(0,0,0,0.04)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {publishedUrl}
                  </code>
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block', padding: '1rem 2rem', background: 'var(--eg-fg)',
                      color: '#fff', borderRadius: '2rem', textDecoration: 'none', marginTop: '0.5rem', fontWeight: 500
                    }}
                  >
                    Open Your Site →
                  </a>
                  <a
                    href={`/rsvps?domain=${subdomain}`}
                    style={{
                      display: 'inline-block', padding: '1rem 2rem', background: 'transparent',
                      border: '2px solid var(--eg-fg)', color: 'var(--eg-fg)', borderRadius: '2rem',
                      textDecoration: 'none', fontWeight: 500
                    }}
                  >
                    Manage RSVPs
                  </a>
                  <button
                    onClick={() => { setShowPublishModal(false); setCurrentStep('dashboard'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--eg-muted)', marginTop: '0.5rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>Choose your URL</h2>
                  <p style={{ color: 'var(--eg-muted)', marginBottom: '0.4rem' }}>
                    We&apos;ve pre-filled a unique URL -- customize it below.
                  </p>
                  <p style={{ color: 'var(--eg-muted)', fontSize: '0.8rem', marginBottom: '2rem', opacity: 0.7 }}>
                    You can upgrade to a full custom domain later.
                  </p>

                  {publishError && (
                    <div style={{ color: '#ef4444', background: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                      {publishError}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', border: '2px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                    <input
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="ben-and-shauna"
                      style={{ flex: 1, padding: '1rem', fontSize: '1rem', border: 'none', outline: 'none' }}
                      disabled={isPublishing}
                      autoFocus
                      onFocus={(e) => { (e.target.parentElement as HTMLElement).style.borderColor = 'var(--eg-accent)'; }}
                      onBlur={(e) => { (e.target.parentElement as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)'; }}
                    />
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', color: 'var(--eg-muted)', fontWeight: 500, borderLeft: '1px solid rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
                      .pearloom.app
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button
                      onClick={() => setShowPublishModal(false)}
                      style={{ flex: 1, padding: '1rem', background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', color: 'var(--eg-fg)', cursor: 'pointer' }}
                      disabled={isPublishing}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePublish}
                      style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--eg-fg)', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 }}
                      disabled={isPublishing || !subdomain}
                    >
                      {isPublishing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Globe size={16} /> Publish Site</>}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </main>
      )}
    </ThemeProvider>
  );
}

