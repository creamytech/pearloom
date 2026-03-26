'use client';

// ─────────────────────────────────────────────────────────────
// everglow / app/dashboard/page.tsx
// Full wizard flow: Sign In → Select Photos → Set Vibe → Generate → Edit → Preview
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Eye, Pencil, LogIn, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { SiteEditor } from '@/components/dashboard/site-editor';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
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
      
      <main style={{
        minHeight: '100vh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(180deg, #f5ead6 0%, #faf9f6 35%, #faf9f6 100%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Step progress */}
          {currentStep !== 'auth' && currentStep !== 'generating' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
              {(['photos', 'vibe', 'edit', 'preview'] as Step[]).map((step, i) => {
                const stepOrder = ['photos', 'vibe', 'edit', 'preview'] as Step[];
                const currentIndex = stepOrder.indexOf(currentStep);
                const isActive = stepOrder.indexOf(step) === currentIndex;
                const isDone = stepOrder.indexOf(step) < currentIndex;

                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {i > 0 && <div style={{ width: '2rem', height: '1px', background: 'rgba(0,0,0,0.1)' }} />}
                    <div
                      style={{
                        width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.3s',
                        background: isActive ? 'var(--eg-accent)' : isDone ? 'var(--eg-accent-light)' : 'rgba(0,0,0,0.05)',
                        color: isActive ? '#fff' : isDone ? 'var(--eg-accent)' : 'var(--eg-muted)',
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{
            background: 'var(--eg-card-bg)',
            borderRadius: '1.5rem',
            padding: '4rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.02)',
            minHeight: '600px',
            position: 'relative'
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
              {/* ── AUTH ── */}
              {currentStep === 'auth' && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4rem 0', gap: '1.5rem', textAlign: 'center'
                }}>
                  <div style={{
                    width: '5rem', height: '5rem', borderRadius: '50%',
                    background: 'var(--eg-accent-light)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <LogIn size={32} color="var(--eg-accent)" />
                  </div>
                  <p style={{ color: 'var(--eg-muted)', maxWidth: '400px', lineHeight: 1.6 }}>
                    Sign in with your Google account to access your photos
                    and let the memory engine craft your love story.
                  </p>
                  <button
                    onClick={handleSignIn}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '1rem 2rem', borderRadius: '0.75rem',
                      background: 'var(--eg-fg)', color: '#fff', fontSize: '0.9rem',
                      fontWeight: 500, cursor: 'pointer', border: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                  </button>
                  {status === 'loading' && (
                    <Loader2 size={20} color="var(--eg-muted)" style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                </div>
              )}

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
    </ThemeProvider>
  );
}
