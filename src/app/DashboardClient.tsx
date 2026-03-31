'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / DashboardClient.tsx — Wizard composition root
// Orchestrates: Sign In → Dashboard → Photos → Clusters → Vibe → Generate → Edit
// All step UI is in src/components/wizard/*. State is in useWizardState.
// ─────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log.bind(console) : () => {};
const logError = isDev ? console.error.bind(console) : () => {};

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import nextDynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/theme-provider';
import { colors as C, card } from '@/lib/design-tokens';
import { SiteNav } from '@/components/site-nav';
import { LandingPage } from '@/components/landing-page';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWizardState, generateSlug } from '@/lib/wizard-state';
import type { VibeFormData, WizardStep } from '@/lib/wizard-state';
import type { StoryManifest } from '@/types';

// ── Wizard step components ──────────────────────────────────────
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { DashboardStep } from '@/components/wizard/DashboardStep';
import { PhotosStep } from '@/components/wizard/PhotosStep';
import { UploadStep } from '@/components/wizard/UploadStep';
import { ClustersStep } from '@/components/wizard/ClustersStep';
import { VibeStep } from '@/components/wizard/VibeStep';
import { GeneratingStep } from '@/components/wizard/GeneratingStep';
import { GuestsStep } from '@/components/wizard/GuestsStep';
import { PublishModal } from '@/components/shared/PublishModal';

// Full-screen editor — SSR disabled (uses browser APIs + framer Reorder)
const FullscreenEditor = nextDynamic(
  () => import('@/components/editor/FullscreenEditor').then(m => m.FullscreenEditor),
  { ssr: false },
);

const STEP_META: Record<WizardStep, { title: string; subtitle: string }> = {
  dashboard: { title: '', subtitle: '' },
  photos: { title: 'Select Your Memories', subtitle: 'Choose the photos that tell your story.' },
  upload: { title: 'Upload Photos', subtitle: 'Directly upload your favorite high-quality images.' },
  clusters: { title: 'Where Were You?', subtitle: 'Add locations to each memory group for a richer story.' },
  vibe: { title: 'Set Your Vibe', subtitle: 'Describe the feeling — the AI will do the rest.' },
  generating: { title: '', subtitle: '' },
  edit: { title: '', subtitle: '' },
  guests: { title: 'Guest List', subtitle: 'Track RSVPs and manage your guests.' },
};

export default function DashboardClient() {
  const sessionResult = useSession();
  const { data: session, status } = sessionResult ?? { data: null, status: 'loading' as const };
  const { state, dispatch, getDraft, clearDraft } = useWizardState();
  const generationControllerRef = useRef<AbortController | null>(null);
  const [lastVibeData, setLastVibeData] = useState<VibeFormData | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // ── Auth redirect ───────────────────────────────────────────
  useEffect(() => {
    if (status === 'authenticated' && state.step === 'dashboard') {
      // Already on dashboard — no-op
    }
  }, [status, state.step]);

  // ── Generation handler ──────────────────────────────────────
  const handleVibeSubmit = useCallback(async (data: VibeFormData) => {
    dispatch({ type: 'SET_VIBE', data });
    setLastVibeData(data);

    let stepCount = 0;
    const stepInterval = setInterval(() => {
      stepCount++;
      dispatch({ type: 'SET_GENERATION_STEP', step: Math.min(stepCount, 7) });
    }, 14000);

    const controller = new AbortController();
    generationControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 270_000);

    try {
      log('[Generate] Starting for:', data.names, '| photos:', state.photos.length);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: state.photos,
          clusters: state.clusters.length > 0 ? state.clusters : undefined,
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
          layoutFormat: data.layoutFormat,
          rsvpDeadline: data.rsvpDeadline,
          cashFundUrl: data.cashFundUrl,
          eventVenue: data.eventVenue,
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
      if (!result.manifest) throw new Error('AI returned an empty manifest. Please try again.');
      log('[Generate] Manifest received, chapters:', result.manifest.chapters?.length);

      result.manifest.occasion = data.occasion || 'wedding';
      if (data.layoutFormat) result.manifest.layoutFormat = data.layoutFormat;

      const autoSlug = data.subdomain || generateSlug(data.names);
      dispatch({ type: 'SET_MANIFEST', manifest: result.manifest, subdomain: autoSlug });
      clearDraft();

      // Auto-save draft to database so the user can return to it
      fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: autoSlug,
          manifest: result.manifest,
          names: data.names,
        }),
      }).then(r => {
        if (r.ok) log('[Generate] Draft auto-saved:', autoSlug);
        else r.json().then(d => logError('[Generate] Draft save failed:', d.error)).catch(() => {});
      }).catch(e => logError('[Generate] Draft save network error:', e));
    } catch (err) {
      clearInterval(stepInterval);
      clearTimeout(timeoutId);
      const msg = err instanceof Error
        ? (err.name === 'AbortError'
          ? 'Generation timed out. Please try again — if it keeps happening, try with fewer photos.'
          : err.message)
        : 'Generation failed. Please try again.';
      logError('[Generate] Error:', msg);
      dispatch({ type: 'SET_ERROR', error: msg });
    }
  }, [state.photos, state.clusters, dispatch, clearDraft]);

  // ── Step navigation helpers ─────────────────────────────────
  const goTo = (step: WizardStep) => dispatch({ type: 'NAVIGATE', step });
  const meta = STEP_META[state.step];

  // ── Full-screen editor takes over ───────────────────────────
  if (state.step === 'edit' && state.manifest) {
    try { localStorage.removeItem('pearloom_wizard_draft'); } catch {}
    return (
      <ErrorBoundary>
        <FullscreenEditor
          manifest={state.manifest}
          coupleNames={state.coupleNames}
          subdomain={state.subdomain}
          onChange={(m: StoryManifest) => dispatch({ type: 'SET_MANIFEST', manifest: m, subdomain: state.subdomain })}
          onPublish={() => {}}
          onExit={() => goTo('dashboard')}
        />
      </ErrorBoundary>
    );
  }

  // ── Main wizard render ──────────────────────────────────────
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
          onGoToDashboard={session ? () => goTo('dashboard') : undefined}
          onStartNew={session ? () => goTo('photos') : undefined}
        />
      )}

      {status === 'unauthenticated' ? (
        <LandingPage handleSignIn={() => signIn('google')} status={status} />
      ) : (
        <WizardLayout
          step={state.step}
          title={meta.title}
          subtitle={meta.subtitle}
          onStepClick={(stepId) => goTo(stepId as WizardStep)}
        >
          {/* Error display */}
          {state.error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mb-8 p-5 flex gap-5"
              style={{
                borderRadius: card.radius,
                background: card.bg,
                border: card.border,
                borderLeft: '3px solid #b91c1c',
                boxShadow: card.shadow,
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  color: '#b91c1c',
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <div
                  className="font-bold text-[0.95rem] mb-1"
                  style={{ color: '#b91c1c' }}
                >
                  Generation failed
                </div>
                <div
                  className="text-[0.88rem] leading-relaxed mb-1"
                  style={{ color: 'var(--eg-muted)' }}
                >
                  {state.error}
                </div>
                <div
                  className="text-[0.88rem] leading-relaxed italic"
                  style={{ color: 'var(--eg-muted)' }}
                >
                  This sometimes happens when our AI is busy. It usually works on the second try.
                </div>
                <div className="flex gap-3 mt-4 flex-wrap">
                  {lastVibeData && (
                    <button
                      onClick={() => { dispatch({ type: 'SET_ERROR', error: null }); handleVibeSubmit(lastVibeData); }}
                      className="px-5 py-2 border-none cursor-pointer text-[0.88rem] font-bold tracking-wide"
                      style={{
                        borderRadius: 'var(--eg-radius-sm)',
                        background: 'var(--eg-accent)',
                        color: '#fff',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--eg-accent-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--eg-accent)')}
                    >
                      Try Again
                    </button>
                  )}
                  <button
                    onClick={() => { dispatch({ type: 'SET_ERROR', error: null }); goTo('photos'); }}
                    className="px-5 py-2 bg-transparent cursor-pointer text-[0.88rem] font-semibold tracking-wide"
                    style={{
                      borderRadius: 'var(--eg-radius-sm)',
                      color: 'var(--eg-muted)',
                      border: '1px solid var(--eg-divider)',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--eg-gold)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--eg-divider)')}
                  >
                    Start Over
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_ERROR', error: null })}
                    className="px-4 py-2 bg-transparent border-none cursor-pointer text-[0.88rem] font-medium"
                    style={{
                      borderRadius: 'var(--eg-radius-sm)',
                      color: 'var(--eg-muted)',
                      opacity: 0.7,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step content ── */}
          {state.step === 'dashboard' && (
            <DashboardStep
              draftBanner={getDraft()}
              onResumeDraft={() => {
                const draft = getDraft();
                if (draft) dispatch({ type: 'RESTORE_DRAFT', draft });
              }}
              onDismissDraft={() => { clearDraft(); goTo('photos'); }}
              onStartNew={() => goTo('photos')}
              onEditSite={(site) => dispatch({ type: 'EDIT_SITE', manifest: site.manifest, subdomain: site.domain, names: site.names || ['', ''] })}
              onManageGuests={(site) => { dispatch({ type: 'EDIT_SITE', manifest: site.manifest, subdomain: site.domain, names: site.names || ['', ''] }); dispatch({ type: 'NAVIGATE', step: 'guests' }); }}
            />
          )}

          {state.step === 'photos' && (
            <PhotosStep
              selectedPhotos={state.photos}
              onPhotosSelected={(photos) => dispatch({ type: 'SET_PHOTOS', photos })}
              onContinue={() => goTo('clusters')}
            />
          )}

          {state.step === 'upload' && (
            <UploadStep
              onUploadComplete={(photos) => { dispatch({ type: 'SET_PHOTOS', photos }); goTo('clusters'); }}
              onBack={() => goTo('photos')}
            />
          )}

          {state.step === 'clusters' && (
            <ClustersStep
              photos={state.photos}
              onConfirm={(clusters) => { dispatch({ type: 'SET_CLUSTERS', clusters }); goTo('vibe'); }}
              onBack={() => goTo('photos')}
            />
          )}

          {state.step === 'vibe' && (
            <VibeStep
              coupleNames={state.coupleNames}
              vibeString={state.vibeData?.vibeString || ''}
              onSubmit={handleVibeSubmit}
              onBack={() => goTo('clusters')}
            />
          )}

          {state.step === 'generating' && (
            <GeneratingStep
              step={state.generationStep}
              photos={state.photos}
              names={lastVibeData?.names ?? state.coupleNames}
              vibeString={lastVibeData?.vibeString ?? ''}
              occasion={lastVibeData?.occasion ?? 'wedding'}
              onCancel={() => {
                generationControllerRef.current?.abort();
                generationControllerRef.current = null;
                goTo('vibe');
                dispatch({ type: 'SET_ERROR', error: null });
              }}
            />
          )}

          {state.step === 'guests' && state.subdomain && (
            <GuestsStep
              siteId={state.subdomain}
              onBack={() => goTo('dashboard')}
            />
          )}
        </WizardLayout>
      )}

      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        manifest={state.manifest}
        coupleNames={state.coupleNames}
        initialSubdomain={state.subdomain}
      />
    </ThemeProvider>
  );
}
