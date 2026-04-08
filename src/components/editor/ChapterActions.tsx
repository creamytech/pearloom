'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ChapterActions.tsx
// Compact action toolbar for chapter cards in the editor.
// Shows completion dots, layout switcher, AI Rewrite, Sort Photos.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, ArrowUpDown } from 'lucide-react';
import type { Chapter } from '@/types';

// ── Types ──────────────────────────────────────────────────────
type Tone = 'polish' | 'poetic' | 'playful' | 'intimate';
type Layout = 'editorial' | 'split' | 'fullbleed' | 'cinematic' | 'gallery' | 'mosaic';

interface ChapterActionsProps {
  chapter: Chapter;
  voiceSamples?: string[];
  onUpdate: (updated: Partial<Chapter>) => void;
  isRewriting?: boolean;
}

// ── Layout options with SVG mini-icons ────────────────────────
export const LAYOUT_OPTS: Array<{ id: Layout; label: string; icon: React.ReactNode }> = [
  {
    id: 'editorial',
    label: 'Editorial',
    icon: (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="1" y="1" width="6" height="10" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="9" y="1" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
        <rect x="9" y="4.5" width="6" height="1.5" rx="0.5" fill="currentColor" opacity="0.35"/>
        <rect x="9" y="7" width="4" height="1.5" rx="0.5" fill="currentColor" opacity="0.25"/>
      </svg>
    ),
  },
  {
    id: 'split',
    label: 'Split',
    icon: (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="1" y="1" width="6.5" height="10" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="8.5" y="1" width="6.5" height="10" rx="1" fill="currentColor" opacity="0.35"/>
      </svg>
    ),
  },
  {
    id: 'fullbleed',
    label: 'Full Bleed',
    icon: (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="0.5" y="0.5" width="15" height="11" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="3" y="7.5" width="10" height="1.5" rx="0.5" fill="white" opacity="0.7"/>
        <rect x="4.5" y="9.5" width="7" height="1" rx="0.5" fill="white" opacity="0.45"/>
      </svg>
    ),
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    icon: (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="0.5" y="0.5" width="15" height="11" rx="1" fill="currentColor" opacity="0.6"/>
        <rect x="0.5" y="0.5" width="15" height="3.5" rx="1" fill="currentColor" opacity="0.4"/>
        <rect x="0.5" y="8" width="15" height="3.5" rx="1" fill="currentColor" opacity="0.4"/>
        <rect x="3" y="5" width="10" height="1.5" rx="0.5" fill="white" opacity="0.8"/>
      </svg>
    ),
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="1" y="1" width="4" height="4.5" rx="0.5" fill="currentColor" opacity="0.7"/>
        <rect x="6" y="1" width="4" height="4.5" rx="0.5" fill="currentColor" opacity="0.55"/>
        <rect x="11" y="1" width="4" height="4.5" rx="0.5" fill="currentColor" opacity="0.4"/>
        <rect x="1" y="6.5" width="4" height="4.5" rx="0.5" fill="currentColor" opacity="0.4"/>
        <rect x="6" y="6.5" width="4" height="4.5" rx="0.5" fill="currentColor" opacity="0.55"/>
        <rect x="11" y="6.5" width="4" height="4.5" rx="0.5" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'mosaic',
    label: 'Mosaic',
    icon: (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <rect x="1" y="1" width="8" height="7" rx="0.5" fill="currentColor" opacity="0.7"/>
        <rect x="10" y="1" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
        <rect x="10" y="5" width="5" height="3" rx="0.5" fill="currentColor" opacity="0.4"/>
        <rect x="1" y="9" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.35"/>
        <rect x="7" y="9" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
];

// ── Tone options ───────────────────────────────────────────────
const TONE_OPTS: Array<{ value: Tone; label: string; desc: string }> = [
  { value: 'polish',   label: 'Polish',   desc: 'Elevate & refine'      },
  { value: 'poetic',   label: 'Poetic',   desc: 'Lyrical, imagery-rich' },
  { value: 'playful',  label: 'Playful',  desc: 'Lighter, warmer wit'   },
  { value: 'intimate', label: 'Intimate', desc: 'Raw & personal'        },
];

// ── Completion Dot ─────────────────────────────────────────────
function CompletionDot({ filled, tooltip }: { filled: boolean; tooltip: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={tooltip}
        style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: filled ? 'var(--pl-olive, #A3B18A)' : 'rgba(0,0,0,0.08)',
          border: filled ? 'none' : '1px solid var(--pl-muted)',
          transition: 'background 0.2s', cursor: 'default', flexShrink: 0,
        }}
      />
      {hover && (
        <div style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--pl-glass-dark)', color: 'var(--pl-ink)',
          fontSize: '0.6rem', fontWeight: 600, whiteSpace: 'nowrap',
          padding: '3px 6px', borderRadius: '4px', pointerEvents: 'none',
          zIndex: 100, border: '1px solid rgba(0,0,0,0.06)',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ── Layout Switcher ────────────────────────────────────────────
function LayoutSwitcher({ current, onChange }: { current: string; onChange: (l: Layout) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Layout | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const active = LAYOUT_OPTS.find(l => l.id === current) || LAYOUT_OPTS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={`Layout: ${active.label}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 7px', height: '26px', borderRadius: '5px',
          border: `1px solid ${open ? 'rgba(163,177,138,0.5)' : 'rgba(0,0,0,0.07)'}`,
          background: open ? 'rgba(163,177,138,0.12)' : 'rgba(163,177,138,0.06)',
          color: open ? 'var(--pl-olive, #A3B18A)' : 'var(--pl-ink-soft)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseOver={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink)'; }}}
        onMouseOut={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink-soft)'; }}}
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>{active.icon}</span>
        <svg width="7" height="5" viewBox="0 0 7 5" fill="none" style={{ opacity: 0.4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M1 1l2.5 3L6 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          background: 'var(--pl-glass-dark)', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: '10px', padding: '6px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px',
          zIndex: 300, boxShadow: '0 4px 24px rgba(43,30,20,0.1)',
          backdropFilter: 'blur(16px)', minWidth: '168px',
        }}>
          {LAYOUT_OPTS.map(opt => {
            const isActive = opt.id === current;
            const isHov = hovered === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                onMouseEnter={() => setHovered(opt.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                  padding: '8px 6px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(163,177,138,0.18)' : isHov ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: isActive ? 'var(--pl-olive, #A3B18A)' : isHov ? 'var(--pl-ink)' : 'var(--pl-ink-soft)',
                  transition: 'all 0.12s',
                  outline: isActive ? '1.5px solid rgba(163,177,138,0.4)' : 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
          {/* Preview label */}
          {hovered && (
            <div style={{
              gridColumn: '1 / -1', borderTop: '1px solid rgba(0,0,0,0.05)',
              paddingTop: '5px', marginTop: '2px',
              fontSize: '0.6rem', color: 'var(--pl-muted)',
              textAlign: 'center', fontStyle: 'italic',
            }}>
              {LAYOUT_OPTS.find(l => l.id === hovered)?.label} layout
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function ChapterActions({
  chapter,
  voiceSamples,
  onUpdate,
  isRewriting = false,
}: ChapterActionsProps) {
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [localRewriting, setLocalRewriting] = useState(false);
  const [sortingPhotos, setSortingPhotos] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const rewriting = isRewriting || localRewriting;

  // Completion signals
  const hasPhotos      = (chapter.images?.length ?? 0) > 0;
  const hasTitle       = !!chapter.hasCustomTitle || (!!chapter.title && chapter.title !== 'New Chapter');
  const hasDescription = !!chapter.hasCustomDescription || (!!chapter.description && chapter.description !== 'Write your story here…');

  // Close tone menu on outside click
  useEffect(() => {
    if (!showToneMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowToneMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showToneMenu]);

  const handleRewrite = async (tone: Tone) => {
    setShowToneMenu(false);
    setLocalRewriting(true);
    try {
      const res = await fetch('/api/rewrite-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter, voiceSamples, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title || data.description) {
          onUpdate({
            title: data.title || chapter.title,
            subtitle: data.subtitle || chapter.subtitle,
            description: data.description || chapter.description,
            hasCustomTitle: true,
            hasCustomDescription: true,
          });
        }
      }
    } catch (e) {
      console.error('[ChapterActions] rewrite failed:', e);
    } finally {
      setLocalRewriting(false);
    }
  };

  const handleSortPhotos = async () => {
    if (!chapter.images?.length) return;
    setSortingPhotos(true);
    try {
      const res = await fetch('/api/sort-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapter.id, images: chapter.images }),
      });
      if (res.ok) {
        const { sortedIds } = await res.json();
        if (sortedIds?.length) {
          const idxMap = new Map<string, number>(
            sortedIds.map((id: string, i: number) => [id, i])
          );
          const sorted = [...chapter.images].sort(
            (a, b) => (idxMap.get(a.id) ?? 999) - (idxMap.get(b.id) ?? 999)
          );
          onUpdate({ images: sorted });
        }
      }
    } catch (e) {
      console.error('[ChapterActions] sort photos failed:', e);
    } finally {
      setSortingPhotos(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        height: '36px', padding: '0 2px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Completion dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '2px' }}>
        <CompletionDot filled={hasPhotos}      tooltip={hasPhotos      ? 'Photos added'        : 'No photos yet'}        />
        <CompletionDot filled={hasTitle}       tooltip={hasTitle       ? 'Title customised'    : 'Title not customised'} />
        <CompletionDot filled={hasDescription} tooltip={hasDescription ? 'Description written' : 'Description missing'}  />
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.06)', marginRight: '1px' }} />

      {/* Layout switcher */}
      <LayoutSwitcher
        current={chapter.layout || 'editorial'}
        onChange={(layout) => onUpdate({ layout })}
      />

      {/* Divider */}
      <div style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.06)', marginLeft: '1px' }} />

      {/* Rewrite button + tone dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          disabled={rewriting}
          onClick={() => !rewriting && setShowToneMenu(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '5px',
            border: '1px solid rgba(163,177,138,0.3)',
            background: rewriting ? 'rgba(163,177,138,0.05)' : 'rgba(163,177,138,0.1)',
            color: rewriting ? 'var(--pl-muted)' : 'var(--pl-olive, #A3B18A)',
            fontSize: '0.65rem', fontWeight: 700,
            cursor: rewriting ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em', transition: 'all 0.15s',
            whiteSpace: 'nowrap', height: '26px',
          }}
          onMouseOver={e => { if (!rewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)'; }}
          onMouseOut={e => { if (!rewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.1)'; }}
        >
          {rewriting
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <Sparkles size={10} />}
          {rewriting ? 'Rewriting…' : 'Rewrite'}
        </button>

        {/* Tone dropdown */}
        {showToneMenu && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: '4px',
            background: 'var(--pl-glass-dark)', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '8px', padding: '4px', minWidth: '148px',
            zIndex: 200, boxShadow: '0 8px 32px rgba(43,30,20,0.1)',
            backdropFilter: 'blur(12px)',
          }}>
            {TONE_OPTS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => handleRewrite(value)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  width: '100%', padding: '6px 8px', borderRadius: '5px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.1s',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.12)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--pl-olive, #A3B18A)' }}>{label}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--pl-muted)', marginTop: '1px' }}>{desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort Photos button — only shown when there are multiple photos */}
      {(chapter.images?.length ?? 0) > 1 && (
        <button
          disabled={sortingPhotos}
          onClick={handleSortPhotos}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '5px',
            border: '1px solid rgba(0,0,0,0.06)',
            background: sortingPhotos ? 'rgba(163,177,138,0.03)' : 'rgba(163,177,138,0.06)',
            color: sortingPhotos ? 'var(--pl-muted)' : 'rgba(255,255,255,0.45)',
            fontSize: '0.65rem', fontWeight: 700,
            cursor: sortingPhotos ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em', transition: 'all 0.15s',
            whiteSpace: 'nowrap', height: '26px',
          }}
          onMouseOver={e => { if (!sortingPhotos) { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink)'; }}}
          onMouseOut={e => { if (!sortingPhotos) { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}}
        >
          {sortingPhotos
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <ArrowUpDown size={10} />}
          {sortingPhotos ? 'Sorting…' : 'Sort'}
        </button>
      )}
    </div>
  );
}
