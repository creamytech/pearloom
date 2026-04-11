'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / DashboardClient.tsx — Dashboard composition root
// Mounts: Landing → Dashboard → PearSpotlight → Editor
// The legacy multi-step wizard (Photos/Clusters/Vibe/Generating/
// Guests) has been removed; PearSpotlight is the single entry
// point for creating new sites.
// ─────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log.bind(console) : () => {};
const logError = isDev ? console.error.bind(console) : () => {};

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import nextDynamic from 'next/dynamic';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWizardState } from '@/lib/wizard-state';
import type { WizardStep } from '@/lib/wizard-state';
import type { StoryManifest } from '@/types';

// ── Dashboard UI pieces (still in use) ──────────────────────────
import { DashboardStep } from '@/components/wizard/DashboardStep';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { UserNav } from '@/components/dashboard/user-nav';
import { PearSpotlight } from '@/components/wizard/PearSpotlight';
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
  'pear-crafts': { title: '', subtitle: '' },
  edit: { title: '', subtitle: '' },
};

export default function DashboardClient() {
  const router = useRouter();
  const sessionResult = useSession();
  const { data: session, status } = sessionResult ?? { data: null, status: 'loading' as const };
  const { state, dispatch } = useWizardState();
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SiteTemplate | null>(null);
  const [mobileTab, setMobileTab] = useState<'feed' | 'build' | 'aiscout' | 'profile'>('feed');

  // ── URL tracking — keep address bar in sync with current step ──
  useEffect(() => {
    const s = state.step;
    if (s === 'edit' && state.subdomain) {
      window.history.replaceState({}, '', `/editor/${state.subdomain}`);
    } else if (s === 'pear-crafts') {
      window.history.replaceState({}, '', '/dashboard/new');
    } else {
      window.history.replaceState({}, '', '/dashboard');
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

  // ── Step navigation helper ──────────────────────────────────
  const goTo = (step: WizardStep) => dispatch({ type: 'NAVIGATE', step });

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

  // ── Pear Spotlight wizard takes over ─────────────────────────
  if (state.step === 'pear-crafts') {
    return (
      <PearSpotlight
        onComplete={(manifest: StoryManifest, names: [string, string], subdomain: string) => {
          // Save site to database FIRST, then enter editor
          fetch('/api/sites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdomain, manifest, names }),
          }).catch(err => logError('[PearSpotlight] Failed to save site draft:', err));

          dispatch({ type: 'EDIT_SITE', manifest, subdomain, names });
        }}
        onBack={() => goTo('dashboard')}
      />
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
                onClick={() => goTo('pear-crafts')}
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
              <DashboardSidebar onNewSite={() => goTo('pear-crafts')} />
            </div>
            {/* Main content */}
            <main className="flex-1 overflow-auto p-4 pb-20 md:p-8 lg:p-12 lg:pb-12">
              <DashboardStep
                onStartNew={() => goTo('pear-crafts')}
                onQuickStart={() => setShowTemplates(true)}
                onOpenTemplates={() => setShowTemplates(true)}
                onEditSite={(site) => dispatch({ type: 'EDIT_SITE', manifest: site.manifest, subdomain: site.domain, names: site.names || ['', ''] })}
                userName={session?.user?.name?.split(' ')[0] || undefined}
              />
            </main>
          </div>
        </div>
      ) : null}

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
          onBuild={() => goTo('pear-crafts')}
        />
      )}
    </ThemeProvider>
    </DialogProvider>
  );
}
