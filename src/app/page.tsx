'use client';

// ─────────────────────────────────────────────────────────────
// everglow / app/dashboard/page.tsx
// Full wizard flow: Sign In → Select Photos → Set Vibe → Generate → Edit → Preview
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Eye, Pencil, LogIn, ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { SiteEditor } from '@/components/dashboard/site-editor';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { LandingPage } from '@/components/landing-page';
import { GenerationProgress } from '@/components/dashboard/generation-progress';
import type { GooglePhotoMetadata, StoryManifest } from '@/types';

type Step = 'auth' | 'photos' | 'vibe' | 'generating' | 'edit' | 'preview';

const STEP_META: Record<Step, { title: string; subtitle: string; icon: React.ElementType }> = {
  auth: { title: 'Welcome to Pearloom', subtitle: 'Sign in with Google to connect your photos.', icon: LogIn },
  photos: { title: 'Select Your Memories', subtitle: 'Choose the photos that tell your story.', icon: Camera },
  vibe: { title: 'Set Your Vibe', subtitle: 'Describe the feeling — the AI will do the rest.', icon: Sparkles },
  generating: { title: 'Creating Magic', subtitle: 'The memory engine is crafting your story...', icon: Sparkles },
  edit: { title: 'Your Story', subtitle: 'Review and edit. Make it perfect.', icon: Pencil },
  preview: { title: 'Preview', subtitle: 'See your site live before publishing.', icon: Eye },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>(status === 'authenticated' ? 'photos' : 'auth');
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhotoMetadata[]>([]);
  const [coupleNames, setCoupleNames] = useState<[string, string]>(['', '']);
  const [vibeString, setVibeString] = useState('');
  const [manifest, setManifest] = useState<StoryManifest | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // When session status changes
  if (status === 'authenticated' && currentStep === 'auth') {
    setCurrentStep('photos');
  }

  const handleSignIn = () => {
    signIn('google');
  };

  const handlePhotosSelected = useCallback((photos: GooglePhotoMetadata[]) => {
    setSelectedPhotos(photos);
  }, []);

  const handleVibeSubmit = useCallback(async (data: { names: [string, string]; vibeString: string }) => {
    setCoupleNames(data.names);
    setVibeString(data.vibeString);
    setCurrentStep('generating');
    setError(null);

    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => Math.min(prev + 1, 5));
    }, 2000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: selectedPhotos,
          vibeString: data.vibeString,
          names: data.names,
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Generation failed');
      }

      const result = await res.json();
      setManifest(result.manifest);
      setCurrentStep('edit');
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setCurrentStep('vibe');
    }
  }, [selectedPhotos]);

  const handleManifestChange = useCallback((updated: StoryManifest) => {
    setManifest(updated);
  }, []);

  const meta = STEP_META[currentStep];

  return (
    <ThemeProvider theme={{
      name: 'pearloom-ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#b8926a', accentLight: '#f3e8d8', muted: '#8c8c8c', cardBg: '#ffffff' },
      borderRadius: '1rem',
    }}>
      <SiteNav names={['Pearloom', 'Studio']} pages={[]} user={session?.user || undefined} />
      
      {status === 'unauthenticated' || (status === 'loading' && !session) ? (
        <LandingPage handleSignIn={handleSignIn} status={status} />
      ) : (
      <main style={{
        minHeight: '100vh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: '#faf9f6',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
          {/* Step progress */}
          {currentStep !== 'auth' && currentStep !== 'generating' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '4rem' }}>
              {([
                { id: 'photos', label: 'Select Memories' },
                { id: 'vibe', label: 'Capture Vibe' },
                { id: 'edit', label: 'Editor' },
                { id: 'preview', label: 'Preview Site' }
              ] as const).map((stepDef, i) => {
                const stepOrder = ['photos', 'vibe', 'edit', 'preview'] as const;
                const currentIndex = stepOrder.indexOf(currentStep as any);
                const stepIndex = stepOrder.indexOf(stepDef.id);
                const isActive = stepIndex === currentIndex;
                const isDone = stepIndex < currentIndex;

                return (
                  <div key={stepDef.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {i > 0 && <div style={{ width: '3rem', height: '2px', background: isDone || isActive ? 'var(--eg-accent-light)' : 'rgba(0,0,0,0.05)', borderRadius: '2px' }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: isDone ? 'pointer' : 'default' }}
                         onClick={() => isDone && setCurrentStep(stepDef.id)}
                    >
                      <div
                        style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          background: isActive ? 'var(--eg-accent)' : isDone ? 'var(--eg-accent-light)' : '#ffffff',
                          color: isActive ? '#fff' : isDone ? 'var(--eg-accent)' : 'var(--eg-muted)',
                          border: `2px solid ${isActive || isDone ? 'transparent' : 'rgba(0,0,0,0.08)'}`,
                          boxShadow: isActive ? '0 8px 16px rgba(184,146,106,0.3)' : 'none'
                        }}
                      >
                        {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase',
                        color: isActive ? 'var(--eg-fg)' : 'var(--eg-muted)',
                        opacity: isActive || isDone ? 1 : 0.6
                      }}>
                        {stepDef.label}
                      </span>
                    </div>
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
            {/* Step header */}
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

            {/* Error display */}
            {error && (
              <div style={{
                marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem',
                background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                fontSize: '0.875rem', textAlign: 'center'
              }}>
                {error}
              </div>
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
              {/* ── PHOTOS ── */}
              {currentStep === 'photos' && (
                <div>
                  <PhotoBrowser
                    onSelectionChange={handlePhotosSelected}
                    maxSelection={30}
                  />
                  {selectedPhotos.length > 0 && (
                    <div style={{ position: 'sticky', bottom: '1rem', marginTop: '2rem' }}>
                      <button
                        onClick={() => setCurrentStep('vibe')}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.5rem', padding: '1rem 1.5rem', borderRadius: '0.75rem',
                          background: 'var(--eg-fg)', color: '#fff', fontSize: '0.9rem',
                          fontWeight: 500, cursor: 'pointer', border: 'none',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                        }}
                      >
                        Continue with {selectedPhotos.length} photos
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── VIBE ── */}
              {currentStep === 'vibe' && (
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
                    Back to photos
                  </button>
                  <VibeInput
                    onSubmit={handleVibeSubmit}
                    initialNames={coupleNames[0] ? coupleNames : undefined}
                    initialVibe={vibeString || undefined}
                  />
                </div>
              )}

              {/* ── GENERATING ── */}
              {currentStep === 'generating' && (
                <GenerationProgress step={generationStep} />
              )}

              {/* ── EDIT ── */}
              {currentStep === 'edit' && manifest && (
                <div>
                  <SiteEditor manifest={manifest} onChange={handleManifestChange} />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button
                      onClick={() => setCurrentStep('preview')}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '0.5rem', padding: '1rem', borderRadius: '0.75rem',
                        background: 'var(--eg-fg)', color: '#fff', fontSize: '0.9rem',
                        fontWeight: 500, cursor: 'pointer', border: 'none',
                      }}
                    >
                      <Eye size={16} />
                       Preview your site
                    </button>
                  </div>
                </div>
              )}

              {/* ── PREVIEW ── */}
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
                        pearloom.app/{coupleNames[0].toLowerCase()}-and-{coupleNames[1].toLowerCase()}
                      </div>
                    </div>
                    <iframe
                      src={`/preview?data=${encodeURIComponent(JSON.stringify({ manifest, names: coupleNames }))}`}
                      style={{ width: '100%', height: '600px', border: 'none' }}
                      title="Site Preview"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </main>
      )}
    </ThemeProvider>
  );
}
