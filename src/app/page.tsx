'use client';

// ─────────────────────────────────────────────────────────────
// everglow / app/dashboard/page.tsx
// Full wizard flow: Sign In → Dashboard → Select Photos → Set Vibe → Generate → Edit → Preview
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Eye, Pencil, LogIn, ArrowLeft, ArrowRight, Loader2, Check, Globe, LayoutDashboard } from 'lucide-react';
import { PhotoBrowser } from '@/components/dashboard/photo-browser';
import { LocalUploader } from '@/components/dashboard/local-uploader';
import { VibeInput } from '@/components/dashboard/vibe-input';
import { SiteEditor } from '@/components/dashboard/site-editor';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { LandingPage } from '@/components/landing-page';
import { GenerationProgress } from '@/components/dashboard/generation-progress';
import { UserSites } from '@/components/dashboard/user-sites';
import type { GooglePhotoMetadata, StoryManifest } from '@/types';

type Step = 'auth' | 'dashboard' | 'photos' | 'local-upload' | 'vibe' | 'generating' | 'edit' | 'preview';

const STEP_META: Record<Step, { title: string; subtitle: string; icon: React.ElementType }> = {
  auth: { title: 'Welcome to Pearloom', subtitle: 'Connect Google Photos or upload locally.', icon: LogIn },
  dashboard: { title: '', subtitle: '', icon: LayoutDashboard }, // Dashboard renders its own headers
  photos: { title: 'Select Your Memories', subtitle: 'Choose the photos that tell your story.', icon: Camera },
  'local-upload': { title: 'Upload Photos', subtitle: 'Directly upload your favorite high-quality images.', icon: Camera },
  vibe: { title: 'Set Your Vibe', subtitle: 'Describe the feeling — the AI will do the rest.', icon: Sparkles },
  generating: { title: 'Creating Magic', subtitle: 'The memory engine is crafting your story...', icon: Sparkles },
  edit: { title: 'Your Story', subtitle: 'Review and edit. Make it perfect.', icon: Pencil },
  preview: { title: 'Preview', subtitle: 'See your site live before publishing.', icon: Eye },
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>(status === 'authenticated' ? 'dashboard' : 'auth');
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhotoMetadata[]>([]);
  const [coupleNames, setCoupleNames] = useState<[string, string]>(['', '']);
  const [vibeString, setVibeString] = useState('');
  const [manifest, setManifest] = useState<StoryManifest | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Publish Flow State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // When session status changes
  if (status === 'authenticated' && currentStep === 'auth') {
    setCurrentStep('dashboard');
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

  const handlePublish = async () => {
    if (!subdomain) return setPublishError('Please enter a subdomain.');
    setPublishError(null);
    setIsPublishing(true);

    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, manifest, names: coupleNames }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');

      setPublishedUrl(data.url);
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPublishing(false);
    }
  };

  const meta = STEP_META[currentStep];

  return (
    <ThemeProvider theme={{
      name: 'pearloom-ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#faf9f6', foreground: '#1a1a1a', accent: '#b8926a', accentLight: '#f3e8d8', muted: '#8c8c8c', cardBg: '#ffffff' },
      borderRadius: '1rem',
    }}>
      <SiteNav
        names={['Pearloom', 'Studio']}
        pages={[]}
        user={session?.user || undefined}
        onGoToDashboard={session ? () => setCurrentStep('dashboard') : undefined}
        onStartNew={session ? () => setCurrentStep('photos') : undefined}
      />
      
      {status === 'unauthenticated' || (status === 'loading' && !session) ? (
        <LandingPage handleSignIn={handleSignIn} status={status} />
      ) : (
      <main style={{
        minHeight: '100vh',
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: '#faf9f6',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '500px',
          background: 'linear-gradient(180deg, rgba(184,146,106,0.08) 0%, rgba(250,249,246,0) 100%)',
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
                { id: 'preview', label: 'Preview Site' }
              ] as const).map((stepDef, i) => {
                const stepOrder = ['photos', 'vibe', 'edit', 'preview'] as const;
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
                          boxShadow: isActive ? '0 8px 20px rgba(184,146,106,0.35)' : 'none',
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
                    {i < 3 && (
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
            {/* Step header */}
            {currentStep !== 'dashboard' && (
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
              {/* ── DASHBOARD ── */}
              {currentStep === 'dashboard' && (
                <UserSites 
                  onStartNew={() => setCurrentStep('photos')}
                  onEditSite={(site) => {
                    setManifest(site.manifest);
                    setSubdomain(site.domain);
                    setCoupleNames(site.names || ['', '']);
                    setCurrentStep('edit');
                  }}
                />
              )}

              {/* ── PHOTOS ── */}
              {currentStep === 'photos' && (
                <div>
                  <PhotoBrowser
                    onSelectionChange={handlePhotosSelected}
                    maxSelection={30}
                  />
                  
                  <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                    <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      Google Photos refusing to sync?
                    </p>
                    <button
                      onClick={() => setCurrentStep('local-upload')}
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
              {/* ── LOCAL UPLOAD ── */}
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
                      setCurrentStep('vibe');
                    }}
                  />
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
                <SiteEditor
                  manifest={manifest}
                  onChange={handleManifestChange}
                  onPreview={() => {
                    // Store via sessionStorage to avoid URL length limits (#3)
                    const key = `preview-${Date.now()}`;
                    sessionStorage.setItem(key, JSON.stringify({ manifest, names: coupleNames }));
                    window.open(`/preview?key=${key}`, '_blank');
                  }}
                  onSave={() => {
                    // Auto-save: re-publish to Supabase with updated manifest
                    if (subdomain) handlePublish();
                  }}
                />
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
                      src={(() => {
                        const key = `preview-${Date.now()}`;
                        if (typeof window !== 'undefined') sessionStorage.setItem(key, JSON.stringify({ manifest, names: coupleNames }));
                        return `/preview?key=${key}`;
                      })()}
                      style={{ width: '100%', height: '600px', border: 'none' }}
                      title="Site Preview"
                    />
                  </div>

                  {/* ── PUBLISH BUTTON ── */}
                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setSubdomain(`${coupleNames[0].toLowerCase()}-and-${coupleNames[1].toLowerCase()}`);
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

                  {/* ── PUBLISH MODAL ── */}
                  {showPublishModal && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(250, 249, 246, 0.9)', backdropFilter: 'blur(10px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 100, padding: '2rem'
                    }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        style={{
                          background: '#fff', padding: '3rem', borderRadius: '1.5rem',
                          maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                          textAlign: 'center'
                        }}
                      >
                        {publishedUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <Check size={32} />
                            </div>
                            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginTop: '1rem' }}>It's Live.</h2>
                            <p style={{ color: 'var(--eg-muted)' }}>Your magnificent love story is now available to the world.</p>
                            <a 
                              href={publishedUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ 
                                display: 'inline-block', padding: '1rem 2rem', background: 'var(--eg-fg)', 
                                color: '#fff', borderRadius: '2rem', textDecoration: 'none', marginTop: '1rem', fontWeight: 500
                              }}
                            >
                              Visit Your Standard Subdomain URL
                            </a>
                            <a 
                              href={`/rsvps?domain=${subdomain}`}
                              style={{ 
                                display: 'inline-block', padding: '1rem 2rem', background: 'transparent',
                                border: '2px solid var(--eg-fg)', color: 'var(--eg-fg)', borderRadius: '2rem',
                                textDecoration: 'none', marginTop: '0.5rem', fontWeight: 500
                              }}
                            >
                              Manage RSVPs
                            </a>
                            <button onClick={() => setShowPublishModal(false)} style={{ background: 'none', border: 'none', color: 'var(--eg-muted)', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline' }}>
                              Close
                            </button>
                          </div>
                        ) : (
                          <>
                            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>Choose your URL</h2>
                            <p style={{ color: 'var(--eg-muted)', marginBottom: '2rem' }}>
                              Claim your custom Pearloom subdomain. You can upgrade to a full custom domain later.
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
                              />
                              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', color: 'var(--eg-muted)', fontWeight: 500, borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
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
                                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--eg-fg)', color: '#fff', border: 'none', borderRadius: '0.75rem', cursor: 'pointer' }}
                                disabled={isPublishing || !subdomain}
                              >
                                {isPublishing ? <Loader2 size={18} className="animate-spin" /> : 'Claim Subdomain'}
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </div>
                  )}
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
