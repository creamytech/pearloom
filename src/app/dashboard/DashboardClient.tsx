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
import { GrooveMotion } from '@/components/brand/groove';
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

// Full-screen editor — SSR disabled (uses browser APIs + framer Reorder).
// Custom loading screen prevents the silent-gap between dashboard click
// and editor mount that made first-time users click the tile twice.
function EditorLoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--pl-cream, #F5EFE2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        zIndex: 40,
        color: 'var(--pl-ink, #0E0D0B)',
        fontFamily: 'var(--pl-font-body, ui-sans-serif)',
      }}
    >
      <div
        aria-hidden
        className="pl-pearl-accent"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pl-dot-pulse 1.6s ease-in-out infinite',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--pl-font-display, Georgia, serif)',
            fontStyle: 'italic',
            fontSize: '1.35rem',
            letterSpacing: '-0.01em',
          }}
        >
          Opening the editor
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: 'var(--pl-font-mono, ui-monospace)',
            fontSize: '0.68rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--pl-muted, #6F6557)',
          }}
        >
          Threading your site · one moment
        </div>
      </div>
    </div>
  );
}

const FullscreenEditor = nextDynamic(
  () => import('@/components/editor/FullscreenEditor').then(m => m.FullscreenEditor),
  { ssr: false, loading: () => <EditorLoadingScreen /> },
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[460px] overflow-hidden"
        style={{
          background: 'var(--pl-cream-card)',
          border: '1px solid var(--pl-divider)',
          borderRadius: 'var(--pl-radius-lg)',
          boxShadow: 'var(--pl-shadow-lg)',
        }}
      >
        {/* Accent strip */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--pl-olive)',
            opacity: 0.9,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '28px 28px 18px',
            borderBottom: '1px solid var(--pl-divider-soft)',
          }}
        >
          <p className="pl-overline" style={{ marginBottom: 10 }}>
            Template · {template.name}
          </p>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--pl-font-display)',
              fontWeight: 500,
              fontSize: '1.5rem',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              color: 'var(--pl-ink)',
            }}
          >
            Personalize your{' '}
            <em
              style={{
                fontStyle: 'italic',
                color: 'var(--pl-olive)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              site
            </em>
            .
          </h2>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '0.86rem',
              color: 'var(--pl-muted)',
              lineHeight: 1.5,
            }}
          >
            Tell us who this celebration is for.
          </p>
        </div>

        {/* Form */}
        <div
          style={{
            padding: '22px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Occasion */}
          <div>
            <label
              className="pl-overline"
              style={{ display: 'block', marginBottom: 10 }}
            >
              Occasion
            </label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => {
                const active = occasion === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setOccasion(o.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--pl-radius-full)',
                      border: '1px solid',
                      borderColor: active
                        ? 'var(--pl-ink)'
                        : 'var(--pl-divider)',
                      background: active ? 'var(--pl-ink)' : 'transparent',
                      color: active
                        ? 'var(--pl-cream)'
                        : 'var(--pl-ink-soft)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Names */}
          <div
            className={
              occasion === 'birthday' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'
            }
          >
            <div>
              <label
                className="pl-overline"
                style={{ display: 'block', marginBottom: 8 }}
              >
                {occasion === 'birthday'
                  ? "Birthday person"
                  : occasion === 'wedding'
                  ? 'First partner'
                  : 'First name'}
              </label>
              <input
                autoFocus
                value={name1}
                onChange={(e) => setName1(e.target.value)}
                placeholder={
                  occasion === 'birthday'
                    ? 'Their name'
                    : occasion === 'wedding'
                    ? 'e.g. Alex'
                    : 'First name'
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--pl-radius-sm)',
                  border: '1px solid var(--pl-divider)',
                  background: 'var(--pl-cream)',
                  color: 'var(--pl-ink)',
                  fontSize: 'max(16px, 0.9rem)',
                  outline: 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pl-olive)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 2px color-mix(in oklab, var(--pl-olive) 20%, transparent)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pl-divider)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {occasion !== 'birthday' && (
              <div>
                <label
                  className="pl-overline"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  {occasion === 'wedding' ? 'Second partner' : 'Second name'}
                </label>
                <input
                  value={name2}
                  onChange={(e) => setName2(e.target.value)}
                  placeholder={
                    occasion === 'wedding' ? 'e.g. Jordan' : 'Second name'
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--pl-radius-sm)',
                    border: '1px solid var(--pl-divider)',
                    background: 'var(--pl-cream)',
                    color: 'var(--pl-ink)',
                    fontSize: 'max(16px, 0.9rem)',
                    outline: 'none',
                    transition: 'border-color 150ms, box-shadow 150ms',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--pl-olive)';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 2px color-mix(in oklab, var(--pl-olive) 20%, transparent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--pl-divider)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--pl-divider-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--pl-cream-deep)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              color: 'var(--pl-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() =>
              canSubmit &&
              onConfirm([name1.trim(), name2.trim()] as [string, string], occasion)
            }
            disabled={!canSubmit}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--pl-radius-full)',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--pl-cream)',
              background: canSubmit ? 'var(--pl-ink)' : 'var(--pl-muted)',
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
              transition: 'all 150ms',
            }}
          >
            Start building
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
    <GrooveMotion>
    <ThemeProvider theme={{
      name: 'pearloom-v5',
      fonts: { heading: 'DM Sans', body: 'DM Sans' },
      colors: { background: '#FAFAFA', foreground: '#18181B', accent: '#18181B', accentLight: '#F4F4F5', muted: '#71717A', cardBg: '#ffffff' },
      borderRadius: '0.75rem',
    }}>
      {status === 'loading' ? (
        /* Branded loading state */
        <div
          className="min-h-dvh flex flex-col items-center justify-center"
          style={{ background: 'var(--pl-cream)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-3"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--pl-radius-lg)',
                background: 'var(--pl-ink)',
                color: 'var(--pl-cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Plus size={16} />
              </motion.div>
            </div>
            <span
              style={{
                fontFamily: 'var(--pl-font-display)',
                fontStyle: 'italic',
                fontSize: '0.95rem',
                color: 'var(--pl-muted)',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              Loading your studio…
            </span>
          </motion.div>
        </div>
      ) : state.step === 'dashboard' ? (
        /* ── Dashboard: own layout with sidebar, no SiteNav ── */
        <div className="min-h-dvh flex flex-col" style={{ background: 'var(--pl-cream)' }}>
          {/* Dashboard top bar — editorial */}
          <header
            className="shrink-0 flex items-center justify-between"
            style={{
              height: 60,
              padding: '0 clamp(16px, 4vw, 32px)',
              background: 'color-mix(in oklab, var(--pl-cream) 88%, transparent)',
              backdropFilter: 'saturate(140%) blur(14px)',
              WebkitBackdropFilter: 'saturate(140%) blur(14px)',
              borderBottom: '1px solid var(--pl-divider)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div className="flex items-center gap-2 md:hidden">
              <span
                style={{
                  fontFamily: 'var(--pl-font-display)',
                  fontSize: '1.05rem',
                  color: 'var(--pl-ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                Pearloom
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => goTo('pear-crafts')}
                className="flex items-center gap-1.5 md:hidden"
                style={{
                  padding: '8px 14px',
                  background: 'var(--pl-ink)',
                  color: 'var(--pl-cream)',
                  borderRadius: 'var(--pl-radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-label="Create new site"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New site</span>
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
    </GrooveMotion>
    </DialogProvider>
  );
}
