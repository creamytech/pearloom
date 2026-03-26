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
    <div>
      {/* Step progress */}
      {currentStep !== 'auth' && currentStep !== 'generating' && (
        <div className="flex items-center gap-2 mb-8">
          {(['photos', 'vibe', 'edit', 'preview'] as Step[]).map((step, i) => {
            const stepOrder = ['photos', 'vibe', 'edit', 'preview'] as Step[];
            const currentIndex = stepOrder.indexOf(currentStep);
            const isActive = stepOrder.indexOf(step) === currentIndex;
            const isDone = stepOrder.indexOf(step) < currentIndex;

            return (
              <div key={step} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-black/10" />}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all
                    ${isActive ? 'bg-[var(--eg-accent)] text-white' : ''}
                    ${isDone ? 'bg-[var(--eg-accent-light)] text-[var(--eg-accent)]' : ''}
                    ${!isActive && !isDone ? 'bg-black/5 text-[var(--eg-muted)]' : ''}
                  `}
                >
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step header */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{
          fontFamily: 'var(--eg-font-heading)',
          fontSize: '2.5rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          marginBottom: '0.5rem',
        }}>
          {meta.title}
        </h2>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem' }}>
          {meta.subtitle}
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* ── AUTH ── */}
          {currentStep === 'auth' && (
            <div className="flex flex-col items-center py-16 gap-6">
              <div className="w-20 h-20 rounded-full bg-[var(--eg-accent-light)] flex items-center justify-center">
                <LogIn size={32} className="text-[var(--eg-accent)]" />
              </div>
              <p className="text-[var(--eg-muted)] text-center max-w-md">
                Sign in with your Google account to access your photos
                and let the memory engine craft your love story.
              </p>
              <button
                onClick={handleSignIn}
                className="flex items-center gap-3 px-8 py-3.5 rounded-lg bg-[var(--eg-fg)] text-white
                           text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
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
                <Loader2 size={20} className="animate-spin text-[var(--eg-muted)]" />
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
                <div className="sticky bottom-4 mt-8">
                  <button
                    onClick={() => setCurrentStep('vibe')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg
                               bg-[var(--eg-fg)] text-white text-sm font-medium shadow-lg
                               hover:opacity-90 transition-all cursor-pointer"
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
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setCurrentStep('preview')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg
                             bg-[var(--eg-fg)] text-white text-sm font-medium
                             hover:opacity-90 transition-all cursor-pointer"
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
                className="flex items-center gap-2 text-sm text-[var(--eg-muted)] mb-6
                           hover:text-[var(--eg-fg)] transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to editor
              </button>
              <div className="rounded-xl border border-black/10 overflow-hidden shadow-xl bg-white">
                <div className="p-3 bg-black/[0.02] border-b border-black/5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-[var(--eg-muted)]">
                    pearloom.app/{coupleNames[0]}-and-{coupleNames[1]}
                  </div>
                </div>
                <iframe
                  src={`/preview?data=${encodeURIComponent(JSON.stringify({ manifest, names: coupleNames }))}`}
                  className="w-full h-[600px] border-0"
                  title="Site Preview"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
