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
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus } from 'lucide-react';
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
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { UserNav } from '@/components/dashboard/user-nav';
import { PhotosStep } from '@/components/wizard/PhotosStep';
import { UploadStep } from '@/components/wizard/UploadStep';
import { ClustersStep } from '@/components/wizard/ClustersStep';
import { VibeStep } from '@/components/wizard/VibeStep';
import { GeneratingStep } from '@/components/wizard/GeneratingStep';
import { LivePreview, QuickStartBanner } from '@/components/wizard/LivePreview';
import { createProgressiveSession, type ProgressiveState } from '@/lib/progressive-generation';
import { GuestsStep } from '@/components/wizard/GuestsStep';
import { PublishModal } from '@/components/shared/PublishModal';
import { TemplateGallery } from '@/components/dashboard/TemplateGallery';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { DialogProvider } from '@/components/ui/confirm-dialog';
import { applyTemplate, SITE_TEMPLATES, type SiteTemplate } from '@/lib/templates/wedding-templates';

// Full-screen editor — SSR disabled (uses browser APIs + framer Reorder)
const FullscreenEditor = nextDynamic(
  () => import('@/components/editor/FullscreenEditor').then(m => m.FullscreenEditor),
  { ssr: false },
);

// ── Template Personalize Modal ─────────────────────────────────
const OCCASIONS = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'story', label: 'Other / Story' },
];

function TemplatePersonalizeModal({ template, onConfirm, onClose }: {
  template: SiteTemplate;
  onConfirm: (names: [string, string], occasion: string) => void;
  onClose: () => void;
}) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [occasion, setOccasion] = useState(template.occasions[0] || 'wedding');

  const canSubmit = name1.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[440px] bg-white rounded-[var(--pl-radius-xl)] shadow-[0_24px_80px_rgba(0,0,0,0.15)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[var(--pl-divider)]">
          <p className="text-[0.6rem] font-bold tracking-[0.14em] uppercase text-[var(--pl-olive-deep)] mb-1">
            Using template: {template.name}
          </p>
          <h2 className="font-heading italic text-[1.4rem] text-[var(--pl-ink-soft)] leading-tight">
            Personalize your site
          </h2>
          <p className="text-[0.82rem] text-[var(--pl-muted)] mt-1">
            Tell us who this celebration is for.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Occasion */}
          <div>
            <label className="block text-[0.62rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)] mb-2">
              Occasion
            </label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => setOccasion(o.id)}
                  className="px-4 py-2.5 min-h-[44px] rounded-full border text-[0.78rem] font-semibold transition-all cursor-pointer"
                  style={{
                    background: occasion === o.id ? 'var(--pl-olive)' : 'transparent',
                    color: occasion === o.id ? 'white' : 'var(--pl-muted)',
                    borderColor: occasion === o.id ? 'var(--pl-olive)' : 'var(--pl-divider)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Names */}
          <div className={occasion === 'birthday' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="block text-[0.62rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)] mb-1.5">
                {occasion === 'birthday' ? "Birthday Person's Name"
                  : occasion === 'wedding' ? "Bride's Name"
                  : 'First Name'}
              </label>
              <input
                autoFocus
                value={name1}
                onChange={e => setName1(e.target.value)}
                placeholder={occasion === 'birthday' ? 'Their name'
                  : occasion === 'wedding' ? 'e.g. Alex'
                  : 'First name'}
                className="w-full px-3 py-2.5 rounded-[var(--pl-radius-sm)] border border-[var(--pl-divider)] text-[max(16px,0.88rem)] text-[var(--pl-ink)] bg-white outline-none focus:border-[var(--pl-olive)] transition-colors"
              />
            </div>
            {occasion !== 'birthday' && (
              <div>
                <label className="block text-[0.62rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)] mb-1.5">
                  {occasion === 'wedding' ? "Groom's Name" : 'Second Name'}
                </label>
                <input
                  value={name2}
                  onChange={e => setName2(e.target.value)}
                  placeholder={occasion === 'wedding' ? 'e.g. Jordan' : 'Second name'}
                  className="w-full px-3 py-2.5 rounded-[var(--pl-radius-sm)] border border-[var(--pl-divider)] text-[max(16px,0.88rem)] text-[var(--pl-ink)] bg-white outline-none focus:border-[var(--pl-olive)] transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--pl-divider)] flex justify-between items-center bg-[var(--pl-cream)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[0.82rem] text-[var(--pl-muted)] bg-transparent border-none cursor-pointer hover:text-[var(--pl-ink)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm([name1.trim(), name2.trim()] as [string, string], occasion)}
            disabled={!canSubmit}
            className="px-6 py-2.5 rounded-full text-[0.82rem] font-bold text-white border-none cursor-pointer transition-all"
            style={{
              background: canSubmit ? 'var(--pl-olive)' : 'var(--pl-divider)',
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            Start Building
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const STEP_META: Record<WizardStep, { title: string; subtitle: string }> = {
  dashboard: { title: '', subtitle: '' },
  photos: { title: 'Choose Your Memories', subtitle: 'The moments that matter most become the chapters of your story.' },
  upload: { title: 'Your Photos', subtitle: 'Upload the images that tell your story.' },
  clusters: { title: 'The Places', subtitle: 'Where did these moments happen? Add locations to enrich your narrative.' },
  vibe: { title: 'Your Vision', subtitle: 'Describe the feeling you want — the AI shapes everything around it.' },
  generating: { title: '', subtitle: '' },
  edit: { title: '', subtitle: '' },
  guests: { title: 'Your Guests', subtitle: 'Manage RSVPs and your guest list.' },
};

export default function DashboardClient() {
  const router = useRouter();
  const sessionResult = useSession();
  const { data: session, status } = sessionResult ?? { data: null, status: 'loading' as const };
  const { state, dispatch, getDraft, clearDraft } = useWizardState();
  const generationControllerRef = useRef<AbortController | null>(null);
  const [lastVibeData, setLastVibeData] = useState<VibeFormData | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SiteTemplate | null>(null);
  const [mobileTab, setMobileTab] = useState<'feed' | 'build' | 'aiscout' | 'profile'>('feed');
  const [progressiveSession] = useState(() => createProgressiveSession());
  const [previewState, setPreviewState] = useState<ProgressiveState>(progressiveSession.state);

  // ── URL tracking — keep address bar in sync with current step ──
  useEffect(() => {
    const s = state.step;
    if (s === 'edit' && state.subdomain) {
      window.history.replaceState({}, '', `/editor/${state.subdomain}`);
    } else if (s === 'dashboard') {
      window.history.replaceState({}, '', '/dashboard');
    } else {
      window.history.replaceState({}, '', '/dashboard/new');
    }
  }, [state.step, state.subdomain]);

  // ── Auth redirect ───────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  // ── Auto-open template from marketplace ?template= param ────
  useEffect(() => {
    if (status !== 'authenticated' || state.step !== 'dashboard') return;
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get('template');
    if (templateId) {
      const template = SITE_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setPendingTemplate(template);
        // Clean up the URL param so it doesn't re-trigger
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [status, state.step]);

  // ── Generation handler ──────────────────────────────────────
  const handleVibeSubmit = useCallback(async (data: VibeFormData) => {
    dispatch({ type: 'SET_VIBE', data });
    setLastVibeData(data);

    // Trigger progressive generation style phase
    progressiveSession.onIdentityReady(data.names, data.occasion || 'wedding')
      .then(() => progressiveSession.onStyleReady(
        (data.vibeString || '').split(/[\s,]+/).filter(Boolean),
        'ai-decide'
      ))
      .then(() => setPreviewState({ ...progressiveSession.getState() }))
      .catch(() => {});

    const controller = new AbortController();
    generationControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 270_000);

    try {
      log('[Generate] Starting for:', data.names, '| photos:', state.photos.length);
      const res = await fetch('/api/generate/stream', {
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        logError('[Generate] API error:', res.status, errData);
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: { manifest: StoryManifest } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event: { type: string; pass?: number; manifest?: StoryManifest; message?: string };
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            // ignore parse errors for individual lines
            continue;
          }
          if (event.type === 'progress') {
            dispatch({ type: 'SET_GENERATION_STEP', step: event.pass! });
          } else if (event.type === 'complete') {
            result = { manifest: event.manifest! };
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }

      clearTimeout(timeoutId);

      if (!result?.manifest) throw new Error('AI returned an empty manifest. Please try again.');
      log('[Generate] Manifest received, chapters:', result.manifest.chapters?.length);

      result.manifest.occasion = (data.occasion || 'wedding') as 'anniversary' | 'engagement' | 'wedding' | 'birthday' | 'story';
      if (data.layoutFormat) result.manifest.layoutFormat = data.layoutFormat as 'cascade' | 'chapters' | 'filmstrip' | 'scrapbook' | 'magazine' | 'starmap';

      const autoSlug = data.subdomain || generateSlug(data.names);
      dispatch({ type: 'SET_MANIFEST', manifest: result.manifest, subdomain: autoSlug });
      clearDraft();

      // Fire async art generation — doesn't block the editor from opening.
      // When it resolves, patch the vibeSkin art URLs into the existing state
      // without overwriting any edits the user may have already made.
      if (result.manifest.vibeSkin?.palette) {
        const artController = new AbortController();
        const artTimeout = setTimeout(() => artController.abort(), 120_000);
        fetch('/api/generate/art', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vibeString: data.vibeString,
            palette: result.manifest.vibeSkin.palette,
            occasion: data.occasion,
            coupleNames: data.names,
            chapters: result.manifest.chapters.map((c: { title: string; description?: string; mood?: string }) => ({
              title: c.title,
              description: c.description,
              mood: c.mood,
            })),
          }),
          signal: artController.signal,
        }).then(async (artRes) => {
          clearTimeout(artTimeout);
          if (!artRes.ok) return;
          const artData = await artRes.json();
          if (artData.heroArtUrl || artData.ambientArtUrl || artData.artStripUrl) {
            dispatch({
              type: 'PATCH_VIBE_ART',
              heroArtUrl: artData.heroArtUrl ?? undefined,
              ambientArtUrl: artData.ambientArtUrl ?? undefined,
              artStripUrl: artData.artStripUrl ?? undefined,
            });
            log('[Generate] Async art loaded and applied to vibeSkin');
          }
        }).catch(() => {
          clearTimeout(artTimeout);
          // Silent failure — art is optional, site looks fine with SVG art from Pass 2
        });
      }

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
  const handleTemplateSelect = (template: SiteTemplate) => {
    setPendingTemplate(template);
    setShowTemplates(false);
  };

  const handleTemplatePersonalize = (names: [string, string], occasion: string) => {
    if (!pendingTemplate) return;
    const slug = pendingTemplate.id + '-' + Date.now().toString(36);
    const manifest = applyTemplate(pendingTemplate, { occasion } as import('@/types').StoryManifest, names);
    dispatch({ type: 'EDIT_SITE', manifest, subdomain: slug, names });
    setPendingTemplate(null);

    // Auto-save draft to DB so refresh doesn't lose work
    fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: slug, manifest, names }),
    }).catch(err => logError('[Template] Auto-save draft failed:', err));
  };

  return (
    <DialogProvider>
    <ThemeProvider theme={{
      name: 'pearloom-ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
      borderRadius: '1rem',
    }}>
      {status === 'loading' ? (
        /* Issue 1: Show a branded loading state instead of blank screen while auth loads */
        <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--pl-cream)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-[var(--pl-olive-mist)] flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Plus size={20} className="text-[var(--pl-olive)]" />
              </motion.div>
            </div>
            <span className="font-heading italic text-[1.1rem] text-[var(--pl-ink-soft)]">Loading your Pearloom studio...</span>
          </motion.div>
        </div>
      ) : state.step === 'dashboard' ? (
        /* ── Dashboard: own layout with sidebar, no SiteNav ── */
        <div className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">
          {/* Dashboard top bar — minimal, not the heavy SiteNav */}
          <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--pl-divider)] bg-white/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <span className="font-heading italic text-[1.05rem] font-semibold text-[var(--pl-ink-soft)]">
                Pearloom
              </span>
              <span className="hidden sm:block text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
                The Atelier
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo('photos')}
                className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-[0.72rem] font-bold text-white bg-[var(--pl-olive-deep)] border-none cursor-pointer hover:opacity-90 transition-opacity"
                aria-label="Create new site"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New Site</span>
              </button>
              {session?.user && (
                <UserNav user={session.user} onDashboard={() => goTo('dashboard')} />
              )}
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
              <DashboardSidebar onNewSite={() => goTo('photos')} />
            </div>
            {/* Main content */}
            <main className="flex-1 overflow-auto p-4 pb-20 md:p-8 lg:p-12 lg:pb-12">
              <DashboardStep
                draftBanner={getDraft()}
                onResumeDraft={() => {
                  const draft = getDraft();
                  if (draft) dispatch({ type: 'RESTORE_DRAFT', draft });
                }}
                onDismissDraft={() => { clearDraft(); goTo('photos'); }}
                onStartNew={() => goTo('photos')}
                onQuickStart={() => setShowTemplates(true)}
                onOpenTemplates={() => setShowTemplates(true)}
                onEditSite={(site) => dispatch({ type: 'EDIT_SITE', manifest: site.manifest, subdomain: site.domain, names: site.names || ['', ''] })}
                onManageGuests={(site) => { dispatch({ type: 'EDIT_SITE', manifest: site.manifest, subdomain: site.domain, names: site.names || ['', ''] }); dispatch({ type: 'NAVIGATE', step: 'guests' }); }}
                userName={session?.user?.name?.split(' ')[0] || undefined}
              />
            </main>
          </div>
        </div>
      ) : (
        /* ── Wizard steps: Photos, Clusters, Vibe, Generating, Guests ── */
        <>
          <WizardLayout
            step={state.step}
            title={meta.title}
            subtitle={meta.subtitle}
            onStepClick={(stepId) => goTo(stepId as WizardStep)}
            onClose={() => goTo('dashboard')}
            rightPanel={
              state.step !== 'generating' && previewState.progress > 0 ? (
                <LivePreview state={previewState} names={state.coupleNames} occasion={state.step === 'vibe' ? 'wedding' : undefined} />
              ) : undefined
            }
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
                    Pear hit a snag
                  </div>
                  <div
                    className="text-[0.88rem] leading-relaxed mb-1"
                    style={{ color: 'var(--pl-muted)' }}
                  >
                    {state.error}
                  </div>
                  <div
                    className="text-[0.88rem] leading-relaxed italic"
                    style={{ color: 'var(--pl-muted)' }}
                  >
                    This sometimes happens when our AI is busy. It usually works on the second try.
                  </div>
                  <div className="flex gap-3 mt-4 flex-wrap">
                    {lastVibeData && (
                      <button
                        onClick={() => { dispatch({ type: 'SET_ERROR', error: null }); handleVibeSubmit(lastVibeData); }}
                        className="px-5 py-2 border-none cursor-pointer text-[0.88rem] font-bold tracking-wide"
                        style={{
                          borderRadius: 'var(--pl-radius-sm)',
                          background: 'var(--pl-olive)',
                          color: '#fff',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pl-olive-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--pl-olive)')}
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      onClick={() => { dispatch({ type: 'SET_ERROR', error: null }); goTo('photos'); }}
                      className="px-5 py-2 bg-transparent cursor-pointer text-[0.88rem] font-semibold tracking-wide"
                      style={{
                        borderRadius: 'var(--pl-radius-sm)',
                        color: 'var(--pl-muted)',
                        border: '1px solid var(--pl-divider)',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--pl-gold)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--pl-divider)')}
                    >
                      Start Over
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'SET_ERROR', error: null })}
                      className="px-4 py-2 bg-transparent border-none cursor-pointer text-[0.88rem] font-medium"
                      style={{
                        borderRadius: 'var(--pl-radius-sm)',
                        color: 'var(--pl-muted)',
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
            {state.step === 'photos' && (
              <>
                <PhotosStep
                  selectedPhotos={state.photos}
                  onPhotosSelected={(photos) => {
                    dispatch({ type: 'SET_PHOTOS', photos });
                    progressiveSession.onPhotosReady(photos).then(() => setPreviewState({ ...progressiveSession.getState() }));
                  }}
                  onContinue={() => goTo('clusters')}
                  onSkipToTemplate={() => setShowTemplates(true)}
                />
              </>
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
        </>
      )}

      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        manifest={state.manifest}
        coupleNames={state.coupleNames}
        initialSubdomain={state.subdomain}
      />

      {/* Template Gallery */}
      {showTemplates && (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
          occasion={'wedding'}
        />
      )}

      {/* Template Personalization — names & occasion before entering editor */}
      {pendingTemplate && (
        <TemplatePersonalizeModal
          template={pendingTemplate}
          onConfirm={handleTemplatePersonalize}
          onClose={() => setPendingTemplate(null)}
        />
      )}

      {/* Mobile Bottom Nav (shown on dashboard step only) */}
      {state.step === 'dashboard' && (
        <MobileBottomNav
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          onBuild={() => goTo('photos')}
        />
      )}
    </ThemeProvider>
    </DialogProvider>
  );
}
