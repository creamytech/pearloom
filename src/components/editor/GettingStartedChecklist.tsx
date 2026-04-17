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

// ── Checklist item definitions ────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  /** Short label for the Go button */
  actionLabel: string;
  /** Which tab (or 'publish') to navigate to */
  goAction: 'story' | 'design' | 'events' | 'publish';
}

const ITEMS: ChecklistItem[] = [
  { id: 'headline', label: 'Edit your headline',    actionLabel: 'Story',   goAction: 'story'   },
  { id: 'theme',    label: 'Choose a color theme',  actionLabel: 'Design',  goAction: 'design'  },
  { id: 'photo',    label: 'Add your first photo',  actionLabel: 'Story',   goAction: 'story'   },
  { id: 'date',     label: 'Set your event date',   actionLabel: 'Events',  goAction: 'events'  },
  { id: 'publish',  label: 'Publish your site',     actionLabel: 'Publish', goAction: 'publish' },
];

// ── Component ─────────────────────────────────────────────────

export function GettingStartedChecklist() {
  const { state, dispatch, manifest } = useEditor();

  // Visibility state
  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Check localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_DISMISSED_KEY)) { setDismissed(true); return; }
      setDismissed(false);
      setCollapsed(localStorage.getItem(LS_COLLAPSED_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

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
        @keyframes pl-checklist-pulse {
          0%, 100% { box-shadow: 0 0 0 4px color-mix(in oklab, var(--pl-gold, #B8935A) 22%, transparent); }
          50% { box-shadow: 0 0 0 8px color-mix(in oklab, var(--pl-gold, #B8935A) 8%, transparent); }
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
              Start here ✦
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
                background: 'var(--pl-gold, #B8935A)',
                color: 'var(--pl-cream, #FAF7F2)',
                fontSize: '0.58rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
                boxShadow: '0 0 0 4px color-mix(in oklab, var(--pl-gold, #B8935A) 22%, transparent)',
                animation: 'pl-checklist-pulse 2.4s ease-in-out infinite',
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
                // First unfinished item is 'next up' — gets a gold
                // accent so the user always knows where to look.
                const isNextUp = !done && completionStatus.slice(0, i).every(Boolean);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '7px 8px',
                      borderRadius: '10px',
                      background: isNextUp
                        ? 'color-mix(in oklab, var(--pl-gold, #B8935A) 12%, transparent)'
                        : 'transparent',
                      border: isNextUp
                        ? '1px solid color-mix(in oklab, var(--pl-gold, #B8935A) 28%, transparent)'
                        : '1px solid transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (!isNextUp) e.currentTarget.style.background = 'rgba(0,0,0,0.025)';
                    }}
                    onMouseLeave={e => {
                      if (!isNextUp) e.currentTarget.style.background = 'transparent';
                    }}
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
                        {item.actionLabel}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Publish nudge — appears once the 4 content items are
                  all done but the site hasn't been published yet. */}
              {completionStatus.slice(0, 4).every(Boolean) &&
                !completionStatus[4] && (
                  <button
                    onClick={() => dispatch({ type: 'OPEN_PUBLISH' })}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'var(--pl-ink, #18181B)',
                      color: 'var(--pl-cream, #FAF7F2)',
                      border: 'none',
                      fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                      fontSize: '0.64rem',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px color-mix(in oklab, var(--pl-olive, #5C6B3F) 28%, transparent)',
                    }}
                  >
                    ✦ You&apos;re ready — publish now
                  </button>
                )}
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
