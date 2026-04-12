'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/GettingStartedChecklist.tsx
// Floating getting-started widget — bottom-left of editor
// Glass card with 5 checklist items, reactive to manifest state
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '@/lib/editor-state';

const LS_DISMISSED_KEY = 'pearloom_checklist_dismissed';
const LS_COLLAPSED_KEY = 'pearloom_checklist_collapsed';
const LS_TOUR_KEY = 'pearloom_tour_completed';

// ── Checklist item definitions ────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  /** Which tab (or 'publish') to navigate to */
  goAction: 'story' | 'design' | 'events' | 'publish';
}

const ITEMS: ChecklistItem[] = [
  { id: 'headline',  label: 'Edit your headline',     goAction: 'story' },
  { id: 'theme',     label: 'Choose a color theme',   goAction: 'design' },
  { id: 'photo',     label: 'Add your first photo',   goAction: 'story' },
  { id: 'date',      label: 'Set your event date',    goAction: 'events' },
  { id: 'publish',   label: 'Publish your site',      goAction: 'publish' },
];

// ── Component ─────────────────────────────────────────────────

export function GettingStartedChecklist() {
  const { state, dispatch, manifest } = useEditor();

  // Visibility state
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [tourDone, setTourDone] = useState(false);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Check localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_DISMISSED_KEY)) { setDismissed(true); return; }
      setDismissed(false);
      setCollapsed(localStorage.getItem(LS_COLLAPSED_KEY) === '1');
      setTourDone(!!localStorage.getItem(LS_TOUR_KEY));
    } catch {
      setDismissed(false);
    }
  }, []);

  // Poll tour completion (tour sets localStorage when done)
  useEffect(() => {
    if (tourDone) return;
    const interval = setInterval(() => {
      try {
        if (localStorage.getItem(LS_TOUR_KEY)) {
          setTourDone(true);
          clearInterval(interval);
        }
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [tourDone]);

  // Compute completion status from manifest
  const completionStatus = computeCompletion(manifest, state.publishedUrl);
  const completedCount = completionStatus.filter(Boolean).length;
  const allDone = completedCount === ITEMS.length;

  // Celebrate when all items complete
  useEffect(() => {
    if (allDone && !dismissed && !celebrating) {
      setCelebrating(true);
      celebrateTimerRef.current = setTimeout(() => {
        try { localStorage.setItem(LS_DISMISSED_KEY, '1'); } catch {}
        setDismissed(true);
      }, 3500);
    }
    return () => { if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current); };
  }, [allDone, dismissed, celebrating]);

  // Toggle collapsed
  const toggleCollapsed = useCallback(() => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(LS_COLLAPSED_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // Go action
  const handleGo = useCallback((item: ChecklistItem) => {
    if (item.goAction === 'publish') {
      dispatch({ type: 'OPEN_PUBLISH' });
    } else {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: item.goAction });
    }
  }, [dispatch]);

  // Don't render if permanently dismissed
  if (dismissed) return null;
  // Don't render until tour is done
  if (!tourDone) return null;

  const remaining = ITEMS.length - completedCount;
  const progressPct = (completedCount / ITEMS.length) * 100;

  return (
    <>
      <style>{`
        @keyframes pl-check-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes pl-checklist-enter {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pl-progress-fill {
          from { width: 0%; }
        }
        @keyframes pl-celebrate-pop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '72px',
          zIndex: 100,
          width: '290px',
          borderRadius: '10px',
          background: 'rgba(250, 247, 242, 0.88)',
          border: '1px solid #E4E4E7',
          boxShadow: '0 8px 36px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.4)',
          overflow: 'hidden',
          animation: 'pl-checklist-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
          animationDelay: '0.3s',
          fontFamily: 'var(--pl-font-body, system-ui)',
        } as React.CSSProperties}
      >
        {/* Header — always visible */}
        <button
          onClick={toggleCollapsed}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '14px 16px 10px',
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700,
              fontFamily: 'var(--pl-font-heading, Georgia, serif)',
              color: 'var(--pl-ink, #2b1e14)',
            }}>
              Getting Started
            </span>
            <span style={{
              fontSize: '0.6rem', fontWeight: 700,
              color: '#18181B',
              background: '#F4F4F5',
              padding: '2px 7px', borderRadius: '8px',
            }}>
              {completedCount}/{ITEMS.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {collapsed && remaining > 0 && (
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#18181B', color: '#fff',
                fontSize: '0.58rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {remaining}
              </span>
            )}
            <svg
              width="12" height="12" viewBox="0 0 12 12"
              style={{
                color: 'var(--pl-muted, #8a8472)',
                transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </button>

        {/* Progress bar */}
        <div style={{
          height: '3px', background: 'rgba(0,0,0,0.04)',
          margin: '0 16px 0',
          borderRadius: '8px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '8px',
            background: 'linear-gradient(90deg, #18181B, #8a9d72)',
            width: `${progressPct}%`,
            transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: 'pl-progress-fill 0.6s ease both',
          }} />
        </div>

        {/* Collapsible body */}
        <div style={{
          maxHeight: collapsed ? '0px' : '400px',
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Celebration message */}
          {celebrating && (
            <div style={{
              padding: '20px 16px', textAlign: 'center',
              animation: 'pl-celebrate-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{'\u{1F389}'}</div>
              <p style={{
                margin: 0, fontSize: '0.8rem', fontWeight: 700,
                fontFamily: 'var(--pl-font-heading, Georgia, serif)',
                color: 'var(--pl-ink, #2b1e14)',
              }}>
                You&apos;re all set!
              </p>
              <p style={{
                margin: '4px 0 0', fontSize: '0.65rem',
                color: 'var(--pl-muted, #8a8472)',
              }}>
                Your site is ready to shine.
              </p>
            </div>
          )}

          {/* Checklist items */}
          {!celebrating && (
            <div style={{ padding: '10px 8px 12px' }}>
              {ITEMS.map((item, i) => {
                const done = completionStatus[i];
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '7px 8px',
                      borderRadius: '10px',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '6px', flexShrink: 0,
                      border: done ? 'none' : '1.5px solid rgba(0,0,0,0.15)',
                      background: done ? '#18181B' : 'rgba(255,255,255,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                      animation: done ? 'pl-check-bounce 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                    }}>
                      {done && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Label */}
                    <span style={{
                      flex: 1, fontSize: '0.76rem', fontWeight: done ? 500 : 600,
                      color: done ? 'var(--pl-muted, #8a8472)' : 'var(--pl-ink, #2b1e14)',
                      textDecoration: done ? 'line-through' : 'none',
                      opacity: done ? 0.7 : 1,
                      transition: 'all 0.2s',
                    }}>
                      {item.label}
                    </span>

                    {/* Go button */}
                    {!done && (
                      <button
                        onClick={() => handleGo(item)}
                        style={{
                          padding: '3px 10px', borderRadius: '8px',
                          border: '1px solid #E4E4E7',
                          background: 'rgba(24,24,27,0.04)',
                          color: '#18181B',
                          fontSize: '0.6rem', fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(24,24,27,0.08)';
                          e.currentTarget.style.borderColor = '#A1A1AA';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(24,24,27,0.04)';
                          e.currentTarget.style.borderColor = '#E4E4E7';
                        }}
                      >
                        Go
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Completion checker ────────────────────────────────────────
// Returns a boolean[] matching ITEMS order

function computeCompletion(
  manifest: import('@/types').StoryManifest,
  publishedUrl: string | null | undefined,
): boolean[] {
  // 1. Edit headline — heroTagline exists or any chapter title was modified from defaults
  const headlineDone = !!(
    manifest.poetry?.heroTagline ||
    manifest.chapters?.some(c => c.title && c.title !== 'New Chapter' && c.title !== 'Our Story')
  );

  // 2. Choose color theme — vibeSkin has been set (palette exists)
  const themeDone = !!(manifest.vibeSkin?.palette);

  // 3. Add first photo — any chapter has images
  const photoDone = !!(manifest.chapters?.some(c => c.images && c.images.length > 0));

  // 4. Set event date — events[0].date exists
  const dateDone = !!(manifest.events?.[0]?.date);

  // 5. Publish — published URL exists
  const publishDone = !!publishedUrl;

  return [headlineDone, themeDone, photoDone, dateDone, publishDone];
}
